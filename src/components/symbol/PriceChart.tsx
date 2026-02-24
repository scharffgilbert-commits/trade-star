import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface PriceChartProps {
  symbol: string;
}

export default function PriceChart({ symbol }: PriceChartProps) {
  const priceQuery = useQuery({
    queryKey: ["price-chart", symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_stock_prices_all")
        .select("date, open, high, low, close, volume")
        .eq("symbol", symbol)
        .order("date", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data.reverse();
    },
  });

  const crocQuery = useQuery({
    queryKey: ["croc-lines", symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technical_indicators")
        .select("date, indicator_name, value_1, value_2, value_3")
        .eq("symbol", symbol)
        .in("indicator_name", ["CROC_ALLIGATOR", "CROC_RAINBOW"])
        .order("date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  if (priceQuery.isLoading) return <Skeleton className="h-64 w-full" />;

  // Merge price data with CROC indicators
  const crocMap = new Map<string, { jaw?: number; teeth?: number; lips?: number; ema6?: number; ema24?: number; ema100?: number }>();
  for (const ind of crocQuery.data ?? []) {
    const key = ind.date;
    if (!crocMap.has(key)) crocMap.set(key, {});
    const entry = crocMap.get(key)!;
    if (ind.indicator_name === "CROC_ALLIGATOR") {
      entry.jaw = ind.value_1 ?? undefined;
      entry.teeth = ind.value_2 ?? undefined;
      entry.lips = ind.value_3 ?? undefined;
    } else if (ind.indicator_name === "CROC_RAINBOW") {
      entry.ema6 = ind.value_1 ?? undefined;
      entry.ema24 = ind.value_2 ?? undefined;
      entry.ema100 = ind.value_3 ?? undefined;
    }
  }

  const chartData = (priceQuery.data ?? []).map((p) => {
    const croc = crocMap.get(p.date!) ?? {};
    return {
      date: p.date?.slice(5) ?? "",
      open: Number(p.open),
      high: Number(p.high),
      low: Number(p.low),
      close: Number(p.close),
      volume: Number(p.volume),
      jaw: croc.jaw,
      teeth: croc.teeth,
      lips: croc.lips,
    };
  });

  const allPrices = chartData.flatMap((d) => [d.high, d.low, d.jaw, d.teeth, d.lips].filter(Boolean) as number[]);
  const minPrice = Math.min(...allPrices) * 0.995;
  const maxPrice = Math.max(...allPrices) * 1.005;

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 14%, 16%)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215, 12%, 55%)" }} tickLine={false} />
          <YAxis domain={[minPrice, maxPrice]} tick={{ fontSize: 10, fill: "hsl(215, 12%, 55%)" }} tickLine={false} width={60} />
          <Tooltip
            contentStyle={{
              background: "hsl(228, 18%, 10%)",
              border: "1px solid hsl(228, 14%, 16%)",
              borderRadius: "8px",
              fontSize: 12,
            }}
          />
          {/* Candlestick approximation with bar */}
          <Bar dataKey="high" fill="transparent" />
          <Line type="monotone" dataKey="close" stroke="hsl(217, 91%, 60%)" dot={false} strokeWidth={2} />
          {/* Crocodile lines */}
          <Line type="monotone" dataKey="jaw" stroke="#3b82f6" dot={false} strokeWidth={1} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="teeth" stroke="#ef4444" dot={false} strokeWidth={1} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="lips" stroke="#22c55e" dot={false} strokeWidth={1} strokeDasharray="4 2" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
