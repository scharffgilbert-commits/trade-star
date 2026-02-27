import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createChart, ColorType, CrosshairMode } from "lightweight-charts";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface TradingViewChartProps {
  symbol: string;
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfit1?: number | null;
  takeProfit2?: number | null;
  takeProfit3?: number | null;
  trailingStopPrice?: number | null;
  height?: number;
}

const TIME_RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "All", days: 9999 },
];

// lightweight-charts v4 can't parse HSL colors — use hex equivalents
const CHART_COLORS = {
  textColor: "#818a93",       // hsl(215, 12%, 55%)
  gridColor: "#232730",       // hsl(228, 14%, 16%)
  crosshairColor: "#4f5662",  // hsl(215, 12%, 35%)
};

export default function TradingViewChart({
  symbol,
  entryPrice,
  stopLoss,
  takeProfit1,
  takeProfit2,
  takeProfit3,
  trailingStopPrice,
  height = 400,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [selectedRange, setSelectedRange] = useState(90);
  const [chartError, setChartError] = useState<string | null>(null);

  // Fetch OHLC price data
  const priceQuery = useQuery({
    queryKey: ["tv-chart-prices", symbol, selectedRange],
    queryFn: async () => {
      let query = supabase
        .from("stock_prices")
        .select("date, open, high, low, close, volume")
        .eq("symbol", symbol)
        .order("date", { ascending: true });

      if (selectedRange < 9999) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - selectedRange);
        query = query.gte("date", startDate.toISOString().split("T")[0]);
      }

      const { data, error } = await query.limit(2000);
      if (error) throw error;
      return data;
    },
  });

  // Fetch CROC Alligator overlay lines
  const crocQuery = useQuery({
    queryKey: ["tv-croc-lines", symbol, selectedRange],
    queryFn: async () => {
      let query = supabase
        .from("technical_indicators")
        .select("date, indicator_name, value_1, value_2, value_3")
        .eq("symbol", symbol)
        .eq("indicator_name", "CROC_ALLIGATOR")
        .order("date", { ascending: true });

      if (selectedRange < 9999) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - selectedRange);
        query = query.gte("date", startDate.toISOString().split("T")[0]);
      }

      const { data, error } = await query.limit(2000);
      if (error) throw error;
      return data;
    },
  });

  // Fetch ICE signals for markers
  const iceQuery = useQuery({
    queryKey: ["tv-ice-signals", symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("croc_ice_signals")
        .select("signal_date, signal_type, direction, signal_strength, trigger_price")
        .eq("symbol", symbol)
        .eq("is_active", true)
        .order("signal_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Create and manage chart
  useEffect(() => {
    if (!chartContainerRef.current || !priceQuery.data?.length) return;

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    setChartError(null);

    let chart: IChartApi;
    try {
      chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: CHART_COLORS.textColor,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: CHART_COLORS.gridColor },
          horzLines: { color: CHART_COLORS.gridColor },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: CHART_COLORS.crosshairColor, width: 1, style: 2 },
          horzLine: { color: CHART_COLORS.crosshairColor, width: 1, style: 2 },
        },
        rightPriceScale: {
          borderColor: CHART_COLORS.gridColor,
        },
        timeScale: {
          borderColor: CHART_COLORS.gridColor,
          timeVisible: false,
        },
        width: chartContainerRef.current.clientWidth,
        height: height,
      });
    } catch (err) {
      console.error("Chart creation failed:", err);
      setChartError(err instanceof Error ? err.message : "Chart konnte nicht erstellt werden");
      return;
    }

    chartRef.current = chart;

    try {
      // Candlestick series
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });

      const candleData = priceQuery.data.map((p) => ({
        time: p.date as string,
        open: Number(p.open),
        high: Number(p.high),
        low: Number(p.low),
        close: Number(p.close),
      }));

      candlestickSeries.setData(candleData);
      candlestickSeriesRef.current = candlestickSeries;

      // ICE Signal markers
      if (iceQuery.data?.length) {
        const markers = iceQuery.data
          .filter((s) => {
            const priceDate = priceQuery.data[0]?.date;
            return !priceDate || s.signal_date >= priceDate;
          })
          .map((s) => ({
            time: s.signal_date as string,
            position: s.direction === "BULL" ? ("belowBar" as const) : ("aboveBar" as const),
            color: s.direction === "BULL" ? "#22c55e" : "#ef4444",
            shape: s.direction === "BULL" ? ("arrowUp" as const) : ("arrowDown" as const),
            text: `${s.signal_type} (${s.signal_strength})`,
          }));
        if (markers.length > 0) {
          candlestickSeries.setMarkers(markers);
        }
      }

      // CROC Alligator overlay lines
      if (crocQuery.data?.length) {
        const jawData: { time: string; value: number }[] = [];
        const teethData: { time: string; value: number }[] = [];
        const lipsData: { time: string; value: number }[] = [];

        for (const ind of crocQuery.data) {
          if (ind.value_1) jawData.push({ time: ind.date, value: Number(ind.value_1) });
          if (ind.value_2) teethData.push({ time: ind.date, value: Number(ind.value_2) });
          if (ind.value_3) lipsData.push({ time: ind.date, value: Number(ind.value_3) });
        }

        if (jawData.length > 0) {
          const jawSeries = chart.addLineSeries({
            color: "#3b82f6",
            lineWidth: 1,
            lineStyle: 2,
            title: "Jaw",
          });
          jawSeries.setData(jawData);
        }

        if (teethData.length > 0) {
          const teethSeries = chart.addLineSeries({
            color: "#ef4444",
            lineWidth: 1,
            lineStyle: 2,
            title: "Teeth",
          });
          teethSeries.setData(teethData);
        }

        if (lipsData.length > 0) {
          const lipsSeries = chart.addLineSeries({
            color: "#22c55e",
            lineWidth: 1,
            lineStyle: 2,
            title: "Lips",
          });
          lipsSeries.setData(lipsData);
        }
      }

      // Price level lines for active position
      if (entryPrice) {
        candlestickSeries.createPriceLine({
          price: entryPrice,
          color: "#3b82f6",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "Entry",
        });
      }
      if (stopLoss) {
        candlestickSeries.createPriceLine({
          price: stopLoss,
          color: "#ef4444",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "SL",
        });
      }
      if (takeProfit1) {
        candlestickSeries.createPriceLine({
          price: takeProfit1,
          color: "#22c55e",
          lineWidth: 1,
          lineStyle: 0,
          axisLabelVisible: true,
          title: "TP1",
        });
      }
      if (takeProfit2) {
        candlestickSeries.createPriceLine({
          price: takeProfit2,
          color: "#22c55e",
          lineWidth: 1,
          lineStyle: 1,
          axisLabelVisible: true,
          title: "TP2",
        });
      }
      if (takeProfit3) {
        candlestickSeries.createPriceLine({
          price: takeProfit3,
          color: "#22c55e",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "TP3",
        });
      }
      if (trailingStopPrice) {
        candlestickSeries.createPriceLine({
          price: trailingStopPrice,
          color: "#eab308",
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: "Trail",
        });
      }

      // Fit content
      chart.timeScale().fitContent();
    } catch (err) {
      console.error("Chart data setup failed:", err);
    }

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [priceQuery.data, crocQuery.data, iceQuery.data, entryPrice, stopLoss, takeProfit1, takeProfit2, takeProfit3, trailingStopPrice, height]);

  if (priceQuery.isLoading) {
    return <Skeleton className="w-full" style={{ height }} />;
  }

  if (priceQuery.error) {
    return (
      <div className="flex items-center justify-center text-destructive" style={{ height }}>
        Fehler beim Laden der Kursdaten
      </div>
    );
  }

  if (chartError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground" style={{ height }}>
        <AlertTriangle className="h-8 w-8 text-yellow-500" />
        <p className="text-sm">Chart konnte nicht geladen werden</p>
        <p className="text-xs text-muted-foreground/60">{chartError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Time range buttons */}
      <div className="flex gap-1">
        {TIME_RANGES.map((range) => (
          <Button
            key={range.label}
            variant={selectedRange === range.days ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-7 px-3 text-xs",
              selectedRange === range.days
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setSelectedRange(range.days)}
          >
            {range.label}
          </Button>
        ))}
      </div>

      {/* Chart container */}
      <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden" />
    </div>
  );
}
