import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PremiumSignal {
  id: number;
  symbol: string;
  signal_date: string;
  direction: string;
  signal_score: number;
  signal_type: string;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export function usePremiumSignals(symbol?: string, days: number = 90) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["premium-signals", symbol ?? "all", days],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("premium_signals")
        .select("*")
        .gte("signal_date", cutoff.toISOString().split("T")[0])
        .order("signal_date", { ascending: false })
        .limit(200);

      if (symbol) {
        query = query.eq("symbol", symbol);
      }

      const { data, error } = await query;
      if (error) throw error;
      // Map DB column signal_strength to interface signal_score
      return ((data ?? []) as any[]).map((d) => ({
        ...d,
        signal_score: d.signal_strength ?? 50,
      })) as PremiumSignal[];
    },
  });

  return { signals: data ?? [], isLoading, error };
}
