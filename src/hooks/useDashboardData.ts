import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SymbolCardData {
  symbol: string;
  name: string;
  type: string;
  price: number | null;
  priceDate: string | null;
  priceChangePct: number | null;
  priceChangeAbs: number | null;
  prevClose: number | null;
  actionType: string | null;
  confidenceScore: number | null;
  grade: string | null;
  decisionTimestamp: string | null;
  reasoning: string | null;
  strand1LongScore: number | null;
  strand1ShortScore: number | null;
  strand2Confidence: number | null;
  strand3LongScore: number | null;
  strand3ShortScore: number | null;
  strand4LongScore: number | null;
  strand4ShortScore: number | null;
  crocStatus: number | null;
  crocCandle: number | null;
  crocCloud: number | null;
  activeIceSignals: number;
  bullSignals: number;
  bearSignals: number;
}

export function useDashboardData() {
  // Single query via v_dashboard_cards view (replaces 4 separate queries)
  const viewQuery = useQuery({
    queryKey: ["dashboard-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_dashboard_cards")
        .select("*");
      if (error) throw error;
      return data;
    },
    refetchInterval: 300000, // 5 minutes
  });

  const isLoading = viewQuery.isLoading;

  const cardData: SymbolCardData[] = (viewQuery.data ?? []).map((row: any) => ({
    symbol: row.symbol,
    name: row.company_name ?? "",
    type: row.asset_type ?? "",
    price: row.current_price ? Number(row.current_price) : null,
    priceDate: row.price_date ?? null,
    priceChangePct: row.price_change_pct ? Number(row.price_change_pct) : null,
    priceChangeAbs: row.price_change_abs ? Number(row.price_change_abs) : null,
    prevClose: row.prev_close ? Number(row.prev_close) : null,
    actionType: row.action_type ?? null,
    confidenceScore: row.confidence_score ? Number(row.confidence_score) : null,
    grade: row.grade ?? null,
    decisionTimestamp: row.decision_timestamp ?? null,
    reasoning: row.reasoning ?? null,
    strand1LongScore: row.strand1_long_score ? Number(row.strand1_long_score) : null,
    strand1ShortScore: row.strand1_short_score ? Number(row.strand1_short_score) : null,
    strand2Confidence: row.strand2_confidence ? Number(row.strand2_confidence) : null,
    strand3LongScore: row.strand3_long_score ? Number(row.strand3_long_score) : null,
    strand3ShortScore: row.strand3_short_score ? Number(row.strand3_short_score) : null,
    strand4LongScore: row.strand4_long_score ? Number(row.strand4_long_score) : null,
    strand4ShortScore: row.strand4_short_score ? Number(row.strand4_short_score) : null,
    crocStatus: row.croc_status_value ? Number(row.croc_status_value) : null,
    crocCandle: null,
    crocCloud: null,
    activeIceSignals: row.live_ice_signals ?? 0,
    bullSignals: row.bull_signals ?? 0,
    bearSignals: row.bear_signals ?? 0,
  }));

  return { cardData, isLoading };
}
