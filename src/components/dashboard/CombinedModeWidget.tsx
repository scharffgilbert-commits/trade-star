import { useCombinedModeStats } from "@/hooks/useCombinedModeStats";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, TrendingDown } from "lucide-react";

export default function CombinedModeWidget() {
  const stats = useCombinedModeStats();

  if (!stats.config.useCombinedMode) return null;

  return (
    <div className="card-elevated rounded-lg border border-gold/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gold" />
          <span className="text-xs font-semibold text-foreground">V8 Combined Filter</span>
        </div>
        <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-gold/15 text-gold border-gold/30">
          Active
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-bullish" />
          <span className="text-muted-foreground">Long ≥{stats.config.minScoreLong}:</span>
          <span className="text-bullish font-semibold">{stats.longPassed}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-bearish">{stats.longBlocked}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown className="h-3 w-3 text-bearish" />
          <span className="text-muted-foreground">Short ≥{stats.config.minScoreShort}:</span>
          <span className="text-bullish font-semibold">{stats.shortPassed}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-bearish">{stats.shortBlocked}</span>
        </div>
      </div>

      {stats.recentFilters.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {stats.recentFilters.slice(0, 5).map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className="font-mono font-semibold text-foreground w-10">{f.symbol}</span>
              <span className={f.direction === "LONG" ? "text-bullish" : "text-bearish"}>
                {f.direction}
              </span>
              <span className="text-muted-foreground font-mono">
                Score: {f.v7Score?.toFixed(1) ?? "—"}
              </span>
              <Badge
                variant="outline"
                className={`text-[9px] h-3.5 px-1 ${
                  f.passed
                    ? "bg-bullish/15 text-bullish border-bullish/30"
                    : "bg-bearish/15 text-bearish border-bearish/30"
                }`}
              >
                {f.passed ? "PASS" : "BLOCK"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
