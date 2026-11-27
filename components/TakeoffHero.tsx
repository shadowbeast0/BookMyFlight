'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Plane } from 'lucide-react';
import { apiClient, FlightDeal } from '@/lib/api';
import styles from './TakeoffHero.module.css';

const SHOTS = {
  gate: 'https://images.unsplash.com/photo-1648763312494-4af2b2eb1433',
  climb: 'https://images.unsplash.com/photo-1539612793508-4539a972242b',
  cruise: 'https://images.unsplash.com/photo-1770740738717-94905d923dfe',
};

const srcSet = (url: string) =>
  [960, 1600, 2400].map((w) => `${url}?w=${w}&q=78&auto=format&fit=crop ${w}w`).join(', ');

const ACTS = [
  { top: 'Scroll to', bottom: 'take off.', sub: 'Live fares, seats that stay locked, and refunds that actually refund.' },
  { top: 'Wheels up.', bottom: 'Fares down.', sub: 'Up to 30% off on limited-time deals across India.' },
  { top: 'Window seat.', bottom: 'Locked in.', sub: 'Two people tap the same seat, one of them gets it. Every time.' },
];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const range = (p: number, a: number, b: number) => clamp((p - a) / (b - a));

export function TakeoffHero({ deals }: { deals: FlightDeal[] }) {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);
  const [cities, setCities] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tab, setTab] = useState<'search' | 'deals'>('search');
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    apiClient.getCities().then((c) => setCities([...c].sort())).catch(() => {});
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = sectionRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      setP(total > 0 ? clamp(-r.top / total) : 0);
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

  const wipe = range(p, 0.14, 0.42);
  const clouds = range(p, 0.5, 0.78);
  const cruise = range(p, 0.62, 0.8);
  const act = p < 0.3 ? 0 : p < 0.66 ? 1 : 2;
  const altitude = Math.round(Math.pow(range(p, 0.1, 0.9), 1.6) * 35000);
  const speed = Math.round(range(p, 0.05, 0.6) * 160 + range(p, 0.6, 1) * 320);

  const search = () => {
    if (!from || !to || from === to) return;
    router.push(`/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <section ref={sectionRef} className={styles.section} aria-labelledby="takeoff-title">
      <div className={styles.stage}>
        <div className={styles.frame} style={{ transform: `scale(${1.08 - p * 0.08})` }}>
          <img
            className={styles.shot}
            src={`${SHOTS.gate}?w=1600&q=78&auto=format&fit=crop`}
            srcSet={srcSet(SHOTS.gate)}
            sizes="100vw"
            alt=""
            fetchPriority="high"
            style={{ transform: `scale(${1 + range(p, 0, 0.42) * 0.12})` }}
          />
          <img
            className={styles.shot}
            src={`${SHOTS.climb}?w=1600&q=78&auto=format&fit=crop`}
            srcSet={srcSet(SHOTS.climb)}
            sizes="100vw"
            alt=""
            style={{
              clipPath: `inset(0 0 0 ${(1 - wipe) * 100}%)`,
              transform: `scale(${1.12 - wipe * 0.08 + clouds * 0.25})`,
            }}
          />
          <img
            className={styles.shot}
            src={`${SHOTS.cruise}?w=1600&q=78&auto=format&fit=crop`}
            srcSet={srcSet(SHOTS.cruise)}
            sizes="100vw"
            alt=""
            loading="lazy"
            style={{ opacity: cruise, transform: `scale(${1.2 - cruise * 0.2 + range(p, 0.8, 1) * 0.05})` }}
          />
          <div
            className={styles.seam}
            aria-hidden="true"
            style={{ left: `${(1 - wipe) * 100}%`, opacity: wipe > 0.001 && wipe < 0.999 ? 1 : 0 }}
          />
          <div className={styles.clouds} aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const local = clamp(clouds * 1.4 - i * 0.08);
              return (
                <span
                  key={i}
                  style={{
                    left: `${[12, 62, 30, 78, 44, 6][i]}%`,
                    top: `${[30, 22, 58, 52, 38, 64][i]}%`,
                    opacity: local > 0 && local < 1 ? Math.sin(local * Math.PI) * 0.9 : 0,
                    transform: `translate(-50%, -50%) scale(${0.4 + local * 4.5})`,
                  }}
                />
              );
            })}
          </div>
          <div className={styles.shade} aria-hidden="true" />
        </div>

        <div className={styles.hud} aria-hidden="true">
          <div>
            <span>Altitude</span>
            <strong>{altitude.toLocaleString('en-IN')} ft</strong>
          </div>
          <div>
            <span>Ground speed</span>
            <strong>{speed} kt</strong>
          </div>
          <ol className={styles.steps}>
            {['Gate', 'Climb', 'Cruise'].map((s, i) => (
              <li key={s} className={i === act ? styles.on : ''}>
                <i />
                {s}
              </li>
            ))}
          </ol>
        </div>

        <div className={styles.copy}>
          <h1 id="takeoff-title" className={styles.srOnly}>
            Book My Flight: discounted flights across India
          </h1>
          {ACTS.map((a, i) => (
            <div key={a.top} className={`${styles.act} ${i === act ? styles.actOn : ''}`} aria-hidden={i !== act}>
              <p className={styles.headline}>
                <span>{a.top}</span>
                <span className={styles.dim}>{a.bottom}</span>
              </p>
              <p className={styles.sub}>{a.sub}</p>
            </div>
          ))}
          {!reduced && (
            <p className={styles.cue} style={{ opacity: 1 - range(p, 0, 0.08) }}>
              <span /> Scroll
            </p>
          )}
        </div>

        <aside className={styles.panel} aria-label="Book your flight">
          <div className={styles.panelHead}>
            <Plane size={16} />
            <span>Book your flight</span>
          </div>
          <div className={styles.tabs} role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'search'} onClick={() => setTab('search')}>
              Search
            </button>
            <button type="button" role="tab" aria-selected={tab === 'deals'} onClick={() => setTab('deals')}>
              Hot deals
            </button>
          </div>
          {tab === 'search' ? (
            <div className={styles.form}>
              <label>
                <span>From</span>
                <select value={from} onChange={(e) => setFrom(e.target.value)} name="from">
                  <option value="">Choose a city…</option>
                  {cities.map((c) => (
                    <option key={c} value={c} disabled={c === to}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className={styles.swap} onClick={swap} aria-label="Swap cities">
                <ArrowLeftRight size={15} />
              </button>
              <label>
                <span>To</span>
                <select value={to} onChange={(e) => setTo(e.target.value)} name="to">
                  <option value="">Choose a city…</option>
                  {cities.map((c) => (
                    <option key={c} value={c} disabled={c === from}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className={styles.go} onClick={search} disabled={!from || !to || from === to}>
                Search flights
              </button>
              <p className={styles.note}>Direct and one-stop routes, with seats held while you pay.</p>
            </div>
          ) : (
            <ul className={styles.deals}>
              {topDeals.length === 0 && <li className={styles.note}>Deals are loading…</li>}
              {topDeals.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => router.push(`/booking?id=${d.id}`)}>
                    <span className={styles.route}>
                      {d.departureCity} <Plane size={12} /> {d.arrivalCity}
                    </span>
                    <span className={styles.price}>
                      ₹{d.cost.toLocaleString('en-IN')}
                      <em>{d.discount}% off</em>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <p className={styles.credit}>Photos: Unsplash</p>
      </div>
    </section>
  );
}
