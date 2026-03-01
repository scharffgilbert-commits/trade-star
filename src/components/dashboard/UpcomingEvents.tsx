import { useDetectedSetups } from "@/hooks/useDetectedSetups";
import { usePremiumSignals } from "@/hooks/usePremiumSignals";
import { useNavigate } from "react-router-dom";
import { Calendar, Crosshair, Zap, ArrowUp, ArrowDown, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EventItem {
  id: string;
  type: "setup" | "signal";
  symbol: string;
  label: string;
  direction: string;
  confidence: number;
  date: string;
}

export default function UpcomingEvents() {
  const { setups, isLoading: setupsLoading } = useDetectedSetups(undefined, true);
  const { signals, isLoading: signalsLoading } = usePremiumSignals(undefined, 7);
  const navigate = useNavigate();

  const isLoading = setupsLoading || signalsLoading;

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Aktuelle Ereignisse</h2>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Build event list
  const events: EventItem[] = [];

  // Active setups (top 8)
  for (const setup of setups.slice(0, 8)) {
    events.push({
      id: `setup-${setup.id}`,
      type: "setup",
      symbol: setup.symbol,
      label: setup.setup_type,
      direction: setup.direction,
      confidence: setup.confidence,
      date: setup.detection_date,
    });
  }

  // Recent premium signals (last 7 days, top 5)
  const recentSignals = signals.filter((s) => s.is_active).slice(0, 5);
  for (const sig of recentSignals) {
    events.push({
      id: `signal-${sig.id}`,
      type: "signal",
      symbol: sig.symbol,
      label: sig.signal_type,
      direction: sig.direction,
      confidence: sig.signal_score,
      date: sig.signal_date,
    });
  }

  // Sort by date (most recent first)
  events.sort((a, b) => b.date.localeCompare(a.date));

  if (events.length === 0) {
    return (
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Aktuelle Ereignisse</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Keine aktiven Setups oder Signale.
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Aktuelle Ereignisse</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {events.length} aktiv
        </span>
      </div>

      <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
        {events.map((event) => {
          const isLong = event.direction === "BULL" || event.direction === "LONG";

          return (
            <button
              key={event.id}
              onClick={() => navigate(`/symbol/${event.symbol}`)}
              className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              {/* Icon */}
              <div
                className={cn(
                  "p-1 rounded shrink-0",
                  event.type === "setup"
                    ? "bg-primary/10"
                    : "bg-yellow-400/10"
                )}
              >
                {event.type === "setup" ? (
                  <Crosshair className="h-3 w-3 text-primary" />
                ) : (
                  <Zap className="h-3 w-3 text-yellow-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-foreground">
                    {event.symbol.replace(".DE", "")}
                  </span>
                  {isLong ? (
                    <ArrowUp className="h-3 w-3 text-bullish" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-bearish" />
                  )}
                  <span className="text-[10px] text-muted-foreground truncate">
                    {event.label}
                  </span>
                </div>
              </div>

              {/* Score + Date */}
              <div className="text-right shrink-0">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-4",
                    event.confidence >= 70
                      ? "border-bullish/30 text-bullish"
                      : event.confidence >= 50
                        ? "border-neutral/30 text-neutral"
                        : "border-muted text-muted-foreground"
                  )}
                >
                  {event.confidence.toFixed(0)}%
                </Badge>
                <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground mt-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(event.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
