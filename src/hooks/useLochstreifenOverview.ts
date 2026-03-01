import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LochstreifenOverviewItem {
  symbol: string;
  analysis_date: string;
  status_row: string;
  candle_row: string;
  cloud_row: string;
  trend_row: string;
  setter_row: string;
  wave_row: string;
  day_counter: number;
  overall_score: number;
}

export function useLochstreifenOverview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["lochstreifen-overview"],
    queryFn: async () => {
      // Get latest lochstreifen per symbol using DISTINCT ON
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .rpc("get_latest_lochstreifen");

      if (error) {
        // Fallback: Query last 3 days and deduplicate client-side
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 3);

        const { data: fallbackData, error: fallbackError } = await (supabase as any)
          .from("lochstreifen_state")
          .select("symbol, analysis_date, status_row, candle_row, cloud_row, trend_row, setter_row, wave_row, day_counter, overall_score")
          .gte("analysis_date", cutoff.toISOString().split("T")[0])
          .order("analysis_date", { ascending: false });

        if (fallbackError) throw fallbackError;

        // Deduplicate: keep latest per symbol
        const seen = new Set<string>();
        const unique: LochstreifenOverviewItem[] = [];
        for (const row of (fallbackData ?? [])) {
          if (!seen.has(row.symbol)) {
            seen.add(row.symbol);
            unique.push(row);
          }
        }
        return unique;
      }

      return data as LochstreifenOverviewItem[];
    },
    staleTime: 60_000, // 1 min
  });

  return { overview: data ?? [], isLoading, error };
}
