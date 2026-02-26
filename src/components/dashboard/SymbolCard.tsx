import { SymbolCardData } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "vor <1h";
  if (hours < 24) return `vor ${hours}h`;
  const days = Math.floor(hours / 24);
  return `vor ${days}d`;
}

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

const ActionBadge = ({ action, grade }: { action: string | null; grade: string | null }) => {
  if (!action) return <span className="text-xs text-muted-foreground">—</span>;
  const styles: Record<string, string> = {
    LONG: "bg-bullish/15 text-bullish border-bullish/30",
    SHORT: "bg-bearish/15 text-bearish border-bearish/30",
    CASH: "bg-neutral/15 text-neutral border-neutral/30",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${styles[action] ?? "bg-muted text-muted-foreground border-border"}`}>
      {action}{grade ? ` ${grade}` : ""}
    </span>
  );
};

export default function SymbolCard({ data }: { data: SymbolCardData }) {
  const navigate = useNavigate();
  const {
    symbol, name, price, priceChangePct, actionType, grade, confidenceScore,
    decisionTimestamp, reasoning,
    strand1LongScore, strand1ShortScore, strand2Confidence,
    strand3LongScore, strand3ShortScore, strand4LongScore, strand4ShortScore,
    crocStatus, activeIceSignals, bullSignals, bearSignals,
  } = data;

  // Use directional scores based on action
  const isLong = actionType === "LONG";
  const s1 = isLong ? strand1LongScore : strand1ShortScore;
  const s3 = isLong ? strand3LongScore : strand3ShortScore;
  const s4 = isLong ? strand4LongScore : strand4ShortScore;

  const analysisAge = timeAgo(decisionTimestamp);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={() => navigate(`/symbol/${symbol}`)}
            className="card-elevated rounded-xl border border-border/50 p-4 cursor-pointer hover:border-primary/30 transition-all hover:shadow-lg group"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {symbol}
                </div>
                <div className="text-xs text-muted-foreground truncate max-w-[140px]">{name}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-semibold text-foreground">
                  ${price?.toFixed(2) ?? "—"}
                </div>
                {priceChangePct !== null && priceChangePct !== undefined && (
                  <div className={cn(
                    "flex items-center justify-end gap-0.5 text-xs font-mono",
                    priceChangePct >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {priceChangePct >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {priceChangePct >= 0 ? "+" : ""}{priceChangePct.toFixed(2)}%
                  </div>
                )}
              </div>
            </div>

            {/* Action Badge + Analysis Age */}
            <div className="flex items-center justify-between mb-3">
              <ActionBadge action={actionType} grade={grade} />
              {analysisAge && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {analysisAge}
                </span>
              )}
            </div>

            {/* 4-Strand Scores */}
            <div className="space-y-1 mb-3">
              <StrandBar label="S1" value={s1} color="hsl(217, 91%, 60%)" />
              <StrandBar label="S2" value={strand2Confidence} color="hsl(270, 60%, 60%)" />
              <StrandBar label="S3" value={s3} color="hsl(142, 71%, 45%)" />
              <StrandBar label="S4" value={s4} color="hsl(30, 90%, 55%)" />
            </div>

            {/* CROC Status & ICE Signals & Confidence */}
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div className="flex items-center gap-3">
                <CrocDot value={crocStatus} label="CROC" />
                {activeIceSignals > 0 && (
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-yellow-400" />
                    <span className="text-[10px] font-mono">
                      <span className="text-green-400">{bullSignals}</span>
                      /
                      <span className="text-red-400">{bearSignals}</span>
                    </span>
                  </div>
                )}
              </div>
              {confidenceScore != null && (
                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-foreground">{confidenceScore.toFixed(0)}%</div>
                  <div className="text-[9px] text-muted-foreground">Konfidenz</div>
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        {reasoning && (
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-xs font-medium mb-1">AI-Analyse:</p>
            <p className="text-xs text-muted-foreground line-clamp-3">{reasoning}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
