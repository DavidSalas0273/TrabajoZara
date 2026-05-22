export interface UserPayload {
  id: number;
  email: string;
  role: 'administrativo' | 'usuario';
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface PurchaseBody {
  flightId: number;
  seatId: number;
  passenger: {
    fullName: string;
    documentNumber: string;
    email: string;
    phone: string;
  };
  payment: {
    method: string;
  };
}

export interface FlightSearchQuery {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  passengers?: string;
  page?: string;
  pageSize?: string;
  minPrice?: string;
  maxPrice?: string;
  duration?: string;
  stops?: string;
  cabinClass?: 'economica' | 'ejecutiva' | 'primera';
}
