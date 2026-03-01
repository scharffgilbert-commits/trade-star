import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MarketRegime {
  id: number;
  symbol: string;
  analysis_date: string;
  regime: string; // TRENDING_UP, TRENDING_DOWN, SIDEWAYS, VOLATILE
  confidence: number;
  volatility_percentile: number | null;
  trend_strength: number | null;
  created_at: string;
}

export function useMarketRegimes(symbol?: string, days: number = 180) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["market-regimes", symbol ?? "all", days],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("market_regimes")
        .select("*")
        .gte("analysis_date", cutoff.toISOString().split("T")[0])
        .order("analysis_date", { ascending: true });

      if (symbol) {
        query = query.eq("symbol", symbol);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MarketRegime[];
    },
  });

  return { regimes: data ?? [], isLoading, error };
}
