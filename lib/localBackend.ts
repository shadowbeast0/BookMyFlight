'use client';

import { HOLD_MINUTES, isValidSeat, seatsTotal } from './cabin';
import { connectionFor, dateKey, departureOn, isScheduledSlot, runsOn } from './schedule';

type Deal = {
  id: string;
  departureCity: string;
  arrivalCity: string;
  cost: number;
  discount: number;
  durationMinutes: number;
  departureDate: string;
  expiresAt: string;
  isActive: boolean;
};

type StoredBooking = {
  id: string;
  dealId: string;
  phoneNumber: string;
  passengerName?: string;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
  selectedDepartureTime?: string | null;
  selectedSeats: string[];
  paidAmount: number;
};

type Db = {
  version: number;
  deals: Deal[];
  bookings: StoredBooking[];
  wallets: Record<string, number>;
  otps: { phoneNumber: string; code: string; expiresAt: number; used: boolean; requestedAt: number }[];
  sessions: Record<string, { phoneNumber: string; expiresAt: number }>;
  holds?: Hold[];
};

type Hold = { dealId: string; slot: number; seat: string; owner: string; expiresAt: number };

type LegInput = { dealId: string; selectedDepartureTime?: string; selectedSeats?: string[] };

export class LocalApiError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const KEY = 'bmf_local_db_v1';
const PERMANENT_ADMINS = ['+917044122399'];
const ADMIN_PHONES = [...new Set([...PERMANENT_ADMINS, ...(process.env.NEXT_PUBLIC_ADMIN_PHONES || '+919876543210').split(',').map((p) => p.trim()).filter(Boolean)])];
const MAX_HELD_SEATS = 9;
const MAX_TOP_UP = 200000;
const DAY = 86400000;

const SEED: [string, string, number, number, number, number][] = [
  ['Mumbai', 'Delhi', 4599, 20, 15, 130],
  ['Bangalore', 'Goa', 3299, 15, 7, 75],
  ['Chennai', 'Kolkata', 5199, 10, 20, 165],
  ['Hyderabad', 'Jaipur', 4899, 25, 12, 140],
  ['Pune', 'Kochi', 3799, 0, 5, 120],
  ['Delhi', 'Thiruvananthapuram', 6999, 30, 18, 195],
  ['Mumbai', 'Bangalore', 3499, 10, 14, 95],
  ['Delhi', 'Chennai', 5599, 15, 11, 170],
  ['Bangalore', 'Hyderabad', 2899, 5, 9, 80],
  ['Delhi', 'Kolkata', 4299, 20, 16, 145],
  ['Mumbai', 'Pune', 1999, 0, 3, 50],
  ['Kochi', 'Thiruvananthapuram', 1899, 10, 8, 55],
  ['Goa', 'Mumbai', 3199, 12, 10, 75],
  ['Kolkata', 'Jaipur', 5899, 18, 22, 160],
  ['Hyderabad', 'Chennai', 3099, 8, 6, 85],
  ['Jaipur', 'Delhi', 2599, 5, 13, 65],
];

const uuid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const round = (amount: number) => Math.round(amount * 100) / 100;
const minute = (iso?: string | null) => (iso ? Math.floor(new Date(iso).getTime() / 60000) : null);

function seed(): Db {
  const now = Date.now();
  const deals = SEED.map(([from, to, cost, discount, days, duration], index) => {
    const departure = new Date(now + (1 + (days % 3)) * DAY);
    departure.setHours(6 + ((index * 3) % 15), (index * 25) % 60, 0, 0);
    return {
      id: `d1a1b2c3-${String(index + 1).padStart(4, '0')}-4000-8000-${String(index + 1).padStart(12, '0')}`,
      departureCity: from,
      arrivalCity: to,
      cost,
      discount,
      durationMinutes: duration,
      departureDate: departure.toISOString(),
      expiresAt: new Date(now + 30 * DAY).toISOString(),
      isActive: true,
    };
  });
  return { version: 2, deals, bookings: [], wallets: {}, otps: [], sessions: {} };
}

