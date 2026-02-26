import { useState, useEffect } from "react";

interface MarketStatus {
  isOpen: boolean;
  statusText: string;
  statusColor: string;
}

export function useMarketStatus(): MarketStatus {
  const [status, setStatus] = useState<MarketStatus>(() => getMarketStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getMarketStatus());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return status;
}

function getMarketStatus(): MarketStatus {
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0=Sun, 6=Sat
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const totalMinutes = utcHours * 60 + utcMinutes;

  // Weekend
  if (utcDay === 0 || utcDay === 6) {
    return {
      isOpen: false,
      statusText: "Markt geschlossen",
      statusColor: "text-muted-foreground",
    };
  }

  // US Market hours in UTC:
  // Pre-market:  10:00 - 14:30 UTC
  // Market open: 14:30 - 21:00 UTC
  // After-hours: 21:00 - 01:00 UTC (next day)

  const preMarketStart = 10 * 60; // 600
  const marketOpen = 14 * 60 + 30; // 870
  const marketClose = 21 * 60; // 1260
  const afterHoursEnd = 25 * 60; // 1500 (01:00 next day, handle wrap)

  if (totalMinutes >= marketOpen && totalMinutes < marketClose) {
    return {
      isOpen: true,
      statusText: "Markt ge\u00f6ffnet",
      statusColor: "text-bullish",
    };
  }

  if (totalMinutes >= preMarketStart && totalMinutes < marketOpen) {
    return {
      isOpen: false,
      statusText: "Pre-Market",
      statusColor: "text-yellow-500",
    };
  }

  if (totalMinutes >= marketClose || totalMinutes < 60) {
    // 21:00-01:00 UTC (after-hours wraps past midnight)
    if (totalMinutes >= marketClose && totalMinutes < afterHoursEnd) {
      return {
        isOpen: false,
        statusText: "After-Hours",
        statusColor: "text-yellow-500",
      };
    }
    // 00:00-01:00 UTC (still after-hours from previous trading day)
    if (totalMinutes < 60) {
      // Check if previous day was a weekday
      const prevDay = utcDay === 1 ? 7 : utcDay - 1; // Mon->Sun(7), otherwise day-1
      if (prevDay >= 1 && prevDay <= 5) {
        return {
          isOpen: false,
          statusText: "After-Hours",
          statusColor: "text-yellow-500",
        };
      }
    }
  }

  return {
    isOpen: false,
    statusText: "Markt geschlossen",
    statusColor: "text-muted-foreground",
  };
}
