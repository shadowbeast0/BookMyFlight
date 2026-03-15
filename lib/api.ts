/**
 * API Client Service - Facade Pattern
 * Centralizes all backend API calls for deals, bookings, and authentication
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Admin endpoints use ?all=true to include inactive/expired deals
const ADMIN_DEALS_SUFFIX = '?all=true';

export interface FlightDeal {
  id: string;
  departureCity: string;
  arrivalCity: string;
  cost: number;
  expiresAt: string;
  isActive: boolean;
  discount?: number;
  durationMinutes?: number;
  departureDate?: string;
}

export interface Booking {
  id: string;
  dealId: string;
  phoneNumber: string;
  passengerName?: string;
  createdAt: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  departureCity?: string;
  arrivalCity?: string;
  cost?: number;
  departureDate?: string;
  selectedDepartureTime?: string;
  selectedSeats?: string[];
  durationMinutes?: number;
  refundAmount?: number;
  walletBalance?: number;
}

export interface Wallet {
  phoneNumber: string;
  balance: number;
}

export interface OTPRequest {
  phoneNumber: string;
  otp: string;
}

export interface AuthToken {
  token: string;
  expiresAt: string;
}

class APIClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    // Handle 204 No Content (e.g., DELETE responses)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // ===== Deals API (Repository Pattern) =====
  async getDeals(): Promise<FlightDeal[]> {
    return this.request<FlightDeal[]>('/deals');
  }

  async getAllDeals(): Promise<FlightDeal[]> {
    return this.request<FlightDeal[]>('/deals' + ADMIN_DEALS_SUFFIX);
  }

  async getDealById(id: string): Promise<FlightDeal> {
    return this.request<FlightDeal>(`/deals/${id}`);
  }

  async createDeal(deal: Omit<FlightDeal, 'id'>): Promise<FlightDeal> {
    return this.request<FlightDeal>('/deals', {
      method: 'POST',
      body: JSON.stringify(deal),
    });
  }

  async updateDeal(id: string, deal: Partial<FlightDeal>): Promise<FlightDeal> {
    return this.request<FlightDeal>(`/deals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(deal),
    });
  }

  async deleteDeal(id: string): Promise<void> {
    await this.request(`/deals/${id}`, {
      method: 'DELETE',
    });
  }

  // ===== Authentication API =====
  async sendOTP(phoneNumber: string): Promise<{ message: string }> {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  }

  async verifyOTP(phoneNumber: string, otp: string): Promise<AuthToken> {
    const result = await this.request<AuthToken>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, otp }),
    });
    if (result.token) {
      this.setToken(result.token);
    }
    return result;
  }

  // ===== Bookings API =====
  async createBooking(
    dealId: string,
    phoneNumber: string,
    passengerName?: string,
    selectedDepartureTime?: string,
    selectedSeats?: string[],
    passengerCount?: number
  ): Promise<Booking> {
    return this.request<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify({ dealId, phoneNumber, passengerName, selectedDepartureTime, selectedSeats, passengerCount }),
    });
  }

  async getBooking(id: string): Promise<Booking> {
    return this.request<Booking>(`/bookings/${id}`);
  }

  async getUserBookings(phoneNumber: string): Promise<Booking[]> {
    return this.request<Booking[]>(`/bookings?phone=${encodeURIComponent(phoneNumber)}`);
  }

  async getOccupiedSeats(dealId: string, departureTime?: string): Promise<string[]> {
    const params = new URLSearchParams({ dealId });
    if (departureTime) {
      params.set('departureTime', departureTime);
    }
    return this.request<string[]>(`/bookings/occupied-seats?${params.toString()}`);
  }

  // ===== Search & Connecting Flights =====
  async searchFlights(from: string, to: string): Promise<FlightDeal[]> {
    return this.request<FlightDeal[]>(`/deals/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  }

  async getConnectingFlights(from: string, to: string): Promise<FlightDeal[][]> {
    return this.request<FlightDeal[][]>(`/deals/connecting?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  }

  async getCities(): Promise<string[]> {
    return this.request<string[]>('/deals/cities');
  }

  // ===== Cancel Booking =====
  async cancelBooking(bookingId: string): Promise<Booking> {
    return this.request<Booking>(`/bookings/${bookingId}/cancel`, {
      method: 'PUT',
    });
  }

  // ===== Wallet API =====
  async getWallet(phoneNumber: string): Promise<Wallet> {
    return this.request<Wallet>(`/wallet?phone=${encodeURIComponent(phoneNumber)}`);
  }

  async topUpWallet(phoneNumber: string, amount: number): Promise<Wallet> {
    return this.request<Wallet>('/wallet/top-up', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, amount }),
    });
  }
}

export const apiClient = new APIClient();