function load(): Db {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const db = JSON.parse(raw) as Db;
      db.holds = (db.holds ?? []).filter((h) => h.expiresAt > Date.now());
      if (db.version !== 2) {
        const soon = Date.now() + DAY;
        for (const d of db.deals) {
          const first = new Date(d.departureDate);
          if (first.getTime() > soon) {
            const moved = new Date(soon);
            moved.setHours(first.getHours(), first.getMinutes(), 0, 0);
            d.departureDate = moved.toISOString();
          }
        }
        db.version = 2;
        save(db);
      }
      return db;
    }
  } catch {
    return seed();
  }
  const fresh = seed();
  save(fresh);
  return fresh;
}

function save(db: Db) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    throw new LocalApiError('Could not save to this browser’s storage', 500);
  }
}

const isLive = (deal: Deal) => deal.isActive && new Date(deal.expiresAt).getTime() > Date.now();
const price = (deal: Deal) => (deal.discount > 0 ? round(deal.cost * (1 - deal.discount / 100)) : deal.cost);
const dealResponse = (deal: Deal, discounted = true) => ({ ...deal, cost: discounted ? price(deal) : deal.cost, isActive: isLive(deal) });

function bookingResponse(db: Db, booking: StoredBooking) {
  const deal = db.deals.find((d) => d.id === booking.dealId);
  return {
    id: booking.id,
    dealId: booking.dealId,
    phoneNumber: booking.phoneNumber,
    passengerName: booking.passengerName,
    createdAt: booking.createdAt,
    status: booking.status,
    departureCity: deal?.departureCity,
    arrivalCity: deal?.arrivalCity,
    cost: booking.paidAmount,
    departureDate: deal?.departureDate,
    selectedDepartureTime: booking.selectedDepartureTime ?? undefined,
    durationMinutes: deal?.durationMinutes,
    selectedSeats: booking.selectedSeats,
    walletBalance: db.wallets[booking.phoneNumber] ?? 0,
  };
}

function bookedSeats(db: Db, deal: Deal, slot?: string | null) {
  const target = minute(slot ?? deal.departureDate);
  return new Set(db.bookings
    .filter((b) => b.dealId === deal.id && b.status === 'confirmed' && minute(b.selectedDepartureTime ?? deal.departureDate) === target)
    .flatMap((b) => b.selectedSeats.map((s) => s.toUpperCase())));
}

function slotOf(deal: Deal, slot?: string | null) {
  return minute(slot ?? deal.departureDate) ?? 0;
}

function heldSeats(db: Db, deal: Deal, slot: string | null | undefined, exceptOwner?: string | null) {
  const target = slotOf(deal, slot);
  return new Set((db.holds ?? []).filter((h) => h.dealId === deal.id && h.slot === target && h.owner !== exceptOwner && h.expiresAt > Date.now()).map((h) => h.seat));
}

function seatMap(db: Db, deal: Deal, slot: string | null | undefined, owner: string | null) {
  const target = slotOf(deal, slot);
  const mine = (db.holds ?? []).filter((h) => owner && h.owner === owner && h.dealId === deal.id && h.slot === target);
  return {
    booked: [...bookedSeats(db, deal, slot)].sort(),
    held: [...heldSeats(db, deal, slot, owner)].sort(),
    mine: mine.map((h) => h.seat).sort(),
    holdExpiresAt: mine.length ? new Date(Math.min(...mine.map((h) => h.expiresAt))).toISOString() : null,
  };
}

function requireSlot(deal: Deal, slot?: string | null) {
  if (!slot) throw new LocalApiError('Choose a travel date');
  if (!isScheduledSlot(deal, slot)) throw new LocalApiError(`${deal.departureCity} to ${deal.arrivalCity} does not fly at that time. Pick one of the scheduled dates.`);
}

