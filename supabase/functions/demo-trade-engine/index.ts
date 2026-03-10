import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TradingRule {
  rule_name: string;
  rule_type: string;
  rule_value: Record<string, unknown>;
  is_active: boolean;
}

interface AutoTradeConfig {
  is_enabled: boolean;
  mode: string; // AUTO | CONFIRM | NOTIFY_ONLY
  allowed_symbols: string[];
  allowed_directions: string[];
}

interface StrategyParams {
  risk_per_trade_percent: number;
  max_position_size: number;
  max_open_positions: number;
  min_confidence_threshold: number;
  trailing_stop_default: number;
  min_risk_reward_ratio: number;
}

async function loadStrategyConfig(supabase: any): Promise<StrategyParams> {
  const keys = [
    "risk_per_trade_percent",
    "max_position_size",
    "max_open_positions",
    "min_confidence_threshold",
    "trailing_stop_default",
    "min_risk_reward_ratio",
  ];
  const { data: configs } = await supabase
    .from("strategy_config")
    .select("config_key, config_value")
    .in("config_key", keys);

  const get = (key: string, fallback: number): number => {
    const entry = (configs ?? []).find((c: any) => c.config_key === key);
    return entry?.config_value?.value ?? fallback;
  };

  return {
    risk_per_trade_percent: get("risk_per_trade_percent", 2.0),
    max_position_size: get("max_position_size", 20000),
    max_open_positions: get("max_open_positions", 5),
    min_confidence_threshold: get("min_confidence_threshold", 55),
    trailing_stop_default: get("trailing_stop_default", 3.0),
    min_risk_reward_ratio: get("min_risk_reward_ratio", 1.5),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action } = body;

    // ── Auth: Frontend-actions require valid JWT + account ownership ──
    const userActions = ["open", "close", "reset"];
    if (userActions.includes(action)) {
      const authHeader = req.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Nicht authentifiziert" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      const supabaseAuth = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Ungueltige Sitzung" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Verify account ownership
      if (body.account_id) {
        const { data: acct } = await supabase
          .from("demo_accounts")
          .select("user_id")
          .eq("id", body.account_id)
          .single();
        if (!acct || acct.user_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "Kein Zugriff auf dieses Konto" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // ── Multi-account iteration for pipeline actions ──
    // When no account_id is provided, iterate ALL active auto-trade accounts
    const multiAccountActions = ["auto_trade", "check_exits", "update_trailing", "check_pending"];
    if (multiAccountActions.includes(action) && !body.account_id) {
      const { data: activeConfigs } = await supabase
        .from("auto_trade_config")
        .select("account_id")
        .eq("is_enabled", true);
      const accountIds = (activeConfigs ?? []).map((c: any) => c.account_id);
      if (accountIds.length === 0) {
        return jsonResponse({ message: "No active auto-trade accounts", results: [] });
      }
      const allResults: any[] = [];
      for (const acctId of accountIds) {
        const acctBody = { ...body, account_id: acctId };
        try {
          let result: Response;
          switch (action) {
            case "auto_trade":
              result = await handleAutoTrade(supabase, acctBody);
              break;
            case "check_exits":
              result = await handleCheckExits(supabase, acctBody);
              break;
            case "update_trailing":
              result = await handleUpdateTrailing(supabase, acctBody);
              break;
            case "check_pending":
              result = await handleCheckPending(supabase, acctBody);
              break;
            default:
              result = jsonResponse({ error: `Unknown action: ${action}` });
          }
          const resultData = await result.json();
          allResults.push({ account_id: acctId, ...resultData });
        } catch (err) {
          allResults.push({ account_id: acctId, error: err.message });
        }
      }
      return jsonResponse({ message: `${action} completed for ${accountIds.length} accounts`, results: allResults });
    }

    switch (action) {
      case "auto_trade":
        return await handleAutoTrade(supabase, body);
      case "open":
        return await handleOpenPosition(supabase, body);
      case "close":
        return await handleClosePosition(supabase, body);
      case "check_exits":
        return await handleCheckExits(supabase, body);
      case "update_trailing":
        return await handleUpdateTrailing(supabase, body);
      case "update_prices":
        return await handleUpdatePrices(supabase);
      case "check_pending":
        return await handleCheckPending(supabase, body);
      case "reset":
        return await handleReset(supabase, body);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (err) {
    console.error("demo-trade-engine error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTO_TRADE — Process latest trading_decisions and open positions
// Called by cron at 21:30 UTC (after analysis at 21:15)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleAutoTrade(supabase: any, body: any) {
  const accountId = body.account_id ?? 1;
  const results: any[] = [];

  // 1. Get auto-trade config
  const { data: config } = await supabase
    .from("auto_trade_config")
    .select("*")
    .eq("account_id", accountId)
    .single();

  if (!config?.is_enabled) {
    return jsonResponse({ message: "Auto-trade is disabled", results: [] });
  }

  const autoConfig = config as AutoTradeConfig;

  // 1b. Load dynamic strategy parameters
  const strategyParams = await loadStrategyConfig(supabase);

  // 2. Get account info
  const { data: account } = await supabase
    .from("demo_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (!account) {
    throw new Error("Demo account not found");
  }

  // Shadow Portfolio: takes ALL trades, no rules, fixed position size
  const isShadow = account.is_shadow === true;

  // 3. Get trading decisions (only LONG/SHORT, not CASH)
  // V8.1: Support target_date for backfilling Shadow Portfolio
  const targetDate = body.target_date ?? new Date().toISOString().slice(0, 10);
  const { data: rawDecisions } = await supabase
    .from("trading_decisions")
    .select("*")
    .gte("decision_timestamp", targetDate + "T00:00:00")
    .lt("decision_timestamp", targetDate + "T23:59:59")
    .in("action_type", ["LONG", "SHORT"])
    .order("confidence_score", { ascending: false });

  if (!rawDecisions?.length) {
    return jsonResponse({ message: `No actionable decisions for ${targetDate}`, results: [] });
  }

  // V8.1: Quality-based ranking (not just confidence)
  // S4 (CROC) hat bestes Unterscheidungsvermögen (Winners Ø56 vs Losers Ø35)
  // S1 (Technical) ist zweitbester Differenzierer
  // Fusion-Confidence bleibt als Gesamtbewertung relevant
  const decisions = [...rawDecisions];
  if (decisions.length > 1) {
    decisions.sort((a: any, b: any) => {
      const s4a = Number(a.strand4_confidence ?? 0);
      const s1a = Number(a.strand1_confidence ?? 0);
      const cfa = Number(a.confidence_score ?? 0);
      // Malus: S4 widerspricht Trade-Richtung → -20
      const s4ConflictA = (a.strand4_signal && a.strand4_signal !== a.action_type) ? -20 : 0;
      const scoreA = (s4a * 0.35) + (s1a * 0.30) + (cfa * 0.35) + s4ConflictA;

      const s4b = Number(b.strand4_confidence ?? 0);
      const s1b = Number(b.strand1_confidence ?? 0);
      const cfb = Number(b.confidence_score ?? 0);
      const s4ConflictB = (b.strand4_signal && b.strand4_signal !== b.action_type) ? -20 : 0;
      const scoreB = (s4b * 0.35) + (s1b * 0.30) + (cfb * 0.35) + s4ConflictB;

      return scoreB - scoreA; // DESC — highest quality first
    });
    console.log(`V8.1 Quality Ranking: Top=${decisions[0]?.symbol} (score=${(
      Number(decisions[0]?.strand4_confidence ?? 0) * 0.35 +
      Number(decisions[0]?.strand1_confidence ?? 0) * 0.30 +
      Number(decisions[0]?.confidence_score ?? 0) * 0.35
    ).toFixed(1)}), Last=${decisions[decisions.length - 1]?.symbol}`);
  }

  // 4. Get existing open positions (to avoid duplicates)
  const { data: openPositions } = await supabase
    .from("demo_positions")
    .select("symbol")
    .eq("account_id", accountId)
    .eq("position_status", "OPEN");

  const openSymbols = new Set((openPositions ?? []).map((p: any) => p.symbol));

  // 5. Process each decision
  for (const decision of decisions) {
    const symbol = decision.symbol;
    const direction = decision.action_type;

    // Skip if already have open position for this symbol
    if (openSymbols.has(symbol)) {
      results.push({ symbol, status: "SKIPPED", reason: "Already has open position" });
      continue;
    }

    // Skip if symbol not in allowed list
    if (autoConfig.allowed_symbols?.length > 0 && !autoConfig.allowed_symbols.includes(symbol)) {
      results.push({ symbol, status: "SKIPPED", reason: "Symbol not in allowed list" });
      continue;
    }

    // Skip if direction not allowed
    if (autoConfig.allowed_directions?.length > 0 && !autoConfig.allowed_directions.includes(direction)) {
      results.push({ symbol, status: "SKIPPED", reason: `Direction ${direction} not allowed` });
      continue;
    }

    // Check trading rules (skip for shadow accounts — they take ALL trades)
    if (!isShadow) {
      const ruleCheck = await checkTradingRules(supabase, accountId, account, decision, strategyParams);
      if (!ruleCheck.allPassed) {
        const failedRules = ruleCheck.results.filter((r: any) => !r.passed).map((r: any) => r.rule).join(", ");
        results.push({ symbol, status: "BLOCKED", reason: `Rules failed: ${failedRules}` });
        continue;
      }
    }

    const entryPrice = Number(decision.entry_price);
    const stopLoss = Number(decision.stop_loss);
    let quantity = 1;

    if (isShadow) {
      // Shadow Portfolio: fixed $10,000 per position (standardized for analysis)
      quantity = Math.max(1, Math.floor(10000 / entryPrice));
    } else {
      // Normal accounts: risk-based position sizing
      const riskPercent = strategyParams.risk_per_trade_percent;
      const riskAmount = account.current_balance * (riskPercent / 100);
      const priceDiff = Math.abs(entryPrice - stopLoss);

      if (priceDiff > 0) {
        quantity = Math.max(1, Math.floor(riskAmount / priceDiff));
      }

      // Cap at max position size (dynamic from strategy_config)
      const maxPositionSize = strategyParams.max_position_size;
      const positionValue = quantity * entryPrice;
      if (positionValue > maxPositionSize) {
        quantity = Math.floor(maxPositionSize / entryPrice);
      }

      // V8.3: Cap to available MARGIN (not full notional)
      // For leverage=1: marginPerUnit = entryPrice (identical to before)
      // For leverage=20: marginPerUnit = entryPrice / 20
      const leverage = getAccountLeverage(account);
      const marginUsed = Number(account.margin_used ?? 0);
      const availableBalance = account.current_balance - marginUsed;
      const marginPerUnit = entryPrice / leverage;
      if (quantity * marginPerUnit > availableBalance) {
        quantity = Math.floor(availableBalance / marginPerUnit);
      }

      if (quantity < 1) {
        results.push({ symbol, status: "SKIPPED", reason: "Insufficient balance" });
        continue;
      }
    }

    // V6.0: Determine entry_type and setup info from AI strand analysis
    const { data: fusionAnalysis } = await supabase
      .from("ai_strand_analyses")
      .select("key_findings")
      .eq("symbol", symbol)
      .eq("analysis_date", targetDate)
      .eq("strand_type", "fusion")
      .single();

    const fusionFindings = fusionAnalysis?.key_findings ?? {};
    const entryType = fusionFindings.entry_type || "MARKET";
    const setupName = fusionFindings.setup_name || null;
    const tradeStyle = fusionFindings.trade_style || "CTT";
    const trailingStopType = fusionFindings.trailing_stop_type || "PERCENT";

    // V6.0: If STOP_BUY/STOP_SELL, create PENDING position with trigger price
    // Shadow: always MARKET entry (no pending orders)
    const isPendingOrder = !isShadow && (entryType === "STOP_BUY" || entryType === "STOP_SELL");

    // V6.0: Get detected setup details for stop levels
    const { data: activeSetup } = await supabase
      .from("detected_setups")
      .select("stop_soft, stop_hard, profit_1, profit_2, profit_3, entry_price")
      .eq("symbol", symbol)
      .eq("is_active", true)
      .eq("direction", direction)
      .order("detection_date", { ascending: false })
      .limit(1)
      .single();

    // Use setup stop levels if available, otherwise AI decision levels
    const stopSoft = activeSetup?.stop_soft || stopLoss;
    const stopHard = activeSetup?.stop_hard || null;
    const tp1 = activeSetup?.profit_1 || decision.take_profit_1;
    const tp2 = activeSetup?.profit_2 || decision.take_profit_2;
    const tp3 = activeSetup?.profit_3 || decision.take_profit_3;

    // V6.0: For pending orders, use setup entry price as trigger
    const pendingEntryPrice = isPendingOrder ? (activeSetup?.entry_price || entryPrice) : null;

    // Shadow: always AUTO mode
    const effectiveMode = isShadow ? "AUTO" : autoConfig.mode;

    if (effectiveMode === "CONFIRM" || isPendingOrder) {
      // Create pending position (for user confirmation OR stop-buy/sell orders)
      const posStatus = isPendingOrder ? "PENDING" : "PENDING";
      const { error } = await supabase.from("demo_positions").insert({
        account_id: accountId,
        symbol,
        decision_id: decision.decision_id,
        position_type: direction,
        position_status: posStatus,
        quantity,
        entry_price: isPendingOrder ? pendingEntryPrice : entryPrice,
        current_price: entryPrice,
        stop_loss: stopSoft,
        stop_loss_soft: stopSoft,
        stop_loss_hard: stopHard,
        take_profit_1: tp1,
        take_profit_2: tp2,
        take_profit_3: tp3,
        trailing_stop_percent: decision.trailing_stop_percent ?? strategyParams.trailing_stop_default,
        trailing_stop_price: null,
        trailing_stop_activated: false,
        trailing_stop_highest: direction === "LONG" ? entryPrice : null,
        trailing_stop_lowest: direction === "SHORT" ? entryPrice : null,
        trigger_source: "AUTO_SIGNAL",
        notes: `Auto-Signal: ${decision.reasoning?.slice(0, 200)}`,
        entry_type: entryType,
        pending_entry_price: pendingEntryPrice,
        setup_name: setupName,
        trade_style: tradeStyle,
        trailing_stop_type: trailingStopType,
      });

      results.push({
        symbol,
        status: error ? "ERROR" : "PENDING",
        reason: error?.message ?? (isPendingOrder ? `${entryType} at ${pendingEntryPrice}` : "Awaiting confirmation"),
        quantity,
        direction,
        entry_type: entryType,
      });
    } else if (effectiveMode === "AUTO") {
      // Open position directly (MARKET orders)
      const result = await openPosition(supabase, accountId, account, {
        symbol,
        decision_id: decision.decision_id,
        direction,
        quantity,
        entry_price: entryPrice,
        stop_loss: stopSoft,
        stop_loss_soft: stopSoft,
        stop_loss_hard: stopHard,
        take_profit_1: tp1,
        take_profit_2: tp2,
        take_profit_3: tp3,
        trailing_stop_percent: decision.trailing_stop_percent ?? strategyParams.trailing_stop_default,
        trigger_source: "AUTO_SIGNAL",
        notes: `Auto-Trade: ${decision.reasoning?.slice(0, 200)}`,
        entry_type: entryType,
        setup_name: setupName,
        trade_style: tradeStyle,
        trailing_stop_type: trailingStopType,
      });
      results.push({ symbol, ...result });

      // V8.2: Log trade opening
      await supabase.from("system_logs").insert({
        source: "trade_engine", action: "auto_trade", level: "success",
        symbol, account_id: accountId,
        message: `${direction} Position eröffnet: ${symbol} @ $${entryPrice.toFixed(2)}`,
        details: { entry_price: entryPrice, stop_loss: stopSoft, take_profit_1: tp1,
                   confidence: decision.confidence_score, quality_score: decision.strand4_confidence,
                   entry_type: entryType, quantity }
      }).then(() => {}).catch(() => {}); // fire-and-forget
    } else {
      // NOTIFY_ONLY
      results.push({ symbol, status: "NOTIFIED", direction, confidence: decision.confidence_score });
    }

    openSymbols.add(symbol);
  }

  return jsonResponse({ message: `Auto-trade processed ${decisions.length} decisions`, results });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OPEN — Manually open a position
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleOpenPosition(supabase: any, body: any) {
  const accountId = body.account_id ?? 1;

  // Load dynamic strategy parameters
  const strategyParams = await loadStrategyConfig(supabase);

  const { data: account } = await supabase
    .from("demo_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (!account) throw new Error("Demo account not found");

  const result = await openPosition(supabase, accountId, account, {
    symbol: body.symbol,
    decision_id: body.decision_id,
    direction: body.direction,
    quantity: body.quantity,
    entry_price: body.entry_price,
    stop_loss: body.stop_loss,
    take_profit_1: body.take_profit_1,
    take_profit_2: body.take_profit_2,
    take_profit_3: body.take_profit_3,
    trailing_stop_percent: body.trailing_stop_percent ?? strategyParams.trailing_stop_default,
    trigger_source: body.trigger_source ?? "MANUAL",
    notes: body.notes,
  });

  return jsonResponse(result);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLOSE — Close a position
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleClosePosition(supabase: any, body: any) {
  const { position_id, exit_price, close_reason } = body;
  if (!position_id) throw new Error("position_id required");

  const { data: position } = await supabase
    .from("demo_positions")
    .select("*")
    .eq("id", position_id)
    .single();

  if (!position) throw new Error("Position not found");
  if (position.position_status !== "OPEN" && position.position_status !== "PENDING") {
    throw new Error(`Position already ${position.position_status}`);
  }

  const actualExitPrice = exit_price ?? position.current_price ?? position.entry_price;
  const result = await closePosition(supabase, position, actualExitPrice, close_reason ?? "MANUAL_CLOSE");

  return jsonResponse(result);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHECK_EXITS — Check SL/TP/Trailing for all open positions
// Called daily after prices are updated
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleCheckExits(supabase: any, body: any) {
  const accountId = body.account_id ?? 1;
  const results: any[] = [];

  // Get all open positions
  const { data: positions } = await supabase
    .from("demo_positions")
    .select("*")
    .eq("account_id", accountId)
    .eq("position_status", "OPEN");

  if (!positions?.length) {
    return jsonResponse({ message: "No open positions", results: [] });
  }

  for (const pos of positions) {
    const currentPrice = Number(pos.current_price ?? pos.entry_price);
    const entryPrice = Number(pos.entry_price);
    const isLong = pos.position_type === "LONG";

    // 1. Check Stop-Loss
    if (pos.stop_loss) {
      const sl = Number(pos.stop_loss);
      if ((isLong && currentPrice <= sl) || (!isLong && currentPrice >= sl)) {
        const result = await closePosition(supabase, pos, currentPrice, "STOP_LOSS");
        results.push({ symbol: pos.symbol, action: "STOPPED_OUT", ...result });
        // V8.2: Log exit
        const exitPnl = isLong ? (currentPrice - entryPrice) * Number(pos.quantity) : (entryPrice - currentPrice) * Number(pos.quantity);
        await supabase.from("system_logs").insert({
          source: "trade_engine", action: "check_exits", level: "warn",
          symbol: pos.symbol, account_id: pos.account_id,
          message: `STOP_LOSS: ${pos.symbol} ${pos.position_type} @ $${currentPrice.toFixed(2)}, P&L: $${exitPnl.toFixed(2)}`,
          details: { exit_price: currentPrice, exit_reason: "STOP_LOSS", stop_loss: sl, pnl: exitPnl }
        }).then(() => {}).catch(() => {});
        continue;
      }
    }

    // 2. Check Trailing Stop
    if (pos.trailing_stop_price && pos.trailing_stop_activated) {
      const trailingPrice = Number(pos.trailing_stop_price);
      if ((isLong && currentPrice <= trailingPrice) || (!isLong && currentPrice >= trailingPrice)) {
        const result = await closePosition(supabase, pos, currentPrice, "TRAILING_STOP");
        results.push({ symbol: pos.symbol, action: "TRAILING_STOPPED", ...result });
        // V8.2: Log exit
        const exitPnl = isLong ? (currentPrice - entryPrice) * Number(pos.quantity) : (entryPrice - currentPrice) * Number(pos.quantity);
        await supabase.from("system_logs").insert({
          source: "trade_engine", action: "check_exits", level: "warn",
          symbol: pos.symbol, account_id: pos.account_id,
          message: `TRAILING_STOP: ${pos.symbol} ${pos.position_type} @ $${currentPrice.toFixed(2)}, P&L: $${exitPnl.toFixed(2)}`,
          details: { exit_price: currentPrice, exit_reason: "TRAILING_STOP", trailing_price: trailingPrice, pnl: exitPnl }
        }).then(() => {}).catch(() => {});
        continue;
      }
    }

    // 3. Check Take-Profit levels
    if (pos.take_profit_3) {
      const tp3 = Number(pos.take_profit_3);
      if ((isLong && currentPrice >= tp3) || (!isLong && currentPrice <= tp3)) {
        const result = await closePosition(supabase, pos, currentPrice, "TAKE_PROFIT_3");
        results.push({ symbol: pos.symbol, action: "TP3_HIT", ...result });
        continue;
      }
    }

    // V6.0: Check +1R Partial Close (50% at 1R)
    if (!pos.partial_close_at_1r && pos.stop_loss) {
      const sl = Number(pos.stop_loss);
      const oneR = Math.abs(entryPrice - sl);
      const target1R = isLong ? entryPrice + oneR : entryPrice - oneR;
      if ((isLong && currentPrice >= target1R) || (!isLong && currentPrice <= target1R)) {
        // Close 50% of position at +1R
        const halfQty = Math.floor(Number(pos.quantity) / 2);
        if (halfQty > 0) {
          const partialPnl = isLong
            ? (currentPrice - entryPrice) * halfQty
            : (entryPrice - currentPrice) * halfQty;

          // Update position: reduce quantity, set partial close flag, move SL to breakeven
          const remainQty = Number(pos.quantity) - halfQty;
          const posUpdateObj: any = {
            quantity: remainQty,
            partial_close_at_1r: true,
            partial_close_price: currentPrice,
            stop_loss: entryPrice,  // Move SL to breakeven!
            notes: (pos.notes ?? "") + ` | +1R partial: ${halfQty}@${currentPrice}`,
            updated_at: new Date().toISOString(),
          };
          // V8.3: Update CFD fields for reduced position
          if (pos.margin_required && Number(pos.margin_required) > 0) {
            const origQty = Number(pos.quantity);
            posUpdateObj.margin_required = Math.round(Number(pos.margin_required) * (remainQty / origQty) * 100) / 100;
            posUpdateObj.notional_value = Math.round(remainQty * entryPrice * 100) / 100;
          }
          await supabase.from("demo_positions").update(posUpdateObj).eq("id", pos.id);

          // Log partial close transaction
          const { data: account } = await supabase.from("demo_accounts").select("*").eq("id", accountId).single();
          if (account) {
            const pcLeverage = getAccountLeverage(account);
            const halfMargin = calcMarginRequired(halfQty, entryPrice, pcLeverage);
            const newBalance = account.current_balance + partialPnl;
            await supabase.from("demo_accounts").update({
              current_balance: Math.round(newBalance * 100) / 100,
              reserved_balance: Math.max(0, (account.reserved_balance ?? 0) - halfQty * entryPrice),
              margin_used: Math.max(0, Number(account.margin_used ?? 0) - halfMargin), // V8.3
              updated_at: new Date().toISOString(),
            }).eq("id", accountId);

            await supabase.from("demo_transactions").insert({
              account_id: accountId, position_id: pos.id,
              transaction_type: "PARTIAL_CLOSE",
              symbol: pos.symbol, quantity: halfQty, price: currentPrice,
              amount: Math.round(partialPnl * 100) / 100,
              balance_after: Math.round(newBalance * 100) / 100,
              notes: `+1R Partial Close: ${halfQty}x ${pos.symbol} @ $${currentPrice}`,
            });
          }

          results.push({ symbol: pos.symbol, action: "PARTIAL_CLOSE_1R", quantity_closed: halfQty, price: currentPrice });
          continue;
        }
      }
    }

    // V6.0: Check Premium Signal Exit (counter-signal = close immediately)
    const { data: counterPremium } = await supabase
      .from("premium_signals")
      .select("signal_type, direction")
      .eq("symbol", pos.symbol)
      .eq("is_active", true)
      .eq("is_premium", true)
      .neq("direction", pos.position_type)  // Counter-direction
      .limit(1);

    if (counterPremium?.length > 0) {
      const result = await closePosition(supabase, pos, currentPrice, "PREMIUM_COUNTER_SIGNAL");
      results.push({ symbol: pos.symbol, action: "PREMIUM_EXIT", signal: counterPremium[0].signal_type, ...result });
      continue;
    }

    // TP1 and TP2 tracking (informational)
    let tpStatus = "HOLDING";
    if (pos.take_profit_2) {
      const tp2 = Number(pos.take_profit_2);
      if ((isLong && currentPrice >= tp2) || (!isLong && currentPrice <= tp2)) {
        tpStatus = "PAST_TP2";
      }
    }
    if (pos.take_profit_1) {
      const tp1 = Number(pos.take_profit_1);
      if ((isLong && currentPrice >= tp1) || (!isLong && currentPrice <= tp1)) {
        if (tpStatus === "HOLDING") tpStatus = "PAST_TP1";
      }
    }

    // Calculate unrealized P&L
    const pnl = isLong
      ? (currentPrice - entryPrice) * Number(pos.quantity)
      : (entryPrice - currentPrice) * Number(pos.quantity);
    const pnlPercent = ((isLong ? currentPrice - entryPrice : entryPrice - currentPrice) / entryPrice) * 100;

    // V8.3: Overnight fees for CFD positions (once per day)
    const today = new Date().toISOString().slice(0, 10);
    if (pos.is_cfd && pos.last_overnight_fee_date !== today) {
      const currentNotional = Number(pos.quantity) * currentPrice;
      const overnightFee = calcOvernightFee(currentNotional, pos.position_type, pos.symbol, new Date());
      const roundedFee = Math.round(overnightFee * 100) / 100;

      if (roundedFee > 0) {
        // Deduct from account balance
        const { data: feeAccount } = await supabase
          .from("demo_accounts").select("current_balance").eq("id", accountId).single();
        if (feeAccount) {
          const newBal = feeAccount.current_balance - roundedFee;
          await supabase.from("demo_accounts").update({
            current_balance: Math.round(newBal * 100) / 100,
            updated_at: new Date().toISOString(),
          }).eq("id", accountId);
        }

        // Accumulate on position + mark date
        const currentOvernightTotal = Number(pos.overnight_fees_total ?? 0);
        await supabase.from("demo_positions").update({
          overnight_fees_total: Math.round((currentOvernightTotal + roundedFee) * 100) / 100,
          last_overnight_fee_date: today,
          updated_at: new Date().toISOString(),
        }).eq("id", pos.id);

        // Log overnight fee
        await supabase.from("system_logs").insert({
          source: "trade_engine", action: "overnight_fee", level: "info",
          symbol: pos.symbol, account_id: accountId,
          message: `Overnight: ${pos.symbol} ${pos.position_type} notional=${currentNotional.toFixed(0)} fee=${roundedFee.toFixed(2)}`,
          details: { notional: currentNotional, fee: roundedFee, direction: pos.position_type, day: today }
        }).then(() => {}).catch(() => {});
      }
    }

    results.push({
      symbol: pos.symbol,
      action: "HOLD",
      tp_status: tpStatus,
      pnl: Math.round(pnl * 100) / 100,
      pnl_percent: Math.round(pnlPercent * 100) / 100,
    });
  }

  return jsonResponse({ message: `Checked ${positions.length} positions`, results });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UPDATE_TRAILING — Recalculate trailing stops for all open positions
// Called daily after new prices + analysis
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleUpdateTrailing(supabase: any, body: any) {
  const accountId = body.account_id ?? 1;
  const results: any[] = [];

  // Load dynamic strategy parameters for trailing stop default
  const strategyParams = await loadStrategyConfig(supabase);

  const { data: positions } = await supabase
    .from("demo_positions")
    .select("*")
    .eq("account_id", accountId)
    .eq("position_status", "OPEN");

  if (!positions?.length) {
    return jsonResponse({ message: "No open positions to update", results: [] });
  }

  for (const pos of positions) {
    const currentPrice = Number(pos.current_price ?? pos.entry_price);
    const entryPrice = Number(pos.entry_price);
    const isLong = pos.position_type === "LONG";
    const trailingPct = Number(pos.trailing_stop_percent ?? strategyParams.trailing_stop_default);

    // Check if we should look for a new trailing_stop_percent from latest AI decision
    const { data: latestDecision } = await supabase
      .from("trading_decisions")
      .select("trailing_stop_percent")
      .eq("symbol", pos.symbol)
      .order("decision_timestamp", { ascending: false })
      .limit(1)
      .single();

    const newTrailingPct = latestDecision?.trailing_stop_percent
      ? Number(latestDecision.trailing_stop_percent)
      : trailingPct;

    // Update peak price tracking
    let newHighest = Number(pos.trailing_stop_highest ?? entryPrice);
    let newLowest = Number(pos.trailing_stop_lowest ?? entryPrice);

    if (isLong) {
      newHighest = Math.max(newHighest, currentPrice);
    } else {
      newLowest = Math.min(newLowest, currentPrice);
    }

    // Check if trailing stop should be activated
    // Activate when price moves 1% in favorable direction past entry
    let activated = pos.trailing_stop_activated ?? false;
    if (!activated) {
      if (isLong && currentPrice > entryPrice * 1.01) {
        activated = true;
      } else if (!isLong && currentPrice < entryPrice * 0.99) {
        activated = true;
      }
    }

    // Calculate trailing stop price — V6.0: Support Senkou Span B mode
    let trailingStopPrice: number | null = null;
    const trailingType = pos.trailing_stop_type ?? "PERCENT";
    let senkouValue: number | null = null;

    if (activated) {
      if (trailingType === "SENKOU_SPAN_B") {
        // V6.0: Use Ichimoku Senkou Span B as trailing stop
        const today = new Date().toISOString().slice(0, 10);
        const { data: ichiData } = await supabase
          .from("technical_indicators")
          .select("value_4")  // Senkou Span B
          .eq("symbol", pos.symbol)
          .eq("indicator_name", "ICHIMOKU")
          .order("date", { ascending: false })
          .limit(1)
          .single();

        if (ichiData?.value_4) {
          senkouValue = Number(ichiData.value_4);
          if (isLong) {
            // LONG: trailing = MAX(current trailing, Senkou Span B)
            trailingStopPrice = Math.max(
              Number(pos.trailing_stop_price ?? 0),
              senkouValue
            );
            // Never below original stop loss
            if (pos.stop_loss && trailingStopPrice < Number(pos.stop_loss)) {
              trailingStopPrice = Number(pos.stop_loss);
            }
          } else {
            // SHORT: trailing = MIN(current trailing, Senkou Span B)
            const currentTrail = pos.trailing_stop_price ? Number(pos.trailing_stop_price) : Infinity;
            trailingStopPrice = Math.min(currentTrail, senkouValue);
            if (pos.stop_loss && trailingStopPrice > Number(pos.stop_loss)) {
              trailingStopPrice = Number(pos.stop_loss);
            }
          }
        } else {
          // Fallback to percent-based if no Ichimoku data
          if (isLong) {
            trailingStopPrice = Math.round(newHighest * (1 - newTrailingPct / 100) * 100) / 100;
          } else {
            trailingStopPrice = Math.round(newLowest * (1 + newTrailingPct / 100) * 100) / 100;
          }
        }
      } else {
        // Standard percent-based trailing
        if (isLong) {
          trailingStopPrice = Math.round(newHighest * (1 - newTrailingPct / 100) * 100) / 100;
          if (pos.stop_loss && trailingStopPrice < Number(pos.stop_loss)) {
            trailingStopPrice = Number(pos.stop_loss);
          }
        } else {
          trailingStopPrice = Math.round(newLowest * (1 + newTrailingPct / 100) * 100) / 100;
          if (pos.stop_loss && trailingStopPrice > Number(pos.stop_loss)) {
            trailingStopPrice = Number(pos.stop_loss);
          }
        }
      }

      // V6.0: Check for gray premium signal → trail under candle low/high
      const { data: graySignal } = await supabase
        .from("premium_signals")
        .select("signal_type")
        .eq("symbol", pos.symbol)
        .eq("is_active", true)
        .eq("signal_type", "GRAY")
        .limit(1);

      if (graySignal?.length > 0) {
        // Gray signal → tighten trailing to under last candle low (LONG) or above high (SHORT)
        const { data: lastCandle } = await supabase
          .from("stock_prices")
          .select("low, high")
          .eq("symbol", pos.symbol)
          .order("date", { ascending: false })
          .limit(1)
          .single();

        if (lastCandle) {
          const grayTrail = isLong ? Number(lastCandle.low) : Number(lastCandle.high);
          if (trailingStopPrice !== null) {
            trailingStopPrice = isLong
              ? Math.max(trailingStopPrice, grayTrail)
              : Math.min(trailingStopPrice, grayTrail);
          } else {
            trailingStopPrice = grayTrail;
          }
        }
      }
    }

    // V8.4: Guard — trailing stop darf NIEMALS rückwärts gehen (nur enger, nie weiter)
    // Schützt vor Rückwärtsbewegung bei trailing_stop_percent Änderung durch AI
    if (trailingStopPrice !== null && pos.trailing_stop_price) {
      const oldTrailing = Number(pos.trailing_stop_price);
      if (isLong) {
        // LONG: Trailing Stop darf nur steigen (Gewinne sichern)
        trailingStopPrice = Math.max(trailingStopPrice, oldTrailing);
      } else {
        // SHORT: Trailing Stop darf nur sinken (Gewinne sichern)
        trailingStopPrice = Math.min(trailingStopPrice, oldTrailing);
      }
    }

    // V8.2: Log trailing stop changes to position_changes_log + system_logs
    const oldTrailingPrice = Number(pos.trailing_stop_price ?? 0);
    const posChanges: any[] = [];
    if (trailingStopPrice && Math.abs(trailingStopPrice - oldTrailingPrice) > 0.001) {
      posChanges.push({
        position_id: pos.id, change_type: "trailing_stop_price",
        old_value: oldTrailingPrice || null, new_value: trailingStopPrice,
        change_reason: trailingType === "SENKOU_SPAN_B" ? "senkou_span_b" : "trailing_update"
      });
    }
    if (activated && !pos.trailing_stop_activated) {
      posChanges.push({
        position_id: pos.id, change_type: "trailing_stop_activated",
        old_value: 0, new_value: 1, change_reason: "price_threshold"
      });
    }
    if (posChanges.length > 0) {
      await supabase.from("position_changes_log").insert(posChanges).then(() => {}).catch(() => {});
      await supabase.from("system_logs").insert({
        source: "trade_engine", action: "trailing_stops", level: "info",
        symbol: pos.symbol, account_id: pos.account_id,
        message: `TrailingStop: $${oldTrailingPrice.toFixed(2)} → $${(trailingStopPrice ?? 0).toFixed(2)} (${pos.symbol})`,
        details: { old_trailing: oldTrailingPrice, new_trailing: trailingStopPrice,
                   highest: newHighest, lowest: newLowest, activated, type: trailingType }
      }).then(() => {}).catch(() => {});
    }

    // Update position
    const { error } = await supabase
      .from("demo_positions")
      .update({
        trailing_stop_percent: newTrailingPct,
        trailing_stop_price: trailingStopPrice,
        trailing_stop_activated: activated,
        trailing_stop_highest: isLong ? newHighest : pos.trailing_stop_highest,
        trailing_stop_lowest: !isLong ? newLowest : pos.trailing_stop_lowest,
        trailing_stop_senkou: senkouValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pos.id);

    results.push({
      symbol: pos.symbol,
      trailing_pct: newTrailingPct,
      trailing_price: trailingStopPrice,
      activated,
      highest: newHighest,
      lowest: newLowest,
      error: error?.message ?? null,
    });
  }

  return jsonResponse({ message: `Updated trailing stops for ${positions.length} positions`, results });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UPDATE_PRICES — Update current_price for all open positions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleUpdatePrices(supabase: any) {
  const { data: positions } = await supabase
    .from("demo_positions")
    .select("id, symbol")
    .eq("position_status", "OPEN");

  if (!positions?.length) {
    return jsonResponse({ message: "No open positions", updated: 0 });
  }

  const symbols = [...new Set(positions.map((p: any) => p.symbol))];

  // Get latest prices for all symbols
  const pricePromises = symbols.map((sym: string) =>
    supabase
      .from("stock_prices")
      .select("symbol, close")
      .eq("symbol", sym)
      .order("date", { ascending: false })
      .limit(1)
      .single()
  );

  const priceResults = await Promise.all(pricePromises);
  const latestPrices: Record<string, number> = {};
  for (const res of priceResults) {
    if (res.data) {
      latestPrices[res.data.symbol] = Number(res.data.close);
    }
  }

  // Update each position
  let updated = 0;
  for (const pos of positions) {
    const price = latestPrices[pos.symbol];
    if (price) {
      await supabase
        .from("demo_positions")
        .update({ current_price: price, updated_at: new Date().toISOString() })
        .eq("id", pos.id);
      updated++;
    }
  }

  return jsonResponse({ message: `Updated prices for ${updated} positions`, updated });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESET — Reset demo account to $100k
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleReset(supabase: any, body: any) {
  const accountId = body.account_id ?? 1;

  // Close all open positions at current price
  const { data: openPositions } = await supabase
    .from("demo_positions")
    .select("*")
    .eq("account_id", accountId)
    .in("position_status", ["OPEN", "PENDING"]);

  for (const pos of openPositions ?? []) {
    if (pos.position_status === "OPEN") {
      await closePosition(supabase, pos, Number(pos.current_price ?? pos.entry_price), "RESET");
    } else {
      await supabase.from("demo_positions").update({ position_status: "CANCELLED" }).eq("id", pos.id);
    }
  }

  // V8.3: Get initial_balance for this specific account (not hardcoded!)
  const { data: accountInfo } = await supabase
    .from("demo_accounts").select("initial_balance, account_currency").eq("id", accountId).single();
  const resetBalance = Number(accountInfo?.initial_balance ?? 100000);
  const currency = accountInfo?.account_currency ?? 'USD';
  const currSymbol = currency === 'EUR' ? '€' : '$';

  // Reset account
  await supabase
    .from("demo_accounts")
    .update({
      current_balance: resetBalance,
      reserved_balance: 0,
      margin_used: 0,
      total_pnl: 0,
      total_pnl_percent: 0,
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      max_drawdown_percent: 0,
      peak_balance: resetBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId);

  // Log reset transaction
  await supabase.from("demo_transactions").insert({
    account_id: accountId,
    transaction_type: "RESET",
    symbol: null,
    quantity: 0,
    price: 0,
    amount: resetBalance,
    balance_after: resetBalance,
    notes: `Account reset to ${currSymbol}${resetBalance.toLocaleString()}`,
  });

  return jsonResponse({ message: `Account reset to ${currSymbol}${resetBalance.toLocaleString()}`, account_id: accountId });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━ V8.3: CFD / Leverage Helpers ━━━
function getAccountLeverage(account: any): number {
  const leverage = Number(account.leverage_ratio ?? 1);
  if (leverage <= 0 || !isFinite(leverage)) return 1;
  return leverage;
}

function isCFDAccount(account: any): boolean {
  return getAccountLeverage(account) > 1;
}

function calcMarginRequired(quantity: number, entryPrice: number, leverage: number): number {
  return (quantity * entryPrice) / leverage;
}

function calcOvernightFee(
  currentNotional: number, direction: string, symbol: string, date: Date
): number {
  // Reference rates: SOFR ~4.5% (US), ESTR ~2.9% (EUR/.DE)
  const refRate = symbol.endsWith('.DE') ? 0.029 : 0.045;
  const brokerSpread = 0.025; // 2.5% IG Markets typical spread
  let dailyRate: number;
  if (direction === 'LONG') {
    dailyRate = (refRate + brokerSpread) / 365;
  } else {
    // SHORT: credit if refRate > spread, else 0
    dailyRate = Math.max(0, refRate - brokerSpread) / 365;
  }
  // Wednesday = 3x (T+2 settlement, covers weekend)
  const dayOfWeek = date.getUTCDay(); // 0=Sun, 3=Wed
  const multiplier = dayOfWeek === 3 ? 3 : 1;
  return currentNotional * dailyRate * multiplier;
}

async function openPosition(supabase: any, accountId: number, account: any, params: any) {
  const {
    symbol, decision_id, direction, quantity, entry_price,
    stop_loss, stop_loss_soft, stop_loss_hard,
    take_profit_1, take_profit_2, take_profit_3,
    trailing_stop_percent, trigger_source, notes,
    entry_type, setup_name, trade_style, trailing_stop_type,
  } = params;

  if (!symbol || !direction || !quantity || !entry_price) {
    throw new Error("symbol, direction, quantity, entry_price required");
  }

  // V8.3: Leverage-aware margin check
  const leverage = getAccountLeverage(account);
  const notionalValue = quantity * entry_price;
  const marginRequired = calcMarginRequired(quantity, entry_price, leverage);
  const isCfd = isCFDAccount(account);
  const currentMarginUsed = Number(account.margin_used ?? 0);
  const availableMargin = account.current_balance - currentMarginUsed;

  if (marginRequired > availableMargin) {
    return { status: "ERROR", reason: "Insufficient margin", required_margin: Math.round(marginRequired * 100) / 100, available: Math.round(availableMargin * 100) / 100, notional: Math.round(notionalValue * 100) / 100 };
  }

  const isLong = direction === "LONG";

  // Create position with V6.0 columns
  const { data: position, error: posError } = await supabase
    .from("demo_positions")
    .insert({
      account_id: accountId,
      symbol,
      decision_id: decision_id ?? null,
      position_type: direction,
      position_status: "OPEN",
      quantity,
      entry_price,
      current_price: entry_price,
      stop_loss: stop_loss_soft || stop_loss,
      stop_loss_soft: stop_loss_soft || stop_loss || null,
      stop_loss_hard: stop_loss_hard || null,
      take_profit_1,
      take_profit_2,
      take_profit_3,
      trailing_stop_percent: trailing_stop_percent ?? 3.0,
      trailing_stop_price: null,
      trailing_stop_activated: false,
      trailing_stop_highest: isLong ? entry_price : null,
      trailing_stop_lowest: !isLong ? entry_price : null,
      trigger_source: trigger_source ?? "MANUAL",
      notes,
      opened_at: new Date().toISOString(),
      // V6.0 new columns
      entry_type: entry_type || "MARKET",
      setup_name: setup_name || null,
      trade_style: trade_style || "CTT",
      trailing_stop_type: trailing_stop_type || "PERCENT",
      // V8.3: CFD fields
      margin_required: Math.round(marginRequired * 100) / 100,
      notional_value: Math.round(notionalValue * 100) / 100,
      is_cfd: isCfd,
    })
    .select("id")
    .single();

  if (posError) {
    return { status: "ERROR", reason: posError.message };
  }

  // V8.3: Reserve balance + margin tracking
  await supabase
    .from("demo_accounts")
    .update({
      reserved_balance: (account.reserved_balance ?? 0) + notionalValue,
      margin_used: currentMarginUsed + marginRequired,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId);

  // Log transaction
  const txType = isLong ? "BUY" : "SHORT_OPEN";
  await supabase.from("demo_transactions").insert({
    account_id: accountId,
    position_id: position.id,
    transaction_type: txType,
    symbol,
    quantity,
    price: entry_price,
    amount: -notionalValue,
    balance_after: account.current_balance,
    notes: `${txType} ${quantity}x ${symbol} @ $${entry_price}${isCfd ? ` (margin: ${marginRequired.toFixed(2)})` : ''}`,
  });

  return {
    status: "OPENED",
    position_id: position.id,
    symbol,
    direction,
    quantity,
    entry_price,
    cost: notionalValue,
    margin_required: Math.round(marginRequired * 100) / 100,
  };
}

async function closePosition(supabase: any, position: any, exitPrice: number, closeReason: string) {
  const isLong = position.position_type === "LONG";
  const quantity = Number(position.quantity);
  const entryPrice = Number(position.entry_price);

  // Calculate P&L (always on full notional value)
  const pnlAmount = isLong
    ? (exitPrice - entryPrice) * quantity
    : (entryPrice - exitPrice) * quantity;

  // V8.3: P&L% on margin for CFD (reflects actual return on capital deployed)
  // For leverage=1: margin_required = notional, so result is identical to before
  const marginReq = Number(position.margin_required ?? 0);
  const pnlPercent = (marginReq > 0)
    ? (pnlAmount / marginReq) * 100
    : ((isLong ? exitPrice - entryPrice : entryPrice - exitPrice) / entryPrice) * 100;

  // Determine status
  let status = "CLOSED";
  if (closeReason === "STOP_LOSS") status = "STOPPED_OUT";
  else if (closeReason === "TRAILING_STOP") status = "STOPPED_OUT";
  else if (closeReason.startsWith("TAKE_PROFIT")) status = "TP_HIT";
  else if (closeReason === "RESET") status = "CLOSED";

  const holdingDays = Math.max(1, Math.round(
    (new Date().getTime() - new Date(position.opened_at).getTime()) / (1000 * 60 * 60 * 24)
  ));

  // Update position
  await supabase
    .from("demo_positions")
    .update({
      position_status: status,
      exit_price: exitPrice,
      pnl_amount: Math.round(pnlAmount * 100) / 100,
      pnl_percent: Math.round(pnlPercent * 100) / 100,
      closed_at: new Date().toISOString(),
      holding_days: holdingDays,
      notes: (position.notes ?? "") + ` | Closed: ${closeReason}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", position.id);

  // Update account
  const { data: account } = await supabase
    .from("demo_accounts")
    .select("*")
    .eq("id", position.account_id)
    .single();

  if (account) {
    const tradeCost = quantity * entryPrice;
    const tradeMargin = Number(position.margin_required ?? tradeCost); // V8.3: use margin, fallback to cost
    const newBalance = account.current_balance + pnlAmount;
    const newReserved = Math.max(0, (account.reserved_balance ?? 0) - tradeCost);
    const newMarginUsed = Math.max(0, Number(account.margin_used ?? 0) - tradeMargin); // V8.3
    const totalPnl = (account.total_pnl ?? 0) + pnlAmount;
    const initialBalance = Number(account.initial_balance ?? 100000); // V8.3: dynamic, not hardcoded
    const totalTrades = (account.total_trades ?? 0) + 1;
    const winningTrades = (account.winning_trades ?? 0) + (pnlAmount > 0 ? 1 : 0);
    const losingTrades = (account.losing_trades ?? 0) + (pnlAmount <= 0 ? 1 : 0);
    const peakBalance = Math.max(account.peak_balance ?? initialBalance, newBalance);
    const drawdown = peakBalance > 0
      ? Math.round(((peakBalance - Math.min(newBalance, peakBalance)) / peakBalance) * 10000) / 100
      : 0;
    const maxDrawdown = Math.max(account.max_drawdown_percent ?? 0, drawdown);

    await supabase
      .from("demo_accounts")
      .update({
        current_balance: Math.round(newBalance * 100) / 100,
        reserved_balance: Math.round(newReserved * 100) / 100,
        margin_used: Math.round(newMarginUsed * 100) / 100, // V8.3
        total_pnl: Math.round(totalPnl * 100) / 100,
        total_pnl_percent: Math.round((totalPnl / initialBalance) * 10000) / 100, // V8.3: dynamic initial_balance
        total_trades: totalTrades,
        winning_trades: winningTrades,
        losing_trades: losingTrades,
        peak_balance: Math.round(peakBalance * 100) / 100,
        max_drawdown_percent: maxDrawdown,
        updated_at: new Date().toISOString(),
      })
      .eq("id", position.account_id);

    // Log close transaction
    const txType = isLong ? "SELL" : "SHORT_CLOSE";
    await supabase.from("demo_transactions").insert({
      account_id: position.account_id,
      position_id: position.id,
      transaction_type: closeReason.startsWith("TAKE_PROFIT") ? "TAKE_PROFIT"
        : closeReason === "STOP_LOSS" ? "STOP_LOSS"
        : closeReason === "TRAILING_STOP" ? "STOP_LOSS"
        : txType,
      symbol: position.symbol,
      quantity,
      price: exitPrice,
      amount: Math.round(pnlAmount * 100) / 100,
      balance_after: Math.round(newBalance * 100) / 100,
      notes: `${txType} ${quantity}x ${position.symbol} @ $${exitPrice} | P&L: $${Math.round(pnlAmount * 100) / 100} (${Math.round(pnlPercent * 100) / 100}%) | ${closeReason}`,
    });
  }

  // V6.0: Track signal performance for self-improvement
  if (position.setup_name || position.trigger_source === "AUTO_SIGNAL") {
    const slDistance = position.stop_loss ? Math.abs(Number(position.entry_price) - Number(position.stop_loss)) : 0;
    const pnlR = slDistance > 0 ? pnlAmount / (slDistance * quantity) : null;

    // Get lochstreifen snapshot at entry time
    const { data: entryLochstreifen } = await supabase
      .from("lochstreifen_state")
      .select("status, candle_color, cloud_color, trend, setter, wave, metadata")
      .eq("symbol", position.symbol)
      .eq("date", position.opened_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
      .single();

    await supabase.from("signal_performance_tracking").insert({
      position_id: position.id,
      symbol: position.symbol,
      signal_type: position.setup_name || position.trigger_source || "UNKNOWN",
      direction: position.position_type,
      entry_date: position.opened_at?.slice(0, 10),
      exit_date: new Date().toISOString().slice(0, 10),
      entry_price: Number(position.entry_price),
      exit_price: exitPrice,
      pnl_percent: Math.round(pnlPercent * 100) / 100,
      pnl_r: pnlR ? Math.round(pnlR * 100) / 100 : null,
      holding_days: holdingDays,
      market_regime: entryLochstreifen?.metadata?.market_regime ?? null,
      lochstreifen_snapshot: entryLochstreifen ? {
        status: entryLochstreifen.status,
        candle: entryLochstreifen.candle_color,
        cloud: entryLochstreifen.cloud_color,
        trend: entryLochstreifen.trend,
        setter: entryLochstreifen.setter,
        wave: entryLochstreifen.wave,
      } : null,
      was_profitable: pnlAmount > 0,
    }).then(({ error }) => {
      if (error) console.error("signal_performance_tracking insert error:", error);
    });
  }

  return {
    status,
    symbol: position.symbol,
    exit_price: exitPrice,
    pnl_amount: Math.round(pnlAmount * 100) / 100,
    pnl_percent: Math.round(pnlPercent * 100) / 100,
    close_reason: closeReason,
    holding_days: holdingDays,
  };
}

async function checkTradingRules(
  supabase: any,
  accountId: number,
  account: any,
  decision: any,
  strategyParams?: StrategyParams
) {
  const { data: rules } = await supabase
    .from("trading_rules")
    .select("*")
    .eq("account_id", accountId)
    .eq("is_active", true);

  // Use strategy_config defaults if available, otherwise hardcoded fallbacks
  const defaultMaxPositionSize = strategyParams?.max_position_size ?? 20000;
  const defaultMaxOpenPositions = strategyParams?.max_open_positions ?? 5;
  const defaultMaxRiskPct = strategyParams?.risk_per_trade_percent ?? 2.0;
  const defaultMinConfidence = strategyParams?.min_confidence_threshold ?? 55;

  const results: any[] = [];
  let allPassed = true;

  for (const rule of rules ?? []) {
    let passed = true;
    let reason = "";
    const ruleValue = rule.rule_value;

    switch (rule.rule_type) {
      case "MAX_POSITION_SIZE": {
        const maxSize = Number(ruleValue?.max_value ?? ruleValue?.max_amount ?? defaultMaxPositionSize);
        // Estimate position size using risk-based quantity
        const entry = Number(decision.entry_price);
        const sl = Number(decision.stop_loss);
        const riskAmt = account.current_balance * ((strategyParams?.risk_per_trade_percent ?? 1) / 100);
        const priceDiff = Math.abs(entry - sl);
        let estQty = priceDiff > 0 ? Math.floor(riskAmt / priceDiff) : 1;
        estQty = Math.max(1, estQty);
        const posSize = estQty * entry;
        passed = posSize <= maxSize;
        reason = `Position $${posSize.toFixed(0)} (${estQty}x$${entry.toFixed(2)}) vs max $${maxSize}`;
        break;
      }
      case "MAX_OPEN_POSITIONS": {
        const maxOpen = Number(ruleValue?.max_count ?? defaultMaxOpenPositions);
        const { count } = await supabase
          .from("demo_positions")
          .select("*", { count: "exact", head: true })
          .eq("account_id", accountId)
          .eq("position_status", "OPEN");
        passed = (count ?? 0) < maxOpen;
        reason = `Open: ${count} vs max ${maxOpen}`;
        break;
      }
      case "MAX_RISK_PER_TRADE": {
        const maxRiskPct = Number(ruleValue?.max_percent ?? defaultMaxRiskPct);
        const entry = Number(decision.entry_price);
        const sl = Number(decision.stop_loss);
        if (entry && sl) {
          const riskPct = Math.abs((entry - sl) / entry) * 100;
          passed = riskPct <= maxRiskPct;
          reason = `Risk ${riskPct.toFixed(1)}% vs max ${maxRiskPct}%`;
        }
        break;
      }
      case "MIN_SIGNAL_GRADE": {
        // Grade mapping: B=60, B+=70, A-=75, A=80, A+=90
        const gradeMap: Record<string, number> = { "C": 40, "C+": 50, "B": 60, "B+": 70, "A-": 75, "A": 80, "A+": 90 };
        const minGrade = ruleValue?.min_grade ?? "B+";
        const minScore = gradeMap[minGrade] ?? 70;
        const conf = Number(decision.confidence_score ?? 0);
        passed = conf >= minScore;
        reason = `Confidence ${conf} vs min ${minScore} (Grade ${minGrade})`;
        break;
      }
      case "MIN_CONFIDENCE": {
        const minConf = Number(ruleValue?.min_value ?? ruleValue?.min_percent ?? defaultMinConfidence);
        const conf = Number(decision.confidence_score ?? 0);
        passed = conf >= minConf;
        reason = `Confidence ${conf}% vs min ${minConf}%`;
        break;
      }
      case "DAILY_LOSS_LIMIT": {
        const maxLossPct = Number(ruleValue?.max_percent ?? 5);
        // Sum of unrealized + realized PnL today
        const today = new Date().toISOString().slice(0, 10);
        const { data: todayTrades } = await supabase
          .from("demo_positions")
          .select("pnl_amount")
          .eq("account_id", accountId)
          .eq("position_status", "CLOSED")
          .gte("closed_at", today + "T00:00:00");
        const realizedPnl = (todayTrades ?? []).reduce((s: number, t: any) => s + Number(t.pnl_amount ?? 0), 0);
        const dailyLossPct = Math.abs(Math.min(0, realizedPnl)) / account.current_balance * 100;
        passed = dailyLossPct < maxLossPct;
        reason = `Daily loss ${dailyLossPct.toFixed(1)}% vs max ${maxLossPct}%`;
        break;
      }
      case "MAX_TOTAL_EXPOSURE": {
        const maxMultiple = Number(ruleValue?.max_multiple ?? 15);
        const { data: openPos } = await supabase
          .from("demo_positions")
          .select("quantity, entry_price, notional_value")
          .eq("account_id", accountId)
          .eq("position_status", "OPEN");
        const totalExposure = (openPos ?? []).reduce((s: number, p: any) => {
          const notional = Number(p.notional_value) || (Number(p.quantity) * Number(p.entry_price));
          return s + notional;
        }, 0);
        const exposureMultiple = totalExposure / account.current_balance;
        passed = exposureMultiple < maxMultiple;
        reason = `Exposure ${exposureMultiple.toFixed(1)}x vs max ${maxMultiple}x`;
        break;
      }
      case "MAX_MARGIN_UTILIZATION": {
        const maxMarginPct = Number(ruleValue?.max_percent ?? 80);
        const { data: openPos } = await supabase
          .from("demo_positions")
          .select("margin_required")
          .eq("account_id", accountId)
          .eq("position_status", "OPEN");
        const totalMargin = (openPos ?? []).reduce((s: number, p: any) => s + Number(p.margin_required ?? 0), 0);
        const marginPct = (totalMargin / account.current_balance) * 100;
        passed = marginPct < maxMarginPct;
        reason = `Margin ${marginPct.toFixed(1)}% vs max ${maxMarginPct}%`;
        break;
      }
      case "CANDLE_CONFIRMATION": {
        // Blockiert Entry bei starkem Umkehr-Candlestick-Pattern entgegen Trade-Richtung
        const today = new Date().toISOString().slice(0, 10);
        const { data: candle } = await supabase
          .from("technical_indicators")
          .select("value_1, value_2, value_3, value_4")
          .eq("symbol", decision.symbol)
          .eq("indicator_name", "CANDLE_SUMMARY")
          .eq("date", today)
          .single();

        if (candle && Number(candle.value_4) > 0) {
          const patternDir = Number(candle.value_2);  // 1=bull, -1=bear, 0=neutral
          const strength = Number(candle.value_3);     // 1-3
          const patternNames: Record<number, string> = {
            1:'HAMMER',2:'INV_HAMMER',3:'SHOOTING_STAR',4:'HANGING_MAN',5:'DOJI',6:'SPINNING_TOP',
            7:'MARUBOZU',8:'BULL_ENGULFING',9:'BEAR_ENGULFING',10:'PIERCING',11:'DARK_CLOUD',
            12:'HARAMI',13:'MORNING_STAR',14:'EVENING_STAR',15:'THREE_SOLDIERS',16:'THREE_CROWS'
          };
          const patternName = patternNames[Number(candle.value_1)] ?? 'UNKNOWN';

          // Block: Starkes Umkehr-Pattern (Stärke >= 2) entgegen Trade-Richtung
          const isContra = (decision.action_type === "LONG" && patternDir === -1)
                        || (decision.action_type === "SHORT" && patternDir === 1);
          const minStrength = Number(ruleValue?.min_strength ?? 2);
          passed = !(isContra && strength >= minStrength);
          reason = passed
            ? `Candlestick ${patternName} (dir=${patternDir}, str=${strength}) bestätigt Entry`
            : `Kontra-Pattern ${patternName} (dir=${patternDir}, str=${strength}) blockiert ${decision.action_type} Entry`;
        } else {
          passed = true;
          reason = "Kein Candlestick-Pattern erkannt — Entry erlaubt";
        }
        break;
      }
      default:
        reason = `Unknown rule type: ${rule.rule_type}`;
    }

    if (!passed) allPassed = false;
    results.push({ rule: rule.rule_type, passed, reason });
  }

  return { allPassed, results };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHECK_PENDING — Activate STOP_BUY/STOP_SELL orders when trigger is hit
// Called daily after prices are updated
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleCheckPending(supabase: any, body: any) {
  const accountId = body.account_id ?? 1;
  const results: any[] = [];

  // Get all PENDING positions with pending_entry_price
  const { data: pendingPositions } = await supabase
    .from("demo_positions")
    .select("*")
    .eq("account_id", accountId)
    .eq("position_status", "PENDING")
    .not("pending_entry_price", "is", null);

  if (!pendingPositions?.length) {
    return jsonResponse({ message: "No pending orders", results: [] });
  }

  const { data: account } = await supabase
    .from("demo_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  for (const pos of pendingPositions) {
    const currentPrice = Number(pos.current_price ?? pos.entry_price);
    const triggerPrice = Number(pos.pending_entry_price);
    const isLong = pos.position_type === "LONG";
    const entryType = pos.entry_type ?? "MARKET";

    // Check expiry (5 days for pending orders)
    const daysSinceCreated = Math.round(
      (new Date().getTime() - new Date(pos.opened_at ?? pos.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreated > 5) {
      // Expire the pending order
      await supabase.from("demo_positions").update({
        position_status: "CANCELLED",
        notes: (pos.notes ?? "") + " | EXPIRED after 5 days",
        updated_at: new Date().toISOString(),
      }).eq("id", pos.id);
      results.push({ symbol: pos.symbol, action: "EXPIRED", days: daysSinceCreated });
      continue;
    }

    // Check if trigger price is hit
    let triggered = false;
    if (entryType === "STOP_BUY" && currentPrice >= triggerPrice) {
      triggered = true;  // Price went above stop-buy level
    } else if (entryType === "STOP_SELL" && currentPrice <= triggerPrice) {
      triggered = true;  // Price went below stop-sell level
    }

    if (triggered && account) {
      // V8.3: Calculate margin for triggered position
      const pendLeverage = getAccountLeverage(account);
      const pendCost = Number(pos.quantity) * triggerPrice;
      const pendMargin = calcMarginRequired(Number(pos.quantity), triggerPrice, pendLeverage);
      const pendIsCfd = isCFDAccount(account);

      // Activate the position: change status to OPEN, set entry at trigger price
      await supabase.from("demo_positions").update({
        position_status: "OPEN",
        entry_price: triggerPrice,
        current_price: currentPrice,
        opened_at: new Date().toISOString(),
        trailing_stop_highest: isLong ? triggerPrice : pos.trailing_stop_highest,
        trailing_stop_lowest: !isLong ? triggerPrice : pos.trailing_stop_lowest,
        // V8.3: CFD fields
        margin_required: Math.round(pendMargin * 100) / 100,
        notional_value: Math.round(pendCost * 100) / 100,
        is_cfd: pendIsCfd,
        notes: (pos.notes ?? "") + ` | Triggered: ${entryType} at ${triggerPrice}`,
        updated_at: new Date().toISOString(),
      }).eq("id", pos.id);

      // Reserve balance + margin
      await supabase.from("demo_accounts").update({
        reserved_balance: (account.reserved_balance ?? 0) + pendCost,
        margin_used: Number(account.margin_used ?? 0) + pendMargin, // V8.3
        updated_at: new Date().toISOString(),
      }).eq("id", accountId);

      // Log transaction
      await supabase.from("demo_transactions").insert({
        account_id: accountId,
        position_id: pos.id,
        transaction_type: isLong ? "BUY" : "SHORT_OPEN",
        symbol: pos.symbol,
        quantity: Number(pos.quantity),
        price: triggerPrice,
        amount: -pendCost,
        balance_after: account.current_balance,
        notes: `${entryType} triggered: ${Number(pos.quantity)}x ${pos.symbol} @ $${triggerPrice}${pendIsCfd ? ` (margin: ${pendMargin.toFixed(2)})` : ''}`,
      });

      results.push({ symbol: pos.symbol, action: "TRIGGERED", entry_type: entryType, price: triggerPrice });
    } else {
      results.push({ symbol: pos.symbol, action: "WAITING", trigger: triggerPrice, current: currentPrice, days: daysSinceCreated });
    }
  }

  return jsonResponse({ message: `Checked ${pendingPositions.length} pending orders`, results });
}

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
