export const MIN_CONNECTION_MINUTES = 60;
export const MAX_LAYOVER_MINUTES = 14 * 60;
export const BOOKING_CLOSES_MINUTES = 120;

type Scheduled = { departureDate?: string; expiresAt: string; durationMinutes?: number };

const pad = (n: number) => String(n).padStart(2, '0');

export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseDateKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (key: string, n: number) => {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
};

export function scheduledClock(deal: Scheduled) {
  const d = new Date(deal.departureDate ?? Date.now());
  return { h: d.getHours(), m: d.getMinutes() };
}

export function clockLabel(deal: Scheduled) {
  const { h, m } = scheduledClock(deal);
  return `${pad(h)}:${pad(m)}`;
}

export function departureOn(deal: Scheduled, key: string) {
  return `${key}T${clockLabel(deal)}:00`;
}

export function serviceWindow(deal: Scheduled, now = new Date()) {
  const first = dateKey(new Date(deal.departureDate ?? now));
  const todaySlot = new Date(`${dateKey(now)}T${clockLabel(deal)}:00`);
  const earliest = todaySlot.getTime() - BOOKING_CLOSES_MINUTES * 60000 > now.getTime() ? dateKey(now) : addDays(dateKey(now), 1);
  const last = dateKey(new Date(deal.expiresAt));
  return { first: first > earliest ? first : earliest, last };
}

export function runsOn(deal: Scheduled, key: string, now = new Date()) {
  const w = serviceWindow(deal, now);
  return key >= w.first && key <= w.last;
}

export function isScheduledSlot(deal: Scheduled, slot: string, now = new Date()) {
  const d = new Date(slot);
  if (Number.isNaN(d.getTime())) return false;
  const { h, m } = scheduledClock(deal);
  return d.getHours() === h && d.getMinutes() === m && runsOn(deal, dateKey(d), now);
}

export function arrivalOf(deal: Scheduled, departureIso: string) {
  return new Date(new Date(departureIso).getTime() + (deal.durationMinutes ?? 0) * 60000);
}

export function connectionFor(leg1: Scheduled, leg1Key: string, leg2: Scheduled, now = new Date()) {
  const dep1 = departureOn(leg1, leg1Key);
  const arrive = arrivalOf(leg1, dep1).getTime();
  for (const offset of [0, 1]) {
    const key = addDays(dateKey(new Date(arrive)), offset);
    const dep2 = departureOn(leg2, key);
    const layover = (new Date(dep2).getTime() - arrive) / 60000;
    if (layover < MIN_CONNECTION_MINUTES) continue;
    if (layover > MAX_LAYOVER_MINUTES) return null;
    if (!runsOn(leg2, key, now)) return null;
    return { leg2Key: key, dep1, dep2, layover };
  }
  return null;
}

export function durationLabel(mins?: number) {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function clockOf(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
