import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, TrendingUp, Filter, Target, ShieldAlert, Trophy, CalendarDays, List, BarChart3 } from "lucide-react";

// --- Helpers ---

function confidenceToGrade(conf: number | null): string {
  if (conf == null) return "\u2014";
  if (conf >= 85) return "A+";
  if (conf >= 75) return "A";
  if (conf >= 65) return "B+";
  if (conf >= 55) return "B";
  if (conf >= 45) return "C+";
  if (conf >= 35) return "C";
  if (conf >= 25) return "D";
  return "F";
}

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "bg-bullish/15 text-bullish border-bullish/30";
  if (grade.startsWith("B")) return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (grade.startsWith("C")) return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  if (grade === "D") return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  if (grade === "F") return "bg-bearish/15 text-bearish border-bearish/30";
  return "bg-muted text-muted-foreground border-border";
}

function gradeBucket(grade: string): string {
  if (grade === "A+" || grade === "A") return "A+/A";
  if (grade === "B+" || grade === "B") return "B+/B";
  if (grade === "C+" || grade === "C") return "C+/C";
  return "D/F";
}

const actionColors: Record<string, string> = {
  LONG: "bg-bullish/15 text-bullish border-bullish/30",
  SHORT: "bg-bearish/15 text-bearish border-bearish/30",
  CASH: "bg-neutral/15 text-neutral border-neutral/30",
};

type DateRange = "week" | "month" | "quarter" | "all";

function getDateCutoff(range: DateRange): string | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "week") now.setDate(now.getDate() - 7);
  else if (range === "month") now.setMonth(now.getMonth() - 1);
  else if (range === "quarter") now.setMonth(now.getMonth() - 3);
  return now.toISOString();
}

// --- Strand Bar (larger version for expanded row) ---

