import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DemoPosition {
  id: number;
  account_id: number;
  symbol: string;
  decision_id: number | null;
  position_type: string;
  position_status: string;
  quantity: number;
  entry_price: number;
  current_price: number | null;
  stop_loss: number | null;
  take_profit_1: number | null;
  take_profit_2: number | null;
  take_profit_3: number | null;
  exit_price: number | null;
  pnl_amount: number | null;
  pnl_percent: number | null;
  trade_cost: number | null;
  trigger_source: string | null;
  notes: string | null;
  opened_at: string | null;
  closed_at: string | null;
  holding_days: number | null;
  trailing_stop_price: number | null;
  trailing_stop_percent: number | null;
  trailing_stop_activated: boolean | null;
  trailing_stop_type: string | null;
  // V8.3 CFD fields
  margin_required: number | null;
  notional_value: number | null;
  overnight_fees_total: number | null;
  is_cfd: boolean | null;
}

export function useOpenPositions(accountId: number = 1) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["open-positions", accountId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("demo_positions")
        .select("*")
        .eq("account_id", accountId)
        .in("position_status", ["OPEN", "PENDING"])
        .order("opened_at", { ascending: false });
      if (error) throw error;
      return data as DemoPosition[];
    },
    refetchInterval: 30000,
  });

  return { positions: data ?? [], isLoading, error, refetch };
}
