export interface User {
  id: number;
  name: string;
  email: string;
  role: 'administrativo' | 'usuario';
}

export interface UserProfile extends User {
  phone?: string;
  city?: string;
  document_number?: string;
}

export interface Flight {
  id: number;
  code: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  airline: string;
  airline_logo: string;
  duration_minutes: number;
  stops: number;
  taxes: number;
  cabin_economica: number;
  cabin_ejecutiva: number;
  cabin_primera: number;
  total_price: number;
  totalSeats: number;
  soldSeats: number;
}

export interface Seat {
  id: number;
  flight_id: number;
  seat_number: string;
  status: 'available' | 'sold';
}

export interface FlightSearchResponse {
  total: number;
  page: number;
  pageSize: number;
  results: Flight[];
  alternatives: string[];
}

export interface TripService {
  id: number;
  trip_id: number;
  service_type: 'vuelo' | 'hotel' | 'transporte' | 'comida';
  name: string;
  description: string;
  service_date: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  availability_status: 'available' | 'limited' | 'unavailable';
  metadata?: string;
}

export interface CatalogItem {
  id: number;
  type: 'hotel' | 'transporte' | 'comida';
  name: string;
  description: string;
  price: number;
  active: number;
}

export interface TripSummary {
  subtotal: number;
  taxes: number;
  total: number;
}

export interface CurrentTripResponse {
  trip: { id: number; trip_code: string; status: string };
  services: TripService[];
  summary: TripSummary;
}

export interface AdminStats {
  flights: number;
  soldSeats: number;
  totalSeats: number;
  reservations: number;
  passengers: number;
  revenue: number;
}

export interface Reservation {
  id: number;
  reservation_code: string;
  flightCode: string;
  origin: string;
  destination: string;
  passengerName: string;
  seatNumber: string;
  amount: number;
  paymentMethod: string;
  created_at: string;
}
