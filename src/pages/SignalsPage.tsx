import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SignalsPage() {
  const [symbolFilter, setSymbolFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");

  const query = useQuery({
    queryKey: ["all-decisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trading_decisions")
        .select("symbol, decision_timestamp, action_type, confidence_score, entry_price, stop_loss, take_profit_1, take_profit_2, take_profit_3, reasoning, croc_status, ice_signals_active, strand1_signal, strand2_signal, strand3_signal, strand4_signal")
        .order("decision_timestamp", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const symbols = [...new Set((query.data ?? []).map((d) => d.symbol))].sort();
  
  const filtered = (query.data ?? []).filter((d) => {
    if (symbolFilter !== "ALL" && d.symbol !== symbolFilter) return false;
    if (actionFilter !== "ALL" && d.action_type !== actionFilter) return false;
    return true;
  });

  const actionColors: Record<string, string> = {
    LONG: "bg-bullish/15 text-bullish",
    SHORT: "bg-bearish/15 text-bearish",
    CASH: "bg-neutral/15 text-neutral",
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-foreground">Signale & Entscheidungen</h1>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={symbolFilter} onValueChange={setSymbolFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Symbol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle</SelectItem>
            {symbols.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Aktion" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle</SelectItem>
            <SelectItem value="LONG">LONG</SelectItem>
            <SelectItem value="SHORT">SHORT</SelectItem>
            <SelectItem value="CASH">CASH</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="card-elevated rounded-xl border border-border/50 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border/30">
              <th className="text-left p-3 font-medium">Symbol</th>
              <th className="text-left p-3 font-medium">Datum</th>
              <th className="text-left p-3 font-medium">Aktion</th>
              <th className="text-right p-3 font-medium">Conf.</th>
              <th className="text-right p-3 font-medium">Entry</th>
              <th className="text-right p-3 font-medium">Stop</th>
              <th className="text-right p-3 font-medium">TP1</th>
              <th className="text-right p-3 font-medium">TP2</th>
              <th className="text-right p-3 font-medium">TP3</th>
              <th className="text-left p-3 font-medium">CROC</th>
              <th className="text-left p-3 font-medium">Stränge</th>
              <th className="text-left p-3 font-medium max-w-[200px]">Begründung</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={i} className="border-b border-border/10 hover:bg-muted/30">
                <td className="p-3 font-mono font-bold text-foreground">{d.symbol}</td>
                <td className="p-3 font-mono text-muted-foreground">
                  {new Date(d.decision_timestamp).toLocaleDateString("de-DE")}
                </td>
                <td className="p-3">
                  <span className={`font-semibold px-1.5 py-0.5 rounded ${actionColors[d.action_type] ?? ""}`}>
                    {d.action_type}
                  </span>
                </td>
                <td className="p-3 text-right font-mono text-foreground">{d.confidence_score != null ? `${Number(d.confidence_score).toFixed(0)}%` : "—"}</td>
                <td className="p-3 text-right font-mono text-muted-foreground">{d.entry_price != null ? `$${Number(d.entry_price).toFixed(2)}` : "—"}</td>
                <td className="p-3 text-right font-mono text-muted-foreground">{d.stop_loss != null ? `$${Number(d.stop_loss).toFixed(2)}` : "—"}</td>
                <td className="p-3 text-right font-mono text-muted-foreground">{d.take_profit_1 != null ? `$${Number(d.take_profit_1).toFixed(2)}` : "—"}</td>
                <td className="p-3 text-right font-mono text-muted-foreground">{d.take_profit_2 != null ? `$${Number(d.take_profit_2).toFixed(2)}` : "—"}</td>
                <td className="p-3 text-right font-mono text-muted-foreground">{d.take_profit_3 != null ? `$${Number(d.take_profit_3).toFixed(2)}` : "—"}</td>
                <td className="p-3 text-muted-foreground">{d.croc_status ?? "—"}</td>
                <td className="p-3 font-mono text-muted-foreground text-[10px]">
                  {[d.strand1_signal, d.strand2_signal, d.strand3_signal, d.strand4_signal].filter(Boolean).join("/") || "—"}
                </td>
                <td className="p-3 text-muted-foreground max-w-[200px] truncate" title={d.reasoning ?? ""}>
                  {d.reasoning?.slice(0, 80) ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
