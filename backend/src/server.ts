import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { all, get, initializeDatabase, run } from './database';
import { FlightSearchQuery, LoginBody, RegisterBody, UserPayload } from './types';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-flight-secret';

app.use(cors());
app.use(express.json());

interface AuthRequest extends Request {
  user?: UserPayload;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const asyncHandler = <T extends Request>(fn: (request: T, response: Response) => Promise<unknown>) =>
  (request: T, response: Response, next: NextFunction) => fn(request, response).catch(next);

function requireAuth(request: AuthRequest, _response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) throw new HttpError(401, 'Token requerido.');
  try {
    request.user = jwt.verify(token, JWT_SECRET) as UserPayload;
    next();
  } catch {
    throw new HttpError(401, 'Token invalido o expirado.');
  }
}

function requireRole(role: UserPayload['role']) {
  return (request: AuthRequest, _response: Response, next: NextFunction) => {
    if (request.user?.role !== role) throw new HttpError(403, 'No tienes permisos para esta seccion.');
    next();
  };
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9+\-\s]{7,20}$/;
const strongPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function validateProfileInput(input: { email?: string; phone?: string; password?: string }) {
  if (input.email && !emailRegex.test(input.email)) throw new HttpError(400, 'Formato de correo invalido.');
  if (input.phone && !phoneRegex.test(input.phone)) throw new HttpError(400, 'Formato de telefono invalido.');
  if (input.password && !strongPasswordRegex.test(input.password)) throw new HttpError(400, 'Contrasena minima de 8 caracteres con letras y numeros.');
}

function generateCode(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}

app.get('/api/health', (_request, response) => response.json({ status: 'ok', service: 'aerovoy-api' }));

app.post('/api/auth/register', asyncHandler(async (request: Request<unknown, unknown, RegisterBody>, response) => {
  const { name, email, password, phone } = request.body;
  if (!name || !email || !password) throw new HttpError(400, 'Nombre, correo y contrasena son obligatorios.');
  validateProfileInput({ email, phone, password });
  const exists = await get<{ id: number }>('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (exists) throw new HttpError(409, 'El correo ya esta registrado.');
  const user = await run('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
    name,
    email.toLowerCase(),
    bcrypt.hashSync(password, 10),
    'usuario'
  ]);
  await run('INSERT INTO profiles (user_id, phone, document_number, city) VALUES (?, ?, ?, ?)', [user.id, phone || '', '', '']);
  response.status(201).json({ message: 'Registro exitoso.' });
}));

