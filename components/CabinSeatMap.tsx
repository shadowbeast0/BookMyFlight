'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Minus, Plane, Plus, X, ZoomIn, ZoomOut } from 'lucide-react';
import { CABIN, cabinClassOf, classFare, seatFee, seatPosition, seatPrice, SeatTierId, seatTierOf, SEAT_TIERS } from '@/lib/cabin';
import styles from './CabinSeatMap.module.css';

type HoverInfo = { seat: string; occupied: boolean; held: boolean; x: number; y: number } | null;
type CabinApi = {
  setOccupied: (list: string[]) => void;
  setHeld: (list: string[]) => void;
  setSelected: (list: string[]) => void;
  setTint: (fn: (seat: string) => string | null) => void;
  setTime: (hour: number) => void;
  focusRows: (first: number | null, last: number | null) => void;
  viewSeat: (seat: string) => void;
  overview: () => void;
  skipIntro: () => void;
  zoom: (dir: number) => void;
  setInset: (px: number) => void;
  setRunning: (v: boolean) => void;
  resize: () => void;
  dispose: () => void;
};

export type LegTab = { label: string; sub: string };

type Props = {
  kicker: string;
  legs: LegTab[];
  activeLeg: number;
  onLeg: (i: number) => void;
  hour: number;
  gate: string;
  intro: boolean;
  unitPrice: number;
  booked: string[];
  held: string[];
  selected: string[];
  passengerCount: number;
  adults: number;
  kids: number;
  onAdults: (n: number) => void;
  onKids: (n: number) => void;
  onToggle: (seat: string) => void;
  children?: ReactNode;
};

export const TIER_COLORS: Record<SeatTierId, string> = {
  included: '#d6bf98',
  bulkhead: '#2fb3a2',
  xl: '#3fbf6f',
  front: '#4c8fe8',
  preferred: '#8a7fe0',
  standard: '#5d6aa0',
  free: '#7d8296',
};

const TIER_ORDER: SeatTierId[] = ['included', 'bulkhead', 'xl', 'front', 'preferred', 'standard', 'free'];
const TIER_FEES: Record<SeatTierId, string> = {
  included: 'in fare',
  bulkhead: '+₹750',
  xl: '+₹949–1,149',
  front: '+₹449–649',
  preferred: '+₹299–399',
  standard: '+₹199',
  free: '+₹0',
};

const SECTIONS = [
  { id: 'business', label: 'Business', first: 1, last: 3 },
  { id: 'premium', label: 'Premium Economy', first: 4, last: 7 },
  { id: 'eco-front', label: 'Economy, front', first: 8, last: 15 },
  { id: 'eco-back', label: 'Economy, back', first: 16, last: 24 },
  { id: 'all', label: 'Whole plane', first: null, last: null },
] as const;