function exitRowCheck(seats: string[], passengerName?: string) {
  const adults = Number(/A(\d+)-C(\d+)/i.exec(passengerName ?? '')?.[1] ?? seats.length);
  const xl = seats.filter((s) => /^(12|13)[A-F]$/.test(s)).length;
  if (xl > adults) throw new LocalApiError('Exit-row seats can only go to adults');
}

function sessionPhone(db: Db, token: string | null) {
  if (!token) return null;
  const session = db.sessions[token];
  if (!session || session.expiresAt < Date.now()) return null;
  return session.phoneNumber;
}

function requireUser(db: Db, token: string | null) {
  const phone = sessionPhone(db, token);
  if (!phone) throw new LocalApiError('Please sign in again', 401);
  return phone;
}

function requireSelfOrAdmin(phone: string, target: string) {
  if (phone !== target && !ADMIN_PHONES.includes(phone)) throw new LocalApiError('You can only access your own bookings and wallet', 403);
}

function requireAdmin(phone: string) {
  if (!ADMIN_PHONES.includes(phone)) throw new LocalApiError('Admins only', 403);
}

type DealInput = Partial<Deal> & { departureCity?: string; arrivalCity?: string };

function validDeal(input: DealInput): Omit<Deal, 'id'> {
  if (!input.departureCity?.trim() || !input.arrivalCity?.trim()) throw new LocalApiError('Departure and arrival cities are required');
  if (input.departureCity.trim().toLowerCase() === input.arrivalCity.trim().toLowerCase()) throw new LocalApiError('Departure and arrival must be different cities');
  if (!(Number(input.cost) > 0)) throw new LocalApiError('Cost must be positive');
  const discount = Number(input.discount ?? 0);
  if (discount < 0 || discount > 90) throw new LocalApiError('Discount must be between 0 and 90%');
  const duration = Number(input.durationMinutes ?? 120);
  if (!(duration >= 20 && duration <= 1200)) throw new LocalApiError('Flight time must be between 20 minutes and 20 hours');
  if (!input.departureDate || !input.expiresAt) throw new LocalApiError('Departure date and expiry are required');
  if (new Date(input.expiresAt).getTime() < new Date(input.departureDate).getTime()) throw new LocalApiError('Sale end must be on or after the first departure');
  return {
    departureCity: input.departureCity.trim(),
    arrivalCity: input.arrivalCity.trim(),
    cost: Number(input.cost),
    discount: Number(input.discount ?? 0),
    durationMinutes: Number(input.durationMinutes ?? 120),
    departureDate: new Date(input.departureDate).toISOString(),
    expiresAt: new Date(input.expiresAt).toISOString(),
    isActive: input.isActive ?? true,
  };
}

