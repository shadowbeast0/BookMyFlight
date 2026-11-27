'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Eye, Minus, Plane, Plus, X } from 'lucide-react';
import { CABIN, CabinClassId, cabinClassOf, seatPosition, seatPrice } from '@/lib/cabin';
import styles from './CabinSeatMap.module.css';

type HoverInfo = { seat: string; cls: CabinClassId; occupied: boolean; x: number; y: number } | null;
type CabinApi = {
  setOccupied: (list: string[]) => void;
  setSelected: (list: string[]) => void;
  focusClass: (id: CabinClassId | 'all') => void;
  viewSeat: (seat: string) => void;
  overview: () => void;
  setRunning: (v: boolean) => void;
  resize: () => void;
  dispose: () => void;
};

type Props = {
  unitPrice: number;
  occupied: string[];
  selected: string[];
  passengerCount: number;
  adults: number;
  kids: number;
  onAdults: (n: number) => void;
  onKids: (n: number) => void;
  onToggle: (seat: string) => void;
};

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const positionName = { window: 'Window', middle: 'Middle', aisle: 'Aisle' };

export function CabinSeatMap({ unitPrice, occupied, selected, passengerCount, adults, kids, onAdults, onKids, onToggle }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<CabinApi | null>(null);
  const toggleRef = useRef(onToggle);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<HoverInfo>(null);
  const [focus, setFocus] = useState<CabinClassId | 'all'>('all');
  const [viewing, setViewing] = useState<string | null>(null);

  toggleRef.current = onToggle;

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    const lite = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;
    import('@/lib/cabinScene')
      .then(({ createCabinScene }) => {
        if (disposed || !canvasRef.current) return;
        let api: CabinApi;
        try {
          api = (createCabinScene as (c: HTMLCanvasElement, o: unknown) => CabinApi)(canvasRef.current, {
            lite,
            layout: CABIN,
            onHover: (h: HoverInfo) => setHover(h),
            onToggle: (seat: string) => toggleRef.current(seat),
          });
        } catch {
          setFailed(true);
          return;
        }
        apiRef.current = api;
        setReady(true);
        const ro = new ResizeObserver(() => api.resize());
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
      .catch(() => setFailed(true));
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    apiRef.current?.setOccupied(occupied);
  }, [occupied, ready]);

  useEffect(() => {
    apiRef.current?.setSelected(selected);
  }, [selected, ready]);

  useEffect(() => {
    if (viewing && !selected.includes(viewing)) {
      apiRef.current?.overview();
      setViewing(null);
    }
  }, [selected, viewing]);

  const taken = useMemo(() => new Set(occupied), [occupied]);

  const freeByClass = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of CABIN) {
      let n = 0;
      for (let r = c.firstRow; r <= c.lastRow; r++) for (const l of c.letters) if (!taken.has(`${r}${l}`)) n++;
      out[c.id] = n;
    }
    return out;
  }, [taken]);

  const pickFocus = (id: CabinClassId | 'all') => {
    setFocus(id);
    if (viewing) {
      setViewing(null);
      apiRef.current?.overview();
      window.setTimeout(() => apiRef.current?.focusClass(id), 1900);
    } else apiRef.current?.focusClass(id);
  };

  const look = (seat: string) => {
    setViewing(seat);
    setHover(null);
    apiRef.current?.viewSeat(seat);
  };

  const back = () => {
    setViewing(null);
    apiRef.current?.overview();
  };

  const remaining = passengerCount - selected.length;
  const hoverCls = hover ? cabinClassOf(hover.seat) : null;
  const viewCls = viewing ? cabinClassOf(viewing) : null;

  return (
    <section className={styles.wrap} aria-labelledby="seat-title">
      <div ref={stageRef} className={`${styles.stage} ${viewing ? styles.inside : ''}`}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        {!ready && !failed && (
          <div className={styles.loader} aria-hidden="true">
            <Plane size={16} /> Opening the cabin…
          </div>
        )}
        {failed && <div className={styles.fallback}>3D view isn’t available on this device. Pick seats from the list below.</div>}

        <header className={styles.top}>
          <div>
            <h2 id="seat-title" className={styles.title}>Choose your seats</h2>
            <p className={styles.hint}>
              {viewing
                ? 'Looking out from your seat. Move the cursor to look around.'
                : remaining > 0
                ? `Tap ${remaining} more seat${remaining > 1 ? 's' : ''} inside the cabin. Drag to turn the aircraft.`
                : 'All seats picked. Tap a chosen seat to swap it.'}
            </p>
          </div>
          <div className={styles.pax}>
            <span>Adults</span>
            <button type="button" onClick={() => onAdults(Math.max(1, adults - 1))} aria-label="Fewer adults"><Minus size={13} /></button>
            <b>{adults}</b>
            <button type="button" onClick={() => onAdults(Math.min(9, adults + 1))} aria-label="More adults"><Plus size={13} /></button>
            <span>Children</span>
            <button type="button" onClick={() => onKids(Math.max(0, kids - 1))} aria-label="Fewer children"><Minus size={13} /></button>
            <b>{kids}</b>
            <button type="button" onClick={() => onKids(Math.min(9, kids + 1))} aria-label="More children"><Plus size={13} /></button>
          </div>
        </header>

        <div className={styles.classes} role="tablist" aria-label="Cabin class">
          <button type="button" role="tab" aria-selected={focus === 'all'} className={styles.cls} onClick={() => pickFocus('all')}>
            <span className={styles.clsName}>Whole cabin</span>
            <span className={styles.clsMeta}>{freeByClass.business + freeByClass.premium + freeByClass.economy} seats free</span>
          </button>
          {CABIN.map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={focus === c.id} className={styles.cls} data-cls={c.id} onClick={() => pickFocus(c.id)}>
              <span className={styles.clsName}><i />{c.name}</span>
              <span className={styles.clsPrice}>{inr(seatPrice(unitPrice, `${c.firstRow}${c.letters[0]}`))}<small> / seat</small></span>
              <span className={styles.clsMeta}>Rows {c.firstRow}–{c.lastRow} · {freeByClass[c.id]} free</span>
              <span className={styles.clsPerks}>{c.perks}</span>
            </button>
          ))}
        </div>

        {hover && hoverCls && !viewing && (
          <div className={styles.tip} style={{ transform: `translate3d(${hover.x}px, ${hover.y}px, 0)` }} aria-hidden="true">
            <b>{hover.seat}</b>
            <span>{hoverCls.name} · {positionName[seatPosition(hover.seat)]}</span>
            <em>{hover.occupied ? 'Taken' : selected.includes(hover.seat) ? 'Yours · tap to release' : inr(seatPrice(unitPrice, hover.seat))}</em>
          </div>
        )}

        {viewing && viewCls && (
          <div className={styles.viewBar}>
            <button type="button" className={styles.back} onClick={back}>
              <ArrowLeft size={15} /> Back to cabin
            </button>
            <p>
              <b>Seat {viewing}</b> {viewCls.name} · {positionName[seatPosition(viewing)]} seat
            </p>
          </div>
        )}

        <div className={styles.bottom}>
          <ul className={styles.legend} aria-label="Legend">
            {CABIN.map((c) => (
              <li key={c.id} data-cls={c.id}><i />{c.name}</li>
            ))}
            <li data-cls="picked"><i />Yours</li>
            <li data-cls="taken"><i />Taken</li>
          </ul>
          <ul className={styles.chips} aria-label="Your seats">
            {selected.map((s) => {
              const c = cabinClassOf(s);
              return (
                <li key={s} className={viewing === s ? styles.chipOn : ''}>
                  <span className={styles.chipSeat}>{s}</span>
                  <span className={styles.chipText}>
                    {c?.name} · {positionName[seatPosition(s)]}
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
      </div>

      <label className={styles.list}>
        <span>Or add a seat by number</span>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) onToggle(e.target.value);
          }}
        >
          <option value="">Choose a seat…</option>
          {CABIN.map((c) => (
            <optgroup key={c.id} label={`${c.name} · ${inr(seatPrice(unitPrice, `${c.firstRow}${c.letters[0]}`))}`}>
              {Array.from({ length: c.lastRow - c.firstRow + 1 }, (_, i) => c.firstRow + i).flatMap((r) =>
                c.letters
                  .map((l) => `${r}${l}`)
                  .filter((s) => !taken.has(s) && !selected.includes(s))
                  .map((s) => (
                    <option key={s} value={s}>{s} · {positionName[seatPosition(s)]}</option>
                  ))
              )}
            </optgroup>
          ))}
        </select>
      </label>
    </section>
  );
}
