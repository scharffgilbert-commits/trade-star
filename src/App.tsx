import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AccountProvider } from "@/contexts/AccountContext";
import AppLayout from "@/layouts/AppLayout";
import Dashboard from "@/pages/Dashboard";
import SymbolDetail from "@/pages/SymbolDetail";
import Positions from "@/pages/Positions";
import Portfolio from "@/pages/Portfolio";
import SignalsPage from "@/pages/SignalsPage";
import CrocMonitor from "@/pages/CrocMonitor";
import RunPage from "@/pages/RunPage";
import BacktestReport from "@/pages/BacktestReport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AccountProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/symbol/:symbol" element={<SymbolDetail />} />
              <Route path="/positions" element={<Positions />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/signals" element={<SignalsPage />} />
              <Route path="/croc" element={<CrocMonitor />} />
              <Route path="/backtest" element={<BacktestReport />} />
              <Route path="/run" element={<RunPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AccountProvider>
  </QueryClientProvider>
);

export default App;
