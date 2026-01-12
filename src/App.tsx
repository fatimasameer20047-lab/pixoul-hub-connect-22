import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StaffProvider, useStaff } from "@/contexts/StaffContext";
import { CartProvider } from "@/hooks/use-cart";
import { AppSidebar } from "@/components/AppSidebar";
import { StaffSidebar } from "@/components/StaffSidebar";
import { Badge } from "@/components/ui/badge";
import { Loader } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import pixoulLogo from "@/Pixoul-logo-1.png";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Booking from "./pages/Booking";
import Events from "./pages/Events";
import Guides from "./pages/Guides";
import Snacks from "./pages/Snacks";
import Gallery from "./pages/Gallery";
import Support from "./pages/Support";
import BookingChat from "./pages/BookingChat";
import Announcements from "./pages/Announcements";
import NotFound from "./pages/NotFound";
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffHome from "./pages/staff/StaffHome";
import StaffManagement from "./pages/staff/StaffManagement";
import StaffRooms from "./pages/staff/StaffRooms";
import StaffEvents from "./pages/staff/StaffEvents";
import StaffSnacks from "./pages/staff/StaffSnacks";
import StaffGallery from "./pages/staff/StaffGallery";
import StaffGuides from "./pages/staff/StaffGuides";
import StaffAnnouncements from "./pages/staff/StaffAnnouncements";
import StaffSupport from "./pages/staff/StaffSupport";
import StaffBookings from "./pages/staff/StaffBookings";
import StaffPixoulPosts from "./pages/staff/StaffPixoulPosts";
import StaffOrders from "./pages/staff/StaffOrders";
import FromPixoul from "./pages/FromPixoul";
import PartyGallery from "./pages/PartyGallery";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import UserProfile from "./pages/UserProfile";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const isDemoMode = import.meta.env.DEMO_MODE === 'true';
  
  if (isDemoMode) {
    return <>{children}</>;
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const StaffRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const { isStaff } = useStaff();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  if (!isStaff) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const PixoulStaffRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const { isStaff } = useStaff();
  const isPixoulStaff = user?.email === 'pixoulgaming@staffportal.com';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isStaff || !isPixoulStaff) {
    return <Navigate to="/staff" replace />;
  }

  return <>{children}</>;
};

