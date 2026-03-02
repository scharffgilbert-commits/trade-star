import { TrendingUp } from "lucide-react";
import AccountSwitcher from "@/components/layout/AccountSwitcher";
import { useAccountContext } from "@/contexts/AccountContext";
import { useCombinedModeStats } from "@/hooks/useCombinedModeStats";

export default function DashboardHeader() {
  const { accountId, accountInfo, isBacktest } = useAccountContext();
  const { config, totalPassed, totalBlocked } = useCombinedModeStats();

  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold text-foreground">
              BörsenStar{" "}
              <span className={accountId === 4 ? "text-gold" : "text-primary"}>
                V8.0
              </span>
            </h1>
            {config.useCombinedMode && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
                Combined Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{today}</span>
            {isBacktest && (
              <span className="text-primary font-medium">— Backtest</span>
            )}
            {config.useCombinedMode && (
              <span className="font-mono text-[10px]">
                <span className="text-bullish">{totalPassed}</span>
                {" passed "}
                <span className="text-muted-foreground">|</span>
                {" "}
                <span className="text-bearish">{totalBlocked}</span>
                {" blocked"}
              </span>
            )}
          </div>
        </div>
      </div>
      <AccountSwitcher />
    </div>
  );
}
