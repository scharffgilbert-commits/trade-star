import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { symbol, date } = await req.json();
    if (!symbol) throw new Error("symbol is required");

    const analysisDate = date || new Date().toISOString().slice(0, 10);

    // Gather context data for AI
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
        .limit(5),
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

    // Calculate strategy scores
    const [tmRes, mrRes, ichRes, vvRes, miRes] = await Promise.all([
      supabase.rpc("calculate_trend_momentum_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "LONG" }),
      supabase.rpc("calculate_mean_reversion_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "LONG" }),
      supabase.rpc("calculate_ichimoku_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "LONG" }),
      supabase.rpc("calculate_volume_vwap_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "LONG" }),
      supabase.rpc("calculate_multi_indicator_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "LONG" }),
    ]);

    const scores = {
      trend_momentum: tmRes.data ?? 0,
      mean_reversion: mrRes.data ?? 0,
      ichimoku: ichRes.data ?? 0,
      volume_vwap: vvRes.data ?? 0,
      multi_indicator: miRes.data ?? 0,
    };

    // Build prompt
    const prompt = `Du bist ein professioneller Trading-Analyst. Analysiere ${symbol} basierend auf folgenden Daten:

**Aktueller Kurs:** ${latestPrice?.close ?? "N/A"} (${analysisDate})
**Letzte 5 Tage:** ${prices.slice(0, 5).map(p => `${p.date}: O${p.open} H${p.high} L${p.low} C${p.close}`).join(" | ")}

**Strategie-Scores (LONG):**
- Trend/Momentum: ${scores.trend_momentum}/100
- Mean Reversion: ${scores.mean_reversion}/100
- Ichimoku: ${scores.ichimoku}/100
- Volume/VWAP: ${scores.volume_vwap}/100
- Multi-Indicator: ${scores.multi_indicator}/100

**Aktive Indikatoren:** ${indicators.slice(0, 10).map(i => `${i.indicator_name}=${i.value_1}`).join(", ")}
**Aktive ICE-Signale:** ${signals.length > 0 ? signals.map(s => `${s.signal_type} ${s.direction} (Stärke: ${s.signal_strength})`).join(", ") : "Keine"}
**Letzte Entscheidungen:** ${decisions.map(d => `${d.action_type} (${d.confidence_score}%)`).join(", ") || "Keine"}

Gib eine strukturierte Analyse mit:
1. **Gesamteinschätzung** (LONG/SHORT/NEUTRAL + Konfidenz 0-100%)
2. **Technische Zusammenfassung** (2-3 Sätze)
3. **Risiken** (1-2 Sätze)
4. **Empfehlung** (Entry, Stop-Loss, Take-Profit falls anwendbar)`;

    let aiAnalysis = "AI-Analyse nicht verfügbar (kein API Key konfiguriert)";

    if (claudeApiKey) {
      try {
        const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": claudeApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiAnalysis = aiData.content?.[0]?.text ?? "Keine Antwort vom AI-Modell";
        } else {
          const errText = await aiResponse.text();
          console.error("Claude API error:", aiResponse.status, errText);
          aiAnalysis = `AI-Fehler (${aiResponse.status}): ${errText.slice(0, 200)}`;
        }
      } catch (aiErr) {
        console.error("Claude fetch error:", aiErr);
        aiAnalysis = `AI-Fehler: ${aiErr.message}`;
      }
    }

    // Store in elliott_wave_analysis as AI analysis
    await supabase.from("elliott_wave_analysis").upsert(
      {
        symbol,
        analysis_date: analysisDate,
        ai_analysis: aiAnalysis,
        ai_model: "claude-sonnet-4-20250514",
        primary_confidence: scores.trend_momentum,
        primary_direction: scores.trend_momentum >= 50 ? "LONG" : "SHORT",
      },
      { onConflict: "symbol,analysis_date" }
    );

    return new Response(
      JSON.stringify({
        symbol,
        date: analysisDate,
        scores,
        latest_price: latestPrice?.close,
        ai_analysis: aiAnalysis,
        active_signals: signals.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
