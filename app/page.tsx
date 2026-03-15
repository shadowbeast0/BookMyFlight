'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDeals } from '@/hooks/useDeals';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DealCountdown } from '@/components/DealCountdown';
import { FlightDeal } from '@/lib/api';
import { FlightMascot } from '@/components/FlightMascot';
import { FlightPathJourney } from '@/components/FlightPathJourney';
import { HeroRouteGlobe } from '@/components/HeroRouteGlobe';
import { BoardingPassDealCard } from '@/components/BoardingPassDealCard';
import { Plane } from 'lucide-react';

export default function Home() {
  const { deals, loading, error, refetch } = useDeals();
  const router = useRouter();
  const [sortMode, setSortMode] = useState<'best' | 'cheap' | 'fast'>('best');
  const [bookingDealId, setBookingDealId] = useState<string | null>(null);
  const [timeTheme, setTimeTheme] = useState<'morning' | 'day' | 'evening' | 'night'>('night');
  const [signalIndex, setSignalIndex] = useState(0);
  const [launchSearch, setLaunchSearch] = useState(false);

  const handleSelectDeal = (dealId: string) => {
    router.push(`/booking/${dealId}`);
  };

  // Keep only discounted flights on homepage.
  const specialDeals = deals.filter((d: FlightDeal) => d.discount && d.discount > 0);

  const sortedDeals = useMemo(() => {
    const copy = [...specialDeals];
    if (sortMode === 'cheap') {
      return copy.sort((a, b) => a.cost - b.cost);
    }
    if (sortMode === 'fast') {
      return copy.sort((a, b) => (a.durationMinutes ?? 9999) - (b.durationMinutes ?? 9999));
    }
    return copy.sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0));
  }, [specialDeals, sortMode]);

  const hottestDeal = useMemo(() => {
    return sortedDeals
      .filter((deal) => deal.isActive)
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0];
  }, [sortedDeals]);

  const liveSignals = useMemo(
    () => [
      'Neon route engine calibrated',
      'Discount radar scanning live inventory',
      'Smart sort model balancing price/time',
      'Milestone trackers synced to scroll stream',
    ],
    []
  );

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) {
      setTimeTheme('morning');
      return;
    }
    if (hour >= 11 && hour < 17) {
      setTimeTheme('day');
      return;
    }
    if (hour >= 17 && hour < 21) {
      setTimeTheme('evening');
      return;
    }
    setTimeTheme('night');
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSignalIndex((prev) => (prev + 1) % liveSignals.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [liveSignals.length]);

  const handleBookWithAnimation = (dealId: string) => {
    if (bookingDealId) return;
    setBookingDealId(dealId);
    window.setTimeout(() => {
      router.push(`/booking/${dealId}`);
    }, 180);
  };

  const handleHeroSearch = () => {
    if (launchSearch) return;
    setLaunchSearch(true);
    window.setTimeout(() => {
      router.push('/search');
    }, 420);
    window.setTimeout(() => setLaunchSearch(false), 900);
  };

  return (
    <main className={`min-h-screen cyber-bg text-white time-theme-${timeTheme}`}>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-28 cyber-grid">
        <div className="hackathon-orb hackathon-orb-a" />
        <div className="hackathon-orb hackathon-orb-b" />
        <div className="hackathon-orb hackathon-orb-c" />

        {/* Floating planes */}
        <div className="absolute top-10 left-[10%] animate-float opacity-10">
          <svg className="w-16 h-16 text-purple-300" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>
        <div className="absolute bottom-16 right-[15%] animate-float-delayed opacity-10">
          <svg className="w-12 h-12 text-white rotate-45" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>
        <div className="absolute top-1/3 right-[5%] animate-pulse-glow w-64 h-64 bg-purple-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-[5%] animate-pulse-glow-delayed w-48 h-48 bg-violet-600/20 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 grid lg:grid-cols-[1.15fr_0.85fr] gap-8 items-center">
          <div className="text-center lg:text-left">
          <div className="flex justify-center mb-6 animate-fade-in-up">
            <div className="rounded-2xl border border-purple-300/25 bg-purple-500/10 p-3 backdrop-blur-xl">
              <FlightMascot size="lg" />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8 animate-fade-in-up">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-sm font-medium text-white/80">Live: exclusive deals updated in real time</span>
          </div>

          <h1 className="display-font neon-title text-4xl md:text-6xl font-extrabold text-white mb-5 animate-fade-in-up animation-delay-100 leading-tight">
            Book Smarter.
            <br />
            <span className="bg-gradient-to-r from-purple-300 via-white to-amber-200 bg-clip-text text-transparent animate-gradient-shift">
              Fly Without Limits
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 animate-fade-in-up animation-delay-200">
            Grab exclusive limited-time flight deals before they expire.
            Book in seconds with just your phone number.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-300">
            <Button
              onClick={handleHeroSearch}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg px-8 py-6 rounded-xl shadow-xl shadow-accent/20 hover-glow"
            >
              <span className={`takeoff-plane ${launchSearch ? 'launching' : ''}`}><Plane size={17} /></span>
              Search Flights
            </Button>
            <Button
              onClick={() => {
                document.getElementById('flights')?.scrollIntoView({ behavior: 'smooth' });
              }}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 font-semibold text-lg px-8 py-6 rounded-xl"
            >
              View Flights ↓
            </Button>
          </div>

          <div className="hero-search-panel mt-5 animate-fade-in-up animation-delay-200">
            <p className="text-sm text-white/75">Interactive Globe Mode: select glowing city pins directly on the globe to set source and destination pairs.</p>
            <p className="text-xs text-white/58 mt-1">Drag to rotate. Click one pin for source, next pin for destination, then repeat.</p>
          </div>
          </div>

          <div className="hidden lg:block">
            <HeroRouteGlobe />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16 animate-fade-in-up animation-delay-400">
            <div className="glass-card mesh-panel rounded-xl p-4">
              <p className="text-3xl font-extrabold text-white">{deals.length}+</p>
              <p className="text-xs text-white/50 mt-1 uppercase tracking-wider">Routes</p>
            </div>
            <div className="glass-card mesh-panel rounded-xl p-4">
              <p className="text-3xl font-extrabold text-white">{specialDeals.length}</p>
              <p className="text-xs text-white/50 mt-1 uppercase tracking-wider">Special Deals</p>
            </div>
            <div className="glass-card mesh-panel rounded-xl p-4">
              <p className="text-3xl font-extrabold text-white">30%</p>
              <p className="text-xs text-white/50 mt-1 uppercase tracking-wider">Max Discount</p>
            </div>
          </div>
        </div>
      </section>

      <section className="hackathon-marquee-wrap" aria-label="Hackathon visual marquee">
        <div className="hackathon-marquee-track">
          {[
            'LIVE DEMO READY',
            'NEON FLIGHT ENGINE',
            'SCROLL-SYNC MOTION',
            'RAPID BUILD MODE',
            'TEAM SKYLINE',
            'PITCH IN PROGRESS',
          ].map((item, idx) => (
            <span key={`${item}-${idx}`} className="hackathon-marquee-item">{item}</span>
          ))}
        </div>
      </section>

      <div className="section-cinematic-divider" />

      {/* Discounted Flights Section */}
      <div id="flights" className="relative max-w-7xl mx-auto px-4 py-16 overflow-hidden">
        <div className="route-depth-map" />
        <FlightPathJourney containerId="flights" />

        {hottestDeal && (
          <div className="deal-radar-widget hidden xl:block">
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-100/70">Deal Radar</p>
            <p className="text-sm font-bold text-white mt-1">{hottestDeal.departureCity} to {hottestDeal.arrivalCity}</p>
            <p className="text-xs text-purple-100/70 mt-0.5">Ends soon: {new Date(hottestDeal.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
            <div className="deal-radar-scan mt-3" />
          </div>
        )}

        <div className="relative z-30 text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-primary/5 rounded-full px-4 py-1.5 mb-4">
            <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            <span className="text-sm font-semibold text-primary">Discounted Flights Only</span>
          </div>
          <h2 className="text-3xl display-font font-extrabold text-white mb-3">
            Best Discounted Deals
          </h2>
          <p className="text-purple-100/65 max-w-lg mx-auto">
            Only flights with active discounts are shown here.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setSortMode('best')}
              className={`deal-sort-chip ${sortMode === 'best' ? 'active' : ''}`}
            >
              Best for You
            </button>
            <button
              type="button"
              onClick={() => setSortMode('cheap')}
              className={`deal-sort-chip ${sortMode === 'cheap' ? 'active' : ''}`}
            >
              Cheapest
            </button>
            <button
              type="button"
              onClick={() => setSortMode('fast')}
              className={`deal-sort-chip ${sortMode === 'fast' ? 'active' : ''}`}
            >
              Fastest
            </button>
          </div>

          <div className="hackathon-dock mx-auto mt-6">
            <div className="hackathon-dock-head">
              <span className="hackathon-dot" />
              <span className="hackathon-label">Mission Control</span>
              <span className="hackathon-stream">Live Stream</span>
            </div>
            <p className="hackathon-signal">{liveSignals[signalIndex]}</p>
            <div className="hackathon-chips">
              {['Route AI', 'Deal Radar', 'Motion Engine', 'Time Themes', 'Pin Select'].map((chip) => (
                <span key={chip} className="hackathon-chip">{chip}</span>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-32 bg-muted rounded-lg mb-4" />
                <div className="h-6 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-6">
            <h3 className="font-semibold text-destructive mb-2">Unable to Load Flights</h3>
            <p className="text-sm text-destructive/80 mb-4">{error.message}</p>
            <Button onClick={refetch} className="bg-destructive hover:bg-destructive/90 text-white">
              Try Again
            </Button>
          </div>
        ) : specialDeals.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-border p-12 text-center">
            <p className="text-purple-100/70">No discounted flights available right now. Check back later!</p>
          </div>
        ) : (
          <div className="relative z-10 grid md:grid-cols-2 lg:grid-cols-3 gap-5 lg:px-36 xl:px-44 2xl:px-52">
            {sortedDeals.map((deal, i) => (
              <BoardingPassDealCard
                key={deal.id}
                deal={deal}
                animationDelayMs={i * 60}
                onConfirmBooking={handleBookWithAnimation}
                bookingInProgress={bookingDealId === deal.id}
              />
            ))}
          </div>
        )}
      </div>

      <div className="section-cinematic-divider section-cinematic-divider-bottom" />

      {/* Features Section */}
      <section className="bg-[#0a041e]/85 border-t border-purple-300/15">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center animate-fade-in-up group">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-purple-100 mb-2">Fast Booking</h3>
              <p className="text-sm text-purple-100/65">No registration. Book in seconds with just your phone number.</p>
            </div>

            <div className="text-center animate-fade-in-up animation-delay-100 group">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-purple-100 mb-2">Free Cancellation</h3>
              <p className="text-sm text-purple-100/65">Full refund if cancelled 10+ days before departure. 50% within 10 days.</p>
            </div>

            <div className="text-center animate-fade-in-up animation-delay-200 group">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-purple-100 mb-2">Best Prices</h3>
              <p className="text-sm text-purple-100/65">Up to 30% off with limited-time deals you won&apos;t find elsewhere.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
