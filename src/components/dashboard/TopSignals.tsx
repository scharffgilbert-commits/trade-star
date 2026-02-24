import { SymbolCardData } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";

export default function TopSignals({ data }: { data: SymbolCardData[] }) {
  const navigate = useNavigate();
  const sorted = [...data]
    .filter((d) => d.confidenceScore != null && d.actionType !== "CASH")
    .sort((a, b) => (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0))
    .slice(0, 5);

  if (sorted.length === 0) return null;

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <h2 className="font-display text-sm font-semibold text-foreground mb-3">🔥 Top-Signale</h2>
      <div className="space-y-2">
        {sorted.map((d) => (
          <div
            key={d.symbol}
            onClick={() => navigate(`/symbol/${d.symbol}`)}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-foreground">{d.symbol}</span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                d.actionType === "LONG" ? "bg-bullish/15 text-bullish" : "bg-bearish/15 text-bearish"
              }`}>
                {d.actionType}
              </span>
            </div>
            <span className="font-mono text-sm font-bold text-primary">{d.confidenceScore?.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
