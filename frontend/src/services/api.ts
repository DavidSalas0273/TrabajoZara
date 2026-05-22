import type { AdminStats, CurrentTripResponse, Flight, FlightSearchResponse, Reservation, Seat, User, UserProfile } from '../types';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000/api`;
export const TOKEN_KEY = 'flight_token';
export const USER_KEY = 'flight_user';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'Error al comunicarse con la API.');
  return payload as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string, phone: string) =>
    request<{ message: string }>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, phone }) }),
  me: () => request<UserProfile>('/auth/me'),
  updateProfile: (data: { name: string; email: string; phone: string; city: string; documentNumber: string; password?: string }) =>
    request<{ message: string }>('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  flights: () => request<Flight[]>('/flights'),
  searchFlights: (query: URLSearchParams) => request<FlightSearchResponse>(`/flights/search?${query.toString()}`),
  flight: (id: number) => request<Flight>(`/flights/${id}`),
  seats: (flightId: number) => request<Seat[]>(`/flights/${flightId}/seats`),
  validateAvailability: (flightId: number, seatId: number) =>
    request<{ available: boolean }>(`/flights/${flightId}/validate-availability`, { method: 'POST', body: JSON.stringify({ seatId }) }),
  currentTrip: () => request<CurrentTripResponse>('/trips/current'),
  addTripService: (tripId: number, data: unknown) => request<{ id: number; message: string }>(`/trips/${tripId}/services`, { method: 'POST', body: JSON.stringify(data) }),
  deleteTripService: (tripId: number, serviceId: number) => request<{ message: string }>(`/trips/${tripId}/services/${serviceId}`, { method: 'DELETE' }),
  tripSummary: (tripId: number) => request<{ services: CurrentTripResponse['services']; costs: CurrentTripResponse['summary'] }>(`/trips/${tripId}/summary`),
  confirmTrip: (tripId: number, paymentMethod: string) => request<{ message: string; status: string }>(`/trips/${tripId}/confirm`, { method: 'POST', body: JSON.stringify({ paymentMethod }) }),
  stats: () => request<AdminStats>('/admin/stats'),
  reservations: () => request<Reservation[]>('/reservations')
};

export function persistAuth(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
