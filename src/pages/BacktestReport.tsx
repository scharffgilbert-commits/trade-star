import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Trophy,
  AlertTriangle,
  BarChart3,
  Download,
  Filter,
  Calendar,
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useDemoAccount } from "@/hooks/useDemoAccount";
import { useBalanceSnapshots } from "@/hooks/useBalanceSnapshots";
import { useClosedPositions } from "@/hooks/useClosedPositions";
import { useAccountContext } from "@/contexts/AccountContext";
import { useProfitFactor } from "@/hooks/useProfitFactor";
import MonthlyReturnsHeatmap from "@/components/portfolio/MonthlyReturnsHeatmap";
import SetupPerformance from "@/components/portfolio/SetupPerformance";
import ExitReasonChart from "@/components/portfolio/ExitReasonChart";
import DrawdownChart from "@/components/portfolio/DrawdownChart";
import SymbolRanking from "@/components/portfolio/SymbolRanking";
import { cn } from "@/lib/utils";

const DEFAULT_INITIAL_BALANCE = 100_000;

const fmt = (v: number | null | undefined, prefix = "$") =>
  v != null ? `${prefix}${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "\u2014";

const fmtPct = (v: number | null | undefined) =>
  v != null ? `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%` : "\u2014";

// ────────────────────────────────────────────
// Overview Cards
// ────────────────────────────────────────────
function OverviewCard({
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
    <Card className="card-elevated border-blue-500/20 bg-blue-500/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", trendColor)} />
      </CardHeader>
      <CardContent>
        <div className={cn("font-mono text-xl font-bold", trendColor)}>{value}</div>
        {subtitle && <p className={cn("text-xs mt-1", trendColor)}>{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────
// Equity Curve (Backtest-specific)
// ────────────────────────────────────────────
function BacktestEquityCurve({ backtestId }: { backtestId: number }) {
  const { snapshots, isLoading } = useBalanceSnapshots(backtestId);

  const chartData = useMemo(
    () =>
      snapshots.map((s) => ({
        date: new Date(s.snapshot_date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
        balance: Number(s.balance),
      })),
    [snapshots]
  );

  if (isLoading) return <Skeleton className="h-[300px] rounded-xl" />;

  return (
    <div className="card-elevated rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm font-semibold text-foreground">Equity-Kurve (Backtest)</h2>
        <span className="text-[10px] text-muted-foreground font-mono">
          {snapshots.length} Tage · $100k → ${chartData.length > 0 ? (chartData[chartData.length - 1].balance / 1000).toFixed(1) : "?"}k
        </span>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
          Keine Backtest-Daten vorhanden.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="btGrad" x1="0" y1="0" x2="0" y2="1">
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
              y={DEFAULT_INITIAL_BALANCE}
              stroke="hsl(215, 12%, 35%)"
              strokeDasharray="6 4"
              label={{ value: "$100k", position: "insideTopRight", fill: "hsl(215, 12%, 55%)", fontSize: 10 }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
              fill="url(#btGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Trade List Table
// ────────────────────────────────────────────
function TradeListTable({ backtestId }: { backtestId: number }) {
  const { positions, isLoading, totalCount, page, setPage } = useClosedPositions(backtestId);
  const [dirFilter, setDirFilter] = useState<"ALL" | "LONG" | "SHORT">("ALL");
  const totalPages = Math.ceil(totalCount / 20);

  const filtered = dirFilter === "ALL" ? positions : positions.filter((p) => p.position_type === dirFilter);

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Symbol", "Richtung", "Entry", "Exit", "P&L ($)", "P&L (%)", "Tage", "Trigger", "Datum"];
    const rows = filtered.map((p) => [
      p.symbol, p.position_type, p.entry_price, p.exit_price ?? "", p.pnl_amount ?? "", p.pnl_percent ?? "",
      p.holding_days ?? "", p.trigger_source ?? "",
      p.opened_at ? new Date(p.opened_at).toLocaleDateString("de-DE") : "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backtest_trades_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">
            Trade-Liste ({totalCount} Trades)
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3 text-muted-foreground" />
            {(["ALL", "LONG", "SHORT"] as const).map((f) => (
              <Button
                key={f}
                variant={dirFilter === f ? "default" : "ghost"}
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setDirFilter(f)}
              >
                {f === "ALL" ? "Alle" : f}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={exportCSV}>
            <Download className="h-3 w-3 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Keine Trades.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Symbol</TableHead>
                  <TableHead className="text-[10px]">Richtung</TableHead>
                  <TableHead className="text-[10px] text-right">Entry</TableHead>
                  <TableHead className="text-[10px] text-right">Exit</TableHead>
                  <TableHead className="text-[10px] text-right">P&L ($)</TableHead>
                  <TableHead className="text-[10px] text-right">P&L (%)</TableHead>
                  <TableHead className="text-[10px] text-right">Tage</TableHead>
                  <TableHead className="text-[10px]">Trigger</TableHead>
                  <TableHead className="text-[10px]">Datum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const pnl = p.pnl_amount ?? 0;
                  return (
                    <TableRow
                      key={p.id}
                      className={pnl >= 0 ? "bg-bullish/[0.03]" : "bg-bearish/[0.03]"}
                    >
                      <TableCell className="font-mono text-xs font-bold text-foreground">{p.symbol}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-[10px] px-1 py-0 h-4",
                            p.position_type === "LONG"
                              ? "bg-bullish/15 text-bullish border-bullish/30"
                              : "bg-bearish/15 text-bearish border-bearish/30"
                          )}
                          variant="outline"
                        >
                          {p.position_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">${Number(p.entry_price).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {p.exit_price ? `$${Number(p.exit_price).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className={cn("text-right font-mono text-xs font-semibold", pnl >= 0 ? "text-bullish" : "text-bearish")}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </TableCell>
                      <TableCell className={cn("text-right font-mono text-xs", pnl >= 0 ? "text-bullish" : "text-bearish")}>
                        {p.pnl_percent != null ? `${Number(p.pnl_percent) >= 0 ? "+" : ""}${Number(p.pnl_percent).toFixed(2)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {p.holding_days ?? "—"}
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{p.trigger_source ?? "—"}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {p.opened_at ? new Date(p.opened_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      className={page === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      onClick={() => setPage(Math.max(0, page - 1))}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) pageNum = i;
                    else if (page < 3) pageNum = i;
                    else if (page > totalPages - 4) pageNum = totalPages - 7 + i;
                    else pageNum = page - 3 + i;
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          isActive={page === pageNum}
                          className="cursor-pointer"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum + 1}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      className={page >= totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Main Backtest Report Page
// ────────────────────────────────────────────
export default function BacktestReport() {
  const { accountId, accountInfo } = useAccountContext();
  // If on live account (1), default to V6 Backtest (2)
  const backtestId = accountId === 1 ? 2 : accountId;
  const { account, isLoading } = useDemoAccount(backtestId);

  const initialBalance = account?.initial_balance ?? DEFAULT_INITIAL_BALANCE;

  const winRate =
    account && account.total_trades > 0
      ? ((account.winning_trades / account.total_trades) * 100).toFixed(1)
      : "0.0";

  const totalReturn =
    account ? ((account.current_balance - initialBalance) / initialBalance * 100).toFixed(1) : "0.0";

  const pfData = useProfitFactor(backtestId);
  const profitFactor = pfData.profitFactor;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <FlaskConical className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Backtest Report
            </h1>
            <p className="text-xs text-muted-foreground">
              {accountInfo.label} — {accountInfo.description}
            </p>
          </div>
        </div>
        <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-sm px-3 py-1" variant="outline">
          <Calendar className="h-3.5 w-3.5 mr-1.5" />
          287 Handelstage
        </Badge>
      </motion.div>

      {/* Overview Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          <OverviewCard
            title="Trades"
            value={String(account?.total_trades ?? 0)}
            subtitle={`${account?.winning_trades ?? 0}W / ${account?.losing_trades ?? 0}L`}
            icon={BarChart3}
            trend="neutral"
          />
          <OverviewCard
            title="Win Rate"
            value={`${winRate}%`}
            icon={Trophy}
            trend={Number(winRate) >= 50 ? "up" : "down"}
          />
          <OverviewCard
            title="Return"
            value={`+${totalReturn}%`}
            subtitle={fmt(account?.current_balance)}
            icon={TrendingUp}
            trend="up"
          />
          <OverviewCard
            title="Max DD"
            value={fmtPct(account?.max_drawdown_percent ? -Math.abs(account.max_drawdown_percent) : null)}
            icon={AlertTriangle}
            trend="down"
          />
          <OverviewCard
            title="P&L"
            value={fmt(account?.total_pnl)}
            icon={DollarSign}
            trend={account && account.total_pnl >= 0 ? "up" : "down"}
          />
          <OverviewCard
            title="Profit Factor"
            value={profitFactor != null
              ? profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)
              : "—"}
            icon={TrendingUp}
            trend={profitFactor != null && profitFactor > 1 ? "up" : profitFactor != null ? "down" : "neutral"}
          />
        </motion.div>
      )}

      {/* Equity Curve */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <BacktestEquityCurve backtestId={backtestId} />
      </motion.div>

      {/* Monthly Returns + Drawdown */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <MonthlyReturnsHeatmap accountId={backtestId} />
        <DrawdownChart accountId={backtestId} />
      </motion.div>

      {/* Setup Performance + Exit Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <SetupPerformance accountId={backtestId} />
        <ExitReasonChart accountId={backtestId} />
      </motion.div>

      {/* Symbol Ranking */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <SymbolRanking accountId={backtestId} />
      </motion.div>

      {/* Trade List */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.45 }}
      >
        <TradeListTable backtestId={backtestId} />
      </motion.div>
    </div>
  );
}
