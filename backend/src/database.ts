import path from 'path';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';

sqlite3.verbose();

export const db = new sqlite3.Database(path.join(__dirname, '..', 'data.sqlite'));

export function run(sql: string, params: unknown[] = []): Promise<{ id: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

export function get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row as T | undefined);
    });
  });
}

export function all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows as T[]);
    });
  });
}

async function seedSeats(flightId: number) {
  const rows = ['A', 'B', 'C', 'D'];
  for (const row of rows) {
    for (let number = 1; number <= 6; number += 1) {
      await run('INSERT INTO seats (flight_id, seat_number, status) VALUES (?, ?, ?)', [flightId, `${row}${number}`, 'available']);
    }
  }
}

export async function initializeDatabase() {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    phone TEXT,
    document_number TEXT,
    city TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS airports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iata_code TEXT NOT NULL UNIQUE,
    city TEXT NOT NULL,
    name TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    price REAL NOT NULL,
    status TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS flight_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_id INTEGER NOT NULL UNIQUE,
    airline TEXT NOT NULL,
    airline_logo TEXT NOT NULL,
    origin_iata TEXT NOT NULL,
    destination_iata TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    stops INTEGER NOT NULL DEFAULT 0,
    base_price REAL NOT NULL,
    taxes REAL NOT NULL,
    cabin_economica REAL NOT NULL,
    cabin_ejecutiva REAL NOT NULL,
    cabin_primera REAL NOT NULL,
    FOREIGN KEY(flight_id) REFERENCES flights(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_date TEXT NOT NULL,
    return_date TEXT,
    passengers INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_id INTEGER NOT NULL,
    seat_number TEXT NOT NULL,
    status TEXT NOT NULL,
    UNIQUE(flight_id, seat_number),
    FOREIGN KEY(flight_id) REFERENCES flights(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS passengers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    document_number TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_code TEXT NOT NULL UNIQUE,
    flight_id INTEGER NOT NULL,
    passenger_id INTEGER NOT NULL,
    seat_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(flight_id) REFERENCES flights(id),
    FOREIGN KEY(passenger_id) REFERENCES passengers(id),
    FOREIGN KEY(seat_id) REFERENCES seats(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL,
    paid_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(reservation_id) REFERENCES reservations(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_code TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS trip_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    service_type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    service_date TEXT NOT NULL,
    unit_price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    subtotal REAL NOT NULL,
    availability_status TEXT NOT NULL DEFAULT 'available',
    metadata TEXT,
    FOREIGN KEY(trip_id) REFERENCES trips(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS service_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  )`);

  const user = await get<{ total: number }>('SELECT COUNT(*) AS total FROM users');
  if (!user?.total) {
    const users = [
      ['Administrador AeroZara', 'admin@aerozara.com', bcrypt.hashSync('Admin123', 10), 'administrativo'],
      ['Usuario AeroZara', 'usuario@aerozara.com', bcrypt.hashSync('Usuario123', 10), 'usuario']
    ];
    for (const sampleUser of users) {
      const created = await run('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', sampleUser);
      await run('INSERT INTO profiles (user_id, phone, document_number, city) VALUES (?, ?, ?, ?)', [
        created.id,
        sampleUser[1] === 'admin@aerozara.com' ? '3001112233' : '3005551122',
        sampleUser[1] === 'admin@aerozara.com' ? 'CC10001' : 'CC10002',
        'Bogota'
      ]);
    }
  } else {
    await run("UPDATE users SET role = 'administrativo' WHERE email = 'admin@aerozara.com' AND role = 'admin'");
    const commonUser = await get<{ id: number }>('SELECT id FROM users WHERE email = ?', ['usuario@aerozara.com']);
    if (!commonUser) {
      const created = await run('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
        'Usuario AeroZara',
        'usuario@aerozara.com',
        bcrypt.hashSync('Usuario123', 10),
        'usuario'
      ]);
      await run('INSERT INTO profiles (user_id, phone, document_number, city) VALUES (?, ?, ?, ?)', [created.id, '3005551122', 'CC10002', 'Bogota']);
    }
  }

  const airports = await get<{ total: number }>('SELECT COUNT(*) AS total FROM airports');
  if (!airports?.total) {
    const airportRows = [
      ['BOG', 'Bogota', 'El Dorado'],
      ['MDE', 'Medellin', 'Jose Maria Cordova'],
      ['CTG', 'Cartagena', 'Rafael Nunez'],
      ['CLO', 'Cali', 'Alfonso Bonilla Aragon'],
      ['SMR', 'Santa Marta', 'Simon Bolivar']
    ];
    for (const airport of airportRows) {
      await run('INSERT INTO airports (iata_code, city, name) VALUES (?, ?, ?)', airport);
    }
  }

  const flights = await get<{ total: number }>('SELECT COUNT(*) AS total FROM flights');
  if (!flights?.total) {
    const samples = [
      ['AZ101', 'Bogota', 'Medellin', '2026-06-01 08:00', '2026-06-01 09:05', 180000, 'scheduled', 'AeroVoy', 'https://dummyimage.com/64x64/1d72d2/ffffff&text=AV', 'BOG', 'MDE', 65, 0, 140000, 40000, 0, 60000, 120000],
      ['AZ220', 'Cali', 'Cartagena', '2026-06-01 12:30', '2026-06-01 14:10', 260000, 'scheduled', 'SkyCol', 'https://dummyimage.com/64x64/0b1f45/ffffff&text=SC', 'CLO', 'CTG', 100, 1, 200000, 60000, 0, 80000, 150000],
      ['AZ315', 'Bogota', 'Santa Marta', '2026-06-02 06:45', '2026-06-02 08:20', 310000, 'scheduled', 'AeroVoy', 'https://dummyimage.com/64x64/1857a6/ffffff&text=AV', 'BOG', 'SMR', 95, 0, 250000, 60000, 0, 90000, 170000],
      ['AZ401', 'Bogota', 'Cartagena', '2026-06-03 09:30', '2026-06-03 11:00', 290000, 'scheduled', 'Pacifica', 'https://dummyimage.com/64x64/12356d/ffffff&text=PA', 'BOG', 'CTG', 90, 0, 230000, 60000, 0, 95000, 165000],
      ['AZ402', 'Bogota', 'Cartagena', '2026-06-03 14:30', '2026-06-03 16:10', 280000, 'scheduled', 'Pacifica', 'https://dummyimage.com/64x64/12356d/ffffff&text=PA', 'BOG', 'CTG', 100, 1, 215000, 65000, 0, 90000, 160000],
      ['AZ501', 'Medellin', 'Bogota', '2026-06-04 07:00', '2026-06-04 08:05', 170000, 'scheduled', 'AeroVoy', 'https://dummyimage.com/64x64/1d72d2/ffffff&text=AV', 'MDE', 'BOG', 65, 0, 130000, 40000, 0, 55000, 110000],
      ['AZ502', 'Medellin', 'Bogota', '2026-06-04 19:00', '2026-06-04 20:20', 210000, 'scheduled', 'SkyCol', 'https://dummyimage.com/64x64/0b1f45/ffffff&text=SC', 'MDE', 'BOG', 80, 1, 160000, 50000, 0, 70000, 130000],
      ['AZ610', 'Cali', 'Bogota', '2026-06-05 10:10', '2026-06-05 11:15', 190000, 'scheduled', 'AeroVoy', 'https://dummyimage.com/64x64/1857a6/ffffff&text=AV', 'CLO', 'BOG', 65, 0, 150000, 40000, 0, 65000, 120000],
      ['AZ611', 'Cali', 'Bogota', '2026-06-05 16:20', '2026-06-05 17:40', 230000, 'scheduled', 'SkyCol', 'https://dummyimage.com/64x64/0b1f45/ffffff&text=SC', 'CLO', 'BOG', 80, 1, 180000, 50000, 0, 70000, 130000],
      ['AZ712', 'Cartagena', 'Bogota', '2026-06-06 06:10', '2026-06-06 07:40', 260000, 'scheduled', 'Pacifica', 'https://dummyimage.com/64x64/12356d/ffffff&text=PA', 'CTG', 'BOG', 90, 0, 200000, 60000, 0, 80000, 145000],
      ['AZ713', 'Cartagena', 'Bogota', '2026-06-06 20:15', '2026-06-06 21:55', 300000, 'scheduled', 'AeroVoy', 'https://dummyimage.com/64x64/1d72d2/ffffff&text=AV', 'CTG', 'BOG', 100, 1, 235000, 65000, 0, 90000, 165000]
    ];
    for (const flight of samples) {
      const core = flight.slice(0, 7);
      const result = await run(
        'INSERT INTO flights (code, origin, destination, departure_time, arrival_time, price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        core
      );
      await run(
        `INSERT INTO flight_meta (flight_id, airline, airline_logo, origin_iata, destination_iata, duration_minutes, stops, base_price, taxes, cabin_economica, cabin_ejecutiva, cabin_primera)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [result.id, flight[7], flight[8], flight[9], flight[10], flight[11], flight[12], flight[13], flight[14], flight[15], flight[16], flight[17]]
      );
      await seedSeats(result.id);
    }
  }

  const allFlights = await all<{ id: number; code: string; origin: string; destination: string; price: number }>('SELECT id, code, origin, destination, price FROM flights');
  for (const flight of allFlights) {
    const meta = await get<{ id: number }>('SELECT id FROM flight_meta WHERE flight_id = ?', [flight.id]);
    if (!meta) {
      await run(
        `INSERT INTO flight_meta (flight_id, airline, airline_logo, origin_iata, destination_iata, duration_minutes, stops, base_price, taxes, cabin_economica, cabin_ejecutiva, cabin_primera)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          flight.id,
          'AeroVoy',
          'https://dummyimage.com/64x64/1d72d2/ffffff&text=AV',
          flight.origin.slice(0, 3).toUpperCase(),
          flight.destination.slice(0, 3).toUpperCase(),
          90,
          0,
          Math.max(100000, flight.price - 40000),
          40000,
          0,
          70000,
          140000
        ]
      );
    }
    const seatCount = await get<{ total: number }>('SELECT COUNT(*) AS total FROM seats WHERE flight_id = ?', [flight.id]);
    if (!seatCount?.total) await seedSeats(flight.id);
  }

  const totalFlights = await get<{ total: number }>('SELECT COUNT(*) AS total FROM flights');
  if ((totalFlights?.total || 0) < 12) {
    const extras = [
      ['AZ820', 'Bogota', 'Cartagena', '2026-06-03 07:20', '2026-06-03 08:55', 275000, 'scheduled'],
      ['AZ821', 'Bogota', 'Cartagena', '2026-06-03 20:45', '2026-06-03 22:20', 305000, 'scheduled'],
      ['AZ901', 'Bogota', 'Cartagena', '2026-06-03 17:15', '2026-06-03 18:50', 265000, 'scheduled'],
      ['AZ902', 'Bogota', 'Cartagena', '2026-06-03 11:25', '2026-06-03 13:05', 285000, 'scheduled'],
      ['AZ903', 'Bogota', 'Cartagena', '2026-06-03 05:50', '2026-06-03 07:30', 255000, 'scheduled'],
      ['AZ904', 'Bogota', 'Cartagena', '2026-06-03 13:50', '2026-06-03 15:25', 295000, 'scheduled']
    ];
    for (const flight of extras) {
      const exists = await get<{ id: number }>('SELECT id FROM flights WHERE code = ?', [flight[0]]);
      if (exists) continue;
      const created = await run(
        'INSERT INTO flights (code, origin, destination, departure_time, arrival_time, price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        flight
      );
      await run(
        `INSERT INTO flight_meta (flight_id, airline, airline_logo, origin_iata, destination_iata, duration_minutes, stops, base_price, taxes, cabin_economica, cabin_ejecutiva, cabin_primera)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [created.id, 'AeroVoy', 'https://dummyimage.com/64x64/1d72d2/ffffff&text=AV', 'BOG', 'CTG', 95, 0, Number(flight[5]) - 55000, 55000, 0, 80000, 150000]
      );
      await seedSeats(created.id);
    }
  }

  const catalog = await get<{ total: number }>('SELECT COUNT(*) AS total FROM service_catalog');
  if (!catalog?.total) {
    const seedCatalog = [
      ['hotel', 'Hotel Business Centro', '1 noche con desayuno incluido', 280000, 1],
      ['hotel', 'Hotel Aeropuerto Express', 'Traslado al aeropuerto y wifi', 220000, 1],
      ['transporte', 'Transfer privado', 'Aeropuerto - hotel - aeropuerto', 90000, 1],
      ['transporte', 'Transporte compartido', 'Ruta compartida economica', 45000, 1],
      ['comida', 'Plan comida premium', '2 comidas y 1 snack', 80000, 1],
      ['comida', 'Plan comida basico', '1 comida y 1 bebida', 40000, 1]
    ];
    for (const row of seedCatalog) {
      await run('INSERT INTO service_catalog (type, name, description, price, active) VALUES (?, ?, ?, ?, ?)', row);
    }
  }
}
