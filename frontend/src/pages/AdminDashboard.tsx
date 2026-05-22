import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { AdminStats, Reservation } from '../types';

function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.stats(), api.reservations()])
      .then(([nextStats, nextReservations]) => {
        setStats(nextStats);
        setReservations(nextReservations);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard.'));
  }, []);

  if (error) return <div className="page"><p className="error">{error}</p></div>;

  return (
    <div className="page">
      <section className="section-heading">
        <span className="eyebrow">Administracion</span>
        <h1>Dashboard con estadisticas reales</h1>
      </section>
      <div className="stats-grid">
        <article><span>Vuelos</span><strong>{stats?.flights ?? 0}</strong></article>
        <article><span>Reservas</span><strong>{stats?.reservations ?? 0}</strong></article>
        <article><span>Pasajeros</span><strong>{stats?.passengers ?? 0}</strong></article>
        <article><span>Asientos vendidos</span><strong>{stats?.soldSeats ?? 0}/{stats?.totalSeats ?? 0}</strong></article>
        <article><span>Ingresos</span><strong>${(stats?.revenue ?? 0).toLocaleString('es-CO')}</strong></article>
      </div>
      <section className="panel">
        <h2>Ultimas reservas</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Codigo</th><th>Vuelo</th><th>Pasajero</th><th>Asiento</th><th>Pago</th></tr></thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td>{reservation.reservation_code}</td>
                  <td>{reservation.flightCode} {reservation.origin}-{reservation.destination}</td>
                  <td>{reservation.passengerName}</td>
                  <td>{reservation.seatNumber}</td>
                  <td>${reservation.amount.toLocaleString('es-CO')} / {reservation.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
