import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { usePipelineProgress } from "@/hooks/usePipelineProgress";
import EmptyState from "@/components/shared/EmptyState";
import {
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  ArrowRight,
  CalendarClock,
} from "lucide-react";

type RunStatus = "idle" | "running" | "success" | "error";

const SYMBOLS = ["AAPL", "MSFT", "AMZN", "JPM", "V", "SAP", "SIEGY", "BMWYY"];

interface TradingDecision {
  decision_id: number;
  symbol: string;
  decision_timestamp: string;
  action_type: string;
  confidence_score: number;
  reasoning: string;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit_1: number | null;
  take_profit_2: number | null;
  take_profit_3: number | null;
  created_at: string;
}

function getGrade(confidence: number): string {
  if (confidence >= 85) return "A+";
  if (confidence >= 75) return "A";
  if (confidence >= 65) return "B+";
  if (confidence >= 55) return "B";
  if (confidence >= 45) return "C+";
  if (confidence >= 35) return "C";
  if (confidence >= 25) return "D";
  return "F";
}

function getActionBadgeClass(action: string): string {
  switch (action) {
    case "LONG":
      return "bg-bullish/15 text-bullish border-bullish/30";
    case "SHORT":
      return "bg-bearish/15 text-bearish border-bearish/30";
    case "CASH":
      return "bg-neutral/15 text-neutral border-neutral/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")} min`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "heute";
  if (days === 1) return "gestern";
  return `vor ${days} Tagen`;
}

type SymbolStatus = "waiting" | "processing" | "done" | "error";

export default function RunPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Pipeline state
  const [pipelineStatus, setPipelineStatus] = useState<RunStatus>("idle");
  const [pipelineError, setPipelineError] = useState<string>("");
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<string | null>(null);

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // AI single-symbol state
  const [aiSymbol, setAiSymbol] = useState("AAPL");
  const [aiStatus, setAiStatus] = useState<RunStatus>("idle");
  const [aiResult, setAiResult] = useState<string>("");

  // Pipeline progress hook
  const {
    run: progressRun,
    symbolsCompleted,
    totalSymbols,
    decisionsCreated,
    isComplete,
    error: progressError,
  } = usePipelineProgress(activeRunId, pipelineStatus === "running");

  // When pipeline completes, update status and stop timer
  useEffect(() => {
    if (isComplete && pipelineStatus === "running") {
      setPipelineStatus(progressRun?.status === "completed" ? "success" : "error");
      if (progressRun?.status !== "completed") {
        setPipelineError("Pipeline fehlgeschlagen");
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      queryClient.invalidateQueries({ queryKey: ["workflow-runs"] });
      queryClient.invalidateQueries({ queryKey: ["run-decisions"] });
    }
  }, [isComplete, pipelineStatus, progressRun, queryClient]);

  // Elapsed timer
  useEffect(() => {
    if (pipelineStatus === "running") {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pipelineStatus]);

  // Derive per-symbol statuses from progress
  const symbolStatuses: Record<string, SymbolStatus> = {};
  const completed = symbolsCompleted;
  const failed = progressRun?.symbols_failed ?? 0;
  const succeeded = progressRun?.symbols_succeeded ?? 0;

  SYMBOLS.forEach((sym, idx) => {
    if (pipelineStatus !== "running" && pipelineStatus !== "success" && pipelineStatus !== "error") {
      symbolStatuses[sym] = "waiting";
    } else if (idx < completed) {
      // Determine if this symbol was among the failed ones (approximate: last N are failed)
      if (idx >= completed - failed && failed > 0 && pipelineStatus !== "running") {
        symbolStatuses[sym] = "error";
      } else {
        symbolStatuses[sym] = "done";
      }
    } else if (idx === completed) {
      symbolStatuses[sym] = pipelineStatus === "running" ? "processing" : "waiting";
    } else {
      symbolStatuses[sym] = "waiting";
    }
  });

  // Fetch decisions created since run started (for result panel)
  const runDecisions = useQuery<TradingDecision[]>({
    queryKey: ["run-decisions", activeRunId, runStartedAt],
    queryFn: async () => {
      if (!runStartedAt) return [];
      const { data, error } = await supabase
        .from("trading_decisions")
        .select("decision_id, symbol, decision_timestamp, action_type, confidence_score, reasoning, entry_price, stop_loss, take_profit_1, take_profit_2, take_profit_3, created_at")
        .gte("created_at", runStartedAt)
        .order("confidence_score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TradingDecision[];
    },
    enabled: pipelineStatus === "success" && !!runStartedAt,
  });

  // Recent workflow runs
  const recentRuns = useQuery({
    queryKey: ["workflow-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_runs")
        .select("id, workflow_name, status, started_at, completed_at, symbols_processed, symbols_succeeded, symbols_failed")
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    refetchInterval: pipelineStatus === "running" ? 5000 : false,
  });

  // Determine if no recent runs for empty state
  const lastRunDate = recentRuns.data?.[0]?.started_at ?? null;

  const runPipeline = useCallback(async (mode: string) => {
    setPipelineStatus("running");
    setPipelineError("");
    setActiveRunId(null);
    const startTs = new Date().toISOString();
    setRunStartedAt(startTs);

    try {
      const { data, error } = await supabase.functions.invoke("run-trading-pipeline", {
        body: { mode },
      });
      if (error) throw error;

      // Extract run_id from response
      const runId = data?.run_id ?? null;
      if (runId) {
        setActiveRunId(runId);
      } else {
        // No run_id returned, treat as immediate success
        setPipelineStatus("success");
        queryClient.invalidateQueries({ queryKey: ["workflow-runs"] });
      }
    } catch (err: any) {
      setPipelineStatus("error");
      setPipelineError(err.message ?? "Fehler beim Starten der Pipeline");
    }
  }, [queryClient]);

  const runAiAnalysis = async () => {
    setAiStatus("running");
    setAiResult("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-analysis", {
        body: { symbol: aiSymbol, date: new Date().toISOString().slice(0, 10) },
      });
      if (error) throw error;
      setAiStatus("success");
      setAiResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setAiStatus("error");
      setAiResult(err.message ?? "Fehler");
    }
  };

  const statusIcon = (s: RunStatus) => {
    if (s === "running") return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    if (s === "success") return <CheckCircle className="h-4 w-4 text-bullish" />;
    if (s === "error") return <XCircle className="h-4 w-4 text-bearish" />;
    return null;
  };

  const progressPercent = totalSymbols > 0 ? Math.round((symbolsCompleted / totalSymbols) * 100) : 0;

  const symbolStatusIcon = (status: SymbolStatus) => {
    switch (status) {
      case "done":
        return <span className="text-bullish">&#10003;</span>;
      case "processing":
        return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
      case "error":
        return <span className="text-bearish">&#10007;</span>;
      default:
        return <span className="text-muted-foreground">&#9208;</span>;
    }
  };

  const symbolStatusLabel = (status: SymbolStatus) => {
    switch (status) {
      case "done":
        return "Fertig";
      case "processing":
        return "Analysiert...";
      case "error":
        return "Fehler";
      default:
        return "Wartend";
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Analyse starten</h1>

      {/* Pipeline Buttons */}
      <div className="card-elevated rounded-xl border border-border/50 p-4 space-y-4">
        <h2 className="font-display text-sm font-semibold text-foreground">Trading Pipeline</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button
            onClick={() => runPipeline("full")}
            disabled={pipelineStatus === "running"}
            className="gap-2"
          >
            {pipelineStatus === "running" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            Volle Analyse
          </Button>
          <Button
            variant="outline"
            onClick={() => runPipeline("analysis_only")}
            disabled={pipelineStatus === "running"}
            className="gap-2"
          >
            <Play className="h-3 w-3" /> Nur AI-Analyse
          </Button>
          <Button
            variant="outline"
            onClick={() => runPipeline("data_only")}
            disabled={pipelineStatus === "running"}
            className="gap-2"
          >
            <Play className="h-3 w-3" /> Nur Daten laden
          </Button>
          {pipelineStatus !== "running" && statusIcon(pipelineStatus)}
        </div>

        {/* Error display */}
        {pipelineStatus === "error" && pipelineError && (
          <div className="text-xs font-mono p-3 rounded-lg bg-bearish/10 text-bearish border border-bearish/20">
            {pipelineError}
          </div>
        )}
      </div>

      {/* Live Progress Bar (shown during and after run) */}
      {(pipelineStatus === "running" || (pipelineStatus === "success" && activeRunId)) && (
        <div className="card-elevated rounded-xl border border-border/50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              {pipelineStatus === "running" && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                </span>
              )}
              {pipelineStatus === "running" ? "Pipeline aktiv" : "Pipeline abgeschlossen"}
            </h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-mono">
                <Clock className="h-3 w-3" />
                Dauer: {formatElapsed(elapsedSeconds)}
              </span>
              {decisionsCreated > 0 && (
                <span className="flex items-center gap-1 font-mono">
                  <Activity className="h-3 w-3" />
                  {decisionsCreated} Entscheidungen
                </span>
              )}
            </div>
          </div>

          {/* Overall progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {symbolsCompleted}/{totalSymbols} Symbole ({progressPercent}%)
              </span>
              {pipelineStatus === "success" && (
                <Badge variant="outline" className="bg-bullish/15 text-bullish border-bullish/30 text-[10px]">
                  Abgeschlossen
                </Badge>
              )}
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Per-symbol status cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SYMBOLS.map((sym) => {
              const status = symbolStatuses[sym];
              return (
                <div
                  key={sym}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                    status === "done"
                      ? "border-bullish/20 bg-bullish/5"
                      : status === "processing"
                      ? "border-primary/30 bg-primary/5"
                      : status === "error"
                      ? "border-bearish/20 bg-bearish/5"
                      : "border-border/30 bg-muted/20"
                  }`}
                >
                  {symbolStatusIcon(status)}
                  <span className="font-mono font-semibold text-foreground">{sym}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {symbolStatusLabel(status)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Result Panel (shown after successful completion) */}
      {pipelineStatus === "success" && runDecisions.data && runDecisions.data.length > 0 && (
        <div className="card-elevated rounded-xl border border-border/50 p-4 space-y-3">
          <h2 className="font-display text-sm font-semibold text-foreground">
            Analyse-Ergebnisse
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border/30">
                  <th className="text-left p-2 font-medium">Symbol</th>
                  <th className="text-left p-2 font-medium">Aktion</th>
                  <th className="text-left p-2 font-medium">Konfidenz</th>
                  <th className="text-left p-2 font-medium">Zusammenfassung</th>
                  <th className="text-right p-2 font-medium">Einstieg</th>
                  <th className="text-right p-2 font-medium">Stop-Loss</th>
                  <th className="text-right p-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {runDecisions.data.map((d) => {
                  const grade = getGrade(d.confidence_score);
                  const truncatedReasoning =
                    d.reasoning && d.reasoning.length > 80
                      ? d.reasoning.substring(0, 80) + "..."
                      : d.reasoning ?? "";
                  const isActionable = d.action_type === "LONG" || d.action_type === "SHORT";

                  return (
                    <tr
                      key={d.decision_id}
                      className="border-b border-border/10 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/symbol/${d.symbol}`)}
                    >
                      <td className="p-2 font-mono font-semibold text-foreground">{d.symbol}</td>
                      <td className="p-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${getActionBadgeClass(d.action_type)}`}
                        >
                          {d.action_type}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <span className="font-mono text-foreground">
                          {d.confidence_score}%
                        </span>
                        <span className="ml-1 text-[10px] text-muted-foreground">({grade})</span>
                      </td>
                      <td className="p-2 text-muted-foreground max-w-[200px] truncate">
                        {truncatedReasoning}
                      </td>
                      <td className="p-2 text-right font-mono text-muted-foreground">
                        {d.entry_price ? `$${d.entry_price.toFixed(2)}` : "—"}
                      </td>
                      <td className="p-2 text-right font-mono text-muted-foreground">
                        {d.stop_loss ? `$${d.stop_loss.toFixed(2)}` : "—"}
                      </td>
                      <td className="p-2 text-right">
                        {isActionable ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 px-2 text-[10px] gap-1 ${
                              d.action_type === "LONG"
                                ? "text-bullish hover:text-bullish hover:bg-bullish/10"
                                : "text-bearish hover:text-bearish hover:bg-bearish/10"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/symbol/${d.symbol}`);
                            }}
                          >
                            Trade <ArrowRight className="h-2.5 w-2.5" />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Single Symbol AI */}
      <div className="card-elevated rounded-xl border border-border/50 p-4 space-y-4">
        <h2 className="font-display text-sm font-semibold text-foreground">Einzel-Symbol AI-Analyse</h2>
        <div className="flex items-center gap-3">
          <Select value={aiSymbol} onValueChange={setAiSymbol}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SYMBOLS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={runAiAnalysis} disabled={aiStatus === "running"} className="gap-2">
            {aiStatus === "running" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            Analysieren
          </Button>
          {aiStatus !== "running" && statusIcon(aiStatus)}
        </div>
        {aiResult && (
          <pre className="text-xs font-mono p-3 rounded-lg bg-muted/50 max-h-40 overflow-auto text-muted-foreground">
            {aiResult}
          </pre>
        )}
      </div>

      {/* Empty State: no recent runs */}
      {pipelineStatus === "idle" && recentRuns.data && recentRuns.data.length === 0 && (
        <EmptyState
          icon={CalendarClock}
          title="Keine Analysen vorhanden"
          description="Starte deine erste Trading-Analyse, um Ergebnisse zu sehen."
          actionLabel="Jetzt starten"
        />
      )}

      {/* Empty State: last run was long ago */}
      {pipelineStatus === "idle" &&
        recentRuns.data &&
        recentRuns.data.length > 0 &&
        lastRunDate &&
        Date.now() - new Date(lastRunDate).getTime() > 1000 * 60 * 60 * 24 * 2 && (
          <div className="card-elevated rounded-xl border border-dashed border-border/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <CalendarClock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Letzte Analyse: {timeAgo(lastRunDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Starte eine neue Analyse, um aktuelle Signale zu erhalten.
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => runPipeline("full")} className="gap-1.5">
                <Play className="h-3 w-3" /> Jetzt starten
              </Button>
            </div>
          </div>
        )}

      {/* Recent Runs History */}
      {recentRuns.data && recentRuns.data.length > 0 && (
        <div className="card-elevated rounded-xl border border-border/50 p-4">
          <h2 className="font-display text-sm font-semibold text-foreground mb-3">
            Letzte Workflow-Runs
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border/30">
                  <th className="text-left p-2 font-medium">Workflow</th>
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium">Gestartet</th>
                  <th className="text-left p-2 font-medium">Dauer</th>
                  <th className="text-right p-2 font-medium">Bearbeitet</th>
                  <th className="text-right p-2 font-medium">OK</th>
                  <th className="text-right p-2 font-medium">Fehler</th>
                </tr>
              </thead>
              <tbody>
                {(recentRuns.data ?? []).map((r) => {
                  const duration =
                    r.started_at && r.completed_at
                      ? Math.round(
                          (new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) /
                            1000
                        )
                      : null;

                  return (
                    <tr key={r.id} className="border-b border-border/10 hover:bg-muted/30">
                      <td className="p-2 font-mono text-foreground">{r.workflow_name}</td>
                      <td className="p-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            r.status === "completed"
                              ? "bg-bullish/15 text-bullish"
                              : r.status === "running"
                              ? "bg-primary/15 text-primary"
                              : "bg-bearish/15 text-bearish"
                          }`}
                        >
                          {r.status === "completed"
                            ? "Abgeschlossen"
                            : r.status === "running"
                            ? "Aktiv"
                            : "Fehler"}
                        </span>
                      </td>
                      <td className="p-2 font-mono text-muted-foreground">
                        {r.started_at
                          ? new Date(r.started_at).toLocaleString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="p-2 font-mono text-muted-foreground">
                        {duration !== null ? formatElapsed(duration) : "—"}
                      </td>
                      <td className="p-2 text-right font-mono text-muted-foreground">
                        {r.symbols_processed ?? "—"}
                      </td>
                      <td className="p-2 text-right font-mono text-bullish">
                        {r.symbols_succeeded ?? "—"}
                      </td>
                      <td className="p-2 text-right font-mono text-bearish">
                        {r.symbols_failed ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
