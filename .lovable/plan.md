

# BörsenStar V8 — Visual Redesign Plan

## Analysis

The uploaded `lovable-prompt-v8.md` describes a 9-phase Bloomberg/TradingView-style visual redesign across all pages. Before implementing, there are **prerequisites missing**:

### Missing Prerequisites (must be created first)
1. **`useCombinedModeStats` hook** -- referenced but does not exist
2. **`useProfitFactor` hook** -- referenced but does not exist
3. **AccountContext only has 2 accounts** (1=Live Demo, 2=Backtest 2025), but the spec assumes 4 accounts (1=Live Demo, 2=V6 Backtest, 3=V7 Backtest, 4=Combined V8 Gold). The spec says "NICHT ändern" but it's clearly not in the expected state yet.
4. **CSS variables** like `--gold`, `--surface-elevated` are not yet defined in `index.css`
5. **CSS utility classes** like `.text-bullish`, `.text-bearish`, `.text-gold`, `.bg-surface-elevated` don't exist yet

### Scope (9 Phases, ~20 files)

| Phase | Scope | Files |
|-------|-------|-------|
| Prerequisites | Create missing hooks, update AccountContext, add CSS vars | 4 files |
| 1 - Layout Shell | AppSidebar, GlobalTickerBar, AppLayout, AccountSwitcher | 4 files |
| 2 - Dashboard | DashboardHeader, PortfolioSummaryStrip, PerformanceComparison, SymbolCard, new CombinedModeWidget, Dashboard.tsx | 6 files |
| 3 - Positions | Bloomberg-style table redesign | 1 file |
| 4 - Portfolio | Larger metrics, profit factor, equity curve improvements | 1 file |
| 5 - Backtest | Account-aware badges, gold accents | 1 file |
| 6 - Signals | V7 score column, combined mode filter | 1 file |
| 7 - CROC Monitor | Thermal heatmap, compact cards | 1 file |
| 8 - Symbol Detail | Larger price display, V7 badge | 1 file |
| 9 - Run Pipeline | Terminal-style progress, compact mode selection | 1 file |

### Proposed Approach

Due to the massive scope (~20 files, 9 phases), I recommend implementing in **2-3 batches**:

**Batch 1**: Prerequisites + Phase 1 (Layout Shell) + Phase 2 (Dashboard)
- Create `useCombinedModeStats`, `useProfitFactor` hooks
- Update AccountContext to 4 accounts
- Add missing CSS variables (`--gold`, etc.) and utility classes
- Redesign AppSidebar, GlobalTickerBar, AppLayout, AccountSwitcher
- Redesign Dashboard components + new CombinedModeWidget

**Batch 2**: Phase 3-5 (Positions, Portfolio, Backtest)
- Bloomberg table styles for Positions
- Portfolio metric enhancements
- Backtest account-aware styling

**Batch 3**: Phase 6-9 (Signals, CROC, Symbol Detail, Run Pipeline)
- Remaining page redesigns

### Key Design Changes (all phases)
- Monospace (`font-mono`) for all numbers/prices/scores
- Compact spacing: `p-3` instead of `p-6`, `gap-3` instead of `gap-6`
- Bloomberg-style tables: tight rows (`py-1.5`), alternating row colors, sticky headers, colored left borders for LONG/SHORT
- `|` separators in metric strips
- Gold accent (`hsl(48, 100%, 50%)`) for Account 4 / Combined V8
- Active nav items use left border indicator instead of background highlight

### Technical Details
- No database changes needed -- purely frontend visual redesign
- New hooks query existing tables (`trading_decisions`, `demo_positions`, `demo_accounts`)
- `useProfitFactor(accountId)` computes profit factor + long/short win rates from `demo_positions`
- `useCombinedModeStats()` reads V7 combined mode config from `trading_decisions` metadata
- All existing functionality preserved -- only visual/layout changes

