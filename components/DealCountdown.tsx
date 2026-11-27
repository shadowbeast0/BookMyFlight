/**
 * DealCountdown Component
 * Displays real-time countdown timer showing deal expiration
 * Demonstrates urgency and Strategy Pattern for time-based pricing
 */

'use client';

import { useEffect, useState } from 'react';

interface DealCountdownProps {
  expiresAt: string;
  compact?: boolean;
}

export function DealCountdown({ expiresAt, compact = false }: DealCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const expireDate = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      const difference = expireDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        expired: false,
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  if (timeLeft.expired) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm font-medium text-destructive">Fare expired</span>
      </div>
    );
  }

  if (compact) {
    return (
      <span className="text-xs tabular-nums text-white/55">
        Ends in{' '}
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
        {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </span>
    );
  }

  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-white/55">Fare ends in</span>
      <span className="text-lg font-semibold tabular-nums text-[#ffd29b]">
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
        {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
