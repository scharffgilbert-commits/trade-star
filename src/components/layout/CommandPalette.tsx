import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  PieChart,
  History,
  Activity,
  Play,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";

const navigationItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", shortcut: "1" },
  { label: "Positionen", icon: Briefcase, path: "/positions", shortcut: "2" },
  { label: "Portfolio", icon: PieChart, path: "/portfolio", shortcut: "3" },
  { label: "Signale", icon: History, path: "/signals", shortcut: "4" },
  { label: "CROC/ICE", icon: Activity, path: "/croc", shortcut: "5" },
  { label: "Analyse starten", icon: Play, path: "/run", shortcut: "6" },
];

const symbols = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "JPM", name: "JPMorgan Chase" },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "SAP", name: "SAP SE" },
  { symbol: "SIEGY", name: "Siemens AG" },
  { symbol: "BMWYY", name: "BMW AG" },
];

const actions = [
  { label: "Analyse starten", icon: Play, path: "/run" },
  { label: "Konto zur\u00fccksetzen", icon: RotateCcw, path: "/run" },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const runCommand = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Suche nach Seiten, Symbolen, Aktionen..." />
      <CommandList>
        <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => runCommand(item.path)}
              className="gap-2"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
              <span className="ml-auto text-xs text-muted-foreground font-mono">
                {item.shortcut}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Symbole">
          {symbols.map((s) => (
            <CommandItem
              key={s.symbol}
              onSelect={() => runCommand(`/symbol/${s.symbol}`)}
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{s.symbol}</span>
              <span className="text-muted-foreground text-xs">{s.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Aktionen">
          {actions.map((action) => (
            <CommandItem
              key={action.label}
              onSelect={() => runCommand(action.path)}
              className="gap-2"
            >
              <action.icon className="h-4 w-4 text-muted-foreground" />
              <span>{action.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
