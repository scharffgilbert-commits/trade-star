import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  Briefcase,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Check,
  Download,
  ChevronDown,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useOpenPositions, type DemoPosition } from "@/hooks/useOpenPositions";
import { useClosedPositions } from "@/hooks/useClosedPositions";
import { useCloseTrade } from "@/hooks/useCloseTrade";
import { useAutoTradeConfig } from "@/hooks/useAutoTradeConfig";
import { useDemoAccount } from "@/hooks/useDemoAccount";
import { useAccountContext } from "@/contexts/AccountContext";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────
const fmt = (v: number | null | undefined, prefix = "$") =>
  v != null ? `${prefix}${Number(v).toFixed(2)}` : "\u2014";

const fmtPct = (v: number | null | undefined) =>
  v != null ? `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%` : "\u2014";

const fmtPnl = (v: number | null | undefined) =>
  v != null ? `${Number(v) >= 0 ? "+" : ""}$${Number(v).toFixed(2)}` : "\u2014";

const pnlColor = (v: number | null | undefined) =>
  v == null ? "text-muted-foreground" : Number(v) >= 0 ? "text-bullish" : "text-bearish";

const rowBg = (pnl: number | null | undefined) => {
  if (pnl == null) return "";
  return Number(pnl) >= 0
    ? "bg-bullish/[0.03] hover:bg-bullish/[0.06]"
    : "bg-bearish/[0.03] hover:bg-bearish/[0.06]";
};

type SortKey = string;
type SortDir = "asc" | "desc";

function sortPositions<T extends Record<string, any>>(
  data: T[],
  key: SortKey,
  dir: SortDir
): T[] {
  return [...data].sort((a, b) => {
    const av = a[key] as number | string | null;
    const bv = b[key] as number | string | null;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string" && typeof bv === "string")
      return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return dir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });
}

// ALL_SYMBOLS is now loaded dynamically in AutoTradeConfigSection

