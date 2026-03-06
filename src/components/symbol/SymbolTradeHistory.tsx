import { useState, useMemo } from "react";
import { useSymbolTradeHistory } from "@/hooks/useSymbolTradeHistory";
import { useAccountContext, ACCOUNTS } from "@/contexts/AccountContext";
import { History, ArrowUp, ArrowDown, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

interface SymbolTradeHistoryProps {
  symbol: string;
}

type AccountFilter = "all" | "1" | "2";

export default function SymbolTradeHistory({ symbol }: SymbolTradeHistoryProps) {
  const { trades, isLoading } = useSymbolTradeHistory(symbol);
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");

  const filtered = useMemo(() => {
    if (accountFilter === "all") return trades;
    return trades.filter((t) => t.account_id === Number(accountFilter));
  }, [trades, accountFilter]);

  const closedTrades = filtered.filter((t) => t.position_status === "CLOSED");
  const wins = closedTrades.filter((t) => (t.pnl_amount ?? 0) > 0).length;
  const losses = closedTrades.filter((t) => (t.pnl_amount ?? 0) < 0).length;
  const totalPnl = closedTrades.reduce((acc, t) => acc + (t.pnl_amount ?? 0), 0);

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Trade-Historie — {symbol}</h2>
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Trade-Historie — {symbol}</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Account filter */}
          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3 text-muted-foreground" />
            {(["all", "1", "2"] as AccountFilter[]).map((f) => (
              <Button
                key={f}
                variant={accountFilter === f ? "default" : "ghost"}
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setAccountFilter(f)}
              >
                {f === "all" ? "Alle" : ACCOUNTS[Number(f)]?.label ?? f}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      {closedTrades.length > 0 && (
        <div className="flex items-center gap-4 mb-3 p-2 rounded-lg bg-muted/30 text-xs">
          <span className="text-muted-foreground">
            Trades: <span className="font-semibold text-foreground">{closedTrades.length}</span>
          </span>
          <span className="text-muted-foreground">
            W/L: <span className="text-bullish font-semibold">{wins}</span> / <span className="text-bearish font-semibold">{losses}</span>
          </span>
          <span className="text-muted-foreground">
            P&L: <span className={cn("font-mono font-semibold", totalPnl >= 0 ? "text-bullish" : "text-bearish")}>
              {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
            </span>
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Keine Trades für {symbol} vorhanden.
        </p>
      ) : (
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Konto</TableHead>
                <TableHead className="text-[10px]">Richtung</TableHead>
                <TableHead className="text-[10px]">Status</TableHead>
                <TableHead className="text-[10px] text-right">Entry</TableHead>
                <TableHead className="text-[10px] text-right">Exit</TableHead>
                <TableHead className="text-[10px] text-right">P&L</TableHead>
                <TableHead className="text-[10px] text-right">Tage</TableHead>
                <TableHead className="text-[10px]">Exit-Grund</TableHead>
                <TableHead className="text-[10px]">Trigger</TableHead>
                <TableHead className="text-[10px]">Datum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 50).map((trade) => {
                const pnl = trade.pnl_amount ?? 0;
                const isLong = trade.position_type === "LONG";
                const accountLabel = ACCOUNTS[trade.account_id]?.label ?? `#${trade.account_id}`;
                const accountColor = ACCOUNTS[trade.account_id]?.color ?? "hsl(215, 12%, 55%)";

                const exitReasonLabel: Record<string, string> = {
                  STOPPED_OUT: "Stop Loss",
                  TP_HIT: "Take Profit",
                };
                const triggerLabel: Record<string, string> = {
                  AUTO_SIGNAL: "Auto-Signal",
                  STOP_LOSS: "Stop Loss",
                  TRAILING_STOP: "Trailing Stop",
                  TAKE_PROFIT: "Take Profit",
                  MAX_HOLDING: "Max Haltezeit",
                  MANUAL: "Manuell",
                  SIGNAL_REVERSAL: "Signal-Umkehr",
                  PREMIUM_COUNTER: "Premium Counter",
                  AUTO_RULE: "Auto Regel",
                  BACKTEST_END: "Backtest Ende",
                  EXPIRED: "Abgelaufen",
                };
                const isClosed = ["CLOSED", "STOPPED_OUT", "TP_HIT"].includes(trade.position_status);
                const exitReason = isClosed
                  ? (exitReasonLabel[trade.position_status]
                    ?? triggerLabel[trade.trigger_source ?? ""] ?? "Close")
                  : "—";
                const exitColor = trade.position_status === "STOPPED_OUT" ? "text-bearish"
                  : trade.position_status === "TP_HIT" ? "text-bullish"
                  : "text-muted-foreground";

                return (
                  <TableRow
                    key={trade.id}
                    className={cn(
                      trade.position_status === "CLOSED" && (
                        pnl >= 0 ? "bg-bullish/[0.03]" : "bg-bearish/[0.03]"
                      )
                    )}
                  >
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: accountColor }} />
                        <span className="text-[10px] text-muted-foreground">{accountLabel}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-[10px] px-1 py-0 h-4",
                          isLong ? "bg-bullish/15 text-bullish border-bullish/30" : "bg-bearish/15 text-bearish border-bearish/30"
                        )}
                        variant="outline"
                      >
                        {trade.position_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-[10px]",
                        trade.position_status === "OPEN" ? "text-primary" : "text-muted-foreground"
                      )}>
                        {trade.position_status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-[10px] text-muted-foreground">
                      ${Number(trade.entry_price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-[10px] text-muted-foreground">
                      {trade.exit_price ? `$${Number(trade.exit_price).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className={cn("text-right font-mono text-[10px] font-semibold", pnl >= 0 ? "text-bullish" : "text-bearish")}>
                      {trade.pnl_amount != null ? `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-[10px] text-muted-foreground">
                      {trade.holding_days ?? "—"}
                    </TableCell>
                    <TableCell className={cn("text-[10px] font-medium", exitColor)}>
                      {exitReason}
                    </TableCell>
                    <TableCell>
                      {isClosed && trade.trigger_source ? (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                          {triggerLabel[trade.trigger_source] ?? trade.trigger_source}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {new Date(trade.opened_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
