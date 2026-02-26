import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AutoTradeConfig {
  id: number;
  account_id: number;
  is_enabled: boolean;
  mode: "AUTO" | "CONFIRM" | "NOTIFY_ONLY";
  allowed_symbols: string[];
  allowed_directions: string[];
}

export function useAutoTradeConfig(accountId: number = 1) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["auto-trade-config", accountId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("auto_trade_config")
        .select("*")
        .eq("account_id", accountId)
        .single();
      if (error) throw error;
      return data as AutoTradeConfig;
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (
      updates: Partial<Pick<AutoTradeConfig, "is_enabled" | "mode" | "allowed_symbols" | "allowed_directions">>
    ) => {
      if (!data?.id) throw new Error("Keine Auto-Trade Konfiguration gefunden");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updated, error } = await (supabase as any)
        .from("auto_trade_config")
        .update(updates)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      toast.success("Auto-Trade Konfiguration aktualisiert");
      queryClient.invalidateQueries({ queryKey: ["auto-trade-config", accountId] });
    },
    onError: (error: Error) => {
      toast.error(`Konfiguration-Update fehlgeschlagen: ${error.message}`);
    },
  });

  return {
    config: data ?? null,
    isLoading,
    error,
    updateConfig: updateConfigMutation.mutate,
  };
}
