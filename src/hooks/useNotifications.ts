import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type NotificationType =
  | "analysis"
  | "pipeline"
  | "stop_loss"
  | "take_profit"
  | "auto_trade";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, unknown>;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (type: NotificationType, data: { message: string; [key: string]: unknown }) => {
      const notification: Notification = {
        id: crypto.randomUUID(),
        type,
        message: data.message,
        timestamp: new Date(),
        read: false,
        data,
      };

      setNotifications((prev) => [notification, ...prev].slice(0, 50));

      // Show immediate toast
      const toastConfig: Record<NotificationType, { icon: string; title: string }> = {
        analysis: { icon: "📊", title: "Neue Analyse" },
        pipeline: { icon: "▶️", title: "Pipeline" },
        stop_loss: { icon: "⚠️", title: "Stop-Loss" },
        take_profit: { icon: "🎯", title: "Take-Profit" },
        auto_trade: { icon: "🤖", title: "Auto-Trade" },
      };

      const config = toastConfig[type];
      toast(config.title, {
        description: data.message,
      });
    },
    [],
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Subscribe to trading_decisions INSERT
  useEffect(() => {
    const channel = supabase
      .channel("trading-decisions-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trading_decisions",
        },
        (payload) => {
          const record = payload.new as {
            symbol?: string;
            action_type?: string;
            confidence_score?: number;
          };
          addNotification("analysis", {
            message: `${record.symbol}: ${record.action_type} Signal (${record.confidence_score?.toFixed(0) ?? "?"}% Confidence)`,
            symbol: record.symbol,
            action_type: record.action_type,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addNotification]);

  // Subscribe to demo_positions UPDATE for stop_loss / take_profit
  useEffect(() => {
    const channel = supabase
      .channel("positions-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "demo_positions",
        },
        (payload) => {
          const record = payload.new as {
            symbol?: string;
            position_status?: string;
            pnl_percent?: number;
          };
          const oldRecord = payload.old as { position_status?: string };

          // Only trigger on status change
          if (record.position_status === oldRecord.position_status) return;

          if (record.position_status === "STOPPED_OUT") {
            addNotification("stop_loss", {
              message: `${record.symbol}: Stop-Loss ausgelöst (${record.pnl_percent?.toFixed(1) ?? "?"}%)`,
              symbol: record.symbol,
            });
          } else if (record.position_status === "TP_HIT") {
            addNotification("take_profit", {
              message: `${record.symbol}: Take-Profit erreicht (+${record.pnl_percent?.toFixed(1) ?? "?"}%)`,
              symbol: record.symbol,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addNotification]);

  return { notifications, unreadCount, markAllRead, addNotification };
}
