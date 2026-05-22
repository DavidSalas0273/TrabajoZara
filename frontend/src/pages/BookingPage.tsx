import { useEffect, useMemo, useState } from 'react';
import SeatMap from '../components/SeatMap';
import { api } from '../services/api';
import type { CatalogItem, CurrentTripResponse, Flight, Seat } from '../types';

const initialSearch = {
  origin: 'BOG',
  destination: 'CTG',
  departureDate: '2026-06-03',
  returnDate: '',
  passengers: 1,
  cabinClass: 'economica',
  minPrice: 0,
  maxPrice: 1000000,
  duration: '',
  stops: ''
};

function BookingPage() {
  const [search, setSearch] = useState(initialSearch);
  const [results, setResults] = useState<Flight[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [tripData, setTripData] = useState<CurrentTripResponse | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [message, setMessage] = useState('');
  const [passenger, setPassenger] = useState({ fullName: '', documentNumber: '', email: '', phone: '' });
  const [paymentMethod, setPaymentMethod] = useState('tarjeta');

  const loadTrip = async () => setTripData(await api.currentTrip());

  const searchFlights = async (nextPage = 1) => {
    setLoading(true);
    setError('');
    setAlternatives([]);
    try {
      const params = new URLSearchParams({
        origin: search.origin,
        destination: search.destination,
        departureDate: search.departureDate,
        returnDate: search.returnDate,
        passengers: String(search.passengers),
        cabinClass: search.cabinClass,
        minPrice: String(search.minPrice),
        maxPrice: String(search.maxPrice),
        duration: search.duration,
        stops: search.stops,
        page: String(nextPage),
        pageSize: '10'
      });
      const response = await api.searchFlights(params);
      setResults(response.results);
      setTotal(response.total);
      setPage(nextPage);
      setAlternatives(response.alternatives);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo buscar vuelos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrip().catch(() => undefined);
    api.catalog().then(setCatalog).catch(() => undefined);
    searchFlights(1).catch(() => undefined);
  }, []);

  const addFlightToTrip = async () => {
    if (!selectedFlight || !selectedSeat) return setError('Selecciona vuelo y asiento.');
    try {
      await api.validateAvailability(selectedFlight.id, selectedSeat.id);
      await api.addTripService(tripData!.trip.id, {
        serviceType: 'vuelo',
        name: `${selectedFlight.code} ${selectedFlight.origin} - ${selectedFlight.destination}`,
        description: `${selectedFlight.airline} · ${search.cabinClass}`,
        serviceDate: selectedFlight.departure_time.slice(0, 10),
        unitPrice: selectedFlight.total_price || selectedFlight.cabin_economica + selectedFlight.taxes,
        quantity: 1,
        metadata: JSON.stringify({ flightId: selectedFlight.id, seatId: selectedSeat.id, passenger })
      });
      await loadTrip();
      setMessage('Vuelo agregado al carrito de viaje.');
      setSelectedSeat(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar al viaje.');
    }
  };

  const addExtraService = async (item: CatalogItem) => {
    if (!tripData) return;
    await api.addTripService(tripData.trip.id, {
      serviceType: item.type,
      name: item.name,
      description: item.description,
      serviceDate: search.departureDate,
      unitPrice: item.price,
      quantity: 1,
      metadata: JSON.stringify({ catalogId: item.id })
    });
    await loadTrip();
  };

  const confirmTrip = async () => {
    if (!tripData) return;
    try {
      const result = await api.confirmTrip(tripData.trip.id, paymentMethod);
      setMessage(`${result.message} Estado: ${result.status}`);
      await loadTrip();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar la reserva.');
    }
  };

  const canProceed = useMemo(() => !!tripData?.services.length, [tripData]);

  return (
    <div className="page">
      <section className="panel flight-search-shell">
        <div className="search-head">
          <h2>{search.origin} - {search.destination}</h2>
          <span>{search.departureDate}{search.returnDate ? ` · ${search.returnDate}` : ''} · {search.passengers} pasajero(s)</span>
        </div>
        <div className="search-filter-row">
          <label>Origen<input value={search.origin} onChange={(e) => setSearch({ ...search, origin: e.target.value })} /></label>
          <label>Destino<input value={search.destination} onChange={(e) => setSearch({ ...search, destination: e.target.value })} /></label>
          <label>Salida<input type="date" value={search.departureDate} onChange={(e) => setSearch({ ...search, departureDate: e.target.value })} /></label>
          <label>Pasajeros<input type="number" min={1} max={9} value={search.passengers} onChange={(e) => setSearch({ ...search, passengers: Number(e.target.value) })} /></label>
          <label>Clase<select value={search.cabinClass} onChange={(e) => setSearch({ ...search, cabinClass: e.target.value })}><option value="economica">Economica</option><option value="ejecutiva">Ejecutiva</option><option value="primera">Primera</option></select></label>
          <label>Escalas<select value={search.stops} onChange={(e) => setSearch({ ...search, stops: e.target.value })}><option value="">Todas</option><option value="direct">Directo</option><option value="one">1 escala</option><option value="two-plus">2+</option></select></label>
          <button className="primary-button" type="button" onClick={() => searchFlights(1)}>Buscar</button>
          <button className="nav-item" type="button" onClick={() => setSearch(initialSearch)}>Limpiar</button>
        </div>
      </section>

      <section className="flight-results-grid single-column">
        <div className="panel flights-list-panel">
          <h2>Resultados ({total})</h2>
          {loading && <p>Cargando...</p>}
          {!loading && !results.length && <p>No se encontraron vuelos. Fechas sugeridas: {alternatives.join(', ') || 'sin sugerencias'}</p>}
          {results.map((flight) => (
            <button
              className={`compact-flight ${selectedFlight?.id === flight.id ? 'selected' : ''}`}
              key={flight.id}
              onClick={async () => {
                setSelectedFlight(flight);
                setSeats(await api.seats(flight.id));
              }}
            >
              <div>
                <strong>{flight.departure_time.slice(11, 16)} - {flight.arrival_time.slice(11, 16)}</strong>
                <span>{flight.origin} - {flight.destination} · {flight.airline}</span>
                <small>{flight.duration_minutes} min · {flight.stops === 0 ? 'Directo' : `${flight.stops} escala(s)`}</small>
              </div>
              <div className="flight-pick-side">
                <b>${Math.round(flight.total_price).toLocaleString('es-CO')}</b>
                <span>{selectedFlight?.id === flight.id ? 'Seleccionado' : 'Seleccionar'}</span>
              </div>
            </button>
          ))}
          {total > 10 && (
            <div className="top-actions">
              <button className="nav-item" disabled={page === 1} onClick={() => searchFlights(page - 1)}>Anterior</button>
              <span>Pagina {page}</span>
              <button className="nav-item" disabled={page * 10 >= total} onClick={() => searchFlights(page + 1)}>Siguiente</button>
            </div>
          )}
        </div>
      </section>

      <div className="layout-grid">
        <section className="panel">
          <h2>Detalle y asiento</h2>
          {selectedFlight && (
            <>
              <p>{selectedFlight.airline} · cabina {search.cabinClass} · impuestos ${Math.round(selectedFlight.taxes).toLocaleString('es-CO')}</p>
              <SeatMap seats={seats} selectedSeatId={selectedSeat?.id || null} onSelect={(seat) => setSelectedSeat(seat)} />
            </>
          )}
        </section>
        <section className="panel form-grid">
          <h2>Pasajero</h2>
          <label>Nombre<input value={passenger.fullName} onChange={(e) => setPassenger({ ...passenger, fullName: e.target.value })} /></label>
          <label>Documento<input value={passenger.documentNumber} onChange={(e) => setPassenger({ ...passenger, documentNumber: e.target.value })} /></label>
          <label>Email<input value={passenger.email} onChange={(e) => setPassenger({ ...passenger, email: e.target.value })} /></label>
          <label>Telefono<input value={passenger.phone} onChange={(e) => setPassenger({ ...passenger, phone: e.target.value })} /></label>
          <button className="primary-button full" type="button" onClick={addFlightToTrip}>Agregar vuelo al viaje</button>
        </section>
      </div>

      <section className="panel">
        <h2>Carrito de viaje {tripData?.trip.trip_code || ''}</h2>
        <div className="top-actions">
          {catalog.map((item) => (
            <button className="nav-item" key={item.id} onClick={() => addExtraService(item)}>
              + {item.name} (${Math.round(item.price).toLocaleString('es-CO')})
            </button>
          ))}
        </div>
        {(tripData?.services || []).map((service) => (
          <div className="flight-card" key={service.id}>
            <strong>{service.name} · {service.service_type}</strong>
            <span>{service.description} · {service.service_date}</span>
            <small>
              Subtotal: ${Math.round(service.subtotal).toLocaleString('es-CO')}
              {service.availability_status === 'limited' ? ' · disponibilidad limitada' : ''}
            </small>
            <button
              className="nav-item"
              onClick={async () => {
                await api.deleteTripService(tripData!.trip.id, service.id);
                await loadTrip();
              }}
            >
              Eliminar
            </button>
          </div>
        ))}
        <p>
          Subtotal: ${Math.round(tripData?.summary.subtotal || 0).toLocaleString('es-CO')}
          {' · '}Impuestos: ${Math.round(tripData?.summary.taxes || 0).toLocaleString('es-CO')}
          {' · '}Total: ${Math.round(tripData?.summary.total || 0).toLocaleString('es-CO')}
        </p>
        <label>Metodo de pago<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="tarjeta">Tarjeta</option><option value="pse">PSE</option><option value="efectivo">Efectivo</option></select></label>
        <div className="top-actions">
          <button className="primary-button" disabled={!canProceed} onClick={confirmTrip}>Confirmar y pagar</button>
          <button className="nav-item" onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </section>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
    </div>
  );
}

export default BookingPage;
