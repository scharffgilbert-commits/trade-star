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
      throw new Error(`Keine Kursdaten für ${symbol} am ${analysisDate}`);
    }

    // ── 2. Calculate scores for BOTH directions ─────────────────
    const scoreFunctions = [
      "calculate_trend_momentum_score",
      "calculate_mean_reversion_score",
      "calculate_ichimoku_score",
      "calculate_volume_vwap_score",
      "calculate_multi_indicator_score",
    ];

    const [longResults, shortResults] = await Promise.all([
      Promise.all(
        scoreFunctions.map((fn) =>
          supabase.rpc(fn, { p_symbol: symbol, p_date: analysisDate, p_direction: "LONG" })
        )
      ),
      Promise.all(
        scoreFunctions.map((fn) =>
          supabase.rpc(fn, { p_symbol: symbol, p_date: analysisDate, p_direction: "SHORT" })
        )
      ),
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

    // CROC/ICE scores
    const [crocLong, crocShort] = await Promise.all([
      supabase.rpc("calculate_croc_ice_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "LONG" }),
      supabase.rpc("calculate_croc_ice_score", { p_symbol: symbol, p_date: analysisDate, p_direction: "SHORT" }),
    ]);

    const crocLongScore = crocLong.data ?? 0;
    const crocShortScore = crocShort.data ?? 0;

    // ── 3. Calculate 4-Strand Scores ────────────────────────────
    // S1 Technical (30%): Average of TM, MR, MI
    const s1Long = Math.round((longScores.trend_momentum + longScores.mean_reversion + longScores.multi_indicator) / 3);
    const s1Short = Math.round((shortScores.trend_momentum + shortScores.mean_reversion + shortScores.multi_indicator) / 3);

    // S2 Ichimoku (25%)
    const s2Long = longScores.ichimoku;
    const s2Short = shortScores.ichimoku;

    // S3 Volume/VWAP (25%)
    const s3Long = longScores.volume_vwap;
    const s3Short = shortScores.volume_vwap;

    // S4 CROC/ICE (20%)
    const s4Long = crocLongScore;
    const s4Short = crocShortScore;

    const strands = {
      s1: { long: s1Long, short: s1Short },
      s2: { long: s2Long, short: s2Short },
      s3: { long: s3Long, short: s3Short },
      s4: { long: s4Long, short: s4Short },
    };

    // ── 4. AI Analysis via Claude ───────────────────────────────
    const currentPrice = Number(latestPrice.close);

    const prompt = `Du bist ein professioneller Trading-Analyst. Analysiere ${symbol} und gib NUR ein JSON-Objekt zurück (kein Markdown, kein Text davor/danach).

**Aktueller Kurs:** $${currentPrice} (${analysisDate})
**Letzte 5 Tage:**
${prices.slice(0, 5).map(p => `${p.date}: O:${p.open} H:${p.high} L:${p.low} C:${p.close} V:${p.volume}`).join("\n")}

**4-Strang Scores (LONG / SHORT):**
- S1 Technical (30%): ${s1Long} / ${s1Short}
- S2 Ichimoku (25%): ${s2Long} / ${s2Short}
- S3 Volume/VWAP (25%): ${s3Long} / ${s3Short}
- S4 CROC/ICE (20%): ${s4Long} / ${s4Short}

**Aktive Indikatoren:** ${indicators.slice(0, 15).map(i => `${i.indicator_name}=${i.value_1}`).join(", ")}
**Aktive ICE-Signale:** ${signals.length > 0 ? signals.map(s => `${s.signal_type} ${s.direction} (${s.signal_strength})`).join(", ") : "Keine"}
**Letzte Entscheidungen:** ${decisions.map(d => `${d.action_type} (${d.confidence_score}%)`).join(", ") || "Keine"}

Antworte NUR mit diesem JSON (ersetze die Platzhalter):
{
  "action": "LONG oder SHORT oder CASH",
  "confidence": 0-100,
  "reasoning": "2-3 Sätze Begründung",
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
- trailing_stop_percent: Prozent vom Entry für Trailing-Stop (z.B. 3.0 = 3%)
- CASH wenn kein klares Signal (Konfidenz < 40)
- Confidence basiert auf Strang-Übereinstimmung und Signal-Stärke`;

    let aiDecision = {
      action: "CASH" as string,
      confidence: 30,
      reasoning: "AI-Analyse nicht verfügbar",
      entry_price: currentPrice,
      stop_loss: null as number | null,
      take_profit_1: null as number | null,
      take_profit_2: null as number | null,
      take_profit_3: null as number | null,
      trailing_stop_percent: 3.0,
    };

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
          const rawText = aiData.content?.[0]?.text ?? "";

          // Parse JSON from response (handle markdown code blocks)
          let jsonStr = rawText;
          const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1];
          }

          try {
            const parsed = JSON.parse(jsonStr.trim());
            aiDecision = {
              action: parsed.action || "CASH",
              confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 30)),
              reasoning: parsed.reasoning || "Keine Begründung",
              entry_price: Number(parsed.entry_price) || currentPrice,
              stop_loss: parsed.stop_loss ? Number(parsed.stop_loss) : null,
              take_profit_1: parsed.take_profit_1 ? Number(parsed.take_profit_1) : null,
              take_profit_2: parsed.take_profit_2 ? Number(parsed.take_profit_2) : null,
              take_profit_3: parsed.take_profit_3 ? Number(parsed.take_profit_3) : null,
              trailing_stop_percent: Number(parsed.trailing_stop_percent) || 3.0,
            };
          } catch (parseErr) {
            console.error("JSON parse failed, using score-based fallback:", parseErr.message);
            // Fallback: use scores to determine direction
            const longTotal = s1Long * 0.3 + s2Long * 0.25 + s3Long * 0.25 + s4Long * 0.2;
            const shortTotal = s1Short * 0.3 + s2Short * 0.25 + s3Short * 0.25 + s4Short * 0.2;

            if (longTotal > shortTotal && longTotal > 50) {
              aiDecision.action = "LONG";
              aiDecision.confidence = Math.round(longTotal);
              aiDecision.stop_loss = Math.round(currentPrice * 0.97 * 100) / 100;
              aiDecision.take_profit_1 = Math.round(currentPrice * 1.03 * 100) / 100;
              aiDecision.take_profit_2 = Math.round(currentPrice * 1.05 * 100) / 100;
              aiDecision.take_profit_3 = Math.round(currentPrice * 1.08 * 100) / 100;
            } else if (shortTotal > longTotal && shortTotal > 50) {
              aiDecision.action = "SHORT";
              aiDecision.confidence = Math.round(shortTotal);
              aiDecision.stop_loss = Math.round(currentPrice * 1.03 * 100) / 100;
              aiDecision.take_profit_1 = Math.round(currentPrice * 0.97 * 100) / 100;
              aiDecision.take_profit_2 = Math.round(currentPrice * 0.95 * 100) / 100;
              aiDecision.take_profit_3 = Math.round(currentPrice * 0.92 * 100) / 100;
            }
            aiDecision.reasoning = rawText.slice(0, 300);
          }
        } else {
          const errText = await aiResponse.text();
          console.error("Claude API error:", aiResponse.status, errText);
          aiDecision.reasoning = `AI-Fehler (${aiResponse.status})`;
        }
      } catch (aiErr) {
        console.error("Claude fetch error:", aiErr);
        aiDecision.reasoning = `AI-Fehler: ${aiErr.message}`;
      }
    }

    // ── 5. Save to trading_decisions ─────────────────────────────
    const decisionRow = {
      symbol,
      decision_timestamp: new Date().toISOString(),
      action_type: aiDecision.action,
      confidence_score: aiDecision.confidence,
      reasoning: aiDecision.reasoning,
      entry_price: aiDecision.entry_price,
      stop_loss: aiDecision.stop_loss,
      take_profit_1: aiDecision.take_profit_1,
      take_profit_2: aiDecision.take_profit_2,
      take_profit_3: aiDecision.take_profit_3,
      trailing_stop_percent: aiDecision.trailing_stop_percent,
      // S1 Technical (30%)
      strand1_signal: s1Long > s1Short ? "LONG" : "SHORT",
      strand1_confidence: Math.max(s1Long, s1Short),
      strand1_long_score: s1Long,
      strand1_short_score: s1Short,
      // S2 Ichimoku (25%)
      strand2_signal: s2Long > s2Short ? "LONG" : "SHORT",
      strand2_confidence: Math.max(s2Long, s2Short),
      strand2_wave_pattern: null,
      strand2_direction_bias: s2Long > s2Short ? "BULLISH" : "BEARISH",
      // S3 Volume/VWAP (25%)
      strand3_signal: s3Long > s3Short ? "LONG" : "SHORT",
      strand3_confidence: Math.max(s3Long, s3Short),
      strand3_long_score: s3Long,
      strand3_short_score: s3Short,
      // S4 CROC/ICE (20%)
      strand4_signal: s4Long > s4Short ? "LONG" : "SHORT",
      strand4_confidence: Math.max(s4Long, s4Short),
      strand4_long_score: s4Long,
      strand4_short_score: s4Short,
      // CROC/ICE meta
      croc_status: signals.length > 0 ? "ACTIVE" : "NEUTRAL",
      ice_signals_active: String(signals.length),
    };

    const { data: insertedDecision, error: insertError } = await supabase
      .from("trading_decisions")
      .insert(decisionRow)
      .select("decision_id")
      .single();

    if (insertError) {
      console.error("trading_decisions insert error:", insertError);
    }

    // Also save to elliott_wave_analysis
    await supabase.from("elliott_wave_analysis").upsert(
      {
        symbol,
        analysis_date: analysisDate,
        ai_analysis: aiDecision.reasoning,
        ai_model: "claude-sonnet-4-20250514",
        primary_confidence: aiDecision.confidence,
        primary_direction: aiDecision.action,
      },
      { onConflict: "symbol,analysis_date" }
    );

    // ── 6. Response ─────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        symbol,
        date: analysisDate,
        action_type: aiDecision.action,
        confidence_score: aiDecision.confidence,
        reasoning: aiDecision.reasoning,
        entry_price: aiDecision.entry_price,
        stop_loss: aiDecision.stop_loss,
        take_profit_1: aiDecision.take_profit_1,
        take_profit_2: aiDecision.take_profit_2,
        take_profit_3: aiDecision.take_profit_3,
        trailing_stop_percent: aiDecision.trailing_stop_percent,
        latest_price: currentPrice,
        active_signals: signals.length,
        strands,
        decision_id: insertedDecision?.decision_id ?? null,
        insert_error: insertError?.message ?? null,
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
