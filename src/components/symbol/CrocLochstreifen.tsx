import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  symbol: string;
}

export default function CrocLochstreifen({ symbol }: Props) {
  const query = useQuery({
    queryKey: ["croc-lochstreifen", symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technical_indicators")
        .select("date, value_1, value_2, value_3")
        .eq("symbol", symbol)
        .eq("indicator_name", "CROC_STATUS")
        .order("date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data.reverse();
    },
  });

  const getColor = (val: number | null) => {
    if (val === 1) return "bg-bullish";
    if (val === -1) return "bg-bearish";
    return "bg-neutral";
  };

  const data = query.data ?? [];

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <h2 className="font-display text-sm font-semibold text-foreground mb-3">Lochstreifen (letzte 20 Tage)</h2>
      <div className="space-y-2">
        {["Status", "Kerze", "Wolke"].map((label, idx) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12">{label}</span>
            <div className="flex gap-1 flex-1">
              {data.map((d, i) => {
                const val = idx === 0 ? d.value_1 : idx === 1 ? d.value_2 : d.value_3;
                return (
                  <div
                    key={i}
                    className={`h-4 flex-1 rounded-sm ${getColor(val)} transition-colors`}
                    title={`${d.date}: ${val}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
        {data.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-12" />
            <div className="flex gap-1 flex-1">
              {data.map((d, i) => (
                <div key={i} className="flex-1 text-center text-[8px] text-muted-foreground">
                  {i % 5 === 0 ? d.date?.slice(5) : ""}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
