/**
 * Booking Page - Direct Phone-based Flight Booking
 * Collects passenger name, phone, departure date/time & shows receipt popup
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DealCountdown } from '@/components/DealCountdown';
import { CabinSeatMap } from '@/components/CabinSeatMap';
import { PageHead } from '@/components/PageHead';
import { ALL_SEATS, cabinClassOf, seatsTotal } from '@/lib/cabin';
import { apiClient, FlightDeal, Booking } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function BookingPage() {
    const { isLoggedIn, phoneNumber: loggedPhone, walletBalance, refreshWallet } = useAuthContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dealId = searchParams.get('id') ?? '';

  const [deal, setDeal] = useState<FlightDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passengerName, setPassengerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [occupiedSeatIds, setOccupiedSeatIds] = useState<string[]>([]);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Load deal details
  useEffect(() => {
    const loadDeal = async () => {
      try {
        setLoading(true);
        setError(null);
        const dealData = await apiClient.getDealById(dealId);
        setDeal(dealData);
        // Pre-fill departure date from deal if available
        if (dealData.departureDate) {
          const d = new Date(dealData.departureDate);
          setDepartureDate(d.toISOString().slice(0, 10));
          setDepartureTime(d.toTimeString().slice(0, 5));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deal');
      } finally {
        setLoading(false);
      }
    };
    if (dealId) loadDeal();
  }, [dealId]);

  useEffect(() => {
    if (isLoggedIn && loggedPhone) {
      setPhoneNumber(loggedPhone);
    }
  }, [isLoggedIn, loggedPhone]);

  const formatDuration = (mins?: number) => {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const arrivalTime = useMemo(() => {
    if (!departureDate || !departureTime || !deal?.durationMinutes) return null;
    const dep = new Date(`${departureDate}T${departureTime}`);
    if (isNaN(dep.getTime())) return null;
    const arr = new Date(dep.getTime() + deal.durationMinutes * 60000);
    return arr;
  }, [departureDate, departureTime, deal?.durationMinutes]);

  const totalSeatCapacity = ALL_SEATS.length;

  const occupiedSeats = useMemo(() => new Set(occupiedSeatIds), [occupiedSeatIds]);

  useEffect(() => {
    const loadOccupiedSeats = async () => {
      if (!deal) return;

      let selectedDepartureTime: string | undefined;
      if (departureDate && departureTime) {
        selectedDepartureTime = `${departureDate}T${departureTime}:00`;
      }

      try {
        const seats = await apiClient.getOccupiedSeats(deal.id, selectedDepartureTime);
        setOccupiedSeatIds(seats.map((seat) => seat.toUpperCase()));
      } catch {
        // Keep UI functional if occupied-seat API is temporarily unavailable.
        setOccupiedSeatIds([]);
      }
    };

    loadOccupiedSeats();
  }, [deal, departureDate, departureTime]);

  useEffect(() => {
    setSelectedSeats((prev) => prev.filter((seat) => !occupiedSeats.has(seat)));
  }, [occupiedSeats]);

  const availableSeatCount = totalSeatCapacity - occupiedSeats.size;
  const passengerCount = adults + children;

  useEffect(() => {
    setSelectedSeats((prev) => (prev.length > passengerCount ? prev.slice(prev.length - passengerCount) : prev));
  }, [passengerCount]);

  const handleBooking = async () => {
    setPhoneError(null);
    setBookingError(null);
    if (!phoneNumber.match(/^\+91\d{10}$/)) {
      setPhoneError('Enter a valid Indian phone number (e.g. +919876543210)');
      return;
    }
    if (!deal) return;

    if (passengerCount <= 0) {
      setBookingError('Please select at least one passenger.');
      return;
    }

    if (passengerCount > availableSeatCount) {
      setBookingError('Passenger count exceeds remaining available seats.');
      return;
    }

    if (selectedSeats.length !== passengerCount) {
      setBookingError(`Please select exactly ${passengerCount} seat(s).`);
      return;
    }

    let selectedDepartureTime: string | undefined;
    if (departureDate && departureTime) {
      selectedDepartureTime = `${departureDate}T${departureTime}:00`;
    }

    try {
      setBookingLoading(true);
      const passengerTag = `A${adults}-C${children}`;
      const combinedName = [passengerName.trim(), passengerTag].filter(Boolean).join(' ');
      const result = await apiClient.createBooking(
        deal.id,
        phoneNumber,
        combinedName || undefined,
        selectedDepartureTime,
        selectedSeats,
        passengerCount
      );
      setBooking(result);
      await refreshWallet();
      setShowReceipt(true);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen cyber-bg text-white grid place-items-center">
        <p className="text-white/60 animate-pulse">Opening the cabin…</p>
      </main>
    );
  }

  if (error || !deal) {
    return (
      <main className="min-h-screen cyber-bg text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-24">
          <PageHead kicker="Fare not found" top="This flight" bottom="has left." sub={error || 'The fare you opened is no longer available.'} />
          <button type="button" onClick={() => router.push('/')} className="bmf-cta">
            See today’s fares
          </button>
        </div>
      </main>
    );
  }

  const unitPrice = deal.cost;
  const originalPrice = deal.discount ? Math.round(deal.cost / (1 - deal.discount / 100)) : deal.cost;
  const unseated = Math.max(0, passengerCount - selectedSeats.length);
  const totalPrice = Math.round((seatsTotal(unitPrice, selectedSeats) + unitPrice * unseated) * 100) / 100;
  const totalOriginalPrice = Math.round((seatsTotal(originalPrice, selectedSeats) + originalPrice * unseated) * 100) / 100;
  const seatClassSummary = Object.entries(
    selectedSeats.reduce<Record<string, number>>((acc, s) => {
      const name = cabinClassOf(s)?.name ?? 'Economy';
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, n]) => `${n}× ${name}`)
    .join(', ');

  const toggleSeat = (seatId: string) => {
    if (occupiedSeats.has(seatId)) return;
    setBookingError(null);
    setSelectedSeats((prev) => {
      if (prev.includes(seatId)) {
        return prev.filter((id) => id !== seatId);
      }
      if (prev.length >= passengerCount) {
        return [...prev.slice(1), seatId];
      }
      return [...prev, seatId];
    });
  };

  return (
    <main className="min-h-screen cyber-bg text-white">
      <CabinSeatMap
        route={`${deal.departureCity.split(',')[0]} to ${deal.arrivalCity.split(',')[0]}`}
        unitPrice={unitPrice}
        occupied={occupiedSeatIds}
        selected={selectedSeats}
        passengerCount={passengerCount}
        adults={adults}
        kids={children}
        onAdults={setAdults}
        onKids={setChildren}
        onToggle={toggleSeat}
      >
        <div className="space-y-6">
          <div>
            <p className="text-xs text-white/50 mb-2">Your flight</p>
            <div className="flex items-center gap-3">
              <p className="text-2xl font-bold tracking-[-0.03em] truncate">{deal.departureCity.split(',')[0]}</p>
              <span className="flex-1 min-w-6 flex items-center gap-1.5 text-[#ffb45e]">
                <span className="h-px flex-1 bg-white/20" />
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
                <span className="h-px flex-1 bg-white/20" />
              </span>
              <p className="text-2xl font-bold tracking-[-0.03em] truncate text-right">{deal.arrivalCity.split(',')[0]}</p>
            </div>
            <p className="mt-1 text-sm text-white/55">
              {deal.durationMinutes ? `${formatDuration(deal.durationMinutes)} non-stop` : 'Non-stop'}
              {arrivalTime && `, lands ${arrivalTime.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
            </p>
            <div className="mt-4 pt-4 border-t border-white/10">
              <DealCountdown expiresAt={deal.expiresAt} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="bmf-label">Departure date</span>
              <input id="depDate" type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className="bmf-field [color-scheme:dark]" />
            </label>
            <label className="block">
              <span className="bmf-label">Time</span>
              <input id="depTime" type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} className="bmf-field [color-scheme:dark]" />
            </label>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="bmf-label">Passenger name</span>
              <input id="name" type="text" placeholder="As on your ID" value={passengerName} onChange={(e) => setPassengerName(e.target.value)} className="bmf-field" autoComplete="name" />
            </label>
            <label className="block">
              <span className="bmf-label">Phone number</span>
              <input
                id="phone"
                type="tel"
                placeholder="+919876543210"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setPhoneError(null);
                }}
                className="bmf-field"
                autoComplete="tel"
              />
              {phoneError && <span className="block text-xs text-destructive mt-2">{phoneError}</span>}
            </label>
          </div>

          <dl className="space-y-2.5 text-sm border-t border-white/10 pt-5">
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Economy fare</dt>
              <dd className="tabular-nums">₹{unitPrice.toLocaleString('en-IN')} <span className="text-white/45">per seat</span></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Seats</dt>
              <dd className="text-right">{selectedSeats.length ? `${selectedSeats.join(', ')}` : <span className="text-white/45">Pick in the cabin</span>}</dd>
            </div>
            {seatClassSummary && (
              <div className="flex justify-between gap-4">
                <dt className="text-white/55">Cabin</dt>
                <dd className="text-right">{seatClassSummary}</dd>
              </div>
            )}
            {deal.discount ? (
              <div className="flex justify-between gap-4">
                <dt className="text-white/55">You save</dt>
                <dd className="text-[#ffb45e] tabular-nums">
                  {deal.discount}% <s className="ml-2 text-white/40">₹{totalOriginalPrice.toLocaleString('en-IN')}</s>
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between items-baseline gap-4 pt-3 border-t border-white/10">
              <dt className="text-white/70">Total, {passengerCount} passenger{passengerCount > 1 ? 's' : ''}</dt>
              <dd className="text-3xl font-bold tracking-[-0.04em] tabular-nums text-[#ffd29b]">₹{totalPrice.toLocaleString('en-IN')}</dd>
            </div>
            {isLoggedIn && (
              <div className="flex justify-between gap-4 text-xs">
                <dt className="text-white/45">Wallet balance</dt>
                <dd className="tabular-nums text-white/70">₹{walletBalance.toLocaleString('en-IN')}</dd>
              </div>
            )}
          </dl>

          {bookingError && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{bookingError}</p>
          )}

          <div>
            <button type="button" onClick={handleBooking} disabled={bookingLoading || !phoneNumber} className="bmf-cta w-full">
              {bookingLoading ? 'Booking…' : selectedSeats.length === passengerCount ? `Book ${selectedSeats.length > 1 ? 'seats' : 'seat'} ${selectedSeats.join(', ')}` : 'Confirm and book'}
            </button>
            <p className="text-xs text-white/40 text-center mt-3">Paid from your wallet. By booking you agree to the fare rules.</p>
          </div>
        </div>
      </CabinSeatMap>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 animate-scale-in">
                <svg className="w-7 h-7 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Booking Confirmed!</DialogTitle>
            <DialogDescription className="text-center">
              Your flight has been successfully booked.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking ID</span>
                <span className="font-mono font-semibold text-foreground">{booking?.id?.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="border-t" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Route</span>
                <span className="font-semibold text-foreground">{deal.departureCity} → {deal.arrivalCity}</span>
              </div>
              {passengerName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Passenger</span>
                  <span className="font-semibold text-foreground">{passengerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-semibold text-foreground">{phoneNumber}</span>
              </div>
              {departureDate && departureTime && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Departure</span>
                  <span className="font-semibold text-foreground">
                    {new Date(`${departureDate}T${departureTime}`).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              {arrivalTime && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Arrival</span>
                  <span className="font-semibold text-accent">
                    {arrivalTime.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              {deal.durationMinutes && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-semibold text-foreground">{formatDuration(deal.durationMinutes)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Passengers</span>
                <span className="font-semibold text-foreground">Adults {adults}, Children {children}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seats</span>
                <span className="font-semibold text-foreground">{selectedSeats.join(', ') || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-bold text-primary text-base">₹{(booking?.cost ?? totalPrice).toLocaleString('en-IN')}</span>
              </div>
              {booking?.walletBalance != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wallet Balance</span>
                  <span className="font-bold text-foreground">₹{booking.walletBalance.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                  Confirmed
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => router.push('/')}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                Browse More Flights
              </Button>
              <Button
                onClick={() => setShowReceipt(false)}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
