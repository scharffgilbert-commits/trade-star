// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTRADAY PRICE UPDATER — Live-Kurse für offene Positionen
// Wird alle 15 Min. via pg_cron während Handelszeiten aufgerufen
// Quelle: Yahoo Finance v8 Chart API → meta.regularMarketPrice
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MAX_RETRIES = 2;
const CONCURRENCY = 5;
const BATCH_DELAY_MS = 500;

// ━━━ Aktuellen Kurs von Yahoo Finance holen ━━━
interface QuoteResult {
  symbol: string;
  price: number;
  marketState: string; // "REGULAR", "PRE", "POST", "CLOSED"
  timestamp: number;
}

async function fetchCurrentPrice(symbol: string): Promise<QuoteResult | null> {
  const encoded = encodeURIComponent(symbol);
  // range=1d&interval=1d → minimale Datenmenge, aber meta.regularMarketPrice ist aktuell
  const url = `${YAHOO_CHART}/${encoded}?range=1d&interval=1d`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });

      if (resp.ok) {
        const json = await resp.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (!meta || meta.regularMarketPrice == null) {
          console.warn(`${symbol}: No regularMarketPrice in response`);
          return null;
        }
        return {
          symbol,
          price: Math.round(meta.regularMarketPrice * 100) / 100,
          marketState: meta.marketState ?? "UNKNOWN",
          timestamp: meta.regularMarketTime ?? Math.floor(Date.now() / 1000),
        };
      }

      if (resp.status === 429 || resp.status === 403) {
        const wait = Math.pow(2, attempt) * 1000;
        console.warn(`${symbol}: Rate limited (${resp.status}), retry ${attempt}/${MAX_RETRIES} in ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      console.error(`${symbol}: Yahoo returned ${resp.status}`);
      return null;
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error(`${symbol}: Failed after ${MAX_RETRIES} retries:`, err);
        return null;
      }
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  return null;
}

// ━━━ Batch-Fetch mit Concurrency-Limit ━━━
async function fetchPricesBatched(symbols: string[]): Promise<Map<string, QuoteResult>> {
  const results = new Map<string, QuoteResult>();

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);
    const promises = batch.map((sym) => fetchCurrentPrice(sym));
    const batchResults = await Promise.allSettled(promises);

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value) {
        results.set(result.value.symbol, result.value);
      }
    }

    // Delay zwischen Batches (Rate Limiting)
    if (i + CONCURRENCY < symbols.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return results;
}

// ━━━ P&L berechnen ━━━
function calculatePnL(
  positionType: string,
  entryPrice: number,
  currentPrice: number,
  quantity: number
): { pnlAmount: number; pnlPercent: number } {
  const isLong = positionType === "LONG";
  const pnlAmount = isLong
    ? (currentPrice - entryPrice) * quantity
    : (entryPrice - currentPrice) * quantity;
  const pnlPercent = isLong
    ? ((currentPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - currentPrice) / entryPrice) * 100;

  return {
    pnlAmount: Math.round(pnlAmount * 100) / 100,
    pnlPercent: Math.round(pnlPercent * 100) / 100,
  };
}

// ━━━ MAIN ━━━
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Alle offenen Positionen holen (alle Accounts)
    const { data: positions, error: posError } = await supabase
      .from("demo_positions")
      .select("id, account_id, symbol, position_type, quantity, entry_price, current_price")
      .eq("position_status", "OPEN");

    if (posError) throw new Error(`DB error: ${posError.message}`);
    if (!positions?.length) {
      return jsonResponse({ message: "No open positions", updated: 0, duration_ms: Date.now() - startTime });
    }

    // 2. Unique Symbole extrahieren
    const symbols = [...new Set(positions.map((p: any) => p.symbol))];
    console.log(`Fetching intraday prices for ${symbols.length} symbols: ${symbols.join(", ")}`);

    // 3. Aktuelle Kurse von Yahoo Finance holen
    const prices = await fetchPricesBatched(symbols);
    console.log(`Got prices for ${prices.size}/${symbols.length} symbols`);

    // 4. Positionen updaten (current_price + P&L)
    let updated = 0;
    let failed = 0;
    const details: any[] = [];

    for (const pos of positions) {
      const quote = prices.get(pos.symbol);
      if (!quote) {
        failed++;
        continue;
      }

      const { pnlAmount, pnlPercent } = calculatePnL(
        pos.position_type,
        Number(pos.entry_price),
        quote.price,
        Number(pos.quantity)
      );

      const { error: updateError } = await supabase
        .from("demo_positions")
        .update({
          current_price: quote.price,
          pnl_amount: pnlAmount,
          pnl_percent: pnlPercent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pos.id);

      if (updateError) {
        console.error(`Failed to update position ${pos.id} (${pos.symbol}):`, updateError);
        failed++;
      } else {
        updated++;
        details.push({
          symbol: pos.symbol,
          account_id: pos.account_id,
          old_price: Number(pos.current_price),
          new_price: quote.price,
          change: Math.round((quote.price - Number(pos.current_price)) * 100) / 100,
          pnl_amount: pnlAmount,
          pnl_percent: pnlPercent,
          market_state: quote.marketState,
        });
      }
    }

    // 5. reserved_balance & margin_used reconciliation (alle 15 Min.)
    // V8.4: Nutze margin_required statt qty*entry für CFD-Accounts (Leverage)
    const accountIds = [...new Set(positions.map((p: any) => p.account_id))];
    for (const accId of accountIds) {
      const { data: accPositions } = await supabase
        .from("demo_positions")
        .select("quantity, entry_price, margin_required")
        .eq("account_id", accId)
        .eq("position_status", "OPEN");

      if (accPositions?.length) {
        // margin_required = qty*price/leverage (CFD) oder qty*price (Cash)
        const totalMargin = accPositions.reduce(
          (sum: number, p: any) => sum + Number(p.margin_required ?? (Number(p.quantity) * Number(p.entry_price))),
          0
        );
        await supabase
          .from("demo_accounts")
          .update({
            reserved_balance: Math.round(totalMargin * 100) / 100,
            margin_used: Math.round(totalMargin * 100) / 100,
          })
          .eq("id", accId);
      }
    }

    const duration = Date.now() - startTime;
    const result = {
      message: `Intraday update: ${updated} positions updated, ${failed} failed`,
      symbols_fetched: prices.size,
      symbols_total: symbols.length,
      positions_updated: updated,
      positions_failed: failed,
      accounts_updated: accountIds.length,
      duration_ms: duration,
      details,
    };

    console.log(`Intraday update complete: ${updated}/${positions.length} in ${duration}ms`);
    return jsonResponse(result);
  } catch (err) {
    console.error("intraday-price-updater error:", err);
    return new Response(JSON.stringify({ error: err.message, duration_ms: Date.now() - startTime }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
