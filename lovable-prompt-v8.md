# BörsenStar V8 — Visual Redesign (Dark Professional)

## Kontext

BörsenStar ist ein professionelles Trading-Dashboard (React 18 + TypeScript + Vite + shadcn/ui + Tailwind + Recharts + framer-motion + lightweight-charts). Die App hat 86 Komponenten, 26 Hooks, 8 Seiten — alles funktionsfähig.

**Was bereits erledigt wurde (NICHT ändern):**
- `src/index.css` → Neue CSS-Variablen (tieferes Dark Theme, `--bullish: 160 100% 42%`, `--bearish: 0 100% 63%`, `--gold: 48 100% 50%`, `--surface-elevated: 240 8% 9%`, kompakterer `--radius: 0.5rem`)
- `src/App.css` → Vite-Boilerplate entfernt (leer)
- `src/contexts/AccountContext.tsx` → 4 Accounts: 1=Live Demo, 2=V6 Backtest, 3=V7 Backtest, 4=Combined V8 (Gold)
- `src/hooks/useCombinedModeStats.ts` → Hook für V7 Combined Mode Konfiguration + Filter-Statistiken
- `src/hooks/useProfitFactor.ts` → Hook für Profit Factor + Long/Short getrennte Win-Rates
- Version-Strings → bereits "V8" / "V8.0"
- `src/pages/BacktestReport.tsx` → Nutzt jetzt `useAccountContext()` + `useProfitFactor()`, keine hardcoded Werte mehr

**Was du JETZT machen sollst:**
Visuelles Redesign aller Seiten im **Bloomberg/TradingView Dark Professional** Stil. Kompakter, datenreicher, professioneller. Kein "generisches Dashboard", sondern Terminal-Ästhetik.

---

## Design-Prinzipien

1. **Tiefschwarzer Hintergrund** — Die CSS-Variablen sind schon gesetzt (`--background: 240 10% 4%`). Cards heben sich subtil ab (`--card: 240 8% 7%`).
2. **Monospace für alle Zahlen** — `font-mono` Klasse (JetBrains Mono) für Preise, P&L, Prozente, Scores
3. **Kompaktere Abstände** — `p-3` statt `p-4/p-6`, `py-1.5` statt `py-3` in Tabellen, `gap-3` statt `gap-6`
4. **Bloomberg-Tabellen** — Enge Zeilen, abwechselnde Zeilenfarben (`odd:bg-white/[0.02]`), sticky Headers, farbiger linker Rand für LONG (bullish green) / SHORT (bearish red)
5. **`|` Separatoren** — Bloomberg-Style vertikale Trennstriche in Metric-Strips
6. **Gold-Akzent** — `hsl(var(--gold))` für Account 4 (Combined V8), Peak-Values, Best-Performer
7. **Hover States** — Schärfere Borders bei Hover (`border-primary/40` statt generic)
8. **Micro-Badges** — Kompakte Badges (text-[10px], h-4, px-1) für Status-Anzeigen
9. **Icon-Farben** — Grün für bullish Metriken, Rot für bearish, Blau für primary, Gold für Combined

---

## Phase 1: Layout-Shell

### 1.1 AppSidebar → `src/components/AppSidebar.tsx`

Aktueller Zustand: Funktionale Sidebar mit Nav, NotificationBell, AccountSwitcher.

Änderungen:
- Hintergrund nutzt bereits `bg-sidebar` (CSS-Variable jetzt `240 10% 3%` = fast schwarz)
- "V8" Badge: Ersetze den Text `V8` im Logo mit einem gold-akzentuierten Badge: `<span className="text-[hsl(var(--gold))] font-bold">V8</span>`
- Markt-Status-Dot: Importiere `useMarketStatus` Hook. Zeige einen 6px Dot neben dem Logo (grün pulsierend wenn `isOpen`, grau wenn geschlossen). Klein und subtil.
- AccountSwitcher: Account 4 bekommt einen gold Ring (`ring-2 ring-[hsl(var(--gold))]`) wenn aktiv
- Nav-Reihenfolge aktualisieren auf: Dashboard, Positionen, Portfolio, Signale, CROC/ICE, Backtest, Analyse (ist bereits so)
- Aktiver Nav-Item: Statt `bg-primary/10` nutze einen linken Border-Indikator: `border-l-2 border-primary` auf aktiven Items

### 1.2 GlobalTickerBar → `src/components/layout/GlobalTickerBar.tsx`

