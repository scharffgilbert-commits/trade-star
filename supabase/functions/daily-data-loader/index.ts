import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const CONCURRENCY = 5;
const BATCH_DELAY_MS = 1500;
const MAX_RETRIES = 3;

interface PriceRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ─── Yahoo Finance v8 Chart JSON fetch with retry ─────────────────
async function fetchYahooChart(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<PriceRow[]> {
  const period1 = Math.floor(startDate.getTime() / 1000);
  const period2 = Math.floor(endDate.getTime() / 1000);
  const encoded = encodeURIComponent(symbol);
  const url = `${YAHOO_CHART}/${encoded}?period1=${period1}&period2=${period2}&interval=1d&events=history`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });

      if (resp.ok) {
        const json = await resp.json();
        const result = json?.chart?.result?.[0];
        if (!result || !result.timestamp) {
          throw new Error(`No chart data for ${symbol}`);
        }
        return parseChartJSON(result);
      }

      if (resp.status === 429 || resp.status === 403) {
        const wait = Math.pow(2, attempt) * 1000;
        console.warn(
          `${symbol}: Rate limited (${resp.status}), retry ${attempt}/${MAX_RETRIES} in ${wait}ms`
        );
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if (resp.status >= 500) {
        const wait = 2000 * attempt;
        console.warn(
          `${symbol}: Server error ${resp.status}, retry ${attempt}/${MAX_RETRIES}`
        );
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      throw new Error(`Yahoo returned ${resp.status} for ${symbol}`);
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error(`Failed to fetch ${symbol} after ${MAX_RETRIES} retries`);
}

// ─── Parse Yahoo v8 Chart JSON to price rows ─────────────────────
function parseChartJSON(result: Record<string, unknown>): PriceRow[] {
  const timestamps = result.timestamp as number[];
  const quote = (result.indicators as Record<string, unknown[]>)
    .quote[0] as Record<string, (number | null)[]>;

  const prices: PriceRow[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const open = quote.open[i];
    const high = quote.high[i];
    const low = quote.low[i];
    const close = quote.close[i];
    const volume = quote.volume[i];

    // Skip null entries (market holidays, missing data)
    if (open == null || high == null || low == null || close == null) continue;

    // Convert Unix timestamp to YYYY-MM-DD
    const d = new Date(timestamps[i] * 1000);
    const date = d.toISOString().split("T")[0];

    prices.push({
      date,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: volume ?? 0,
    });
  }

  return prices;
}

// ─── Upsert prices via parent table (PostgreSQL routes to partitions) ──
async function upsertPrices(
  supabase: ReturnType<typeof createClient>,
  symbol: string,
  prices: PriceRow[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  const records = prices.map((r) => ({
    symbol,
    date: r.date,
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
    data_source: "YAHOO_FINANCE",
  }));

  // Batch upsert via parent table (max 500 per batch)
  for (let i = 0; i < records.length; i += 500) {
    const batch = records.slice(i, i + 500);
    const { data, error } = await supabase
      .from("stock_prices")
      .upsert(batch, { onConflict: "symbol,date" })
      .select("symbol,date");
    if (error) {
      console.error(`${symbol}/stock_prices ERROR: ${JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint })}`);
      errors += batch.length;
    } else {
      inserted += data?.length ?? batch.length;
      console.log(`${symbol}: upserted ${data?.length ?? "?"} rows`);
    }
  }

  return { inserted, errors };
}

// ─── Process a single symbol ─────────────────────────────────────
async function processSymbol(
  supabase: ReturnType<typeof createClient>,
  symbol: string,
  startDate: Date,
  endDate: Date,
  runIndicators: boolean
): Promise<{
  symbol: string;
  status: "ok" | "error";
  prices: number;
  latestDate?: string;
  error?: string;
}> {
  try {
    const prices = await fetchYahooChart(symbol, startDate, endDate);

    if (prices.length === 0) {
      return {
        symbol,
        status: "error",
        prices: 0,
        error: "No data from Yahoo",
      };
    }

    const result = await upsertPrices(supabase, symbol, prices);
    const latestDate = prices[prices.length - 1].date;

    if (runIndicators) {
      try {
        await supabase.rpc("calculate_all_indicators", { p_symbol: symbol });
      } catch (e) {
        console.warn(`${symbol}: Indicator calc failed: ${e.message}`);
      }
      try {
        await supabase.rpc("detect_ice_signals", {
          p_symbol: symbol,
          p_date: latestDate,
        });
      } catch (e) {
        console.warn(`${symbol}: ICE signal detection failed: ${e.message}`);
      }
    }

    return {
      symbol,
      status: "ok",
      prices: result.inserted,
      errors: result.errors,
      fetched: prices.length,
      latestDate,
    };
  } catch (err) {
    return { symbol, status: "error", prices: 0, error: err.message };
  }
}

// ─── Batch processor with concurrency limit ──────────────────────
async function processBatch<T>(
  items: T[],
  concurrency: number,
  delayMs: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    await Promise.allSettled(batch.map(fn));
    if (i + concurrency < items.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

// ─── Main handler ────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      symbol,
      symbols: symbolList,
      mode = "single", // single | bulk | backfill
      days = 30,
      start_date,
      run_indicators = true,
    } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Calculate date range
    const endDate = new Date();
    let startDate: Date;

    if (mode === "backfill" && start_date) {
      startDate = new Date(start_date);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Determine symbols
    let symbolsToProcess: string[] = [];

    if (mode === "bulk") {
      const { data: dbSymbols, error: symErr } = await supabase
        .from("symbols_master")
        .select("symbol")
        .eq("active", true);
      if (symErr) throw symErr;
      symbolsToProcess = (dbSymbols ?? []).map((s) => s.symbol);
    } else if (symbolList && Array.isArray(symbolList)) {
      symbolsToProcess = symbolList;
    } else if (symbol) {
      symbolsToProcess = [symbol];
    } else {
      return new Response(
        JSON.stringify({
          error: "Provide symbol, symbols array, or mode=bulk",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `Processing ${symbolsToProcess.length} symbols (mode=${mode}, days=${days}, indicators=${run_indicators})`
    );

    const results: Array<{
      symbol: string;
      status: string;
      prices: number;
      errors?: number;
      fetched?: number;
      latestDate?: string;
      error?: string;
    }> = [];

    await processBatch(
      symbolsToProcess,
      CONCURRENCY,
      BATCH_DELAY_MS,
      async (sym) => {
        const result = await processSymbol(
          supabase,
          sym,
          startDate,
          endDate,
          run_indicators
        );
        results.push(result);
        console.log(
          `${result.symbol}: ${result.status} (${result.prices} prices${result.error ? ", err: " + result.error : ""})`
        );
      }
    );

    const succeeded = results.filter((r) => r.status === "ok").length;
    const failed = results.filter((r) => r.status === "error").length;
    const totalPrices = results.reduce((sum, r) => sum + r.prices, 0);

    // Log API usage
    try {
      await supabase.from("api_usage_log").insert({
        api_name: "YAHOO_FINANCE",
        endpoint: "v8/chart",
        symbol: mode === "bulk" ? "BULK" : symbolsToProcess.join(","),
        http_status: 200,
        success: failed === 0,
      });
    } catch (_) {
      // non-critical
    }

    return new Response(
      JSON.stringify({
        success: failed === 0,
        mode,
        symbols_total: symbolsToProcess.length,
        succeeded,
        failed,
        total_prices: totalPrices,
        results: results.sort((a, b) => a.symbol.localeCompare(b.symbol)),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("daily-data-loader error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
