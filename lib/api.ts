/**
 * API Client Service - Facade Pattern
 * Centralizes all backend API calls for deals, bookings, and authentication
 */

import { LocalApiError, localRequest } from '@/lib/localBackend';

const REMOTE = process.env.NEXT_PUBLIC_API_URL || '';
const API_BASE = REMOTE || '/api';
export const isLocalMode = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';
const TOKEN_KEY = 'bmf_token';

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
  private token: string | null = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;

  setToken(token: string) {
    this.token = token || null;
    if (typeof window === 'undefined') return;
    if (this.token) window.localStorage.setItem(TOKEN_KEY, this.token);
    else window.localStorage.removeItem(TOKEN_KEY);
  }

  clearToken() {
    this.setToken('');
  }

  getToken() {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (isLocalMode) {
      try {
        const body = typeof options.body === 'string' ? JSON.parse(options.body) : undefined;
        return (await localRequest(options.method ?? 'GET', endpoint, body, this.token)) as T;
      } catch (error) {
        if (error instanceof LocalApiError && error.status === 401) this.clearToken();
        throw error instanceof Error ? new Error(error.message) : error;
      }
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
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
      if (response.status === 401) this.clearToken();
      const message = error.error || error.message || (response.status === 401 ? 'Please sign in again' : response.status === 403 ? 'You do not have permission to do that' : `API Error: ${response.status}`);
      throw new Error(message);
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
  async sendOTP(phoneNumber: string): Promise<{ message: string; demoOtp?: string }> {
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

  async me(): Promise<{ phoneNumber: string; admin: boolean }> {
    return this.request('/auth/me');
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

  async getUserBookings(phoneNumber?: string): Promise<Booking[]> {
    return this.request<Booking[]>(phoneNumber ? `/bookings?phone=${encodeURIComponent(phoneNumber)}` : '/bookings');
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
  async getWallet(): Promise<Wallet> {
    return this.request<Wallet>('/wallet');
  }

  async topUpWallet(amount: number): Promise<Wallet> {
    return this.request<Wallet>('/wallet/top-up', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }
}

export const apiClient = new APIClient();
