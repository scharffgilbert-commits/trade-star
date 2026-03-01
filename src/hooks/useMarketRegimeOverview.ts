import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MarketRegimeOverviewItem {
  symbol: string;
  analysis_date: string;
  regime: string;
  confidence: number;
  volatility_percentile: number | null;
  trend_strength: number | null;
}

export function useMarketRegimeOverview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["market-regime-overview"],
    queryFn: async () => {
      // Try RPC first for DISTINCT ON, fallback to client-side dedup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .rpc("get_latest_market_regimes");

      if (error) {
        // Fallback: Query last 5 days and deduplicate client-side
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 5);

        const { data: fallbackData, error: fallbackError } = await (supabase as any)
          .from("market_regimes")
          .select("symbol, analysis_date, regime, confidence, volatility_percentile, trend_strength")
          .gte("analysis_date", cutoff.toISOString().split("T")[0])
          .order("analysis_date", { ascending: false });

        if (fallbackError) throw fallbackError;

        // Deduplicate: keep latest per symbol
        const seen = new Set<string>();
        const unique: MarketRegimeOverviewItem[] = [];
        for (const row of (fallbackData ?? [])) {
          if (!seen.has(row.symbol)) {
            seen.add(row.symbol);
            unique.push(row);
          }
        }
        return unique;
      }

      return data as MarketRegimeOverviewItem[];
    },
    staleTime: 60_000,
  });

  return { regimeOverview: data ?? [], isLoading, error };
}
