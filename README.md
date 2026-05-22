# AeroVoy - Gestion de Vuelos y Viajes

Aplicacion full stack para busqueda, compra, gestion del viaje y seguimiento de reservas con roles `usuario` y `administrativo`.

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

## Usuarios de prueba

- Administrativo:
  - Email: `admin@aerozara.com`
  - Password: `Admin123`
- Usuario comun:
  - Email: `usuario@aerozara.com`
  - Password: `Usuario123`

El login guarda el token JWT en `localStorage` con la clave `flight_token`.
Tambien guarda el usuario en `localStorage` con la clave `flight_user` para mostrar opciones segun rol.

## Si el puerto 4000 esta ocupado

El error `EADDRINUSE` significa que ya hay un backend corriendo en `4000`. Cierra el proceso anterior o usa otro puerto:

```bash
cd backend
$env:PORT=4001
npm run dev
```

## Comandos de verificacion

```bash
npm run build
npm run check
```

## Rutas principales API

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `GET /api/flights`
- `GET /api/flights/search`
- `GET /api/flights/:id`
- `GET /api/flights/:id/seats`
- `POST /api/flights/:id/validate-availability`
- `POST /api/purchase`
- `GET /api/trips/current`
- `POST /api/trips`
- `POST /api/trips/:tripId/services`
- `DELETE /api/trips/:tripId/services/:serviceId`
- `GET /api/trips/:tripId/summary`
- `POST /api/trips/:tripId/confirm`
- `GET /api/reservations`
- `GET /api/admin/stats`

## Flujo funcional

1. Registro/login con validaciones y password hash con salt.
2. Busqueda de vuelos por origen/destino/IATA, fechas, pasajeros, filtros y paginacion.
3. Seleccion de asiento y validacion de disponibilidad en tiempo real.
4. Creacion de viaje y carrito de servicios (vuelo, hotel, transporte, comida).
5. Confirmacion del viaje en transaccion: crea reservas/pagos y vende asientos.
6. Perfil editable y dashboard admin con metricas reales.
