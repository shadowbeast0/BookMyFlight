'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiClient } from '@/lib/api';

interface AuthState {
  isLoggedIn: boolean;
  phoneNumber: string | null;
  isAdmin: boolean;
  walletBalance: number;
  refreshWallet: () => Promise<void>;
  topUpWallet: (amount: number) => Promise<void>;
  login: (phone: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isLoggedIn: false,
  phoneNumber: null,
  isAdmin: false,
  walletBalance: 0,
  refreshWallet: async () => {},
  topUpWallet: async () => {},
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPhones, setAdminPhones] = useState<string[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);

  const getWalletStorageKey = useCallback((phone: string) => `bmf_wallet_${phone}`, []);

  // Load admin phone list
  useEffect(() => {
    fetch('/admin.json')
      .then((res) => res.json())
      .then((data) => setAdminPhones(data.adminPhones || []))
      .catch(() => setAdminPhones([]));
  }, []);

  // Restore session from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('bmf_phone');
      if (stored) {
        setPhoneNumber(stored);
      }
    }
  }, []);

  // Check admin status when phone or adminPhones change
  useEffect(() => {
    if (phoneNumber && adminPhones.length > 0) {
      setIsAdmin(adminPhones.includes(phoneNumber));
    } else {
      setIsAdmin(false);
    }
  }, [phoneNumber, adminPhones]);

  const refreshWallet = useCallback(async () => {
    if (!phoneNumber) {
      setWalletBalance(0);
      return;
    }
    try {
      const wallet = await apiClient.getWallet(phoneNumber);
      const balance = wallet.balance || 0;
      setWalletBalance(balance);
      localStorage.setItem(getWalletStorageKey(phoneNumber), String(balance));
    } catch {
      const stored = localStorage.getItem(getWalletStorageKey(phoneNumber));
      setWalletBalance(stored ? Number(stored) : 0);
    }
  }, [phoneNumber, getWalletStorageKey]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  const login = useCallback((phone: string) => {
    setPhoneNumber(phone);
    localStorage.setItem('bmf_phone', phone);
    const storedWallet = localStorage.getItem(getWalletStorageKey(phone));
    setWalletBalance(storedWallet ? Number(storedWallet) : 0);
  }, [getWalletStorageKey]);

  const topUpWallet = useCallback(async (amount: number) => {
    if (!phoneNumber) {
      throw new Error('Please login first');
    }
    try {
      const wallet = await apiClient.topUpWallet(phoneNumber, amount);
      const balance = wallet.balance || 0;
      setWalletBalance(balance);
      localStorage.setItem(getWalletStorageKey(phoneNumber), String(balance));
    } catch {
      const next = walletBalance + amount;
      setWalletBalance(next);
      localStorage.setItem(getWalletStorageKey(phoneNumber), String(next));
    }
  }, [phoneNumber, walletBalance, getWalletStorageKey]);

  const logout = useCallback(() => {
    setPhoneNumber(null);
    setIsAdmin(false);
    setWalletBalance(0);
    localStorage.removeItem('bmf_phone');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!phoneNumber,
        phoneNumber,
        isAdmin,
        walletBalance,
        refreshWallet,
        topUpWallet,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
