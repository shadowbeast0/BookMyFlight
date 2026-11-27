/**
 * Booking Page - Direct Phone-based Flight Booking
 * Collects passenger name, phone, departure date/time & shows receipt popup
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DealCountdown } from '@/components/DealCountdown';
import { CabinSeatMap, LegTab } from '@/components/CabinSeatMap';
import { PageHead } from '@/components/PageHead';
import { cabinClassOf, EXIT_ROWS, fareBreakdown, isValidSeat } from '@/lib/cabin';
import { arrivalOf, clockLabel, clockOf, connectionFor, dateKey, departureOn, durationLabel, serviceWindow } from '@/lib/schedule';
import { apiClient, FlightDeal, Booking, SeatMap } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const EMPTY_MAP: SeatMap = { booked: [], held: [], mine: [], holdExpiresAt: null };

const gateFor = (id: string) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `${'ABCD'[h % 4]}${(h % 23) + 1}`;
};

const longDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const shortDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export default function BookingPage() {
  const { isLoggedIn, walletBalance, refreshWallet } = useAuthContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const idKey = `${searchParams.get('id') ?? ''}|${searchParams.get('next') ?? ''}`;
  const requestedDate = searchParams.get('date');

  const [deals, setDeals] = useState<FlightDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [names, setNames] = useState<string[]>(['']);
  const [active, setActive] = useState(0);
  const [selections, setSelections] = useState<string[][]>([[], []]);
  const [maps, setMaps] = useState<SeatMap[]>([EMPTY_MAP, EMPTY_MAP]);
  const [notice, setNotice] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [booked, setBooked] = useState<Booking[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const holdTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ids = idKey.split('|').filter(Boolean);
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await Promise.all(ids.map((id) => apiClient.getDealById(id)));
        if (cancelled) return;
        setDeals(list);
        const w = serviceWindow(list[0]);
        const wanted = requestedDate && requestedDate >= w.first && requestedDate <= w.last ? requestedDate : w.first;
        setDate(wanted);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load this flight');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (ids.length) load();
    else {
      setLoading(false);
      setError('No flight was chosen.');
    }
    return () => {
      cancelled = true;
    };
  }, [idKey, requestedDate]);

  const passengerCount = adults + children;

  useEffect(() => {
    setNames((prev) => Array.from({ length: passengerCount }, (_, i) => prev[i] ?? ''));
    setSelections((prev) => prev.map((s) => (s.length > passengerCount ? s.slice(s.length - passengerCount) : s)));
  }, [passengerCount]);

  const slots = useMemo(() => {
    if (!deals.length || !date) return [] as string[];
    const first = departureOn(deals[0], date);
    if (deals.length === 1) return [first];
    const link = connectionFor(deals[0], date, deals[1]);
    return link ? [first, link.dep2] : [first];
  }, [deals, date]);
  const slotKey = slots.join('|');

  const connectionBroken = deals.length === 2 && slots.length < 2;

  const refreshMaps = useCallback(async () => {
    if (!slots.length) return;
    const next = await Promise.all(slots.map((slot, i) => apiClient.getSeatMap(deals[i].id, slot).catch(() => EMPTY_MAP)));
    setMaps((prev) => prev.map((m, i) => next[i] ?? m));
  }, [slotKey, deals]);

  useEffect(() => {
    setSelections([[], []]);
    refreshMaps();
  }, [slotKey]);

  useEffect(() => {
    const id = window.setInterval(refreshMaps, 15000);
    const onStorage = () => refreshMaps();
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('storage', onStorage);
    };
  }, [refreshMaps]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !slots.length) return;
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(async () => {
      for (let i = 0; i < slots.length; i++) {
        const seats = selections[i] ?? [];
        const map = maps[i] ?? EMPTY_MAP;
        if (seats.length === map.mine.length && seats.every((s) => map.mine.includes(s))) continue;
        try {
          const next = await apiClient.holdSeats(deals[i].id, slots[i], seats);
          setMaps((prev) => prev.map((m, j) => (j === i ? next : m)));
        } catch (err) {
          setNotice(err instanceof Error ? err.message : 'Could not hold those seats');
          const fresh = await apiClient.getSeatMap(deals[i].id, slots[i]).catch(() => EMPTY_MAP);
          const gone = new Set([...fresh.booked, ...fresh.held]);
          setSelections((prev) => prev.map((s, j) => (j === i ? s.filter((x) => !gone.has(x)) : s)));
          setMaps((prev) => prev.map((m, j) => (j === i ? fresh : m)));
        }
      }
    }, 350);
    return () => {
      if (holdTimer.current) window.clearTimeout(holdTimer.current);
    };
  }, [selections, isLoggedIn, slotKey]);

  const holdEndsAt = useMemo(() => {
    const times = maps
      .slice(0, slots.length)
      .map((m) => m.holdExpiresAt)
      .filter((t): t is string => !!t)
      .map((t) => new Date(t).getTime());
    return times.length ? Math.min(...times) : null;
  }, [maps, slots.length]);

  useEffect(() => {
    if (holdEndsAt && now >= holdEndsAt) {
      setSelections([[], []]);
      setMaps((prev) => prev.map((m) => ({ ...m, mine: [], holdExpiresAt: null })));
      setNotice('Your 10-minute seat hold ended and the seats were released. Pick them again to continue.');
      refreshMaps();
    }
  }, [now, holdEndsAt, refreshMaps]);

  const toggleSeat = (seatId: string) => {
    const seat = seatId.toUpperCase();
    if (!isValidSeat(seat)) return;
    const map = maps[active] ?? EMPTY_MAP;
    if (map.booked.includes(seat) || map.held.includes(seat)) return;
    setBookingError(null);
    setNotice(null);
    const cur = selections[active] ?? [];
    let next: string[];
    if (cur.includes(seat)) next = cur.filter((s) => s !== seat);
    else {
      next = cur.length >= passengerCount ? [...cur.slice(1), seat] : [...cur, seat];
      const exit = next.filter((s) => EXIT_ROWS.includes(Number(s.slice(0, -1)))).length;
      if (exit > adults) {
        setNotice('Exit-row seats can only go to adults who can help in an evacuation.');
        return;
      }
    }
    setSelections((prev) => prev.map((s, i) => (i === active ? next : s)));
  };

  if (loading) {
    return (
      <main className="min-h-screen cyber-bg text-white grid place-items-center">
        <p className="text-white/60 animate-pulse">Taxiing to the gate…</p>
      </main>
    );
  }

  if (error || !deals.length) {
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

  const deal = deals[active] ?? deals[0];
  const window0 = serviceWindow(deals[0]);
  const legBreakdowns = deals.map((d, i) => fareBreakdown(d.cost, selections[i] ?? []));
  const unseated = deals.map((d, i) => Math.max(0, passengerCount - (selections[i]?.length ?? 0)) * Math.round(d.cost));
  const fares = legBreakdowns.reduce((s, b) => s + b.fares, 0) + unseated.reduce((a, b) => a + b, 0);
  const fees = legBreakdowns.reduce((s, b) => s + b.fees, 0);
  const total = fares + fees;
  const originalTotal =
    deals.reduce((s, d, i) => {
      const ratio = d.discount ? 1 / (1 - d.discount / 100) : 1;
      return s + (legBreakdowns[i].fares + unseated[i]) * ratio;
    }, 0) + fees;
  const allPicked = deals.every((_, i) => (selections[i]?.length ?? 0) === passengerCount);
  const namesOk = names.every((n) => n.trim().length >= 2);
  const activeSlot = slots[active];
  const midHour = activeSlot ? new Date(activeSlot).getHours() + new Date(activeSlot).getMinutes() / 60 + (deal.durationMinutes ?? 0) / 120 : 18;
  const legTabs: LegTab[] = deals.map((d, i) => ({
    label: `${d.departureCity} → ${d.arrivalCity}`,
    sub: slots[i] ? `${clockOf(slots[i])}, ${selections[i]?.length ?? 0} of ${passengerCount} seats` : 'No connection',
  }));
  const holdLeft = holdEndsAt ? Math.max(0, holdEndsAt - now) : 0;
  const holdLabel = `${Math.floor(holdLeft / 60000)}:${String(Math.floor((holdLeft % 60000) / 1000)).padStart(2, '0')}`;
  const kicker =
    deals.length > 1
      ? `${deals[0].departureCity} to ${deals[1].arrivalCity} via ${deals[0].arrivalCity}`
      : `${deal.departureCity} to ${deal.arrivalCity}${slots[0] ? `, ${longDate(slots[0])}` : ''}`;

  const handleBooking = async () => {
    setBookingError(null);
    if (!isLoggedIn) {
      window.dispatchEvent(new Event('bmf:open-login'));
      return;
    }
    if (connectionBroken) {
      setBookingError('These flights no longer connect on this date. Pick another date.');
      return;
    }
    if (!namesOk) {
      setBookingError('Add each passenger’s name as it appears on their ID.');
      return;
    }
    const missing = deals.findIndex((_, i) => (selections[i]?.length ?? 0) !== passengerCount);
    if (missing >= 0) {
      setActive(missing);
      setBookingError(`Pick ${passengerCount} seat${passengerCount > 1 ? 's' : ''} on ${deals[missing].departureCity} to ${deals[missing].arrivalCity}.`);
      return;
    }
    try {
      setBookingLoading(true);
      const label = names.map((n, i) => `${n.trim()}${i >= adults ? ' (child)' : ''}`).join(', ');
      const result = await apiClient.bookItinerary(
        deals.map((d, i) => ({ dealId: d.id, selectedDepartureTime: slots[i], selectedSeats: selections[i] })),
        `${label} A${adults}-C${children}`,
        passengerCount
      );
      setBooked(result);
      setSelections([[], []]);
      await refreshWallet();
      refreshMaps();
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
      refreshMaps();
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <main className="min-h-screen cyber-bg text-white">
      <CabinSeatMap
        kicker={kicker}
        legs={legTabs}
        activeLeg={active}
        onLeg={setActive}
        hour={midHour}
        gate={gateFor(deals[0].id)}
        intro
        unitPrice={deal.cost}
        booked={maps[active]?.booked ?? []}
        held={maps[active]?.held ?? []}
        selected={selections[active] ?? []}
        passengerCount={passengerCount}
        adults={adults}
        kids={children}
        onAdults={setAdults}
        onKids={setChildren}
        onToggle={toggleSeat}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            {deals.map((d, i) => (
              <div key={d.id} className={deals.length > 1 ? 'rounded-2xl border border-white/10 p-3' : ''}>
                {deals.length > 1 && <p className="text-xs text-white/50 mb-1">Flight {i + 1}</p>}
                <div className="flex items-center gap-3">
                  <div className="min-w-0">
                    <p className="text-2xl font-bold tracking-[-0.03em] tabular-nums">{slots[i] ? clockOf(slots[i]) : clockLabel(d)}</p>
                    <p className="text-sm text-white/60 truncate">{d.departureCity}</p>
                  </div>
                  <span className="flex-1 min-w-6 flex flex-col items-center text-[11px] text-white/45">
                    <span className="w-full flex items-center gap-1.5 text-[#ffb45e]">
                      <span className="h-px flex-1 bg-white/20" />
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                      </svg>
                      <span className="h-px flex-1 bg-white/20" />
                    </span>
                    {durationLabel(d.durationMinutes)}
                  </span>
                  <div className="min-w-0 text-right">
                    <p className="text-2xl font-bold tracking-[-0.03em] tabular-nums">{slots[i] ? clockOf(arrivalOf(d, slots[i]).toISOString()) : '--:--'}</p>
                    <p className="text-sm text-white/60 truncate">{d.arrivalCity}</p>
                  </div>
                </div>
                {i === 0 && deals.length > 1 && slots[1] && (
                  <p className="mt-2 text-xs text-white/55">
                    {durationLabel((new Date(slots[1]).getTime() - arrivalOf(d, slots[0]).getTime()) / 60000)} change in {d.arrivalCity}
                    {dateKey(new Date(slots[1])) !== date ? ', onward flight is the next day' : ''}
                  </p>
                )}
              </div>
            ))}
            {connectionBroken && (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">The second flight doesn’t connect on this date. Try another day.</p>
            )}
            <div className="pt-3 border-t border-white/10">
              <DealCountdown expiresAt={deals[0].expiresAt} />
            </div>
          </div>

          <label className="block">
            <span className="bmf-label">Travel date</span>
            <input
              type="date"
              value={date}
              min={window0.first}
              max={window0.last}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="bmf-field [color-scheme:dark]"
            />
            <span className="block mt-2 text-xs text-white/45">
              Leaves daily at {clockLabel(deals[0])}. On sale for {shortDay(window0.first)} to {shortDay(window0.last)}.
            </span>
          </label>

          <fieldset className="space-y-3">
            <legend className="bmf-label">Passengers, as on their ID</legend>
            {names.map((n, i) => (
              <input
                key={i}
                type="text"
                value={n}
                onChange={(e) => setNames((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={i < adults ? `Adult ${i + 1} full name` : `Child ${i - adults + 1} full name`}
                className="bmf-field"
                autoComplete={i === 0 ? 'name' : 'off'}
                aria-label={i < adults ? `Adult ${i + 1} name` : `Child ${i - adults + 1} name`}
              />
            ))}
          </fieldset>

          {isLoggedIn ? (
            holdEndsAt ? (
              <p className="rounded-xl border border-[#ffb45e]/40 bg-[#ffb45e]/10 p-3 text-sm text-[#ffd29b]" role="status">
                Seats held for you for <b className="tabular-nums">{holdLabel}</b>. Other travellers see them as on hold.
              </p>
            ) : (
              <p className="text-xs text-white/45">Seats you pick are held for 10 minutes while you check out.</p>
            )
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/70">
              Sign in to hold your seats for 10 minutes and pay.{' '}
              <button type="button" className="underline text-[#ffd29b]" onClick={() => window.dispatchEvent(new Event('bmf:open-login'))}>
                Sign in
              </button>
            </div>
          )}

          {notice && (
            <p className="rounded-xl border border-[#ffb45e]/40 bg-[#ffb45e]/10 p-3 text-sm text-[#ffd29b]" role="alert">{notice}</p>
          )}

          <dl className="space-y-2.5 text-sm border-t border-white/10 pt-5">
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Fares, {passengerCount} passenger{passengerCount > 1 ? 's' : ''}{deals.length > 1 ? ', 2 flights' : ''}</dt>
              <dd className="tabular-nums">{inr(fares)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Seat selection</dt>
              <dd className="tabular-nums">{fees ? inr(fees) : 'Free'}</dd>
            </div>
            {deals.map((d, i) => (
              <div key={d.id} className="flex justify-between gap-4 text-xs">
                <dt className="text-white/45">{deals.length > 1 ? `${d.departureCity} → ${d.arrivalCity}` : 'Seats'}</dt>
                <dd className="text-right text-white/70">
                  {(selections[i] ?? []).length ? (selections[i] ?? []).map((s) => `${s} (${cabinClassOf(s)?.name})`).join(', ') : 'Not picked'}
                </dd>
              </div>
            ))}
            {originalTotal > total + 1 && (
              <div className="flex justify-between gap-4">
                <dt className="text-white/55">You save</dt>
                <dd className="text-[#ffb45e] tabular-nums">{inr(originalTotal - total)}</dd>
              </div>
            )}
            <div className="flex justify-between items-baseline gap-4 pt-3 border-t border-white/10">
              <dt className="text-white/70">Total</dt>
              <dd className="text-3xl font-bold tracking-[-0.04em] tabular-nums text-[#ffd29b]">{inr(total)}</dd>
            </div>
            <p className="text-[11px] text-white/40">All-in fare, nothing added at payment. Business seats include seat choice.</p>
            {isLoggedIn && (
              <div className="flex justify-between gap-4 text-xs">
                <dt className="text-white/45">Wallet balance</dt>
                <dd className="tabular-nums text-white/70">{inr(walletBalance)}</dd>
              </div>
            )}
          </dl>

          {bookingError && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{bookingError}</p>
          )}

          <div>
            <button type="button" onClick={handleBooking} disabled={bookingLoading || connectionBroken} className="bmf-cta w-full">
              {bookingLoading ? 'Booking…' : !isLoggedIn ? 'Sign in to book' : allPicked && namesOk ? `Pay ${inr(total)} and book` : 'Confirm and book'}
            </button>
            <p className="text-xs text-white/40 text-center mt-3">Paid from your wallet. Full refund up to 10 days before departure.</p>
          </div>
        </div>
      </CabinSeatMap>

      <Dialog open={!!booked} onOpenChange={(o) => { if (!o) setBooked(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl tracking-[-0.03em]">You’re booked</DialogTitle>
            <DialogDescription>Your seats are confirmed. Have a good flight.</DialogDescription>
          </DialogHeader>
          {booked && (
            <div className="space-y-4 mt-2">
              {booked.map((b) => (
                <div key={b.id} className="rounded-xl border border-white/10 p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold">{b.departureCity} → {b.arrivalCity}</span>
                    <span className="font-mono text-xs text-white/60">{b.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  {b.selectedDepartureTime && <p className="text-white/65">{longDate(b.selectedDepartureTime)}</p>}
                  <p className="text-white/65">Seats {b.selectedSeats?.join(', ')}</p>
                  <p className="text-[#ffd29b] font-semibold tabular-nums">{inr(b.cost ?? 0)}</p>
                </div>
              ))}
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-white/60">Passengers</span>
                <span className="text-right">{names.join(', ')}</span>
              </div>
              {booked[booked.length - 1]?.walletBalance != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Wallet balance</span>
                  <span className="tabular-nums">{inr(booked[booked.length - 1].walletBalance ?? 0)}</span>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button onClick={() => router.push('/my-bookings')} className="w-full h-11 rounded-full font-semibold">
                  View my trips
                </Button>
                <Button onClick={() => setBooked(null)} variant="outline" className="w-full h-11 rounded-full">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
