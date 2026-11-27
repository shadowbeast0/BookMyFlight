'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Plane } from 'lucide-react';
import { DealCountdown } from '@/components/DealCountdown';
import { FlightDeal } from '@/lib/api';
import styles from './BoardingPassDealCard.module.css';

type Props = {
  deal: FlightDeal;
  animationDelayMs?: number;
  onConfirmBooking: (dealId: string) => void;
  bookingInProgress?: boolean;
};

const formatDuration = (mins?: number) => {
  if (!mins) return 'Non-stop';
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
  const prefersReducedMotion = useReducedMotion();

  const originalPrice = useMemo(() => {
    if (!deal.discount) return deal.cost;
    return Math.round(deal.cost / (1 - deal.discount / 100));
  }, [deal.cost, deal.discount]);

  return (
    <motion.article
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: animationDelayMs / 1000, ease: [0.22, 1, 0.36, 1] }}
      className={styles.card}
    >
      <div className={styles.route}>
        <p title={deal.departureCity}>{deal.departureCity}</p>
        <span className={styles.line} aria-hidden="true">
          <i />
          <Plane size={14} />
          <i />
        </span>
        <p title={deal.arrivalCity}>{deal.arrivalCity}</p>
      </div>

      <div className={styles.meta}>
        <span>{formatDuration(deal.durationMinutes)}</span>
        <DealCountdown expiresAt={deal.expiresAt} compact />
      </div>

      <div className={styles.foot}>
        <div>
          <p className={styles.price}>₹{deal.cost.toLocaleString('en-IN')}</p>
          {deal.discount ? (
            <p className={styles.was}>
              <s>₹{originalPrice.toLocaleString('en-IN')}</s>
              <b>{deal.discount}% off</b>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className={styles.book}
          onClick={() => onConfirmBooking(deal.id)}
          disabled={!deal.isActive || bookingInProgress}
        >
          {bookingInProgress ? 'Opening cabin…' : 'Choose seats'}
        </button>
      </div>
    </motion.article>
  );
}
