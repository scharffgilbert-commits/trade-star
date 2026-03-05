import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * V7.0 Self-Optimization Edge Function
 *
 * Modes:
 * - weekly:  Analyze last 4 weeks, adjust min_v7_score if needed
 * - monthly: Deep analysis (worst trades, score correlation, parameter tuning)
 *
 * Called by pg_cron:
 * - Sunday 18:00 UTC → weekly
 * - 1st of month 17:00 UTC → monthly
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const mode = body.mode ?? "weekly";
    const accountId = body.account_id ?? 3;

    console.log(`V7 Optimizer: mode=${mode}, account_id=${accountId}`);

    // Call the SQL optimization function
    const { data: result, error } = await supabase.rpc(
      "evaluate_v7_performance",
      {
        p_mode: mode,
        p_account_id: accountId,
      },
    );

    if (error) {
      console.error("V7 Optimizer error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("V7 Optimizer result:", JSON.stringify(result));

    // Log to workflow_runs for tracking
    await supabase.from("workflow_runs").insert({
      workflow_type: `v7_optimize_${mode}`,
      status: "completed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      result_summary: result,
    });

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        account_id: accountId,
        ...result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("V7 Optimizer fatal error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
