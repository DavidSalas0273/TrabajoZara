import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { AdminStats, CatalogItem, Reservation } from '../types';

const formatCurrency = (value: number) => `$${value.toLocaleString('es-CO')}`;
type Aggregate = { total: number; orders: number };

function routeLabel(reservation: Reservation) {
  return `${reservation.origin} → ${reservation.destination}`;
}

function AdminDashboard({ section = 'ventas' }: { section?: 'ventas' | 'catalogo' | 'ordenes' }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState('');
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [form, setForm] = useState({ type: 'hotel', name: '', description: '', price: 0, active: 1 });

  useEffect(() => {
    Promise.all([api.stats(), api.reservations()])
      .then(([nextStats, nextReservations]) => {
        setStats(nextStats);
        setReservations(nextReservations);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard.'));
    api.adminCatalog().then(setCatalog).catch(() => undefined);
  }, []);

  const saveCatalogItem = async () => {
    if (!form.name || !form.description || !form.price) return;
    await api.createCatalogItem({ ...form, type: form.type as CatalogItem['type'] });
    setForm({ type: 'hotel', name: '', description: '', price: 0, active: 1 });
    setCatalog(await api.adminCatalog());
  };

  const toggleItem = async (item: CatalogItem) => {
    await api.updateCatalogItem(item.id, { ...item, active: item.active ? 0 : 1 });
    setCatalog(await api.adminCatalog());
  };

  if (error) return <div className="page"><p className="error">{error}</p></div>;

  const revenue = stats?.revenue ?? 0;
  const orders = stats?.reservations ?? 0;
  const averageTicket = orders ? revenue / orders : 0;
  const occupancy = stats?.totalSeats ? Math.round(((stats?.soldSeats ?? 0) / stats.totalSeats) * 100) : 0;
  const recentReservations = reservations.slice(0, 8);
  const routes = Object.entries(
    reservations.reduce<Record<string, { total: number; orders: number }>>((accumulator, reservation) => {
      const route = routeLabel(reservation);
      const current = accumulator[route] || { total: 0, orders: 0 };
      accumulator[route] = { total: current.total + reservation.amount, orders: current.orders + 1 };
      return accumulator;
    }, {})
  ).slice(0, 6) as [string, Aggregate][];
  const maxRouteRevenue = Math.max(...routes.map(([, value]) => value.total), 1);
  const paymentMethods = Object.entries(
    reservations.reduce<Record<string, number>>((accumulator, reservation) => {
      accumulator[reservation.paymentMethod] = (accumulator[reservation.paymentMethod] || 0) + 1;
      return accumulator;
    }, {})
  ) as [string, number][];
  const topUsers = Object.entries(
    reservations.reduce<Record<string, { total: number; orders: number }>>((accumulator, reservation) => {
      const current = accumulator[reservation.passengerName] || { total: 0, orders: 0 };
      accumulator[reservation.passengerName] = { total: current.total + reservation.amount, orders: current.orders + 1 };
      return accumulator;
    }, {})
  ).sort((a, b) => b[1].total - a[1].total).slice(0, 5) as [string, Aggregate][];
  const routeRows: [string, Aggregate][] = routes.length ? routes : [['Sin reservas', { total: 0, orders: 0 }]];
  const topUserRows: [string, Aggregate][] = topUsers.length ? topUsers : [['Sin usuarios', { total: 0, orders: 0 }]];
  const paymentRows: [string, number][] = paymentMethods.length ? paymentMethods : [['sin datos', 0]];
  const sparkValues = [36, 48, 42, 57, 66, 52, 78, 70, 86, Math.max(32, Math.min(96, Math.round(revenue / 4000)))];

  return (
    <div className="admin-dashboard">
      <section className="admin-head">
        <div>
          <h1>Analisis de Compras</h1>
          <p>Resumen de actividad de reservas, pagos y ocupacion de vuelos</p>
        </div>
        <div className="admin-actions">
          <select aria-label="Periodo">
            <option>Ultimos 30 dias</option>
            <option>Ultimos 90 dias</option>
            <option>Este año</option>
          </select>
          <button>Exportar</button>
        </div>
      </section>

      {section === 'ventas' && (
      <>
      <section className="kpi-grid">
        <article className="kpi-card violet">
          <div className="kpi-icon">$</div>
          <span>Ingresos totales</span>
          <strong>{formatCurrency(revenue)}</strong>
          <small className="positive">↑ datos reales desde pagos</small>
        </article>
        <article className="kpi-card emerald">
          <div className="kpi-icon">✓</div>
          <span>Ordenes totales</span>
          <strong>{orders}</strong>
          <small className="positive">↑ reservas confirmadas</small>
        </article>
        <article className="kpi-card amber">
          <div className="kpi-icon">≈</div>
          <span>Ticket promedio</span>
          <strong>{formatCurrency(Math.round(averageTicket))}</strong>
          <small>promedio por reserva</small>
        </article>
        <article className="kpi-card rose">
          <div className="kpi-icon">%</div>
          <span>Ocupacion</span>
          <strong>{occupancy}%</strong>
          <small>{stats?.soldSeats ?? 0}/{stats?.totalSeats ?? 0} asientos vendidos</small>
        </article>
      </section>

      <section className="analytics-row-main">
        <article className="analytics-panel wide">
          <div className="panel-head">
            <div>
              <h2>Ingresos recientes</h2>
              <p>Tendencia visual basada en el volumen actual de ventas</p>
            </div>
            <div className="pill-tabs"><span className="active">Ingresos</span><span>Reservas</span></div>
          </div>
          <div className="line-chart" aria-label="Grafico de ingresos recientes">
            <svg viewBox="0 0 720 210" role="img">
              <polyline
                points={sparkValues.map((value, index) => `${index * 80},${200 - value * 1.7}`).join(' ')}
                fill="none"
                stroke="#1857a6"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {sparkValues.map((value, index) => <circle cx={index * 80} cy={200 - value * 1.7} r="5" fill="#1857a6" key={`${value}-${index}`} />)}
            </svg>
          </div>
        </article>

        <article className="analytics-panel">
          <div className="panel-head">
            <div>
              <h2>Metodos de pago</h2>
              <p>Distribucion del periodo</p>
            </div>
          </div>
          <div className="donut-card">
            <div className="donut">{orders}</div>
            <span>pagos</span>
          </div>
          <div className="method-list">
            {paymentRows.map(([method, total]) => (
              <div className="method-item" key={method}>
                <span><i />{method}</span>
                <strong>{orders ? Math.round((total / orders) * 100) : 0}%</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="analytics-row-two">
        <article className="analytics-panel">
          <div className="panel-head">
            <div>
              <h2>Compras por ruta</h2>
              <p>Ingresos y reservas por trayecto</p>
            </div>
          </div>
          <div className="bar-list">
            {routeRows.map(([route, value]) => (
              <div className="bar-row" key={route}>
                <div>
                  <strong>{route}</strong>
                  <span>{value.orders} ordenes</span>
                </div>
                <div className="bar-track"><i style={{ width: `${Math.max(8, (value.total / maxRouteRevenue) * 100)}%` }} /></div>
                <b>{formatCurrency(value.total)}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="analytics-panel">
          <div className="panel-head">
            <div>
              <h2>Top usuarios</h2>
              <p>Mayor volumen de compra</p>
            </div>
          </div>
          <div className="top-users">
            {topUserRows.map(([name, value]) => (
              <div className="admin-user-row" key={name}>
                <div className="admin-user-av">{name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <strong>{name}</strong>
                  <span>{value.orders} ordenes</span>
                </div>
                <b>{formatCurrency(value.total)}</b>
              </div>
            ))}
          </div>
        </article>
      </section>
      </>
      )}

      {section === 'catalogo' && (
      <section className="analytics-panel">
        <div className="panel-head">
          <div>
            <h2>Catalogo para usuarios</h2>
            <p>Servicios visibles en el carrito de viaje del usuario</p>
          </div>
        </div>
        <div className="form-grid">
          <label>Tipo<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="hotel">Hotel</option><option value="transporte">Transporte</option><option value="comida">Comida</option></select></label>
          <label>Nombre<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Descripcion<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label>Precio<input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></label>
          <button className="primary-button full" onClick={saveCatalogItem}>Agregar servicio</button>
        </div>
        <div className="bar-list">
          {catalog.map((item) => (
            <div className="bar-row" key={item.id}>
              <div><strong>{item.name}</strong><span>{item.type} · ${Math.round(item.price).toLocaleString('es-CO')}</span></div>
              <div />
              <button className="nav-item" onClick={() => toggleItem(item)}>{item.active ? 'Desactivar' : 'Activar'}</button>
            </div>
          ))}
        </div>
      </section>
      )}

      {section === 'ordenes' && (
      <section className="analytics-panel">
        <div className="panel-head">
          <div>
            <h2>Ordenes recientes</h2>
            <p>Ultimas transacciones registradas</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="orders-table">
            <thead><tr><th>ID Orden</th><th>Usuario</th><th>Vuelo</th><th>Monto</th><th>Estado</th></tr></thead>
            <tbody>
              {recentReservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td><span className="order-id">{reservation.reservation_code}</span></td>
                  <td>{reservation.passengerName}</td>
                  <td>{reservation.flightCode} · {routeLabel(reservation)} · asiento {reservation.seatNumber}</td>
                  <td><strong>{formatCurrency(reservation.amount)}</strong></td>
                  <td><span className="status-badge completed">Completado</span></td>
                </tr>
              ))}
              {!recentReservations.length && <tr><td colSpan={5}>Aun no hay ordenes registradas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      )}
    </div>
  );
}

export default AdminDashboard;
