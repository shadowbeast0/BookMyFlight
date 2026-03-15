'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DealCountdown } from '@/components/DealCountdown';
import { apiClient, FlightDeal } from '@/lib/api';
import { FlightMascot } from '@/components/FlightMascot';

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

  useEffect(() => {
    apiClient
      .getCities()
      .then((c) => setCities(c.sort()))
      .catch(() => {})
      .finally(() => setCitiesLoading(false));
  }, []);

  const handleSearch = async () => {
    if (!from || !to) return;
    setLoading(true);
    setSearched(false);
    try {
      const [direct, connecting] = await Promise.all([
        apiClient.searchFlights(from, to),
        apiClient.getConnectingFlights(from, to),
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

  const getOriginalPrice = (deal: FlightDeal) =>
    deal.discount ? Math.round(deal.cost / (1 - deal.discount / 100)) : deal.cost;

  const formatDuration = (mins?: number) => {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <main className="min-h-screen cyber-bg text-white">
      {/* Hero */}
      <section className="relative overflow-hidden py-16 cyber-grid">
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-4 animate-fade-in-up">
            <FlightMascot size="md" />
          </div>
          <h1 className="display-font neon-title text-4xl md:text-5xl font-extrabold text-white mb-3 animate-fade-in-up">
            Search Flights
          </h1>
          <p className="text-lg text-white/70 mb-10 animate-fade-in-up animation-delay-100">
            Find direct and connecting flights across India
          </p>

          {/* Search Form */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 md:p-8 border border-purple-300/25 shadow-2xl animate-fade-in-up animation-delay-200">
            <div className="grid md:grid-cols-[1fr_auto_1fr_auto] gap-4 items-end">
              <div className="text-left">
                <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                  From
                </label>
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full rounded-xl bg-white/15 border border-white/20 text-white placeholder-white/40 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm"
                >
                  <option value="" className="text-gray-800">
                    Select city
                  </option>
                  {cities.map((c) => (
                    <option key={c} value={c} className="text-gray-800">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <button
                onClick={() => { setFrom(to); setTo(from); }}
                className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all mb-0.5 cursor-pointer"
                title="Swap cities"
              >
                ⇆
              </button>

              <div className="text-left">
                <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                  To
                </label>
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-xl bg-white/15 border border-white/20 text-white placeholder-white/40 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm"
                >
                  <option value="" className="text-gray-800">
                    Select city
                  </option>
                  {cities
                    .filter((c) => c !== from)
                    .map((c) => (
                      <option key={c} value={c} className="text-gray-800">
                        {c}
                      </option>
                    ))}
                </select>
              </div>

              <Button
                onClick={handleSearch}
                disabled={!from || !to || loading || from === to}
                className="bg-violet-500 hover:bg-violet-400 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-violet-500/40 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Searching
                  </span>
                ) : (
                  'Search'
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {citiesLoading && (
          <div className="text-center text-muted-foreground py-12">Loading cities...</div>
        )}

        {searched && (
          <div className="space-y-10 animate-fade-in-up">
            {/* Direct Flights */}
            <section>
              <h2 className="text-2xl display-font font-bold text-purple-100 mb-6 flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary text-sm font-bold">✈</span>
                Direct Flights
                <span className="text-sm font-normal text-purple-100/70">
                  ({directFlights.length} found)
                </span>
              </h2>

              {directFlights.length > 0 ? (
                <div className="grid gap-4">
                  {directFlights.map((deal, i) => (
                    <Card
                      key={deal.id}
                      className="p-6 transition-all duration-300 animate-fade-in-up border-l-4 border-l-purple-400 neon-card"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-6 flex-1">
                          <div className="text-center min-w-[80px]">
                            <p className="text-xl font-bold text-white">{deal.departureCity}</p>
                            <p className="text-xs text-purple-100/70">Departure</p>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-20 h-px bg-primary/30 relative">
                              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                <svg className="w-5 h-5 text-purple-300" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                                </svg>
                              </div>
                            </div>
                            <span className="text-[10px] text-purple-100/65 font-medium">
                              {deal.durationMinutes ? formatDuration(deal.durationMinutes) + ' · ' : ''}Non-stop
                            </span>
                          </div>
                          <div className="text-center min-w-[80px]">
                            <p className="text-xl font-bold text-white">{deal.arrivalCity}</p>
                            <p className="text-xs text-purple-100/70">Arrival</p>
                          </div>
                          {deal.departureDate && (
                            <div className="hidden lg:block text-sm text-purple-100/70 ml-4">
                              <p className="text-xs uppercase tracking-wider font-semibold text-purple-100/50">Departs</p>
                              <p>{new Date(deal.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="flex items-end gap-2">
                              <span className="text-2xl font-bold text-purple-100">
                                ₹{deal.cost.toLocaleString('en-IN')}
                              </span>
                              {deal.discount ? (
                                <span className="text-sm text-muted-foreground line-through mb-0.5">
                                  ₹{getOriginalPrice(deal).toLocaleString('en-IN')}
                                </span>
                              ) : null}
                            </div>
                            {deal.discount ? (
                              <span className="text-xs font-semibold text-accent">{deal.discount}% OFF</span>
                            ) : null}
                            <div className="mt-1">
                              <DealCountdown expiresAt={deal.expiresAt} compact />
                            </div>
                          </div>
                          <Button
                            onClick={() => router.push(`/booking/${deal.id}`)}
                            className="bg-violet-500 hover:bg-violet-400 text-white font-semibold px-6"
                          >
                            Book Now
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center border-dashed">
                  <p className="text-purple-100/70 no-direct">No direct flights found for this route.</p>
                </Card>
              )}
            </section>

            {/* Connecting Flights */}
            <section>
              <h2 className="text-2xl display-font font-bold text-purple-100 mb-6 flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/10 text-secondary text-sm font-bold">🔗</span>
                Connecting Flights
                <span className="text-sm font-normal text-purple-100/70">
                  ({connectingFlights.length} options)
                </span>
              </h2>

              {connectingFlights.length > 0 ? (
                <div className="grid gap-4">
                  {connectingFlights.map((pair, i) => {
                    const totalCost = pair.reduce((sum, leg) => sum + leg.cost, 0);
                    const totalOriginal = pair.reduce((sum, leg) => sum + getOriginalPrice(leg), 0);
                    const totalDuration = pair.reduce((sum, leg) => sum + (leg.durationMinutes || 0), 0);
                    return (
                      <Card
                        key={i}
                        className="p-6 transition-all duration-300 animate-fade-in-up border-l-4 border-l-amber-400 neon-card"
                        style={{ animationDelay: `${i * 80}ms` }}
                      >
                        <div className="flex flex-col gap-4">
                          {/* Legs */}
                          {pair.map((leg, j) => (
                            <div key={leg.id} className="flex items-center gap-4">
                              <div className="w-6 h-6 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs font-bold">
                                {j + 1}
                              </div>
                              <div className="flex items-center gap-4 flex-1">
                                  <span className="font-semibold text-purple-100 min-w-[80px]">{leg.departureCity}</span>
                                <div className="flex-1 h-px bg-border relative">
                                  <svg className="w-4 h-4 text-secondary absolute -top-2 left-1/2 -translate-x-1/2" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                                  </svg>
                                </div>
                                  <span className="font-semibold text-purple-100 min-w-[80px] text-right">{leg.arrivalCity}</span>
                                <span className="text-sm font-bold text-purple-200 ml-2">₹{leg.cost.toLocaleString('en-IN')}</span>
                                {leg.durationMinutes && (
                                  <span className="text-xs text-purple-100/65 ml-1">({formatDuration(leg.durationMinutes)})</span>
                                )}
                                <DealCountdown expiresAt={leg.expiresAt} compact />
                              </div>
                            </div>
                          ))}

                          {/* Total + Book */}
                          <div className="flex items-center justify-between pt-3 border-t border-purple-300/15 mt-1">
                            <div className="flex items-center gap-3">
                              <span className="text-xs uppercase tracking-wider font-semibold text-purple-100/70">Via {pair[0]?.arrivalCity}</span>
                              <span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-medium">1 stop</span>
                              {totalDuration > 0 && (
                                <span className="text-xs text-purple-100/65">{formatDuration(totalDuration)} total</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="flex items-end gap-2">
                                  <span className="text-xl font-bold text-purple-100">
                                    ₹{totalCost.toLocaleString('en-IN')}
                                  </span>
                                  {totalOriginal > totalCost && (
                                    <span className="text-sm text-muted-foreground line-through mb-0.5">
                                      ₹{totalOriginal.toLocaleString('en-IN')}
                                    </span>
                                  )}
                                </div>
                                  <span className="text-[10px] text-purple-100/65">Total for both legs</span>
                              </div>
                              <Button
                                onClick={() => router.push(`/booking/${pair[0].id}`)}
                                variant="outline"
                                className="border-purple-400/50 text-purple-200 hover:bg-purple-400/15 font-semibold"
                              >
                                Book Leg 1
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="p-8 text-center border-dashed">
                  <p className="text-purple-100/70">No connecting flights found for this route.</p>
                </Card>
              )}
            </section>
          </div>
        )}

        {!searched && !citiesLoading && (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/5 mb-6">
              <svg className="w-10 h-10 text-primary/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-purple-100 mb-2">Start your search</h3>
            <p className="text-purple-100/70 max-w-md mx-auto">
              Select a departure and arrival city above to find available flights and connecting routes.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
