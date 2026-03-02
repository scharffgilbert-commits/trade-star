import { useDemoAccount } from "@/hooks/useDemoAccount";
import { useProfitFactor } from "@/hooks/useProfitFactor";
import { TrendingUp, TrendingDown, Trophy, AlertTriangle, DollarSign, BarChart3, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MetricRow {
  label: string;
  values: (string | number | null)[];
  format?: "currency" | "percent" | "number";
  higherIsBetter?: boolean;
}

const COLUMNS = [
  { accountId: 1, label: "Live Demo", color: "hsl(142, 76%, 36%)" },
  { accountId: 2, label: "V6 Backtest", color: "hsl(217, 91%, 60%)" },
  { accountId: 4, label: "Combined V8", color: "hsl(48, 100%, 50%)" },
];

function AccountData({ accountId }: { accountId: number }) {
  const { account, isLoading } = useDemoAccount(accountId);
  const pf = useProfitFactor(accountId);

  if (isLoading) return null;
  if (!account) return null;

  return {
    balance: Number(account.current_balance),
    returnPct: Number(account.total_pnl_percent),
    winRate: account.total_trades > 0 ? (account.winning_trades / account.total_trades) * 100 : 0,
    trades: account.total_trades,
    maxDD: Number(account.max_drawdown_percent),
    profitFactor: pf.profitFactor,
  } as any;
}

export default function PerformanceComparison() {
  const acc1 = useDemoAccount(1);
  const acc2 = useDemoAccount(2);
  const acc4 = useDemoAccount(4);
  const pf1 = useProfitFactor(1);
  const pf2 = useProfitFactor(2);
  const pf4 = useProfitFactor(4);

  const isLoading = acc1.isLoading || acc2.isLoading || acc4.isLoading;

  if (isLoading) {
    return (
      <div className="card-elevated rounded-lg border border-border/50 p-3">
        <Skeleton className="h-40" />
      </div>
    );
  }

  const accounts = [acc1.account, acc2.account, acc4.account];

  const getValue = (acc: any, key: string, pfData?: any) => {
    if (!acc) return null;
    switch (key) {
      case "balance": return Number(acc.current_balance);
      case "return": return Number(acc.total_pnl_percent);
      case "winRate": return acc.total_trades > 0 ? (acc.winning_trades / acc.total_trades) * 100 : 0;
      case "trades": return acc.total_trades;
      case "maxDD": return Number(acc.max_drawdown_percent);
      case "pf": return pfData?.profitFactor;
      default: return null;
    }
  };

  const pfs = [pf1, pf2, pf4];

  const metrics = [
    { label: "Balance", key: "balance", format: "$", higher: true },
    { label: "Return %", key: "return", format: "%", higher: true },
    { label: "Win Rate", key: "winRate", format: "%", higher: true },
    { label: "Trades", key: "trades", format: "", higher: true },
    { label: "Max DD", key: "maxDD", format: "%", higher: false },
    { label: "Profit Factor", key: "pf", format: "", higher: true },
  ];

  return (
    <div className="card-elevated rounded-lg border border-border/50 p-3">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">
          Performance Vergleich
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground py-1.5 pr-3">Metrik</th>
              {COLUMNS.map((col) => (
                <th key={col.accountId} className="text-right py-1.5 px-2">
                  <span className="flex items-center justify-end gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: col.color }}
                    />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {col.label}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => {
              const values = accounts.map((acc, i) => getValue(acc, m.key, pfs[i]));
              const validValues = values.filter((v) => v !== null && v !== undefined && isFinite(v as number)) as number[];
              const bestIdx = validValues.length > 0
                ? values.indexOf(m.higher
                  ? Math.max(...validValues)
                  : Math.min(...validValues))
                : -1;

              return (
                <tr key={m.key} className="border-b border-border/10 odd:bg-white/[0.02]">
                  <td className="text-[10px] uppercase tracking-wider text-muted-foreground py-1.5 pr-3">{m.label}</td>
                  {values.map((v, i) => {
                    const isBest = i === bestIdx && validValues.length > 1;
                    let display = "--";
                    if (v !== null && v !== undefined) {
                      if (m.format === "$") display = `$${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
                      else if (m.format === "%") display = `${Number(v).toFixed(1)}%`;
                      else display = v === Infinity ? "∞" : Number(v).toFixed(m.key === "pf" ? 2 : 0);
                    }
                    return (
                      <td
                        key={i}
                        className={cn(
                          "text-right font-mono py-1.5 px-2",
                          isBest ? "text-gold font-bold" : "text-foreground"
                        )}
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
