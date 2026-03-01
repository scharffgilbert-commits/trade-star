import { useMemo } from "react";
import { useExitReasonAnalysis } from "@/hooks/useExitReasonAnalysis";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ExitReasonChartProps {
  accountId: number;
}

const exitLabels: Record<string, string> = {
  STOP_LOSS: "Stop-Loss",
  TRAILING_STOP: "Trailing Stop",
  TAKE_PROFIT: "Take Profit",
  PREMIUM_COUNTER: "Premium Counter",
  MAX_HOLDING: "Max Holding",
  MANUAL: "Manuell",
  AUTO_SIGNAL: "Auto Signal",
  AUTO_RULE: "Auto Regel",
  BACKTEST_END: "Backtest Ende",
  EXPIRED: "Abgelaufen",
  UNKNOWN: "Unbekannt",
};

export default function ExitReasonChart({ accountId }: ExitReasonChartProps) {
  const { exitReasons, isLoading } = useExitReasonAnalysis(accountId);

  const chartData = useMemo(
    () => exitReasons.map((er) => ({
      name: exitLabels[er.trigger_source] ?? er.trigger_source,
      count: er.count,
      pnl: er.totalPnl,
      winRate: er.winRate,
      source: er.trigger_source,
    })),
    [exitReasons]
  );

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <LogOut className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Exit-Analyse</h2>
        </div>
        <Skeleton className="h-[200px] rounded-lg" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <LogOut className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Exit-Analyse</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">Keine Exit-Daten vorhanden.</p>
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <LogOut className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">Exit-Analyse</h2>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-3 mb-3">
        {chartData.map((d) => (
          <div key={d.source} className="flex items-center gap-1.5 text-[10px]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.pnl >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)" }} />
            <span className="text-muted-foreground">{d.name}:</span>
            <span className="font-mono font-semibold text-foreground">{d.count}</span>
            <span className={cn("font-mono", d.pnl >= 0 ? "text-bullish" : "text-bearish")}>
              ({d.winRate.toFixed(0)}% WR)
            </span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 14%, 16%)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(228, 18%, 10%)",
              border: "1px solid hsl(228, 14%, 16%)",
              borderRadius: 8,
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            formatter={(value: number, name: string) => [
              name === "count" ? `${value} Trades` : `$${value.toFixed(2)}`,
              name === "count" ? "Trades" : "P&L",
            ]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.pnl >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