function StrandBarLarge({
  label,
  longVal,
  shortVal,
  color,
}: {
  label: string;
  longVal: number | null;
  shortVal: number | null;
  color: string;
}) {
  const primary = longVal ?? shortVal;
  const secondary = longVal != null && shortVal != null ? shortVal : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <div className="flex gap-2 text-xs font-mono">
          {longVal != null && (
            <span className="text-bullish">L: {longVal.toFixed(0)}</span>
          )}
          {shortVal != null && (
            <span className="text-bearish">S: {shortVal.toFixed(0)}</span>
          )}
        </div>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden relative">
        {primary != null && (
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, Math.max(0, primary))}%`,
              backgroundColor: color,
            }}
          />
        )}
        {secondary != null && (
          <div
            className="absolute top-0 h-full rounded-full opacity-40"
            style={{
              width: `${Math.min(100, Math.max(0, secondary))}%`,
              backgroundColor: color,
            }}
          />
        )}
      </div>
    </div>
  );
}

// For S2 (single confidence value)
function StrandBarSingle({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="text-xs font-mono text-muted-foreground">
          {value != null ? `${value.toFixed(0)}%` : "\u2014"}
        </span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, Math.max(0, value ?? 0))}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

// --- Performance Attribution Panel ---

interface PerformanceRow {
  bucket: string;
  total: number;
  hits: number;
  hitRate: number;
  avgPnl: number;
}

function PerformancePanel({
  decisions,
  positions,
}: {
  decisions: any[];
  positions: any[] | null;
}) {
  const stats = useMemo(() => {
    const buckets = ["A+/A", "B+/B", "C+/C", "D/F"];
    const bucketMap: Record<string, { total: number; hits: number; pnlSum: number; pnlCount: number }> = {};
    buckets.forEach((b) => (bucketMap[b] = { total: 0, hits: 0, pnlSum: 0, pnlCount: 0 }));

    const posMap = new Map<string, any>();
    if (positions) {
      for (const p of positions) {
        if (p.decision_id && p.position_status === "closed") {
          posMap.set(p.decision_id, p);
        }
      }
    }

    for (const d of decisions) {
      const grade = confidenceToGrade(d.confidence_score);
      const bucket = gradeBucket(grade);
      if (!bucketMap[bucket]) continue;
      bucketMap[bucket].total++;

      const pos = posMap.get(d.decision_id);
      if (pos && pos.pnl_percent != null) {
        bucketMap[bucket].pnlCount++;
        bucketMap[bucket].pnlSum += Number(pos.pnl_percent);
        if (Number(pos.pnl_percent) > 0) {
          bucketMap[bucket].hits++;
        }
      }
    }

    return buckets.map((bucket): PerformanceRow => {
      const b = bucketMap[bucket];
      return {
        bucket,
        total: b.total,
        hits: b.hits,
        hitRate: b.pnlCount > 0 ? (b.hits / b.pnlCount) * 100 : 0,
        avgPnl: b.pnlCount > 0 ? b.pnlSum / b.pnlCount : 0,
      };
    });
  }, [decisions, positions]);

  const hasPositionData = positions && positions.some((p) => p.position_status === "closed");

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-yellow-400" />
        <h2 className="font-display text-sm font-semibold text-foreground">
          Performance-Attribution
        </h2>
      </div>

      {!hasPositionData ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          Noch keine Daten &mdash; Performance wird angezeigt, sobald geschlossene Positionen vorliegen.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border/30">
                <th className="text-left p-2 font-medium">Grade</th>
                <th className="text-right p-2 font-medium">Signale</th>
                <th className="text-right p-2 font-medium">Treffer</th>
                <th className="text-right p-2 font-medium">Hit-Rate</th>
                <th className="text-right p-2 font-medium">Avg P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => (
                <tr key={row.bucket} className="border-b border-border/10">
                  <td className="p-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${gradeColor(row.bucket.split("/")[0])}`}
                    >
                      {row.bucket}
                    </Badge>
                  </td>
                  <td className="p-2 text-right font-mono text-foreground">{row.total}</td>
                  <td className="p-2 text-right font-mono text-foreground">{row.hits}</td>
                  <td className="p-2 text-right font-mono text-foreground">
                    {row.hitRate > 0 ? `${row.hitRate.toFixed(1)}%` : "\u2014"}
                  </td>
                  <td
                    className={`p-2 text-right font-mono font-semibold ${
                      row.avgPnl > 0 ? "text-bullish" : row.avgPnl < 0 ? "text-bearish" : "text-muted-foreground"
                    }`}
                  >
                    {row.avgPnl !== 0
                      ? `${row.avgPnl > 0 ? "+" : ""}${row.avgPnl.toFixed(1)}%`
                      : "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Price Level Display ---

function PriceLevel({
  label,
  value,
  color,
  bgColor,
  icon,
}: {
  label: string;
  value: number | null;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}) {
  if (value == null) return null;
  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${bgColor}`}>
      <div className={`flex items-center gap-2 ${color}`}>
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <span className={`font-mono text-sm font-bold ${color}`}>${Number(value).toFixed(2)}</span>
    </div>
  );
}

// --- Expanded Row Detail ---

function ExpandedRowDetail({ d }: { d: any }) {
  return (
    <div className="px-4 pb-4 pt-2 space-y-4">
      {/* 4-Strand Scores + Price Levels side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-elevated rounded-xl border border-border/50 p-4 space-y-3">
          <h3 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            4-Strang-Analyse
          </h3>
          <StrandBarLarge
            label="S1 Technical (30%)"
            longVal={d.strand1_long_score}
            shortVal={d.strand1_short_score}
            color="hsl(217, 91%, 60%)"
          />
          <StrandBarSingle
            label="S2 Elliott Wave (25%)"
            value={d.strand2_confidence}
            color="hsl(270, 60%, 60%)"
          />
          <StrandBarLarge
            label="S3 Volume (25%)"
            longVal={d.strand3_long_score}
            shortVal={d.strand3_short_score}
            color="hsl(142, 71%, 45%)"
          />
          <StrandBarLarge
            label="S4 CROC/ICE (20%)"
            longVal={d.strand4_long_score}
            shortVal={d.strand4_short_score}
            color="hsl(30, 90%, 55%)"
          />
        </div>

        {/* Entry/Stop/TP Levels */}
        <div className="card-elevated rounded-xl border border-border/50 p-4 space-y-3">
          <h3 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Preisniveaus
          </h3>
          <div className="space-y-2">
            <PriceLevel
              label="Entry"
              value={d.entry_price}
              color="text-foreground"
              bgColor="bg-primary/10 border-primary/30"
              icon={<Target className="h-3.5 w-3.5" />}
            />
            <PriceLevel
              label="Stop-Loss"
              value={d.stop_loss}
              color="text-bearish"
              bgColor="bg-bearish/10 border-bearish/30"
              icon={<ShieldAlert className="h-3.5 w-3.5" />}
            />
            <PriceLevel
              label="TP 1"
              value={d.take_profit_1}
              color="text-bullish"
              bgColor="bg-bullish/10 border-bullish/30"
              icon={<TrendingUp className="h-3.5 w-3.5" />}
            />
            <PriceLevel
              label="TP 2"
              value={d.take_profit_2}
              color="text-bullish"
              bgColor="bg-bullish/10 border-bullish/30"
              icon={<TrendingUp className="h-3.5 w-3.5" />}
            />
            <PriceLevel
              label="TP 3"
              value={d.take_profit_3}
              color="text-bullish"
              bgColor="bg-bullish/10 border-bullish/30"
              icon={<TrendingUp className="h-3.5 w-3.5" />}
            />
          </div>

          {/* CROC / ICE meta */}
          <div className="pt-2 border-t border-border/30 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">CROC Status</span>
              <span className="font-mono text-foreground">{d.croc_status ?? "\u2014"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">ICE Signale</span>
              <span className="font-mono text-foreground">
                {d.ice_signals_active != null ? (d.ice_signals_active ? "Aktiv" : "Inaktiv") : "\u2014"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Reasoning */}
      {d.reasoning && (
        <div className="card-elevated rounded-xl border border-border/50 p-4">
          <h3 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            AI-Begr\u00FCndung
          </h3>
          <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
            {d.reasoning}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

export default function SignalsPage() {
  const [viewMode, setViewMode] = useState<"list" | "daily" | "symbol">("daily");
  const [symbolFilter, setSymbolFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [minConfidence, setMinConfidence] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Fetch trading decisions - use symbol filter to get all data for a specific symbol
  const decisionsQuery = useQuery({
    queryKey: ["all-decisions", symbolFilter],
    queryFn: async () => {
      let query = supabase
        .from("trading_decisions")
        .select(
          "decision_id, symbol, decision_timestamp, action_type, confidence_score, reasoning, entry_price, stop_loss, take_profit_1, take_profit_2, take_profit_3, croc_status, ice_signals_active, strand1_signal, strand2_signal, strand3_signal, strand4_signal, strand1_long_score, strand1_short_score, strand2_confidence, strand3_long_score, strand3_short_score, strand4_long_score, strand4_short_score, created_at"
        )
        .order("decision_timestamp", { ascending: false });
      
      // When filtering by symbol, fetch all entries for that symbol
      if (symbolFilter !== "ALL") {
        query = query.eq("symbol", symbolFilter).limit(5000);
      } else {
        query = query.limit(2000);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch demo positions for performance attribution
  const positionsQuery = useQuery({
    queryKey: ["demo-positions-closed"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("demo_positions")
        .select("id, decision_id, symbol, position_type, position_status, pnl_percent, entry_price, exit_price")
        .eq("position_status", "closed");
      if (error) throw error;
      return data as any[];
    },
  });

  const allDecisions = decisionsQuery.data ?? [];

  // Load all active symbols from symbols_master
  const { data: allActiveSymbols } = useQuery({
    queryKey: ["all-active-symbols"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("symbols_master")
        .select("symbol")
        .eq("active", true)
        .order("symbol");
      if (error) throw error;
      return (data as { symbol: string }[]).map((d) => d.symbol);
    },
  });
  const symbols = allActiveSymbols ?? [];

  // Apply filters
  const filtered = useMemo(() => {
    const dateCutoff = getDateCutoff(dateRange);
    return allDecisions.filter((d) => {
      if (symbolFilter !== "ALL" && d.symbol !== symbolFilter) return false;
      if (actionFilter !== "ALL" && d.action_type !== actionFilter) return false;
      if (dateCutoff && d.decision_timestamp && d.decision_timestamp < dateCutoff) return false;
      if (minConfidence > 0 && (d.confidence_score == null || d.confidence_score < minConfidence))
        return false;
      return true;
    });
  }, [allDecisions, symbolFilter, actionFilter, dateRange, minConfidence]);

  // Group filtered decisions by day for daily view
  const dailyGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const d of filtered) {
      const day = d.decision_timestamp
        ? new Date(d.decision_timestamp).toISOString().slice(0, 10)
        : "unknown";
      if (!groups[day]) groups[day] = [];
      groups[day].push(d);
    }
    // Sort days descending
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, decisions]) => ({
        date,
        decisions: decisions.sort((a: any, b: any) => (b.confidence_score ?? 0) - (a.confidence_score ?? 0)),
      }));
  }, [filtered]);

  // Group filtered decisions by symbol for symbol-chronik view
  const symbolGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const d of filtered) {
      if (!groups[d.symbol]) groups[d.symbol] = [];
      groups[d.symbol].push(d);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([symbol, decisions]) => ({
        symbol,
        decisions: decisions.sort((a: any, b: any) => {
          const da = a.decision_timestamp ?? "";
          const db = b.decision_timestamp ?? "";
          return db.localeCompare(da); // newest first
        }),
      }));
  }, [filtered]);

  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());

  const toggleSymbol = (sym: string) => {
    setExpandedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });
  };

  const toggleDay = (day: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const dateRangeButtons: { label: string; value: DateRange }[] = [
    { label: "Letzte Woche", value: "week" },
    { label: "Letzter Monat", value: "month" },
    { label: "Letztes Quartal", value: "quarter" },
    { label: "Alle", value: "all" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-foreground">
        Signale &amp; Entscheidungen
      </h1>

      {/* Performance Attribution Panel */}
      <PerformancePanel
        decisions={allDecisions}
        positions={positionsQuery.data ?? null}
      />

      {/* Filters */}
      <div className="card-elevated rounded-xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-display text-sm font-semibold text-foreground">Filter</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} von {allDecisions.length} Signalen
          </span>
        </div>

        <div className="flex gap-3 flex-wrap items-end">
          {/* Symbol Filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Symbol</label>
            <Select value={symbolFilter} onValueChange={setSymbolFilter}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="Symbol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle</SelectItem>
                {symbols.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Aktion</label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="Aktion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle</SelectItem>
                <SelectItem value="LONG">LONG</SelectItem>
                <SelectItem value="SHORT">SHORT</SelectItem>
                <SelectItem value="CASH">CASH</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Zeitraum</label>
            <div className="flex gap-1">
              {dateRangeButtons.map((btn) => (
                <Button
                  key={btn.value}
                  variant={dateRange === btn.value ? "default" : "outline"}
                  size="sm"
                  className="h-9 text-xs px-2.5"
                  onClick={() => setDateRange(btn.value)}
                >
                  {btn.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Min Confidence Slider */}
          <div className="space-y-1 min-w-[180px]">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Min. Konfidenz: <span className="font-mono text-foreground">{minConfidence}%</span>
            </label>
            <Slider
              value={[minConfidence]}
              onValueChange={(val) => setMinConfidence(val[0])}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1">
          <Button
            variant={viewMode === "daily" ? "default" : "outline"}
            size="sm"
            className="h-9 text-xs px-2.5 gap-1.5"
            onClick={() => setViewMode("daily")}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Tagesansicht
          </Button>
          <Button
            variant={viewMode === "symbol" ? "default" : "outline"}
            size="sm"
            className="h-9 text-xs px-2.5 gap-1.5"
            onClick={() => setViewMode("symbol")}
          >
            <BarChart3 className="h-3.5 w-3.5" /> Symbol-Chronik
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            className="h-9 text-xs px-2.5 gap-1.5"
            onClick={() => setViewMode("list")}
          >
            <List className="h-3.5 w-3.5" /> Liste
          </Button>
        </div>
      </div>

      {/* Daily View */}
      {viewMode === "daily" && (
        <div className="space-y-3">
          {dailyGroups.length === 0 && (
            <div className="card-elevated rounded-xl border border-border/50 p-8 text-center text-sm text-muted-foreground">
              Keine Analysen gefunden.
            </div>
          )}
          {dailyGroups.map(({ date, decisions }) => {
            const isDayExpanded = expandedDays.has(date);
            const longCount = decisions.filter((d: any) => d.action_type === "LONG").length;
            const shortCount = decisions.filter((d: any) => d.action_type === "SHORT").length;
            const cashCount = decisions.filter((d: any) => d.action_type === "CASH").length;
            const avgConf = decisions.reduce((s: number, d: any) => s + (d.confidence_score ?? 0), 0) / decisions.length;
            const formattedDate = date !== "unknown"
              ? new Date(date + "T00:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
              : "Unbekannt";

            return (
              <div key={date} className="card-elevated rounded-xl border border-border/50 overflow-hidden">
                {/* Day Header */}
                <button
                  onClick={() => toggleDay(date)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isDayExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="font-display text-sm font-semibold text-foreground">{formattedDate}</span>
                    <span className="text-xs text-muted-foreground">({decisions.length} Symbole)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {longCount > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-bullish/15 text-bullish border-bullish/30">
                        {longCount} LONG
                      </Badge>
                    )}
                    {shortCount > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-bearish/15 text-bearish border-bearish/30">
                        {shortCount} SHORT
                      </Badge>
                    )}
                    {cashCount > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-neutral/15 text-neutral border-neutral/30">
                        {cashCount} CASH
                      </Badge>
                    )}
                    <span className="text-xs font-mono text-muted-foreground ml-2">
                      ⌀ {avgConf.toFixed(0)}%
                    </span>
                  </div>
                </button>

                {/* Expanded Day Content */}
                {isDayExpanded && (
                  <div className="border-t border-border/30">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground border-b border-border/30 bg-muted/20">
                            <th className="w-8 p-3" />
                            <th className="text-left p-3 font-medium">Symbol</th>
                            <th className="text-left p-3 font-medium">Aktion</th>
                            <th className="text-center p-3 font-medium">Grade</th>
                            <th className="text-right p-3 font-medium">Konfidenz</th>
                            <th className="text-right p-3 font-medium">Entry</th>
                            <th className="text-right p-3 font-medium">Stop</th>
                            <th className="text-right p-3 font-medium">TP1</th>
                            <th className="text-left p-3 font-medium">CROC</th>
                            <th className="text-left p-3 font-medium">Stränge</th>
                          </tr>
                        </thead>
                        <tbody>
                          {decisions.map((d: any, i: number) => {
                            const rowKey = String(d.decision_id ?? `day-${date}-${i}`);
                            const isExpanded = expandedRows.has(rowKey);
                            const grade = confidenceToGrade(d.confidence_score);
                            return (
                              <SignalRow
                                key={rowKey}
                                d={d}
                                rowKey={rowKey}
                                grade={grade}
                                isExpanded={isExpanded}
                                onToggle={toggleRow}
                              />
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Symbol-Chronik View */}
      {viewMode === "symbol" && (
        <div className="space-y-3">
          {symbolGroups.length === 0 && (
            <div className="card-elevated rounded-xl border border-border/50 p-8 text-center text-sm text-muted-foreground">
              Keine Analysen gefunden.
            </div>
          )}
          {symbolGroups.map(({ symbol, decisions }) => {
            const isSymExpanded = expandedSymbols.has(symbol);
            const latestAction = decisions[0]?.action_type;
            const latestConf = decisions[0]?.confidence_score;
            const latestGrade = confidenceToGrade(latestConf);
            const latestDate = decisions[0]?.decision_timestamp
              ? new Date(decisions[0].decision_timestamp).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })
              : "—";

            return (
              <div key={symbol} className="card-elevated rounded-xl border border-border/50 overflow-hidden">
                <button
                  onClick={() => toggleSymbol(symbol)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isSymExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="font-display text-sm font-bold text-foreground">{symbol}</span>
                    <span className="text-xs text-muted-foreground">({decisions.length} Analysen)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">Letztes: {latestDate}</span>
                    {latestAction && (
                      <Badge variant="outline" className={`text-[10px] ${actionColors[latestAction] ?? "bg-muted text-muted-foreground border-border"}`}>
                        {latestAction}
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-[10px] font-bold ${gradeColor(latestGrade)}`}>
                      {latestGrade}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">
                      {latestConf != null ? `${Number(latestConf).toFixed(0)}%` : "—"}
                    </span>
                  </div>
                </button>

                {isSymExpanded && (
                  <div className="border-t border-border/30">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground border-b border-border/30 bg-muted/20">
                            <th className="w-8 p-3" />
                            <th className="text-left p-3 font-medium">Datum</th>
                            <th className="text-left p-3 font-medium">Aktion</th>
                            <th className="text-center p-3 font-medium">Grade</th>
                            <th className="text-right p-3 font-medium">Konfidenz</th>
                            <th className="text-right p-3 font-medium">Entry</th>
                            <th className="text-right p-3 font-medium">Stop</th>
                            <th className="text-right p-3 font-medium">TP1</th>
                            <th className="text-left p-3 font-medium">CROC</th>
                            <th className="text-left p-3 font-medium">Stränge</th>
                          </tr>
                        </thead>
                        <tbody>
                          {decisions.map((d: any, i: number) => {
                            const rowKey = `sym-${symbol}-${d.decision_id ?? i}`;
                            const isExpanded = expandedRows.has(rowKey);
                            const grade = confidenceToGrade(d.confidence_score);
                            return (
                              <SignalRow
                                key={rowKey}
                                d={d}
                                rowKey={rowKey}
                                grade={grade}
                                isExpanded={isExpanded}
                                onToggle={toggleRow}
                              />
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* List View (original table) */}
      {viewMode === "list" && (
        <div className="card-elevated rounded-xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border/30 bg-muted/20">
                  <th className="w-8 p-3" />
                  <th className="text-left p-3 font-medium">Symbol</th>
                  <th className="text-left p-3 font-medium">Datum</th>
                  <th className="text-left p-3 font-medium">Aktion</th>
                  <th className="text-center p-3 font-medium">Grade</th>
                  <th className="text-right p-3 font-medium">Konfidenz</th>
                  <th className="text-right p-3 font-medium">Entry</th>
                  <th className="text-right p-3 font-medium">Stop</th>
                  <th className="text-right p-3 font-medium">TP1</th>
                  <th className="text-left p-3 font-medium">CROC</th>
                  <th className="text-left p-3 font-medium">Stränge</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-sm text-muted-foreground">
                      Keine Signale gefunden.
                    </td>
                  </tr>
                )}
                {filtered.map((d, i) => {
                  const rowKey = String(d.decision_id ?? `row-${i}`);
                  const isExpanded = expandedRows.has(rowKey);
                  const grade = confidenceToGrade(d.confidence_score);
                  return (
                    <SignalRow
                      key={rowKey}
                      d={d}
                      rowKey={rowKey}
                      grade={grade}
                      isExpanded={isExpanded}
                      onToggle={toggleRow}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Signal Row (summary + expandable detail) ---

function SignalRow({
  d,
  rowKey,
  grade,
  isExpanded,
  onToggle,
}: {
  d: any;
  rowKey: string;
  grade: string;
  isExpanded: boolean;
  onToggle: (key: string) => void;
}) {
  return (
    <>
      <tr
        onClick={() => onToggle(rowKey)}
        className={`border-b border-border/10 cursor-pointer transition-colors ${
          isExpanded ? "bg-muted/40" : "hover:bg-muted/20"
        }`}
      >
        <td className="p-3 text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 transition-transform" />
          ) : (
            <ChevronRight className="h-4 w-4 transition-transform" />
          )}
        </td>
        <td className="p-3 font-mono font-bold text-foreground">{d.symbol}</td>
        <td className="p-3 font-mono text-muted-foreground">
          {d.decision_timestamp
            ? new Date(d.decision_timestamp).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              })
            : "\u2014"}
        </td>
        <td className="p-3">
          <span
            className={`font-semibold px-2 py-0.5 rounded border text-[11px] ${
              actionColors[d.action_type] ?? "bg-muted text-muted-foreground border-border"
            }`}
          >
            {d.action_type}
          </span>
        </td>
        <td className="p-3 text-center">
          <Badge variant="outline" className={`text-[10px] font-bold ${gradeColor(grade)}`}>
            {grade}
          </Badge>
        </td>
        <td className="p-3 text-right font-mono text-foreground">
          {d.confidence_score != null ? `${Number(d.confidence_score).toFixed(0)}%` : "\u2014"}
        </td>
        <td className="p-3 text-right font-mono text-muted-foreground">
          {d.entry_price != null ? `$${Number(d.entry_price).toFixed(2)}` : "\u2014"}
        </td>
        <td className="p-3 text-right font-mono text-muted-foreground">
          {d.stop_loss != null ? `$${Number(d.stop_loss).toFixed(2)}` : "\u2014"}
        </td>
        <td className="p-3 text-right font-mono text-muted-foreground">
          {d.take_profit_1 != null ? `$${Number(d.take_profit_1).toFixed(2)}` : "\u2014"}
        </td>
        <td className="p-3 text-muted-foreground text-[11px]">{d.croc_status ?? "\u2014"}</td>
        <td className="p-3 font-mono text-muted-foreground text-[10px]">
          {[d.strand1_signal, d.strand2_signal, d.strand3_signal, d.strand4_signal]
            .filter(Boolean)
            .join(" / ") || "\u2014"}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-muted/20 border-b border-border/10">
          <td colSpan={11}>
            <ExpandedRowDetail d={d} />
          </td>
        </tr>
      )}
    </>
  );
}
