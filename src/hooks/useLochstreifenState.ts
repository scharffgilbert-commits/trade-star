import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LochstreifenRow {
  id: number;
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
  created_at: string;
}

export function useLochstreifenState(symbol: string, days: number = 20) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["lochstreifen-state", symbol, days],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("lochstreifen_state")
        .select("*")
        .eq("symbol", symbol)
        .gte("analysis_date", cutoff.toISOString().split("T")[0])
        .order("analysis_date", { ascending: true });

      if (error) throw error;
      return data as LochstreifenRow[];
    },
    enabled: !!symbol,
  });

  return { lochstreifen: data ?? [], isLoading, error };
}
