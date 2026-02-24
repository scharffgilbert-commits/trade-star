import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PriceChart from "@/components/symbol/PriceChart";
import CrocLochstreifen from "@/components/symbol/CrocLochstreifen";
import IceSignalsList from "@/components/symbol/IceSignalsList";
import IndicatorsTable from "@/components/symbol/IndicatorsTable";
import DecisionHistory from "@/components/symbol/DecisionHistory";

export default function SymbolDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();

  const symbolInfo = useQuery({
    queryKey: ["symbol-info", symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("symbols_master")
        .select("symbol, name, type, exchange")
        .eq("symbol", symbol!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!symbol,
  });

  const latestPrice = useQuery({
    queryKey: ["latest-price", symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_latest_prices")
        .select("close, date, open, high, low, volume")
        .eq("symbol", symbol!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!symbol,
  });

  if (!symbol) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {symbol}
            </h1>
            {latestPrice.data && (
              <span className="font-mono text-xl font-semibold text-foreground">
                ${Number(latestPrice.data.close).toFixed(2)}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {symbolInfo.data?.name ?? ""} · {symbolInfo.data?.exchange ?? ""} · {symbolInfo.data?.type ?? ""}
          </p>
        </div>
      </div>

      {/* Price Chart */}
      <div className="card-elevated rounded-xl border border-border/50 p-4">
        <h2 className="font-display text-sm font-semibold text-foreground mb-3">Preis-Chart (60 Tage)</h2>
        <PriceChart symbol={symbol} />
      </div>

      {/* Lochstreifen */}
      <CrocLochstreifen symbol={symbol} />

      {/* ICE Signals + Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IceSignalsList symbol={symbol} />
        <IndicatorsTable symbol={symbol} />
      </div>

      {/* Decision History */}
      <DecisionHistory symbol={symbol} />
    </div>
  );
}
