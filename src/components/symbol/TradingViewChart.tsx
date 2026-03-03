import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createChart, ColorType, CrosshairMode } from "lightweight-charts";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertTriangle, Maximize2, Minimize2 } from "lucide-react";

interface TradingViewChartProps {
  symbol: string;
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfit1?: number | null;
  takeProfit2?: number | null;
  takeProfit3?: number | null;
  trailingStopPrice?: number | null;
}

const TIME_RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "All", days: 9999 },
];

const CHART_COLORS = {
  textColor: "#818a93",
  gridColor: "#1a1d24",
  crosshairColor: "#4f5662",
};

export default function TradingViewChart({
  symbol,
  entryPrice,
  stopLoss,
  takeProfit1,
  takeProfit2,
  takeProfit3,
  trailingStopPrice,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [selectedRange, setSelectedRange] = useState(90);
  const [chartError, setChartError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [crosshairData, setCrosshairData] = useState<{
    time?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
  } | null>(null);

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

  const chartHeight = isFullscreen ? window.innerHeight - 120 : 520;

  // Create and manage chart
  useEffect(() => {
    if (!chartContainerRef.current || !priceQuery.data?.length) return;

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
          fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: CHART_COLORS.gridColor },
          horzLines: { color: CHART_COLORS.gridColor },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: CHART_COLORS.crosshairColor, width: 1, style: 2, labelBackgroundColor: "#2a2d36" },
          horzLine: { color: CHART_COLORS.crosshairColor, width: 1, style: 2, labelBackgroundColor: "#2a2d36" },
        },
        rightPriceScale: {
          borderColor: CHART_COLORS.gridColor,
          scaleMargins: { top: 0.08, bottom: 0.08 },
        },
        timeScale: {
          borderColor: CHART_COLORS.gridColor,
          timeVisible: false,
          rightOffset: 5,
          barSpacing: 8,
          minBarSpacing: 4,
        },
        width: chartContainerRef.current.clientWidth,
        height: chartHeight,
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
        wickUpColor: "#22c55e80",
        wickDownColor: "#ef444480",
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

      // Crosshair move handler for OHLCV display
      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !param.seriesData) {
          setCrosshairData(null);
          return;
        }
        const data = param.seriesData.get(candlestickSeries);
        if (data && 'open' in data) {
          const matchingPrice = priceQuery.data.find(p => p.date === param.time);
          setCrosshairData({
            time: param.time as string,
            open: (data as any).open,
            high: (data as any).high,
            low: (data as any).low,
            close: (data as any).close,
            volume: matchingPrice ? Number(matchingPrice.volume) : undefined,
          });
        }
      });

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
            lineStyle: 0,
            title: "Jaw",
            crosshairMarkerVisible: false,
            lastValueVisible: true,
            priceLineVisible: false,
          });
          jawSeries.setData(jawData);
        }

        if (teethData.length > 0) {
          const teethSeries = chart.addLineSeries({
            color: "#ef4444",
            lineWidth: 1,
            lineStyle: 0,
            title: "Teeth",
            crosshairMarkerVisible: false,
            lastValueVisible: true,
            priceLineVisible: false,
          });
          teethSeries.setData(teethData);
        }

        if (lipsData.length > 0) {
          const lipsSeries = chart.addLineSeries({
            color: "#22c55e",
            lineWidth: 1,
            lineStyle: 0,
            title: "Lips",
            crosshairMarkerVisible: false,
            lastValueVisible: true,
            priceLineVisible: false,
          });
          lipsSeries.setData(lipsData);
        }
      }

      // Price level lines
      if (entryPrice) {
        candlestickSeries.createPriceLine({
          price: entryPrice,
          color: "#3b82f6",
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: "Entry",
        });
      }
      if (stopLoss) {
        candlestickSeries.createPriceLine({
          price: stopLoss,
          color: "#ef4444",
          lineWidth: 2,
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
  }, [priceQuery.data, crocQuery.data, iceQuery.data, entryPrice, stopLoss, takeProfit1, takeProfit2, takeProfit3, trailingStopPrice, chartHeight]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  if (priceQuery.isLoading) {
    return <Skeleton className="w-full h-[520px]" />;
  }

  if (priceQuery.error) {
    return (
      <div className="flex items-center justify-center text-destructive h-[520px]">
        Fehler beim Laden der Kursdaten
      </div>
    );
  }

  if (chartError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground h-[520px]">
        <AlertTriangle className="h-8 w-8 text-yellow-500" />
        <p className="text-sm">Chart konnte nicht geladen werden</p>
        <p className="text-xs text-muted-foreground/60">{chartError}</p>
      </div>
    );
  }

  const lastCandle = priceQuery.data?.[priceQuery.data.length - 1];
  const displayData = crosshairData || (lastCandle ? {
    open: Number(lastCandle.open),
    high: Number(lastCandle.high),
    low: Number(lastCandle.low),
    close: Number(lastCandle.close),
    volume: Number(lastCandle.volume),
    time: lastCandle.date,
  } : null);

  return (
    <div className={cn(
      "flex flex-col",
      isFullscreen && "fixed inset-0 z-50 bg-background p-4"
    )}>
      {/* Chart toolbar */}
      <div className="flex items-center justify-between mb-1">
        {/* OHLCV data display */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-muted-foreground/60 font-sans text-[11px]">CROC Overlay</span>
          {displayData && (
            <>
              <span className="text-muted-foreground">
                O <span className={cn(
                  displayData.close! >= displayData.open! ? "text-green-400" : "text-red-400"
                )}>{displayData.open?.toFixed(2)}</span>
              </span>
              <span className="text-muted-foreground">
                H <span className="text-foreground">{displayData.high?.toFixed(2)}</span>
              </span>
              <span className="text-muted-foreground">
                L <span className="text-foreground">{displayData.low?.toFixed(2)}</span>
              </span>
              <span className="text-muted-foreground">
                C <span className={cn(
                  displayData.close! >= displayData.open! ? "text-green-400" : "text-red-400"
                )}>{displayData.close?.toFixed(2)}</span>
              </span>
              {displayData.volume !== undefined && (
                <span className="text-muted-foreground">
                  Vol <span className="text-foreground/70">{(displayData.volume / 1_000_000).toFixed(1)}M</span>
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Time range pills */}
          <div className="flex items-center bg-muted/30 rounded-md p-0.5">
            {TIME_RANGES.map((range) => (
              <button
                key={range.label}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-mono rounded-sm transition-colors",
                  selectedRange === range.days
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setSelectedRange(range.days)}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-sm hover:bg-muted/30"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Chart container */}
      <div
        ref={chartContainerRef}
        className="w-full rounded-md overflow-hidden"
        style={{ minHeight: chartHeight }}
      />

      {/* Alligator legend */}
      <div className="flex items-center gap-4 mt-1.5 text-[10px] font-mono text-muted-foreground/60">
        <span className="flex items-center gap-1">
          <span className="w-3 h-px bg-[#3b82f6] inline-block" /> Jaw (13)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-px bg-[#ef4444] inline-block" /> Teeth (8)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-px bg-[#22c55e] inline-block" /> Lips (5)
        </span>
      </div>
    </div>
  );
}
