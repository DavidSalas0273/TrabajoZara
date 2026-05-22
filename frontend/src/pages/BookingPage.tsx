import { FormEvent, useEffect, useState } from 'react';
import SeatMap from '../components/SeatMap';
import { api } from '../services/api';
import type { Flight, Seat } from '../types';

const blankPassenger = { fullName: '', documentNumber: '', email: '', phone: '' };

function BookingPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [passenger, setPassenger] = useState(blankPassenger);
  const [method, setMethod] = useState('tarjeta');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadFlights = async () => setFlights(await api.flights());
  const loadSeats = async (flightId: number) => setSeats(await api.seats(flightId));

  useEffect(() => {
    loadFlights().catch((err) => setError(err instanceof Error ? err.message : 'Error cargando vuelos.'));
  }, []);

  const selectFlight = async (flight: Flight) => {
    setSelectedFlight(flight);
    setSelectedSeat(null);
    await loadSeats(flight.id);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!selectedFlight || !selectedSeat) return setError('Selecciona un vuelo y un asiento disponible.');
    if (!passenger.fullName || !passenger.documentNumber || !passenger.email || !passenger.phone) return setError('Completa los datos del pasajero.');
    try {
      const result = await api.purchase({ flightId: selectedFlight.id, seatId: selectedSeat.id, passenger, payment: { method } });
      setMessage(`${result.message} Codigo: ${result.reservationCode}`);
      setPassenger(blankPassenger);
      setSelectedSeat(null);
      await Promise.all([loadFlights(), loadSeats(selectedFlight.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la compra.');
    }
  };

  return (
    <main className="page">
      <section className="section-heading">
        <span className="eyebrow">Compra de tiquetes</span>
        <h1>Selecciona vuelo, asiento y pasajero</h1>
      </section>
      <div className="layout-grid">
        <section className="panel">
          <h2>Vuelos disponibles</h2>
          {flights.map((flight) => (
            <button className={`flight-card ${selectedFlight?.id === flight.id ? 'selected' : ''}`} key={flight.id} onClick={() => selectFlight(flight)}>
              <strong>{flight.code}: {flight.origin} - {flight.destination}</strong>
              <span>{flight.departure_time} | ${flight.price.toLocaleString('es-CO')}</span>
              <small>{flight.totalSeats - flight.soldSeats} asientos disponibles</small>
            </button>
          ))}
        </section>
        <section className="panel">
          <h2>Mapa de asientos</h2>
          {selectedFlight ? <SeatMap seats={seats} selectedSeatId={selectedSeat?.id || null} onSelect={(seat) => setSelectedSeat(seat)} /> : <p>Selecciona un vuelo.</p>}
          <div className="legend"><span className="dot available" /> Disponible <span className="dot picked" /> Seleccionado <span className="dot sold" /> Vendido</div>
        </section>
      </div>
      <form className="panel form-grid" onSubmit={submit}>
        <h2>Datos del pasajero y pago</h2>
        <label>Nombre completo<input value={passenger.fullName} onChange={(event) => setPassenger({ ...passenger, fullName: event.target.value })} /></label>
        <label>Documento<input value={passenger.documentNumber} onChange={(event) => setPassenger({ ...passenger, documentNumber: event.target.value })} /></label>
        <label>Email<input value={passenger.email} onChange={(event) => setPassenger({ ...passenger, email: event.target.value })} /></label>
        <label>Telefono<input value={passenger.phone} onChange={(event) => setPassenger({ ...passenger, phone: event.target.value })} /></label>
        <label>Metodo de pago<select value={method} onChange={(event) => setMethod(event.target.value)}><option value="tarjeta">Tarjeta</option><option value="pse">PSE</option><option value="efectivo">Efectivo</option></select></label>
        {error && <p className="error full">{error}</p>}
        {message && <p className="success full">{message}</p>}
        <button className="primary-button full" type="submit">Confirmar compra</button>
      </form>
    </main>
  );
}

export default BookingPage;
