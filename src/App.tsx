import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
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

const AppRoutes = () => {
  const isDemoMode = import.meta.env.DEMO_MODE === 'true';
  
  return (
    <Routes>
      {isDemoMode && <Route path="/auth" element={<Navigate to="/" replace />} />}
      {!isDemoMode && <Route path="/auth" element={<Auth />} />}
      
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout>
            <Index />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/booking" element={
        <ProtectedRoute>
          <AppLayout>
            <Booking />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/events" element={
        <ProtectedRoute>
          <AppLayout>
            <Events />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/guides" element={
        <ProtectedRoute>
          <AppLayout>
            <Guides />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/snacks" element={
        <ProtectedRoute>
          <AppLayout>
            <Snacks />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/gallery" element={
        <ProtectedRoute>
          <AppLayout>
            <Gallery />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/support" element={
        <ProtectedRoute>
          <AppLayout>
            <Support />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/announcements" element={
        <ProtectedRoute>
          <AppLayout>
            <Announcements />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
