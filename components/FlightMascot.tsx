'use client';

type MascotSize = 'sm' | 'md' | 'lg';

interface FlightMascotProps {
  size?: MascotSize;
  className?: string;
}

const sizeMap: Record<MascotSize, string> = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
};

export function FlightMascot({ size = 'md', className = '' }: FlightMascotProps) {
  return (
    <div className={`relative ${sizeMap[size]} mascot-float ${className}`}>
      <div className="absolute inset-0 rounded-full bg-cyan-400/30 blur-xl animate-pulse-glow" />
      <svg
        viewBox="0 0 120 120"
        className="relative w-full h-full drop-shadow-[0_0_20px_rgba(34,211,238,0.45)]"
        fill="none"
      >
        <defs>
          <linearGradient id="mascotCore" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>
        </defs>

        <circle cx="60" cy="60" r="53" stroke="url(#mascotCore)" strokeWidth="4" opacity="0.75" />
        <path
          d="M20 60L44 48L60 32L76 48L100 60L72 64L60 88L48 64L20 60Z"
          fill="url(#mascotCore)"
          opacity="0.96"
        />
        <circle cx="51" cy="57" r="3" fill="#082f49" />
        <circle cx="69" cy="57" r="3" fill="#082f49" />
        <path d="M50 70C53 74 67 74 70 70" stroke="#082f49" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
