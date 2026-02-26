import { useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import FilterButtons from "@/components/dashboard/FilterButtons";
import SymbolCard from "@/components/dashboard/SymbolCard";
import TopSignals from "@/components/dashboard/TopSignals";
import PortfolioSummaryStrip from "@/components/dashboard/PortfolioSummaryStrip";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { cardData, isLoading } = useDashboardData();
  const [filter, setFilter] = useState("ALL");

  const filtered = filter === "ALL"
    ? cardData
    : cardData.filter((d) => d.actionType === filter);

  return (
    <div className="space-y-4">
      <DashboardHeader />

      {/* Portfolio Summary Strip */}
      <PortfolioSummaryStrip />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Symbol Cards */}
        <div className="lg:col-span-3">
          <FilterButtons active={filter} onChange={setFilter} />
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-52 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((d) => (
                <SymbolCard key={d.symbol} data={d} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <TopSignals data={cardData} />
        </div>
      </div>
    </div>
  );
}
