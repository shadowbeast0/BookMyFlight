'use client';

import { isValidSeat, seatsTotal } from './cabin';

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
  version: 1;
  deals: Deal[];
  bookings: StoredBooking[];
  wallets: Record<string, number>;
  otps: { phoneNumber: string; code: string; expiresAt: number; used: boolean; requestedAt: number }[];
  sessions: Record<string, { phoneNumber: string; expiresAt: number }>;
};

export class LocalApiError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const KEY = 'bmf_local_db_v1';
const ADMIN_PHONES = (process.env.NEXT_PUBLIC_ADMIN_PHONES || '+919876543210').split(',').map((p) => p.trim());
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
    const departure = new Date(now + days * DAY);
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
  return { version: 1, deals, bookings: [], wallets: {}, otps: [], sessions: {} };
}

function load(): Db {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Db;
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
  if (!(Number(input.cost) > 0)) throw new LocalApiError('Cost must be positive');
  if (!input.departureDate || !input.expiresAt) throw new LocalApiError('Departure date and expiry are required');
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
    return db.deals.filter((d) => isLive(d) && d.departureCity.toLowerCase() === from && d.arrivalCity.toLowerCase() === to).map((d) => dealResponse(d));
  }
  if (method === 'GET' && path === '/deals/connecting') {
    const from = (q.get('from') ?? '').toLowerCase();
    const to = (q.get('to') ?? '').toLowerCase();
    const pairs: ReturnType<typeof dealResponse>[][] = [];
    for (const leg1 of db.deals.filter((d) => isLive(d) && d.departureCity.toLowerCase() === from && d.arrivalCity.toLowerCase() !== to)) {
      const arrival = new Date(leg1.departureDate).getTime() + leg1.durationMinutes * 60000;
      for (const leg2 of db.deals.filter((d) => isLive(d) && d.departureCity.toLowerCase() === leg1.arrivalCity.toLowerCase() && d.arrivalCity.toLowerCase() === to)) {
        const layover = (new Date(leg2.departureDate).getTime() - arrival) / 60000;
        if (layover >= 0 && layover <= 360) pairs.push([dealResponse(leg1), dealResponse(leg2)]);
      }
    }
    return pairs;
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
    return [...bookedSeats(db, deal, q.get('departureTime'))].sort();
  }

  const phone = requireUser(db, token);

  if (method === 'POST' && path === '/bookings') {
    const input = body as { dealId: string; passengerName?: string; selectedDepartureTime?: string; selectedSeats?: string[]; passengerCount?: number };
    const deal = db.deals.find((d) => d.id === input.dealId);
    if (!deal) throw new LocalApiError(`Deal not found: ${input.dealId}`, 404);
    if (!deal.isActive) throw new LocalApiError('This deal is no longer active');
    if (new Date(deal.expiresAt).getTime() < Date.now()) throw new LocalApiError('This deal has expired');
    const seats = [...new Set((input.selectedSeats ?? []).filter((s) => s?.trim()).map((s) => s.trim().toUpperCase()))];
    const taken = bookedSeats(db, deal, input.selectedDepartureTime);
    const invalid = seats.filter((s) => !isValidSeat(s));
    if (invalid.length) throw new LocalApiError(`Seat does not exist on this aircraft: ${invalid.join(', ')}`);
    const conflicts = seats.filter((s) => taken.has(s));
    if (conflicts.length) throw new LocalApiError(`Selected seat(s) already booked: ${conflicts.join(', ')}`);
    const count = input.passengerCount && input.passengerCount > 0 ? input.passengerCount : seats.length || 1;
    if (seats.length && seats.length !== count) throw new LocalApiError('Selected seats must match passenger count');
    const total = seats.length ? seatsTotal(price(deal), seats) : round(price(deal) * count);
    const balance = db.wallets[phone] ?? 0;
    if (balance < total) throw new LocalApiError(`Insufficient wallet balance. Current: Rs ${balance.toFixed(2)}, Required: Rs ${total.toFixed(2)}`);
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
      const days = deal ? (new Date(deal.departureDate).getTime() - Date.now()) / DAY : 0;
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
    if (amount > MAX_TOP_UP) throw new LocalApiError('You can add at most Rs 2,00,000 at a time');
    db.wallets[phone] = round((db.wallets[phone] ?? 0) + amount);
    save(db);
    return { phoneNumber: phone, balance: db.wallets[phone] };
  }

  throw new LocalApiError(`Unknown endpoint ${method} ${path}`, 404);
}
