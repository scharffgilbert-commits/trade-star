import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MonthlyReturn {
  month: string; // "2025-01"
  monthLabel: string; // "Jan 25"
  startBalance: number;
  endBalance: number;
  returnPct: number;
  returnAbs: number;
}

export function useMonthlyReturns(accountId: number = 1) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["monthly-returns", accountId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("balance_snapshots")
        .select("snapshot_date, balance")
        .eq("account_id", accountId)
        .order("snapshot_date", { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [] as MonthlyReturn[];

      // Group by month
      const months = new Map<string, { first: number; last: number }>();
      for (const row of data) {
        const date = row.snapshot_date as string;
        const monthKey = date.substring(0, 7); // "2025-01"
        const balance = Number(row.balance);

        if (!months.has(monthKey)) {
          months.set(monthKey, { first: balance, last: balance });
        } else {
          months.get(monthKey)!.last = balance;
        }
      }

      const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
      const result: MonthlyReturn[] = [];
      let prevBalance: number | null = null;

      for (const [monthKey, { first, last }] of months) {
        const startBal = prevBalance ?? first;
        const returnAbs = last - startBal;
        const returnPct = startBal > 0 ? (returnAbs / startBal) * 100 : 0;
        const [year, month] = monthKey.split("-");
        const monthLabel = `${monthNames[parseInt(month) - 1]} ${year.substring(2)}`;

        result.push({
          month: monthKey,
          monthLabel,
          startBalance: startBal,
          endBalance: last,
          returnPct: Number(returnPct.toFixed(2)),
          returnAbs: Number(returnAbs.toFixed(2)),
        });

        prevBalance = last;
      }

      return result;
    },
  });

  return { monthlyReturns: data ?? [], isLoading, error };
}
