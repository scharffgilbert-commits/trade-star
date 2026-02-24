import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  symbol: string;
}

export default function IndicatorsTable({ symbol }: Props) {
  const query = useQuery({
    queryKey: ["indicators-table", symbol],
    queryFn: async () => {
      // Get latest date first
      const { data: dateData } = await supabase
        .from("technical_indicators")
        .select("date")
        .eq("symbol", symbol)
        .order("date", { ascending: false })
        .limit(1);
      
      const latestDate = dateData?.[0]?.date;
      if (!latestDate) return [];

      const { data, error } = await supabase
        .from("technical_indicators")
        .select("indicator_name, indicator_category, value_1, value_2, value_3, signal_strength")
        .eq("symbol", symbol)
        .eq("date", latestDate)
        .order("indicator_category")
        .order("indicator_name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <h2 className="font-display text-sm font-semibold text-foreground mb-3">📊 Indikatoren</h2>
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border/30">
              <th className="text-left py-1 font-medium">Indikator</th>
              <th className="text-right py-1 font-medium">Wert 1</th>
              <th className="text-right py-1 font-medium">Wert 2</th>
              <th className="text-right py-1 font-medium">Signal</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((ind, i) => (
              <tr key={i} className="border-b border-border/10 hover:bg-muted/30">
                <td className="py-1.5 font-mono text-foreground">{ind.indicator_name}</td>
                <td className="py-1.5 text-right font-mono text-muted-foreground">{ind.value_1 != null ? Number(ind.value_1).toFixed(2) : "—"}</td>
                <td className="py-1.5 text-right font-mono text-muted-foreground">{ind.value_2 != null ? Number(ind.value_2).toFixed(2) : "—"}</td>
                <td className="py-1.5 text-right">
                  {ind.signal_strength != null && (
                    <span className={`font-mono font-bold ${Number(ind.signal_strength) > 0 ? "text-bullish" : Number(ind.signal_strength) < 0 ? "text-bearish" : "text-muted-foreground"}`}>
                      {Number(ind.signal_strength).toFixed(1)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
