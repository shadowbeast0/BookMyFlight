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
  requestCode: (phone: string) => Promise<string | undefined>;
  verifyCode: (phone: string, code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isLoggedIn: false,
  phoneNumber: null,
  isAdmin: false,
  walletBalance: 0,
  refreshWallet: async () => {},
  topUpWallet: async () => {},
  requestCode: async () => undefined,
  verifyCode: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  const clearSession = useCallback(() => {
    apiClient.clearToken();
    setPhoneNumber(null);
    setIsAdmin(false);
    setWalletBalance(0);
  }, []);

  useEffect(() => {
    if (!apiClient.getToken()) return;
    apiClient.me()
      .then((me) => {
        setPhoneNumber(me.phoneNumber);
        setIsAdmin(me.admin);
      })
      .catch(clearSession);
  }, [clearSession]);

  const refreshWallet = useCallback(async () => {
    if (!phoneNumber) {
      setWalletBalance(0);
      return;
    }
    try {
      const wallet = await apiClient.getWallet();
      setWalletBalance(wallet.balance || 0);
    } catch {
      // Keep the last known balance; never invent one locally.
    }
  }, [phoneNumber]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  const requestCode = useCallback(async (phone: string) => {
    const result = await apiClient.sendOTP(phone);
    return result.demoOtp;
  }, []);

  const verifyCode = useCallback(async (phone: string, code: string) => {
    await apiClient.verifyOTP(phone, code);
    const me = await apiClient.me();
    setPhoneNumber(me.phoneNumber);
    setIsAdmin(me.admin);
  }, []);

  const topUpWallet = useCallback(async (amount: number) => {
    if (!phoneNumber) throw new Error('Please sign in first');
    const wallet = await apiClient.topUpWallet(amount);
    setWalletBalance(wallet.balance || 0);
  }, [phoneNumber]);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!phoneNumber,
        phoneNumber,
        isAdmin,
        walletBalance,
        refreshWallet,
        topUpWallet,
        requestCode,
        verifyCode,
        logout: clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
