import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BalanceSnapshot {
  id: number;
  account_id: number;
  snapshot_date: string;
  balance: number;
  equity: number;
  open_positions_count: number;
  daily_pnl: number;
  cumulative_pnl: number;
}

export function useBalanceSnapshots(accountId: number = 1, days?: number) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["balance-snapshots", accountId, days],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("balance_snapshots")
        .select("*")
        .eq("account_id", accountId)
        .order("snapshot_date", { ascending: true });

      if (days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        query = query.gte("snapshot_date", cutoff.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BalanceSnapshot[];
    },
  });

  return { snapshots: data ?? [], isLoading, error };
}
