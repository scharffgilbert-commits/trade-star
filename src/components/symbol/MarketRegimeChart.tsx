import { useMemo } from "react";
import { useMarketRegimes } from "@/hooks/useMarketRegimes";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MarketRegimeChartProps {
  symbol: string;
}

const regimeToNum: Record<string, number> = {
  TRENDING_UP: 80,
  SIDEWAYS: 50,
  VOLATILE: 35,
  TRENDING_DOWN: 20,
};

const regimeColors: Record<string, string> = {
  TRENDING_UP: "hsl(142, 71%, 45%)",
  SIDEWAYS: "hsl(215, 12%, 55%)",
  VOLATILE: "hsl(45, 93%, 47%)",
  TRENDING_DOWN: "hsl(0, 84%, 60%)",
};

const regimeLabels: Record<string, string> = {
  TRENDING_UP: "Aufwärtstrend",
  TRENDING_DOWN: "Abwärtstrend",
  SIDEWAYS: "Seitwärts",
  VOLATILE: "Volatil",
};

export default function MarketRegimeChart({ symbol }: MarketRegimeChartProps) {
  const { regimes, isLoading } = useMarketRegimes(symbol, 180);

  const chartData = useMemo(
    () =>
      regimes.map((r) => ({
        date: new Date(r.analysis_date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
        value: regimeToNum[r.regime] ?? 50,
        confidence: r.confidence,
        regime: r.regime,
        color: regimeColors[r.regime] ?? regimeColors.SIDEWAYS,
      })),
    [regimes]
  );

  const latestRegime = regimes.length > 0 ? regimes[regimes.length - 1] : null;

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Market Regime</h2>
        </div>
        <Skeleton className="h-[200px] rounded-lg" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Market Regime</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">Keine Regime-Daten für {symbol}.</p>
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Market Regime (180 Tage)</h2>
        </div>
        {latestRegime && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              latestRegime.regime === "TRENDING_UP" && "border-bullish/30 text-bullish",
              latestRegime.regime === "TRENDING_DOWN" && "border-bearish/30 text-bearish",
              latestRegime.regime === "SIDEWAYS" && "border-neutral/30 text-neutral",
              latestRegime.regime === "VOLATILE" && "border-yellow-400/30 text-yellow-400"
            )}
          >
            {regimeLabels[latestRegime.regime] ?? latestRegime.regime} ({latestRegime.confidence?.toFixed(0) ?? "—"}%)
          </Badge>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="regimeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
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
            domain={[0, 100]}
            ticks={[20, 50, 80]}
            tickFormatter={(v) =>
              v === 80 ? "↑Bull" : v === 50 ? "→Side" : v === 20 ? "↓Bear" : ""
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(228, 18%, 10%)",
              border: "1px solid hsl(228, 14%, 16%)",
              borderRadius: 8,
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            formatter={(value: number, _name: string, props: { payload?: { regime?: string; confidence?: number } }) => {
              const regime = props.payload?.regime ?? "";
              const conf = props.payload?.confidence?.toFixed(0) ?? "";
              return [`${regimeLabels[regime] ?? regime} (${conf}%)`, "Regime"];
            }}
          />
          <ReferenceLine y={50} stroke="hsl(215, 12%, 25%)" strokeDasharray="4 4" />
          <Area
            type="stepAfter"
            dataKey="value"
            stroke="hsl(217, 91%, 60%)"
            strokeWidth={2}
            fill="url(#regimeGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
