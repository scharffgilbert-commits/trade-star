import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import GlobalTickerBar from "@/components/layout/GlobalTickerBar";
import CommandPalette from "@/components/layout/CommandPalette";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useNotifications } from "@/hooks/useNotifications";

export default function AppLayout() {
  useKeyboardShortcuts();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [cmdkOpen, setCmdkOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllRead={markAllRead}
      />
      <div className="pl-16 md:pl-56">
        <GlobalTickerBar />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={cmdkOpen} onOpenChange={setCmdkOpen} />
    </div>
  );
}
