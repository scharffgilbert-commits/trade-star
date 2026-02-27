import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TradingViewChart from "@/components/symbol/TradingViewChart";
import TradeActionPanel from "@/components/symbol/TradeActionPanel";
import CrocLochstreifen from "@/components/symbol/CrocLochstreifen";
import IceSignalsList from "@/components/symbol/IceSignalsList";
import IndicatorsTable from "@/components/symbol/IndicatorsTable";
import DecisionHistory from "@/components/symbol/DecisionHistory";
import { cn } from "@/lib/utils";

export default function SymbolDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  // Get latest decision for chart overlays
  const latestDecision = useQuery({
    queryKey: ["latest-decision-overlay", symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trading_decisions")
        .select("entry_price, stop_loss, take_profit_1, take_profit_2, take_profit_3, action_type, confidence_score, decision_timestamp, trailing_stop_percent")
        .eq("symbol", symbol!)
        .order("decision_timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!symbol,
  });

  // Get active position for chart overlays
  const activePosition = useQuery({
    queryKey: ["active-position-overlay", symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_positions")
        .select("entry_price, stop_loss, take_profit_1, take_profit_2, take_profit_3, trailing_stop_price, trailing_stop_percent, trailing_stop_activated")
        .eq("symbol", symbol!)
        .in("position_status", ["OPEN"])
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!symbol,
  });

  if (!symbol) return null;

  const currentPrice = latestPrice.data ? Number(latestPrice.data.close) : undefined;
  const prevClose = latestPrice.data ? Number(latestPrice.data.open) : 0;
  const priceChange = currentPrice && prevClose ? currentPrice - prevClose : 0;
  const priceChangePct = prevClose > 0 ? (priceChange / prevClose) * 100 : 0;

  // Use active position levels for chart, or fall back to latest decision
  const chartOverlay = activePosition.data || latestDecision.data;

  const handleTradeExecuted = () => {
    queryClient.invalidateQueries({ queryKey: ["active-position-overlay", symbol] });
    queryClient.invalidateQueries({ queryKey: ["active-position", symbol] });
    queryClient.invalidateQueries({ queryKey: ["open-positions"] });
    queryClient.invalidateQueries({ queryKey: ["demo-account"] });
  };

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
            {currentPrice && (
              <span className="font-mono text-xl font-semibold text-foreground">
                ${currentPrice.toFixed(2)}
              </span>
            )}
            {priceChange !== 0 && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-mono",
                  priceChange >= 0
                    ? "border-green-500/30 text-green-400 bg-green-500/10"
                    : "border-red-500/30 text-red-400 bg-red-500/10"
                )}
              >
                {priceChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {priceChange >= 0 ? "+" : ""}
                {priceChangePct.toFixed(2)}%
              </Badge>
            )}
            {latestDecision.data && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  latestDecision.data.action_type === "LONG" && "border-green-500/30 text-green-400",
                  latestDecision.data.action_type === "SHORT" && "border-red-500/30 text-red-400",
                  latestDecision.data.action_type === "CASH" && "border-yellow-500/30 text-yellow-400"
                )}
              >
                AI: {latestDecision.data.action_type} ({Number(latestDecision.data.confidence_score)}%)
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {symbolInfo.data?.name ?? ""} · {symbolInfo.data?.exchange ?? ""} · {symbolInfo.data?.type ?? ""}
            {latestDecision.data?.decision_timestamp && (
              <span className="ml-2 text-xs">
                · Analyse: {new Date(latestDecision.data.decision_timestamp).toLocaleDateString("de-DE")}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Main Content: Chart + Trade Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        {/* Left: Chart */}
        <div className="card-elevated rounded-xl border border-border/50 p-4">
          <h2 className="font-display text-sm font-semibold text-foreground mb-3">
            Candlestick-Chart mit CROC-Overlay
          </h2>
          <TradingViewChart
            symbol={symbol}
            entryPrice={chartOverlay ? Number(chartOverlay.entry_price) : undefined}
            stopLoss={chartOverlay?.stop_loss ? Number(chartOverlay.stop_loss) : undefined}
            takeProfit1={chartOverlay?.take_profit_1 ? Number(chartOverlay.take_profit_1) : undefined}
            takeProfit2={chartOverlay?.take_profit_2 ? Number(chartOverlay.take_profit_2) : undefined}
            takeProfit3={chartOverlay?.take_profit_3 ? Number(chartOverlay.take_profit_3) : undefined}
            trailingStopPrice={activePosition.data?.trailing_stop_price ? Number(activePosition.data.trailing_stop_price) : undefined}
          />
        </div>

        {/* Right: Trade Action Panel */}
        <div>
          <TradeActionPanel
            symbol={symbol}
            currentPrice={currentPrice}
            onTradeExecuted={handleTradeExecuted}
          />
        </div>
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
