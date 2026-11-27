import { useId } from 'react';

export function BrandMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="Book My Flight">
      <defs>
        <linearGradient id={`fin-${id}`} x1="0.1" y1="1" x2="0.9" y2="0">
          <stop offset="0" stopColor="#4c1d95" />
          <stop offset="0.55" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#ffb45e" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0d0a1f" />
      <path d="M17 52 L31 11 Q32.4 8 35.5 8 H45 Q48 8 47.2 11 L38 52 Z" fill={`url(#fin-${id})`} />
      <path d="M9 47 C 22 45, 37 37, 54 20" fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" />
      <circle cx="54" cy="20" r="4.4" fill="#ffd29b" />
    </svg>
  );
}
