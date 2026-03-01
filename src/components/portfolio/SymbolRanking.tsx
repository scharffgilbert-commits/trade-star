import { usePnlBySymbol } from "@/hooks/usePnlBySymbol";
import { Medal, ArrowUp, ArrowDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SymbolRankingProps {
  accountId: number;
}

export default function SymbolRanking({ accountId }: SymbolRankingProps) {
  const { symbolPnl, isLoading } = usePnlBySymbol(accountId);

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Medal className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Symbol-Ranking</h2>
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (symbolPnl.length === 0) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Medal className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Symbol-Ranking</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">Keine Daten vorhanden.</p>
      </div>
    );
  }

  // Sort by totalPnl descending
  const sorted = [...symbolPnl].sort((a, b) => b.totalPnl - a.totalPnl);
  const maxAbsPnl = Math.max(...sorted.map((s) => Math.abs(s.totalPnl)), 1);

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Medal className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Symbol-Ranking</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">{sorted.length} Symbole</span>
      </div>

      <div className="space-y-1 max-h-[350px] overflow-y-auto">
        {sorted.map((s, i) => {
          const barWidth = (Math.abs(s.totalPnl) / maxAbsPnl) * 100;
          const isPositive = s.totalPnl >= 0;

          return (
            <div key={s.symbol} className="flex items-center gap-2 py-1">
              {/* Rank */}
              <span className="text-[10px] text-muted-foreground w-5 text-right font-mono">
                {i + 1}.
              </span>

              {/* Symbol */}
              <span className="font-mono text-xs font-bold text-foreground w-16 truncate">
                {s.symbol.replace(".DE", "")}
              </span>

              {/* Bar */}
              <div className="flex-1 relative h-5">
                <div
                  className={cn(
                    "absolute top-0 h-full rounded-sm transition-all",
                    isPositive ? "bg-bullish/20 left-0" : "bg-bearish/20 right-0"
                  )}
                  style={{ width: `${Math.max(barWidth, 2)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-end px-1">
                  <span className={cn(
                    "font-mono text-[10px] font-semibold",
                    isPositive ? "text-bullish" : "text-bearish"
                  )}>
                    {isPositive ? "+" : ""}${s.totalPnl.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Trades + WR */}
              <span className="text-[10px] text-muted-foreground w-14 text-right">
                {s.tradeCount}T · {s.tradeCount > 0 ? ((s.winCount / s.tradeCount) * 100).toFixed(0) : "—"}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
