import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, TrendingUp, BarChart3, Target, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccountContext } from "@/contexts/AccountContext";

export default function PortfolioSummaryStrip() {
  const { accountId, accountInfo } = useAccountContext();

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

  const pnl = Number(account.total_pnl);
  const pnlPct = Number(account.total_pnl_percent);
  const winRate =
    account.total_trades > 0
      ? ((account.winning_trades / account.total_trades) * 100).toFixed(1)
      : "--";
  const dd = Number(account.max_drawdown_percent).toFixed(1);

  return (
    <div className="flex items-center gap-6 px-4 py-2 rounded-lg bg-card/50 border border-border/30 text-sm overflow-x-auto">
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: accountInfo.color }}
        />
        <span className="text-muted-foreground">{accountInfo.label}:</span>
        <span className="font-mono font-semibold text-foreground">
          ${Number(account.current_balance).toLocaleString("en-US", { minimumFractionDigits: 0 })}
        </span>
      </div>

      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">P&L:</span>
        <span
          className={cn(
            "font-mono font-semibold",
            pnl >= 0 ? "text-green-400" : "text-red-400"
          )}
        >
          {pnl >= 0 ? "+" : ""}${pnl.toFixed(0)} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)
        </span>
      </div>

      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Offen:</span>
        <span className="font-mono font-semibold text-foreground">{openCount ?? 0}</span>
      </div>

      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <Target className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Win:</span>
        <span className="font-mono font-semibold text-foreground">{winRate}%</span>
      </div>

      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">DD:</span>
        <span className="font-mono font-semibold text-foreground">{dd}%</span>
      </div>
    </div>
  );
}
