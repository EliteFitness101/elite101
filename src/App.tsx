import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Marketplace from "./pages/Marketplace";
import ModelProfile from "./pages/ModelProfile";
import ModelOnboarding from "./pages/onboarding/ModelOnboarding";
import BrandOnboarding from "./pages/onboarding/BrandOnboarding";
import ModelDashboard from "./pages/dashboard/ModelDashboard";
import BrandDashboard from "./pages/dashboard/BrandDashboard";
import NewCampaign from "./pages/campaigns/NewCampaign";
import CampaignMatches from "./pages/campaigns/CampaignMatches";
import BookingSuccess from "./pages/BookingSuccess";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner theme="dark" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/models/:id" element={<ModelProfile />} />
            <Route path="/booking/success" element={<BookingSuccess />} />

            <Route path="/onboarding/model" element={<ProtectedRoute requireRole="model"><ModelOnboarding /></ProtectedRoute>} />
            <Route path="/onboarding/brand" element={<ProtectedRoute requireRole="brand"><BrandOnboarding /></ProtectedRoute>} />
            <Route path="/dashboard/model" element={<ProtectedRoute requireRole="model"><ModelDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/brand" element={<ProtectedRoute requireRole="brand"><BrandDashboard /></ProtectedRoute>} />
            <Route path="/campaigns/new" element={<ProtectedRoute requireRole="brand"><NewCampaign /></ProtectedRoute>} />
            <Route path="/campaigns/:id/matches" element={<ProtectedRoute requireRole="brand"><CampaignMatches /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
