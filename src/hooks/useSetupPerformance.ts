import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SetupPerformanceItem {
  setup_type: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgHoldingDays: number;
  profitFactor: number;
}

export function useSetupPerformance(accountId: number = 1) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["setup-performance", accountId],
    queryFn: async () => {
      // Get closed positions for this account
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: positions, error: posError } = await (supabase as any)
        .from("demo_positions")
        .select("id, symbol, pnl_amount, pnl_percent, holding_days, trigger_source, notes, opened_at")
        .eq("account_id", accountId)
        .eq("position_status", "CLOSED");

      if (posError) throw posError;

      // Get setups for these positions (join by symbol + date proximity)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: setups, error: setupError } = await (supabase as any)
        .from("detected_setups")
        .select("symbol, setup_type, detection_date");

      if (setupError) throw setupError;

      // Map positions to setups (simple heuristic: match by symbol + detection within 3 days of open)
      const setupMap = new Map<string, string>(); // position key -> setup_type
      for (const pos of (positions ?? [])) {
        const posDate = new Date(pos.opened_at);
        for (const setup of (setups ?? [])) {
          if (setup.symbol === pos.symbol) {
            const setupDate = new Date(setup.detection_date);
            const diffDays = Math.abs((posDate.getTime() - setupDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 3) {
              setupMap.set(`${pos.id}`, setup.setup_type);
              break;
            }
          }
        }
      }

      // Aggregate by setup type
      const aggregated = new Map<string, { wins: number; losses: number; totalPnl: number; totalDays: number; grossWin: number; grossLoss: number }>();

      for (const pos of (positions ?? [])) {
        const setupType = setupMap.get(`${pos.id}`) ?? "Unknown";
        if (!aggregated.has(setupType)) {
          aggregated.set(setupType, { wins: 0, losses: 0, totalPnl: 0, totalDays: 0, grossWin: 0, grossLoss: 0 });
        }
        const agg = aggregated.get(setupType)!;
        const pnl = Number(pos.pnl_amount ?? 0);
        if (pnl >= 0) {
          agg.wins++;
          agg.grossWin += pnl;
        } else {
          agg.losses++;
          agg.grossLoss += Math.abs(pnl);
        }
        agg.totalPnl += pnl;
        agg.totalDays += Number(pos.holding_days ?? 0);
      }

      const result: SetupPerformanceItem[] = [];
      for (const [setupType, agg] of aggregated) {
        const total = agg.wins + agg.losses;
        result.push({
          setup_type: setupType,
          totalTrades: total,
          wins: agg.wins,
          losses: agg.losses,
          winRate: total > 0 ? Number(((agg.wins / total) * 100).toFixed(1)) : 0,
          totalPnl: Number(agg.totalPnl.toFixed(2)),
          avgPnl: total > 0 ? Number((agg.totalPnl / total).toFixed(2)) : 0,
          avgHoldingDays: total > 0 ? Number((agg.totalDays / total).toFixed(1)) : 0,
          profitFactor: agg.grossLoss > 0 ? Number((agg.grossWin / agg.grossLoss).toFixed(2)) : agg.grossWin > 0 ? Infinity : 0,
        });
      }

      return result.sort((a, b) => b.totalPnl - a.totalPnl);
    },
  });

  return { setupPerformance: data ?? [], isLoading, error };
}
