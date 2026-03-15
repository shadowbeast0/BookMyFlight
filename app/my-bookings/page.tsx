'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiClient, Booking } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function MyBookingsPage() {
  const router = useRouter();
  const { isLoggedIn, phoneNumber, walletBalance, refreshWallet } = useAuthContext();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelResult, setCancelResult] = useState<Booking | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !phoneNumber) {
      setLoading(false);
      return;
    }
    loadBookings();
  }, [isLoggedIn, phoneNumber]);

  const loadBookings = async () => {
    if (!phoneNumber) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getUserBookings(phoneNumber);
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    try {
      setCancellingId(bookingId);
      const result = await apiClient.cancelBooking(bookingId);
      setCancelResult(result);
      await refreshWallet();
      setShowCancelDialog(true);
      setConfirmId(null);
      // Update booking in list
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: 'cancelled' as const, refundAmount: result.refundAmount } : b
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen cyber-bg text-white">
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-purple-500/10 mb-6">
            <svg className="w-10 h-10 text-purple-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Login Required</h2>
          <p className="text-purple-100/70 mb-6">Please login to view your bookings.</p>
          <Button onClick={() => router.push('/')} className="font-semibold bg-violet-500 hover:bg-violet-400 text-white">
            Go to Home
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen cyber-bg text-white">
      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-900/80 via-purple-900/70 to-purple-800/60 py-12 border-b border-purple-400/20">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 animate-fade-in-up display-font neon-title">
            My Bookings
          </h1>
          <p className="text-purple-100/70 animate-fade-in-up animation-delay-100">
            Manage your flight reservations
          </p>
          {isLoggedIn && (
            <div className="mt-4 inline-flex items-center gap-2 bg-purple-500/15 border border-purple-400/25 rounded-full px-4 py-1.5 text-sm text-white/90">
              <span>Wallet</span>
              <strong>Rs {walletBalance.toLocaleString('en-IN')}</strong>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-muted rounded w-1/3 mb-3" />
                <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                <div className="h-4 bg-muted rounded w-1/4" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-6 border-destructive/30 bg-destructive/5">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={loadBookings} className="mt-4" size="sm">
              Retry
            </Button>
          </Card>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-purple-500/10 mb-6">
              <svg className="w-10 h-10 text-purple-400/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No bookings yet</h3>
            <p className="text-purple-100/65 mb-6">Start by browsing our latest flight deals.</p>
            <Button onClick={() => router.push('/search')} className="font-semibold bg-violet-500 hover:bg-violet-400 text-white">
              Search Flights
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking, i) => {
              const isCancelled = booking.status === 'cancelled';
              return (
                <Card
                  key={booking.id}
                  className={`p-6 transition-all duration-300 animate-fade-in-up hover:shadow-md ${
                    isCancelled ? 'opacity-60 border-destructive/20' : 'border-l-4 border-l-purple-400'
                  }`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Route info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {booking.departureCity && booking.arrivalCity ? (
                          <h3 className="text-lg font-bold text-foreground">
                            {booking.departureCity} → {booking.arrivalCity}
                          </h3>
                        ) : (
                          <h3 className="text-lg font-bold text-foreground">
                            Booking #{booking.id.slice(0, 8)}
                          </h3>
                        )}
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                            isCancelled
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-accent/15 text-accent'
                          }`}
                        >
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                        {booking.passengerName && (
                          <span>Passenger: <strong className="text-foreground">{booking.passengerName}</strong></span>
                        )}
                        {booking.selectedSeats && booking.selectedSeats.length > 0 && (
                          <span>Seats: <strong className="text-foreground">{booking.selectedSeats.join(', ')}</strong></span>
                        )}
                        {booking.selectedDepartureTime && (
                          <span>
                            Dep: {new Date(booking.selectedDepartureTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {booking.durationMinutes && (
                          <span>{Math.floor(booking.durationMinutes / 60)}h {booking.durationMinutes % 60}m flight</span>
                        )}
                        {booking.departureDate && !booking.selectedDepartureTime && (
                          <span>
                            Departure: {new Date(booking.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        <span>
                          Booked: {new Date(booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="font-mono text-xs">Ref: {booking.id.slice(0, 8).toUpperCase()}</span>
                      </div>

                      {isCancelled && booking.refundAmount != null && (
                        <p className="text-sm text-accent font-semibold mt-2">
                          Refund: ₹{booking.refundAmount.toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>

                    {/* Price + actions */}
                    <div className="flex items-center gap-4">
                      {booking.cost != null && (
                        <div className="text-right">
                          <span className={`text-xl font-bold ${isCancelled ? 'text-muted-foreground line-through' : 'text-primary'}`}>
                            ₹{booking.cost.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}

                      {!isCancelled && (
                        <>
                          {confirmId === booking.id ? (
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleCancel(booking.id)}
                                disabled={cancellingId === booking.id}
                                variant="destructive"
                                size="sm"
                                className="font-semibold"
                              >
                                {cancellingId === booking.id ? 'Cancelling...' : 'Confirm'}
                              </Button>
                              <Button
                                onClick={() => setConfirmId(null)}
                                variant="outline"
                                size="sm"
                              >
                                No
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => setConfirmId(booking.id)}
                              variant="outline"
                              size="sm"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10 font-medium"
                            >
                              Cancel Flight
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancellation Result Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Booking Cancelled</DialogTitle>
            <DialogDescription>
              Your flight has been cancelled successfully.
            </DialogDescription>
          </DialogHeader>
          {cancelResult && (
            <div className="space-y-4 pt-2">
              {cancelResult.departureCity && cancelResult.arrivalCity && (
                <div className="text-center py-3 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold text-foreground">
                    {cancelResult.departureCity} → {cancelResult.arrivalCity}
                  </p>
                </div>
              )}

              {cancelResult.cost != null && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Original cost</span>
                  <span className="font-semibold line-through text-muted-foreground">
                    ₹{cancelResult.cost.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {cancelResult.refundAmount != null && (
                <div className="flex justify-between items-center p-3 bg-accent/10 rounded-lg">
                  <span className="font-semibold text-accent">Refund Amount</span>
                  <span className="text-2xl font-bold text-accent">
                    ₹{cancelResult.refundAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {cancelResult.walletBalance != null && (
                <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                  <span className="font-semibold text-primary">Updated Wallet</span>
                  <span className="text-xl font-bold text-primary">
                    Rs {cancelResult.walletBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                {cancelResult.refundAmount === cancelResult.cost
                  ? 'Full refund — cancelled more than 10 days before departure.'
                  : '50% refund — cancelled within 10 days of departure.'}
              </p>

              <Button onClick={() => setShowCancelDialog(false)} className="w-full font-semibold">
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
