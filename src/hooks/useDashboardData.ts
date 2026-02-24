import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SymbolCardData {
  symbol: string;
  name: string;
  type: string;
  price: number | null;
  priceDate: string | null;
  actionType: string | null;
  confidenceScore: number | null;
  decisionTimestamp: string | null;
  strand1LongScore: number | null;
  strand1ShortScore: number | null;
  strand2Confidence: number | null;
  strand3LongScore: number | null;
  strand3ShortScore: number | null;
  strand4LongScore: number | null;
  strand4ShortScore: number | null;
  crocStatus: number | null; // value_1: 1=green, 0=yellow, -1=red
  crocCandle: number | null; // value_2
  crocCloud: number | null;  // value_3
}

export function useDashboardData() {
  const symbolsQuery = useQuery({
    queryKey: ["symbols-master"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("symbols_master")
        .select("symbol, name, type")
        .eq("active", true)
        .order("priority");
      if (error) throw error;
      return data;
    },
  });

  const pricesQuery = useQuery({
    queryKey: ["latest-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_latest_prices")
        .select("symbol, close, date");
      if (error) throw error;
      return data;
    },
  });

  const decisionsQuery = useQuery({
    queryKey: ["latest-decisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trading_decisions")
        .select("symbol, action_type, confidence_score, decision_timestamp, strand1_long_score, strand1_short_score, strand2_confidence, strand3_long_score, strand3_short_score, strand4_long_score, strand4_short_score")
        .order("decision_timestamp", { ascending: false })
        .limit(100);
      if (error) throw error;
      // Get latest per symbol
      const latest = new Map<string, typeof data[0]>();
      for (const d of data) {
        if (!latest.has(d.symbol)) latest.set(d.symbol, d);
      }
      return latest;
    },
  });

  const crocQuery = useQuery({
    queryKey: ["croc-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technical_indicators")
        .select("symbol, value_1, value_2, value_3, date")
        .eq("indicator_name", "CROC_STATUS")
        .order("date", { ascending: false })
        .limit(100);
      if (error) throw error;
      const latest = new Map<string, typeof data[0]>();
      for (const d of data) {
        if (!latest.has(d.symbol)) latest.set(d.symbol, d);
      }
      return latest;
    },
  });

  const isLoading = symbolsQuery.isLoading || pricesQuery.isLoading || decisionsQuery.isLoading || crocQuery.isLoading;

  const cardData: SymbolCardData[] = (symbolsQuery.data ?? []).map((sym) => {
    const price = pricesQuery.data?.find((p) => p.symbol === sym.symbol);
    const decision = decisionsQuery.data?.get(sym.symbol);
    const croc = crocQuery.data?.get(sym.symbol);
    return {
      symbol: sym.symbol,
      name: sym.name,
      type: sym.type ?? "",
      price: price?.close ?? null,
      priceDate: price?.date ?? null,
      actionType: decision?.action_type ?? null,
      confidenceScore: decision?.confidence_score ?? null,
      decisionTimestamp: decision?.decision_timestamp ?? null,
      strand1LongScore: decision?.strand1_long_score ?? null,
      strand1ShortScore: decision?.strand1_short_score ?? null,
      strand2Confidence: decision?.strand2_confidence ?? null,
      strand3LongScore: decision?.strand3_long_score ?? null,
      strand3ShortScore: decision?.strand3_short_score ?? null,
      strand4LongScore: decision?.strand4_long_score ?? null,
      strand4ShortScore: decision?.strand4_short_score ?? null,
      crocStatus: croc?.value_1 ?? null,
      crocCandle: croc?.value_2 ?? null,
      crocCloud: croc?.value_3 ?? null,
    };
  });

  return { cardData, isLoading };
}
