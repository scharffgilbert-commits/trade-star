import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DemoPosition } from "@/hooks/useOpenPositions";

const PAGE_SIZE = 20;

export function useClosedPositions(accountId: number = 1) {
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["closed-positions", accountId, page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error, count } = await (supabase as any)
        .from("demo_positions")
        .select("*", { count: "exact" })
        .eq("account_id", accountId)
        .in("position_status", ["CLOSED", "STOPPED_OUT", "TP_HIT"])
        .order("closed_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { positions: data as DemoPosition[], totalCount: count ?? 0 };
    },
  });

  return {
    positions: data?.positions ?? [],
    isLoading,
    error,
    totalCount: data?.totalCount ?? 0,
    page,
    setPage,
  };
}
