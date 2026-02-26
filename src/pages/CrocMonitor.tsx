import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  Snowflake,
  BarChart3,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

// ────────────────────────────────────────────
// Color helpers
// ────────────────────────────────────────────
const BULL_COLOR = "hsl(142, 71%, 45%)";
const BEAR_COLOR = "hsl(0, 84%, 60%)";
const NEUTRAL_COLOR = "hsl(38, 92%, 50%)";

const heatColor = (val: number | null) => {
  if (val == null) return "bg-muted text-muted-foreground";
  if (val >= 70) return "bg-bullish/30 text-bullish";
  if (val >= 40) return "bg-neutral/30 text-neutral";
  return "bg-bearish/30 text-bearish";
};

const TIME_RANGES = [
  { label: "30T", days: 30 },
  { label: "60T", days: 60 },
  { label: "90T", days: 90 },
] as const;

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────
export default function CrocMonitor() {
  const [timeRange, setTimeRange] = useState<number>(30);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("ALL");

  // ── Active ICE Signals ──
  const iceQuery = useQuery({
    queryKey: ["all-ice-signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("croc_ice_signals")
        .select(
          "symbol, signal_type, direction, signal_strength, trigger_price, stop_price, expiry_date, signal_date"
        )
        .eq("is_active", true)
        .order("symbol")
        .order("signal_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // ── Score Heatmap ──
  const crocScoresQuery = useQuery({
    queryKey: ["croc-scores-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategy_analysis_cache")
        .select(
          "symbol, analysis_date, ichimoku_long, ichimoku_short, technical_score_long, technical_score_short"
        )
        .order("analysis_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      const latest = new Map<string, (typeof data)[0]>();
      for (const d of data) {
        if (!latest.has(d.symbol)) latest.set(d.symbol, d);
      }
      return Array.from(latest.values());
    },
  });

  // ── Historical ICE signals for timeline chart ──
  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - timeRange);
    return d.toISOString().split("T")[0];
  }, [timeRange]);

  const timelineQuery = useQuery({
    queryKey: ["ice-timeline", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("croc_ice_signals")
        .select(
          "symbol, signal_type, direction, signal_strength, signal_date"
        )
        .gte("signal_date", cutoffDate)
        .order("signal_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // ── CROC Status indicators ──
  const crocStatusQuery = useQuery({
    queryKey: ["croc-status-overview"],
    queryFn: async () => {
      // Fetch latest CROC_STATUS, CROC_DISTANCE, CROC_EXHAUSTION per symbol
      const { data, error } = await supabase
        .from("technical_indicators")
        .select("symbol, date, indicator_name, value_1")
        .in("indicator_name", [
          "CROC_STATUS",
          "CROC_DISTANCE",
          "CROC_EXHAUSTION",
        ])
        .order("date", { ascending: false })
        .limit(300);
      if (error) throw error;

      // Reduce to latest per symbol+indicator
      const map = new Map<string, { status: number | null; distance: number | null; exhaustion: number | null }>();
      const seen = new Set<string>();
      for (const row of data) {
        const key = `${row.symbol}::${row.indicator_name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!map.has(row.symbol)) {
          map.set(row.symbol, { status: null, distance: null, exhaustion: null });
        }
        const entry = map.get(row.symbol)!;
        if (row.indicator_name === "CROC_STATUS") entry.status = row.value_1;
        if (row.indicator_name === "CROC_DISTANCE") entry.distance = row.value_1;
        if (row.indicator_name === "CROC_EXHAUSTION") entry.exhaustion = row.value_1;
      }

      return Array.from(map.entries())
        .map(([symbol, vals]) => ({ symbol, ...vals }))
        .sort((a, b) => a.symbol.localeCompare(b.symbol));
    },
  });

  // ── Derived data ──

  // Group active ICE signals by symbol
  const grouped = useMemo(() => {
    const m = new Map<string, NonNullable<typeof iceQuery.data>>();
    for (const s of iceQuery.data ?? []) {
      if (!m.has(s.symbol)) m.set(s.symbol, []);
      m.get(s.symbol)!.push(s);
    }
    return m;
  }, [iceQuery.data]);

  // Available symbols from timeline data
  const allTimelineSymbols = useMemo(() => {
    const s = new Set<string>();
    for (const row of timelineQuery.data ?? []) s.add(row.symbol);
    return Array.from(s).sort();
  }, [timelineQuery.data]);

  // Build chart data: aggregate per date with BULL as positive and BEAR as negative
  const chartData = useMemo(() => {
    const rows = timelineQuery.data ?? [];
    const filtered =
      selectedSymbol === "ALL"
        ? rows
        : rows.filter((r) => r.symbol === selectedSymbol);

    // Group by date
    const byDate = new Map<string, { bull: number; bear: number }>();
    for (const row of filtered) {
      const d = row.signal_date;
      if (!d) continue;
      if (!byDate.has(d)) byDate.set(d, { bull: 0, bear: 0 });
      const entry = byDate.get(d)!;
      const strength = row.signal_strength ?? 1;
      if (row.direction === "BULL" || row.direction === "LONG") {
        entry.bull += strength;
      } else {
        entry.bear -= strength; // negative for bear
      }
    }

    return Array.from(byDate.entries())
      .map(([date, vals]) => ({
        date,
        dateShort: date.slice(5), // MM-DD
        bull: vals.bull,
        bear: vals.bear,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [timelineQuery.data, selectedSymbol]);

  // ────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
        <Activity className="h-6 w-6 text-primary" />
        CROC/ICE Monitor
      </h1>

      {/* ── CROC Status Overview ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-sm font-semibold text-foreground">
            CROC Status
          </h2>
        </div>
        <div className="card-elevated rounded-xl border border-border/50 p-4">
          {crocStatusQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Lade...</p>
          ) : !crocStatusQuery.data?.length ? (
            <p className="text-sm text-muted-foreground">
              Keine CROC-Daten vorhanden
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
              {crocStatusQuery.data.map((d) => {
                const isBull = d.status === 1;
                const isBear = d.status === -1;
                const statusLabel = isBull
                  ? "Bullish"
                  : isBear
                  ? "Bearish"
                  : "Neutral";
                const statusColor = isBull
                  ? "text-bullish"
                  : isBear
                  ? "text-bearish"
                  : "text-muted-foreground";
                const ringColor = isBull
                  ? "ring-bullish/40"
                  : isBear
                  ? "ring-bearish/40"
                  : "ring-muted-foreground/30";
                const bgColor = isBull
                  ? "bg-bullish/10"
                  : isBear
                  ? "bg-bearish/10"
                  : "bg-muted/50";
                const StatusIcon = isBull
                  ? TrendingUp
                  : isBear
                  ? TrendingDown
                  : Minus;

                return (
                  <div
                    key={d.symbol}
                    className={`rounded-lg border border-border/30 p-3 ring-1 ${ringColor} ${bgColor}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-bold text-foreground">
                        {d.symbol}
                      </span>
                      <div
                        className={`flex items-center gap-1 ${statusColor}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        <span className="text-xs font-semibold">
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div className="rounded px-1.5 py-1 bg-background/60 text-center">
                        <span className="text-muted-foreground">Dist</span>
                        <div className="font-mono font-bold text-foreground">
                          {d.distance != null
                            ? `${Number(d.distance).toFixed(1)}%`
                            : "\u2014"}
                        </div>
                      </div>
                      <div className="rounded px-1.5 py-1 bg-background/60 text-center">
                        <span className="text-muted-foreground">Exhaust</span>
                        <div className="font-mono font-bold text-foreground">
                          {d.exhaustion != null
                            ? Number(d.exhaustion).toFixed(1)
                            : "\u2014"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Score Heatmap ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-sm font-semibold text-foreground">
            Score Heatmap
          </h2>
        </div>
        <div className="card-elevated rounded-xl border border-border/50 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(crocScoresQuery.data ?? []).map((d) => (
              <div
                key={d.symbol}
                className="rounded-lg border border-border/30 p-3"
              >
                <div className="font-mono text-sm font-bold text-foreground mb-2">
                  {d.symbol}
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div
                    className={`rounded px-1.5 py-1 text-center ${heatColor(
                      d.technical_score_long
                    )}`}
                  >
                    L:{" "}
                    {d.technical_score_long != null
                      ? Number(d.technical_score_long).toFixed(0)
                      : "\u2014"}
                  </div>
                  <div
                    className={`rounded px-1.5 py-1 text-center ${heatColor(
                      d.technical_score_short
                    )}`}
                  >
                    S:{" "}
                    {d.technical_score_short != null
                      ? Number(d.technical_score_short).toFixed(0)
                      : "\u2014"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Signal Timeline Chart ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-sm font-semibold text-foreground">
              Signal-Timeline
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Symbol selector */}
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue placeholder="Symbol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle</SelectItem>
                {allTimelineSymbols.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Time range buttons */}
            <div className="flex gap-1">
              {TIME_RANGES.map((r) => (
                <Button
                  key={r.days}
                  size="sm"
                  variant={timeRange === r.days ? "default" : "outline"}
                  className="h-8 px-3 text-xs"
                  onClick={() => setTimeRange(r.days)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="card-elevated rounded-xl border border-border/50 p-4">
          {timelineQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Lade Timeline...</p>
          ) : chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine Signaldaten im Zeitraum
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="bullGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BULL_COLOR} stopOpacity={0.4} />
                    <stop
                      offset="95%"
                      stopColor={BULL_COLOR}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                  <linearGradient id="bearGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BEAR_COLOR} stopOpacity={0.05} />
                    <stop
                      offset="95%"
                      stopColor={BEAR_COLOR}
                      stopOpacity={0.4}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.4}
                />
                <XAxis
                  dataKey="dateShort"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number, name: string) => [
                    value.toFixed(1),
                    name === "bull" ? "Bullish" : "Bearish",
                  ]}
                  labelFormatter={(label) => `Datum: ${label}`}
                />
                <ReferenceLine
                  y={0}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="bull"
                  stroke={BULL_COLOR}
                  fill="url(#bullGrad)"
                  fillOpacity={1}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="bear"
                  stroke={BEAR_COLOR}
                  fill="url(#bearGrad)"
                  fillOpacity={1}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ── Active ICE Signals grouped by symbol ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Snowflake className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-sm font-semibold text-foreground">
            Aktive ICE-Signale
          </h2>
          <span className="text-xs text-muted-foreground font-mono ml-1">
            ({iceQuery.data?.length ?? 0})
          </span>
        </div>
        <div className="card-elevated rounded-xl border border-border/50 p-4">
          {grouped.size === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine aktiven Signale
            </p>
          ) : (
            <div className="space-y-4">
              {Array.from(grouped.entries()).map(([symbol, signals]) => (
                <div key={symbol}>
                  <h3 className="font-mono text-sm font-bold text-foreground mb-2">
                    {symbol}
                  </h3>
                  <div className="space-y-1">
                    {signals!.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                              s.direction === "LONG"
                                ? "bg-bullish/15 text-bullish"
                                : "bg-bearish/15 text-bearish"
                            }`}
                          >
                            {s.direction}
                          </span>
                          <span className="text-muted-foreground">
                            {s.signal_type}
                          </span>
                          <span className="text-muted-foreground">
                            <Activity className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                            {s.signal_strength}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">
                            T:{" "}
                            <span className="font-mono text-foreground">
                              ${Number(s.trigger_price).toFixed(2)}
                            </span>
                          </span>
                          <span className="text-muted-foreground">
                            S:{" "}
                            <span className="font-mono text-foreground">
                              ${Number(s.stop_price).toFixed(2)}
                            </span>
                          </span>
                          {s.expiry_date && (
                            <span className="text-muted-foreground">
                              Exp: {s.expiry_date}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
