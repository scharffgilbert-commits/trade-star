import { useCandlestickPatterns, PATTERN_NAMES } from "@/hooks/useCandlestickPatterns";
import { CandlestickChart, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CandlestickPatternCardProps {
  symbol: string;
}

export default function CandlestickPatternCard({ symbol }: CandlestickPatternCardProps) {
  const { summary, patterns, history, isLoading } = useCandlestickPatterns(symbol);

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CandlestickChart className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Candlestick Patterns</h2>
        </div>
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }

  const dirIcon = (dir: number) => {
    if (dir > 0) return <TrendingUp className="h-3.5 w-3.5 text-bullish" />;
    if (dir < 0) return <TrendingDown className="h-3.5 w-3.5 text-bearish" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const dirColor = (dir: number) =>
    dir > 0 ? "text-bullish" : dir < 0 ? "text-bearish" : "text-muted-foreground";

  const dirBg = (dir: number) =>
    dir > 0 ? "bg-bullish/10 border-bullish/30" : dir < 0 ? "bg-bearish/10 border-bearish/30" : "bg-muted/30 border-border/50";

  const strengthStars = (s: number) => "★".repeat(s) + "☆".repeat(3 - s);

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <CandlestickChart className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">Candlestick Patterns</h2>
      </div>

      {/* Primäres Pattern */}
      {summary && summary.primaryCode > 0 ? (
        <div className={cn("rounded-lg border p-3 mb-3", dirBg(summary.direction))}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {dirIcon(summary.direction)}
              <span className={cn("font-display text-sm font-bold", dirColor(summary.direction))}>
                {PATTERN_NAMES[summary.primaryCode] ?? "Unbekannt"}
              </span>
            </div>
            <span className="text-amber-400 text-xs tracking-wider">
              {strengthStars(summary.strength)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>
              Richtung:{" "}
              <span className={cn("font-semibold", dirColor(summary.direction))}>
                {summary.direction > 0 ? "Bullish" : summary.direction < 0 ? "Bearish" : "Neutral"}
              </span>
            </span>
            <span>
              Stärke: <span className="font-semibold text-foreground">{summary.strength}/3</span>
            </span>
            <span>
              Patterns: <span className="font-semibold text-foreground">{summary.patternCount}</span>
            </span>
          </div>
          {summary.secondaryCode > 0 && (
            <div className="mt-1 text-[10px] text-muted-foreground">
              Sekundär: <span className="font-medium text-foreground">{PATTERN_NAMES[summary.secondaryCode]}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 bg-muted/20 p-3 mb-3 text-center">
          <span className="text-xs text-muted-foreground">Keine Candlestick-Patterns erkannt</span>
        </div>
      )}

      {/* Einzelne Patterns */}
      {patterns.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {patterns.map((p) => {
            const name = p.indicator_name.replace("CANDLE_", "").replace(/_/g, " ");
            const dir = Number(p.value_1);
            return (
              <Badge
                key={p.indicator_name}
                variant="outline"
                className={cn(
                  "text-[9px] px-1.5 py-0 h-5",
                  dir > 0
                    ? "bg-bullish/10 text-bullish border-bullish/30"
                    : dir < 0
                    ? "bg-bearish/10 text-bearish border-bearish/30"
                    : "bg-muted/30 text-muted-foreground border-border/50"
                )}
              >
                {name}
              </Badge>
            );
          })}
        </div>
      )}

      {/* 5-Tage Historie */}
      {history.length > 1 && (
        <div>
          <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
            Letzte 5 Tage
          </h3>
          <div className="space-y-1">
            {history.map((h) => (
              <div
                key={h.date}
                className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-muted/20"
              >
                <span className="text-muted-foreground font-mono">
                  {new Date(h.date).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </span>
                <div className="flex items-center gap-2">
                  {h.primaryCode > 0 ? (
                    <>
                      {dirIcon(h.direction)}
                      <span className={cn("font-medium", dirColor(h.direction))}>
                        {PATTERN_NAMES[h.primaryCode]}
                      </span>
                      <span className="text-amber-400/70 text-[9px]">
                        {strengthStars(h.strength)}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
