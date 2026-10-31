import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Pathways from "./pages/Pathways";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Marketplace from "./pages/Marketplace";
import ModelProfile from "./pages/ModelProfile";
import ModelOnboarding from "./pages/onboarding/ModelOnboarding";
import BrandOnboarding from "./pages/onboarding/BrandOnboarding";
import ModelDashboard from "./pages/dashboard/ModelDashboard";
import BrandDashboard from "./pages/dashboard/BrandDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import EliteMediaDashboard from "./pages/dashboard/EliteMediaDashboard";
import NewCampaign from "./pages/campaigns/NewCampaign";
import CampaignMatches from "./pages/campaigns/CampaignMatches";
import BookingSuccess from "./pages/BookingSuccess";
import Questionnaire from "./pages/Questionnaire";
import Monetization from "./pages/Monetization";
import EliteCheckout from "./pages/EliteCheckout";
import EliteManageSubscription from "./pages/EliteManageSubscription";
import BrandGrowth from "./pages/BrandGrowth";
import NaijaResoFit from "./pages/NaijaResoFit";
const Explore = lazy(() => import("./pages/Explore"));
const ChatB2KConcierge = lazy(() => import("@/components/ChatB2KConcierge").then((module) => ({ default: module.ChatB2KConcierge })));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <Toaster />
        <Sonner theme="dark" />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/naija/*" element={<NaijaResoFit />} />
              <Route path="/explore" element={<Suspense fallback={<div className="min-h-screen bg-[#08080b] p-8 text-sm text-white/60">Preparing your Elite experience…</div>}><Explore /></Suspense>} />
              <Route path="/pathways" element={<Pathways />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/models/:id" element={<ModelProfile />} />
              <Route path="/booking/success" element={<BookingSuccess />} />
              <Route path="/questionnaire" element={<Questionnaire />} />
              <Route path="/monetization" element={<Monetization />} />
              <Route path="/checkout" element={<EliteCheckout />} />
              <Route path="/manage-subscription" element={<EliteManageSubscription />} />
              <Route path="/brand-growth" element={<BrandGrowth />} />
              <Route path="/offers/:slug" element={<Monetization />} />
              <Route path="/onboarding/model" element={<ProtectedRoute requireRole="model"><ModelOnboarding /></ProtectedRoute>} />
              <Route path="/onboarding/brand" element={<ProtectedRoute requireRole="brand"><BrandOnboarding /></ProtectedRoute>} />
              <Route path="/dashboard/model" element={<ProtectedRoute requireRole="model"><ModelDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/brand" element={<ProtectedRoute requireRole="brand"><BrandDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/admin" element={<ProtectedRoute requireRole="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/elite-media" element={<ProtectedRoute><EliteMediaDashboard /></ProtectedRoute>} />
              <Route path="/campaigns/new" element={<ProtectedRoute requireRole="brand"><NewCampaign /></ProtectedRoute>} />
              <Route path="/campaigns/:id/matches" element={<ProtectedRoute requireRole="brand"><CampaignMatches /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Suspense fallback={null}><ChatB2KConcierge /></Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </MotionConfig>
  </QueryClientProvider>
);

export default App;
