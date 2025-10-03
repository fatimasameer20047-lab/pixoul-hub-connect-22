import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { FromPixoulRow } from '@/components/community/FromPixoulRow';

const StaffHome = () => {
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section 
        className="relative h-[60vh] md:h-[85vh] lg:h-[90vh] bg-cover bg-center flex items-center justify-center"
        style={{ backgroundImage: 'url(/pixoul-hero.jpg)' }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 text-center text-white px-6 max-w-4xl">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 drop-shadow-lg">
            Pixoul Hub
          </h1>
          <p className="text-lg md:text-2xl lg:text-3xl opacity-90 drop-shadow-md">
            Your Ultimate Gaming Destination
          </p>
        </div>
      </section>

      {/* From Pixoul Row */}
      <FromPixoulRow />

      {/* Community Feed */}
      <CommunityFeed />
    </div>
  );
};

export default StaffHome;
