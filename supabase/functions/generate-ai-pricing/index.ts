import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SuggestionInput {
  hotel_id: string;
  tenant_id?: string | null;
  occupancy_data: Record<string, number>;
  current_rates: Array<{ room_type_id: string; room_type_name: string; base_rate: number }>;
  booking_pace: Record<string, number>;
  dow_patterns: Record<string, number>;
}

interface AISuggestion {
  date: string;
  room_type_id: string;
  room_type_name: string;
  suggested_rate: number;
  confidence_score: number;
  reasoning: string;
  factors: {
    demand: string;
    competition: string;
    day_type: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    const body: SuggestionInput = await req.json();
    const { hotel_id, tenant_id, occupancy_data, current_rates, booking_pace, dow_patterns } = body;

    if (!hotel_id || !current_rates?.length) {
      return new Response(
        JSON.stringify({ error: "hotel_id and current_rates are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let suggestions: AISuggestion[] = [];

    if (anthropicKey) {
      const prompt = `You are a hotel revenue management expert. Given this hotel's data:

Current occupancy for next 30 days: ${JSON.stringify(occupancy_data)}
Current rates per room type: ${JSON.stringify(current_rates)}
Historical booking pace: ${JSON.stringify(booking_pace)}
Day of week patterns: ${JSON.stringify(dow_patterns)}

Generate rate suggestions for each room type for each of the next 30 days.
Respond with a JSON array of objects: {date, room_type_id, room_type_name, suggested_rate, confidence_score (0-100), reasoning (max 20 words), factors: {demand: 'low/medium/high', competition: 'low/medium/high', day_type: 'weekday/weekend/holiday'}}.
Respond with ONLY the JSON array, no other text.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (response.ok) {
        const aiResponse = await response.json();
        const text = aiResponse.content?.[0]?.text ?? "[]";
        try {
          suggestions = JSON.parse(text);
        } catch {
          suggestions = [];
        }
      }
    }

    if (!suggestions.length) {
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        const dayOfWeek = d.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const occupancy = occupancy_data[dateStr] ?? 50;

        for (const rt of current_rates) {
          let multiplier = 1.0;
          if (isWeekend) multiplier += 0.1;
          if (occupancy > 80) multiplier += 0.15;
          else if (occupancy > 60) multiplier += 0.05;
          else if (occupancy < 30) multiplier -= 0.1;

          const suggestedRate = Math.round(rt.base_rate * multiplier);
          const changePct = ((suggestedRate - rt.base_rate) / rt.base_rate) * 100;

          let reasoning = "Base rate maintained";
          if (changePct > 5) reasoning = isWeekend ? "Weekend demand premium" : "High occupancy — increase rate";
          else if (changePct < -5) reasoning = "Low demand — reduce to stimulate bookings";

          const demand = occupancy > 70 ? "high" : occupancy > 40 ? "medium" : "low";

          suggestions.push({
            date: dateStr,
            room_type_id: rt.room_type_id,
            room_type_name: rt.room_type_name,
            suggested_rate: suggestedRate,
            confidence_score: Math.min(95, 50 + Math.round(occupancy * 0.4)),
            reasoning,
            factors: {
              demand,
              competition: "medium",
              day_type: isWeekend ? "weekend" : "weekday",
            },
          });
        }
      }
    }

    await supabase
      .from("ai_price_suggestions")
      .delete()
      .eq("hotel_id", hotel_id)
      .eq("applied", false);

    const rows = suggestions.map((s) => {
      const rt = current_rates.find((r) => r.room_type_id === s.room_type_id);
      return {
        hotel_id,
        ...(tenant_id ? { tenant_id } : {}),
        room_type_id: s.room_type_id,
        date: s.date,
        current_rate: rt?.base_rate ?? 0,
        suggested_rate: s.suggested_rate,
        confidence_score: s.confidence_score,
        reasoning: s.reasoning,
        factors: s.factors,
        applied: false,
      };
    });

    const { error: insertError } = await supabase.from("ai_price_suggestions").insert(rows);

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, count: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
