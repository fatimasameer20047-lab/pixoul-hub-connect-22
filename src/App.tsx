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
import { SupportButton } from "@/components/SupportButton";
import { Badge } from "@/components/ui/badge";
import { Loader } from "lucide-react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Booking from "./pages/Booking";
import Events from "./pages/Events";
import Guides from "./pages/Guides";
import Snacks from "./pages/Snacks";
import Gallery from "./pages/Gallery";
import Support from "./pages/Support";
import Announcements from "./pages/Announcements";
import NotFound from "./pages/NotFound";
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffHome from "./pages/staff/StaffHome";
import StaffRooms from "./pages/staff/StaffRooms";
import StaffEvents from "./pages/staff/StaffEvents";
import StaffSnacks from "./pages/staff/StaffSnacks";
import StaffGallery from "./pages/staff/StaffGallery";
import StaffGuides from "./pages/staff/StaffGuides";
import StaffAnnouncements from "./pages/staff/StaffAnnouncements";
import StaffSupport from "./pages/staff/StaffSupport";
import StaffPixoulPosts from "./pages/staff/StaffPixoulPosts";
import FromPixoul from "./pages/FromPixoul";
import PartyGallery from "./pages/PartyGallery";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";

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
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center justify-between border-b border-border/50 bg-card/50 backdrop-blur-sm px-4">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              {isDemoMode && (
                <Badge variant="outline" className="text-xs">
                  Demo Mode
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {isDemoMode ? 'Guest Mode' : user?.email || 'User'}
              </Badge>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <SupportButton />
        </div>
      </div>
    </SidebarProvider>
  );
};

const StaffLayout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { staffRole } = useStaff();
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <StaffSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center justify-between border-b border-border/50 bg-card/50 backdrop-blur-sm px-4">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                Staff Portal
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {user?.email || 'Staff'}
              </Badge>
            </div>
          </header>
          <main className="flex-1">{children}</main>
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
        <StaffRoute>
          <StaffLayout>
            <StaffPixoulPosts />
          </StaffLayout>
        </StaffRoute>
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
