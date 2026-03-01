import { useMarketRegimeOverview } from "@/hooks/useMarketRegimeOverview";
import { useNavigate } from "react-router-dom";
import { Activity, TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const regimeConfig: Record<string, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  TRENDING_UP: {
    color: "text-bullish",
    bg: "bg-bullish/10",
    border: "border-bullish/30",
    icon: TrendingUp,
    label: "Aufwärtstrend",
  },
  TRENDING_DOWN: {
    color: "text-bearish",
    bg: "bg-bearish/10",
    border: "border-bearish/30",
    icon: TrendingDown,
    label: "Abwärtstrend",
  },
  SIDEWAYS: {
    color: "text-neutral",
    bg: "bg-neutral/10",
    border: "border-neutral/30",
    icon: Minus,
    label: "Seitwärts",
  },
  VOLATILE: {
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/30",
    icon: Zap,
    label: "Volatil",
  },
};

const defaultConfig = regimeConfig.SIDEWAYS;

export default function MarketRegimeHeatmap() {
  const { regimeOverview, isLoading } = useMarketRegimeOverview();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Market Regime</h2>
        </div>
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (regimeOverview.length === 0) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Market Regime</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Keine Regime-Daten vorhanden.
        </p>
      </div>
    );
  }

  // Count regimes
  const counts = { TRENDING_UP: 0, TRENDING_DOWN: 0, SIDEWAYS: 0, VOLATILE: 0 };
  for (const item of regimeOverview) {
    const r = item.regime as keyof typeof counts;
    if (r in counts) counts[r]++;
  }

  return (
    <TooltipProvider>
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm font-semibold text-foreground">Market Regime</h2>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3">
            {Object.entries(counts).map(([regime, count]) => {
              if (count === 0) return null;
              const cfg = regimeConfig[regime] ?? defaultConfig;
              return (
                <span key={regime} className={cn("flex items-center gap-1 text-[10px]", cfg.color)}>
                  <cfg.icon className="h-3 w-3" />
                  <span>{count}</span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {regimeOverview
            .sort((a, b) => a.symbol.localeCompare(b.symbol))
            .map((item) => {
              const cfg = regimeConfig[item.regime] ?? defaultConfig;
              return (
                <Tooltip key={item.symbol}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate(`/symbol/${item.symbol}`)}
                      className={cn(
                        "px-2 py-1 rounded text-[10px] font-mono font-semibold border transition-all hover:scale-105",
                        cfg.bg,
                        cfg.border,
                        cfg.color
                      )}
                    >
                      {item.symbol.replace(".DE", "")}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs font-medium">{item.symbol}</p>
                    <p className={cn("text-xs", cfg.color)}>
                      {cfg.label} ({item.confidence?.toFixed(0) ?? "—"}%)
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
        </div>
      </div>
    </TooltipProvider>
  );
}
