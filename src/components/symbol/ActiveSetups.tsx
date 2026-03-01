import { useDetectedSetups } from "@/hooks/useDetectedSetups";
import { Crosshair, ArrowUp, ArrowDown, Target, Shield, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ActiveSetupsProps {
  symbol: string;
}

export default function ActiveSetups({ symbol }: ActiveSetupsProps) {
  const { setups, isLoading } = useDetectedSetups(symbol);

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Crosshair className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Erkannte Setups</h2>
        </div>
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  const activeSetups = setups.filter((s) => s.is_active);
  const recentSetups = setups.filter((s) => !s.is_active).slice(0, 5);

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Erkannte Setups</h2>
        </div>
        <div className="flex items-center gap-2">
          {activeSetups.length > 0 && (
            <Badge className="bg-bullish/15 text-bullish border-bullish/30 text-[10px]" variant="outline">
              {activeSetups.length} aktiv
            </Badge>
          )}
        </div>
      </div>

      {setups.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Keine Setups für {symbol} erkannt.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Active setups first */}
          {activeSetups.map((setup) => {
            const isLong = setup.direction === "BULL" || setup.direction === "LONG";
            return (
              <div
                key={setup.id}
                className={cn(
                  "p-3 rounded-lg border",
                  isLong ? "border-bullish/20 bg-bullish/5" : "border-bearish/20 bg-bearish/5"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isLong ? (
                      <ArrowUp className="h-3.5 w-3.5 text-bullish" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-bearish" />
                    )}
                    <span className="text-sm font-semibold text-foreground">{setup.setup_type}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary">
                      AKTIV
                    </Badge>
                  </div>
                  <span className={cn(
                    "font-mono text-sm font-bold",
                    setup.confidence >= 70 ? "text-bullish" : setup.confidence >= 50 ? "text-neutral" : "text-muted-foreground"
                  )}>
                    {setup.confidence.toFixed(0)}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {setup.entry_price && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Target className="h-3 w-3" />
                      Entry: ${Number(setup.entry_price).toFixed(2)}
                    </div>
                  )}
                  {setup.stop_loss_price && (
                    <div className="flex items-center gap-1 text-bearish">
                      <Shield className="h-3 w-3" />
                      SL: ${Number(setup.stop_loss_price).toFixed(2)}
                    </div>
                  )}
                  {setup.take_profit_price && (
                    <div className="flex items-center gap-1 text-bullish">
                      <TrendingUp className="h-3 w-3" />
                      TP: ${Number(setup.take_profit_price).toFixed(2)}
                    </div>
                  )}
                </div>
                {setup.risk_reward_ratio && (
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    R:R {Number(setup.risk_reward_ratio).toFixed(1)} · Erkannt: {new Date(setup.detection_date).toLocaleDateString("de-DE")}
                  </div>
                )}
              </div>
            );
          })}

          {/* Recent (inactive) setups */}
          {recentSetups.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/30">
              <span className="text-[10px] text-muted-foreground font-medium">Vergangene Setups</span>
              <div className="mt-1 space-y-1">
                {recentSetups.map((setup) => {
                  const isLong = setup.direction === "BULL" || setup.direction === "LONG";
                  return (
                    <div key={setup.id} className="flex items-center justify-between py-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        {isLong ? (
                          <ArrowUp className="h-3 w-3 text-bullish/50" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-bearish/50" />
                        )}
                        <span>{setup.setup_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{setup.confidence.toFixed(0)}%</span>
                        <span>{new Date(setup.detection_date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
