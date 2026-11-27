'use client';

import { useEffect, useState } from 'react';
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
import { BrandMark } from '@/components/BrandMark';

export function Navbar() {
  const pathname = usePathname();
  const { isLoggedIn, phoneNumber, isAdmin, walletBalance, requestCode, verifyCode, logout, topUpWallet } = useAuthContext();
  const [showLogin, setShowLogin] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [demoCode, setDemoCode] = useState<string | undefined>();
  const [authBusy, setAuthBusy] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState('');

  useEffect(() => {
    const open = () => setShowLogin(true);
    window.addEventListener('bmf:open-login', open);
    return () => window.removeEventListener('bmf:open-login', open);
  }, []);

  const resetLogin = () => {
    setCodeSent(false);
    setCodeInput('');
    setDemoCode(undefined);
    setPhoneError('');
  };

  const handleSendCode = async () => {
    if (!phoneInput.match(/^\+91\d{10}$/)) {
      setPhoneError('Enter a valid Indian phone number (e.g. +919876543210)');
      return;
    }
    try {
      setAuthBusy(true);
      setPhoneError('');
      setDemoCode(await requestCode(phoneInput));
      setCodeSent(true);
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Could not send the code');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!codeInput.match(/^\d{6}$/)) {
      setPhoneError('Enter the 6-digit code');
      return;
    }
    try {
      setAuthBusy(true);
      setPhoneError('');
      await verifyCode(phoneInput, codeInput);
      setShowLogin(false);
      setPhoneInput('');
      resetLogin();
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'That code did not work');
    } finally {
      setAuthBusy(false);
    }
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
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#05040b]/75 text-white border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="group flex items-center gap-3 cursor-pointer"
          >
            <BrandMark size={36} className="rounded-xl transition-transform duration-300 group-hover:-rotate-6" />
            <span className="text-[17px] font-bold tracking-[-0.02em] text-white">
              Book My Flight
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer ${
                  pathname === link.href
                    ? 'text-white after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-0 after:h-1 after:w-1 after:rounded-full after:bg-[#ffb45e]'
                    : 'text-white/60 hover:text-white'
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
                  className="flex items-center gap-2 rounded-full px-3 py-1.5 border border-white/20 bg-white/10 hover:bg-white/20 transition-colors"
                  title="Wallet"
                >
                  <span className="hidden sm:inline text-xs text-white/70">Wallet</span>
                  <span className="text-xs font-bold text-[#ffd29b]">₹{walletBalance.toLocaleString('en-IN')}</span>
                </button>
                <Button
                  onClick={logout}
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-white/70 hover:text-white hover:bg-white/10"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowLogin(true)}
                className="h-9 rounded-full px-5 bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/15 font-semibold text-sm"
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
                  ? 'bg-[#ffb45e] text-[#1a0e05]'
                  : 'text-white/70 hover:text-white bg-white/[0.05]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </header>

      {/* Login Dialog */}
      <Dialog open={showLogin} onOpenChange={(open) => { setShowLogin(open); if (!open) resetLogin(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Welcome to Book My Flight</DialogTitle>
            <DialogDescription>
              {codeSent ? `Enter the 6-digit code sent to ${phoneInput}` : 'Enter your Indian phone number to get a sign-in code'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {!codeSent ? (
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
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                />
              </div>
            ) : (
              <div>
                {demoCode && (
                  <p className="mb-3 rounded-lg border border-amber-300/40 bg-amber-300/10 p-3 text-sm">
                    Demo mode (no SMS is sent): your code is <strong className="font-mono tracking-widest">{demoCode}</strong>
                  </p>
                )}
                <label htmlFor="login-code" className="block text-sm font-medium mb-2">
                  Sign-in code
                </label>
                <Input
                  id="login-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value.replace(/\D/g, ''));
                    setPhoneError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                />
                <button type="button" className="mt-2 text-xs underline opacity-80" onClick={resetLogin}>
                  Use a different number
                </button>
              </div>
            )}
            {phoneError && (
              <p className="text-xs text-destructive">{phoneError}</p>
            )}
            <Button onClick={codeSent ? handleVerifyCode : handleSendCode} disabled={authBusy} className="w-full h-11 rounded-full font-semibold">
              {authBusy ? 'Please wait…' : codeSent ? 'Verify and sign in' : 'Send code'}
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
              <p className="text-2xl font-black text-primary">₹{walletBalance.toLocaleString('en-IN')}</p>
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
                  ₹{quick.toLocaleString('en-IN')}
                </Button>
              ))}
            </div>
            <Button onClick={handleTopUp} className="w-full h-11 rounded-full font-semibold" disabled={topUpLoading}>
              {topUpLoading ? 'Adding...' : 'Add From Bank'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
