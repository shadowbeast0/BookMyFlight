/**
 * DealCard Component
 * Displays individual flight deals with route, pricing, and expiration
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DealCountdown } from './DealCountdown';
import { FlightDeal } from '@/lib/api';

interface DealCardProps {
  deal: FlightDeal;
  onSelect: (dealId: string) => void;
}

export function DealCard({ deal, onSelect }: DealCardProps) {
  const originalPrice = deal.discount ? Math.round(deal.cost / (1 - deal.discount / 100)) : deal.cost;
  const savings = originalPrice - deal.cost;

  const formatDuration = (mins?: number) => {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <Card className="overflow-hidden transition-all duration-500 flex flex-col h-full hover:-translate-y-2 group neon-card">
      <div className="bg-gradient-to-r from-violet-500/20 to-amber-300/15 p-4 border-b border-purple-300/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="flex items-center justify-between mb-2 relative">
          <h3 className="text-sm font-semibold text-purple-200/80 uppercase tracking-wide">Special Flight Deal</h3>
          {deal.discount && (
            <span className="inline-block bg-accent px-3 py-1 rounded-full text-xs font-bold text-accent-foreground shadow-sm">
              {deal.discount}% OFF
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-4">
        {/* Route */}
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-white">{deal.departureCity.split(',')[0]}</p>
            <p className="text-xs text-purple-100/65 mt-1">Departure</p>
          </div>

          <div className="flex-1 flex flex-col items-center gap-2 px-4">
            <svg className="w-6 h-6 text-purple-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            <p className="text-xs text-purple-100/65 font-medium">
              {deal.durationMinutes ? formatDuration(deal.durationMinutes) : 'non-stop'}
            </p>
          </div>

          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-white">{deal.arrivalCity.split(',')[0]}</p>
            <p className="text-xs text-purple-100/65 mt-1">Arrival</p>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-purple-100/5 border border-purple-300/15 rounded-lg p-4 mt-2">
          <div className="flex items-end gap-2 mb-1">
            <span className="text-3xl font-bold text-purple-100">₹{deal.cost.toLocaleString('en-IN')}</span>
            {originalPrice > deal.cost && (
              <span className="text-sm text-purple-100/40 line-through mb-1">₹{originalPrice.toLocaleString('en-IN')}</span>
            )}
          </div>
          {savings > 0 && (
            <p className="text-xs text-accent font-semibold">Save ₹{savings.toLocaleString('en-IN')}</p>
          )}
        </div>

        {/* Timer */}
        <div className="mt-2">
          <DealCountdown expiresAt={deal.expiresAt} compact />
        </div>
      </div>

      {/* Action */}
      <div className="p-6 pt-0">
        <Button
          onClick={() => onSelect(deal.id)}
          className="w-full bg-violet-500 hover:bg-violet-400 text-white font-semibold"
          disabled={!deal.isActive}
        >
          {deal.isActive ? 'Book Flight' : 'Deal Expired'}
        </Button>
      </div>
    </Card>
  );
}