const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const { isStaff } = useStaff();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Redirect staff to staff portal
  if (isStaff) {
    return <Navigate to="/staff" replace />;
  }
  
  return <>{children}</>;
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const isDemoMode = import.meta.env.DEMO_MODE === 'true';
  
  return (
    <SidebarProvider>
      <div className="min-h-screen w-[100svw] max-w-[100svw] bg-background overflow-x-clip mx-auto">
        <div className="flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* FIXED: Keep entire top app bar visible on scroll (guest pages) */}
          <header className="fixed top-0 inset-x-0 z-50 w-[100svw] max-w-[100svw] bg-background">
            <div className="mx-auto w-full max-w-screen-lg px-4">
              <div className="h-12 flex items-center justify-between border-b border-border/50">
                <SidebarTrigger />
            {/* Pixoul logo centered in the header without affecting layout */}
            <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none select-none">
              <img
                src={pixoulLogo}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                alt="Pixoul"
                className="h-6 md:h-7 object-contain opacity-90"
              />
            </div>
            <div className="flex items-center gap-2">
              {isDemoMode && (
                <Badge variant="outline" className="text-xs">
                  Demo Mode
                </Badge>
              )}
              {/* MOBILE: Bell with badge visible on all dashboards */}
              <NotificationBell customerIdOverride={user?.id} />
            </div>
              </div>
            </div>
          </header>
          {/* MOBILE: Add bottom padding so content isn't hidden by bottom nav */}
          {/* Add top padding to offset fixed header height (h-12) */}
          <main className="flex-1 pt-12 pb-24 md:pb-0 overflow-x-hidden">{children}</main>
          {/* MOBILE: Bottom navigation */}
          <MobileBottomNav />
        </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

const StaffLayout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { staffRole, canManageSupport, canManageRooms, canManageSnacks } = useStaff();
  const resolvedStaffRole =
    canManageSupport ? 'support' :
    canManageRooms ? 'booking' :
    canManageSnacks ? 'snacks' :
    staffRole ? staffRole : null;
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <StaffSidebar />
        <div className="flex-1 flex flex-col">
          {/* FIXED: Keep entire top app bar visible on scroll (staff pages) */}
          <header className="fixed top-0 inset-x-0 z-50 h-12 flex items-center justify-between border-b border-border/50 bg-card/80 backdrop-blur-sm vw-safe mx-auto px-4 md:px-5 lg:px-6 supports-[backdrop-filter]:bg-card/70 relative">
            <SidebarTrigger />
            {/* Pixoul logo centered in the header without affecting layout */}
            <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none select-none">
              <img
                src={pixoulLogo}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                alt="Pixoul"
                className="h-6 md:h-7 object-contain opacity-90"
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                Staff Portal
              </Badge>
              {/* MOBILE: Bell with badge visible on staff dashboard too */}
              <NotificationBell staffRoleOverride={resolvedStaffRole || undefined} />
            </div>
          </header>
          {/* Add top padding to offset fixed header height (h-12) */}
          <main className="flex-1 pt-12 pb-24 md:pb-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const AppRoutes = () => {
  const isDemoMode = import.meta.env.DEMO_MODE === 'true';
  
  return (
    <Routes>
      {isDemoMode && <Route path="/auth" element={<Navigate to="/" replace />} />}
      {!isDemoMode && <Route path="/auth" element={<Auth />} />}
      
      {/* Guest Routes */}
      <Route path="/" element={
        <GuestRoute>
          <AppLayout>
            <Index />
          </AppLayout>
        </GuestRoute>
      } />
      <Route path="/booking" element={
        <GuestRoute>
          <AppLayout>
            <Booking />
          </AppLayout>
        </GuestRoute>
      } />
      <Route path="/booking/chat/:conversationId" element={
        <GuestRoute>
          <AppLayout>
            <BookingChat />
          </AppLayout>
        </GuestRoute>
      } />
      <Route path="/events" element={
        <GuestRoute>
          <AppLayout>
            <Events />
          </AppLayout>
        </GuestRoute>
      } />
      <Route path="/guides" element={
        <GuestRoute>
          <AppLayout>
            <Guides />
          </AppLayout>
        </GuestRoute>
      } />
      <Route path="/snacks" element={
        <GuestRoute>
          <AppLayout>
            <Snacks />
          </AppLayout>
        </GuestRoute>
      } />
      <Route path="/gallery" element={
        <GuestRoute>
          <AppLayout>
            <Gallery />
          </AppLayout>
        </GuestRoute>
      } />
      <Route path="/support" element={
        <GuestRoute>
          <AppLayout>
            <Support />
          </AppLayout>
        </GuestRoute>
      } />
      <Route path="/announcements" element={
        <GuestRoute>
          <AppLayout>
            <Announcements />
          </AppLayout>
        </GuestRoute>
      } />
      <Route path="/from-pixoul" element={
        <GuestRoute>
          <AppLayout>
            <FromPixoul />
          </AppLayout>
        </GuestRoute>
      } />
      <Route path="/party-gallery" element={
        <GuestRoute>
          <AppLayout>
            <PartyGallery />
          </AppLayout>
        </GuestRoute>
      } />
      <Route path="/checkout" element={
        <GuestRoute>
          <AppLayout>
            <Checkout />
          </AppLayout>
        </GuestRoute>
      } />
      <Route path="/payment-success" element={
        <AppLayout>
          <PaymentSuccess />
        </AppLayout>
      } />
      <Route path="/payment-cancelled" element={
        <AppLayout>
          <PaymentCancelled />
        </AppLayout>
      } />

      {/* Staff Routes */}
      <Route path="/staff" element={
        <StaffRoute>
          <StaffLayout>
            <StaffDashboard />
          </StaffLayout>
        </StaffRoute>
      } />
      <Route path="/staff/home" element={
        <StaffRoute>
          <StaffLayout>
            <StaffHome />
          </StaffLayout>
        </StaffRoute>
      } />
      <Route path="/staff/bookings" element={
        <StaffRoute>
          <StaffLayout>
            <StaffBookings />
          </StaffLayout>
        </StaffRoute>
      } />
      <Route path="/staff/management" element={
        <StaffRoute>
          <StaffLayout>
            <StaffManagement />
          </StaffLayout>
        </StaffRoute>
      } />
      <Route path="/staff/rooms" element={
        <StaffRoute>
          <StaffLayout>
            <StaffRooms />
          </StaffLayout>
        </StaffRoute>
      } />
      <Route path="/staff/events" element={
        <StaffRoute>
          <StaffLayout>
            <StaffEvents />
          </StaffLayout>
        </StaffRoute>
      } />
      <Route path="/staff/snacks" element={
        <StaffRoute>
          <StaffLayout>
            <StaffSnacks />
          </StaffLayout>
        </StaffRoute>
      } />
      <Route path="/staff/orders" element={
        <StaffRoute>
          <StaffLayout>
            <StaffOrders />
          </StaffLayout>
        </StaffRoute>
      } />
      <Route path="/staff/orders/:orderId" element={
        <StaffRoute>
          <StaffLayout>
            <StaffOrders />
          </StaffLayout>
        </StaffRoute>
      } />
      <Route path="/staff/gallery" element={
        <StaffRoute>
          <StaffLayout>
            <StaffGallery />
          </StaffLayout>
        </StaffRoute>
      } />
      <Route path="/staff/guides" element={
        <StaffRoute>
          <StaffLayout>
            <StaffGuides />
          </StaffLayout>
        </StaffRoute>
      } />
      <Route path="/staff/announcements" element={
        <StaffRoute>
          <StaffLayout>
            <StaffAnnouncements />
          </StaffLayout>
        </StaffRoute>
      } />
      <Route path="/staff/support" element={
        <StaffRoute>
          <StaffLayout>
            <StaffSupport />
          </StaffLayout>
        </StaffRoute>
      } />
      <Route path="/staff/pixoul-posts" element={
        <PixoulStaffRoute>
          <StaffLayout>
            <StaffPixoulPosts />
          </StaffLayout>
        </PixoulStaffRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StaffProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </StaffProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
