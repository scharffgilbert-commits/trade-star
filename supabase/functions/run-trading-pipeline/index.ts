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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { mode = "full" } = await req.json();

    // Start workflow run
    const { data: runIdData, error: runErr } = await supabase.rpc("start_workflow_run", {
      p_workflow_name: `pipeline_${mode}`,
      p_trigger_source: "MANUAL",
    });
    if (runErr) throw runErr;
    const runId = runIdData as number;

    // Get active symbols
    const { data: symbols, error: symErr } = await supabase
      .from("symbols_master")
      .select("symbol")
      .eq("active", true);
    if (symErr) throw symErr;

    const symbolList = (symbols ?? []).map((s) => s.symbol);
    let succeeded = 0;
    let failed = 0;
    const errors: Record<string, string> = {};

    for (const symbol of symbolList) {
      try {
        if (mode === "full" || mode === "data_only") {
          // Check API rate limit before fetching
          const { data: rateData } = await supabase.rpc("check_api_rate_limit");
          const rateInfo = rateData?.[0];
          if (rateInfo && !rateInfo.can_proceed) {
            errors[symbol] = "API rate limit reached";
            failed++;
            continue;
          }
        }

        if (mode === "full" || mode === "analysis_only") {
          // Calculate all technical indicators
          await supabase.rpc("calculate_all_indicators", { p_symbol: symbol });

          // Detect ICE signals
          const today = new Date().toISOString().slice(0, 10);
          await supabase.rpc("detect_ice_signals", { p_symbol: symbol, p_date: today });

          // Validate data quality
          await supabase.rpc("validate_symbol_data_quality", { p_symbol: symbol });
        }

        // Log analysis
        await supabase.from("signal_analysis_log").insert({
          symbol,
          status: "completed",
          workflow_run_id: runId,
        });

        succeeded++;
      } catch (e) {
        errors[symbol] = e.message ?? "Unknown error";
        failed++;

        await supabase.from("signal_analysis_log").insert({
          symbol,
          status: "error",
          error_message: e.message ?? "Unknown error",
          workflow_run_id: runId,
        });
      }
    }

    // Complete workflow
    await supabase.rpc("complete_workflow_run", {
      p_run_id: runId,
      p_status: failed === 0 ? "completed" : "partial",
      p_symbols_processed: symbolList.length,
      p_symbols_succeeded: succeeded,
      p_symbols_failed: failed,
      p_metadata: { mode, errors },
    });

    return new Response(
      JSON.stringify({
        run_id: runId,
        mode,
        symbols_processed: symbolList.length,
        succeeded,
        failed,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
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
