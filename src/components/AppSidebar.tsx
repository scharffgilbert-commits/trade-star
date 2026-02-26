import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Play, History, Activity, TrendingUp, Briefcase, PieChart, Search } from "lucide-react";
import NotificationBell from "@/components/layout/NotificationBell";
import type { Notification } from "@/hooks/useNotifications";

interface AppSidebarProps {
  notifications?: Notification[];
  unreadCount?: number;
  onMarkAllRead?: () => void;
}

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/positions", icon: Briefcase, label: "Positionen" },
  { to: "/portfolio", icon: PieChart, label: "Portfolio" },
  { to: "/signals", icon: History, label: "Signale" },
  { to: "/croc", icon: Activity, label: "CROC/ICE" },
  { to: "/run", icon: Play, label: "Analyse" },
];

export default function AppSidebar({ notifications = [], unreadCount = 0, onMarkAllRead }: AppSidebarProps) {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-16 md:w-56 bg-sidebar border-r border-sidebar-border z-50 flex flex-col">
      {/* Logo + Actions */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary shrink-0" />
          <span className="hidden md:block font-display text-sm font-bold text-foreground">
            BörsenStar <span className="text-primary">V4</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1">
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={onMarkAllRead ?? (() => {})}
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="hidden md:block">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer: Shortcuts Hint */}
      <div className="hidden md:block p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Search className="h-3 w-3" />
          <span>⌘K Suche · ? Shortcuts</span>
        </div>
      </div>
    </aside>
  );
}
