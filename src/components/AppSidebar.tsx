import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Play, History, Activity, TrendingUp, Briefcase, PieChart, Search, FlaskConical, Crown, LogOut, Shield } from "lucide-react";
import NotificationBell from "@/components/layout/NotificationBell";
import AccountSwitcher from "@/components/layout/AccountSwitcher";
import { useMarketStatus } from "@/hooks/useMarketStatus";
import { useAuth } from "@/contexts/AuthContext";
import type { Notification } from "@/hooks/useNotifications";

interface AppSidebarProps {
  notifications?: Notification[];
  unreadCount?: number;
  onMarkAllRead?: () => void;
}

const userNavItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/positions", icon: Briefcase, label: "Positionen" },
  { to: "/portfolio", icon: PieChart, label: "Portfolio" },
  { to: "/signals", icon: History, label: "Signale" },
];

const adminNavItems = [
  { to: "/croc", icon: Activity, label: "CROC/ICE" },
  { to: "/backtest", icon: FlaskConical, label: "Backtest" },
  { to: "/run", icon: Play, label: "Analyse" },
  { to: "/admin", icon: Shield, label: "SuperAdmin" },
];

export default function AppSidebar({ notifications = [], unreadCount = 0, onMarkAllRead }: AppSidebarProps) {
  const location = useLocation();
  const { isOpen } = useMarketStatus();
  const { user, signOut, isSuperAdmin } = useAuth();

  const renderNavItem = (item: typeof userNavItems[0]) => {
    const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? "border-l-2 border-primary bg-primary/5 text-primary font-medium"
            : "border-l-2 border-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        }`}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="hidden md:block">{item.label}</span>
      </NavLink>
    );
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-16 md:w-56 bg-sidebar border-r border-sidebar-border z-50 flex flex-col">
      {/* Logo + Actions */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="relative">
            <TrendingUp className="h-5 w-5 text-primary shrink-0" />
            <div
              className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${
                isOpen ? "bg-bullish animate-pulse-glow" : "bg-muted-foreground"
              }`}
            />
          </div>
          <span className="hidden md:flex items-center gap-1 font-display text-sm font-bold text-foreground">
            BörsenStar
            <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
              V8
            </span>
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
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {userNavItems.map(renderNavItem)}

        {/* Admin Section */}
        {isSuperAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              <span className="hidden md:block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Admin
              </span>
              <div className="md:hidden h-px bg-border my-1" />
            </div>
            {adminNavItems.map(renderNavItem)}
          </>
        )}
      </nav>

      {/* Account Switcher */}
      <div className="hidden md:block p-3 border-t border-sidebar-border">
        <AccountSwitcher compact />
      </div>

      {/* User + Logout */}
      <div className="hidden md:block px-3 py-2 border-t border-sidebar-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {isSuperAdmin && <Shield className="h-3 w-3 text-gold shrink-0" />}
            <span className="text-xs text-muted-foreground truncate max-w-[130px]">
              {user?.email}
            </span>
          </div>
          <button
            onClick={signOut}
            className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Abmelden"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Footer: Shortcuts Hint */}
      <div className="hidden md:block px-3 pb-3">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Search className="h-3 w-3" />
          <span>⌘K Suche · ? Shortcuts</span>
        </div>
      </div>
    </aside>
  );
}
