import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { FromPixoulRow } from '@/components/community/FromPixoulRow';
import { PackagesOffersRow } from '@/components/community/PackagesOffersRow';

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading for hero section
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen w-[100svw] max-w-[100svw] bg-background overflow-x-clip mx-auto">
        <section className="relative h-[60vh] md:h-[85vh] lg:h-[90vh] flex items-center justify-center bg-muted">
          <div className="text-center space-y-4">
            <Skeleton className="h-12 w-64 mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto" />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-[100svw] max-w-[100svw] bg-background overflow-x-clip mx-auto">
      {/* HERO: full-bleed, centered, clamped to visual viewport */}
      <section className="px-4 pt-3">
        <div className="relative w-[100svw] max-w-[100svw] mx-auto rounded-2xl overflow-hidden aspect-[9/16] sm:aspect-[16/9] md:aspect-[16/9] ring-1 ring-border/50">
          <img
            src="/pixoul-hero.jpg"
            alt="Pixoul Hub"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 grid place-items-center text-center px-4">
            <div className="text-white">
              <h1 className="font-bold [font-size:clamp(1.6rem,5vw,2.6rem)] drop-shadow">Pixoul Hub</h1>
              <p className="mt-2 opacity-90 [font-size:clamp(0.9rem,3.2vw,1.25rem)]">Your Ultimate Gaming Destination</p>
            </div>
          </div>
        </div>
      </section>

      {/* From Pixoul Row */}
      <section className="mt-6 px-3 md:px-4">
        {/* From Pixoul row/cards as they are now */}
        <FromPixoulRow />
      </section>

      {/* Packages & Offers Row (structure-only, mirrors From Pixoul) */}
      <section className="mt-2 px-3 md:px-4">
        <PackagesOffersRow />
      </section>

      {/* Community Feed */}
      <CommunityFeed />
    </div>
  );
};

export default Index;