const STAGE_COPY: Record<string, { title: string; body: string }> = {
  gate: { title: 'Your aircraft is at the gate', body: 'Boarding is open.' },
  bridge: { title: 'Down the jet bridge', body: 'Mind the gap between the bridge and the door.' },
  door: { title: 'Welcome aboard', body: 'Take a look around the cabin.' },
  lift: { title: 'Wheels up', body: 'Opening the seat map.' },
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const positionName = { window: 'window', middle: 'middle', aisle: 'aisle' };

export function CabinSeatMap(props: Props) {
  const { kicker, legs, activeLeg, onLeg, hour, gate, intro, unitPrice, booked, held, selected, passengerCount, adults, kids, onAdults, onKids, onToggle, children } = props;
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const apiRef = useRef<CabinApi | null>(null);
  const toggleRef = useRef(onToggle);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<HoverInfo>(null);
  const [section, setSection] = useState(2);
  const [viewing, setViewing] = useState<string | null>(null);
  const [stage, setStage] = useState<string>(intro ? 'gate' : 'done');

  toggleRef.current = onToggle;

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    const lite = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const playIntro = intro && !reduced;
    if (!playIntro) setStage('done');
    import('@/lib/cabinScene')
      .then(({ createCabinScene }) => {
        if (disposed || !canvasRef.current) return;
        let api: CabinApi;
        try {
          api = (createCabinScene as (c: HTMLCanvasElement, o: unknown) => CabinApi)(canvasRef.current, {
            lite,
            layout: CABIN,
            intro: playIntro,
            gate,
            hour,
            defaultSection: [SECTIONS[2].first, SECTIONS[2].last],
            seatColor: (seat: string) => TIER_COLORS[seatTierOf(seat).id],
            onIntro: (s: string) => setStage(s),
            onHover: (h: HoverInfo) => setHover(h),
            onToggle: (seat: string) => toggleRef.current(seat),
          });
        } catch {
          setFailed(true);
          setStage('done');
          return;
        }
        apiRef.current = api;
        setReady(true);
        const syncInset = () => {
          const panel = panelRef.current;
          const wide = window.innerWidth >= 960;
          api.setInset(wide && panel ? panel.offsetWidth + 24 : 0);
          api.resize();
        };
        syncInset();
        const ro = new ResizeObserver(syncInset);
        if (canvasRef.current) ro.observe(canvasRef.current);
        const io = new IntersectionObserver(([en]) => api.setRunning(en.isIntersecting));
        if (stageRef.current) io.observe(stageRef.current);
        cleanup = () => {
          ro.disconnect();
          io.disconnect();
          api.dispose();
          apiRef.current = null;
        };
      })
      .catch(() => {
        setFailed(true);
        setStage('done');
      });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    apiRef.current?.setOccupied(booked);
  }, [booked, ready]);

  useEffect(() => {
    apiRef.current?.setHeld(held);
  }, [held, ready]);

  useEffect(() => {
    apiRef.current?.setSelected(selected);
  }, [selected, ready]);

  useEffect(() => {
    if (ready) apiRef.current?.setTime(hour);
  }, [hour, ready]);

  useEffect(() => {
    if (viewing && !selected.includes(viewing)) {
      apiRef.current?.overview();
      setViewing(null);
    }
  }, [selected, viewing]);

  const busy = stage !== 'done';

  const goSection = (i: number) => {
    const n = (i + SECTIONS.length) % SECTIONS.length;
    setSection(n);
    setViewing(null);
    const s = SECTIONS[n];
    apiRef.current?.focusRows(s.first, s.last);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape' && viewing) {
        setViewing(null);
        apiRef.current?.overview();
      }
      if (busy || viewing) return;
      if (e.key === 'ArrowRight') goSection(section + 1);
      if (e.key === 'ArrowLeft') goSection(section - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const unavailable = useMemo(() => new Set([...booked, ...held]), [booked, held]);

  const sectionInfo = useMemo(
    () =>
      SECTIONS.map((s) => {
        if (s.first === null) return { free: 0, from: 0 };
        const cls = cabinClassOf(`${s.first}A`)!;
        let free = 0;
        let from = Infinity;
        for (let r = s.first; r <= s.last; r++) {
          for (const l of cls.letters) {
            const seat = `${r}${l}`;
            if (unavailable.has(seat)) continue;
            free++;
            from = Math.min(from, seatPrice(unitPrice, seat));
          }
        }
        return { free, from: Number.isFinite(from) ? from : 0 };
      }),
    [unavailable, unitPrice]
  );

  const look = (seat: string) => {
    setViewing(seat);
    setHover(null);
    apiRef.current?.viewSeat(seat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => {
    setViewing(null);
    apiRef.current?.overview();
  };

  const remaining = passengerCount - selected.length;
  const hoverCls = hover ? cabinClassOf(hover.seat) : null;
  const viewCls = viewing ? cabinClassOf(viewing) : null;
  const cur = SECTIONS[section];
  const curCls = cur.first !== null ? cabinClassOf(`${cur.first}A`) : null;

  return (
    <div className={`${styles.wrap} ${viewing ? styles.inside : ''} ${busy ? styles.boarding : ''}`}>
      <section ref={stageRef} className={styles.stage} aria-labelledby="seat-title">
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        {!ready && !failed && (
          <div className={styles.loader} aria-hidden="true">
            <Plane size={16} /> Taxiing to the gate…
          </div>
        )}
        {failed && <div className={styles.fallback}>3D view isn’t available on this device. Pick seats by number in the checkout panel.</div>}

        {busy && ready && STAGE_COPY[stage] && (
          <div className={styles.introCopy} key={stage} aria-live="polite">
            <p className={styles.kicker}>Gate {gate}</p>
            <p className={styles.introTitle}>{STAGE_COPY[stage].title}</p>
            <p className={styles.introBody}>{STAGE_COPY[stage].body}</p>
          </div>
        )}
        {busy && ready && (
          <button type="button" className={styles.skip} onClick={() => apiRef.current?.skipIntro()}>
            Skip to seats
          </button>
        )}

        <header className={styles.top}>
          <p className={styles.kicker}>{kicker}</p>
          <h1 id="seat-title" className={styles.title}>
            <span>Pick your</span>
            <span className={styles.dim}>seat.</span>
          </h1>
          {legs.length > 1 && (
            <div className={styles.legs} role="tablist" aria-label="Flights in this trip">
              {legs.map((l, i) => (
                <button key={i} type="button" role="tab" aria-selected={i === activeLeg} onClick={() => onLeg(i)}>
                  <b>{l.label}</b>
                  <span>{l.sub}</span>
                </button>
              ))}
            </div>
          )}
          <p className={styles.hint}>
            {remaining > 0
              ? `Pick ${remaining} more seat${remaining > 1 ? 's' : ''}${legs.length > 1 ? ' on this flight' : ''}. Drag to turn, scroll to zoom, arrow keys to move between cabins.`
              : 'All seats picked. Tap one of yours to release it.'}
          </p>
          <div className={styles.pax}>
            <span>Adults</span>
            <button type="button" onClick={() => onAdults(Math.max(1, adults - 1))} aria-label="Fewer adults"><Minus size={13} /></button>
            <b>{adults}</b>
            <button type="button" onClick={() => onAdults(Math.min(9, adults + 1))} aria-label="More adults"><Plus size={13} /></button>
            <span>Children</span>
            <button type="button" onClick={() => onKids(Math.max(0, kids - 1))} aria-label="Fewer children"><Minus size={13} /></button>
            <b>{kids}</b>
            <button type="button" onClick={() => onKids(Math.min(8, kids + 1))} aria-label="More children"><Plus size={13} /></button>
          </div>
        </header>

        <nav className={styles.sections} aria-label="Cabin sections">
          <button type="button" className={styles.arrow} onClick={() => goSection(section - 1)} aria-label="Previous cabin"><ChevronLeft size={18} /></button>
          <div className={styles.sectionCard}>
            <p className={styles.sectionName}>{cur.label}</p>
            {cur.first !== null ? (
              <>
                <p className={styles.sectionPrice}>from {inr(sectionInfo[section].from)}<small> per seat</small></p>
                <p className={styles.sectionMeta}>Rows {cur.first}–{cur.last}, {sectionInfo[section].free} free</p>
                {curCls && <p className={styles.sectionPerks}>{curCls.perks}</p>}
              </>
            ) : (
              <p className={styles.sectionMeta}>{sectionInfo.slice(0, 4).reduce((a, s) => a + s.free, 0)} seats free across the cabin</p>
            )}
            <div className={styles.dots} role="tablist" aria-label="Jump to cabin">
              {SECTIONS.map((s, i) => (
                <button key={s.id} type="button" role="tab" aria-selected={i === section} aria-label={s.label} onClick={() => goSection(i)} />
              ))}
            </div>
          </div>
          <button type="button" className={styles.arrow} onClick={() => goSection(section + 1)} aria-label="Next cabin"><ChevronRight size={18} /></button>
        </nav>

        {hover && hoverCls && !viewing && (
          <div className={styles.tip} style={{ transform: `translate3d(${hover.x}px, ${hover.y}px, 0)` }} aria-hidden="true">
            <b>{hover.seat}</b>
            <span>{hoverCls.name}, {positionName[seatPosition(hover.seat)]}</span>
            {hover.occupied ? (
              <em>Taken</em>
            ) : hover.held ? (
              <em>On hold by another traveller</em>
            ) : selected.includes(hover.seat) ? (
              <em>Yours, tap to release</em>
            ) : (
              <>
                <i style={{ color: TIER_COLORS[seatTierOf(hover.seat).id] }}>{seatTierOf(hover.seat).label}</i>
                <em>{inr(seatPrice(unitPrice, hover.seat))}</em>
                <small>{inr(classFare(unitPrice, hoverCls))} fare{seatFee(hover.seat) ? ` + ${inr(seatFee(hover.seat))} seat` : ''}</small>
              </>
            )}
          </div>
        )}

        {viewing && viewCls && (
          <>
            <p className={styles.viewHint}>Drag to look around. Scroll or pinch to zoom. Esc to go back.</p>
            <div className={styles.viewBar}>
              <button type="button" className={styles.back} onClick={back}>
                <ArrowLeft size={15} /> Back to cabin
              </button>
              <p>
                <b>Seat {viewing}</b> {viewCls.name}, {positionName[seatPosition(viewing)]}
              </p>
            </div>
          </>
        )}

        <div className={styles.zoom} role="group" aria-label="Zoom">
          <button type="button" onClick={() => apiRef.current?.zoom(1)} aria-label="Zoom in"><ZoomIn size={17} /></button>
          <button type="button" onClick={() => apiRef.current?.zoom(-1)} aria-label="Zoom out"><ZoomOut size={17} /></button>
        </div>

        <div className={styles.bottom}>
          <ul className={styles.legend} aria-label="Seat prices">
            {TIER_ORDER.map((id) => (
              <li key={id}>
                <i style={{ background: TIER_COLORS[id] }} />
                {SEAT_TIERS[id].label} <span>{TIER_FEES[id]}</span>
              </li>
            ))}
            <li><i style={{ background: '#ff9b3d' }} />Yours</li>
            <li><i style={{ background: '#5b4250' }} />On hold</li>
            <li><i className={styles.takenSwatch} />Taken</li>
          </ul>
          <ul className={styles.chips} aria-label="Your seats">
            {selected.map((s) => {
              const c = cabinClassOf(s);
              return (
                <li key={s} className={viewing === s ? styles.chipOn : ''}>
                  <span className={styles.chipSeat}>{s}</span>
                  <span className={styles.chipText}>
                    {c?.name}, {positionName[seatPosition(s)]}
                    <b>{inr(seatPrice(unitPrice, s))}</b>
                  </span>
                  <button type="button" onClick={() => (viewing === s ? back() : look(s))} aria-label={viewing === s ? 'Back to cabin' : `View from seat ${s}`}>
                    <Eye size={14} /> {viewing === s ? 'Cabin' : 'View'}
                  </button>
                  <button type="button" onClick={() => onToggle(s)} aria-label={`Release seat ${s}`}>
                    <X size={14} />
                  </button>
                </li>
              );
            })}
            {Array.from({ length: Math.max(0, remaining) }, (_, i) => (
              <li key={`empty-${i}`} className={styles.chipEmpty}>Seat {selected.length + i + 1}</li>
            ))}
          </ul>
        </div>
      </section>

      <aside ref={panelRef} className={styles.panel} aria-label="Checkout">
        {children}
        <label className={styles.list}>
          <span>Add a seat by number</span>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) onToggle(e.target.value);
            }}
          >
            <option value="">Choose a seat…</option>
            {CABIN.map((c) => (
              <optgroup key={c.id} label={c.name}>
                {Array.from({ length: c.lastRow - c.firstRow + 1 }, (_, i) => c.firstRow + i).flatMap((r) =>
                  c.letters
                    .map((l) => `${r}${l}`)
                    .filter((s) => !unavailable.has(s) && !selected.includes(s))
                    .map((s) => (
                      <option key={s} value={s}>{s}, {positionName[seatPosition(s)]}, {inr(seatPrice(unitPrice, s))}</option>
                    ))
                )}
              </optgroup>
            ))}
          </select>
        </label>
      </aside>
    </div>
  );
}
