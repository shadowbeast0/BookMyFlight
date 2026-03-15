'use client';

import { useEffect, useRef, useState } from 'react';

const LEFT_PATH_D =
  'M 112 24 C 18 98, 24 190, 122 236 C 214 276, 216 174, 122 162 C 24 148, 18 294, 124 338 C 218 376, 220 492, 118 528 C 22 560, 18 456, 120 432 C 214 410, 220 620, 106 676 C 8 726, 10 842, 122 884 C 222 922, 218 1024, 104 1058 C 12 1086, 16 1194, 118 1234';

const RIGHT_PATH_D =
  'M 104 24 C 206 102, 202 196, 96 236 C 4 270, 2 170, 96 160 C 198 148, 204 294, 98 340 C 4 380, 2 494, 106 530 C 204 564, 206 458, 104 434 C 10 412, 2 622, 116 678 C 212 726, 210 846, 96 886 C -2 922, 0 1026, 114 1060 C 206 1088, 204 1196, 100 1234';

const NODE_STOPS = [0.06, 0.14, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.93];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function FlightPathJourney({ containerId = 'flights' }: { containerId?: string }) {
  const leftPathRef = useRef<SVGPathElement | null>(null);
  const rightPathRef = useRef<SVGPathElement | null>(null);
  const [leftLength, setLeftLength] = useState(1);
  const [rightLength, setRightLength] = useState(1);
  const [progress, setProgress] = useState(0);
  const [mousePull, setMousePull] = useState(0);
  const [leftPlane, setLeftPlane] = useState({ x: 110, y: 40, angle: 90 });
  const [rightPlane, setRightPlane] = useState({ x: 110, y: 40, angle: 90 });
  const targetProgressRef = useRef(0);
  const progressRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (leftPathRef.current) {
      setLeftLength(leftPathRef.current.getTotalLength());
    }
    if (rightPathRef.current) {
      setRightLength(rightPathRef.current.getTotalLength());
    }
  }, []);

  useEffect(() => {
    let raf = 0;

    const animateProgress = () => {
      let isDone = false;
      setProgress((prev) => {
        const target = targetProgressRef.current;
        const diff = target - prev;
        if (Math.abs(diff) < 0.001) {
          isDone = true;
          return target;
        }
        return prev + diff * 0.24;
      });

      if (isDone) {
        progressRafRef.current = null;
      } else {
        progressRafRef.current = requestAnimationFrame(animateProgress);
      }
    };

    const updateProgress = () => {
      const section = document.getElementById(containerId);
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Track progress using the viewport center against the section bounds so
      // plane movement stays synced even during fast scrolls.
      const sectionTopAbsolute = window.scrollY + rect.top;
      const sectionStart = sectionTopAbsolute - viewportHeight * 0.08;
      const sectionEnd = sectionTopAbsolute + rect.height - viewportHeight * 0.92;
      const denom = Math.max(sectionEnd - sectionStart, 1);
      const raw = (window.scrollY - sectionStart) / denom;

      let nextProgress = clamp(raw, 0, 1);
      if (rect.bottom <= viewportHeight * 0.22) {
        nextProgress = 1;
      }
      if (rect.top >= viewportHeight * 0.9) {
        nextProgress = 0;
      }

      targetProgressRef.current = nextProgress;
      if (progressRafRef.current === null) {
        progressRafRef.current = requestAnimationFrame(animateProgress);
      }
    };

    const onScrollOrResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      cancelAnimationFrame(raf);
      if (progressRafRef.current !== null) {
        cancelAnimationFrame(progressRafRef.current);
      }
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, []);

  useEffect(() => {
    if (!leftPathRef.current || leftLength <= 1) return;

    const currentLength = clamp(progress * leftLength, 0, leftLength);
    const current = leftPathRef.current.getPointAtLength(currentLength);
    const ahead = leftPathRef.current.getPointAtLength(clamp(currentLength + 1.5, 0, leftLength));
    const angle = (Math.atan2(ahead.y - current.y, ahead.x - current.x) * 180) / Math.PI;

    setLeftPlane({ x: current.x, y: current.y, angle });
  }, [progress, leftLength]);

  useEffect(() => {
    if (!rightPathRef.current || rightLength <= 1) return;

    const currentLength = clamp(progress * rightLength, 0, rightLength);
    const current = rightPathRef.current.getPointAtLength(currentLength);
    const ahead = rightPathRef.current.getPointAtLength(clamp(currentLength + 1.5, 0, rightLength));
    const angle = (Math.atan2(ahead.y - current.y, ahead.x - current.x) * 180) / Math.PI;

    setRightPlane({ x: current.x, y: current.y, angle });
  }, [progress, rightLength]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const normalized = event.clientX / window.innerWidth;
      setMousePull(clamp((normalized - 0.5) * 26, -14, 14));
    };

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  const leftProgressLength = clamp(progress * leftLength, 0, leftLength);
  const rightProgressLength = clamp(progress * rightLength, 0, rightLength);
  const textFillWidth = clamp(progress * 100, 0, 100);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block" aria-hidden="true">
      <div className="flight-aurora flight-aurora-a" />
      <div className="flight-aurora flight-aurora-b" />

      <div className="flight-side-rail left-0">
        <svg viewBox="0 0 220 1280" className="flight-side-svg">
          <defs>
            <linearGradient id="sideBaseGradLeft" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(196,181,253,0.35)" />
              <stop offset="100%" stopColor="rgba(245,208,254,0.16)" />
            </linearGradient>
            <linearGradient id="sideGlowGradLeft" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#d8b4fe" />
              <stop offset="100%" stopColor="#facc15" />
            </linearGradient>
          </defs>

          <path d={LEFT_PATH_D} fill="none" stroke="url(#sideBaseGradLeft)" strokeWidth="4.5" opacity="0.62" />
          <path
            d={LEFT_PATH_D}
            fill="none"
            stroke="url(#sideGlowGradLeft)"
            strokeWidth="11"
            strokeDasharray={`${leftProgressLength} ${Math.max(leftLength - leftProgressLength, 1)}`}
            className="flight-glow-blur"
            opacity="0.6"
          />
          <path
            ref={leftPathRef}
            d={LEFT_PATH_D}
            fill="none"
            stroke="url(#sideGlowGradLeft)"
            strokeWidth="5.4"
            strokeDasharray={`${leftProgressLength} ${Math.max(leftLength - leftProgressLength, 1)}`}
          />

          {NODE_STOPS.map((stop) => {
            const point =
              leftPathRef.current?.getPointAtLength(clamp(stop * leftLength, 0, leftLength)) ?? { x: 0, y: 0 };
            const active = progress >= stop;
            return (
              <g key={`left-${stop}`}>
                <circle cx={point.x} cy={point.y} r="16" fill={active ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.06)'} />
                <circle cx={point.x} cy={point.y} r="6" fill={active ? '#facc15' : '#ddd6fe'} className={active ? 'flight-node-active' : ''} />
              </g>
            );
          })}

          <g transform={`translate(${leftPlane.x + mousePull}, ${leftPlane.y}) rotate(${leftPlane.angle})`}>
            <circle cx="-15" cy="0" r="2.6" className="flight-particle" style={{ animationDelay: '0ms' }} />
            <circle cx="-22" cy="0" r="2" className="flight-particle" style={{ animationDelay: '180ms' }} />
            <circle cx="-29" cy="0" r="1.5" className="flight-particle" style={{ animationDelay: '320ms' }} />
            <path d="M-10 4 L12 0 L-10 -4 L-4 0 Z" fill="#ffffff" stroke="#c4b5fd" strokeWidth="1.3" className="flight-plane-pulse" />
            <path d="M-12 0 L-30 0" stroke="rgba(250,204,21,0.7)" strokeWidth="2.2" strokeDasharray="2 3" className="flight-trail" />
          </g>
        </svg>
      </div>

      <div className="flight-side-rail right-0">
        <svg viewBox="0 0 220 1280" className="flight-side-svg">
          <defs>
            <linearGradient id="sideBaseGradRight" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(196,181,253,0.35)" />
              <stop offset="100%" stopColor="rgba(245,208,254,0.16)" />
            </linearGradient>
            <linearGradient id="sideGlowGradRight" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#d8b4fe" />
              <stop offset="100%" stopColor="#facc15" />
            </linearGradient>
          </defs>

          <path d={RIGHT_PATH_D} fill="none" stroke="url(#sideBaseGradRight)" strokeWidth="4.5" opacity="0.62" />
          <path
            d={RIGHT_PATH_D}
            fill="none"
            stroke="url(#sideGlowGradRight)"
            strokeWidth="11"
            strokeDasharray={`${rightProgressLength} ${Math.max(rightLength - rightProgressLength, 1)}`}
            className="flight-glow-blur"
            opacity="0.6"
          />
          <path
            ref={rightPathRef}
            d={RIGHT_PATH_D}
            fill="none"
            stroke="url(#sideGlowGradRight)"
            strokeWidth="5.4"
            strokeDasharray={`${rightProgressLength} ${Math.max(rightLength - rightProgressLength, 1)}`}
          />

          {NODE_STOPS.map((stop) => {
            const point =
              rightPathRef.current?.getPointAtLength(clamp(stop * rightLength, 0, rightLength)) ?? { x: 0, y: 0 };
            const active = progress >= stop;
            return (
              <g key={`right-${stop}`}>
                <circle cx={point.x} cy={point.y} r="16" fill={active ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.06)'} />
                <circle cx={point.x} cy={point.y} r="6" fill={active ? '#facc15' : '#ddd6fe'} className={active ? 'flight-node-active' : ''} />
              </g>
            );
          })}

          <g transform={`translate(${rightPlane.x - mousePull}, ${rightPlane.y}) rotate(${rightPlane.angle})`}>
            <circle cx="-15" cy="0" r="2.6" className="flight-particle" style={{ animationDelay: '0ms' }} />
            <circle cx="-22" cy="0" r="2" className="flight-particle" style={{ animationDelay: '180ms' }} />
            <circle cx="-29" cy="0" r="1.5" className="flight-particle" style={{ animationDelay: '320ms' }} />
            <path d="M-10 4 L12 0 L-10 -4 L-4 0 Z" fill="#ffffff" stroke="#c4b5fd" strokeWidth="1.3" className="flight-plane-pulse" />
            <path d="M-12 0 L-30 0" stroke="rgba(250,204,21,0.7)" strokeWidth="2.2" strokeDasharray="2 3" className="flight-trail" />
          </g>

        </svg>
      </div>

      <div className="flight-tagline-wrap right-4 xl:right-8" style={{ bottom: '38px' }}>
        <span
          className="flight-tagline-outline"
          style={{ WebkitTextStroke: '1.2px rgba(233,213,255,0.92)' }}
        >
          Fly Better
        </span>
        <span
          className="flight-tagline-fill"
          style={{ width: `${textFillWidth}%` }}
        >
          Fly Better
        </span>
      </div>

    </div>
  );
}
