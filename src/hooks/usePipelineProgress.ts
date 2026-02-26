import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkflowRun {
  id: number;
  workflow_name: string;
  workflow_id: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  symbols_processed: number | null;
  symbols_succeeded: number | null;
  symbols_failed: number | null;
  trigger_source: string | null;
  errors: unknown;
  metadata: unknown;
}

export function usePipelineProgress(runId: number | null, enabled: boolean = true) {
  const runQuery = useQuery({
    queryKey: ["pipeline-progress", runId],
    queryFn: async () => {
      if (!runId) return null;
      const { data, error } = await supabase
        .from("workflow_runs")
        .select("*")
        .eq("id", runId)
        .single();
      if (error) throw error;
      return data as WorkflowRun;
    },
    enabled: enabled && runId !== null,
    refetchInterval: (query) => {
      const run = query.state.data;
      if (!run) return 3000;
      if (run.status === "completed" || run.status === "failed") return false;
      return 3000;
    },
  });

  const decisionsQuery = useQuery({
    queryKey: ["pipeline-decisions-count", runId],
    queryFn: async () => {
      if (!runQuery.data?.started_at) return 0;
      const { count, error } = await supabase
        .from("trading_decisions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", runQuery.data.started_at);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: enabled && runId !== null && !!runQuery.data?.started_at,
    refetchInterval: (query) => {
      const run = runQuery.data;
      if (!run) return 3000;
      if (run.status === "completed" || run.status === "failed") return false;
      return 3000;
    },
  });

  const run = runQuery.data ?? null;
  const isComplete = run?.status === "completed" || run?.status === "failed";

  // Total symbols from metadata or default to 8 (active symbols count)
  const totalSymbols =
    (run?.metadata as Record<string, unknown>)?.total_symbols as number | undefined ?? 8;

  return {
    run,
    symbolsCompleted: run?.symbols_processed ?? 0,
    totalSymbols,
    decisionsCreated: decisionsQuery.data ?? 0,
    isComplete,
    error: runQuery.error ?? decisionsQuery.error,
  };
}
