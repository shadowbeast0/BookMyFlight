'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FlightMascot } from '@/components/FlightMascot';

export function Navbar() {
  const pathname = usePathname();
  const { isLoggedIn, phoneNumber, isAdmin, walletBalance, login, logout, topUpWallet } = useAuthContext();
  const [showLogin, setShowLogin] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState('');

  const handleLogin = () => {
    if (!phoneInput.match(/^\+91\d{10}$/)) {
      setPhoneError('Enter a valid Indian phone number (e.g. +919876543210)');
      return;
    }
    login(phoneInput);
    setShowLogin(false);
    setPhoneInput('');
    setPhoneError('');
  };

  const handleTopUp = async () => {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) {
      setTopUpError('Enter a valid amount greater than 0');
      return;
    }

    try {
      setTopUpLoading(true);
      setTopUpError('');
      await topUpWallet(amount);
      setTopUpAmount('');
      setShowWalletDialog(false);
    } catch (err) {
      setTopUpError(err instanceof Error ? err.message : 'Top up failed');
    } finally {
      setTopUpLoading(false);
    }
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/search', label: 'Search Flights' },
  ];

  if (isLoggedIn) {
    navLinks.push({ href: '/my-bookings', label: 'My Bookings' });
  }

  if (isAdmin) {
    navLinks.push({ href: '/admin', label: 'Admin Panel' });
  }

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0d0625]/92 text-white shadow-2xl border-b border-purple-400/20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 cyber-grid">
          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center gap-3 hover:opacity-95 transition-opacity cursor-pointer"
          >
            <div className="relative flex items-center justify-center rounded-2xl p-0.5 bg-gradient-to-br from-purple-300/60 via-white/40 to-amber-300/55 shadow-[0_0_22px_rgba(168,85,247,0.35)]">
              <div className="relative flex items-center justify-center rounded-[14px] h-11 w-11 bg-[#140733] border border-purple-300/35 overflow-hidden">
                <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_22%_18%,rgba(250,204,21,0.22),transparent_42%),radial-gradient(circle_at_84%_86%,rgba(192,132,252,0.3),transparent_48%)]" />
                <FlightMascot size="sm" />
                <span className="absolute bottom-0.5 right-1 text-[9px] font-black tracking-widest text-amber-200/80">BMF</span>
              </div>
            </div>
            <div>
              <h1 className="display-font neon-title text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-purple-300 via-white to-amber-200 bg-clip-text text-transparent">Book My Flight</h1>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  pathname === link.href
                    ? 'bg-purple-500/25 text-white shadow-inner border border-purple-400/30'
                    : 'text-white/85 hover:text-white hover:bg-purple-500/15'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs font-mono text-white/80">
                    {phoneNumber?.slice(-4)}
                  </span>
                  {isAdmin && (
                    <span className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full font-bold">
                      ADMIN
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setTopUpError('');
                    setShowWalletDialog(true);
                  }}
                  className="hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5 border border-white/20 bg-white/10 hover:bg-white/20 transition-colors"
                  title="Wallet"
                >
                  <span className="text-xs text-white/70">Wallet</span>
                  <span className="text-xs font-bold text-amber-200">Rs {walletBalance.toLocaleString('en-IN')}</span>
                </button>
                <Button
                  onClick={logout}
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-purple-500/15"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowLogin(true)}
                className="bg-purple-500/25 hover:bg-purple-500/35 text-white border border-purple-300/30 backdrop-blur-sm font-semibold text-sm"
              >
                Login
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex overflow-x-auto gap-1 px-4 pb-2 scrollbar-hide">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                pathname === link.href
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </header>

      {/* Login Dialog */}
      <Dialog open={showLogin} onOpenChange={setShowLogin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Welcome to Book My Flight</DialogTitle>
            <DialogDescription>
              Enter your Indian phone number to continue
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label htmlFor="login-phone" className="block text-sm font-medium mb-2">
                Phone Number
              </label>
              <Input
                id="login-phone"
                type="tel"
                placeholder="+919876543210"
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value);
                  setPhoneError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              {phoneError && (
                <p className="text-xs text-destructive mt-2">{phoneError}</p>
              )}
            </div>
            <Button onClick={handleLogin} className="w-full font-semibold">
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wallet Dialog */}
      <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Your Wallet</DialogTitle>
            <DialogDescription>
              Add money instantly from your bank for bookings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-xl bg-primary/5 border border-primary/15 p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Balance</p>
              <p className="text-2xl font-black text-primary">Rs {walletBalance.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <label htmlFor="topup-amount" className="block text-sm font-medium mb-2">
                Add Money
              </label>
              <Input
                id="topup-amount"
                type="number"
                min="1"
                placeholder="Enter amount"
                value={topUpAmount}
                onChange={(e) => {
                  setTopUpAmount(e.target.value);
                  setTopUpError('');
                }}
              />
              {topUpError && <p className="text-xs text-destructive mt-2">{topUpError}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1000, 2500, 5000].map((quick) => (
                <Button key={quick} variant="outline" size="sm" onClick={() => setTopUpAmount(String(quick))}>
                  Rs {quick}
                </Button>
              ))}
            </div>
            <Button onClick={handleTopUp} className="w-full font-semibold" disabled={topUpLoading}>
              {topUpLoading ? 'Adding...' : 'Add From Bank'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
