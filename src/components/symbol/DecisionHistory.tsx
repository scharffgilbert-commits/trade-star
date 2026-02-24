import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  symbol: string;
}

export default function DecisionHistory({ symbol }: Props) {
  const query = useQuery({
    queryKey: ["decision-history", symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trading_decisions")
        .select("decision_timestamp, action_type, confidence_score, entry_price, stop_loss, take_profit_1, take_profit_2, take_profit_3, reasoning, strand1_signal, strand2_signal, strand3_signal, strand4_signal")
        .eq("symbol", symbol)
        .order("decision_timestamp", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const actionColors: Record<string, string> = {
    LONG: "bg-bullish/15 text-bullish",
    SHORT: "bg-bearish/15 text-bearish",
    CASH: "bg-neutral/15 text-neutral",
  };

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <h2 className="font-display text-sm font-semibold text-foreground mb-3">📋 Entscheidungs-Historie (letzte 10)</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border/30">
              <th className="text-left py-1.5 font-medium">Datum</th>
              <th className="text-left py-1.5 font-medium">Aktion</th>
              <th className="text-right py-1.5 font-medium">Conf.</th>
              <th className="text-right py-1.5 font-medium">Entry</th>
              <th className="text-right py-1.5 font-medium">Stop</th>
              <th className="text-right py-1.5 font-medium">TP1</th>
              <th className="text-left py-1.5 font-medium">S1/S2/S3/S4</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((d, i) => (
              <tr key={i} className="border-b border-border/10 hover:bg-muted/30">
                <td className="py-1.5 font-mono text-muted-foreground">
                  {new Date(d.decision_timestamp).toLocaleDateString("de-DE")}
                </td>
                <td className="py-1.5">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${actionColors[d.action_type] ?? ""}`}>
                    {d.action_type}
                  </span>
                </td>
                <td className="py-1.5 text-right font-mono text-foreground">{d.confidence_score != null ? `${Number(d.confidence_score).toFixed(0)}%` : "—"}</td>
                <td className="py-1.5 text-right font-mono text-muted-foreground">{d.entry_price != null ? `$${Number(d.entry_price).toFixed(2)}` : "—"}</td>
                <td className="py-1.5 text-right font-mono text-muted-foreground">{d.stop_loss != null ? `$${Number(d.stop_loss).toFixed(2)}` : "—"}</td>
                <td className="py-1.5 text-right font-mono text-muted-foreground">{d.take_profit_1 != null ? `$${Number(d.take_profit_1).toFixed(2)}` : "—"}</td>
                <td className="py-1.5 font-mono text-muted-foreground text-[10px]">
                  {[d.strand1_signal, d.strand2_signal, d.strand3_signal, d.strand4_signal].filter(Boolean).join(" / ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
