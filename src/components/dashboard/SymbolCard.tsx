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
  <div className="flex items-center gap-1.5">
    <span className="text-[9px] text-muted-foreground w-5">{label}</span>
    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%`, backgroundColor: color }}
      />
    </div>
    <span className="text-[9px] font-mono text-muted-foreground w-6 text-right">{value?.toFixed(0) ?? "—"}</span>
  </div>
);

const CrocDot = ({ value, label }: { value: number | null; label: string }) => {
  const color = value === 1 ? "bg-bullish" : value === -1 ? "bg-bearish" : "bg-neutral";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[8px] text-muted-foreground">{label}</span>
    </div>
  );
};

const ActionBadge = ({ action, grade }: { action: string | null; grade: string | null }) => {
  if (!action) return <span className="text-[10px] text-muted-foreground">—</span>;
  const styles: Record<string, string> = {
    LONG: "bg-bullish/15 text-bullish border-bullish/30",
    SHORT: "bg-bearish/15 text-bearish border-bearish/30",
    CASH: "bg-neutral/15 text-neutral border-neutral/30",
  };
  return (
    <span className={`text-[10px] font-semibold px-1 h-4 inline-flex items-center rounded border ${styles[action] ?? "bg-muted text-muted-foreground border-border"}`}>
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
            className="card-elevated rounded-lg border border-border/50 p-3 cursor-pointer hover:border-primary/40 transition-colors group"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  {symbol}
                </div>
                <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{name}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-semibold text-foreground">
                  ${price?.toFixed(2) ?? "—"}
                </div>
                {priceChangePct !== null && priceChangePct !== undefined && (
                  <div className={cn(
                    "flex items-center justify-end gap-0.5 text-[10px] font-mono",
                    priceChangePct >= 0 ? "text-bullish" : "text-bearish"
                  )}>
                    {priceChangePct >= 0 ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    {priceChangePct >= 0 ? "+" : ""}{priceChangePct.toFixed(2)}%
                  </div>
                )}
              </div>
            </div>

            {/* Action Badge + Analysis Age */}
            <div className="flex items-center justify-between mb-2">
              <ActionBadge action={actionType} grade={grade} />
              {analysisAge && (
                <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {analysisAge}
                </span>
              )}
            </div>

            {/* 4-Strand Scores */}
            <div className="space-y-0.5 mb-2">
              <StrandBar label="S1" value={s1} color="hsl(217, 91%, 60%)" />
              <StrandBar label="S2" value={strand2Confidence} color="hsl(270, 60%, 60%)" />
              <StrandBar label="S3" value={s3} color="hsl(142, 71%, 45%)" />
              <StrandBar label="S4" value={s4} color="hsl(30, 90%, 55%)" />
            </div>

            {/* CROC Status & ICE Signals & Confidence */}
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div className="flex items-center gap-2">
                <CrocDot value={crocStatus} label="CROC" />
                {activeIceSignals > 0 && (
                  <div className="flex items-center gap-0.5">
                    <Zap className="h-2.5 w-2.5 text-gold" />
                    <span className="text-[9px] font-mono">
                      <span className="text-bullish">{bullSignals}</span>
                      /
                      <span className="text-bearish">{bearSignals}</span>
                    </span>
                  </div>
                )}
              </div>
              {confidenceScore != null && (
                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-foreground">{confidenceScore.toFixed(0)}%</div>
                  <div className="text-[8px] text-muted-foreground">Konfidenz</div>
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <ActionBadge action={actionType} grade={grade} />
            {confidenceScore != null && (
              <span className="font-mono text-xs font-bold text-foreground">{confidenceScore.toFixed(0)}% Konfidenz</span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1 mb-2 text-center">
            {[
              { label: "S1 Tech", value: s1 },
              { label: "S2 Elliott", value: strand2Confidence },
              { label: "S3 Vol", value: s3 },
              { label: "S4 Croc", value: s4 },
            ].map((s) => (
              <div key={s.label} className="rounded bg-muted/50 px-1 py-0.5">
                <div className="text-[9px] text-muted-foreground">{s.label}</div>
                <div className={cn(
                  "text-xs font-mono font-bold",
                  (s.value ?? 0) >= 60 ? "text-bullish" : (s.value ?? 0) <= 30 ? "text-bearish" : "text-foreground"
                )}>
                  {s.value?.toFixed(0) ?? "—"}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-2 text-[10px] text-muted-foreground">
            <span>CROC: <span className={crocStatus === 1 ? "text-bullish font-semibold" : crocStatus === -1 ? "text-bearish font-semibold" : "text-neutral"}>
              {crocStatus === 1 ? "BULL" : crocStatus === -1 ? "BEAR" : "NEUTRAL"}
            </span></span>
            {activeIceSignals > 0 && (
              <span>ICE: <span className="text-bullish">{bullSignals}↑</span> / <span className="text-bearish">{bearSignals}↓</span></span>
            )}
            {analysisAge && <span className="ml-auto">{analysisAge}</span>}
          </div>

          {reasoning && (
            <div className="border-t border-border/30 pt-1.5">
              <p className="text-[10px] font-medium text-foreground mb-0.5">Empfehlung:</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{reasoning}</p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
