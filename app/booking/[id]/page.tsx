/**
 * Booking Page - Direct Phone-based Flight Booking
 * Collects passenger name, phone, departure date/time & shows receipt popup
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DealCountdown } from '@/components/DealCountdown';
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
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;

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

  const seatColumns = useMemo(() => ['A', 'B', 'C', 'D', 'E', 'F'], []);
  const seatRowNumbers = useMemo(() => Array.from({ length: 10 }, (_, idx) => idx + 1), []);
  const totalSeatCapacity = seatColumns.length * seatRowNumbers.length;

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
      <main className="min-h-screen cyber-bg text-white py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-purple-500/10 rounded-lg" />
            <div className="h-64 bg-purple-500/10 rounded-lg" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !deal) {
    return (
      <main className="min-h-screen cyber-bg text-white py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="p-6 border-destructive/30 bg-destructive/5">
            <h2 className="text-lg font-bold text-destructive mb-2">Deal Not Found</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {error || 'The deal you are looking for is not available.'}
            </p>
            <Button onClick={() => router.push('/')} className="bg-violet-500 hover:bg-violet-400 text-white">
              Back to Flights
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  const unitPrice = deal.cost;
  const originalPrice = deal.discount ? Math.round(deal.cost / (1 - deal.discount / 100)) : deal.cost;
  const totalPrice = Math.round(unitPrice * passengerCount * 100) / 100;
  const totalOriginalPrice = Math.round(originalPrice * passengerCount * 100) / 100;

  const toggleSeat = (seatId: string) => {
    if (occupiedSeats.has(seatId)) return;
    setBookingError(null);
    setSelectedSeats((prev) => {
      if (prev.includes(seatId)) {
        return prev.filter((id) => id !== seatId);
      }
      if (prev.length >= passengerCount) {
        return prev;
      }
      return [...prev, seatId];
    });
  };

  return (
    <main className="min-h-screen cyber-bg text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-8 animate-fade-in-up display-font neon-title">Complete Your Booking</h1>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Deal Details */}
          <Card className="p-6 shadow-md animate-fade-in-up animation-delay-100">
            <h2 className="text-lg font-semibold text-foreground mb-4">Flight Details</h2>
            <div className="mb-6">
              <div className="flex items-center justify-between gap-2">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-foreground">{deal.departureCity.split(',')[0]}</p>
                  <p className="text-xs text-muted-foreground mt-1">Departure</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-6 h-6 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                  </svg>
                  {deal.durationMinutes && (
                    <span className="text-xs text-muted-foreground font-medium">{formatDuration(deal.durationMinutes)}</span>
                  )}
                </div>
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-foreground">{deal.arrivalCity.split(',')[0]}</p>
                  <p className="text-xs text-muted-foreground mt-1">Arrival</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price / Passenger</span>
                <span className="text-2xl font-bold text-primary">₹{unitPrice.toLocaleString('en-IN')}</span>
              </div>
              {deal.discount ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Original</span>
                    <span className="text-sm line-through text-muted-foreground">₹{originalPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-sm font-semibold text-accent">{deal.discount}% OFF</span>
                  </div>
                </>
              ) : null}
              {deal.durationMinutes && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="text-sm font-semibold text-foreground">{formatDuration(deal.durationMinutes)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-2 mt-2">
                <span className="text-muted-foreground">Total ({passengerCount} Passenger{passengerCount > 1 ? 's' : ''})</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">₹{totalPrice.toLocaleString('en-IN')}</span>
                  {deal.discount ? (
                    <div className="text-xs line-through text-muted-foreground">₹{totalOriginalPrice.toLocaleString('en-IN')}</div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Selected departure & arrival preview */}
            {departureDate && departureTime && (
              <div className="mt-4 pt-4 border-t bg-primary/5 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Departure</span>
                  <span className="font-semibold text-foreground">
                    {new Date(`${departureDate}T${departureTime}`).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {arrivalTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Est. Arrival</span>
                    <span className="font-semibold text-accent">
                      {arrivalTime.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 pt-4 border-t">
              <DealCountdown expiresAt={deal.expiresAt} />
            </div>

            {isLoggedIn && (
              <div className="mt-4 rounded-lg bg-primary/5 border border-primary/15 p-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Wallet Balance</span>
                <span className="font-bold text-primary">Rs {walletBalance.toLocaleString('en-IN')}</span>
              </div>
            )}
          </Card>

          {/* Booking Form */}
          <div className="space-y-6 animate-fade-in-up animation-delay-200">
            <Card className="p-6 shadow-md">
              <h2 className="text-lg font-semibold text-foreground mb-1">Passenger Details</h2>
              <p className="text-sm text-muted-foreground mb-5">Fill in your details to book this flight</p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    Passenger Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                    Phone Number *
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+919876543210"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      setPhoneError(null);
                    }}
                    className="w-full"
                  />
                  {phoneError && (
                    <p className="text-xs text-destructive mt-2">{phoneError}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="depDate" className="block text-sm font-medium text-foreground mb-2">
                      Departure Date
                    </label>
                    <Input
                      id="depDate"
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="depTime" className="block text-sm font-medium text-foreground mb-2">
                      Departure Time
                    </label>
                    <Input
                      id="depTime"
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-secondary/10 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Adults</span>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setAdults((v) => Math.max(1, v - 1))}>-</Button>
                      <span className="w-6 text-center font-semibold">{adults}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => setAdults((v) => Math.min(9, v + 1))}>+</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Children</span>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setChildren((v) => Math.max(0, v - 1))}>-</Button>
                      <span className="w-6 text-center font-semibold">{children}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => setChildren((v) => Math.min(9, v + 1))}>+</Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Available seats: {availableSeatCount} / {totalSeatCapacity}</p>
                </div>

                <div className="rounded-lg border border-border bg-secondary/10 p-3">
                  <p className="text-sm font-medium text-foreground mb-2">Select Seats ({selectedSeats.length}/{passengerCount})</p>
                  <div className="mx-auto max-w-xl rounded-xl border border-border/70 bg-background/60 p-3">
                    <div className="mx-auto mb-3 h-8 w-40 rounded-b-2xl border border-border/70 bg-secondary/30 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground leading-8">
                      Cockpit
                    </div>
                    <div className="mb-2 grid grid-cols-[28px_1fr_22px_1fr] items-center gap-2 text-[10px] font-semibold tracking-widest text-muted-foreground">
                      <span />
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <span>A</span>
                        <span>B</span>
                        <span>C</span>
                      </div>
                      <span className="text-center">|</span>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <span>D</span>
                        <span>E</span>
                        <span>F</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {seatRowNumbers.map((row) => (
                        <div key={row} className="grid grid-cols-[28px_1fr_22px_1fr] items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground text-center">{row}</span>
                          <div className="grid grid-cols-3 gap-2">
                            {seatColumns.slice(0, 3).map((col) => {
                              const seatId = `${row}${col}`;
                              const occupied = occupiedSeats.has(seatId);
                              const selected = selectedSeats.includes(seatId);
                              return (
                                <button
                                  key={seatId}
                                  type="button"
                                  disabled={occupied}
                                  onClick={() => toggleSeat(seatId)}
                                  className={`h-9 rounded-md text-xs font-semibold border transition-colors ${
                                    occupied
                                      ? 'bg-muted/60 text-muted-foreground border-border cursor-not-allowed'
                                      : selected
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'bg-background text-foreground border-border hover:bg-primary/10'
                                  }`}
                                >
                                  {seatId}
                                </button>
                              );
                            })}
                          </div>
                          <span className="text-[10px] text-muted-foreground text-center">Aisle</span>
                          <div className="grid grid-cols-3 gap-2">
                            {seatColumns.slice(3).map((col) => {
                              const seatId = `${row}${col}`;
                              const occupied = occupiedSeats.has(seatId);
                              const selected = selectedSeats.includes(seatId);
                              return (
                                <button
                                  key={seatId}
                                  type="button"
                                  disabled={occupied}
                                  onClick={() => toggleSeat(seatId)}
                                  className={`h-9 rounded-md text-xs font-semibold border transition-colors ${
                                    occupied
                                      ? 'bg-muted/60 text-muted-foreground border-border cursor-not-allowed'
                                      : selected
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'bg-background text-foreground border-border hover:bg-primary/10'
                                  }`}
                                >
                                  {seatId}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-3">
                    <span>Selected: {selectedSeats.join(', ') || '-'}</span>
                    <span>Legend: filled = selected, gray = occupied</span>
                  </div>
                </div>

                {arrivalTime && (
                  <div className="bg-accent/10 rounded-lg p-3 flex items-center gap-3">
                    <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Estimated arrival: </span>
                      <span className="font-semibold text-accent">
                        {arrivalTime.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {deal.durationMinutes && (
                        <span className="text-muted-foreground"> ({formatDuration(deal.durationMinutes)} flight)</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {bookingError && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mt-4">
                  <p className="text-sm text-destructive font-medium">{bookingError}</p>
                </div>
              )}

              <Button
                onClick={handleBooking}
                disabled={bookingLoading || !phoneNumber}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-base mt-6"
              >
                {bookingLoading ? 'Processing...' : 'Confirm & Book Flight'}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                By confirming, you agree to our terms and conditions.
              </p>
            </Card>
          </div>
        </div>
      </div>

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
                  <span className="font-bold text-foreground">Rs {booking.walletBalance.toLocaleString('en-IN')}</span>
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
