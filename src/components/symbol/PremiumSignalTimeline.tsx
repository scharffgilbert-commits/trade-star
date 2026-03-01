import { usePremiumSignals } from "@/hooks/usePremiumSignals";
import { Zap, ArrowUp, ArrowDown, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PremiumSignalTimelineProps {
  symbol: string;
}

export default function PremiumSignalTimeline({ symbol }: PremiumSignalTimelineProps) {
  const { signals, isLoading } = usePremiumSignals(symbol, 90);

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-yellow-400" />
          <h2 className="font-display text-sm font-semibold text-foreground">Premium-Signale (90 Tage)</h2>
        </div>
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-400" />
          <h2 className="font-display text-sm font-semibold text-foreground">Premium-Signale (90 Tage)</h2>
        </div>
        {signals.length > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-yellow-400/30 text-yellow-400">
            {signals.length} Signale
          </Badge>
        )}
      </div>

      {signals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Keine Premium-Signale in den letzten 90 Tagen.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {signals.map((signal) => {
            const isLong = signal.direction === "BULL" || signal.direction === "LONG";
            return (
              <div
                key={signal.id}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-lg",
                  signal.is_active
                    ? isLong ? "bg-bullish/5 border border-bullish/20" : "bg-bearish/5 border border-bearish/20"
                    : "bg-muted/20"
                )}
              >
                {/* Direction */}
                <div className={cn("p-1 rounded", isLong ? "bg-bullish/15" : "bg-bearish/15")}>
                  {isLong ? (
                    <ArrowUp className="h-3 w-3 text-bullish" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-bearish" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">{signal.signal_type}</span>
                    {signal.is_active && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-yellow-400/30 text-yellow-400">
                        AKTIV
                      </Badge>
                    )}
                  </div>
                  {signal.notes && (
                    <p className="text-[10px] text-muted-foreground truncate">{signal.notes}</p>
                  )}
                </div>

                {/* Score + Date */}
                <div className="text-right shrink-0">
                  <div className={cn(
                    "font-mono text-xs font-bold",
                    signal.signal_score >= 80 ? "text-bullish" : signal.signal_score >= 60 ? "text-neutral" : "text-muted-foreground"
                  )}>
                    {signal.signal_score.toFixed(0)}
                  </div>
                  <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(signal.signal_date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
