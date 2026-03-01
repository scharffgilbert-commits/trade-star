import { useDetectedSetups } from "@/hooks/useDetectedSetups";
import { useNavigate } from "react-router-dom";
import { Crosshair, ArrowUp, ArrowDown, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const setupLabels: Record<string, string> = {
  gaensemarsch: "Gänsemarsch",
  dietrich: "Dietrich",
  trend_following: "Trend Follow",
  mean_reversion: "Mean Rev.",
  breakout: "Breakout",
  momentum: "Momentum",
  volatility: "Volatility",
  ichimoku: "Ichimoku",
  volume_spike: "Vol. Spike",
  croc_signal: "CROC Signal",
  ice_premium: "ICE Premium",
  multi_confluence: "Multi Conf.",
};

export default function ActiveSetupsWidget() {
  const { setups, isLoading } = useDetectedSetups(undefined, true);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Crosshair className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Aktive Setups</h2>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Sort by confidence and take top 8
  const topSetups = [...setups]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);

  if (topSetups.length === 0) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Crosshair className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Aktive Setups</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Keine aktiven Setups erkannt.
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Aktive Setups</h2>
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary">
          {setups.length} total
        </Badge>
      </div>

      <div className="space-y-1">
        {topSetups.map((setup) => {
          const isLong = setup.direction === "BULL" || setup.direction === "LONG";
          const label = setupLabels[setup.setup_type] ?? setup.setup_type;

          return (
            <button
              key={setup.id}
              onClick={() => navigate(`/symbol/${setup.symbol}`)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              {/* Direction icon */}
              <div className={cn("p-1 rounded", isLong ? "bg-bullish/10" : "bg-bearish/10")}>
                {isLong ? (
                  <ArrowUp className="h-3 w-3 text-bullish" />
                ) : (
                  <ArrowDown className="h-3 w-3 text-bearish" />
                )}
              </div>

              {/* Symbol + Setup */}
              <div className="flex-1 min-w-0 text-left">
                <div className="font-mono text-xs font-bold text-foreground">
                  {setup.symbol.replace(".DE", "")}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{label}</div>
              </div>

              {/* Confidence + Entry */}
              <div className="text-right shrink-0">
                <div
                  className={cn(
                    "font-mono text-xs font-semibold",
                    setup.confidence >= 70
                      ? "text-bullish"
                      : setup.confidence >= 50
                        ? "text-neutral"
                        : "text-muted-foreground"
                  )}
                >
                  {setup.confidence.toFixed(0)}%
                </div>
                {setup.entry_price && (
                  <div className="text-[10px] text-muted-foreground font-mono">
                    ${Number(setup.entry_price).toFixed(0)}
                  </div>
                )}
              </div>

              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
