import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CloseTradeParams {
  position_id: number;
  exit_price: number;
  close_reason?: string;
}

export function useCloseTrade() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: CloseTradeParams) => {
      const { data, error } = await supabase.functions.invoke("demo-trade-engine", {
        body: { action: "close", ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Position geschlossen");
      queryClient.invalidateQueries({ queryKey: ["open-positions"] });
      queryClient.invalidateQueries({ queryKey: ["closed-positions"] });
      queryClient.invalidateQueries({ queryKey: ["demo-account"] });
    },
    onError: (error: Error) => {
      toast.error(`Position schließen fehlgeschlagen: ${error.message}`);
    },
  });

  return {
    closeTrade: mutation.mutate,
    closeTradeAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
