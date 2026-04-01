import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { userId, email, firstName } = await req.json();

    if (!userId || !email || !firstName) {
      return new Response(JSON.stringify({ error: "userId, email, and firstName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const day1 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const day3 = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const records = [
      { user_id: userId, email, first_name: firstName, email_type: "welcome", scheduled_at: now.toISOString() },
      { user_id: userId, email, first_name: firstName, email_type: "setup_guide", scheduled_at: day1.toISOString() },
      { user_id: userId, email, first_name: firstName, email_type: "day3_checkin", scheduled_at: day3.toISOString() },
    ];

    const { data: inserted, error: insertErr } = await supabase
      .from("onboarding_emails")
      .insert(records)
      .select("id, email_type, scheduled_at");

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const welcomeRecord = inserted?.find((r: { email_type: string }) => r.email_type === "welcome");
    if (welcomeRecord) {
      EdgeRuntime.waitUntil(
        fetch(`${supabaseUrl}/functions/v1/send-onboarding-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ onboardingEmailId: welcomeRecord.id }),
        }).catch(() => {})
      );
    }

    return new Response(
      JSON.stringify({ success: true, scheduled: inserted?.length ?? 0, records: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
