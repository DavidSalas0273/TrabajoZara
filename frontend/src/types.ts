export interface User {
  id: number;
  name: string;
  email: string;
  role: 'administrativo' | 'usuario';
}

export interface Flight {
  id: number;
  code: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  status: string;
  totalSeats: number;
  soldSeats: number;
}

export interface Seat {
  id: number;
  flight_id: number;
  seat_number: string;
  status: 'available' | 'sold';
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
