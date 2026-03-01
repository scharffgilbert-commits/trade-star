import { useDemoAccount } from "@/hooks/useDemoAccount";
import { TrendingUp, TrendingDown, Trophy, AlertTriangle, DollarSign, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MiniMetric {
  label: string;
  value: string;
  color?: string;
  icon: React.ElementType;
}

function MiniCard({ label, value, color = "text-foreground", icon: Icon }: MiniMetric) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", color)} />
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground truncate">{label}</div>
        <div className={cn("font-mono text-xs font-semibold", color)}>{value}</div>
      </div>
    </div>
  );
}

function AccountColumn({ accountId, label, color }: { accountId: number; label: string; color: string }) {
  const { account, isLoading } = useDemoAccount(accountId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        Kein Konto gefunden.
      </div>
    );
  }

  const balance = Number(account.current_balance);
  const initial = Number(account.initial_balance);
  const pnl = Number(account.total_pnl);
  const pnlPct = Number(account.total_pnl_percent);
  const winRate = account.total_trades > 0
    ? ((account.winning_trades / account.total_trades) * 100).toFixed(1)
    : "0.0";
  const dd = Number(account.max_drawdown_percent).toFixed(1);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold text-foreground">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MiniCard
          label="Kontostand"
          value={`$${(balance / 1000).toFixed(1)}k`}
          color={balance >= initial ? "text-bullish" : "text-bearish"}
          icon={DollarSign}
        />
        <MiniCard
          label="P&L"
          value={`${pnl >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%`}
          color={pnl >= 0 ? "text-bullish" : "text-bearish"}
          icon={pnl >= 0 ? TrendingUp : TrendingDown}
        />
        <MiniCard
          label="Win Rate"
          value={`${winRate}%`}
          color={Number(winRate) >= 50 ? "text-bullish" : "text-bearish"}
          icon={Trophy}
        />
        <MiniCard
          label="Max DD"
          value={`${dd}%`}
          color={Number(dd) > 10 ? "text-bearish" : "text-muted-foreground"}
          icon={AlertTriangle}
        />
      </div>
      <div className="mt-2 text-center">
        <span className="text-[10px] text-muted-foreground">
          {account.total_trades} Trades · {account.winning_trades}W / {account.losing_trades}L
        </span>
      </div>
    </div>
  );
}

export default function PerformanceComparison() {
  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">
          Performance Vergleich
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AccountColumn accountId={1} label="Live Demo" color="hsl(142, 76%, 36%)" />
        <AccountColumn accountId={2} label="Backtest 2025" color="hsl(217, 91%, 60%)" />
      </div>
    </div>
  );
}
