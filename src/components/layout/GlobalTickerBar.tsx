import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMarketStatus } from "@/hooks/useMarketStatus";
import { useState, useEffect } from "react";

interface TickerItem {
  symbol: string;
  price: number;
  change_pct: number;
}

export default function GlobalTickerBar() {
  const navigate = useNavigate();
  const { statusText, statusColor } = useMarketStatus();
  const [utcTime, setUtcTime] = useState(() => new Date().toISOString().slice(11, 19));

  useEffect(() => {
    const interval = setInterval(() => {
      setUtcTime(new Date().toISOString().slice(11, 19));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: items = [] } = useQuery<TickerItem[]>({
    queryKey: ["ticker-bar"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_dashboard_cards")
        .select("symbol, current_price, price_change_pct");
      if (error) throw error;
      if (!data || data.length === 0) return [];

      return data
        .filter((row: any) => row.current_price != null)
        .map((row: any) => ({
          symbol: row.symbol,
          price: Number(row.current_price),
          change_pct: row.price_change_pct ? Number(row.price_change_pct) : 0,
        }));
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div className="sticky top-0 z-40 h-7 bg-sidebar border-b border-sidebar-border overflow-hidden flex items-center">
      {/* Market status indicator */}
      <div className="shrink-0 flex items-center gap-1.5 px-2 border-r border-sidebar-border h-full">
        <div
          className={`h-1.5 w-1.5 rounded-full ${
            statusColor === "text-bullish"
              ? "bg-bullish animate-pulse-glow"
              : statusColor === "text-yellow-500"
                ? "bg-yellow-500"
                : "bg-muted-foreground"
          }`}
        />
        <span className={`text-[10px] font-medium whitespace-nowrap ${statusColor}`}>
          {statusText}
        </span>
      </div>

      {/* Scrolling ticker tape */}
      <div className="flex-1 overflow-hidden relative">
        <div className="ticker-scroll flex items-center gap-5 whitespace-nowrap">
          {doubled.map((item, i) => {
            const isPositive = item.change_pct > 0;
            const isNegative = item.change_pct < 0;
            const colorClass = isPositive
              ? "text-bullish"
              : isNegative
                ? "text-bearish"
                : "text-muted-foreground";
            const arrow = isPositive ? "▲" : isNegative ? "▼" : "";

            return (
              <button
                key={`${item.symbol}-${i}`}
                onClick={() => navigate(`/symbol/${item.symbol}`)}
                className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-0"
              >
                <span className="text-[10px] font-semibold text-foreground">
                  {item.symbol}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  ${item.price.toFixed(2)}
                </span>
                <span className={`text-[10px] font-mono ${colorClass}`}>
                  {arrow}
                  {item.change_pct >= 0 ? "+" : ""}
                  {item.change_pct.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* UTC Clock */}
      <div className="shrink-0 px-2 border-l border-sidebar-border h-full flex items-center">
        <span className="text-[10px] font-mono text-muted-foreground">{utcTime} UTC</span>
      </div>

      <style>{`
        .ticker-scroll {
          animation: ticker-slide 30s linear infinite;
        }
        .ticker-scroll:hover {
          animation-play-state: paused;
        }
        @keyframes ticker-slide {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
