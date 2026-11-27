/**
 * Booking Confirmation Page
 * Shows successful booking confirmation with details
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { PageHead } from '@/components/PageHead';

export default function BookingConfirmationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('id') ?? '';

  return (
    <main className="min-h-screen cyber-bg text-white">
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-24">
        <PageHead kicker="Confirmed" top="You're" bottom="booked." sub="Your seats are locked in and your ticket is ready." />

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
          <section className="bmf-panel p-6 md:p-8">
            <p className="bmf-section-label">Booking reference</p>
            <p className="mt-2 text-3xl md:text-4xl font-bold tracking-[0.04em] font-mono text-[#ffd29b] break-all">{bookingId.toUpperCase() || '—'}</p>
            <ul className="mt-8 grid sm:grid-cols-3 gap-4 text-sm text-white/75">
              <li className="border-t border-white/10 pt-3">Confirmed instantly</li>
              <li className="border-t border-white/10 pt-3">E-ticket ready</li>
              <li className="border-t border-white/10 pt-3">Web check-in opens 24 h before</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" className="bmf-cta" onClick={() => router.push('/my-bookings')}>
                View my trips
              </button>
              <button type="button" className="bmf-ghost" onClick={() => router.push('/')}>
                Browse more fares
              </button>
              <button
                type="button"
                className="bmf-ghost"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'My Flight Booking',
                      text: `I just booked my flight! Reference: ${bookingId}`,
                    });
                  }
                }}
              >
                Share
              </button>
            </div>
          </section>

          <section className="bmf-panel p-6 md:p-8">
            <h2 className="text-lg font-semibold mb-4">Before you fly</h2>
            <ul className="space-y-3 text-sm text-white/65">
              <li>Cancel from My trips any time. Full refund more than 10 days before departure, 50% after that.</li>
              <li>Carry a valid government photo ID.</li>
              <li>Reach the airport at least 2 hours before a domestic flight.</li>
              <li>Keep your booking reference handy for any queries.</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
