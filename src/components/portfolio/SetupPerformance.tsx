import { useSetupPerformance } from "@/hooks/useSetupPerformance";
import { Crosshair, Trophy, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SetupPerformanceProps {
  accountId: number;
}

export default function SetupPerformance({ accountId }: SetupPerformanceProps) {
  const { setupPerformance, isLoading } = useSetupPerformance(accountId);

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Crosshair className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Setup-Performance</h2>
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (setupPerformance.length === 0) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Crosshair className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Setup-Performance</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">Keine Setup-Daten vorhanden.</p>
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Crosshair className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">Setup-Performance</h2>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px]">Setup</TableHead>
              <TableHead className="text-[10px] text-right">Trades</TableHead>
              <TableHead className="text-[10px] text-right">Win Rate</TableHead>
              <TableHead className="text-[10px] text-right">P&L</TableHead>
              <TableHead className="text-[10px] text-right">Ø P&L</TableHead>
              <TableHead className="text-[10px] text-right">PF</TableHead>
              <TableHead className="text-[10px] text-right">Ø Tage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {setupPerformance.map((sp) => (
              <TableRow key={sp.setup_type}>
                <TableCell className="font-medium text-xs text-foreground">{sp.setup_type}</TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {sp.totalTrades}
                  <span className="ml-1 text-[9px]">
                    (<span className="text-bullish">{sp.wins}</span>/<span className="text-bearish">{sp.losses}</span>)
                  </span>
                </TableCell>
                <TableCell className={cn(
                  "text-right font-mono text-xs font-semibold",
                  sp.winRate >= 60 ? "text-bullish" : sp.winRate >= 45 ? "text-neutral" : "text-bearish"
                )}>
                  {sp.winRate.toFixed(1)}%
                </TableCell>
                <TableCell className={cn(
                  "text-right font-mono text-xs font-semibold",
                  sp.totalPnl >= 0 ? "text-bullish" : "text-bearish"
                )}>
                  {sp.totalPnl >= 0 ? "+" : ""}${sp.totalPnl.toFixed(0)}
                </TableCell>
                <TableCell className={cn(
                  "text-right font-mono text-xs",
                  sp.avgPnl >= 0 ? "text-bullish" : "text-bearish"
                )}>
                  {sp.avgPnl >= 0 ? "+" : ""}${sp.avgPnl.toFixed(0)}
                </TableCell>
                <TableCell className={cn(
                  "text-right font-mono text-xs",
                  sp.profitFactor >= 1.5 ? "text-bullish" : sp.profitFactor >= 1 ? "text-neutral" : "text-bearish"
                )}>
                  {sp.profitFactor === Infinity ? "∞" : sp.profitFactor.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {sp.avgHoldingDays.toFixed(1)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
