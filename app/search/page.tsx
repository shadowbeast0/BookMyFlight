'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DealCountdown } from '@/components/DealCountdown';
import { apiClient, FlightDeal } from '@/lib/api';
import { PageHead } from '@/components/PageHead';
import { ArrowLeftRight, Plane } from 'lucide-react';

export default function SearchPage() {
  const router = useRouter();
  const [cities, setCities] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [directFlights, setDirectFlights] = useState<FlightDeal[]>([]);
  const [connectingFlights, setConnectingFlights] = useState<FlightDeal[][]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(true);

  const runSearch = async (src: string, dst: string) => {
    if (!src || !dst) return;
    setLoading(true);
    setSearched(false);
    try {
      const [direct, connecting] = await Promise.all([
        apiClient.searchFlights(src, dst),
        apiClient.getConnectingFlights(src, dst),
      ]);
      setDirectFlights(direct);
      setConnectingFlights(connecting);
      setSearched(true);
    } catch {
      setDirectFlights([]);
      setConnectingFlights([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => runSearch(from, to);

  useEffect(() => {
    apiClient
      .getCities()
      .then((c) => setCities(c.sort()))
      .catch(() => {})
      .finally(() => setCitiesLoading(false));
    const params = new URLSearchParams(window.location.search);
    const src = params.get('from') || '';
    const dst = params.get('to') || '';
    if (src && dst && src !== dst) {
      setFrom(src);
      setTo(dst);
      runSearch(src, dst);
    }
  }, []);

  const getOriginalPrice = (deal: FlightDeal) =>
    deal.discount ? Math.round(deal.cost / (1 - deal.discount / 100)) : deal.cost;

  const formatDuration = (mins?: number) => {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const day = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null);

  return (
    <main className="min-h-screen cyber-bg text-white">
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-10">
        <PageHead kicker="Search" top="Where to" bottom="next?" sub="Direct flights and one-stop routes across India, with live discounted fares." />

        <div className="bmf-panel p-4 md:p-5">
          <div className="grid md:grid-cols-[1fr_auto_1fr_auto] gap-3 items-end">
            <label className="block">
              <span className="bmf-label">From</span>
              <select value={from} onChange={(e) => setFrom(e.target.value)} className="bmf-field" name="from">
                <option value="">Choose a city…</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => { setFrom(to); setTo(from); }}
              className="hidden md:grid place-items-center w-11 h-11 mb-0.5 rounded-full border border-white/15 bg-white/[0.04] hover:bg-white/10 transition-colors"
              aria-label="Swap cities"
            >
              <ArrowLeftRight size={16} />
            </button>
            <label className="block">
              <span className="bmf-label">To</span>
              <select value={to} onChange={(e) => setTo(e.target.value)} className="bmf-field" name="to">
                <option value="">Choose a city…</option>
                {cities.filter((c) => c !== from).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={handleSearch} disabled={!from || !to || loading || from === to} className="bmf-cta">
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-black/20 border-t-black/70 rounded-full animate-spin" />
                  Searching
                </>
              ) : (
                'Search flights'
              )}
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-24">
        {citiesLoading && <p className="text-white/50 py-12">Loading cities…</p>}

        {searched && (
          <div className="space-y-14 animate-fade-in-up">
            <section aria-labelledby="direct-title">
              <div className="flex items-baseline justify-between gap-4 mb-5 border-b border-white/10 pb-3">
                <h2 id="direct-title" className="text-2xl md:text-3xl font-bold tracking-[-0.03em]">Direct flights</h2>
                <span className="bmf-section-label">{directFlights.length} found</span>
              </div>

              {directFlights.length > 0 ? (
                <ul className="grid gap-3">
                  {directFlights.map((deal, i) => (
                    <li
                      key={deal.id}
                      className="bmf-panel p-5 md:p-6 grid md:grid-cols-[1fr_auto] gap-5 items-center animate-fade-in-up hover:border-[#ffb45e]/40 transition-colors"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="flex items-center gap-5 md:gap-8 min-w-0">
                        <p className="text-xl md:text-2xl font-bold tracking-[-0.02em] truncate">{deal.departureCity}</p>
                        <div className="flex-1 min-w-[70px] max-w-[180px] flex flex-col items-center gap-1 text-white/50">
                          <div className="w-full flex items-center gap-2">
                            <span className="h-px flex-1 bg-white/20" />
                            <Plane size={15} className="text-[#ffb45e]" />
                            <span className="h-px flex-1 bg-white/20" />
                          </div>
                          <span className="text-[11px]">{deal.durationMinutes ? `${formatDuration(deal.durationMinutes)}, non-stop` : 'Non-stop'}</span>
                        </div>
                        <p className="text-xl md:text-2xl font-bold tracking-[-0.02em] truncate">{deal.arrivalCity}</p>
                        {day(deal.departureDate) && <p className="hidden lg:block text-sm text-white/55">Departs {day(deal.departureDate)}</p>}
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-6">
                        <div className="text-left md:text-right">
                          <p className="text-2xl font-bold tabular-nums text-[#ffd29b]">{inr(deal.cost)}</p>
                          <p className="text-xs text-white/50">
                            {deal.discount ? (
                              <>
                                <span className="line-through">{inr(getOriginalPrice(deal))}</span>
                                <span className="ml-2 text-[#ffb45e] font-semibold">{deal.discount}% off</span>
                              </>
                            ) : (
                              'Economy, per seat'
                            )}
                          </p>
                          <div className="mt-1">
                            <DealCountdown expiresAt={deal.expiresAt} compact />
                          </div>
                        </div>
                        <button type="button" className="bmf-cta" onClick={() => router.push(`/booking?id=${deal.id}`)}>
                          Choose seats
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="bmf-panel p-8 text-white/60">No direct flights on this route right now. Try a one-stop option below.</p>
              )}
            </section>

            <section aria-labelledby="connect-title">
              <div className="flex items-baseline justify-between gap-4 mb-5 border-b border-white/10 pb-3">
                <h2 id="connect-title" className="text-2xl md:text-3xl font-bold tracking-[-0.03em]">One stop</h2>
                <span className="bmf-section-label">{connectingFlights.length} options</span>
              </div>

              {connectingFlights.length > 0 ? (
                <ul className="grid gap-3">
                  {connectingFlights.map((pair, i) => {
                    const totalCost = pair.reduce((sum, leg) => sum + leg.cost, 0);
                    const totalOriginal = pair.reduce((sum, leg) => sum + getOriginalPrice(leg), 0);
                    const totalDuration = pair.reduce((sum, leg) => sum + (leg.durationMinutes || 0), 0);
                    return (
                      <li key={i} className="bmf-panel p-5 md:p-6 animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <ol className="grid gap-3">
                          {pair.map((leg, j) => (
                            <li key={leg.id} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span className="grid place-items-center w-6 h-6 rounded-full border border-white/20 text-[11px] text-white/70">{j + 1}</span>
                              <span className="font-semibold">{leg.departureCity}</span>
                              <Plane size={13} className="text-white/40" />
                              <span className="font-semibold">{leg.arrivalCity}</span>
                              <span className="text-sm text-white/55">{formatDuration(leg.durationMinutes)}</span>
                              <span className="text-sm tabular-nums text-white/80 ml-auto">{inr(leg.cost)}</span>
                              <DealCountdown expiresAt={leg.expiresAt} compact />
                            </li>
                          ))}
                        </ol>
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-4 border-t border-white/10">
                          <p className="text-sm text-white/60">
                            Change in {pair[0]?.arrivalCity}
                            {totalDuration > 0 && <span>, {formatDuration(totalDuration)} flying</span>}
                          </p>
                          <div className="flex items-center gap-5">
                            <div className="text-right">
                              <p className="text-xl font-bold tabular-nums text-[#ffd29b]">{inr(totalCost)}</p>
                              {totalOriginal > totalCost && <p className="text-xs text-white/45 line-through">{inr(totalOriginal)}</p>}
                            </div>
                            <button type="button" className="bmf-ghost" onClick={() => router.push(`/booking?id=${pair[0].id}`)}>
                              Book first leg
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="bmf-panel p-8 text-white/60">No one-stop routes for this pair yet.</p>
              )}
            </section>
          </div>
        )}

        {!searched && !citiesLoading && !loading && (
          <p className="text-white/50 max-w-md">Pick a departure and arrival city to see direct flights and one-stop routes.</p>
        )}
      </div>
    </main>
  );
}
