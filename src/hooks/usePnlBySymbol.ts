import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SymbolPnl {
  symbol: string;
  totalPnl: number;
  tradeCount: number;
  winCount: number;
}

export function usePnlBySymbol(accountId: number = 1) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["pnl-by-symbol", accountId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("demo_positions")
        .select("symbol, pnl_amount, position_status")
        .eq("account_id", accountId)
        .in("position_status", ["CLOSED", "STOPPED_OUT", "TP_HIT"]);
      if (error) throw error;

      const grouped = new Map<string, { totalPnl: number; tradeCount: number; winCount: number }>();

      for (const row of data) {
        const existing = grouped.get(row.symbol) ?? { totalPnl: 0, tradeCount: 0, winCount: 0 };
        existing.totalPnl += row.pnl_amount ?? 0;
        existing.tradeCount += 1;
        if ((row.pnl_amount ?? 0) > 0) existing.winCount += 1;
        grouped.set(row.symbol, existing);
      }

      const result: SymbolPnl[] = [];
      grouped.forEach((val, symbol) => {
        result.push({ symbol, ...val });
      });
      result.sort((a, b) => b.totalPnl - a.totalPnl);

      return result;
    },
  });

  return { symbolPnl: data ?? [], isLoading, error };
}
