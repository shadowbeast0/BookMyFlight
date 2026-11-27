'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Plane } from 'lucide-react';
import { apiClient, FlightDeal } from '@/lib/api';
import styles from './FlightShowcase.module.css';

type Hotspot = { id: string; x: number; y: number; on: boolean };
type SceneApi = {
  setProgress: (p: number) => void;
  setPointer: (x: number, y: number) => void;
  setRunning: (v: boolean) => void;
  resize: () => void;
  dispose: () => void;
};

const ACTS = [
  { from: 0, to: 0.16, rail: 'Board', top: 'Scroll to', bottom: 'board.', sub: 'Live fares, seats that stay locked, and refunds that actually refund.' },
  { from: 0.16, to: 0.4, rail: 'Engine', top: 'Spool up.', bottom: 'Prices down.', sub: 'A live deals engine with up to 30% off limited-time fares across India.' },
  { from: 0.4, to: 0.58, rail: 'Cabin', top: 'Window seat.', bottom: 'Locked in.', sub: 'Two people tap the same seat, one of them gets it. Every time.' },
  { from: 0.58, to: 0.72, rail: 'Wing', top: 'Wings level.', bottom: 'Wallet full.', sub: 'Pay from a built-in wallet and top it up in seconds.' },
  { from: 0.72, to: 0.86, rail: 'Tail', top: 'Change of plans?', bottom: 'Covered.', sub: 'Full refund 10+ days before departure, 50% within 10 days.' },
  { from: 0.86, to: 1.01, rail: 'Takeoff', top: 'Wheels up.', bottom: 'Your move.', sub: 'Pick a route below or grab one of today’s best deals.' },
];

