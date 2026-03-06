import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CandlestickPattern {
  indicator_name: string;
  value_1: number; // direction or pattern code
  value_2: number; // strength or direction
  value_3: number; // pattern code
  date: string;
}

export interface CandleSummary {
  primaryCode: number;
  direction: number; // 1=bull, -1=bear, 0=neutral
  strength: number;  // 1-3
  patternCount: number;
  secondaryCode: number;
  date: string;
}

export const PATTERN_NAMES: Record<number, string> = {
  0: "Keine",
  1: "Hammer",
  2: "Inverted Hammer",
  3: "Shooting Star",
  4: "Hanging Man",
  5: "Doji",
  6: "Spinning Top",
  7: "Marubozu",
  8: "Bull Engulfing",
  9: "Bear Engulfing",
  10: "Piercing Line",
  11: "Dark Cloud",
  12: "Harami",
  13: "Morning Star",
  14: "Evening Star",
  15: "Three Soldiers",
  16: "Three Crows",
};

export const PATTERN_DIRECTIONS: Record<number, { label: string; color: string }> = {
  1: { label: "Bullish", color: "text-bullish" },
  [-1]: { label: "Bearish", color: "text-bearish" },
  0: { label: "Neutral", color: "text-muted-foreground" },
};

export function useCandlestickPatterns(symbol: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["candlestick-patterns", symbol],
    queryFn: async () => {
      // Get latest date
      const { data: dateRow } = await supabase
        .from("technical_indicators")
        .select("date")
        .eq("symbol", symbol)
        .eq("indicator_name", "CANDLE_SUMMARY")
        .order("date", { ascending: false })
        .limit(1)
        .single();

      if (!dateRow) return { summary: null, patterns: [], history: [] };

      const latestDate = dateRow.date;

      // Fetch all candlestick indicators for latest date + last 5 days history
      const [currentRes, historyRes] = await Promise.all([
        supabase
          .from("technical_indicators")
          .select("indicator_name, value_1, value_2, value_3, date")
          .eq("symbol", symbol)
          .eq("date", latestDate)
          .eq("indicator_category", "candlestick")
          .order("indicator_name"),
        supabase
          .from("technical_indicators")
          .select("indicator_name, value_1, value_2, value_3, value_4, value_5, date")
          .eq("symbol", symbol)
          .eq("indicator_name", "CANDLE_SUMMARY")
          .order("date", { ascending: false })
          .limit(5),
      ]);

      const allIndicators = currentRes.data ?? [];
      const summaryRow = allIndicators.find((i) => i.indicator_name === "CANDLE_SUMMARY");
      const patterns = allIndicators.filter(
        (i) => i.indicator_name.startsWith("CANDLE_") && i.indicator_name !== "CANDLE_SUMMARY"
      );

      const summary: CandleSummary | null = summaryRow
        ? {
            primaryCode: Number(summaryRow.value_1),
            direction: Number(summaryRow.value_2),
            strength: Number(summaryRow.value_3),
            patternCount: 0, // will be set below
            secondaryCode: 0,
            date: latestDate,
          }
        : null;

      // History for last 5 days
      const history = (historyRes.data ?? []).map((h: any) => ({
        date: h.date,
        primaryCode: Number(h.value_1),
        direction: Number(h.value_2),
        strength: Number(h.value_3),
        patternCount: Number(h.value_4),
        secondaryCode: Number(h.value_5),
      }));

      if (summary && history.length > 0) {
        summary.patternCount = history[0].patternCount;
        summary.secondaryCode = history[0].secondaryCode;
      }

      return { summary, patterns, history };
    },
    enabled: !!symbol,
    refetchInterval: 5 * 60 * 1000,
  });

  return {
    summary: data?.summary ?? null,
    patterns: data?.patterns ?? [],
    history: data?.history ?? [],
    isLoading,
  };
}
