import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Trophy,
  AlertTriangle,
  Download,
  ChevronDown,
  ChevronRight,
  Settings,
  RotateCcw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDemoAccount } from "@/hooks/useDemoAccount";
import { useBalanceSnapshots } from "@/hooks/useBalanceSnapshots";
import { usePnlBySymbol } from "@/hooks/usePnlBySymbol";
import { useTradingRules, type TradingRule } from "@/hooks/useTradingRules";
import { useClosedPositions } from "@/hooks/useClosedPositions";
import { useAccountContext } from "@/contexts/AccountContext";
import MonthlyReturnsHeatmap from "@/components/portfolio/MonthlyReturnsHeatmap";
import SetupPerformance from "@/components/portfolio/SetupPerformance";
import ExitReasonChart from "@/components/portfolio/ExitReasonChart";
import DrawdownChart from "@/components/portfolio/DrawdownChart";
import SymbolRanking from "@/components/portfolio/SymbolRanking";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const fmt = (v: number | null | undefined, prefix = "$") =>
  v != null ? `${prefix}${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "\u2014";

const fmtPct = (v: number | null | undefined) =>
  v != null ? `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%` : "\u2014";

const pnlColor = (v: number | null | undefined) =>
  v == null ? "text-muted-foreground" : Number(v) >= 0 ? "text-bullish" : "text-bearish";

// ────────────────────────────────────────────
// Metric Cards
// ────────────────────────────────────────────
function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  const trendColor =
    trend === "up" ? "text-bullish" : trend === "down" ? "text-bearish" : "text-muted-foreground";

  return (
    <Card className="card-elevated border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${trendColor}`} />
      </CardHeader>
      <CardContent>
        <div className={`font-mono text-xl font-bold ${trendColor}`}>{value}</div>
        {subtitle && <p className={`text-xs mt-1 ${trendColor}`}>{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────
// Equity Curve Chart
// ────────────────────────────────────────────
type TimeRange = "1W" | "1M" | "3M" | "ALL";

function EquityCurve() {
  const { accountId } = useAccountContext();
  const [range, setRange] = useState<TimeRange>("ALL");

  const daysMap: Record<TimeRange, number | undefined> = {
    "1W": 7,
    "1M": 30,
    "3M": 90,
    ALL: undefined,
  };

  const { snapshots, isLoading } = useBalanceSnapshots(accountId, daysMap[range]);

  const chartData = useMemo(
    () =>
      snapshots.map((s) => ({
        date: new Date(s.snapshot_date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
        balance: Number(s.balance),
        equity: Number(s.equity),
      })),
    [snapshots]
  );

  const initialBalance = snapshots.length > 0 ? Number(snapshots[0].balance) : 100_000;
  const isPositive = chartData.length > 0 && chartData[chartData.length - 1].balance >= initialBalance;

  if (isLoading) {
    return <Skeleton className="h-[300px] rounded-xl" />;
  }

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-sm font-semibold text-foreground">Equity Kurve</h2>
        <div className="flex gap-1">
          {(["1W", "1M", "3M", "ALL"] as TimeRange[]).map((r) => (
            <Button
              key={r}
              variant={range === r ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setRange(r)}
            >
              {r}
            </Button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
          Keine Daten f\u00fcr den ausgew\u00e4hlten Zeitraum vorhanden.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 14%, 16%)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(228, 18%, 10%)",
                border: "1px solid hsl(228, 14%, 16%)",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
              }}
              formatter={(value: number) => [`$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, "Kontostand"]}
            />
            <ReferenceLine
              y={initialBalance}
              stroke="hsl(215, 12%, 35%)"
              strokeDasharray="6 4"
              label={{
                value: `$${(initialBalance / 1000).toFixed(0)}k`,
                position: "insideTopRight",
                fill: "hsl(215, 12%, 55%)",
                fontSize: 10,
              }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={isPositive ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)"}
              strokeWidth={2}
              fill={isPositive ? "url(#gradientGreen)" : "url(#gradientRed)"}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// P&L by Symbol Chart
// ────────────────────────────────────────────
function PnlBySymbolChart() {
  const { accountId } = useAccountContext();
  const { symbolPnl, isLoading } = usePnlBySymbol(accountId);

  if (isLoading) {
    return <Skeleton className="h-[300px] rounded-xl" />;
  }

  if (symbolPnl.length === 0) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <h2 className="font-display text-sm font-semibold text-foreground mb-3">P&L nach Symbol</h2>
        <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
          Keine abgeschlossenen Trades vorhanden.
        </div>
      </div>
    );
  }

  const chartData = symbolPnl.map((s) => ({
    symbol: s.symbol,
    pnl: Number(s.totalPnl.toFixed(2)),
  }));

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <h2 className="font-display text-sm font-semibold text-foreground mb-3">P&L nach Symbol</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 14%, 16%)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
          />
          <YAxis
            dataKey="symbol"
            type="category"
            tick={{ fill: "hsl(210, 20%, 95%)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(228, 18%, 10%)",
              border: "1px solid hsl(228, 14%, 16%)",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            formatter={(value: number) => [`$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, "P&L"]}
          />
          <ReferenceLine x={0} stroke="hsl(215, 12%, 35%)" />
          <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.pnl >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ────────────────────────────────────────────
// Trading Statistics
// ────────────────────────────────────────────
function TradingStats() {
  const { accountId } = useAccountContext();
  const { account, isLoading: accountLoading } = useDemoAccount(accountId);
  const { positions, isLoading: positionsLoading } = useClosedPositions(accountId);

  if (accountLoading || positionsLoading) {
    return <Skeleton className="h-[300px] rounded-xl" />;
  }

  // Compute additional stats from closed positions
  const wins = positions.filter((p) => (p.pnl_amount ?? 0) > 0);
  const losses = positions.filter((p) => (p.pnl_amount ?? 0) < 0);

  const avgWin = wins.length > 0 ? wins.reduce((a, p) => a + (p.pnl_amount ?? 0), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, p) => a + (p.pnl_amount ?? 0), 0) / losses.length) : 0;
  const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : wins.length > 0 ? Infinity : 0;
  const avgHoldDays =
    positions.length > 0
      ? positions.reduce((a, p) => a + (p.holding_days ?? 0), 0) / positions.length
      : 0;

  const bestTrade = positions.length > 0
    ? positions.reduce((a, b) => ((a.pnl_amount ?? 0) > (b.pnl_amount ?? 0) ? a : b))
    : null;
  const worstTrade = positions.length > 0
    ? positions.reduce((a, b) => ((a.pnl_amount ?? 0) < (b.pnl_amount ?? 0) ? a : b))
    : null;

  const stats = [
    { label: "Trades gesamt", value: String(account?.total_trades ?? 0) },
    { label: "Gewinner", value: String(account?.winning_trades ?? 0), color: "text-bullish" },
    { label: "Verlierer", value: String(account?.losing_trades ?? 0), color: "text-bearish" },
    { label: "\u00d8 Gewinn", value: fmt(avgWin), color: "text-bullish" },
    { label: "\u00d8 Verlust", value: fmt(avgLoss > 0 ? -avgLoss : null), color: "text-bearish" },
    {
      label: "Profit Faktor",
      value: profitFactor === Infinity ? "\u221e" : profitFactor.toFixed(2),
      color: profitFactor >= 1 ? "text-bullish" : "text-bearish",
    },
    { label: "\u00d8 Haltedauer", value: `${avgHoldDays.toFixed(1)} Tage` },
    {
      label: "Bester Trade",
      value: bestTrade ? `${bestTrade.symbol} ${fmt(bestTrade.pnl_amount)}` : "\u2014",
      color: "text-bullish",
    },
    {
      label: "Schlechtester",
      value: worstTrade ? `${worstTrade.symbol} ${fmt(worstTrade.pnl_amount)}` : "\u2014",
      color: "text-bearish",
    },
  ];

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <h2 className="font-display text-sm font-semibold text-foreground mb-3">Trading Statistiken</h2>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="p-3 rounded-lg bg-muted/30">
            <div className="text-[10px] text-muted-foreground mb-1">{s.label}</div>
            <div className={`font-mono text-sm font-semibold ${s.color ?? "text-foreground"}`}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Trading Rules Section
// ────────────────────────────────────────────
function TradingRulesSection() {
  const { accountId, isReadOnly } = useAccountContext();
  const { rules, isLoading, updateRule, toggleRule } = useTradingRules(accountId);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (rule: TradingRule) => {
    setEditingId(rule.id);
    setEditValue(typeof rule.rule_value === "object" ? JSON.stringify(rule.rule_value) : String(rule.rule_value));
  };

  const saveEdit = (ruleId: number) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(editValue);
    } catch {
      parsed = editValue;
    }
    updateRule({ ruleId, updates: { rule_value: parsed as TradingRule["rule_value"] } });
    setEditingId(null);
  };

  if (isLoading) {
    return <Skeleton className="h-12 rounded-lg" />;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-4 card-elevated rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <div className="text-left">
              <div className="font-display text-sm font-semibold text-foreground">Trading Regeln</div>
              <div className="text-xs text-muted-foreground">
                {rules.length} Regeln konfiguriert &middot; {rules.filter((r) => r.is_active).length} aktiv
              </div>
            </div>
          </div>
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 card-elevated rounded-xl border border-border/50 overflow-x-auto">
          {rules.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Keine Trading Regeln konfiguriert.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Regelname</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Wert</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium text-foreground">{rule.rule_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{rule.rule_type}</TableCell>
                    <TableCell>
                      {editingId === rule.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-7 text-xs font-mono w-40"
                          />
                          <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(rule.id)}>
                            Speichern
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setEditingId(null)}
                          >
                            Abbrechen
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="font-mono text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => startEdit(rule)}
                          title="Klicken zum Bearbeiten"
                        >
                          {typeof rule.rule_value === "object"
                            ? JSON.stringify(rule.rule_value)
                            : String(rule.rule_value)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) =>
                          toggleRule({ ruleId: rule.id, isActive: checked })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ────────────────────────────────────────────
// Account Actions
// ────────────────────────────────────────────
function AccountActions() {
  const { accountId, isReadOnly } = useAccountContext();
  const { positions } = useClosedPositions(accountId);
  const [isResetting, setIsResetting] = useState(false);

  // Hide destructive actions for read-only accounts (backtest)
  if (isReadOnly) return null;

  const exportCSV = () => {
    if (positions.length === 0) return;
    const headers = [
      "Symbol",
      "Richtung",
      "Status",
      "Einstieg",
      "Ausstieg",
      "P&L ($)",
      "P&L (%)",
      "Dauer",
      "Trigger",
    ];
    const rows = positions.map((p) => [
      p.symbol,
      p.position_type,
      p.position_status,
      p.entry_price,
      p.exit_price ?? "",
      p.pnl_amount ?? "",
      p.pnl_percent ?? "",
      p.holding_days ?? "",
      p.trigger_source ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAccount = async () => {
    setIsResetting(true);
    try {
      const { error } = await supabase.functions.invoke("demo-trade-engine", {
        body: { action: "reset_account", account_id: accountId },
      });
      if (error) throw error;
      toast.success("Demo-Konto wurde zur\u00fcckgesetzt");
      window.location.reload();
    } catch (err: unknown) {
      toast.error(`Reset fehlgeschlagen: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" size="sm" onClick={exportCSV} disabled={positions.length === 0}>
        <Download className="h-4 w-4 mr-1.5" />
        Portfolio CSV Export
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="border-bearish/30 text-bearish hover:bg-bearish/10 hover:text-bearish">
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Konto zur\u00fccksetzen
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demo-Konto zur\u00fccksetzen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dies setzt das Demo-Konto auf den Anfangszustand zur\u00fcck ($100.000).
              Alle Positionen, Trades und Statistiken werden gel\u00f6scht.
              Diese Aktion kann nicht r\u00fcckg\u00e4ngig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-bearish hover:bg-bearish/90"
              disabled={isResetting}
              onClick={resetAccount}
            >
              {isResetting ? "Wird zur\u00fcckgesetzt\u2026" : "Ja, zur\u00fccksetzen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ────────────────────────────────────────────
// Main Portfolio Page
// ────────────────────────────────────────────
export default function Portfolio() {
  const { accountId, accountInfo, isReadOnly } = useAccountContext();
  const { account, isLoading } = useDemoAccount(accountId);

  const initialBalance = account?.initial_balance ?? 100_000;

  const winRate =
    account && account.total_trades > 0
      ? ((account.winning_trades / account.total_trades) * 100).toFixed(1)
      : "0.0";

  const balanceTrend =
    account && account.current_balance >= (account.peak_balance ?? initialBalance)
      ? "up"
      : account && account.current_balance >= initialBalance
        ? "up"
        : "down";

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <div className="p-2 rounded-lg bg-primary/10">
          <PieChart className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Portfolio</h1>
          <p className="text-xs text-muted-foreground">
            {accountInfo.label} — {accountInfo.description}
            {isReadOnly && <span className="ml-2 text-blue-400">(Nur Lesen)</span>}
          </p>
        </div>
      </motion.div>

      {/* Row 1: Metric Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <MetricCard
            title="Kontostand"
            value={fmt(account?.current_balance)}
            subtitle={
              account
                ? `${account.current_balance >= initialBalance ? "+" : ""}${fmt(account.current_balance - initialBalance, "$")} vs. Start`
                : undefined
            }
            icon={DollarSign}
            trend={balanceTrend as "up" | "down"}
          />
          <MetricCard
            title="Gesamt P&L"
            value={fmt(account?.total_pnl)}
            subtitle={fmtPct(account?.total_pnl_percent)}
            icon={account && account.total_pnl >= 0 ? TrendingUp : TrendingDown}
            trend={account && account.total_pnl >= 0 ? "up" : "down"}
          />
          <MetricCard
            title="Win Rate"
            value={`${winRate}%`}
            subtitle={`${account?.winning_trades ?? 0}W / ${account?.losing_trades ?? 0}L`}
            icon={Trophy}
            trend={Number(winRate) >= 50 ? "up" : Number(winRate) > 0 ? "down" : "neutral"}
          />
          <MetricCard
            title="Max Drawdown"
            value={fmtPct(account?.max_drawdown_percent ? -Math.abs(account.max_drawdown_percent) : null)}
            subtitle="Maximaler R\u00fcckgang"
            icon={AlertTriangle}
            trend={account && account.max_drawdown_percent > 10 ? "down" : "neutral"}
          />
        </motion.div>
      )}

      {/* Row 2: Equity Curve */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <EquityCurve />
      </motion.div>

      {/* Row 3: Monthly Returns + Drawdown */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <MonthlyReturnsHeatmap accountId={accountId} />
        <DrawdownChart accountId={accountId} />
      </motion.div>

      {/* Row 4: P&L by Symbol + Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <PnlBySymbolChart />
        <TradingStats />
      </motion.div>

      {/* Row 5: Setup Performance + Exit Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <SetupPerformance accountId={accountId} />
        <ExitReasonChart accountId={accountId} />
      </motion.div>

      {/* Row 6: Symbol Ranking */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.45 }}
      >
        <SymbolRanking accountId={accountId} />
      </motion.div>

      {/* Row 7: Trading Rules */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <TradingRulesSection />
      </motion.div>

      {/* Row 8: Account Actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.55 }}
      >
        <AccountActions />
      </motion.div>
    </div>
  );
}
