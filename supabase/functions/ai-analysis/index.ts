import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type StrandType = "technical" | "elliott_wave" | "croc_ice" | "fusion";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { symbol, date, mode = "full", strand_type } = body;
    if (!symbol) throw new Error("symbol is required");

    const analysisDate = date || new Date().toISOString().slice(0, 10);

    // Route to appropriate handler
    if (mode === "strand" && strand_type) {
      return await handleStrandAnalysis(supabase, symbol, analysisDate, strand_type as StrandType, claudeApiKey);
    } else {
      return await handleFullAnalysis(supabase, symbol, analysisDate, claudeApiKey);
    }
  } catch (err) {
    console.error("ai-analysis error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STRAND-SPECIFIC ANALYSIS — New Multi-Pass Architecture
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleStrandAnalysis(
  supabase: any,
  symbol: string,
  analysisDate: string,
  strandType: StrandType,
  claudeApiKey: string | undefined,
) {
  // Get AI model for this strand from strategy_config
  const { data: modelConfig } = await supabase
    .from("strategy_config")
    .select("config_value")
    .eq("config_key", "ai_model_strands")
    .single();

  const aiModel = modelConfig?.config_value?.[strandType] || "claude-sonnet-4-20250514";

  // Gather data based on strand type
  const contextData = await gatherStrandContext(supabase, symbol, analysisDate, strandType);

  // Build strand-specific prompt
  const prompt = buildStrandPrompt(symbol, analysisDate, strandType, contextData);

  // Call Claude API
  const aiResult = await callClaudeAPI(claudeApiKey, aiModel, prompt, strandType);

  // Store in ai_strand_analyses
  const { error: upsertError } = await supabase
    .from("ai_strand_analyses")
    .upsert(
      {
        symbol,
        analysis_date: analysisDate,
        strand_type: strandType,
        ai_model: aiModel,
        direction: aiResult.direction,
        confidence: aiResult.confidence,
        analysis_text: aiResult.analysis_text,
        key_findings: aiResult.key_findings,
        scores: aiResult.scores,
      },
      { onConflict: "symbol,analysis_date,strand_type" }
    );

  if (upsertError) {
    console.error(`ai_strand_analyses upsert error for ${symbol}/${strandType}:`, upsertError);
  }

  // For fusion strand: also write to trading_decisions
  if (strandType === "fusion" && aiResult.trade_decision) {
    await saveFusionDecision(supabase, symbol, analysisDate, aiResult, contextData);
  }

  return new Response(
    JSON.stringify({
      symbol,
      date: analysisDate,
      strand_type: strandType,
      ai_model: aiModel,
      direction: aiResult.direction,
      confidence: aiResult.confidence,
      analysis_text: aiResult.analysis_text?.slice(0, 500),
      key_findings: aiResult.key_findings,
      upsert_error: upsertError?.message ?? null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GATHER CONTEXT — Strand-specific data fetching
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function gatherStrandContext(
  supabase: any,
  symbol: string,
  analysisDate: string,
  strandType: StrandType,
) {
  const context: any = {};

  // Always fetch latest prices
  const { data: prices } = await supabase
    .from("v_stock_prices_all")
    .select("date, open, high, low, close, volume")
    .eq("symbol", symbol)
    .order("date", { ascending: false })
    .limit(strandType === "elliott_wave" ? 60 : 30);

  context.prices = prices ?? [];
  context.latestPrice = context.prices[0];

  if (!context.latestPrice) {
    throw new Error(`Keine Kursdaten fuer ${symbol} am ${analysisDate}`);
  }

  switch (strandType) {
    case "technical": {
      // All 43 indicators (incl. CANDLE_SUMMARY) + scoring
      const [indicatorRes, scoreResults] = await Promise.all([
        supabase
          .from("technical_indicators")
          .select("indicator_name, value_1, value_2, value_3, value_4, value_5")
          .eq("symbol", symbol)
          .eq("date", analysisDate)
          .order("indicator_name"),
        Promise.all([
          supabase.rpc("calculate_trend_momentum_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "LONG" }),
          supabase.rpc("calculate_trend_momentum_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "SHORT" }),
          supabase.rpc("calculate_mean_reversion_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "LONG" }),
          supabase.rpc("calculate_mean_reversion_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "SHORT" }),
          supabase.rpc("calculate_volume_vwap_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "LONG" }),
          supabase.rpc("calculate_volume_vwap_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "SHORT" }),
          supabase.rpc("calculate_multi_indicator_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "LONG" }),
          supabase.rpc("calculate_multi_indicator_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "SHORT" }),
        ]),
      ]);
      context.indicators = indicatorRes.data ?? [];
      context.scores = {
        trend_momentum: { long: scoreResults[0].data ?? 0, short: scoreResults[1].data ?? 0 },
        mean_reversion: { long: scoreResults[2].data ?? 0, short: scoreResults[3].data ?? 0 },
        volume_vwap: { long: scoreResults[4].data ?? 0, short: scoreResults[5].data ?? 0 },
        multi_indicator: { long: scoreResults[6].data ?? 0, short: scoreResults[7].data ?? 0 },
      };
      break;
    }

    case "elliott_wave": {
      // Price data (60 days) + Fibonacci pivots + Ichimoku
      const { data: indicators } = await supabase
        .from("technical_indicators")
        .select("indicator_name, value_1, value_2, value_3, value_4, value_5")
        .eq("symbol", symbol)
        .eq("date", analysisDate)
        .in("indicator_name", ["ICHIMOKU", "PIVOT_FIB", "SMA_20", "SMA_50", "SMA_200", "BBANDS_20", "ATR_14", "RSI_14"]);

      const [ichiLong, ichiShort] = await Promise.all([
        supabase.rpc("calculate_ichimoku_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "LONG" }),
        supabase.rpc("calculate_ichimoku_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "SHORT" }),
      ]);

      context.indicators = indicators ?? [];
      context.ichimoku_scores = { long: ichiLong.data ?? 0, short: ichiShort.data ?? 0 };
      break;
    }

    case "croc_ice": {
      // CROC indicators + ICE signals + Lochstreifen + Premium + Setups + Market Regime
      const [crocIndicators, iceSignals, crocScores, lochstreifenRes, premiumRes, setupsRes] = await Promise.all([
        supabase
          .from("technical_indicators")
          .select("indicator_name, value_1, value_2, value_3, value_4, value_5")
          .eq("symbol", symbol)
          .eq("date", analysisDate)
          .in("indicator_name", [
            "CROC_ALLIGATOR", "CROC_RAINBOW", "CROC_STATUS", "CROC_DISTANCE", "CROC_EXHAUSTION",
            "SUPERTREND_10_3", "AROON_25", "SAR", "ADX_14", "DI_14", "ICHIMOKU",
            "CANDLE_SUMMARY",
          ]),
        supabase
          .from("croc_ice_signals")
          .select("signal_type, direction, signal_strength, is_active, signal_date, dna_line, entry_type, trigger_price, stop_loss, take_profit_1r, filter_alignment, premium_override, is_reversal_signal")
          .eq("symbol", symbol)
          .eq("is_active", true)
          .order("signal_date", { ascending: false })
          .limit(20),
        Promise.all([
          supabase.rpc("calculate_croc_ice_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "LONG" }),
          supabase.rpc("calculate_croc_ice_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "SHORT" }),
        ]),
        supabase
          .from("lochstreifen_state")
          .select("status, candle_color, cloud_color, trend, setter, wave, ice_deluxe, status_days, trend_days, setter_days, cloud_days, metadata")
          .eq("symbol", symbol)
          .eq("date", analysisDate)
          .single(),
        supabase
          .from("premium_signals")
          .select("signal_type, direction, is_premium, signal_strength, entry_price, stop_loss, signal_date")
          .eq("symbol", symbol)
          .eq("is_active", true)
          .order("signal_date", { ascending: false })
          .limit(10),
        supabase
          .from("detected_setups")
          .select("setup_name, direction, entry_type, entry_price, stop_soft, stop_hard, profit_1, profit_2, profit_3, crv_soft, confidence, filter_alignment, triggering_signals, detection_date")
          .eq("symbol", symbol)
          .eq("is_active", true)
          .order("detection_date", { ascending: false })
          .limit(10),
      ]);
      context.croc_indicators = crocIndicators.data ?? [];
      context.ice_signals = iceSignals.data ?? [];
      context.croc_scores = { long: crocScores[0].data ?? 0, short: crocScores[1].data ?? 0 };
      context.lochstreifen = lochstreifenRes.data ?? null;
      context.premium_signals = premiumRes.data ?? [];
      context.detected_setups = setupsRes.data ?? [];
      context.market_regime = lochstreifenRes.data?.metadata?.market_regime ?? "UNKNOWN";
      break;
    }

    case "fusion": {
      // Load all 3 previous strand analyses + Lochstreifen + Premium + Setups + Market Regime + Candlestick
      const [strandRes, lochstreifenRes, premiumRes, setupsRes, weightsConfig, candleRes] = await Promise.all([
        supabase
          .from("ai_strand_analyses")
          .select("strand_type, direction, confidence, analysis_text, key_findings, scores")
          .eq("symbol", symbol)
          .eq("analysis_date", analysisDate)
          .in("strand_type", ["technical", "elliott_wave", "croc_ice"]),
        supabase
          .from("lochstreifen_state")
          .select("status, candle_color, cloud_color, trend, setter, wave, ice_deluxe, status_days, trend_days, setter_days, cloud_days, metadata")
          .eq("symbol", symbol)
          .eq("date", analysisDate)
          .single(),
        supabase
          .from("premium_signals")
          .select("signal_type, direction, is_premium, signal_strength, signal_date")
          .eq("symbol", symbol)
          .eq("is_active", true)
          .order("signal_date", { ascending: false })
          .limit(5),
        supabase
          .from("detected_setups")
          .select("setup_name, direction, entry_type, entry_price, stop_soft, stop_hard, profit_1, profit_2, profit_3, crv_soft, confidence, detection_date")
          .eq("symbol", symbol)
          .eq("is_active", true)
          .order("detection_date", { ascending: false })
          .limit(5),
        supabase
          .from("strategy_config")
          .select("config_value")
          .eq("config_key", "strand_weights")
          .single(),
        supabase
          .from("technical_indicators")
          .select("indicator_name, value_1, value_2, value_3, value_4, value_5")
          .eq("symbol", symbol)
          .eq("date", analysisDate)
          .eq("indicator_name", "CANDLE_SUMMARY")
          .single(),
      ]);

      context.strand_analyses = strandRes.data ?? [];
      context.lochstreifen = lochstreifenRes.data ?? null;
      context.candle_summary = candleRes.data ?? null;
      context.premium_signals = premiumRes.data ?? [];
      context.detected_setups = setupsRes.data ?? [];
      context.market_regime = lochstreifenRes.data?.metadata?.market_regime ?? "UNKNOWN";

      // Load dynamic strand weights from strategy_config
      const w = weightsConfig.data?.config_value ?? { s1: 0.15, s2: 0.25, s3: 0.40, s4: 0.20 };
      context.strand_weights = w;

      // Also load all scores for the final calculation
      const scoreFunctions = [
        "calculate_trend_momentum_score", "calculate_mean_reversion_score",
        "calculate_ichimoku_score", "calculate_volume_vwap_score",
        "calculate_multi_indicator_score", "calculate_croc_ice_score",
      ];
      const [longRes, shortRes] = await Promise.all([
        Promise.all(scoreFunctions.map((fn) =>
          supabase.rpc(fn, { p_symbol: symbol, p_date: analysisDate, p_direction: "LONG" })
        )),
        Promise.all(scoreFunctions.map((fn) =>
          supabase.rpc(fn, { p_symbol: symbol, p_date: analysisDate, p_direction: "SHORT" })
        )),
      ]);

      context.all_scores = {
        trend_momentum: { long: longRes[0].data ?? 0, short: shortRes[0].data ?? 0 },
        mean_reversion: { long: longRes[1].data ?? 0, short: shortRes[1].data ?? 0 },
        ichimoku: { long: longRes[2].data ?? 0, short: shortRes[2].data ?? 0 },
        volume_vwap: { long: longRes[3].data ?? 0, short: shortRes[3].data ?? 0 },
        multi_indicator: { long: longRes[4].data ?? 0, short: shortRes[4].data ?? 0 },
        croc_ice: { long: longRes[5].data ?? 0, short: shortRes[5].data ?? 0 },
      };

      // Calculate 4-strand scores with V6.0 weights
      const s = context.all_scores;
      const s1L = Math.round((s.trend_momentum.long + s.mean_reversion.long + s.multi_indicator.long) / 3);
      const s1S = Math.round((s.trend_momentum.short + s.mean_reversion.short + s.multi_indicator.short) / 3);
      context.strand_scores = {
        s1: { long: s1L, short: s1S },                                  // Technical
        s2: { long: s.ichimoku.long, short: s.ichimoku.short },          // Elliott Wave
        s3: { long: s.croc_ice.long, short: s.croc_ice.short },         // CROC/ICE (V6: now S3!)
        s4: { long: s.volume_vwap.long, short: s.volume_vwap.short },   // Volume/VWAP (V6: now S4!)
      };
      break;
    }
  }

  return context;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUILD STRAND PROMPTS — Specialized analysis prompts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildStrandPrompt(symbol: string, date: string, strandType: StrandType, ctx: any): string {
  const price = Number(ctx.latestPrice.close);
  const priceHistory = ctx.prices.slice(0, 10)
    .map((p: any) => `${p.date}: O:${p.open} H:${p.high} L:${p.low} C:${p.close} V:${p.volume}`)
    .join("\n");

  switch (strandType) {
    case "technical":
      return `Du bist ein quantitativer Trading-Analyst. Analysiere die technischen Indikatoren von ${symbol} und gib NUR ein JSON-Objekt zurueck.

**Symbol:** ${symbol} | **Kurs:** $${price} | **Datum:** ${date}

**Kursverlauf (10 Tage):**
${priceHistory}

**Alle Indikatoren (${ctx.indicators.length}):**
${ctx.indicators.map((i: any) => `${i.indicator_name}: v1=${i.value_1}${i.value_2 ? ` v2=${i.value_2}` : ""}${i.value_3 ? ` v3=${i.value_3}` : ""}`).join("\n")}

**Scoring-Ergebnisse (LONG/SHORT):**
- Trend/Momentum: ${ctx.scores.trend_momentum.long}/${ctx.scores.trend_momentum.short}
- Mean Reversion: ${ctx.scores.mean_reversion.long}/${ctx.scores.mean_reversion.short}
- Volume/VWAP: ${ctx.scores.volume_vwap.long}/${ctx.scores.volume_vwap.short}
- Multi-Indicator: ${ctx.scores.multi_indicator.long}/${ctx.scores.multi_indicator.short}

**CANDLESTICK PATTERN ANALYSE:**
${(() => {
  const candleSummary = ctx.indicators.find((i: any) => i.indicator_name === 'CANDLE_SUMMARY');
  if (!candleSummary || candleSummary.value_4 === 0) return 'Keine Candlestick-Patterns erkannt.';
  const patternNames: Record<number, string> = {
    1:'HAMMER',2:'INV_HAMMER',3:'SHOOTING_STAR',4:'HANGING_MAN',5:'DOJI',6:'SPINNING_TOP',
    7:'MARUBOZU',8:'BULL_ENGULFING',9:'BEAR_ENGULFING',10:'PIERCING_LINE',11:'DARK_CLOUD',
    12:'HARAMI',13:'MORNING_STAR',14:'EVENING_STAR',15:'THREE_SOLDIERS',16:'THREE_CROWS'
  };
  const dirLabels: Record<number, string> = {1:'bullish',[-1]:'bearish',0:'neutral'};
  const primary = patternNames[Number(candleSummary.value_1)] ?? 'UNKNOWN';
  const dir = candleSummary.value_2 > 0 ? 'bullish' : candleSummary.value_2 < 0 ? 'bearish' : 'neutral';
  const strength = Number(candleSummary.value_3);
  const count = Number(candleSummary.value_4);
  const secondary = candleSummary.value_5 ? patternNames[Number(candleSummary.value_5)] : null;
  const allCandles = ctx.indicators.filter((i: any) => i.indicator_name.startsWith('CANDLE_') && i.indicator_name !== 'CANDLE_SUMMARY');
  const patternList = allCandles.map((c: any) => c.indicator_name.replace('CANDLE_','')).join(', ');
  return \`Primaer: \${primary} (\${dir}, Staerke \${strength}/3)\${secondary ? \`, Sekundaer: \${patternNames[Number(candleSummary.value_5)]}\` : ''}\nAlle Patterns (\${count}): \${patternList || primary}\nWICHTIG: Starke Umkehr-Patterns (Staerke 3) GEGEN Trend = WARNSIGNAL!\`;
})()}

CANDLESTICK REFERENZ:
1=HAMMER(bull,2), 2=INV_HAMMER(bull,1), 3=SHOOTING_STAR(bear,2), 4=HANGING_MAN(bear,1),
5=DOJI(neutral,2), 6=SPINNING_TOP(neutral,1), 7=MARUBOZU(trend,3),
8=BULL_ENGULFING(bull,3), 9=BEAR_ENGULFING(bear,3), 10=PIERCING(bull,2),
11=DARK_CLOUD(bear,2), 12=HARAMI(neutral,1), 13=MORNING_STAR(bull,3),
14=EVENING_STAR(bear,3), 15=THREE_SOLDIERS(bull,3), 16=THREE_CROWS(bear,3)

Analysiere: Trend-Richtung, Momentum-Staerke, Volatilitaets-Regime, Support/Resistance-Level, Divergenzen, Candlestick-Pattern-Bestaetigung/Warnung.

Antworte NUR mit JSON:
{
  "direction": "LONG|SHORT|NEUTRAL",
  "confidence": 0-100,
  "analysis": "3-5 Saetze detaillierte technische Analyse",
  "key_findings": {
    "trend": "BULLISH|BEARISH|NEUTRAL",
    "momentum": "STRONG|MODERATE|WEAK",
    "volatility": "HIGH|NORMAL|LOW",
    "support": Zahl,
    "resistance": Zahl,
    "divergences": "Beschreibung oder null",
    "candlestick": "Pattern-Name und Bewertung (z.B. BEAR_ENGULFING - starke Umkehr-Warnung) oder null"
  }
}`;

    case "elliott_wave":
      const priceHistory60 = ctx.prices.slice(0, 30)
        .map((p: any) => `${p.date}: O:${p.open} H:${p.high} L:${p.low} C:${p.close}`)
        .join("\n");

      return `Du bist ein Elliott-Wave-Experte. Analysiere die Wellenstruktur von ${symbol} und gib NUR ein JSON-Objekt zurueck.

**Symbol:** ${symbol} | **Kurs:** $${price} | **Datum:** ${date}

**Kursverlauf (30 Tage OHLC):**
${priceHistory60}

**Relevante Indikatoren:**
${ctx.indicators.map((i: any) => `${i.indicator_name}: v1=${i.value_1}${i.value_2 ? ` v2=${i.value_2}` : ""}${i.value_3 ? ` v3=${i.value_3}` : ""}${i.value_4 ? ` v4=${i.value_4}` : ""}${i.value_5 ? ` v5=${i.value_5}` : ""}`).join("\n")}

**Ichimoku Scores (LONG/SHORT):** ${ctx.ichimoku_scores.long} / ${ctx.ichimoku_scores.short}

Analysiere: Aktuelle Wellenposition (Impuls 1-5 oder Korrektur A-B-C), Fibonacci-Retracements, erwartete naechste Bewegung, Wellenzaehlung der letzten Wochen.

Antworte NUR mit JSON:
{
  "direction": "LONG|SHORT|NEUTRAL",
  "confidence": 0-100,
  "analysis": "3-5 Saetze Elliott-Wave Analyse",
  "key_findings": {
    "wave_position": "Impulse 3|Correction B|etc.",
    "wave_degree": "Minor|Intermediate|Major",
    "expected_move": "UP|DOWN|SIDEWAYS",
    "fib_support": Zahl,
    "fib_resistance": Zahl,
    "pattern": "Impulse|Zigzag|Flat|Triangle|Diagonal"
  }
}`;

    case "croc_ice": {
      const ls = ctx.lochstreifen;
      const lochstreifenText = ls
        ? `Status: ${ls.status} (${ls.status_days}d) | Kerze: ${ls.candle_color} | Wolke: ${ls.cloud_color} (${ls.cloud_days}d) | Trend: ${ls.trend} (${ls.trend_days}d) | Setter: ${ls.setter} (${ls.setter_days}d) | Wave: ${ls.wave}${ls.ice_deluxe ? ` | ICE Deluxe: ${ls.ice_deluxe}` : ""}`
        : "Keine Lochstreifen-Daten";

      const premiumText = ctx.premium_signals.length > 0
        ? ctx.premium_signals.map((p: any) => `${p.signal_type} ${p.direction} (Premium=${p.is_premium}, Staerke=${p.signal_strength}, ${p.signal_date})`).join("\n")
        : "Keine aktiven Premium-Signale";

      const setupText = ctx.detected_setups.length > 0
        ? ctx.detected_setups.map((s: any) => `${s.setup_name} ${s.direction}: Entry=${s.entry_price} (${s.entry_type}), SL-Soft=${s.stop_soft}, SL-Hard=${s.stop_hard}, TP1=${s.profit_1}, Conf=${s.confidence}%`).join("\n")
        : "Keine aktiven Trading-Setups";

      const iceSignalText = ctx.ice_signals.length > 0
        ? ctx.ice_signals.map((s: any) => `${s.signal_type} ${s.direction} (DNA:${s.dna_line ?? "?"}, Staerke:${s.signal_strength}, Entry:${s.entry_type ?? "?"}, Trigger:${s.trigger_price ?? "?"}, SL:${s.stop_loss ?? "?"}, Reversal:${s.is_reversal_signal ?? false}, Premium-Override:${s.premium_override ?? false})`).join("\n")
        : "Keine aktiven ICE-Signale";

      return `Du bist ein Experte fuer das CROC/ICE Trading-System nach Andre Tiedje (Crocomichi-Methodik). Analysiere ${symbol} mit dem vollstaendigen Lochstreifen, ICE DNA Code, Premium-Signalen und Trading-Setups. Gib NUR ein JSON-Objekt zurueck.

**Symbol:** ${symbol} | **Kurs:** $${price} | **Datum:** ${date}
**Markt-Regime:** ${ctx.market_regime}

**Kursverlauf (10 Tage):**
${priceHistory}

**LOCHSTREIFEN (Punch Tape) — 6 Zeilen:**
${lochstreifenText}

**CROC/ICE Indikatoren:**
${ctx.croc_indicators.map((i: any) => `${i.indicator_name}: v1=${i.value_1}${i.value_2 ? ` v2=${i.value_2}` : ""}${i.value_3 ? ` v3=${i.value_3}` : ""}${i.value_4 ? ` v4=${i.value_4}` : ""}${i.value_5 ? ` v5=${i.value_5}` : ""}`).join("\n")}

**ICE DNA Code Signale (${ctx.ice_signals.length} aktiv):**
${iceSignalText}

**Premium-Signale (Elliott-Wellen-Symbole):**
${premiumText}

**Erkannte Trading-Setups:**
${setupText}

**CROC/ICE Scores (LONG/SHORT):** ${ctx.croc_scores.long} / ${ctx.croc_scores.short}

**CROC-REGELN (STRIKT EINHALTEN):**
1. SIDEWAYS → NEUTRAL, kein Trade! Market Regime entscheidet.
2. Premium-Signale (RED_DEVIL, LOLLIPOP, ORANGE, GRAY) dominieren IMMER ueber ICE 4-15 Signale.
3. Bull-Signale ICE 4-15: NUR bei gruener Wolke UND Kurs UEBER Wolke handeln.
4. Bear-Signale ICE 4-15: NUR bei roter Wolke UND Kurs UNTER Wolke handeln.
5. Bull/Bear 1-3, 7 sind REVERSAL-Signale — duerfen auch GEGEN Wolke gehandelt werden.
6. BummeRRRang verfaellt nach 5 Kerzen.
7. ICE-Signal ignorieren wenn gleichzeitig gegenlaeufiges Premium-Signal aktiv.
8. "Was nicht faellt, das steigt" — ICE Bear 9 ohne neues Tief nach 5 Kerzen = LONG!
9. Gaensemarsch: Setter-Wechsel ist der erste Hinweis, Trend folgt spaeter.
10. Trend-Tage zaehlen: >5 Tage gleicher Trend = starke Bestaetigung.
11. CANDLESTICK CONFIRMATION: ${(() => {
  const cs = ctx.croc_indicators.find((i: any) => i.indicator_name === 'CANDLE_SUMMARY');
  if (!cs || Number(cs.value_4) === 0) return 'Kein Candlestick-Pattern erkannt.';
  const names: Record<number,string> = {1:'HAMMER',2:'INV_HAMMER',3:'SHOOTING_STAR',4:'HANGING_MAN',5:'DOJI',6:'SPINNING_TOP',7:'MARUBOZU',8:'BULL_ENGULFING',9:'BEAR_ENGULFING',10:'PIERCING',11:'DARK_CLOUD',12:'HARAMI',13:'MORNING_STAR',14:'EVENING_STAR',15:'THREE_SOLDIERS',16:'THREE_CROWS'};
  const p = names[Number(cs.value_1)] ?? 'UNKNOWN';
  const d = Number(cs.value_2) > 0 ? 'bullish' : Number(cs.value_2) < 0 ? 'bearish' : 'neutral';
  const s = Number(cs.value_3);
  return \`Erkannt: \${p} (\${d}, Staerke \${s}/3). Bei Staerke >= 2 GEGEN Alligator-Richtung → Konfidenz -10 bis -20. Bei BESTAETIGUNG der CROC-Richtung → Konfidenz +5 bis +10. DOJI am Ende einer FEEDING-Phase → Warnung vor SATED-Uebergang.\`;
})()}

Analysiere: Alligator-Phase, Lochstreifen-Alignment (wie viele von 6 Zeilen gleiche Richtung), ICE Signal-Cluster, Premium-Signal-Prioritaet, Setup-Qualitaet, Erschoepfungsanzeichen, Candlestick-Bestaetigung.

Antworte NUR mit JSON:
{
  "direction": "LONG|SHORT|NEUTRAL",
  "confidence": 0-100,
  "analysis": "3-5 Saetze CROC/ICE Analyse mit Lochstreifen-Bewertung",
  "key_findings": {
    "market_regime": "${ctx.market_regime}",
    "lochstreifen": {"status":"${ls?.status ?? "?"}","candle":"${ls?.candle_color ?? "?"}","cloud":"${ls?.cloud_color ?? "?"}","trend":"${ls?.trend ?? "?"}","setter":"${ls?.setter ?? "?"}","wave":"${ls?.wave ?? "?"}"},
    "premium_signal": "${ctx.premium_signals.length > 0 ? ctx.premium_signals[0].signal_type : "NONE"}",
    "active_setup": "${ctx.detected_setups.length > 0 ? ctx.detected_setups[0].setup_name : "NONE"}",
    "ice_cluster": "BULL_DOMINANT|BEAR_DOMINANT|MIXED|NONE",
    "alligator_phase": "SLEEPING|AWAKENING|FEEDING|SATED",
    "filter_alignment": 0-6,
    "croc_trade_type": "CTT|CRT|NONE"
  }
}`;
    }

    case "fusion": {
      const strandSummaries = ctx.strand_analyses.map((a: any) =>
        `**${a.strand_type.toUpperCase()}:** Richtung=${a.direction}, Konfidenz=${a.confidence}%\n${a.analysis_text?.slice(0, 400) || "Keine Analyse"}\nKey Findings: ${JSON.stringify(a.key_findings)}`
      ).join("\n\n");

      const ss = ctx.strand_scores;
      const w = ctx.strand_weights ?? { s1: 0.15, s2: 0.25, s3: 0.40, s4: 0.20 };
      const ls = ctx.lochstreifen;

      const premiumText = ctx.premium_signals?.length > 0
        ? ctx.premium_signals.map((p: any) => `${p.signal_type} ${p.direction} (Premium=${p.is_premium})`).join(", ")
        : "Keine";

      const setupText = ctx.detected_setups?.length > 0
        ? ctx.detected_setups.map((s: any) => `${s.setup_name} ${s.direction}: Entry=${s.entry_price}(${s.entry_type}), SL=${s.stop_soft}, TP1=${s.profit_1}, Conf=${s.confidence}%`).join("\n")
        : "Keine aktiven Setups";

      const lochstreifenText = ls
        ? `Status:${ls.status}(${ls.status_days}d) Kerze:${ls.candle_color} Wolke:${ls.cloud_color}(${ls.cloud_days}d) Trend:${ls.trend}(${ls.trend_days}d) Setter:${ls.setter}(${ls.setter_days}d) Wave:${ls.wave}`
        : "Nicht verfuegbar";

      // Candlestick Pattern für Fusion
      const cs = ctx.candle_summary;
      const candlePatternNames: Record<number, string> = {
        1:'HAMMER',2:'INV_HAMMER',3:'SHOOTING_STAR',4:'HANGING_MAN',5:'DOJI',6:'SPINNING_TOP',
        7:'MARUBOZU',8:'BULL_ENGULFING',9:'BEAR_ENGULFING',10:'PIERCING_LINE',11:'DARK_CLOUD',
        12:'HARAMI',13:'MORNING_STAR',14:'EVENING_STAR',15:'THREE_SOLDIERS',16:'THREE_CROWS'
      };
      const candleText = cs && Number(cs.value_4) > 0
        ? `${candlePatternNames[Number(cs.value_1)] ?? 'UNKNOWN'} (${Number(cs.value_2) > 0 ? 'bullish' : Number(cs.value_2) < 0 ? 'bearish' : 'neutral'}, Staerke ${Number(cs.value_3)}/3, ${Number(cs.value_4)} Pattern(s))`
        : "Keine Patterns";

      return `Du bist der Chef-Analyst eines CROC/ICE Trading-Desks (Crocomichi nach Andre Tiedje). Bewerte die 3 Strand-Analysen fuer ${symbol} und treffe die finale Handelsentscheidung. CROC/ICE ist der DOMINANTE Strang! Gib NUR ein JSON-Objekt zurueck.

**Symbol:** ${symbol} | **Kurs:** $${price} | **Datum:** ${date}
**Markt-Regime:** ${ctx.market_regime}

**Kursverlauf (5 Tage):**
${ctx.prices.slice(0, 5).map((p: any) => `${p.date}: O:${p.open} H:${p.high} L:${p.low} C:${p.close} V:${p.volume}`).join("\n")}

**Lochstreifen:** ${lochstreifenText}
**Candlestick-Pattern:** ${candleText}
**Premium-Signale:** ${premiumText}
**Trading-Setups:**
${setupText}

**4-Strang Scores (LONG / SHORT) — V6.0 CROC-dominant:**
- S1 Technical (${Math.round(w.s1 * 100)}%): ${ss.s1.long} / ${ss.s1.short}
- S2 Elliott Wave (${Math.round(w.s2 * 100)}%): ${ss.s2.long} / ${ss.s2.short}
- S3 CROC/ICE (${Math.round(w.s3 * 100)}%): ${ss.s3.long} / ${ss.s3.short}  ← DOMINIERT
- S4 Volume/VWAP (${Math.round(w.s4 * 100)}%): ${ss.s4.long} / ${ss.s4.short}

**Strand-Analysen:**
${strandSummaries || "Keine Strand-Analysen verfuegbar"}

**ENTSCHEIDUNGSREGELN (STRIKT EINHALTEN):**
1. **SIDEWAYS → CASH!** Bei Market-Regime SIDEWAYS IMMER CASH zurueckgeben, egal was Straenge sagen.
2. **Premium-Signal-Hierarchie:** Red Devil/Lollipop/Orange → hoechste Prioritaet, ueberstimmt alles.
3. **Gewichtung:** S1=${Math.round(w.s1 * 100)}%, S2=${Math.round(w.s2 * 100)}%, S3=${Math.round(w.s3 * 100)}%, S4=${Math.round(w.s4 * 100)}%. CROC/ICE (S3) ist der fuehrende Strang!
4. **Trade-Management:** Max 1% Risiko pro Position. Stop-Loss MUSS definiert sein.
5. **Trailing:** Bevorzuge Senkou Span B als Trailing-Stop. Bei grauem Punkt unter Kerzentief nachziehen.
6. **Entry-Typ:** Nutze STOP_BUY/STOP_SELL wenn ein Setup dies vorgibt, sonst MARKET.
7. **+1R Teilgewinn:** Bei Erreichen von +1R (= Entry ± |Entry-SL|) empfehle 50% Teilschliessen.
8. LONG wenn gewichteter Score > 55 UND mindestens 2 Straenge LONG UND CROC/ICE Strang LONG.
9. SHORT wenn gewichteter Score > 55 UND mindestens 2 Straenge SHORT UND CROC/ICE Strang SHORT.
10. CASH wenn Konfidenz < 45, Straenge widerspruechlich, oder CROC/ICE = NEUTRAL.
11. **CANDLESTICK OVERRIDE:** Starkes Umkehr-Pattern (Staerke 3: ENGULFING, MORNING/EVENING_STAR, THREE_SOLDIERS/CROWS) ENTGEGEN Trade-Richtung → Konfidenz -15. Falls Konfidenz dadurch < 55 → CASH. Bei Pattern-BESTAETIGUNG der Richtung → Konfidenz +5 (max 95). Erwaehne das Candlestick-Pattern im reasoning.

Antworte NUR mit JSON:
{
  "action": "LONG|SHORT|CASH",
  "confidence": 0-100,
  "reasoning": "3-5 Saetze Fusion-Begruendung mit CROC-Hierarchie",
  "entry_type": "STOP_BUY|STOP_SELL|MARKET",
  "entry_price": ${price},
  "stop_loss_soft": Zahl,
  "stop_loss_hard": Zahl_oder_null,
  "take_profit_1": Zahl,
  "take_profit_2": Zahl,
  "take_profit_3": Zahl,
  "trailing_stop_type": "SENKOU_SPAN_B|ATR|PERCENT",
  "trailing_stop_percent": 2.0-5.0,
  "setup_name": "GAENSEMARSCH|TRENDY_SHELDON|PREMIUM_RED|DNA_BULL_5|NONE",
  "trade_style": "CTT|CRT",
  "pyramid_allowed": true/false,
  "strand_agreement": "UNANIMOUS|MAJORITY|SPLIT",
  "risk_reward_ratio": Zahl,
  "market_regime": "${ctx.market_regime}",
  "key_risks": ["Risiko 1", "Risiko 2"]
}

LONG: stop_loss_soft < entry < tp1 < tp2 < tp3
SHORT: stop_loss_soft > entry > tp1 > tp2 > tp3`;
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLAUDE API CALL — Unified API caller
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function callClaudeAPI(
  claudeApiKey: string | undefined,
  model: string,
  prompt: string,
  strandType: StrandType,
): Promise<any> {
  const defaultResult = {
    direction: "NEUTRAL",
    confidence: 0,
    analysis_text: "AI-Analyse nicht verfuegbar (kein API Key)",
    key_findings: null,
    scores: null,
    trade_decision: null,
  };

  if (!claudeApiKey) return defaultResult;

  try {
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: strandType === "fusion" ? 1500 : 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`Claude API error (${model}):`, aiResponse.status, errText);
      return { ...defaultResult, analysis_text: `AI-Fehler (${aiResponse.status})` };
    }

    const aiData = await aiResponse.json();
    const rawText = aiData.content?.[0]?.text ?? "";

    // Parse JSON from response
    let jsonStr = rawText;
    const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }

    try {
      const parsed = JSON.parse(jsonStr.trim());

      if (strandType === "fusion") {
        return {
          direction: parsed.action || "CASH",
          confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
          analysis_text: parsed.reasoning || rawText.slice(0, 500),
          key_findings: {
            strand_agreement: parsed.strand_agreement,
            risk_reward_ratio: parsed.risk_reward_ratio,
            key_risks: parsed.key_risks,
            market_regime: parsed.market_regime,
            setup_name: parsed.setup_name,
            trade_style: parsed.trade_style,
            entry_type: parsed.entry_type,
            trailing_stop_type: parsed.trailing_stop_type,
          },
          scores: null,
          trade_decision: {
            action: parsed.action || "CASH",
            confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 30)),
            reasoning: parsed.reasoning,
            entry_type: parsed.entry_type || "MARKET",
            entry_price: parsed.entry_price,
            stop_loss: parsed.stop_loss_soft || parsed.stop_loss,
            stop_loss_soft: parsed.stop_loss_soft || parsed.stop_loss,
            stop_loss_hard: parsed.stop_loss_hard || null,
            take_profit_1: parsed.take_profit_1,
            take_profit_2: parsed.take_profit_2,
            take_profit_3: parsed.take_profit_3,
            trailing_stop_type: parsed.trailing_stop_type || "PERCENT",
            trailing_stop_percent: parsed.trailing_stop_percent || 3.0,
            setup_name: parsed.setup_name || null,
            trade_style: parsed.trade_style || "CTT",
            pyramid_allowed: parsed.pyramid_allowed || false,
            market_regime: parsed.market_regime,
          },
        };
      } else {
        return {
          direction: parsed.direction || "NEUTRAL",
          confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
          analysis_text: parsed.analysis || rawText.slice(0, 500),
          key_findings: parsed.key_findings || null,
          scores: null,
          trade_decision: null,
        };
      }
    } catch (parseErr) {
      console.error(`JSON parse failed for ${strandType}:`, (parseErr as Error).message);
      return {
        direction: "NEUTRAL",
        confidence: 0,
        analysis_text: rawText.slice(0, 500),
        key_findings: null,
        scores: null,
        trade_decision: null,
      };
    }
  } catch (fetchErr) {
    console.error("Claude fetch error:", fetchErr);
    return { ...defaultResult, analysis_text: `AI-Fehler: ${(fetchErr as Error).message}` };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SAVE FUSION DECISION — Write to trading_decisions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function saveFusionDecision(supabase: any, symbol: string, analysisDate: string, aiResult: any, ctx: any) {
  const td = aiResult.trade_decision;
  const ss = ctx.strand_scores;

  // V6.0: Strand-Zuordnung — S1=Technical, S2=Elliott, S3=CROC/ICE(40%), S4=Volume(20%)
  const decisionRow = {
    symbol,
    decision_timestamp: new Date().toISOString(),
    action_type: td.action,
    confidence_score: td.confidence,
    reasoning: td.reasoning,
    entry_price: td.entry_price,
    stop_loss: td.stop_loss_soft || td.stop_loss,
    take_profit_1: td.take_profit_1,
    take_profit_2: td.take_profit_2,
    take_profit_3: td.take_profit_3,
    trailing_stop_percent: td.trailing_stop_percent,
    // S1 Technical (15%)
    strand1_signal: ss.s1.long > ss.s1.short ? "LONG" : "SHORT",
    strand1_confidence: Math.max(ss.s1.long, ss.s1.short),
    strand1_long_score: ss.s1.long,
    strand1_short_score: ss.s1.short,
    // S2 Elliott Wave (25%)
    strand2_signal: ss.s2.long > ss.s2.short ? "LONG" : "SHORT",
    strand2_confidence: Math.max(ss.s2.long, ss.s2.short),
    strand2_wave_pattern: ctx.strand_analyses?.find((a: any) => a.strand_type === "elliott_wave")?.key_findings?.wave_position ?? null,
    strand2_direction_bias: ss.s2.long > ss.s2.short ? "BULLISH" : "BEARISH",
    // S3 CROC/ICE (40%) — V6.0: Jetzt der dominante Strang!
    strand3_signal: ss.s3.long > ss.s3.short ? "LONG" : "SHORT",
    strand3_confidence: Math.max(ss.s3.long, ss.s3.short),
    strand3_long_score: ss.s3.long,
    strand3_short_score: ss.s3.short,
    // S4 Volume/VWAP (20%)
    strand4_signal: ss.s4.long > ss.s4.short ? "LONG" : "SHORT",
    strand4_confidence: Math.max(ss.s4.long, ss.s4.short),
    strand4_long_score: ss.s4.long,
    strand4_short_score: ss.s4.short,
    croc_status: ctx.strand_analyses?.find((a: any) => a.strand_type === "croc_ice")?.key_findings?.alligator_phase ?? "UNKNOWN",
    ice_signals_active: String(ctx.strand_analyses?.find((a: any) => a.strand_type === "croc_ice")?.key_findings?.ice_cluster ?? "NONE"),
  };

  // V8.1: Prevent duplicates — delete existing decision for same symbol+date
  await supabase.from("trading_decisions")
    .delete()
    .eq("symbol", symbol)
    .gte("decision_timestamp", analysisDate + "T00:00:00")
    .lt("decision_timestamp", analysisDate + "T23:59:59");

  const { error } = await supabase.from("trading_decisions").insert(decisionRow);
  if (error) {
    console.error("trading_decisions insert error:", error);
  }

  // Also update elliott_wave_analysis
  const ewAnalysis = ctx.strand_analyses?.find((a: any) => a.strand_type === "elliott_wave");
  if (ewAnalysis) {
    await supabase.from("elliott_wave_analysis").upsert(
      {
        symbol,
        analysis_date: analysisDate,
        ai_analysis: ewAnalysis.analysis_text,
        ai_model: ewAnalysis.ai_model || "claude-haiku-4-20250514",
        primary_confidence: ewAnalysis.confidence,
        primary_direction: ewAnalysis.direction,
      },
      { onConflict: "symbol,analysis_date" }
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FULL ANALYSIS — Original all-in-one mode (backward compatible)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleFullAnalysis(
  supabase: any,
  symbol: string,
  analysisDate: string,
  claudeApiKey: string | undefined,
) {
  // ── 1. Gather context data ──────────────────────────────────
  const [priceRes, indicatorRes, signalRes, decisionRes] = await Promise.all([
    supabase
      .from("v_stock_prices_all")
      .select("date, open, high, low, close, volume")
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .limit(30),
    supabase
      .from("technical_indicators")
      .select("indicator_name, value_1, value_2, value_3")
      .eq("symbol", symbol)
      .eq("date", analysisDate)
      .order("indicator_name"),
    supabase
      .from("croc_ice_signals")
      .select("signal_type, direction, signal_strength, is_active")
      .eq("symbol", symbol)
      .eq("is_active", true)
      .order("signal_date", { ascending: false })
      .limit(10),
    supabase
      .from("trading_decisions")
      .select("action_type, confidence_score, reasoning, decision_timestamp")
      .eq("symbol", symbol)
      .order("decision_timestamp", { ascending: false })
      .limit(3),
  ]);

  const prices = priceRes.data ?? [];
  const indicators = indicatorRes.data ?? [];
  const signals = signalRes.data ?? [];
  const decisions = decisionRes.data ?? [];
  const latestPrice = prices[0];

  if (!latestPrice) {
    throw new Error(`Keine Kursdaten fuer ${symbol} am ${analysisDate}`);
  }

  // ── 2. Calculate scores ─────────────────────────────────────
  const scoreFunctions = [
    "calculate_trend_momentum_score",
    "calculate_mean_reversion_score",
    "calculate_ichimoku_score",
    "calculate_volume_vwap_score",
    "calculate_multi_indicator_score",
  ];

  const [longResults, shortResults] = await Promise.all([
    Promise.all(scoreFunctions.map((fn) =>
      supabase.rpc(fn, { p_symbol: symbol, p_date: analysisDate, p_direction: "LONG" })
    )),
    Promise.all(scoreFunctions.map((fn) =>
      supabase.rpc(fn, { p_symbol: symbol, p_date: analysisDate, p_direction: "SHORT" })
    )),
  ]);

  const longScores = {
    trend_momentum: longResults[0].data ?? 0,
    mean_reversion: longResults[1].data ?? 0,
    ichimoku: longResults[2].data ?? 0,
    volume_vwap: longResults[3].data ?? 0,
    multi_indicator: longResults[4].data ?? 0,
  };
  const shortScores = {
    trend_momentum: shortResults[0].data ?? 0,
    mean_reversion: shortResults[1].data ?? 0,
    ichimoku: shortResults[2].data ?? 0,
    volume_vwap: shortResults[3].data ?? 0,
    multi_indicator: shortResults[4].data ?? 0,
  };

  const [crocLong, crocShort] = await Promise.all([
    supabase.rpc("calculate_croc_ice_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "LONG" }),
    supabase.rpc("calculate_croc_ice_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "SHORT" }),
  ]);

  const s1Long = Math.round((longScores.trend_momentum + longScores.mean_reversion + longScores.multi_indicator) / 3);
  const s1Short = Math.round((shortScores.trend_momentum + shortScores.mean_reversion + shortScores.multi_indicator) / 3);
  const s2Long = longScores.ichimoku, s2Short = shortScores.ichimoku;
  const s3Long = longScores.volume_vwap, s3Short = shortScores.volume_vwap;
  const s4Long = crocLong.data ?? 0, s4Short = crocShort.data ?? 0;

  const strands = {
    s1: { long: s1Long, short: s1Short },
    s2: { long: s2Long, short: s2Short },
    s3: { long: s3Long, short: s3Short },
    s4: { long: s4Long, short: s4Short },
  };

  // ── 3. AI Analysis ──────────────────────────────────────────
  const currentPrice = Number(latestPrice.close);
  const prompt = `Du bist ein professioneller Trading-Analyst. Analysiere ${symbol} und gib NUR ein JSON-Objekt zurueck (kein Markdown, kein Text davor/danach).

**Aktueller Kurs:** $${currentPrice} (${analysisDate})
**Letzte 5 Tage:**
${prices.slice(0, 5).map((p: any) => `${p.date}: O:${p.open} H:${p.high} L:${p.low} C:${p.close} V:${p.volume}`).join("\n")}

**4-Strang Scores (LONG / SHORT):**
- S1 Technical (30%): ${s1Long} / ${s1Short}
- S2 Ichimoku (25%): ${s2Long} / ${s2Short}
- S3 Volume/VWAP (25%): ${s3Long} / ${s3Short}
- S4 CROC/ICE (20%): ${s4Long} / ${s4Short}

**Aktive Indikatoren:** ${indicators.slice(0, 15).map((i: any) => `${i.indicator_name}=${i.value_1}`).join(", ")}
**Aktive ICE-Signale:** ${signals.length > 0 ? signals.map((s: any) => `${s.signal_type} ${s.direction} (${s.signal_strength})`).join(", ") : "Keine"}
**Letzte Entscheidungen:** ${decisions.map((d: any) => `${d.action_type} (${d.confidence_score}%)`).join(", ") || "Keine"}

Antworte NUR mit diesem JSON:
{
  "action": "LONG oder SHORT oder CASH",
  "confidence": 0-100,
  "reasoning": "2-3 Saetze Begruendung",
  "entry_price": ${currentPrice},
  "stop_loss": Zahl,
  "take_profit_1": Zahl,
  "take_profit_2": Zahl,
  "take_profit_3": Zahl,
  "trailing_stop_percent": 2.0-5.0
}

Regeln:
- LONG: stop_loss < entry_price < take_profit_1 < take_profit_2 < take_profit_3
- SHORT: stop_loss > entry_price > take_profit_1 > take_profit_2 > take_profit_3
- CASH wenn kein klares Signal (Konfidenz < 40)`;

  let aiDecision = {
    action: "CASH" as string, confidence: 30, reasoning: "AI-Analyse nicht verfuegbar",
    entry_price: currentPrice, stop_loss: null as number | null,
    take_profit_1: null as number | null, take_profit_2: null as number | null,
    take_profit_3: null as number | null, trailing_stop_percent: 3.0,
  };

  if (claudeApiKey) {
    try {
      const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": claudeApiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const rawText = aiData.content?.[0]?.text ?? "";
        let jsonStr = rawText;
        const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) jsonStr = codeBlockMatch[1];

        try {
          const parsed = JSON.parse(jsonStr.trim());
          aiDecision = {
            action: parsed.action || "CASH",
            confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 30)),
            reasoning: parsed.reasoning || "Keine Begruendung",
            entry_price: Number(parsed.entry_price) || currentPrice,
            stop_loss: parsed.stop_loss ? Number(parsed.stop_loss) : null,
            take_profit_1: parsed.take_profit_1 ? Number(parsed.take_profit_1) : null,
            take_profit_2: parsed.take_profit_2 ? Number(parsed.take_profit_2) : null,
            take_profit_3: parsed.take_profit_3 ? Number(parsed.take_profit_3) : null,
            trailing_stop_percent: Number(parsed.trailing_stop_percent) || 3.0,
          };
        } catch {
          const longTotal = s1Long * 0.3 + s2Long * 0.25 + s3Long * 0.25 + s4Long * 0.2;
          const shortTotal = s1Short * 0.3 + s2Short * 0.25 + s3Short * 0.25 + s4Short * 0.2;
          if (longTotal > shortTotal && longTotal > 50) {
            aiDecision.action = "LONG"; aiDecision.confidence = Math.round(longTotal);
            aiDecision.stop_loss = Math.round(currentPrice * 0.97 * 100) / 100;
            aiDecision.take_profit_1 = Math.round(currentPrice * 1.03 * 100) / 100;
            aiDecision.take_profit_2 = Math.round(currentPrice * 1.05 * 100) / 100;
            aiDecision.take_profit_3 = Math.round(currentPrice * 1.08 * 100) / 100;
          } else if (shortTotal > longTotal && shortTotal > 50) {
            aiDecision.action = "SHORT"; aiDecision.confidence = Math.round(shortTotal);
            aiDecision.stop_loss = Math.round(currentPrice * 1.03 * 100) / 100;
            aiDecision.take_profit_1 = Math.round(currentPrice * 0.97 * 100) / 100;
            aiDecision.take_profit_2 = Math.round(currentPrice * 0.95 * 100) / 100;
            aiDecision.take_profit_3 = Math.round(currentPrice * 0.92 * 100) / 100;
          }
          aiDecision.reasoning = rawText.slice(0, 300);
        }
      }
    } catch (aiErr) {
      aiDecision.reasoning = `AI-Fehler: ${(aiErr as Error).message}`;
    }
  }

  // ── 4. Save to trading_decisions ────────────────────────────
  const decisionRow = {
    symbol, decision_timestamp: new Date().toISOString(),
    action_type: aiDecision.action, confidence_score: aiDecision.confidence,
    reasoning: aiDecision.reasoning, entry_price: aiDecision.entry_price,
    stop_loss: aiDecision.stop_loss, take_profit_1: aiDecision.take_profit_1,
    take_profit_2: aiDecision.take_profit_2, take_profit_3: aiDecision.take_profit_3,
    trailing_stop_percent: aiDecision.trailing_stop_percent,
    strand1_signal: s1Long > s1Short ? "LONG" : "SHORT", strand1_confidence: Math.max(s1Long, s1Short),
    strand1_long_score: s1Long, strand1_short_score: s1Short,
    strand2_signal: s2Long > s2Short ? "LONG" : "SHORT", strand2_confidence: Math.max(s2Long, s2Short),
    strand2_wave_pattern: null, strand2_direction_bias: s2Long > s2Short ? "BULLISH" : "BEARISH",
    strand3_signal: s3Long > s3Short ? "LONG" : "SHORT", strand3_confidence: Math.max(s3Long, s3Short),
    strand3_long_score: s3Long, strand3_short_score: s3Short,
    strand4_signal: s4Long > s4Short ? "LONG" : "SHORT", strand4_confidence: Math.max(s4Long, s4Short),
    strand4_long_score: s4Long, strand4_short_score: s4Short,
    croc_status: signals.length > 0 ? "ACTIVE" : "NEUTRAL",
    ice_signals_active: String(signals.length),
  };

  // V8.1: Prevent duplicates — delete existing decision for same symbol+date
  await supabase.from("trading_decisions")
    .delete()
    .eq("symbol", symbol)
    .gte("decision_timestamp", analysisDate + "T00:00:00")
    .lt("decision_timestamp", analysisDate + "T23:59:59");

  const { data: insertedDecision, error: insertError } = await supabase
    .from("trading_decisions").insert(decisionRow).select("decision_id").single();

  if (insertError) console.error("trading_decisions insert error:", insertError);

  await supabase.from("elliott_wave_analysis").upsert(
    { symbol, analysis_date: analysisDate, ai_analysis: aiDecision.reasoning,
      ai_model: "claude-sonnet-4-20250514", primary_confidence: aiDecision.confidence,
      primary_direction: aiDecision.action },
    { onConflict: "symbol,analysis_date" }
  );

  return new Response(
    JSON.stringify({
      symbol, date: analysisDate, action_type: aiDecision.action,
      confidence_score: aiDecision.confidence, reasoning: aiDecision.reasoning,
      entry_price: aiDecision.entry_price, stop_loss: aiDecision.stop_loss,
      take_profit_1: aiDecision.take_profit_1, take_profit_2: aiDecision.take_profit_2,
      take_profit_3: aiDecision.take_profit_3, trailing_stop_percent: aiDecision.trailing_stop_percent,
      latest_price: currentPrice, active_signals: signals.length, strands,
      decision_id: insertedDecision?.decision_id ?? null,
      insert_error: insertError?.message ?? null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
