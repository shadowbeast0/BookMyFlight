/**
 * Booking Confirmation Page
 * Shows successful booking confirmation with details
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function BookingConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  return (
    <main className="min-h-screen cyber-bg text-white py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border border-green-400/30 mb-4">
            <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 display-font neon-title">Booking Confirmed!</h1>
          <p className="text-lg text-purple-100/75">Your flight has been successfully booked</p>
        </div>

        {/* Confirmation Card */}
        <Card className="p-8 mb-8 border-green-400/25 bg-green-500/5 neon-card">
          <div className="space-y-6">
            <div>
              <p className="text-xs text-purple-100/60 uppercase tracking-wide font-semibold mb-1">
                Booking Reference
              </p>
              <p className="text-2xl font-mono font-bold text-white">{bookingId.toUpperCase()}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-purple-100/60 uppercase tracking-wide font-semibold mb-1">
                  What To Expect
                </p>
                <ul className="space-y-2 text-sm text-purple-100/80">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Booking confirmed instantly
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    E-ticket generated
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Ready to web check-in 24hrs before
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-xs text-purple-100/60 uppercase tracking-wide font-semibold mb-1">
                  Security
                </p>
                <ul className="space-y-2 text-sm text-purple-100/80">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    JWT secured booking
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Encrypted data transmission
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    No password required
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => router.push('/')}
            className="flex-1 bg-violet-500 hover:bg-violet-400 text-white font-semibold"
          >
            Browse More Deals
          </Button>
          <Button
            onClick={() => router.push('/my-bookings')}
            variant="secondary"
            className="flex-1 font-semibold"
          >
            Manage Booking
          </Button>
          <Button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'My Flight Booking',
                  text: `I just booked my flight! Reference: ${bookingId}`,
                });
              }
            }}
            variant="outline"
            className="flex-1"
          >
            Share Booking
          </Button>
        </div>

        {/* Info Section */}
        <div className="mt-12 rounded-lg bg-secondary/10 border border-secondary/20 p-6">
          <h3 className="font-semibold text-foreground mb-4">Important Information</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• You can cancel this booking from My Bookings. Refund policy: full refund if cancelled more than 10 days before departure, otherwise 50%.</li>
            <li>• Web check-in opens 24 hours before your departure.</li>
            <li>• Carry a valid government-issued photo ID to the airport.</li>
            <li>• Arrive at least 2 hours before domestic flights.</li>
            <li>• Save your booking reference for future queries.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
