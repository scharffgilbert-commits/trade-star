import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DetectedSetup {
  id: number;
  symbol: string;
  setup_type: string;
  direction: string;
  confidence: number;
  detection_date: string;
  is_active: boolean;
  entry_price: number | null;
  stop_loss_price: number | null;
  take_profit_price: number | null;
  risk_reward_ratio: number | null;
  notes: string | null;
  created_at: string;
}

export function useDetectedSetups(symbol?: string, activeOnly: boolean = false) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["detected-setups", symbol ?? "all", activeOnly],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("detected_setups")
        .select("*")
        .order("detection_date", { ascending: false })
        .limit(100);

      if (symbol) {
        query = query.eq("symbol", symbol);
      }

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DetectedSetup[];
    },
  });

  return { setups: data ?? [], isLoading, error };
}
