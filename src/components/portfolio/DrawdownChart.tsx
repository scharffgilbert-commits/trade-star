import { useMemo } from "react";
import { useBalanceSnapshots } from "@/hooks/useBalanceSnapshots";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DrawdownChartProps {
  accountId: number;
}

export default function DrawdownChart({ accountId }: DrawdownChartProps) {
  const { snapshots, isLoading } = useBalanceSnapshots(accountId);

  const chartData = useMemo(() => {
    if (snapshots.length === 0) return [];

    let peak = Number(snapshots[0].balance);
    return snapshots.map((s) => {
      const balance = Number(s.balance);
      if (balance > peak) peak = balance;
      const drawdown = peak > 0 ? ((balance - peak) / peak) * 100 : 0;
      return {
        date: new Date(s.snapshot_date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
        drawdown: Number(drawdown.toFixed(2)),
      };
    });
  }, [snapshots]);

  const maxDD = chartData.length > 0
    ? Math.min(...chartData.map((d) => d.drawdown)).toFixed(2)
    : "0.00";

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="h-4 w-4 text-bearish" />
          <h2 className="font-display text-sm font-semibold text-foreground">Drawdown-Analyse</h2>
        </div>
        <Skeleton className="h-[200px] rounded-lg" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="h-4 w-4 text-bearish" />
          <h2 className="font-display text-sm font-semibold text-foreground">Drawdown-Analyse</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">Keine Daten vorhanden.</p>
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-bearish" />
          <h2 className="font-display text-sm font-semibold text-foreground">Drawdown-Analyse</h2>
        </div>
        <span className="text-xs font-mono text-bearish">
          Max: {maxDD}%
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="drawdownGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 14%, 16%)" />
          <XAxis
            dataKey="date"
            tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            domain={["auto", 0]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(228, 18%, 10%)",
              border: "1px solid hsl(228, 14%, 16%)",
              borderRadius: 8,
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, "Drawdown"]}
          />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="hsl(0, 84%, 60%)"
            strokeWidth={1.5}
            fill="url(#drawdownGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
