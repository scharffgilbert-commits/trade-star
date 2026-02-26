import { BarChart3, Play, AlertTriangle, Target, Bot, Inbox } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { Notification, NotificationType } from "@/hooks/useNotifications";

const typeConfig: Record<
  NotificationType,
  { icon: typeof BarChart3; color: string }
> = {
  analysis: { icon: BarChart3, color: "text-primary" },
  pipeline: { icon: Play, color: "text-blue-500" },
  stop_loss: { icon: AlertTriangle, color: "text-bearish" },
  take_profit: { icon: Target, color: "text-bullish" },
  auto_trade: { icon: Bot, color: "text-purple-500" },
};

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "Gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min.`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `vor ${diffHours} Std.`;

  const diffDays = Math.floor(diffHours / 24);
  return `vor ${diffDays} Tag${diffDays > 1 ? "en" : ""}`;
}

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
}

export default function NotificationPanel({
  notifications,
  onMarkAllRead,
}: NotificationPanelProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-2">
          <Inbox className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          Keine Benachrichtigungen
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Neue Signale und Events erscheinen hier
        </p>
      </div>
    );
  }

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="w-80">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-semibold text-foreground">
          Benachrichtigungen
        </span>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto py-0.5 px-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={onMarkAllRead}
          >
            Alle gelesen
          </Button>
        )}
      </div>

      {/* Notification list */}
      <ScrollArea className="max-h-80">
        <div className="divide-y divide-border">
          {notifications.map((notification) => {
            const config = typeConfig[notification.type];
            const Icon = config.icon;

            return (
              <div
                key={notification.id}
                className={`flex items-start gap-2.5 px-3 py-2.5 transition-colors ${
                  notification.read ? "opacity-60" : "bg-accent/30"
                }`}
              >
                <div className={`mt-0.5 shrink-0 ${config.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-relaxed">
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatTimestamp(notification.timestamp)}
                  </p>
                </div>
                {!notification.read && (
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
