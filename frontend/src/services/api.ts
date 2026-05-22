import type { AdminStats, Flight, Reservation, Seat, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
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
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const payload = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem(TOKEN_KEY, payload.token);
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    return payload;
  },
  flights: () => request<Flight[]>('/flights'),
  seats: (flightId: number) => request<Seat[]>(`/flights/${flightId}/seats`),
  stats: () => request<AdminStats>('/admin/stats'),
  reservations: () => request<Reservation[]>('/reservations'),
  purchase: (data: {
    flightId: number;
    seatId: number;
    passenger: { fullName: string; documentNumber: string; email: string; phone: string };
    payment: { method: string };
  }) => request<{ message: string; reservationCode: string }>('/purchase', { method: 'POST', body: JSON.stringify(data) })
};
