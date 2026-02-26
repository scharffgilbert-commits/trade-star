import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DemoAccount {
  id: number;
  account_name: string;
  initial_balance: number;
  current_balance: number;
  reserved_balance: number;
  total_pnl: number;
  total_pnl_percent: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  max_drawdown_percent: number;
  peak_balance: number;
  is_active: boolean;
}

export function useDemoAccount(accountId: number = 1) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["demo-account", accountId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("demo_accounts")
        .select("*")
        .eq("id", accountId)
        .single();
      if (error) throw error;
      return data as DemoAccount;
    },
    refetchInterval: 30000,
  });

  return { account: data ?? null, isLoading, error, refetch };
}
