export interface UserPayload {
  id: number;
  email: string;
  role: 'administrativo' | 'usuario';
}

export interface LoginBody {
  email: string;
  password: string;
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
