import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  symbol: string;
}

export default function IceSignalsList({ symbol }: Props) {
  const query = useQuery({
    queryKey: ["ice-signals", symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("croc_ice_signals")
        .select("signal_type, direction, signal_strength, trigger_price, stop_price, expiry_date, signal_date")
        .eq("symbol", symbol)
        .eq("is_active", true)
        .order("signal_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <h2 className="font-display text-sm font-semibold text-foreground mb-3">🧊 Aktive ICE-Signale</h2>
      {(query.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine aktiven Signale</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {(query.data ?? []).map((s, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                  s.direction === "LONG" ? "bg-bullish/15 text-bullish" : "bg-bearish/15 text-bearish"
                }`}>
                  {s.direction}
                </span>
                <span className="text-muted-foreground">{s.signal_type}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">T: <span className="font-mono text-foreground">${Number(s.trigger_price).toFixed(2)}</span></span>
                <span className="text-muted-foreground">S: <span className="font-mono text-foreground">${Number(s.stop_price).toFixed(2)}</span></span>
                <span className="text-muted-foreground">⚡{s.signal_strength}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
