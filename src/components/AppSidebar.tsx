import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, LineChart, Play, History, Activity, TrendingUp } from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/signals", icon: History, label: "Signale" },
  { to: "/croc", icon: Activity, label: "CROC/ICE" },
  { to: "/run", icon: Play, label: "Analyse" },
];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-16 md:w-56 bg-sidebar border-r border-sidebar-border z-50 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
        <TrendingUp className="h-5 w-5 text-primary shrink-0" />
        <span className="hidden md:block font-display text-sm font-bold text-foreground">
          BörsenStar <span className="text-primary">V4</span>
        </span>
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
    </aside>
  );
}
