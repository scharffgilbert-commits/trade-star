import { useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import FilterButtons from "@/components/dashboard/FilterButtons";
import SymbolCard from "@/components/dashboard/SymbolCard";
import TopSignals from "@/components/dashboard/TopSignals";
import PortfolioSummaryStrip from "@/components/dashboard/PortfolioSummaryStrip";
import PerformanceComparison from "@/components/dashboard/PerformanceComparison";
import MarketRegimeHeatmap from "@/components/dashboard/MarketRegimeHeatmap";
import UpcomingEvents from "@/components/dashboard/UpcomingEvents";
import ActiveSetupsWidget from "@/components/dashboard/ActiveSetupsWidget";
import CombinedModeWidget from "@/components/dashboard/CombinedModeWidget";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { cardData, isLoading } = useDashboardData();
  const [filter, setFilter] = useState("ALL");

  const filtered = filter === "ALL"
    ? cardData
    : cardData.filter((d) => d.actionType === filter);

  return (
    <div className="space-y-3">
      <DashboardHeader />

      {/* Portfolio Summary Strip */}
      <PortfolioSummaryStrip />

      {/* Combined Mode Widget */}
      <CombinedModeWidget />

      {/* Performance Comparison: Live vs V6 vs Combined */}
      <PerformanceComparison />

      {/* Market Regime Heatmap + Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <MarketRegimeHeatmap />
        <UpcomingEvents />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Symbol Cards */}
        <div className="lg:col-span-3">
          <FilterButtons active={filter} onChange={setFilter} />
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map((d) => (
                <SymbolCard key={d.symbol} data={d} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          <TopSignals data={cardData} />
          <ActiveSetupsWidget />
        </div>
      </div>
    </div>
  );
}
