import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface TradingRule {
  id: number;
  account_id: number;
  rule_name: string;
  rule_type: string;
  rule_value: Json;
  is_active: boolean;
}

export function useTradingRules(accountId: number = 1) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["trading-rules", accountId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("trading_rules")
        .select("*")
        .eq("account_id", accountId)
        .order("rule_name");
      if (error) throw error;
      return data as TradingRule[];
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({
      ruleId,
      updates,
    }: {
      ruleId: number;
      updates: Partial<Pick<TradingRule, "rule_name" | "rule_type" | "rule_value" | "is_active">>;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("trading_rules")
        .update(updates)
        .eq("id", ruleId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Regel aktualisiert");
      queryClient.invalidateQueries({ queryKey: ["trading-rules", accountId] });
    },
    onError: (error: Error) => {
      toast.error(`Regel-Update fehlgeschlagen: ${error.message}`);
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: number; isActive: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("trading_rules")
        .update({ is_active: isActive })
        .eq("id", ruleId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      toast.success(`Regel ${variables.isActive ? "aktiviert" : "deaktiviert"}`);
      queryClient.invalidateQueries({ queryKey: ["trading-rules", accountId] });
    },
    onError: (error: Error) => {
      toast.error(`Toggle fehlgeschlagen: ${error.message}`);
    },
  });

  return {
    rules: data ?? [],
    isLoading,
    error,
    updateRule: updateRuleMutation.mutate,
    toggleRule: toggleRuleMutation.mutate,
  };
}