// ────────────────────────────────────────────
// Column header with sort
// ────────────────────────────────────────────
function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: string;
  currentKey: string;
  currentDir: SortDir;
  onSort: (key: string) => void;
  className?: string;
}) {
  const isActive = currentKey === sortKey;
  return (
    <TableHead
      className={`cursor-pointer select-none ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );
}

// ────────────────────────────────────────────
// Open Positions Tab
// ────────────────────────────────────────────
function OpenPositionsTab() {
  const { accountId, isReadOnly } = useAccountContext();
  const { positions, isLoading } = useOpenPositions(accountId);
  const { closeTrade, isLoading: isClosing } = useCloseTrade();
  const [sortKey, setSortKey] = useState<string>("opened_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const openOnly = positions.filter((p) => p.position_status === "OPEN");

  const sorted = useMemo(
    () => sortPositions(openOnly, sortKey, sortDir),
    [openOnly, sortKey, sortDir]
  );

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Keine offenen Positionen vorhanden.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortHeader label="Symbol" sortKey="symbol" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
          <TableHead>Richtung</TableHead>
          <SortHeader label="Menge" sortKey="quantity" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
          <SortHeader label="Einstieg" sortKey="entry_price" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
          <SortHeader label="Aktuell" sortKey="current_price" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
          <SortHeader label="P&L ($)" sortKey="pnl_amount" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
          <SortHeader label="P&L (%)" sortKey="pnl_percent" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
          <SortHeader label="Stop-Loss" sortKey="stop_loss" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
          <SortHeader label="Tage" sortKey="holding_days" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
          <TableHead className="text-right">Aktion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((p) => (
          <TableRow key={p.id} className={rowBg(p.pnl_amount)}>
            <TableCell className="font-mono font-bold text-foreground">{p.symbol}</TableCell>
            <TableCell>
              <Badge
                className={
                  p.position_type === "LONG"
                    ? "bg-bullish/15 text-bullish border-bullish/30"
                    : "bg-bearish/15 text-bearish border-bearish/30"
                }
                variant="outline"
              >
                {p.position_type}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-mono">{p.quantity}</TableCell>
            <TableCell className="text-right font-mono text-muted-foreground">{fmt(p.entry_price)}</TableCell>
            <TableCell className="text-right font-mono text-foreground">{fmt(p.current_price)}</TableCell>
            <TableCell className={`text-right font-mono font-semibold ${pnlColor(p.pnl_amount)}`}>
              {fmtPnl(p.pnl_amount)}
            </TableCell>
            <TableCell className={`text-right font-mono ${pnlColor(p.pnl_percent)}`}>
              {fmtPct(p.pnl_percent)}
            </TableCell>
            <TableCell className="text-right font-mono text-muted-foreground">{fmt(p.stop_loss)}</TableCell>
            <TableCell className="text-right font-mono text-muted-foreground">{p.holding_days ?? "\u2014"}</TableCell>
            <TableCell className="text-right">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-bearish hover:text-bearish hover:bg-bearish/10">
                    <X className="h-4 w-4 mr-1" />
                    Schlie\u00dfen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Position schlie\u00dfen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      M\u00f6chtest du die {p.position_type} Position in {p.symbol} ({p.quantity} St\u00fcck)
                      zum aktuellen Preis von {fmt(p.current_price)} schlie\u00dfen?
                      {p.pnl_amount != null && (
                        <span className={`block mt-1 font-semibold ${pnlColor(p.pnl_amount)}`}>
                          Aktuelles P&L: {fmtPnl(p.pnl_amount)} ({fmtPct(p.pnl_percent)})
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-bearish hover:bg-bearish/90"
                      disabled={isClosing}
                      onClick={() =>
                        closeTrade({
                          position_id: p.id,
                          exit_price: p.current_price ?? p.entry_price,
                        })
                      }
                    >
                      {isClosing ? "Wird geschlossen\u2026" : "Ja, schlie\u00dfen"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ────────────────────────────────────────────
// Closed Positions Tab
// ────────────────────────────────────────────
function ClosedPositionsTab() {
  const { accountId } = useAccountContext();
  const { positions, isLoading, totalCount, page, setPage } = useClosedPositions(accountId);
  const totalPages = Math.ceil(totalCount / 20);

  const exportCSV = () => {
    if (positions.length === 0) return;
    const headers = [
      "Symbol",
      "Richtung",
      "Einstieg",
      "Ausstieg",
      "P&L ($)",
      "P&L (%)",
      "Dauer (Tage)",
      "Trigger",
      "Notizen",
    ];
    const rows = positions.map((p) => [
      p.symbol,
      p.position_type,
      p.entry_price,
      p.exit_price ?? "",
      p.pnl_amount ?? "",
      p.pnl_percent ?? "",
      p.holding_days ?? "",
      p.trigger_source ?? "",
      (p.notes ?? "").replace(/"/g, '""'),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `closed_positions_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={positions.length === 0}>
          <Download className="h-4 w-4 mr-1.5" />
          CSV Export
        </Button>
      </div>

      {positions.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Keine geschlossenen Positionen vorhanden.
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Richtung</TableHead>
                <TableHead className="text-right">Einstieg</TableHead>
                <TableHead className="text-right">Ausstieg</TableHead>
                <TableHead className="text-right">P&L ($)</TableHead>
                <TableHead className="text-right">P&L (%)</TableHead>
                <TableHead className="text-right">Dauer</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Notizen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((p) => (
                <TableRow key={p.id} className={rowBg(p.pnl_amount)}>
                  <TableCell className="font-mono font-bold text-foreground">{p.symbol}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        p.position_type === "LONG"
                          ? "bg-bullish/15 text-bullish border-bullish/30"
                          : "bg-bearish/15 text-bearish border-bearish/30"
                      }
                      variant="outline"
                    >
                      {p.position_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{fmt(p.entry_price)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{fmt(p.exit_price)}</TableCell>
                  <TableCell className={`text-right font-mono font-semibold ${pnlColor(p.pnl_amount)}`}>
                    {fmtPnl(p.pnl_amount)}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${pnlColor(p.pnl_percent)}`}>
                    {fmtPct(p.pnl_percent)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {p.holding_days != null ? `${p.holding_days}d` : "\u2014"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.trigger_source ?? "\u2014"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate" title={p.notes ?? ""}>
                    {p.notes?.slice(0, 60) ?? "\u2014"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      className={page === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      onClick={() => setPage(Math.max(0, page - 1))}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i;
                    } else if (page < 3) {
                      pageNum = i;
                    } else if (page > totalPages - 4) {
                      pageNum = totalPages - 7 + i;
                    } else {
                      pageNum = page - 3 + i;
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          isActive={page === pageNum}
                          className="cursor-pointer"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum + 1}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      className={page >= totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Pending Positions Tab
// ────────────────────────────────────────────
function PendingPositionsTab() {
  const { accountId } = useAccountContext();
  const { positions, isLoading, refetch } = useOpenPositions(accountId);
  const { closeTrade, isLoading: isClosing } = useCloseTrade();

  const pending = positions.filter((p) => p.position_status === "PENDING");

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Keine ausstehenden Positionen. Ausstehende Trades erscheinen hier im CONFIRM-Modus.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead>Richtung</TableHead>
          <TableHead className="text-right">Menge</TableHead>
          <TableHead className="text-right">Einstieg</TableHead>
          <TableHead className="text-right">Stop-Loss</TableHead>
          <TableHead className="text-right">TP1</TableHead>
          <TableHead>Trigger</TableHead>
          <TableHead className="text-right">Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pending.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-mono font-bold text-foreground">{p.symbol}</TableCell>
            <TableCell>
              <Badge
                className={
                  p.position_type === "LONG"
                    ? "bg-bullish/15 text-bullish border-bullish/30"
                    : "bg-bearish/15 text-bearish border-bearish/30"
                }
                variant="outline"
              >
                {p.position_type}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-mono">{p.quantity}</TableCell>
            <TableCell className="text-right font-mono text-muted-foreground">{fmt(p.entry_price)}</TableCell>
            <TableCell className="text-right font-mono text-muted-foreground">{fmt(p.stop_loss)}</TableCell>
            <TableCell className="text-right font-mono text-muted-foreground">{fmt(p.take_profit_1)}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{p.trigger_source ?? "\u2014"}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-bullish hover:text-bullish hover:bg-bullish/10"
                  disabled={isClosing}
                  onClick={() => {
                    // Confirming a PENDING position means changing its status to OPEN
                    // This is handled by the trade engine
                    refetch();
                  }}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Best\u00e4tigen
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-bearish hover:text-bearish hover:bg-bearish/10"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Ablehnen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Ausstehenden Trade ablehnen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        M\u00f6chtest du den ausstehenden {p.position_type} Trade f\u00fcr {p.symbol} wirklich ablehnen?
                        Dies kann nicht r\u00fcckg\u00e4ngig gemacht werden.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-bearish hover:bg-bearish/90"
                        disabled={isClosing}
                        onClick={() =>
                          closeTrade({
                            position_id: p.id,
                            exit_price: p.entry_price,
                            close_reason: "REJECTED",
                          })
                        }
                      >
                        Ablehnen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ────────────────────────────────────────────
// Auto-Trade Config Section
// ────────────────────────────────────────────
function AutoTradeConfigSection() {
  const { accountId, isReadOnly } = useAccountContext();
  const { isSuperAdmin } = useAuth();
  const { config, isLoading, updateConfig } = useAutoTradeConfig(accountId);
  const [open, setOpen] = useState(false);

  // Load all active symbols dynamically
  const { data: allSymbols } = useQuery({
    queryKey: ["all-active-symbols"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("symbols_master")
        .select("symbol")
        .eq("active", true)
        .order("symbol");
      if (error) throw error;
      return (data as { symbol: string }[]).map((d) => d.symbol);
    },
  });

  // Auto-Trade Config nur fuer SuperAdmin sichtbar
  if (isReadOnly || !isSuperAdmin) return null;

  if (isLoading || !config) {
    return <Skeleton className="h-12 rounded-lg" />;
  }

  const toggleSymbol = (symbol: string) => {
    const current = config.allowed_symbols ?? [];
    const updated = current.includes(symbol)
      ? current.filter((s) => s !== symbol)
      : [...current, symbol];
    updateConfig({ allowed_symbols: updated });
  };

  const toggleDirection = (dir: string) => {
    const current = config.allowed_directions ?? [];
    const updated = current.includes(dir)
      ? current.filter((d) => d !== dir)
      : [...current, dir];
    updateConfig({ allowed_directions: updated });
  };

  const modeDescriptions: Record<string, string> = {
    AUTO: "Trades werden automatisch ausgef\u00fchrt",
    CONFIRM: "Trades erfordern manuelle Best\u00e4tigung",
    NOTIFY_ONLY: "Nur Benachrichtigungen, keine Trades",
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-4 card-elevated rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-3">
            <Settings2 className="h-5 w-5 text-primary" />
            <div className="text-left">
              <div className="font-display text-sm font-semibold text-foreground">Auto-Trade Konfiguration</div>
              <div className="text-xs text-muted-foreground">
                {config.is_enabled ? "Aktiv" : "Deaktiviert"} &middot; Modus: {config.mode}
              </div>
            </div>
          </div>
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-4 card-elevated rounded-xl border border-border/50 space-y-6">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-foreground">Auto-Trade aktivieren</Label>
              <p className="text-xs text-muted-foreground">Signale werden automatisch als Trades verarbeitet</p>
            </div>
            <Switch
              checked={config.is_enabled}
              onCheckedChange={(checked) => updateConfig({ is_enabled: checked })}
            />
          </div>

          {/* Mode selection */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-3 block">Modus</Label>
            <RadioGroup
              value={config.mode}
              onValueChange={(val) => updateConfig({ mode: val as "AUTO" | "CONFIRM" | "NOTIFY_ONLY" })}
              className="space-y-2"
            >
              {(["AUTO", "CONFIRM", "NOTIFY_ONLY"] as const).map((mode) => (
                <div key={mode} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={mode} id={`mode-${mode}`} className="mt-0.5" />
                  <div>
                    <Label htmlFor={`mode-${mode}`} className="text-sm font-medium text-foreground cursor-pointer">
                      {mode}
                    </Label>
                    <p className="text-xs text-muted-foreground">{modeDescriptions[mode]}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Allowed symbols */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-3 block">Erlaubte Symbole</Label>
            <div className="flex flex-wrap gap-3">
              {(allSymbols ?? []).map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={(config.allowed_symbols ?? []).includes(s)}
                    onCheckedChange={() => toggleSymbol(s)}
                  />
                  <span className="font-mono text-xs text-foreground">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Allowed directions */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-3 block">Erlaubte Richtungen</Label>
            <div className="flex gap-4">
              {["LONG", "SHORT"].map((dir) => (
                <label key={dir} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={(config.allowed_directions ?? []).includes(dir)}
                    onCheckedChange={() => toggleDirection(dir)}
                  />
                  <span
                    className={`font-mono text-xs font-semibold ${
                      dir === "LONG" ? "text-bullish" : "text-bearish"
                    }`}
                  >
                    {dir}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ────────────────────────────────────────────
// Summary Bar
// ────────────────────────────────────────────
function SummaryBar({ positions }: { positions: DemoPosition[] }) {
  const openOnly = positions.filter((p) => p.position_status === "OPEN");
  const totalPnl = openOnly.reduce((acc, p) => acc + (p.pnl_amount ?? 0), 0);
  const best = openOnly.length > 0
    ? openOnly.reduce((a, b) => ((a.pnl_amount ?? 0) > (b.pnl_amount ?? 0) ? a : b))
    : null;
  const worst = openOnly.length > 0
    ? openOnly.reduce((a, b) => ((a.pnl_amount ?? 0) < (b.pnl_amount ?? 0) ? a : b))
    : null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-3 rounded-lg bg-muted/30 text-sm">
      <span className="text-muted-foreground">
        Offene: <span className="font-semibold text-foreground">{openOnly.length} Positionen</span>
      </span>
      <span className="text-muted-foreground">
        Gesamt-P&L:{" "}
        <span className={`font-mono font-semibold ${pnlColor(totalPnl)}`}>{fmtPnl(totalPnl)}</span>
      </span>
      {best && (
        <span className="text-muted-foreground">
          Bester:{" "}
          <span className="font-mono font-semibold text-bullish">
            {best.symbol} {fmtPnl(best.pnl_amount)}
          </span>
        </span>
      )}
      {worst && (
        <span className="text-muted-foreground">
          Schlechtester:{" "}
          <span className="font-mono font-semibold text-bearish">
            {worst.symbol} {fmtPnl(worst.pnl_amount)}
          </span>
        </span>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Main Positions Page
// ────────────────────────────────────────────
export default function Positions() {
  const { accountId, accountInfo, isReadOnly } = useAccountContext();
  const { positions, isLoading } = useOpenPositions(accountId);
  const pendingCount = positions.filter((p) => p.position_status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <div className="p-2 rounded-lg bg-primary/10">
          <Briefcase className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Positionen</h1>
          <p className="text-xs text-muted-foreground">
            {accountInfo.label} — Positionen verwalten
            {isReadOnly && <span className="ml-2 text-blue-400">(Nur Lesen)</span>}
          </p>
        </div>
      </motion.div>

      {/* Summary bar */}
      {!isLoading && <SummaryBar positions={positions} />}

      {/* Tabs */}
      <Tabs defaultValue="open" className="space-y-4">
        <TabsList>
          <TabsTrigger value="open">
            Offene Positionen
          </TabsTrigger>
          <TabsTrigger value="closed">
            Geschlossene Positionen
          </TabsTrigger>
          <TabsTrigger value="pending">
            Ausstehend
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-neutral/20 text-neutral text-[10px] px-1.5 py-0">{pendingCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open">
          <div className="card-elevated rounded-xl border border-border/50 overflow-x-auto">
            <OpenPositionsTab />
          </div>
        </TabsContent>

        <TabsContent value="closed">
          <div className="card-elevated rounded-xl border border-border/50 overflow-x-auto">
            <ClosedPositionsTab />
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <div className="card-elevated rounded-xl border border-border/50 overflow-x-auto">
            <PendingPositionsTab />
          </div>
        </TabsContent>
      </Tabs>

      {/* Auto-Trade Config */}
      <AutoTradeConfigSection />
    </div>
  );
}
