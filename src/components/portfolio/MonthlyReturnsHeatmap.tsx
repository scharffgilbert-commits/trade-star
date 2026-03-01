import { useMemo } from "react";
import { useMonthlyReturns } from "@/hooks/useMonthlyReturns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MonthlyReturnsHeatmapProps {
  accountId: number;
}

export default function MonthlyReturnsHeatmap({ accountId }: MonthlyReturnsHeatmapProps) {
  const { monthlyReturns, isLoading } = useMonthlyReturns(accountId);

  const positive = monthlyReturns.filter((m) => m.returnPct >= 0).length;

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Monatliche Returns</h2>
        </div>
        <Skeleton className="h-[200px] rounded-lg" />
      </div>
    );
  }

  if (monthlyReturns.length === 0) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Monatliche Returns</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">Keine Daten vorhanden.</p>
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Monatliche Returns</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {positive}/{monthlyReturns.length} profitabel
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={monthlyReturns} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 14%, 16%)" vertical={false} />
          <XAxis
            dataKey="monthLabel"
            tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(228, 18%, 10%)",
              border: "1px solid hsl(228, 14%, 16%)",
              borderRadius: 8,
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            formatter={(value: number) => [`${value >= 0 ? "+" : ""}${value.toFixed(2)}%`, "Return"]}
          />
          <ReferenceLine y={0} stroke="hsl(215, 12%, 35%)" />
          <Bar dataKey="returnPct" radius={[4, 4, 0, 0]}>
            {monthlyReturns.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.returnPct >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
