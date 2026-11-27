'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Plane } from 'lucide-react';
import { DealCountdown } from '@/components/DealCountdown';
import { PageHead } from '@/components/PageHead';
import { apiClient, FlightDeal } from '@/lib/api';
import { addDays, arrivalOf, clockOf, dateKey, durationLabel, serviceWindow } from '@/lib/schedule';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const getOriginalPrice = (deal: FlightDeal) => (deal.discount ? Math.round(deal.cost / (1 - deal.discount / 100)) : deal.cost);

const dayShift = (fromIso: string, toIso: string) => {
  const a = new Date(fromIso);
  const b = new Date(toIso);
  return Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime() - new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()) / 86400000);
};

function Times({ dep, arr, origin }: { dep: string; arr: string; origin: string }) {
  const plus = dayShift(origin, arr);
  return (
    <span className="tabular-nums">
      {clockOf(dep)} – {clockOf(arr)}
      {plus > 0 && <sup className="ml-0.5 text-[#ffb45e]">+{plus}</sup>}
    </span>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const tomorrow = addDays(dateKey(new Date()), 1);
  const [cities, setCities] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState(tomorrow);
  const [directFlights, setDirectFlights] = useState<FlightDeal[]>([]);
  const [connectingFlights, setConnectingFlights] = useState<FlightDeal[][]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [nextDate, setNextDate] = useState<string | null>(null);

  const runSearch = async (src: string, dst: string, day: string) => {
    if (!src || !dst) return;
    setLoading(true);
    setSearched(false);
    try {
      const [direct, connecting] = await Promise.all([apiClient.searchFlights(src, dst, day), apiClient.getConnectingFlights(src, dst, day)]);
      setDirectFlights(direct.sort((a, b) => (a.departureDate ?? '').localeCompare(b.departureDate ?? '')));
      setConnectingFlights(connecting);
      setNextDate(null);
      if (!direct.length && !connecting.length) {
        const any = await apiClient.searchFlights(src, dst).catch(() => []);
        const days = any
          .map((d) => serviceWindow(d))
          .map((w) => (w.first > day ? w.first : day <= w.last ? day : null))
          .filter((d): d is string => !!d && d !== day)
          .sort();
        setNextDate(days[0] ?? null);
      }
      setSearched(true);
    } catch {
      setDirectFlights([]);
      setConnectingFlights([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams({ from, to, date });
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    runSearch(from, to, date);
  };

  useEffect(() => {
    apiClient
      .getCities()
      .then((c) => setCities(c.sort()))
      .catch(() => {})
      .finally(() => setCitiesLoading(false));
    const params = new URLSearchParams(window.location.search);
    const src = params.get('from') || '';
    const dst = params.get('to') || '';
    const day = params.get('date') || tomorrow;
    setDate(day);
    if (src && dst && src !== dst) {
      setFrom(src);
      setTo(dst);
      runSearch(src, dst, day);
    }
  }, []);

  const niceDate = new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <main className="min-h-screen cyber-bg text-white">
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-10">
        <PageHead kicker="Search" top="Where to" bottom="next?" sub="Direct flights and one-stop trips across India, with live discounted fares." />

        <div className="bmf-panel p-4 md:p-5">
          <div className="grid md:grid-cols-[1fr_auto_1fr_200px_auto] gap-3 items-end">
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
            <label className="block">
              <span className="bmf-label">Date</span>
              <input type="date" value={date} min={dateKey(new Date())} onChange={(e) => e.target.value && setDate(e.target.value)} className="bmf-field [color-scheme:dark]" name="date" />
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
            <p className="text-white/60">
              {from} to {to}, {niceDate}
            </p>
            <section aria-labelledby="direct-title">
              <div className="flex items-baseline justify-between gap-4 mb-5 border-b border-white/10 pb-3">
                <h2 id="direct-title" className="text-2xl md:text-3xl font-bold tracking-[-0.03em]">Direct flights</h2>
                <span className="bmf-section-label">{directFlights.length} found</span>
              </div>

              {directFlights.length > 0 ? (
                <ul className="grid gap-3">
                  {directFlights.map((deal, i) => {
                    const dep = deal.departureDate ?? '';
                    const arr = dep ? arrivalOf(deal, dep).toISOString() : '';
                    return (
                      <li
                        key={deal.id}
                        className="bmf-panel p-5 md:p-6 grid md:grid-cols-[1fr_auto] gap-5 items-center animate-fade-in-up hover:border-[#ffb45e]/40 transition-colors"
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        <div className="flex items-center gap-5 md:gap-8 min-w-0">
                          <div className="min-w-0">
                            <p className="text-2xl font-bold tracking-[-0.03em]">{dep && <Times dep={dep} arr={arr} origin={dep} />}</p>
                            <p className="text-sm text-white/60 truncate">{deal.departureCity} to {deal.arrivalCity}</p>
                          </div>
                          <div className="hidden sm:flex flex-col items-center gap-1 text-white/50 min-w-[110px]">
                            <div className="w-full flex items-center gap-2">
                              <span className="h-px flex-1 bg-white/20" />
                              <Plane size={15} className="text-[#ffb45e]" />
                              <span className="h-px flex-1 bg-white/20" />
                            </div>
                            <span className="text-[11px]">{durationLabel(deal.durationMinutes)}, non-stop</span>
                          </div>
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
                                'Economy, per person'
                              )}
                            </p>
                            <div className="mt-1">
                              <DealCountdown expiresAt={deal.expiresAt} compact />
                            </div>
                          </div>
                          <button type="button" className="bmf-cta" onClick={() => router.push(`/booking?id=${deal.id}&date=${date}`)}>
                            Choose seats
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="bmf-panel p-8 text-white/60">
                  <p>No direct flights on this day.</p>
                  {nextDate && (
                    <button
                      type="button"
                      className="bmf-ghost mt-4"
                      onClick={() => {
                        setDate(nextDate);
                        runSearch(from, to, nextDate);
                      }}
                    >
                      Next flight: {new Date(`${nextDate}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </button>
                  )}
                </div>
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
                    const [a, b] = pair;
                    const depA = a.departureDate ?? '';
                    const arrA = arrivalOf(a, depA).toISOString();
                    const depB = b.departureDate ?? '';
                    const arrB = arrivalOf(b, depB).toISOString();
                    const layover = (new Date(depB).getTime() - new Date(arrA).getTime()) / 60000;
                    const journey = (new Date(arrB).getTime() - new Date(depA).getTime()) / 60000;
                    const totalCost = pair.reduce((sum, leg) => sum + leg.cost, 0);
                    const totalOriginal = pair.reduce((sum, leg) => sum + getOriginalPrice(leg), 0);
                    return (
                      <li key={`${a.id}-${b.id}`} className="bmf-panel p-5 md:p-6 animate-fade-in-up hover:border-[#ffb45e]/40 transition-colors" style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="grid md:grid-cols-[1fr_auto] gap-5 items-center">
                          <div>
                            <p className="text-2xl font-bold tracking-[-0.03em]"><Times dep={depA} arr={arrB} origin={depA} /></p>
                            <p className="text-sm text-white/60">
                              {a.departureCity} to {b.arrivalCity}, {durationLabel(journey)} total
                            </p>
                            <ol className="mt-4 grid gap-2 text-sm">
                              <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="grid place-items-center w-6 h-6 rounded-full border border-white/20 text-[11px] text-white/70">1</span>
                                <span className="font-semibold">{a.departureCity} → {a.arrivalCity}</span>
                                <span className="text-white/55"><Times dep={depA} arr={arrA} origin={depA} />, {durationLabel(a.durationMinutes)}</span>
                              </li>
                              <li className="pl-9 text-xs text-[#ffd29b]">
                                {durationLabel(layover)} change in {a.arrivalCity}
                                {dayShift(depA, depB) > 0 ? ', overnight' : ''}
                              </li>
                              <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="grid place-items-center w-6 h-6 rounded-full border border-white/20 text-[11px] text-white/70">2</span>
                                <span className="font-semibold">{b.departureCity} → {b.arrivalCity}</span>
                                <span className="text-white/55"><Times dep={depB} arr={arrB} origin={depA} />, {durationLabel(b.durationMinutes)}</span>
                              </li>
                            </ol>
                          </div>
                          <div className="flex items-center justify-between md:justify-end gap-6">
                            <div className="text-left md:text-right">
                              <p className="text-2xl font-bold tabular-nums text-[#ffd29b]">{inr(totalCost)}</p>
                              {totalOriginal > totalCost && <p className="text-xs text-white/45 line-through">{inr(totalOriginal)}</p>}
                              <p className="text-xs text-white/50">Both flights, per person</p>
                            </div>
                            <button type="button" className="bmf-cta" onClick={() => router.push(`/booking?id=${a.id}&date=${date}&next=${b.id}`)}>
                              Choose seats
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="bmf-panel p-8 text-white/60">No one-stop trips on this day.</p>
              )}
            </section>
          </div>
        )}

        {!searched && !citiesLoading && !loading && (
          <p className="text-white/50 max-w-md">Pick where you are flying from, where to and when.</p>
        )}
      </div>
    </main>
  );
}
