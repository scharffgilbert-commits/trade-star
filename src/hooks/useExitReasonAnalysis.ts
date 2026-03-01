import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExitReasonItem {
  trigger_source: string;
  count: number;
  totalPnl: number;
  avgPnl: number;
  winRate: number;
  wins: number;
  losses: number;
}

export function useExitReasonAnalysis(accountId: number = 1) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["exit-reason-analysis", accountId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("demo_positions")
        .select("trigger_source, pnl_amount")
        .eq("account_id", accountId)
        .eq("position_status", "CLOSED");

      if (error) throw error;
      if (!data || data.length === 0) return [] as ExitReasonItem[];

      // Aggregate by trigger_source
      const grouped = new Map<string, { count: number; totalPnl: number; wins: number; losses: number }>();

      for (const row of data) {
        const source = row.trigger_source ?? "UNKNOWN";
        if (!grouped.has(source)) {
          grouped.set(source, { count: 0, totalPnl: 0, wins: 0, losses: 0 });
        }
        const g = grouped.get(source)!;
        g.count++;
        const pnl = Number(row.pnl_amount ?? 0);
        g.totalPnl += pnl;
        if (pnl >= 0) g.wins++;
        else g.losses++;
      }

      const result: ExitReasonItem[] = [];
      for (const [source, g] of grouped) {
        result.push({
          trigger_source: source,
          count: g.count,
          totalPnl: Number(g.totalPnl.toFixed(2)),
          avgPnl: g.count > 0 ? Number((g.totalPnl / g.count).toFixed(2)) : 0,
          winRate: g.count > 0 ? Number(((g.wins / g.count) * 100).toFixed(1)) : 0,
          wins: g.wins,
          losses: g.losses,
        });
      }

      return result.sort((a, b) => b.count - a.count);
    },
  });

  return { exitReasons: data ?? [], isLoading, error };
}
