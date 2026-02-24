import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Play, Loader2, CheckCircle, XCircle } from "lucide-react";

type RunStatus = "idle" | "running" | "success" | "error";

const SYMBOLS = ["AAPL", "MSFT", "AMZN", "JPM", "V", "SAP", "SIEGY", "BMWYY"];

export default function RunPage() {
  const [pipelineStatus, setPipelineStatus] = useState<RunStatus>("idle");
  const [pipelineResult, setPipelineResult] = useState<string>("");
  const [aiSymbol, setAiSymbol] = useState("AAPL");
  const [aiStatus, setAiStatus] = useState<RunStatus>("idle");
  const [aiResult, setAiResult] = useState<string>("");

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

  const runPipeline = async (mode: string) => {
    setPipelineStatus("running");
    setPipelineResult("");
    try {
      const { data, error } = await supabase.functions.invoke("run-trading-pipeline", {
        body: { mode },
      });
      if (error) throw error;
      setPipelineStatus("success");
      setPipelineResult(JSON.stringify(data, null, 2));
      recentRuns.refetch();
    } catch (err: any) {
      setPipelineStatus("error");
      setPipelineResult(err.message ?? "Fehler");
    }
  };

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

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">▶️ Analyse starten</h1>

      {/* Pipeline Buttons */}
      <div className="card-elevated rounded-xl border border-border/50 p-4 space-y-4">
        <h2 className="font-display text-sm font-semibold text-foreground">Trading Pipeline</h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => runPipeline("full")} disabled={pipelineStatus === "running"} className="gap-2">
            <Play className="h-3 w-3" /> Volle Analyse
          </Button>
          <Button variant="outline" onClick={() => runPipeline("analysis_only")} disabled={pipelineStatus === "running"} className="gap-2">
            <Play className="h-3 w-3" /> Nur AI-Analyse
          </Button>
          <Button variant="outline" onClick={() => runPipeline("data_only")} disabled={pipelineStatus === "running"} className="gap-2">
            <Play className="h-3 w-3" /> Nur Daten laden
          </Button>
          {statusIcon(pipelineStatus)}
        </div>
        {pipelineResult && (
          <pre className="text-xs font-mono p-3 rounded-lg bg-muted/50 max-h-40 overflow-auto text-muted-foreground">{pipelineResult}</pre>
        )}
      </div>

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
            <Play className="h-3 w-3" /> Analysieren
          </Button>
          {statusIcon(aiStatus)}
        </div>
        {aiResult && (
          <pre className="text-xs font-mono p-3 rounded-lg bg-muted/50 max-h-40 overflow-auto text-muted-foreground">{aiResult}</pre>
        )}
      </div>

      {/* Recent Runs */}
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <h2 className="font-display text-sm font-semibold text-foreground mb-3">Letzte Workflow-Runs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border/30">
                <th className="text-left p-2 font-medium">Workflow</th>
                <th className="text-left p-2 font-medium">Status</th>
                <th className="text-left p-2 font-medium">Gestartet</th>
                <th className="text-right p-2 font-medium">Bearbeitet</th>
                <th className="text-right p-2 font-medium">OK</th>
                <th className="text-right p-2 font-medium">Fehler</th>
              </tr>
            </thead>
            <tbody>
              {(recentRuns.data ?? []).map((r) => (
                <tr key={r.id} className="border-b border-border/10 hover:bg-muted/30">
                  <td className="p-2 font-mono text-foreground">{r.workflow_name}</td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      r.status === "completed" ? "bg-bullish/15 text-bullish" :
                      r.status === "running" ? "bg-primary/15 text-primary" :
                      "bg-bearish/15 text-bearish"
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-2 font-mono text-muted-foreground">
                    {r.started_at ? new Date(r.started_at).toLocaleString("de-DE") : "—"}
                  </td>
                  <td className="p-2 text-right font-mono text-muted-foreground">{r.symbols_processed ?? "—"}</td>
                  <td className="p-2 text-right font-mono text-bullish">{r.symbols_succeeded ?? "—"}</td>
                  <td className="p-2 text-right font-mono text-bearish">{r.symbols_failed ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
