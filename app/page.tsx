'use client';

import { useMemo, useState } from 'react';
import { useDeals } from '@/hooks/useDeals';
import { useRouter } from 'next/navigation';
import { FlightDeal } from '@/lib/api';
import { FlightShowcase } from '@/components/FlightShowcase';
import { BoardingPassDealCard } from '@/components/BoardingPassDealCard';
import { PageHead } from '@/components/PageHead';

const SORTS = [
  { id: 'best', label: 'Biggest discount' },
  { id: 'cheap', label: 'Lowest fare' },
  { id: 'fast', label: 'Shortest flight' },
] as const;

const PROMISES = [
  { title: 'Seats you can see', body: 'Walk the cabin in 3D, check the view from the window, then lock the seat.' },
  { title: 'Refunds that refund', body: 'Full refund 10+ days before departure. 50% after that, straight to your wallet.' },
  { title: 'Fares that move', body: 'Up to 30% off on limited-time routes across India, updated live.' },
];

export default function Home() {
  const { deals, loading, error, refetch } = useDeals();
  const router = useRouter();
  const [sortMode, setSortMode] = useState<'best' | 'cheap' | 'fast'>('best');
  const [bookingDealId, setBookingDealId] = useState<string | null>(null);

  const specialDeals = useMemo(() => deals.filter((d: FlightDeal) => d.discount && d.discount > 0), [deals]);

  const sortedDeals = useMemo(() => {
    const copy = [...specialDeals];
    if (sortMode === 'cheap') return copy.sort((a, b) => a.cost - b.cost);
    if (sortMode === 'fast') return copy.sort((a, b) => (a.durationMinutes ?? 9999) - (b.durationMinutes ?? 9999));
    return copy.sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0));
  }, [specialDeals, sortMode]);

  const handleBookWithAnimation = (dealId: string) => {
    if (bookingDealId) return;
    setBookingDealId(dealId);
    window.setTimeout(() => {
      router.push(`/booking?id=${dealId}`);
    }, 180);
  };

  return (
    <main className="min-h-screen cyber-bg text-white">
      <FlightShowcase deals={deals} />

      <section id="flights" className="relative max-w-7xl mx-auto px-4 md:px-6 pt-24 md:pt-32 pb-20" aria-labelledby="fares-title">
        <div className="grid lg:grid-cols-[1fr_auto] items-end gap-6 mb-10">
          <PageHead as="h2" kicker="Today's fares" top="Every seat" bottom="on sale." sub="Only routes with a live discount make this list. Pick one and choose your seat inside the cabin." />
          <div className="flex flex-wrap gap-2 mb-10" role="group" aria-label="Sort fares">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSortMode(s.id)}
                aria-pressed={sortMode === s.id}
                className={`h-10 px-4 rounded-full text-sm font-medium border transition-colors ${
                  sortMode === s.id
                    ? 'bg-[#ffb45e] border-[#ffb45e] text-[#1a0e05]'
                    : 'border-white/15 text-white/70 hover:text-white hover:border-white/30'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bmf-panel h-[212px] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="bmf-panel p-8">
            <h3 className="text-xl font-bold mb-2">Fares didn’t load</h3>
            <p className="text-white/60 mb-5">{error.message}</p>
            <button type="button" onClick={refetch} className="bmf-cta">Try again</button>
          </div>
        ) : sortedDeals.length === 0 ? (
          <div className="bmf-panel p-8">
            <p className="text-white/60">No discounted routes right now. New fares drop through the day.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedDeals.map((deal, i) => (
              <BoardingPassDealCard
                key={deal.id}
                deal={deal}
                animationDelayMs={i * 50}
                onConfirmBooking={handleBookWithAnimation}
                bookingInProgress={bookingDealId === deal.id}
              />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20 grid md:grid-cols-3 gap-10">
          {PROMISES.map((p) => (
            <div key={p.title}>
              <h3 className="text-xl font-bold tracking-[-0.02em] mb-2">{p.title}</h3>
              <p className="text-white/60 leading-relaxed max-w-[38ch]">{p.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
