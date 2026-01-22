import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookingDashboard } from '@/components/booking/BookingDashboard';
import { useStaff } from '@/contexts/StaffContext';
import { Loader } from 'lucide-react';
import React from 'react';

class BookingErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message?: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: undefined };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message };
  }
  componentDidCatch(error: Error) {
    console.error('Booking dashboard error:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Bookings failed to load</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-destructive">
              {this.state.message || 'An error occurred while rendering bookings.'}
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function StaffBookings() {
  const [searchParams] = useSearchParams();
  const chatParam = searchParams.get('chat');
  const tabParam = searchParams.get('tab');
  const highlightId = searchParams.get('highlight') || undefined;
  const highlightType = searchParams.get('type') || undefined;
  const { canManageRooms } = useStaff();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canManageRooms) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            You do not have access to manage bookings.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <BookingErrorBoundary>
        <BookingDashboard
          initialChatId={chatParam || undefined}
          initialTab={tabParam === 'room-bookings' || tabParam === 'packages-offers' || tabParam === 'party-requests' ? tabParam : undefined}
          highlightId={highlightId}
          highlightType={highlightType}
        />
      </BookingErrorBoundary>
    </div>
  );
}
