# Sistema de Gestion de Vuelos

Aplicacion full stack para gestionar vuelos, asientos, pasajeros, reservas, pagos y estadisticas administrativas.

## Tecnologias

- Backend: Node.js, Express, TypeScript, SQLite, JWT.
- Frontend: React, Vite, TypeScript, CSS.
- Base de datos: SQLite local creada automaticamente.

## Instalacion

```bash
npm install
npm run install:all
```

## Ejecutar en desarrollo

```bash
npm run dev
```

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

## Usuario de prueba

- Email: `admin@aerozara.com`
- Password: `Admin123`

El login guarda el token JWT en `localStorage` con la clave `flight_token`.

## Comandos de verificacion

```bash
npm run build
npm run check
```

## Rutas principales

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/flights`
- `GET /api/flights/:id`
- `GET /api/flights/:id/seats`
- `POST /api/purchase`
- `GET /api/reservations`
- `GET /api/admin/stats`

## Flujo de compra

1. El usuario inicia sesion.
2. Selecciona un vuelo disponible.
3. El mapa de asientos bloquea asientos vendidos y solo permite un asiento seleccionado.
4. Al confirmar, el backend crea pasajero, reserva, pago y marca el asiento como vendido en una transaccion.
5. El dashboard admin consulta estadisticas reales desde SQLite.
