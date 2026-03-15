'use client';

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DealCountdown } from '@/components/DealCountdown';
import { FlightDeal } from '@/lib/api';

type Props = {
  deal: FlightDeal;
  animationDelayMs?: number;
  onConfirmBooking: (dealId: string) => void;
  bookingInProgress?: boolean;
};

const formatDuration = (mins?: number) => {
  if (!mins) return 'Direct';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export function BoardingPassDealCard({
  deal,
  animationDelayMs = 0,
  onConfirmBooking,
  bookingInProgress = false,
}: Props) {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const prefersReducedMotion = useReducedMotion();

  const originalPrice = useMemo(() => {
    if (!deal.discount) return deal.cost;
    return Math.round(deal.cost / (1 - deal.discount / 100));
  }, [deal.cost, deal.discount]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: animationDelayMs / 1000 }}
      whileHover={prefersReducedMotion ? undefined : { y: -4 }}
      className="boarding-pass"
      onMouseMove={(e) => {
        if (prefersReducedMotion) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setPointer({ x, y });
      }}
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      <div className="boarding-flip-inner">
        <div className="boarding-face boarding-face-front">
          <div
            className="boarding-glare"
            style={{
              background: `radial-gradient(circle at ${pointer.x}% ${pointer.y}%, rgba(255,255,255,0.28), transparent 42%)`,
            }}
          />

          <div className="boarding-main">
            <div className="boarding-route-row">
              <p className="boarding-city" title={deal.departureCity}>{deal.departureCity}</p>
              <span className="boarding-route-line">✈</span>
              <p className="boarding-city" title={deal.arrivalCity}>{deal.arrivalCity}</p>
            </div>

            <div className="boarding-meta-row">
              <span className="boarding-chip">{formatDuration(deal.durationMinutes)}</span>
              <DealCountdown expiresAt={deal.expiresAt} compact />
            </div>

            <div className="boarding-price-row">
              <span className="boarding-price">₹{deal.cost.toLocaleString('en-IN')}</span>
              {deal.discount ? (
                <span className="boarding-discount">
                  <span className="line-through opacity-60">₹{originalPrice.toLocaleString('en-IN')}</span>
                  <span>{deal.discount}% OFF</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="boarding-face boarding-face-back">
          <div className="boarding-back-inner">
            <p className="boarding-back-title">Ready To Fly?</p>
            <Button
              className={`boarding-book-now ${bookingInProgress ? 'deal-booking-pulse' : ''}`}
              onClick={() => onConfirmBooking(deal.id)}
              disabled={!deal.isActive || bookingInProgress}
            >
              {bookingInProgress ? 'Booking...' : 'Book Now'}
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