const LABELS: Record<string, { title: string; body: string }> = {
  engine: { title: 'Deals engine', body: 'Up to 30% off, live' },
  seat: { title: 'Your seat', body: 'Locked while you pay' },
  wing: { title: 'Wallet', body: 'Top up, pay in one tap' },
  tail: { title: 'Refunds', body: 'Full refund 10+ days out' },
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function FlightShowcase({ deals }: { deals: FlightDeal[] }) {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sceneRef = useRef<SceneApi | null>(null);
  const [act, setAct] = useState(0);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    apiClient.getCities().then((c) => setCities([...c].sort())).catch(() => {});
  }, []);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    const lite = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;
    import('@/lib/planeScene')
      .then(({ createPlaneScene }) => {
        if (disposed || !canvasRef.current) return;
        let api: SceneApi;
        try {
          api = (createPlaneScene as (c: HTMLCanvasElement, o: unknown) => SceneApi)(canvasRef.current, {
            lite,
            onHotspots: (list: Hotspot[]) => {
              for (const h of list) {
                const el = hotRefs.current[h.id];
                if (!el) continue;
                el.style.transform = `translate3d(${h.x}px, ${h.y}px, 0)`;
                el.dataset.on = h.on ? '1' : '0';
              }
            },
          });
        } catch {
          setFailed(true);
          return;
        }
        sceneRef.current = api;
        setReady(true);
        const onResize = () => api.resize();
        const onMove = (e: PointerEvent) => api.setPointer(e.clientX / window.innerWidth - 0.5, 0.5 - e.clientY / window.innerHeight);
        window.addEventListener('resize', onResize);
        window.addEventListener('pointermove', onMove, { passive: true });
        const io = new IntersectionObserver(([en]) => api.setRunning(en.isIntersecting));
        if (sectionRef.current) io.observe(sectionRef.current);
        cleanup = () => {
          window.removeEventListener('resize', onResize);
          window.removeEventListener('pointermove', onMove);
          io.disconnect();
          api.dispose();
        };
      })
      .catch(() => setFailed(true));
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = sectionRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? clamp(-r.top / total) : 0;
      sceneRef.current?.setProgress(p);
      setProgress(p);
      const idx = ACTS.findIndex((a) => p >= a.from && p < a.to);
      setAct(idx < 0 ? ACTS.length - 1 : idx);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const topDeals = useMemo(
    () =>
      deals
        .filter((d) => d.isActive && (d.discount ?? 0) > 0)
        .sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0))
        .slice(0, 3),
    [deals]
  );

  const jump = (p: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (el.offsetHeight - window.innerHeight) * p, behavior: 'smooth' });
  };

  const search = () => {
    if (!from || !to || from === to) return;
    router.push(`/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  };

  const booking = act === ACTS.length - 1;

  return (
    <section ref={sectionRef} className={styles.section} aria-labelledby="showcase-title">
      <div className={styles.stage}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <div className={`${styles.loader} ${ready || failed ? styles.loaderOut : ''}`} aria-hidden="true">
          <Plane size={18} /> Preparing your aircraft…
        </div>
        {failed && <div className={styles.fallback} aria-hidden="true" />}
        <div className={styles.vignette} aria-hidden="true" />

        {Object.entries(LABELS).map(([id, l]) => (
          <div key={id} ref={(el) => { hotRefs.current[id] = el; }} className={styles.hot} data-on="0" aria-hidden="true">
            <span className={styles.dot} />
            <span className={styles.tag}>
              <b>{l.title}</b>
              {l.body}
            </span>
          </div>
        ))}

        <h1 id="showcase-title" className={styles.srOnly}>Book My Flight: discounted flights across India</h1>
        <div className={`${styles.copy} ${booking ? styles.copyBooking : ''}`}>
          {ACTS.map((a, i) => (
            <div key={a.rail} className={`${styles.act} ${i === act ? styles.actOn : ''}`} aria-hidden={i !== act}>
              <p className={styles.kicker}>{String(i + 1).padStart(2, '0')} / {a.rail}</p>
              <p className={styles.headline}>
                <span>{a.top}</span>
                <span className={styles.dim}>{a.bottom}</span>
              </p>
              <p className={styles.sub}>{a.sub}</p>
            </div>
          ))}
          <p className={styles.cue} style={{ opacity: 1 - clamp(progress / 0.05) }}>
            <span /> Scroll
          </p>
        </div>

        <nav className={styles.rail} aria-label="Aircraft tour">
          {ACTS.map((a, i) => (
            <button key={a.rail} type="button" onClick={() => jump(a.from + 0.005)} aria-current={i === act ? 'step' : undefined}>
              <span>{a.rail}</span>
              <i />
            </button>
          ))}
          <div className={styles.railTrack}><div style={{ transform: `scaleY(${progress})` }} /></div>
        </nav>

        <button type="button" className={`${styles.bookCta} ${booking ? styles.hide : ''}`} onClick={() => jump(0.93)}>
          <Plane size={15} /> Book a flight
        </button>

        <aside className={`${styles.panel} ${booking ? styles.panelOn : ''}`} aria-label="Book your flight" aria-hidden={!booking}>
          <p className={styles.panelKicker}>Book your flight</p>
          <div className={styles.form}>
            <label>
              <span>From</span>
              <select value={from} onChange={(e) => setFrom(e.target.value)} name="from" tabIndex={booking ? 0 : -1}>
                <option value="">Choose a city…</option>
                {cities.map((c) => (
                  <option key={c} value={c} disabled={c === to}>{c}</option>
                ))}
              </select>
            </label>
            <button type="button" className={styles.swap} onClick={() => { setFrom(to); setTo(from); }} aria-label="Swap cities" tabIndex={booking ? 0 : -1}>
              <ArrowLeftRight size={15} />
            </button>
            <label>
              <span>To</span>
              <select value={to} onChange={(e) => setTo(e.target.value)} name="to" tabIndex={booking ? 0 : -1}>
                <option value="">Choose a city…</option>
                {cities.map((c) => (
                  <option key={c} value={c} disabled={c === from}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <p className={styles.dealsHead}>Or take today’s best fares</p>
          <ul className={styles.deals}>
            {topDeals.length === 0 && <li className={styles.note}>Loading deals…</li>}
            {topDeals.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => router.push(`/booking?id=${d.id}`)} tabIndex={booking ? 0 : -1}>
                  <span className={styles.route}>{d.departureCity}<Plane size={11} />{d.arrivalCity}</span>
                  <span className={styles.price}>₹{d.cost.toLocaleString('en-IN')}<em>{d.discount}% off</em></span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className={styles.go} onClick={search} disabled={!from || !to || from === to} tabIndex={booking ? 0 : -1}>
            Search flights
          </button>
        </aside>
      </div>
    </section>
  );
}