Änderungen:
- Höhe reduzieren: `h-7` statt was auch immer jetzt ist
- UTC-Uhrzeit rechts anzeigen: `new Date().toISOString().slice(11, 19) + " UTC"` in Monospace, alle 1s aktualisiert
- Tieferer Hintergrund: `bg-[hsl(var(--sidebar-background))]` passend zur Sidebar
- Ticker-Items kompakter: `text-[10px]` statt `text-xs`, weniger Padding

### 1.3 AppLayout → `src/layouts/AppLayout.tsx`

Änderungen:
- Main-Content Padding: `p-4` statt `p-6` (kompakter)
- Kein weiterer Rand/Margin verschwendet

### 1.4 AccountSwitcher → `src/components/layout/AccountSwitcher.tsx`

Änderungen:
- Account 4 (Combined V8) bekommt ein Gold-Icon (Crown oder Zap statt FlaskConical)
- Gold-farbener Text für Account 4: `text-[hsl(var(--gold))]`
- Kompaktere Darstellung: Account-Description in einer Zeile mit dem Label

---

## Phase 2: Dashboard

### 2.1 DashboardHeader → `src/components/dashboard/DashboardHeader.tsx`

Änderungen:
- "V8.0" mit Gold-Akzent wenn Account 4 aktiv: `className={accountId === 4 ? "text-[hsl(var(--gold))]" : "text-primary"}`
- NEU: "Combined Mode: Active" Badge — Importiere `useCombinedModeStats`. Wenn `config.useCombinedMode === true`, zeige einen kleinen Badge: `<Badge className="bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))] border-[hsl(var(--gold))]/30 text-[10px]">Combined Mode</Badge>`
- NEU: V7 Filter Summary — Zeige `totalPassed` passed / `totalBlocked` blocked (aus `useCombinedModeStats`) in Monospace neben dem Badge

### 2.2 PortfolioSummaryStrip → `src/components/dashboard/PortfolioSummaryStrip.tsx`

Änderungen:
- NEU: Profit Factor hinzufügen — Importiere `useProfitFactor(accountId)`. Zeige als 7. Metrik: `PF: {profitFactor?.toFixed(2)}`
- NEU: Long/Short getrennte P&L — Statt nur total_pnl, zeige: `L: +$X | S: -$Y` in den entsprechenden Farben
- Alle Zahlen mit `font-mono` Klasse
- Bloomberg-Style `|` Separatoren zwischen Metriken: Füge `<span className="text-border mx-2">|</span>` zwischen den Metriken ein
- Kompakterer Padding: `px-3 py-2`

### 2.3 PerformanceComparison → `src/components/dashboard/PerformanceComparison.tsx`

Dieses Widget existiert bereits. Erweitere es:
- 3-Spalten-Vergleich: Account 1 (Live), Account 2 (V6), Account 4 (Combined)
- Bester Performer pro Metrik in Gold hervorheben: `text-[hsl(var(--gold))] font-bold`
- Metriken: Balance, Return%, Win Rate, Trades, Max DD, Profit Factor
- Nutze `useDemoAccount(1)`, `useDemoAccount(2)`, `useDemoAccount(4)` und `useProfitFactor(1)`, `useProfitFactor(2)`, `useProfitFactor(4)`

### 2.4 SymbolCard → `src/components/dashboard/SymbolCard.tsx`

Änderungen:
- Padding reduzieren: `p-3` statt aktuell
- Schärferer Hover: `hover:border-primary/40 transition-colors`
- 4-Strang-Bars dünner: `h-1` statt was auch immer (vermutlich `h-2`)
- Mehr Kontrast: Strang-Labels in `text-muted-foreground text-[9px]`
- Grade-Badge kompakter: `text-[10px] h-4 px-1`

### 2.5 NEU: CombinedModeWidget → `src/components/dashboard/CombinedModeWidget.tsx`

Erstelle ein neues Widget-Komponente:

