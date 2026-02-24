import { SymbolCardData } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";

const StrandBar = ({ label, value, color }: { label: string; value: number | null; color: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-muted-foreground w-6">{label}</span>
    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%`, backgroundColor: color }}
      />
    </div>
    <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">{value?.toFixed(0) ?? "—"}</span>
  </div>
);

const CrocDot = ({ value, label }: { value: number | null; label: string }) => {
  const color = value === 1 ? "bg-bullish" : value === -1 ? "bg-bearish" : "bg-neutral";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  );
};

const ActionBadge = ({ action }: { action: string | null }) => {
  if (!action) return <span className="text-xs text-muted-foreground">—</span>;
  const styles: Record<string, string> = {
    LONG: "bg-bullish/15 text-bullish border-bullish/30",
    SHORT: "bg-bearish/15 text-bearish border-bearish/30",
    CASH: "bg-neutral/15 text-neutral border-neutral/30",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${styles[action] ?? "bg-muted text-muted-foreground border-border"}`}>
      {action}
    </span>
  );
};

export default function SymbolCard({ data }: { data: SymbolCardData }) {
  const navigate = useNavigate();
  const { symbol, name, price, actionType, confidenceScore, strand1LongScore, strand1ShortScore, strand2Confidence, strand3LongScore, strand3ShortScore, strand4LongScore, strand4ShortScore, crocStatus, crocCandle, crocCloud } = data;

  // Use directional scores based on action
  const isLong = actionType === "LONG";
  const s1 = isLong ? strand1LongScore : strand1ShortScore;
  const s3 = isLong ? strand3LongScore : strand3ShortScore;
  const s4 = isLong ? strand4LongScore : strand4ShortScore;

  return (
    <div
      onClick={() => navigate(`/symbol/${symbol}`)}
      className="card-elevated rounded-xl border border-border/50 p-4 cursor-pointer hover:border-primary/30 transition-all hover:shadow-lg group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">{symbol}</div>
          <div className="text-xs text-muted-foreground truncate max-w-[140px]">{name}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm font-semibold text-foreground">
            ${price?.toFixed(2) ?? "—"}
          </div>
          <ActionBadge action={actionType} />
        </div>
      </div>

      {/* 4-Strand Scores */}
      <div className="space-y-1 mb-3">
        <StrandBar label="S1" value={s1} color="hsl(217, 91%, 60%)" />
        <StrandBar label="S2" value={strand2Confidence} color="hsl(270, 60%, 60%)" />
        <StrandBar label="S3" value={s3} color="hsl(142, 71%, 45%)" />
        <StrandBar label="S4" value={s4} color="hsl(30, 90%, 55%)" />
      </div>

      {/* CROC Status & Confidence */}
      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        <div className="flex items-center gap-2">
          <CrocDot value={crocStatus} label="Stat" />
          <CrocDot value={crocCandle} label="Kerz" />
          <CrocDot value={crocCloud} label="Wolk" />
        </div>
        {confidenceScore != null && (
          <div className="text-right">
            <div className="font-mono text-sm font-bold text-foreground">{confidenceScore.toFixed(0)}%</div>
            <div className="text-[9px] text-muted-foreground">Confidence</div>
          </div>
        )}
      </div>
    </div>
  );
}
