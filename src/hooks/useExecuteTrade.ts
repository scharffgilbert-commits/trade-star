import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ExecuteTradeParams {
  account_id?: number;
  symbol: string;
  decision_id?: number;
  position_type: "LONG" | "SHORT";
  quantity: number;
  entry_price: number;
  stop_loss: number;
  take_profit_1?: number;
  take_profit_2?: number;
  take_profit_3?: number;
  trigger_source?: string;
  notes?: string;
}

export function useExecuteTrade() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: ExecuteTradeParams) => {
      const { data, error } = await supabase.functions.invoke("demo-trade-engine", {
        body: { action: "open", ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, variables) => {
      toast.success(`Trade geöffnet: ${variables.position_type} ${variables.symbol}`);
      queryClient.invalidateQueries({ queryKey: ["open-positions"] });
      queryClient.invalidateQueries({ queryKey: ["demo-account"] });
    },
    onError: (error: Error) => {
      toast.error(`Trade fehlgeschlagen: ${error.message}`);
    },
  });

  return {
    executeTrade: mutation.mutate,
    executeTradeAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
