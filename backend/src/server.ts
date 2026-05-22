import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { all, db, get, initializeDatabase, run } from './database';
import { LoginBody, PurchaseBody, UserPayload } from './types';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-flight-secret';

app.use(cors());
app.use(express.json());

interface AuthRequest extends Request {
  user?: UserPayload;
}

function requireAuth(request: AuthRequest, response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return response.status(401).json({ message: 'Token requerido.' });

  try {
    request.user = jwt.verify(token, JWT_SECRET) as UserPayload;
    return next();
  } catch {
    return response.status(401).json({ message: 'Token invalido o expirado.' });
  }
}

function requireRole(role: UserPayload['role']) {
  return (request: AuthRequest, response: Response, next: NextFunction) => {
    if (request.user?.role !== role) {
      return response.status(403).json({ message: 'No tienes permisos para acceder a esta seccion.' });
    }
    return next();
  };
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'gestion-vuelos-api' });
});

app.post('/api/auth/login', async (request: Request<unknown, unknown, LoginBody>, response) => {
  const { email, password } = request.body;
  if (!email || !password) return response.status(400).json({ message: 'Email y password son obligatorios.' });

  const user = await get<{ id: number; name: string; email: string; password_hash: string; role: string }>(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return response.status(401).json({ message: 'Credenciales invalidas.' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  return response.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get('/api/flights', requireAuth, async (_request, response) => {
  const flights = await all(`
    SELECT f.*, COUNT(s.id) AS totalSeats,
    SUM(CASE WHEN s.status = 'sold' THEN 1 ELSE 0 END) AS soldSeats
    FROM flights f
    LEFT JOIN seats s ON s.flight_id = f.id
    GROUP BY f.id
    ORDER BY f.departure_time ASC
  `);
  response.json(flights);
});

app.get('/api/flights/:id', requireAuth, async (request, response) => {
  const flight = await get('SELECT * FROM flights WHERE id = ?', [request.params.id]);
  if (!flight) return response.status(404).json({ message: 'Vuelo no encontrado.' });
  return response.json(flight);
});

app.get('/api/flights/:id/seats', requireAuth, async (request, response) => {
  const seats = await all('SELECT * FROM seats WHERE flight_id = ? ORDER BY seat_number', [request.params.id]);
  response.json(seats);
});

app.get('/api/reservations', requireAuth, requireRole('administrativo'), async (_request, response) => {
  const reservations = await all(`
    SELECT r.*, f.code AS flightCode, f.origin, f.destination, p.full_name AS passengerName,
      p.document_number AS documentNumber, s.seat_number AS seatNumber, pay.amount, pay.method AS paymentMethod
    FROM reservations r
    JOIN flights f ON f.id = r.flight_id
    JOIN passengers p ON p.id = r.passenger_id
    JOIN seats s ON s.id = r.seat_id
    JOIN payments pay ON pay.reservation_id = r.id
    ORDER BY r.created_at DESC
  `);
  response.json(reservations);
});

app.post('/api/purchase', requireAuth, async (request: Request<unknown, unknown, PurchaseBody>, response) => {
  const { flightId, seatId, passenger, payment } = request.body;
  if (!flightId || !seatId || !passenger?.fullName || !passenger?.documentNumber || !passenger?.email || !passenger?.phone || !payment?.method) {
    return response.status(400).json({ message: 'Datos incompletos para crear la compra.' });
  }

  try {
    await run('BEGIN IMMEDIATE TRANSACTION');
    const seat = await get<{ id: number; status: string; flight_id: number }>(
      'SELECT * FROM seats WHERE id = ? AND flight_id = ?',
      [seatId, flightId]
    );
    if (!seat) throw new Error('Asiento no encontrado.');
    if (seat.status === 'sold') throw new Error('El asiento ya fue vendido.');

    const flight = await get<{ id: number; price: number }>('SELECT * FROM flights WHERE id = ?', [flightId]);
    if (!flight) throw new Error('Vuelo no encontrado.');

    const passengerResult = await run(
      'INSERT INTO passengers (full_name, document_number, email, phone) VALUES (?, ?, ?, ?)',
      [passenger.fullName, passenger.documentNumber, passenger.email, passenger.phone]
    );
    const code = `RSV-${Date.now()}`;
    const reservationResult = await run(
      'INSERT INTO reservations (reservation_code, flight_id, passenger_id, seat_id, status) VALUES (?, ?, ?, ?, ?)',
      [code, flightId, passengerResult.id, seatId, 'confirmed']
    );
    await run('INSERT INTO payments (reservation_id, amount, method, status) VALUES (?, ?, ?, ?)', [
      reservationResult.id,
      flight.price,
      payment.method,
      'approved'
    ]);
    await run('UPDATE seats SET status = ? WHERE id = ?', ['sold', seatId]);
    await run('COMMIT');
    return response.status(201).json({ message: 'Compra realizada correctamente.', reservationCode: code });
  } catch (error) {
    await run('ROLLBACK').catch(() => undefined);
    return response.status(409).json({ message: error instanceof Error ? error.message : 'No se pudo completar la compra.' });
  }
});

app.get('/api/admin/stats', requireAuth, requireRole('administrativo'), async (_request: AuthRequest, response) => {
  const [flights, seats, reservations, revenue, passengers] = await Promise.all([
    get<{ total: number }>('SELECT COUNT(*) AS total FROM flights'),
    get<{ sold: number; total: number }>("SELECT SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) AS sold, COUNT(*) AS total FROM seats"),
    get<{ total: number }>('SELECT COUNT(*) AS total FROM reservations'),
    get<{ total: number }>("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'approved'"),
    get<{ total: number }>('SELECT COUNT(*) AS total FROM passengers')
  ]);
  response.json({
    flights: flights?.total || 0,
    soldSeats: seats?.sold || 0,
    totalSeats: seats?.total || 0,
    reservations: reservations?.total || 0,
    passengers: passengers?.total || 0,
    revenue: revenue?.total || 0
  });
});

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  response.status(500).json({ message: 'Error interno del servidor.', detail: error.message });
});

initializeDatabase().then(() => {
  const server = app.listen(PORT, () => console.log(`API gestion de vuelos en http://localhost:${PORT}`));
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`El puerto ${PORT} ya esta en uso. Cierra el proceso anterior o ejecuta con PORT=4001.`);
      process.exit(1);
    }
    throw error;
  });
});
