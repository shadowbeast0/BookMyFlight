export type CabinClassId = 'business' | 'premium' | 'economy';

export type CabinClass = {
  id: CabinClassId;
  name: string;
  short: string;
  firstRow: number;
  lastRow: number;
  letters: string[];
  multiplier: number;
  pitch: number;
  perks: string;
};

export const CABIN: CabinClass[] = [
  { id: 'business', name: 'Business', short: 'J', firstRow: 1, lastRow: 3, letters: ['A', 'C', 'D', 'F'], multiplier: 2.6, pitch: 1.5, perks: 'Lie-flat seat, priority boarding, lounge access, 35 kg bag' },
  { id: 'premium', name: 'Premium Economy', short: 'W', firstRow: 4, lastRow: 7, letters: ['A', 'B', 'C', 'D', 'E', 'F'], multiplier: 1.45, pitch: 0.95, perks: 'Extra legroom, hot meal, 25 kg bag' },
  { id: 'economy', name: 'Economy', short: 'Y', firstRow: 8, lastRow: 24, letters: ['A', 'B', 'C', 'D', 'E', 'F'], multiplier: 1, pitch: 0.73, perks: '7 kg cabin bag, 15 kg check-in' },
];

export const EXIT_ROWS = [12, 13];

export type SeatTierId = 'included' | 'bulkhead' | 'xl' | 'front' | 'preferred' | 'standard' | 'free';

export type SeatTier = { id: SeatTierId; label: string; note: string };

export const SEAT_TIERS: Record<SeatTierId, SeatTier> = {
  included: { id: 'included', label: 'Included', note: 'Seat choice is part of the fare' },
  bulkhead: { id: 'bulkhead', label: 'Bulkhead', note: 'First row of the cabin, nobody reclines into you' },
  xl: { id: 'xl', label: 'Extra legroom', note: 'Exit row. Adults only, must be able to help in an evacuation' },
  front: { id: 'front', label: 'Up front', note: 'Off the plane first' },
  preferred: { id: 'preferred', label: 'Preferred', note: 'Window or aisle' },
  standard: { id: 'standard', label: 'Standard', note: 'Window or aisle near the back' },
  free: { id: 'free', label: 'Free', note: 'No seat fee' },
};

const SEAT_RE = /^(\d{1,2})([A-F])$/;

const parse = (seat: string) => {
  const m = SEAT_RE.exec(seat.trim().toUpperCase());
  return m ? { row: Number(m[1]), letter: m[2] } : null;
};

export function cabinClassOf(seat: string): CabinClass | null {
  const p = parse(seat);
  if (!p) return null;
  const cls = CABIN.find((c) => p.row >= c.firstRow && p.row <= c.lastRow);
  if (!cls || !cls.letters.includes(p.letter)) return null;
  return cls;
}

export function isValidSeat(seat: string) {
  return cabinClassOf(seat) !== null;
}

export function seatPosition(seat: string): 'window' | 'middle' | 'aisle' {
  const letter = seat.trim().toUpperCase().slice(-1);
  if (letter === 'A' || letter === 'F') return 'window';
  if (letter === 'C' || letter === 'D') return 'aisle';
  return 'middle';
}

export function seatTierOf(seat: string): SeatTier {
  const cls = cabinClassOf(seat);
  const p = parse(seat);
  if (!cls || !p) return SEAT_TIERS.free;
  const pos = seatPosition(seat);
  if (cls.id === 'business') return SEAT_TIERS.included;
  if (cls.id === 'premium') {
    if (p.row === cls.firstRow) return SEAT_TIERS.bulkhead;
    return pos === 'middle' ? SEAT_TIERS.free : SEAT_TIERS.preferred;
  }
  if (EXIT_ROWS.includes(p.row)) return SEAT_TIERS.xl;
  if (p.row <= 10) return SEAT_TIERS.front;
  if (pos === 'middle') return SEAT_TIERS.free;
  return p.row >= 22 ? SEAT_TIERS.standard : SEAT_TIERS.preferred;
}

export function seatFee(seat: string): number {
  const tier = seatTierOf(seat);
  const pos = seatPosition(seat);
  const premium = cabinClassOf(seat)?.id === 'premium';
  switch (tier.id) {
    case 'bulkhead':
      return 750;
    case 'xl':
      return pos === 'middle' ? 949 : 1149;
    case 'front':
      return pos === 'middle' ? 449 : 649;
    case 'preferred':
      return premium ? 399 : pos === 'window' ? 349 : 299;
    case 'standard':
      return 199;
    default:
      return 0;
  }
}

export function classFare(unitPrice: number, cls: CabinClass | null) {
  return Math.round(unitPrice * (cls ? cls.multiplier : 1));
}

export function seatPrice(unitPrice: number, seat: string) {
  return classFare(unitPrice, cabinClassOf(seat)) + seatFee(seat);
}

export function seatsTotal(unitPrice: number, seats: string[]) {
  return seats.reduce((sum, s) => sum + seatPrice(unitPrice, s), 0);
}

export function fareBreakdown(unitPrice: number, seats: string[]) {
  const fares = seats.reduce((sum, s) => sum + classFare(unitPrice, cabinClassOf(s)), 0);
  const fees = seats.reduce((sum, s) => sum + seatFee(s), 0);
  return { fares, fees, total: fares + fees };
}

export const ALL_SEATS: string[] = CABIN.flatMap((c) => {
  const out: string[] = [];
  for (let r = c.firstRow; r <= c.lastRow; r++) for (const l of c.letters) out.push(`${r}${l}`);
  return out;
});

export const HOLD_MINUTES = 10;
