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

  const user = await get<{ total: number }>('SELECT COUNT(*) AS total FROM users');
  if (!user?.total) {
    await run('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
      'Administrador AeroZara',
      'admin@aerozara.com',
      bcrypt.hashSync('Admin123', 10),
      'admin'
    ]);
  }

  const flights = await get<{ total: number }>('SELECT COUNT(*) AS total FROM flights');
  if (!flights?.total) {
    const samples = [
      ['AZ101', 'Bogota', 'Medellin', '2026-06-01 08:00', '2026-06-01 09:05', 180000, 'scheduled'],
      ['AZ220', 'Cali', 'Cartagena', '2026-06-01 12:30', '2026-06-01 14:10', 260000, 'scheduled'],
      ['AZ315', 'Bogota', 'Santa Marta', '2026-06-02 06:45', '2026-06-02 08:20', 310000, 'scheduled']
    ];
    for (const flight of samples) {
      const result = await run(
        'INSERT INTO flights (code, origin, destination, departure_time, arrival_time, price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        flight
      );
      await seedSeats(result.id);
    }
  }
}