app.post('/api/auth/login', asyncHandler(async (request: Request<unknown, unknown, LoginBody>, response) => {
  const { email, password } = request.body;
  if (!email || !password) throw new HttpError(400, 'Correo y contrasena son obligatorios.');
  const user = await get<{ id: number; name: string; email: string; password_hash: string; role: 'administrativo' | 'usuario' }>(
    'SELECT * FROM users WHERE email = ?',
    [email.toLowerCase()]
  );
  if (!user || !bcrypt.compareSync(password, user.password_hash)) throw new HttpError(401, 'Credenciales incorrectas.');
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  response.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

app.get('/api/auth/me', requireAuth, asyncHandler(async (request: AuthRequest, response) => {
  const profile = await get(
    `SELECT u.id, u.name, u.email, u.role, p.phone, p.document_number, p.city
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`,
    [request.user!.id]
  );
  response.json(profile);
}));

app.put('/api/auth/me', requireAuth, asyncHandler(async (request: AuthRequest, response) => {
  const { name, email, phone, city, documentNumber, password } = request.body as {
    name: string; email: string; phone?: string; city?: string; documentNumber?: string; password?: string;
  };
  if (!name || !email) throw new HttpError(400, 'Nombre y correo son obligatorios.');
  validateProfileInput({ email, phone, password });
  const duplicate = await get<{ id: number }>('SELECT id FROM users WHERE email = ? AND id <> ?', [email.toLowerCase(), request.user!.id]);
  if (duplicate) throw new HttpError(409, 'Correo ya en uso.');
  await run('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email.toLowerCase(), request.user!.id]);
  await run('UPDATE profiles SET phone = ?, city = ?, document_number = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [
    phone || '',
    city || '',
    documentNumber || '',
    request.user!.id
  ]);
  if (password) await run('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(password, 10), request.user!.id]);
  response.json({ message: 'Perfil actualizado correctamente.' });
}));

app.get('/api/flights', requireAuth, asyncHandler(async (_request, response) => {
  const flights = await all(`
    SELECT f.*, fm.airline, fm.airline_logo, fm.origin_iata, fm.destination_iata, fm.duration_minutes, fm.stops,
      fm.base_price, fm.taxes, fm.cabin_economica, fm.cabin_ejecutiva, fm.cabin_primera,
      COUNT(s.id) AS totalSeats,
      SUM(CASE WHEN s.status = 'sold' THEN 1 ELSE 0 END) AS soldSeats
    FROM flights f
    JOIN flight_meta fm ON fm.flight_id = f.id
    LEFT JOIN seats s ON s.flight_id = f.id
    GROUP BY f.id
    ORDER BY f.departure_time ASC
  `);
  response.json(flights);
}));

app.get('/api/flights/search', requireAuth, asyncHandler(async (request: Request<unknown, unknown, unknown, FlightSearchQuery> & AuthRequest, response) => {
  const origin = (request.query.origin || '').trim();
  const destination = (request.query.destination || '').trim();
  const departureDate = (request.query.departureDate || '').trim();
  const returnDate = (request.query.returnDate || '').trim();
  const passengers = Number(request.query.passengers || 1);
  const page = Math.max(1, Number(request.query.page || 1));
  const pageSize = Math.max(1, Math.min(25, Number(request.query.pageSize || 10)));
  const minPrice = Number(request.query.minPrice || 0);
  const maxPrice = Number(request.query.maxPrice || 999999999);
  const cabinClass = request.query.cabinClass || 'economica';
  const duration = request.query.duration || '';
  const stops = request.query.stops || '';
  if (!origin || !destination || !departureDate) throw new HttpError(400, 'Origen, destino y fecha de salida son obligatorios.');
  if (passengers < 1 || passengers > 9) throw new HttpError(400, 'Pasajeros debe estar entre 1 y 9.');
  const today = new Date().toISOString().slice(0, 10);
  if (departureDate < today) throw new HttpError(400, 'La fecha de salida no puede ser anterior a hoy.');
  if (returnDate && returnDate <= departureDate) throw new HttpError(400, 'La fecha de regreso debe ser posterior a la salida.');

  const priceColumn = cabinClass === 'primera' ? 'fm.cabin_primera' : cabinClass === 'ejecutiva' ? 'fm.cabin_ejecutiva' : 'fm.cabin_economica';
  const where: string[] = ['date(f.departure_time) = ?', '(LOWER(f.origin) LIKE ? OR LOWER(fm.origin_iata) LIKE ?)', '(LOWER(f.destination) LIKE ? OR LOWER(fm.destination_iata) LIKE ?)'];
  const params: unknown[] = [departureDate, `%${origin.toLowerCase()}%`, `%${origin.toLowerCase()}%`, `%${destination.toLowerCase()}%`, `%${destination.toLowerCase()}%`];

  if (duration === 'short') where.push('fm.duration_minutes < 180');
  if (duration === 'medium') where.push('fm.duration_minutes BETWEEN 180 AND 360');
  if (duration === 'long') where.push('fm.duration_minutes > 360');
  if (stops === 'direct') where.push('fm.stops = 0');
  if (stops === 'one') where.push('fm.stops = 1');
  if (stops === 'two-plus') where.push('fm.stops >= 2');
  where.push(`(${priceColumn} + fm.taxes) BETWEEN ? AND ?`);
  params.push(minPrice, maxPrice);

  const baseQuery = `
    FROM flights f
    JOIN flight_meta fm ON fm.flight_id = f.id
    LEFT JOIN seats s ON s.flight_id = f.id
    WHERE ${where.join(' AND ')}
    GROUP BY f.id
    HAVING (COUNT(s.id) - SUM(CASE WHEN s.status = 'sold' THEN 1 ELSE 0 END)) >= ?
  `;
  params.push(passengers);

  const [{ total }] = await all<{ total: number }>(`SELECT COUNT(*) AS total FROM (SELECT f.id ${baseQuery})`, params);
  const flights = await all(
    `SELECT f.*, fm.airline, fm.airline_logo, fm.origin_iata, fm.destination_iata, fm.duration_minutes, fm.stops, fm.base_price, fm.taxes,
      fm.cabin_economica, fm.cabin_ejecutiva, fm.cabin_primera,
      COUNT(s.id) AS totalSeats,
      SUM(CASE WHEN s.status = 'sold' THEN 1 ELSE 0 END) AS soldSeats,
      (${priceColumn} + fm.taxes) AS total_price
      ${baseQuery}
      ORDER BY total_price ASC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  await run(
    'INSERT INTO searches (user_id, origin, destination, departure_date, return_date, passengers) VALUES (?, ?, ?, ?, ?, ?)',
    [request.user!.id, origin, destination, departureDate, returnDate || null, passengers]
  );

  let alternatives: string[] = [];
  if (!total) {
    const candidates = await all<{ day: string }>(
      `SELECT DISTINCT date(departure_time) AS day FROM flights WHERE destination LIKE ? ORDER BY day LIMIT 3`,
      [`%${destination}%`]
    );
    alternatives = candidates.map((row) => row.day);
  }

  response.json({ total, page, pageSize, results: flights, alternatives });
}));

app.get('/api/flights/:id', requireAuth, asyncHandler(async (request, response) => {
  const flight = await get(
    `SELECT f.*, fm.airline, fm.airline_logo, fm.origin_iata, fm.destination_iata, fm.duration_minutes, fm.stops, fm.base_price, fm.taxes,
      fm.cabin_economica, fm.cabin_ejecutiva, fm.cabin_primera
    FROM flights f JOIN flight_meta fm ON fm.flight_id = f.id WHERE f.id = ?`,
    [request.params.id]
  );
  if (!flight) throw new HttpError(404, 'Vuelo no encontrado.');
  response.json(flight);
}));

app.get('/api/flights/:id/seats', requireAuth, asyncHandler(async (request, response) => {
  const seats = await all('SELECT * FROM seats WHERE flight_id = ? ORDER BY seat_number', [request.params.id]);
  response.json(seats);
}));

app.post('/api/flights/:id/validate-availability', requireAuth, asyncHandler(async (request, response) => {
  const { seatId } = request.body as { seatId?: number };
  if (!seatId) throw new HttpError(400, 'Asiento requerido.');
  const seat = await get<{ status: string }>('SELECT status FROM seats WHERE id = ? AND flight_id = ?', [seatId, request.params.id]);
  if (!seat) throw new HttpError(404, 'Asiento no encontrado.');
  if (seat.status !== 'available') throw new HttpError(409, 'Asiento no disponible.');
  response.json({ available: true });
}));

app.post('/api/purchase', requireAuth, asyncHandler(async (request: Request & AuthRequest, response) => {
  const { flightId, seatId, passenger, payment } = request.body as {
    flightId: number; seatId: number; passenger: { fullName: string; documentNumber: string; email: string; phone: string }; payment: { method: string };
  };
  if (!flightId || !seatId || !passenger?.fullName || !passenger?.documentNumber || !passenger?.email || !passenger?.phone || !payment?.method) {
    throw new HttpError(400, 'Datos incompletos para crear la compra.');
  }
  validateProfileInput({ email: passenger.email, phone: passenger.phone });
  await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    const seat = await get<{ id: number; status: string }>('SELECT * FROM seats WHERE id = ? AND flight_id = ?', [seatId, flightId]);
    if (!seat) throw new HttpError(404, 'Asiento no encontrado.');
    if (seat.status === 'sold') throw new HttpError(409, 'El asiento ya fue vendido.');
    const flight = await get<{ price: number }>('SELECT price FROM flights WHERE id = ?', [flightId]);
    if (!flight) throw new HttpError(404, 'Vuelo no encontrado.');
    const passengerResult = await run(
      'INSERT INTO passengers (full_name, document_number, email, phone) VALUES (?, ?, ?, ?)',
      [passenger.fullName, passenger.documentNumber, passenger.email, passenger.phone]
    );
    const reservationCode = generateCode('RSV');
    const reservationResult = await run(
      'INSERT INTO reservations (reservation_code, flight_id, passenger_id, seat_id, status) VALUES (?, ?, ?, ?, ?)',
      [reservationCode, flightId, passengerResult.id, seatId, 'confirmed']
    );
    await run('INSERT INTO payments (reservation_id, amount, method, status) VALUES (?, ?, ?, ?)', [reservationResult.id, flight.price, payment.method, 'approved']);
    await run('UPDATE seats SET status = ? WHERE id = ?', ['sold', seatId]);
    await run('COMMIT');
    response.status(201).json({ message: 'Compra realizada correctamente.', reservationCode });
  } catch (error) {
    await run('ROLLBACK').catch(() => undefined);
    throw error;
  }
}));

app.post('/api/trips', requireAuth, asyncHandler(async (request: AuthRequest, response) => {
  const tripCode = generateCode('TRIP');
  const created = await run('INSERT INTO trips (trip_code, user_id, status) VALUES (?, ?, ?)', [tripCode, request.user!.id, 'draft']);
  response.status(201).json({ id: created.id, tripCode, status: 'draft' });
}));

app.get('/api/trips/current', requireAuth, asyncHandler(async (request: AuthRequest, response) => {
  let trip = await get<{ id: number; trip_code: string; status: string }>(
    "SELECT id, trip_code, status FROM trips WHERE user_id = ? AND status = 'draft' ORDER BY id DESC LIMIT 1",
    [request.user!.id]
  );
  if (!trip) {
    const tripCode = generateCode('TRIP');
    const created = await run('INSERT INTO trips (trip_code, user_id, status) VALUES (?, ?, ?)', [tripCode, request.user!.id, 'draft']);
    trip = { id: created.id, trip_code: tripCode, status: 'draft' };
  }
  const services = await all<{ subtotal: number } & Record<string, unknown>>('SELECT * FROM trip_services WHERE trip_id = ? ORDER BY id DESC', [trip.id]);
  const subtotal = services.reduce((sum, item: { subtotal: number }) => sum + item.subtotal, 0);
  const taxes = Math.round(subtotal * 0.19);
  response.json({ trip, services, summary: { subtotal, taxes, total: subtotal + taxes } });
}));

app.post('/api/trips/:tripId/services', requireAuth, asyncHandler(async (request, response) => {
  const { serviceType, name, description, serviceDate, unitPrice, quantity = 1, metadata } = request.body as {
    serviceType: 'vuelo' | 'hotel' | 'transporte' | 'comida'; name: string; description: string; serviceDate: string;
    unitPrice: number; quantity?: number; metadata?: string;
  };
  if (!serviceType || !name || !description || !serviceDate || !unitPrice || quantity < 1) throw new HttpError(400, 'Servicio invalido.');
  const subtotal = unitPrice * quantity;
  const availabilityStatus = Math.random() < 0.2 ? 'limited' : 'available';
  const created = await run(
    `INSERT INTO trip_services (trip_id, service_type, name, description, service_date, unit_price, quantity, subtotal, availability_status, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [request.params.tripId, serviceType, name, description, serviceDate, unitPrice, quantity, subtotal, availabilityStatus, metadata || null]
  );
  response.status(201).json({ id: created.id, message: 'Servicio agregado al viaje.' });
}));

app.delete('/api/trips/:tripId/services/:serviceId', requireAuth, asyncHandler(async (request, response) => {
  const removed = await run('DELETE FROM trip_services WHERE id = ? AND trip_id = ?', [request.params.serviceId, request.params.tripId]);
  if (!removed.changes) throw new HttpError(404, 'Servicio no encontrado.');
  response.json({ message: 'Servicio eliminado correctamente.' });
}));

app.get('/api/trips/:tripId/summary', requireAuth, asyncHandler(async (request, response) => {
  const services = await all<{ id: number; subtotal: number; availability_status: string }>(
    'SELECT * FROM trip_services WHERE trip_id = ? ORDER BY service_date',
    [request.params.tripId]
  );
  const subtotal = services.reduce((sum, item) => sum + item.subtotal, 0);
  const taxes = Math.round(subtotal * 0.19);
  response.json({ services, itinerary: services, costs: { subtotal, taxes, total: subtotal + taxes } });
}));

app.post('/api/trips/:tripId/confirm', requireAuth, asyncHandler(async (request: AuthRequest, response) => {
  const { paymentMethod } = request.body as { paymentMethod: 'tarjeta' | 'pse' | 'efectivo' };
  if (!paymentMethod) throw new HttpError(400, 'Metodo de pago requerido.');
  const services = await all<{ id: number; service_type: string; metadata: string | null; subtotal: number; availability_status: string }>(
    'SELECT * FROM trip_services WHERE trip_id = ?',
    [request.params.tripId]
  );
  if (!services.length) throw new HttpError(400, 'El carrito no tiene items.');
  const unavailable = services.find((service) => service.availability_status === 'unavailable');
  if (unavailable) throw new HttpError(409, 'Hay servicios sin disponibilidad.');
  await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    const flightItems = services.filter((service) => service.service_type === 'vuelo');
    for (const flightItem of flightItems) {
      if (!flightItem.metadata) continue;
      const metadata = JSON.parse(flightItem.metadata) as { flightId: number; seatId: number; passenger: { fullName: string; documentNumber: string; email: string; phone: string } };
      const seat = await get<{ status: string }>('SELECT status FROM seats WHERE id = ? AND flight_id = ?', [metadata.seatId, metadata.flightId]);
      if (!seat || seat.status !== 'available') throw new HttpError(409, 'Un vuelo del viaje ya no tiene disponibilidad.');
      const passengerResult = await run('INSERT INTO passengers (full_name, document_number, email, phone) VALUES (?, ?, ?, ?)', [
        metadata.passenger.fullName, metadata.passenger.documentNumber, metadata.passenger.email, metadata.passenger.phone
      ]);
      const reservationCode = generateCode('RSV');
      const reservation = await run(
        'INSERT INTO reservations (reservation_code, flight_id, passenger_id, seat_id, status) VALUES (?, ?, ?, ?, ?)',
        [reservationCode, metadata.flightId, passengerResult.id, metadata.seatId, 'confirmed']
      );
      await run('INSERT INTO payments (reservation_id, amount, method, status) VALUES (?, ?, ?, ?)', [reservation.id, flightItem.subtotal, paymentMethod, 'approved']);
      await run('UPDATE seats SET status = ? WHERE id = ?', ['sold', metadata.seatId]);
    }
    await run("UPDATE trips SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?", [request.params.tripId, request.user!.id]);
    await run('COMMIT');
    response.json({ message: 'Reserva confirmada.', status: 'Confirmada' });
  } catch (error) {
    await run('ROLLBACK').catch(() => undefined);
    throw error;
  }
}));

app.get('/api/reservations', requireAuth, requireRole('administrativo'), asyncHandler(async (_request, response) => {
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
}));

app.get('/api/admin/stats', requireAuth, requireRole('administrativo'), asyncHandler(async (_request, response) => {
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
}));

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof HttpError) return response.status(error.status).json({ message: error.message });
  return response.status(500).json({ message: 'Error interno del servidor.', detail: error.message });
});

initializeDatabase().then(() => {
  const server = app.listen(PORT, '0.0.0.0', () => console.log(`API AeroVoy en http://localhost:${PORT}`));
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`El puerto ${PORT} ya esta en uso. Cambia PORT o cierra el proceso previo.`);
      process.exit(1);
    }
    throw error;
  });
});
