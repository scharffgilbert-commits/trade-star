import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SymbolTrade {
  id: number;
  account_id: number;
  symbol: string;
  position_type: string;
  position_status: string;
  quantity: number;
  entry_price: number;
  exit_price: number | null;
  current_price: number | null;
  stop_loss: number | null;
  take_profit_1: number | null;
  pnl_amount: number | null;
  pnl_percent: number | null;
  holding_days: number | null;
  trigger_source: string | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

export function useSymbolTradeHistory(symbol: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["symbol-trade-history", symbol],
    queryFn: async () => {
      // Get trades for this symbol across BOTH accounts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("demo_positions")
        .select("*")
        .eq("symbol", symbol)
        .order("opened_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as SymbolTrade[];
    },
    enabled: !!symbol,
  });

  return { trades: data ?? [], isLoading, error };
}
