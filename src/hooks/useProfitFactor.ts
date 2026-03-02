import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProfitFactorData {
  profitFactor: number | null;
  longWinRate: number | null;
  shortWinRate: number | null;
  longPnl: number;
  shortPnl: number;
  totalWins: number;
  totalLosses: number;
  isLoading: boolean;
}

export function useProfitFactor(accountId: number): ProfitFactorData {
  const { data, isLoading } = useQuery({
    queryKey: ["profit-factor", accountId],
    queryFn: async () => {
      const { data: positions, error } = await (supabase as any)
        .from("demo_positions")
        .select("position_type, pnl_amount, pnl_percent, position_status")
        .eq("account_id", accountId)
        .in("position_status", ["CLOSED", "STOPPED_OUT"]);
      if (error) throw error;
      if (!positions || positions.length === 0) return null;

      let grossProfit = 0;
      let grossLoss = 0;
      let longWins = 0;
      let longTotal = 0;
      let shortWins = 0;
      let shortTotal = 0;
      let longPnl = 0;
      let shortPnl = 0;

      for (const p of positions) {
        const pnl = Number(p.pnl_amount ?? 0);
        const isLong = p.position_type === "LONG";

        if (pnl > 0) grossProfit += pnl;
        else grossLoss += Math.abs(pnl);

        if (isLong) {
          longTotal++;
          longPnl += pnl;
          if (pnl > 0) longWins++;
        } else {
          shortTotal++;
          shortPnl += pnl;
          if (pnl > 0) shortWins++;
        }
      }

      return {
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null,
        longWinRate: longTotal > 0 ? (longWins / longTotal) * 100 : null,
        shortWinRate: shortTotal > 0 ? (shortWins / shortTotal) * 100 : null,
        longPnl,
        shortPnl,
        totalWins: longWins + shortWins,
        totalLosses: (longTotal - longWins) + (shortTotal - shortWins),
      };
    },
    staleTime: 60000,
  });

  return {
    profitFactor: data?.profitFactor ?? null,
    longWinRate: data?.longWinRate ?? null,
    shortWinRate: data?.shortWinRate ?? null,
    longPnl: data?.longPnl ?? 0,
    shortPnl: data?.shortPnl ?? 0,
    totalWins: data?.totalWins ?? 0,
    totalLosses: data?.totalLosses ?? 0,
    isLoading,
  };
}
