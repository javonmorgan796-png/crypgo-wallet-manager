import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";
import { lazy, Suspense, useEffect } from "react";

// Lazy-loaded routes for faster initial page load
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Investments = lazy(() => import("./pages/Investments"));
const CopyTrade = lazy(() => import("./pages/CopyTrade"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Settings = lazy(() => import("./pages/Settings"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Referral = lazy(() => import("./pages/Referral"));
const KYC = lazy(() => import("./pages/KYC"));
const Signals = lazy(() => import("./pages/Signals"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
  </div>
);

// Smartsupp initialization component
const SmartsuppInitializer = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (document.getElementById('smartsupp-script')) return;

    const load = () => {
      (window as any)._smartsupp = (window as any)._smartsupp || {};
      (window as any)._smartsupp.key = '7e4e75d9f82cdd637468f9b81637a5f877932168';

      const script = document.createElement('script');
      script.id = 'smartsupp-script';
      script.type = 'text/javascript';
      script.charset = 'utf-8';
      script.async = true;
      script.defer = true;
      script.src = 'https://www.smartsuppchat.com/loader.js?';
      script.onerror = () => console.error('Failed to load Smartsupp chat widget');
      document.head.appendChild(script);
    };

    // Defer third-party chat widget until browser is idle so it doesn't block initial render
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(load, { timeout: 4000 });
    } else {
      setTimeout(load, 2500);
    }
  }, []);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <SmartsuppInitializer />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } />
              <Route path="/signup" element={
                <PublicRoute>
                  <SignUp />
                </PublicRoute>
              } />
              <Route path="/forgot-password" element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              } />
              <Route path="/reset-password" element={
                <PublicRoute>
                  <ResetPassword />
                </PublicRoute>
              } />
              <Route path="/verify-email" element={<VerifyEmail />} />

              {/* Protected Routes - User */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/wallet" element={
                <ProtectedRoute>
                  <Wallet />
                </ProtectedRoute>
              } />
              <Route path="/investments" element={
                <ProtectedRoute>
                  <Investments />
                </ProtectedRoute>
              } />
              <Route path="/copy-trade" element={
                <ProtectedRoute>
                  <CopyTrade />
                </ProtectedRoute>
              } />
              <Route path="/transactions" element={
                <ProtectedRoute>
                  <Transactions />
                </ProtectedRoute>
              } />
              <Route path="/referral" element={
                <ProtectedRoute>
                  <Referral />
                </ProtectedRoute>
              } />
              <Route path="/kyc" element={
                <ProtectedRoute>
                  <KYC />
                </ProtectedRoute>
              } />
              <Route path="/signals" element={
                <ProtectedRoute>
                  <Signals />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />

              {/* Protected Routes - Admin Only */}
              <Route path="/admin/*" element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              } />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