```tsx
import { useCombinedModeStats } from "@/hooks/useCombinedModeStats";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, TrendingDown } from "lucide-react";

export default function CombinedModeWidget() {
  const stats = useCombinedModeStats();

  if (!stats.config.useCombinedMode) return null;

  return (
    <div className="card-elevated rounded-lg border border-[hsl(var(--gold))]/20 bg-[hsl(var(--gold))]/[0.03] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[hsl(var(--gold))]" />
          <span className="text-xs font-semibold text-foreground">V8 Combined Filter</span>
        </div>
        <Badge className="bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))] border-[hsl(var(--gold))]/30 text-[10px]">
          Active
        </Badge>
      </div>

      {/* Filter Stats */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-bullish" />
          <span className="text-muted-foreground">Long ≥{stats.config.minScoreLong}:</span>
          <span className="text-bullish">{stats.longPassed}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-bearish">{stats.longBlocked}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown className="h-3 w-3 text-bearish" />
          <span className="text-muted-foreground">Short ≥{stats.config.minScoreShort}:</span>
          <span className="text-bullish">{stats.shortPassed}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-bearish">{stats.shortBlocked}</span>
        </div>
      </div>

      {/* Recent Filter Results */}
      {stats.recentFilters.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
          {stats.recentFilters.slice(0, 5).map((f, i) => (
            <div key={i} className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-foreground">{f.symbol}</span>
              <span className={f.direction === "LONG" ? "text-bullish" : "text-bearish"}>{f.direction}</span>
              <span className="text-muted-foreground">Score: {f.v7Score ?? "—"}</span>
              <Badge className={`text-[9px] h-3.5 px-1 ${f.passed ? "bg-bullish/15 text-bullish" : "bg-bearish/15 text-bearish"}`} variant="outline">
                {f.passed ? "PASS" : "BLOCK"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2.6 Dashboard.tsx → `src/pages/Dashboard.tsx`

Integriere das CombinedModeWidget:
- Importiere `CombinedModeWidget` und platziere es oberhalb der SymbolCard-Grid
- Layout: CombinedModeWidget nimmt volle Breite ein, kompakt (1-2 Zeilen)
- Dashboard-Grid leicht enger: `gap-3` statt `gap-4/gap-6`

---

## Phase 3: Positions-Seite

### 3.1 Positions.tsx → `src/pages/Positions.tsx`

Bloomberg-Style Tabellen-Redesign:

- **Enge Zeilen:** `py-1.5` statt `py-3` auf TableCell
- **Abwechselnde Zeilen:** `odd:bg-white/[0.02]`
- **Sticky Headers:** `<TableHeader className="sticky top-0 bg-card z-10">`
- **Farbiger linker Rand:** Jede Zeile bekommt `border-l-2 border-[hsl(var(--bullish))]` für LONG, `border-l-2 border-[hsl(var(--bearish))]` für SHORT
- **Monospace Zahlen:** Alle Preise, P&L, Prozente in `font-mono`
- **Long/Short Zähler in Tabs:** Statt "Open (5)" zeige "Open — 3 Long · 2 Short"
- **Kompakte Headers:** `text-[10px] uppercase tracking-wider text-muted-foreground`
- **Hover-Zeile:** `hover:bg-white/[0.04]`

---

## Phase 4: Portfolio-Seite

### 4.1 Portfolio.tsx → `src/pages/Portfolio.tsx`

Änderungen:
- **Größere Zahlen:** Haupt-Metriken (Balance, Return, P&L) in `text-2xl md:text-3xl font-mono font-bold`
- **Profit Factor als 5. Metrik-Card:** Importiere `useProfitFactor`. Zeige PF als prominente Metrik-Card
- **Long/Short getrennte Win-Rates:** Nutze `useProfitFactor` für `longWinRate` und `shortWinRate`. Zeige unter der Haupt-Win-Rate: `L: {longWinRate}% | S: {shortWinRate}%`
- **INITIAL_BALANCE aus Account laden:** Falls noch hardcoded, nutze `account?.initial_balance ?? 100_000`

### 4.2 Equity Curve (in Portfolio.tsx)

Änderungen:
- Dickerer Strich: `strokeWidth={3}` statt `strokeWidth={2}`
- Mehr Flächen-Opazität: Gradient `stopOpacity={0.4}` statt `stopOpacity={0.3}`
- Gold Referenzlinie für Peak-Balance: `<ReferenceLine y={peakBalance} stroke="hsl(var(--gold))" strokeDasharray="4 4" />`

### 4.3 MonthlyReturnsHeatmap → `src/components/portfolio/MonthlyReturnsHeatmap.tsx`

Änderungen:
- Tiefere Farben: Positiv → `hsl(160, 100%, 42%)` (bullish green) mit Intensität nach Höhe, Negativ → `hsl(0, 100%, 63%)` (bearish red)
- Zellen-Text in Monospace

---

## Phase 5: Backtest-Seite

### 5.1 BacktestReport.tsx → `src/pages/BacktestReport.tsx`

Die Logik wurde bereits gefixt (nutzt AccountContext + useProfitFactor). Visuelle Änderungen:
- **Account-Info Badge:** Zeige aktuellen Account als Badge im Header: `<Badge style={{ borderColor: accountInfo.color }}>{accountInfo.label}</Badge>`
- **Vergleichs-Banner bei Account 4:** Wenn `backtestId === 4`, zeige einen Info-Banner: "Combined V6+V7 Mode — V7 Entry Filter, V6 Exit Rules"
- **Gold-Akzent für Account 4:** Borders und Akzente in Gold statt Blau wenn Account 4 aktiv
- **Equity Curve Farbe:** Passe Gradient-Farbe an Account-Farbe an

---

## Phase 6: Signals-Seite

### 6.1 SignalsPage.tsx → `src/pages/SignalsPage.tsx`

Änderungen:
- **NEU: V7 Score Spalte** — Füge eine Spalte "V7" hinzu die den `v7_composite_score` aus `trading_decisions` zeigt (JOIN über symbol + date). Score als farbiger Badge: Grün ≥5 (Long-Threshold), Gelb 1-4, Rot <1 oder null
- **V7 Score Range-Filter** — Slider oder Dropdown: Min/Max V7 Score Filter
- **"Combined Mode Filter" Toggle** — Checkbox/Switch: "Nur Combined-Filter-Passed" anzeigen
- **Kompaktere Filter-Leiste** — Filter in einer Zeile, kompakter
- **Bloomberg-Tabellen-Stil** — Gleiche Styles wie Positions: `py-1.5`, abwechselnde Zeilen, Monospace

---

## Phase 7: CROC Monitor

### 7.1 CrocMonitor.tsx → `src/pages/CrocMonitor.tsx`

Änderungen:
- **Seiten-Header:** Icon + "CROC/ICE Monitor" + Badge mit Anzahl aktiver Signale: `<Badge>12 aktiv</Badge>`
- **Thermische Farbskala für Heatmap:** Statt einfarbig, nutze Wärme-Gradient: Kalt (blau) → Neutral (grau) → Heiß (rot/orange) für CROC-Werte
- **Kompaktere Cards:** CROC-Status Cards mit `p-3`, dichterem Layout
- **Monospace für alle CROC-Scores**

---

## Phase 8: Symbol Detail

### 8.1 SymbolDetail.tsx → `src/pages/SymbolDetail.tsx`

Änderungen:
- **Größere Preis-Anzeige:** Aktueller Preis in `text-3xl font-mono font-bold`. Change-Badge prominent mit Hintergrundfarbe (grün/rot)
- **V7 Score Badge:** Wenn Combined Mode aktiv (importiere `useCombinedModeStats`), zeige V7 Score Badge neben dem Preis: `V7: {score}` in Gold
- **Kompakteres Tab-Layout** für Indikatoren/Setups/History

---

## Phase 9: Run Pipeline

### 9.1 RunPage.tsx → `src/pages/RunPage.tsx`

Änderungen:
- **Kompaktere Mode-Selektion:** Radio-Cards (Outline) statt große Buttons. Zeile statt Grid.
- **Terminal-Stil Progress Log:** Monospace Text auf schwarzem Hintergrund (`bg-black/50 font-mono text-xs text-green-400`). Scrollbarer Container. Neue Einträge erscheinen am Ende.
- **Status-Badge:** RUNNING = pulsierend gelb, DONE = grün, FAILED = rot

---

## Wichtige Hinweise

1. **NICHT ändern:** `src/index.css`, `src/App.css`, `src/contexts/AccountContext.tsx`, `src/hooks/useCombinedModeStats.ts`, `src/hooks/useProfitFactor.ts`
2. **Supabase Client Import:** `import { supabase } from "@/integrations/supabase/client";`
3. **Account Context:** `import { useAccountContext } from "@/contexts/AccountContext";` liefert `{ accountId, accountInfo, accounts, setAccountId, isBacktest, isReadOnly }`
4. **Alle shadcn/ui Komponenten** sind unter `@/components/ui/` verfügbar
5. **CSS-Utility-Klassen** verfügbar: `.glass-surface`, `.card-elevated`, `.font-mono`, `.text-bullish`, `.text-bearish`, `.text-gold`, `.bg-surface-elevated`
6. **CSS-Variablen** für Trading: `--bullish`, `--bearish`, `--gold`, `--neutral`, `--surface-elevated`, `--chart-up`, `--chart-down`
7. **Framer Motion** ist installiert und wird für Seitenübergänge genutzt
8. **Recharts** für alle Charts, **lightweight-charts** für Candlestick-Charts
