import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccountContext } from "@/contexts/AccountContext";
import { useProfitFactor } from "@/hooks/useProfitFactor";
import { cn } from "@/lib/utils";
import { Shield, Zap } from "lucide-react";

export default function PortfolioSummaryStrip() {
  const { accountId, accountInfo } = useAccountContext();
  const { profitFactor, longPnl, shortPnl } = useProfitFactor(accountId);

  const { data: account } = useQuery({
    queryKey: ["demo-account-strip", accountId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("demo_accounts")
        .select("*")
        .eq("id", accountId)
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: openCount } = useQuery({
    queryKey: ["open-positions-count", accountId],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("demo_positions")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("position_status", "OPEN");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  if (!account) return null;

  const isCFD = accountInfo.isCFD === true;
  const curr = isCFD ? "\u20ac" : "$";
  const locale = isCFD ? "de-DE" : "en-US";
  const fmtBal = (v: number) => `${curr}${v.toLocaleString(locale, { minimumFractionDigits: 0 })}`;

  const pnl = Number(account.total_pnl);
  const pnlPct = Number(account.total_pnl_percent);
  const winRate =
    account.total_trades > 0
      ? ((account.winning_trades / account.total_trades) * 100).toFixed(1)
      : "--";
  const dd = Number(account.max_drawdown_percent).toFixed(1);

  // CFD metrics
  const leverage = Number(account.leverage_ratio ?? 1);
  const marginUsed = Number(account.margin_used ?? 0);
  const freeMargin = Number(account.current_balance) - marginUsed;
  const marginLevel = marginUsed > 0 ? ((Number(account.current_balance) / marginUsed) * 100) : 0;

  const metrics = [
    {
      label: accountInfo.label,
      value: fmtBal(Number(account.current_balance)),
      color: "text-foreground",
      dot: accountInfo.color,
      suffix: isCFD ? `${leverage}x` : undefined,
      suffixColor: "text-orange-400",
    },
    {
      label: "P&L",
      value: `${pnl >= 0 ? "+" : ""}${curr}${pnl.toFixed(0)} (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%)`,
      color: pnl >= 0 ? "text-bullish" : "text-bearish",
    },
    {
      label: "L",
      value: `${longPnl >= 0 ? "+" : ""}${curr}${longPnl.toFixed(0)}`,
      color: longPnl >= 0 ? "text-bullish" : "text-bearish",
    },
    {
      label: "S",
      value: `${shortPnl >= 0 ? "+" : ""}${curr}${shortPnl.toFixed(0)}`,
      color: shortPnl >= 0 ? "text-bullish" : "text-bearish",
    },
    {
      label: "Offen",
      value: `${openCount ?? 0}`,
      color: "text-foreground",
    },
    {
      label: "Win",
      value: `${winRate}%`,
      color: "text-foreground",
    },
    {
      label: "DD",
      value: `${dd}%`,
      color: "text-foreground",
    },
    {
      label: "PF",
      value: profitFactor !== null ? (profitFactor === Infinity ? "\u221e" : profitFactor.toFixed(2)) : "--",
      color: (profitFactor ?? 0) >= 1.5 ? "text-bullish" : "text-foreground",
    },
  ];

  return (
    <div className="flex items-center gap-0 px-3 py-2 rounded-md bg-card/50 border border-border/30 text-xs overflow-x-auto">
      {metrics.map((m, i) => (
        <div key={m.label} className="flex items-center">
          {i > 0 && (
            <span className="text-muted-foreground/40 mx-2 select-none">|</span>
          )}
          <div className="flex items-center gap-1 whitespace-nowrap">
            {m.dot && (
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: m.dot }}
              />
            )}
            <span className="text-muted-foreground">{m.label}:</span>
            <span className={`font-mono font-semibold ${m.color}`}>{m.value}</span>
            {m.suffix && (
              <span className={`text-[10px] font-bold ${m.suffixColor}`}>{m.suffix}</span>
            )}
          </div>
        </div>
      ))}

      {/* CFD Margin metrics */}
      {isCFD && marginUsed > 0 && (
        <>
          <span className="text-muted-foreground/40 mx-2 select-none">|</span>
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Shield className={cn("h-3 w-3", marginLevel < 100 ? "text-red-400" : marginLevel < 200 ? "text-yellow-400" : "text-muted-foreground")} />
            <span className="text-muted-foreground">Margin:</span>
            <span className={cn("font-mono font-semibold", marginLevel < 100 ? "text-red-400" : marginLevel < 200 ? "text-yellow-400" : "text-foreground")}>
              {marginLevel.toFixed(0)}%
            </span>
          </div>
          <span className="text-muted-foreground/40 mx-2 select-none">|</span>
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Zap className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Frei:</span>
            <span className="font-mono font-semibold text-foreground">{fmtBal(freeMargin)}</span>
          </div>
        </>
      )}
    </div>
  );
}
