/**
 * useDeals Hook - Repository Pattern
 * Encapsulates data fetching and state management for flight deals
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient, FlightDeal } from '@/lib/api';

interface UseDealsState {
  deals: FlightDeal[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDeals(): UseDealsState {
  const [deals, setDeals] = useState<FlightDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getDeals();
      setDeals(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch deals'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  return { deals, loading, error, refetch: fetchDeals };
}

interface UseBookingState {
  bookingId: string | null;
  loading: boolean;
  error: Error | null;
  createBooking: (dealId: string, phoneNumber: string) => Promise<string>;
}

export function useBooking(): UseBookingState {
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createBooking = useCallback(
    async (dealId: string, phoneNumber: string) => {
      try {
        setLoading(true);
        setError(null);
        const booking = await apiClient.createBooking(dealId, phoneNumber);
        setBookingId(booking.id);
        return booking.id;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Booking failed');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { bookingId, loading, error, createBooking };
}

interface UseAuthState {
  isAuthenticated: boolean;
  phoneNumber: string | null;
  loading: boolean;
  error: Error | null;
  sendOTP: (phoneNumber: string) => Promise<void>;
  verifyOTP: (phoneNumber: string, otp: string) => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check if token exists in localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      const storedPhone = localStorage.getItem('phoneNumber');
      if (token) {
        apiClient.setToken(token);
        setIsAuthenticated(true);
        setPhoneNumber(storedPhone);
      }
    }
  }, []);

  const sendOTP = useCallback(async (phone: string) => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.sendOTP(phone);
      setPhoneNumber(phone);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send OTP');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOTP = useCallback(async (phone: string, otp: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.verifyOTP(phone, otp);
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('phoneNumber', phone);
      setIsAuthenticated(true);
      setPhoneNumber(phone);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('OTP verification failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('phoneNumber');
    apiClient.setToken('');
    setIsAuthenticated(false);
    setPhoneNumber(null);
  }, []);

  return { isAuthenticated, phoneNumber, loading, error, sendOTP, verifyOTP, logout };
}
