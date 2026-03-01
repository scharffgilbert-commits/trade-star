import { TrendingUp } from "lucide-react";
import AccountSwitcher from "@/components/layout/AccountSwitcher";
import { useAccountContext } from "@/contexts/AccountContext";

export default function DashboardHeader() {
  const { accountInfo, isBacktest } = useAccountContext();

  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <TrendingUp className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            BörsenStar <span className="text-primary">V6.0</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            {today}
            {isBacktest && (
              <span className="ml-2 text-blue-400 font-medium">
                — Backtest-Modus
              </span>
            )}
          </p>
        </div>
      </div>
      <AccountSwitcher />
    </div>
  );
}
