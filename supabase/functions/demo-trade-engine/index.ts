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

  // 3. Get today's trading decisions (only LONG/SHORT, not CASH)
  const today = new Date().toISOString().slice(0, 10);
  const { data: decisions } = await supabase
    .from("trading_decisions")
    .select("*")
    .gte("decision_timestamp", today + "T00:00:00")
    .in("action_type", ["LONG", "SHORT"])
    .order("confidence_score", { ascending: false });

  if (!decisions?.length) {
    return jsonResponse({ message: "No actionable decisions today", results: [] });
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

    // Check trading rules (with dynamic strategy params)
    const ruleCheck = await checkTradingRules(supabase, accountId, account, decision, strategyParams);
    if (!ruleCheck.allPassed) {
      const failedRules = ruleCheck.results.filter((r: any) => !r.passed).map((r: any) => r.rule).join(", ");
      if (autoConfig.mode === "AUTO") {
        results.push({ symbol, status: "BLOCKED", reason: `Rules failed: ${failedRules}` });
      } else {
        results.push({ symbol, status: "BLOCKED", reason: `Rules failed: ${failedRules}` });
      }
      continue;
    }

    // Calculate position size (risk-based: dynamic % from strategy_config)
    const riskPercent = strategyParams.risk_per_trade_percent;
    const riskAmount = account.current_balance * (riskPercent / 100);
    const entryPrice = Number(decision.entry_price);
    const stopLoss = Number(decision.stop_loss);
    const priceDiff = Math.abs(entryPrice - stopLoss);

    let quantity = 1;
    if (priceDiff > 0) {
      quantity = Math.max(1, Math.floor(riskAmount / priceDiff));
    }

    // Cap at max position size (dynamic from strategy_config)
    const maxPositionSize = strategyParams.max_position_size;
    const positionValue = quantity * entryPrice;
    if (positionValue > maxPositionSize) {
      quantity = Math.floor(maxPositionSize / entryPrice);
    }

    // Also cap to available balance
    const availableBalance = account.current_balance - (account.reserved_balance ?? 0);
    if (quantity * entryPrice > availableBalance) {
      quantity = Math.floor(availableBalance / entryPrice);
    }

    if (quantity < 1) {
      results.push({ symbol, status: "SKIPPED", reason: "Insufficient balance" });
      continue;
    }

    // V6.0: Determine entry_type and setup info from AI strand analysis
    const { data: fusionAnalysis } = await supabase
      .from("ai_strand_analyses")
      .select("key_findings")
      .eq("symbol", symbol)
      .eq("analysis_date", today)
      .eq("strand_type", "fusion")
      .single();

    const fusionFindings = fusionAnalysis?.key_findings ?? {};
    const entryType = fusionFindings.entry_type || "MARKET";
    const setupName = fusionFindings.setup_name || null;
    const tradeStyle = fusionFindings.trade_style || "CTT";
    const trailingStopType = fusionFindings.trailing_stop_type || "PERCENT";

    // V6.0: If STOP_BUY/STOP_SELL, create PENDING position with trigger price
    const isPendingOrder = entryType === "STOP_BUY" || entryType === "STOP_SELL";

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

    if (autoConfig.mode === "CONFIRM" || isPendingOrder) {
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
    } else if (autoConfig.mode === "AUTO") {
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
        continue;
      }
    }

    // 2. Check Trailing Stop
    if (pos.trailing_stop_price && pos.trailing_stop_activated) {
      const trailingPrice = Number(pos.trailing_stop_price);
      if ((isLong && currentPrice <= trailingPrice) || (!isLong && currentPrice >= trailingPrice)) {
        const result = await closePosition(supabase, pos, currentPrice, "TRAILING_STOP");
        results.push({ symbol: pos.symbol, action: "TRAILING_STOPPED", ...result });
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
          await supabase.from("demo_positions").update({
            quantity: Number(pos.quantity) - halfQty,
            partial_close_at_1r: true,
            partial_close_price: currentPrice,
            stop_loss: entryPrice,  // Move SL to breakeven!
            notes: (pos.notes ?? "") + ` | +1R partial: ${halfQty}@${currentPrice}`,
            updated_at: new Date().toISOString(),
          }).eq("id", pos.id);

          // Log partial close transaction
          const { data: account } = await supabase.from("demo_accounts").select("*").eq("id", accountId).single();
          if (account) {
            const newBalance = account.current_balance + partialPnl;
            await supabase.from("demo_accounts").update({
              current_balance: Math.round(newBalance * 100) / 100,
              reserved_balance: Math.max(0, (account.reserved_balance ?? 0) - halfQty * entryPrice),
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

  // Reset account
  await supabase
    .from("demo_accounts")
    .update({
      current_balance: 100000,
      reserved_balance: 0,
      total_pnl: 0,
      total_pnl_percent: 0,
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      max_drawdown_percent: 0,
      peak_balance: 100000,
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
    amount: 100000,
    balance_after: 100000,
    notes: "Demo account reset to $100,000",
  });

  return jsonResponse({ message: "Demo account reset to $100,000", account_id: accountId });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

  const cost = quantity * entry_price;
  const availableBalance = account.current_balance - (account.reserved_balance ?? 0);

  if (cost > availableBalance) {
    return { status: "ERROR", reason: "Insufficient balance", required: cost, available: availableBalance };
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
    })
    .select("id")
    .single();

  if (posError) {
    return { status: "ERROR", reason: posError.message };
  }

  // Reserve balance
  await supabase
    .from("demo_accounts")
    .update({
      reserved_balance: (account.reserved_balance ?? 0) + cost,
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
    amount: -cost,
    balance_after: account.current_balance,
    notes: `${txType} ${quantity}x ${symbol} @ $${entry_price}`,
  });

  return {
    status: "OPENED",
    position_id: position.id,
    symbol,
    direction,
    quantity,
    entry_price,
    cost,
  };
}

async function closePosition(supabase: any, position: any, exitPrice: number, closeReason: string) {
  const isLong = position.position_type === "LONG";
  const quantity = Number(position.quantity);
  const entryPrice = Number(position.entry_price);

  // Calculate P&L
  const pnlAmount = isLong
    ? (exitPrice - entryPrice) * quantity
    : (entryPrice - exitPrice) * quantity;
  const pnlPercent = ((isLong ? exitPrice - entryPrice : entryPrice - exitPrice) / entryPrice) * 100;

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
    const newBalance = account.current_balance + pnlAmount;
    const newReserved = Math.max(0, (account.reserved_balance ?? 0) - tradeCost);
    const totalPnl = (account.total_pnl ?? 0) + pnlAmount;
    const totalTrades = (account.total_trades ?? 0) + 1;
    const winningTrades = (account.winning_trades ?? 0) + (pnlAmount > 0 ? 1 : 0);
    const losingTrades = (account.losing_trades ?? 0) + (pnlAmount <= 0 ? 1 : 0);
    const peakBalance = Math.max(account.peak_balance ?? 100000, newBalance);
    const drawdown = peakBalance > 0
      ? Math.round(((peakBalance - Math.min(newBalance, peakBalance)) / peakBalance) * 10000) / 100
      : 0;
    const maxDrawdown = Math.max(account.max_drawdown_percent ?? 0, drawdown);

    await supabase
      .from("demo_accounts")
      .update({
        current_balance: Math.round(newBalance * 100) / 100,
        reserved_balance: Math.round(newReserved * 100) / 100,
        total_pnl: Math.round(totalPnl * 100) / 100,
        total_pnl_percent: Math.round((totalPnl / 100000) * 10000) / 100,
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
        const maxSize = Number(ruleValue?.max_amount ?? defaultMaxPositionSize);
        const posSize = Number(decision.entry_price) * 10; // approximate
        passed = posSize <= maxSize;
        reason = `Position $${posSize} vs max $${maxSize}`;
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
        const minConf = Number(ruleValue?.min_confidence ?? defaultMinConfidence);
        const conf = Number(decision.confidence_score ?? 0);
        // B+ = 70+, A = 80+, A+ = 90+
        passed = conf >= minConf;
        reason = `Confidence ${conf} vs min ${minConf}`;
        break;
      }
      case "MIN_CONFIDENCE": {
        const minConf = Number(ruleValue?.min_percent ?? defaultMinConfidence);
        const conf = Number(decision.confidence_score ?? 0);
        passed = conf >= minConf;
        reason = `Confidence ${conf}% vs min ${minConf}%`;
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
      // Activate the position: change status to OPEN, set entry at trigger price
      await supabase.from("demo_positions").update({
        position_status: "OPEN",
        entry_price: triggerPrice,
        current_price: currentPrice,
        opened_at: new Date().toISOString(),
        trailing_stop_highest: isLong ? triggerPrice : pos.trailing_stop_highest,
        trailing_stop_lowest: !isLong ? triggerPrice : pos.trailing_stop_lowest,
        notes: (pos.notes ?? "") + ` | Triggered: ${entryType} at ${triggerPrice}`,
        updated_at: new Date().toISOString(),
      }).eq("id", pos.id);

      // Reserve balance
      const cost = Number(pos.quantity) * triggerPrice;
      await supabase.from("demo_accounts").update({
        reserved_balance: (account.reserved_balance ?? 0) + cost,
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
        amount: -cost,
        balance_after: account.current_balance,
        notes: `${entryType} triggered: ${Number(pos.quantity)}x ${pos.symbol} @ $${triggerPrice}`,
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
