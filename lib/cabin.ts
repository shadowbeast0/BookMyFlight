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
  { id: 'business', name: 'Business', short: 'J', firstRow: 1, lastRow: 3, letters: ['A', 'C', 'D', 'F'], multiplier: 2.6, pitch: 1.5, perks: 'Lie-flat seats, priority boarding, lounge access' },
  { id: 'premium', name: 'Premium Economy', short: 'W', firstRow: 4, lastRow: 7, letters: ['A', 'B', 'C', 'D', 'E', 'F'], multiplier: 1.45, pitch: 0.95, perks: 'Extra legroom, meal included, 25 kg bag' },
  { id: 'economy', name: 'Economy', short: 'Y', firstRow: 8, lastRow: 24, letters: ['A', 'B', 'C', 'D', 'E', 'F'], multiplier: 1, pitch: 0.74, perks: 'Standard seat, 15 kg bag' },
];

const SEAT_RE = /^(\d{1,2})([A-F])$/;

export function cabinClassOf(seat: string): CabinClass | null {
  const m = SEAT_RE.exec(seat.trim().toUpperCase());
  if (!m) return null;
  const row = Number(m[1]);
  const cls = CABIN.find((c) => row >= c.firstRow && row <= c.lastRow);
  if (!cls || !cls.letters.includes(m[2])) return null;
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

const round2 = (n: number) => Math.round(n * 100) / 100;

export function seatPrice(unitPrice: number, seat: string) {
  const cls = cabinClassOf(seat);
  return round2(unitPrice * (cls ? cls.multiplier : 1));
}

export function seatsTotal(unitPrice: number, seats: string[]) {
  return round2(seats.reduce((sum, s) => sum + seatPrice(unitPrice, s), 0));
}

export const ALL_SEATS: string[] = CABIN.flatMap((c) => {
  const out: string[] = [];
  for (let r = c.firstRow; r <= c.lastRow; r++) for (const l of c.letters) out.push(`${r}${l}`);
  return out;
});
