import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  ChevronDown,
  ChevronRight,
  FileText,
  Target,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

type RunStatus = "idle" | "running" | "success" | "error";

// Symbols are now loaded dynamically in the component

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

  // Load all active symbols dynamically
  const { data: activeSymbols } = useQuery({
    queryKey: ["all-active-symbols"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("symbols_master")
        .select("symbol")
        .eq("active", true)
        .order("symbol");
      if (error) throw error;
      return (data as { symbol: string }[]).map((d) => d.symbol);
    },
  });
  const SYMBOLS = activeSymbols ?? [];

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
  const [aiResult, setAiResult] = useState<any>(null);

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
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-analysis", {
        body: { symbol: aiSymbol, date: new Date().toISOString().slice(0, 10) },
      });
      if (error) throw error;
      setAiStatus("success");
      setAiResult(data);
      queryClient.invalidateQueries({ queryKey: ["dashboard-cards"] });
    } catch (err: any) {
      setAiStatus("error");
      setAiResult({ error: err.message ?? "Fehler" });
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
        {aiResult && !aiResult.error && (
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-4">
            {/* Header: Symbol + Action + Confidence */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-foreground">{aiResult.symbol}</span>
                <Badge
                  variant="outline"
                  className={`text-xs font-bold px-2.5 py-0.5 ${getActionBadgeClass(aiResult.action_type)}`}
                >
                  {aiResult.action_type} {getGrade(aiResult.confidence_score)}
                </Badge>
              </div>
              <div className="text-right">
                <span className="font-mono text-2xl font-bold text-foreground">
                  {aiResult.confidence_score}%
                </span>
                <span className="block text-[10px] text-muted-foreground">Konfidenz</span>
              </div>
            </div>

            {/* Reasoning */}
            {aiResult.reasoning && (
              <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3">
                {aiResult.reasoning}
              </p>
            )}

            {/* Price Levels */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-background/50 border border-border/30 p-2.5">
                <span className="block text-[10px] text-muted-foreground">Kurs</span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  ${aiResult.latest_price?.toFixed(2) ?? "—"}
                </span>
              </div>
              <div className="rounded-lg bg-background/50 border border-border/30 p-2.5">
                <span className="block text-[10px] text-muted-foreground">Einstieg</span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {aiResult.entry_price ? `$${aiResult.entry_price.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="rounded-lg bg-background/50 border border-bearish/20 p-2.5">
                <span className="block text-[10px] text-bearish">Stop-Loss</span>
                <span className="font-mono text-sm font-semibold text-bearish">
                  {aiResult.stop_loss ? `$${aiResult.stop_loss.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="rounded-lg bg-background/50 border border-bullish/20 p-2.5">
                <span className="block text-[10px] text-bullish">Take-Profit</span>
                <span className="font-mono text-sm font-semibold text-bullish">
                  {aiResult.take_profit_1 ? `$${aiResult.take_profit_1.toFixed(2)}` : "—"}
                </span>
              </div>
            </div>

            {/* 4-Strand Scores */}
            {aiResult.strands && (
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">4-Strang Analyse</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "S1 Technisch", data: aiResult.strands.s1 },
                    { label: "S2 Ichimoku", data: aiResult.strands.s2 },
                    { label: "S3 Volume", data: aiResult.strands.s3 },
                    { label: "S4 CROC/ICE", data: aiResult.strands.s4 },
                  ].map(({ label, data }) => {
                    const dominant = data.long > data.short ? "long" : data.short > data.long ? "short" : "neutral";
                    const score = Math.max(data.long, data.short);
                    return (
                      <div key={label} className="rounded-lg bg-background/50 border border-border/30 p-2">
                        <span className="block text-[10px] text-muted-foreground">{label}</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`font-mono text-sm font-bold ${
                            dominant === "long" ? "text-bullish" : dominant === "short" ? "text-bearish" : "text-muted-foreground"
                          }`}>
                            {score}
                          </span>
                          <span className={`text-[10px] font-semibold ${
                            dominant === "long" ? "text-bullish" : dominant === "short" ? "text-bearish" : "text-muted-foreground"
                          }`}>
                            {dominant === "long" ? "▲ LONG" : dominant === "short" ? "▼ SHORT" : "— NEUTRAL"}
                          </span>
                        </div>
                        {/* Mini bar */}
                        <div className="flex gap-0.5 mt-1.5 h-1.5 rounded-full overflow-hidden bg-muted">
                          <div
                            className="bg-bullish rounded-l-full transition-all"
                            style={{ width: `${data.long}%` }}
                          />
                          <div
                            className="bg-bearish rounded-r-full transition-all ml-auto"
                            style={{ width: `${data.short}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active signals count */}
            {aiResult.active_signals > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-3 w-3 text-primary" />
                <span>{aiResult.active_signals} aktive ICE-Signale</span>
              </div>
            )}
          </div>
        )}
        {aiResult?.error && (
          <div className="text-xs font-mono p-3 rounded-lg bg-bearish/10 text-bearish border border-bearish/20">
            {aiResult.error}
          </div>
        )}
      </div>

      {/* ============ Analyse-Chronik ============ */}
      <AnalyseChronik symbols={SYMBOLS} />

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

// ============ Analyse-Chronik Component ============

function AnalyseChronik({ symbols }: { symbols: string[] }) {
  const navigate = useNavigate();
  const [chronikSymbol, setChronikSymbol] = useState("ALL");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const chronikQuery = useQuery({
    queryKey: ["chronik-decisions", chronikSymbol],
    queryFn: async () => {
      let query = supabase
        .from("trading_decisions")
        .select(
          "decision_id, symbol, decision_timestamp, action_type, confidence_score, reasoning, entry_price, stop_loss, take_profit_1, take_profit_2, take_profit_3, croc_status, ice_signals_active, strand1_long_score, strand1_short_score, strand2_confidence, strand3_long_score, strand3_short_score, strand4_long_score, strand4_short_score, created_at"
        )
        .order("decision_timestamp", { ascending: false });

      if (chronikSymbol !== "ALL") {
        query = query.eq("symbol", chronikSymbol).limit(500);
      } else {
        query = query.limit(2000);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const decisions = chronikQuery.data ?? [];

  // Group by date
  const dailyGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const d of decisions) {
      const day = d.decision_timestamp
        ? new Date(d.decision_timestamp).toISOString().slice(0, 10)
        : "unknown";
      if (!groups[day]) groups[day] = [];
      groups[day].push(d);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        decisions: items.sort((a: any, b: any) => (b.confidence_score ?? 0) - (a.confidence_score ?? 0)),
      }));
  }, [decisions]);

  const toggleDay = (day: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="card-elevated rounded-xl border border-border/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">
            Analyse-Chronik — Tägliche Empfehlungen
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={chronikSymbol} onValueChange={setChronikSymbol}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Symbol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Alle Symbole</SelectItem>
              {symbols.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[10px] text-muted-foreground">
            {decisions.length} Analysen
          </span>
        </div>
      </div>

      {chronikQuery.isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!chronikQuery.isLoading && dailyGroups.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Noch keine Analysen vorhanden. Starte eine Pipeline, um Empfehlungen zu generieren.
        </div>
      )}

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {dailyGroups.map(({ date, decisions: dayDecisions }) => {
          const isDayOpen = expandedDays.has(date);
          const longCount = dayDecisions.filter((d: any) => d.action_type === "LONG").length;
          const shortCount = dayDecisions.filter((d: any) => d.action_type === "SHORT").length;
          const cashCount = dayDecisions.filter((d: any) => d.action_type === "CASH").length;
          const avgConf = dayDecisions.reduce((s: number, d: any) => s + (d.confidence_score ?? 0), 0) / dayDecisions.length;
          const formattedDate = date !== "unknown"
            ? new Date(date + "T00:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
            : "Unbekannt";

          return (
            <div key={date} className="rounded-lg border border-border/30 overflow-hidden">
              <button
                onClick={() => toggleDay(date)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isDayOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="text-xs font-semibold text-foreground">{formattedDate}</span>
                  <span className="text-[10px] text-muted-foreground">({dayDecisions.length} Symbole)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {longCount > 0 && <Badge variant="outline" className="text-[9px] py-0 h-5 bg-bullish/15 text-bullish border-bullish/30">{longCount} LONG</Badge>}
                  {shortCount > 0 && <Badge variant="outline" className="text-[9px] py-0 h-5 bg-bearish/15 text-bearish border-bearish/30">{shortCount} SHORT</Badge>}
                  {cashCount > 0 && <Badge variant="outline" className="text-[9px] py-0 h-5 bg-neutral/15 text-neutral border-neutral/30">{cashCount} CASH</Badge>}
                  <span className="text-[10px] font-mono text-muted-foreground ml-1">⌀ {avgConf.toFixed(0)}%</span>
                </div>
              </button>

              {isDayOpen && (
                <div className="border-t border-border/20 divide-y divide-border/10">
                  {dayDecisions.map((d: any, i: number) => {
                    const rowKey = `chronik-${date}-${d.decision_id ?? i}`;
                    const isOpen = expandedRows.has(rowKey);
                    const grade = getGrade(d.confidence_score ?? 0);
                    const isActionable = d.action_type === "LONG" || d.action_type === "SHORT";

                    return (
                      <div key={rowKey}>
                        {/* Summary row */}
                        <button
                          onClick={() => toggleRow(rowKey)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-xs transition-colors ${isOpen ? "bg-muted/30" : "hover:bg-muted/10"}`}
                        >
                          {isOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                          <span className="font-mono font-bold text-foreground w-16 text-left">{d.symbol}</span>
                          <Badge variant="outline" className={`text-[9px] font-bold ${getActionBadgeClass(d.action_type)}`}>
                            {d.action_type}
                          </Badge>
                          <span className="font-mono text-foreground">{d.confidence_score ?? 0}% <span className="text-muted-foreground">({grade})</span></span>
                          {d.entry_price && <span className="text-muted-foreground font-mono ml-auto">Entry ${Number(d.entry_price).toFixed(2)}</span>}
                          {isActionable && (
                            <span
                              className={`text-[10px] font-semibold ${d.action_type === "LONG" ? "text-bullish" : "text-bearish"}`}
                              onClick={(e) => { e.stopPropagation(); navigate(`/symbol/${d.symbol}`); }}
                            >
                              → Trade
                            </span>
                          )}
                        </button>

                        {/* Expanded detail with full recommendation */}
                        {isOpen && (
                          <div className="px-4 pb-3 pt-1 space-y-3 bg-muted/10">
                            {/* AI Recommendation in full text */}
                            {d.reasoning && (
                              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <FileText className="h-3.5 w-3.5 text-primary" />
                                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Empfehlung & Begründung</span>
                                </div>
                                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                                  {d.reasoning}
                                </p>
                              </div>
                            )}

                            {/* Klartext-Zusammenfassung */}
                            <div className="rounded-lg border border-border/30 bg-background/50 p-3">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Zusammenfassung</span>
                              <p className="text-xs text-foreground leading-relaxed">
                                <strong>{d.symbol}</strong> wird am{" "}
                                {d.decision_timestamp
                                  ? new Date(d.decision_timestamp).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
                                  : "—"}{" "}
                                mit <strong>{d.action_type}</strong> bewertet (Konfidenz: <strong>{d.confidence_score}%</strong>, Grade: <strong>{grade}</strong>).
                                {d.action_type === "LONG" && d.entry_price && (
                                  <> Einstieg bei <strong>${Number(d.entry_price).toFixed(2)}</strong>{d.stop_loss ? <>, Stop-Loss bei <strong className="text-bearish">${Number(d.stop_loss).toFixed(2)}</strong></> : null}{d.take_profit_1 ? <>, erstes Kursziel bei <strong className="text-bullish">${Number(d.take_profit_1).toFixed(2)}</strong></> : null}.</>
                                )}
                                {d.action_type === "SHORT" && d.entry_price && (
                                  <> Short-Einstieg bei <strong>${Number(d.entry_price).toFixed(2)}</strong>{d.stop_loss ? <>, Stop-Loss bei <strong className="text-bearish">${Number(d.stop_loss).toFixed(2)}</strong></> : null}{d.take_profit_1 ? <>, Kursziel bei <strong className="text-bullish">${Number(d.take_profit_1).toFixed(2)}</strong></> : null}.</>
                                )}
                                {d.action_type === "CASH" && " Keine Handelsempfehlung — abwarten empfohlen."}
                                {d.croc_status && <> CROC-Status: <strong>{d.croc_status}</strong>.</>}
                                {d.ice_signals_active != null && <> ICE-Signale: <strong>{d.ice_signals_active ? "aktiv" : "inaktiv"}</strong>.</>}
                              </p>
                            </div>

                            {/* Price levels */}
                            {(d.entry_price || d.stop_loss || d.take_profit_1) && (
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {d.entry_price && (
                                  <div className="flex items-center gap-1.5 rounded-md border border-border/30 px-2.5 py-1.5 bg-background/50">
                                    <Target className="h-3 w-3 text-primary" />
                                    <div>
                                      <span className="block text-[9px] text-muted-foreground">Entry</span>
                                      <span className="font-mono text-xs font-semibold text-foreground">${Number(d.entry_price).toFixed(2)}</span>
                                    </div>
                                  </div>
                                )}
                                {d.stop_loss && (
                                  <div className="flex items-center gap-1.5 rounded-md border border-bearish/20 px-2.5 py-1.5 bg-bearish/5">
                                    <ShieldAlert className="h-3 w-3 text-bearish" />
                                    <div>
                                      <span className="block text-[9px] text-bearish">Stop</span>
                                      <span className="font-mono text-xs font-semibold text-bearish">${Number(d.stop_loss).toFixed(2)}</span>
                                    </div>
                                  </div>
                                )}
                                {d.take_profit_1 && (
                                  <div className="flex items-center gap-1.5 rounded-md border border-bullish/20 px-2.5 py-1.5 bg-bullish/5">
                                    <TrendingUp className="h-3 w-3 text-bullish" />
                                    <div>
                                      <span className="block text-[9px] text-bullish">TP1</span>
                                      <span className="font-mono text-xs font-semibold text-bullish">${Number(d.take_profit_1).toFixed(2)}</span>
                                    </div>
                                  </div>
                                )}
                                {d.take_profit_2 && (
                                  <div className="flex items-center gap-1.5 rounded-md border border-bullish/20 px-2.5 py-1.5 bg-bullish/5">
                                    <TrendingUp className="h-3 w-3 text-bullish" />
                                    <div>
                                      <span className="block text-[9px] text-bullish">TP2</span>
                                      <span className="font-mono text-xs font-semibold text-bullish">${Number(d.take_profit_2).toFixed(2)}</span>
                                    </div>
                                  </div>
                                )}
                                {d.take_profit_3 && (
                                  <div className="flex items-center gap-1.5 rounded-md border border-bullish/20 px-2.5 py-1.5 bg-bullish/5">
                                    <TrendingUp className="h-3 w-3 text-bullish" />
                                    <div>
                                      <span className="block text-[9px] text-bullish">TP3</span>
                                      <span className="font-mono text-xs font-semibold text-bullish">${Number(d.take_profit_3).toFixed(2)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 4-Strand scores compact */}
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { label: "S1 Tech", long: d.strand1_long_score, short: d.strand1_short_score },
                                { label: "S2 Elliott", long: d.strand2_confidence, short: null },
                                { label: "S3 Volume", long: d.strand3_long_score, short: d.strand3_short_score },
                                { label: "S4 CROC", long: d.strand4_long_score, short: d.strand4_short_score },
                              ].map(({ label, long: l, short: s }) => (
                                <div key={label} className="rounded-md border border-border/20 bg-background/50 p-2">
                                  <span className="block text-[9px] text-muted-foreground">{label}</span>
                                  <div className="flex gap-2 mt-0.5">
                                    {l != null && <span className="font-mono text-[10px] text-bullish">L:{Number(l).toFixed(0)}</span>}
                                    {s != null && <span className="font-mono text-[10px] text-bearish">S:{Number(s).toFixed(0)}</span>}
                                    {l == null && s == null && <span className="font-mono text-[10px] text-muted-foreground">—</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
