import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function CrocMonitor() {
  const iceQuery = useQuery({
    queryKey: ["all-ice-signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("croc_ice_signals")
        .select("symbol, signal_type, direction, signal_strength, trigger_price, stop_price, expiry_date, signal_date")
        .eq("is_active", true)
        .order("symbol")
        .order("signal_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const crocScoresQuery = useQuery({
    queryKey: ["croc-scores-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategy_analysis_cache")
        .select("symbol, analysis_date, ichimoku_long, ichimoku_short, technical_score_long, technical_score_short")
        .order("analysis_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      // Latest per symbol
      const latest = new Map<string, typeof data[0]>();
      for (const d of data) {
        if (!latest.has(d.symbol)) latest.set(d.symbol, d);
      }
      return Array.from(latest.values());
    },
  });

  // Group ICE by symbol
  const grouped = new Map<string, typeof iceQuery.data>();
  for (const s of iceQuery.data ?? []) {
    if (!grouped.has(s.symbol)) grouped.set(s.symbol, []);
    grouped.get(s.symbol)!.push(s);
  }

  const heatColor = (val: number | null) => {
    if (val == null) return "bg-muted text-muted-foreground";
    if (val >= 70) return "bg-bullish/30 text-bullish";
    if (val >= 40) return "bg-neutral/30 text-neutral";
    return "bg-bearish/30 text-bearish";
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">🐊 CROC/ICE Monitor</h1>

      {/* Heatmap */}
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <h2 className="font-display text-sm font-semibold text-foreground mb-3">Score Heatmap</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(crocScoresQuery.data ?? []).map((d) => (
            <div key={d.symbol} className="rounded-lg border border-border/30 p-3">
              <div className="font-mono text-sm font-bold text-foreground mb-2">{d.symbol}</div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div className={`rounded px-1.5 py-1 text-center ${heatColor(d.technical_score_long)}`}>
                  L: {d.technical_score_long != null ? Number(d.technical_score_long).toFixed(0) : "—"}
                </div>
                <div className={`rounded px-1.5 py-1 text-center ${heatColor(d.technical_score_short)}`}>
                  S: {d.technical_score_short != null ? Number(d.technical_score_short).toFixed(0) : "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active ICE Signals grouped by symbol */}
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <h2 className="font-display text-sm font-semibold text-foreground mb-3">🧊 Aktive ICE-Signale ({iceQuery.data?.length ?? 0})</h2>
        {grouped.size === 0 ? (
          <p className="text-sm text-muted-foreground">Keine aktiven Signale</p>
        ) : (
          <div className="space-y-4">
            {Array.from(grouped.entries()).map(([symbol, signals]) => (
              <div key={symbol}>
                <h3 className="font-mono text-sm font-bold text-foreground mb-2">{symbol}</h3>
                <div className="space-y-1">
                  {signals!.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                          s.direction === "LONG" ? "bg-bullish/15 text-bullish" : "bg-bearish/15 text-bearish"
                        }`}>
                          {s.direction}
                        </span>
                        <span className="text-muted-foreground">{s.signal_type}</span>
                        <span className="text-muted-foreground">⚡{s.signal_strength}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">T: <span className="font-mono text-foreground">${Number(s.trigger_price).toFixed(2)}</span></span>
                        <span className="text-muted-foreground">S: <span className="font-mono text-foreground">${Number(s.stop_price).toFixed(2)}</span></span>
                        {s.expiry_date && <span className="text-muted-foreground">Exp: {s.expiry_date}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
