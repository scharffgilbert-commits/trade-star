import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AccountProvider } from "@/contexts/AccountContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminRoute from "@/components/auth/AdminRoute";
import AppLayout from "@/layouts/AppLayout";
import Dashboard from "@/pages/Dashboard";
import SymbolDetail from "@/pages/SymbolDetail";
import Positions from "@/pages/Positions";
import Portfolio from "@/pages/Portfolio";
import SignalsPage from "@/pages/SignalsPage";
import CrocMonitor from "@/pages/CrocMonitor";
import RunPage from "@/pages/RunPage";
import BacktestReport from "@/pages/BacktestReport";
import SuperAdminPage from "@/pages/SuperAdminPage";
import LoginPage from "@/pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AccountProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                {/* User-Seiten (alle freigeschalteten User) */}
                <Route path="/" element={<Dashboard />} />
                <Route path="/symbol/:symbol" element={<SymbolDetail />} />
                <Route path="/positions" element={<Positions />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/signals" element={<SignalsPage />} />

                {/* Admin-Seiten (nur SuperAdmin) */}
                <Route path="/croc" element={<AdminRoute><CrocMonitor /></AdminRoute>} />
                <Route path="/backtest" element={<AdminRoute><BacktestReport /></AdminRoute>} />
                <Route path="/run" element={<AdminRoute><RunPage /></AdminRoute>} />
                <Route path="/admin" element={<AdminRoute><SuperAdminPage /></AdminRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AccountProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