export async function localRequest(method: string, endpoint: string, body: unknown, token: string | null): Promise<unknown> {
  const url = new URL(endpoint, 'http://local');
  const path = url.pathname.replace(/\/+$/, '');
  const q = url.searchParams;
  const db = load();
  let m: RegExpMatchArray | null;

  if (method === 'POST' && path === '/auth/send-otp') {
    const { phoneNumber } = body as { phoneNumber: string };
    if (!/^\+91\d{10}$/.test(phoneNumber ?? '')) throw new LocalApiError('Enter a valid Indian phone number (e.g. +919876543210)');
    const recent = db.otps.filter((o) => o.phoneNumber === phoneNumber && o.requestedAt > Date.now() - 600000);
    if (recent.length >= 5) throw new LocalApiError('Too many codes requested for this number. Try again in a few minutes.');
    const code = String(100000 + Math.floor(Math.random() * 900000));
    db.otps = [...db.otps.filter((o) => o.expiresAt > Date.now()), { phoneNumber, code, expiresAt: Date.now() + 300000, used: false, requestedAt: Date.now() }];
    save(db);
    return { message: `Code sent to ${phoneNumber}`, demoOtp: code };
  }

  if (method === 'POST' && path === '/auth/verify-otp') {
    const { phoneNumber, otp } = body as { phoneNumber: string; otp: string };
    const match = [...db.otps].reverse().find((o) => o.phoneNumber === phoneNumber && !o.used && o.expiresAt > Date.now());
    if (!match || match.code !== otp) throw new LocalApiError('Invalid or expired OTP');
    match.used = true;
    const sessionToken = uuid();
    const expiresAt = Date.now() + 3600000;
    db.sessions[sessionToken] = { phoneNumber, expiresAt };
    save(db);
    return { token: sessionToken, expiresAt: new Date(expiresAt).toISOString() };
  }

  if (method === 'GET' && path === '/auth/me') {
    const phone = requireUser(db, token);
    return { phoneNumber: phone, admin: ADMIN_PHONES.includes(phone) };
  }

  if (method === 'GET' && path === '/deals') {
    const phone = sessionPhone(db, token);
    if (q.get('all') === 'true' && phone && ADMIN_PHONES.includes(phone)) return db.deals.map((d) => dealResponse(d, false));
    return db.deals.filter(isLive).map((d) => dealResponse(d));
  }
  if (method === 'GET' && path === '/deals/cities') {
    return [...new Set(db.deals.filter(isLive).flatMap((d) => [d.departureCity, d.arrivalCity]))];
  }
  if (method === 'GET' && path === '/deals/search') {
    const from = (q.get('from') ?? '').toLowerCase();
    const to = (q.get('to') ?? '').toLowerCase();
    const date = q.get('date');
    return db.deals
      .filter((d) => isLive(d) && d.departureCity.toLowerCase() === from && d.arrivalCity.toLowerCase() === to && (!date || runsOn(d, date)))
      .map((d) => (date ? { ...dealResponse(d), departureDate: departureOn(d, date) } : dealResponse(d)));
  }
  if (method === 'GET' && path === '/deals/connecting') {
    const from = (q.get('from') ?? '').toLowerCase();
    const to = (q.get('to') ?? '').toLowerCase();
    const pairs: ReturnType<typeof dealResponse>[][] = [];
    const date = q.get('date');
    for (const leg1 of db.deals.filter((d) => isLive(d) && d.departureCity.toLowerCase() === from && d.arrivalCity.toLowerCase() !== to)) {
      const key = date ?? dateKey(new Date(leg1.departureDate));
      if (!runsOn(leg1, key)) continue;
      for (const leg2 of db.deals.filter((d) => isLive(d) && d.departureCity.toLowerCase() === leg1.arrivalCity.toLowerCase() && d.arrivalCity.toLowerCase() === to)) {
        const link = connectionFor(leg1, key, leg2);
        if (link) pairs.push([{ ...dealResponse(leg1), departureDate: link.dep1 }, { ...dealResponse(leg2), departureDate: link.dep2 }]);
      }
    }
    return pairs.sort((a, b) => a[0].cost + a[1].cost - (b[0].cost + b[1].cost));
  }
  if (method === 'GET' && (m = path.match(/^\/deals\/([^/]+)$/))) {
    const deal = db.deals.find((d) => d.id === m![1]);
    if (!deal) throw new LocalApiError(`Deal not found: ${m[1]}`, 404);
    return dealResponse(deal);
  }
  if (method === 'POST' && path === '/deals') {
    requireAdmin(requireUser(db, token));
    const deal = { id: uuid(), ...validDeal(body as DealInput) };
    db.deals.push(deal);
    save(db);
    return dealResponse(deal, false);
  }
  if ((method === 'PUT' || method === 'DELETE') && (m = path.match(/^\/deals\/([^/]+)$/))) {
    requireAdmin(requireUser(db, token));
    const index = db.deals.findIndex((d) => d.id === m![1]);
    if (index < 0) throw new LocalApiError(`Deal not found: ${m[1]}`, 404);
    if (method === 'DELETE') {
      const live = db.bookings.filter((b) => b.dealId === db.deals[index].id && b.status === 'confirmed').length;
      if (live) throw new LocalApiError(`This flight has ${live} active booking${live > 1 ? 's' : ''}. Turn it off instead of deleting it.`, 409);
      db.deals.splice(index, 1);
      save(db);
      return undefined;
    }
    const current = db.deals[index];
    db.deals[index] = { ...current, ...validDeal({ ...current, ...(body as DealInput) }) };
    save(db);
    return dealResponse(db.deals[index], false);
  }

  if (method === 'GET' && path === '/bookings/occupied-seats') {
    const deal = db.deals.find((d) => d.id === q.get('dealId'));
    if (!deal) throw new LocalApiError('Deal not found', 404);
    return [...new Set([...bookedSeats(db, deal, q.get('departureTime')), ...heldSeats(db, deal, q.get('departureTime'), sessionPhone(db, token))])].sort();
  }

  if (method === 'GET' && path === '/bookings/seat-map') {
    const deal = db.deals.find((d) => d.id === q.get('dealId'));
    if (!deal) throw new LocalApiError('Deal not found', 404);
    return seatMap(db, deal, q.get('departureTime'), sessionPhone(db, token));
  }

  const phone = requireUser(db, token);

  if (path === '/bookings/holds' && (method === 'PUT' || method === 'DELETE')) {
    const input = (method === 'PUT' ? body : { dealId: q.get('dealId'), selectedDepartureTime: q.get('departureTime'), selectedSeats: [] }) as LegInput;
    const deal = db.deals.find((d) => d.id === input.dealId);
    if (!deal) throw new LocalApiError('Deal not found', 404);
    const target = slotOf(deal, input.selectedDepartureTime);
    const seats = [...new Set((input.selectedSeats ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean))];
    if (seats.length > MAX_HELD_SEATS) throw new LocalApiError(`You can hold up to ${MAX_HELD_SEATS} seats at a time`);
    if (seats.length) {
      requireSlot(deal, input.selectedDepartureTime);
      const invalid = seats.filter((s) => !isValidSeat(s));
      if (invalid.length) throw new LocalApiError(`Seat does not exist on this aircraft: ${invalid.join(', ')}`);
      const booked = bookedSeats(db, deal, input.selectedDepartureTime);
      const others = heldSeats(db, deal, input.selectedDepartureTime, phone);
      const lost = seats.filter((s) => booked.has(s) || others.has(s));
      if (lost.length) throw new LocalApiError(`Someone just took ${lost.join(', ')}. Pick another seat.`, 409);
    }
    const existing = (db.holds ?? []).filter((h) => h.owner === phone && h.dealId === deal.id && h.slot === target);
    const kept = new Set(existing.map((h) => h.seat));
    const fresh = Date.now() + HOLD_MINUTES * 60000;
    const expiry = existing.length && seats.every((s) => kept.has(s)) ? Math.min(...existing.map((h) => h.expiresAt)) : fresh;
    db.holds = [
      ...(db.holds ?? []).filter((h) => !(h.owner === phone && h.dealId === deal.id && h.slot === target)),
      ...seats.map((seat) => ({ dealId: deal.id, slot: target, seat, owner: phone, expiresAt: expiry })),
    ];
    save(db);
    return seatMap(db, deal, input.selectedDepartureTime, phone);
  }

  if (method === 'GET' && path === '/bookings/summary') {
    requireAdmin(phone);
    const out: Record<string, { bookings: number; seatsSold: number; revenue: number; cancelled: number }> = {};
    for (const b of db.bookings) {
      const row = (out[b.dealId] ??= { bookings: 0, seatsSold: 0, revenue: 0, cancelled: 0 });
      if (b.status === 'cancelled') row.cancelled += 1;
      else {
        row.bookings += 1;
        row.seatsSold += b.selectedSeats.length;
        row.revenue = round(row.revenue + b.paidAmount);
      }
    }
    return out;
  }

  if (method === 'POST' && path === '/bookings/itinerary') {
    const input = body as { legs: LegInput[]; passengerName?: string; passengerCount?: number };
    const legs = input.legs ?? [];
    if (!legs.length || legs.length > 2) throw new LocalApiError('An itinerary has one or two flights');
    const count = input.passengerCount && input.passengerCount > 0 ? input.passengerCount : 1;
    const plans = legs.map((leg) => {
      const deal = db.deals.find((d) => d.id === leg.dealId);
      if (!deal) throw new LocalApiError(`Deal not found: ${leg.dealId}`, 404);
      if (!isLive(deal)) throw new LocalApiError(`${deal.departureCity} to ${deal.arrivalCity} is no longer on sale`);
      requireSlot(deal, leg.selectedDepartureTime);
      const seats = [...new Set((leg.selectedSeats ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean))];
      if (seats.length !== count) throw new LocalApiError(`Pick ${count} seat${count > 1 ? 's' : ''} on ${deal.departureCity} to ${deal.arrivalCity}`);
      const invalid = seats.filter((s) => !isValidSeat(s));
      if (invalid.length) throw new LocalApiError(`Seat does not exist on this aircraft: ${invalid.join(', ')}`);
      const taken = bookedSeats(db, deal, leg.selectedDepartureTime);
      const others = heldSeats(db, deal, leg.selectedDepartureTime, phone);
      const lost = seats.filter((s) => taken.has(s) || others.has(s));
      if (lost.length) throw new LocalApiError(`Seat ${lost.join(', ')} on ${deal.departureCity} to ${deal.arrivalCity} was just taken`, 409);
      exitRowCheck(seats, input.passengerName);
      return { deal, seats, slot: leg.selectedDepartureTime as string, total: seatsTotal(price(deal), seats) };
    });
    if (plans.length === 2) {
      const arrive = new Date(plans[0].slot).getTime() + plans[0].deal.durationMinutes * 60000;
      const gap = (new Date(plans[1].slot).getTime() - arrive) / 60000;
      if (plans[0].deal.arrivalCity.toLowerCase() !== plans[1].deal.departureCity.toLowerCase() || gap < 60) throw new LocalApiError('These two flights do not connect');
    }
    const total = round(plans.reduce((sum, p) => sum + p.total, 0));
    const balance = db.wallets[phone] ?? 0;
    if (balance < total) throw new LocalApiError(`Insufficient wallet balance. You have ₹${balance.toLocaleString('en-IN')}, this trip costs ₹${total.toLocaleString('en-IN')}. Add money from the wallet in the top bar.`);
    db.wallets[phone] = round(balance - total);
    const created = plans.map((p) => {
      const booking: StoredBooking = {
        id: uuid(),
        dealId: p.deal.id,
        phoneNumber: phone,
        passengerName: input.passengerName,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        selectedDepartureTime: p.slot,
        selectedSeats: p.seats,
        paidAmount: p.total,
      };
      db.bookings.push(booking);
      db.holds = (db.holds ?? []).filter((h) => !(h.owner === phone && h.dealId === p.deal.id && h.slot === slotOf(p.deal, p.slot)));
      return booking;
    });
    save(db);
    return created.map((b) => bookingResponse(db, b));
  }

  if (method === 'POST' && path === '/bookings') {
    const input = body as { dealId: string; passengerName?: string; selectedDepartureTime?: string; selectedSeats?: string[]; passengerCount?: number };
    const deal = db.deals.find((d) => d.id === input.dealId);
    if (!deal) throw new LocalApiError(`Deal not found: ${input.dealId}`, 404);
    if (!deal.isActive) throw new LocalApiError('This deal is no longer active');
    if (new Date(deal.expiresAt).getTime() < Date.now()) throw new LocalApiError('This deal has expired');
    const seats = [...new Set((input.selectedSeats ?? []).filter((s) => s?.trim()).map((s) => s.trim().toUpperCase()))];
    if (input.selectedDepartureTime) requireSlot(deal, input.selectedDepartureTime);
    const taken = new Set([...bookedSeats(db, deal, input.selectedDepartureTime), ...heldSeats(db, deal, input.selectedDepartureTime, phone)]);
    const invalid = seats.filter((s) => !isValidSeat(s));
    if (invalid.length) throw new LocalApiError(`Seat does not exist on this aircraft: ${invalid.join(', ')}`);
    const conflicts = seats.filter((s) => taken.has(s));
    if (conflicts.length) throw new LocalApiError(`Selected seat(s) already booked: ${conflicts.join(', ')}`);
    const count = input.passengerCount && input.passengerCount > 0 ? input.passengerCount : seats.length || 1;
    if (seats.length && seats.length !== count) throw new LocalApiError('Selected seats must match passenger count');
    const total = seats.length ? seatsTotal(price(deal), seats) : round(price(deal) * count);
    const balance = db.wallets[phone] ?? 0;
    if (balance < total) throw new LocalApiError(`Insufficient wallet balance. You have ₹${balance.toLocaleString('en-IN')}, this booking costs ₹${total.toLocaleString('en-IN')}.`);
    db.wallets[phone] = round(balance - total);
    const booking: StoredBooking = {
      id: uuid(),
      dealId: deal.id,
      phoneNumber: phone,
      passengerName: input.passengerName,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      selectedDepartureTime: input.selectedDepartureTime ?? null,
      selectedSeats: seats,
      paidAmount: total,
    };
    db.bookings.push(booking);
    save(db);
    return bookingResponse(db, booking);
  }
  if (method === 'GET' && path === '/bookings') {
    const target = q.get('phone') || phone;
    requireSelfOrAdmin(phone, target);
    return db.bookings.filter((b) => b.phoneNumber === target).map((b) => bookingResponse(db, b));
  }
  if ((m = path.match(/^\/bookings\/([^/]+)(\/cancel)?$/))) {
    const booking = db.bookings.find((b) => b.id === m![1]);
    if (!booking) throw new LocalApiError(`Booking not found: ${m[1]}`, 404);
    requireSelfOrAdmin(phone, booking.phoneNumber);
    if (method === 'GET' && !m[2]) return bookingResponse(db, booking);
    if (method === 'PUT' && m[2]) {
      if (booking.status === 'cancelled') throw new LocalApiError('Booking is already cancelled');
      const deal = db.deals.find((d) => d.id === booking.dealId);
      const flies = booking.selectedDepartureTime ?? deal?.departureDate;
      if (flies && new Date(flies).getTime() < Date.now()) throw new LocalApiError('This flight has already left');
      const days = flies ? (new Date(flies).getTime() - Date.now()) / DAY : 0;
      const refund = days > 10 ? booking.paidAmount : round(booking.paidAmount * 0.5);
      booking.status = 'cancelled';
      db.wallets[booking.phoneNumber] = round((db.wallets[booking.phoneNumber] ?? 0) + refund);
      save(db);
      return { ...bookingResponse(db, booking), refundAmount: refund };
    }
  }

  if (method === 'GET' && path === '/wallet') {
    const target = q.get('phone') || phone;
    requireSelfOrAdmin(phone, target);
    return { phoneNumber: target, balance: db.wallets[target] ?? 0 };
  }
  if (method === 'POST' && path === '/wallet/top-up') {
    const amount = Number((body as { amount: number }).amount);
    if (!(amount > 0)) throw new LocalApiError('Amount must be positive');
    if (amount > MAX_TOP_UP) throw new LocalApiError('You can add at most ₹2,00,000 at a time');
    db.wallets[phone] = round((db.wallets[phone] ?? 0) + amount);
    save(db);
    return { phoneNumber: phone, balance: db.wallets[phone] };
  }

  throw new LocalApiError(`Unknown endpoint ${method} ${path}`, 404);
}
