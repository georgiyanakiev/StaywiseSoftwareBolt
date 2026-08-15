import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface YieldFactors {
  demand: "low" | "medium" | "high";
  day_type: "weekday" | "weekend";
  lead_time: "same_day" | "last_minute" | "short" | "medium" | "advance";
  pickup: "accelerating" | "stable" | "decelerating";
  competition: "low" | "medium" | "high";
  occupancy_pct: number;
}

interface ComputedSuggestion {
  date: string;
  room_type_id: string;
  room_type_name: string;
  current_rate: number;
  suggested_rate: number;
  confidence_score: number;
  reasoning: string;
  factors: YieldFactors;
}

function leadTimeBucket(days: number): YieldFactors["lead_time"] {
  if (days === 0) return "same_day";
  if (days <= 3) return "last_minute";
  if (days <= 14) return "short";
  if (days <= 45) return "medium";
  return "advance";
}

function leadTimeMultiplier(days: number): number {
  if (days === 0) return 1.25;
  if (days <= 3) return 1.18;
  if (days <= 7) return 1.12;
  if (days <= 14) return 1.06;
  if (days <= 30) return 1.02;
  if (days <= 60) return 1.0;
  return 0.96;
}

function occupancyMultiplier(pct: number): number {
  if (pct >= 92) return 1.40;
  if (pct >= 85) return 1.28;
  if (pct >= 75) return 1.15;
  if (pct >= 60) return 1.05;
  if (pct >= 45) return 1.00;
  if (pct >= 28) return 0.93;
  return 0.85;
}

function pickupMultiplier(pickupVsAvg: number): number {
  if (pickupVsAvg >= 2.5) return 1.12;
  if (pickupVsAvg >= 1.5) return 1.06;
  if (pickupVsAvg >= 0.6) return 1.0;
  if (pickupVsAvg >= 0.2) return 0.95;
  return 0.90;
}

function pickupBucket(pickupVsAvg: number): YieldFactors["pickup"] {
  if (pickupVsAvg >= 1.5) return "accelerating";
  if (pickupVsAvg >= 0.5) return "stable";
  return "decelerating";
}

function demandBucket(pct: number): YieldFactors["demand"] {
  if (pct >= 70) return "high";
  if (pct >= 40) return "medium";
  return "low";
}

function buildReasoning(factors: YieldFactors, changePct: number): string {
  const signals: string[] = [];

  if (factors.demand === "high") signals.push("high occupancy pressure");
  else if (factors.demand === "low") signals.push("low demand");

  if (factors.pickup === "accelerating") signals.push("accelerating booking pace");
  else if (factors.pickup === "decelerating") signals.push("slow pickup");

  if (factors.day_type === "weekend") signals.push("weekend premium");

  if (factors.lead_time === "last_minute" || factors.lead_time === "same_day")
    signals.push("last-minute scarcity");
  else if (factors.lead_time === "advance") signals.push("advance-purchase discount");

  if (signals.length === 0) {
    return changePct > 0 ? "Moderate demand — slight increase recommended" : "Stable demand — base rate maintained";
  }

  const verb = changePct > 8 ? "Increase rate:" : changePct > 0 ? "Nudge rate up:" : changePct < -5 ? "Reduce rate:" : "Hold rate:";
  return `${verb} ${signals.join(", ")}`;
}

function confidenceScore(occ: number, hasPickupData: boolean, hasPickupForDate: boolean, leadDays: number): number {
  let score = 50;
  if (occ >= 75 || occ <= 25) score += 18;
  else if (occ >= 60 || occ <= 35) score += 10;
  else score += 4;
  if (hasPickupData) score += 10;
  if (hasPickupForDate) score += 6;
  if (leadDays <= 3) score += 8;
  else if (leadDays <= 14) score += 4;
  return Math.min(94, Math.max(45, score));
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

    const body = await req.json();
    const { hotel_id, tenant_id } = body as { hotel_id: string; tenant_id?: string | null };

    if (!hotel_id) {
      return new Response(
        JSON.stringify({ error: "hotel_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const horizon30 = new Date(today);
    horizon30.setDate(today.getDate() + 30);
    const horizon30Str = horizon30.toISOString().split("T")[0];
    const lookback14 = new Date(today);
    lookback14.setDate(today.getDate() - 14);
    const lookback14Str = lookback14.toISOString().split("T")[0];

    const [rtRes, roomsRes, resvRes, directRes, pickupRes, rulesRes] = await Promise.all([
      supabase.from("room_types").select("id, name, base_rate").eq("hotel_id", hotel_id),
      supabase.from("rooms").select("id, room_type_id").eq("hotel_id", hotel_id),
      supabase.from("reservations")
        .select("room_id, check_in, check_out, status")
        .eq("hotel_id", hotel_id)
        .in("status", ["confirmed", "checked_in", "checked_out"])
        .gte("check_out", todayStr)
        .lte("check_in", horizon30Str),
      supabase.from("direct_bookings")
        .select("room_type_id, check_in, check_out, status")
        .eq("hotel_id", hotel_id)
        .in("status", ["confirmed", "checked_in", "checked_out"])
        .gte("check_out", todayStr)
        .lte("check_in", horizon30Str),
      supabase.from("reservations")
        .select("check_in, check_out, created_at")
        .eq("hotel_id", hotel_id)
        .in("status", ["confirmed", "checked_in", "checked_out"])
        .gte("created_at", lookback14Str)
        .gte("check_in", todayStr),
      supabase.from("pricing_rules")
        .select("*")
        .eq("hotel_id", hotel_id)
        .eq("active", true),
    ]);

    interface FullPricingRule {
      id: string;
      name: string;
      type: string;
      room_type_id: string | null;
      date_from: string | null;
      date_to: string | null;
      days_of_week: number[] | null;
      occupancy_threshold_pct: number | null;
      days_before_arrival: number | null;
      adjustment_type: string;
      adjustment_value: number;
      min_rate: number | null;
      max_rate: number | null;
      priority: number;
      active: boolean;
    }

    const roomTypes = (rtRes.data ?? []).map(rt => ({ ...rt, base_rate: Number(rt.base_rate) })) as { id: string; name: string; base_rate: number }[];
    const rooms = (roomsRes.data ?? []) as { id: string; room_type_id: string }[];
    const reservations = (resvRes.data ?? []) as { room_id: string; check_in: string; check_out: string; status: string }[];
    const directBookings = (directRes.data ?? []) as { room_type_id: string; check_in: string; check_out: string; status: string }[];
    const recentBookings = (pickupRes.data ?? []) as { check_in: string; check_out: string; created_at: string }[];
    const rules = (rulesRes.data ?? []).map(r => ({
      ...r,
      adjustment_value: Number(r.adjustment_value),
      min_rate: r.min_rate != null ? Number(r.min_rate) : null,
      max_rate: r.max_rate != null ? Number(r.max_rate) : null,
      days_of_week: r.days_of_week ?? [],
    })) as FullPricingRule[];

    if (!roomTypes.length) {
      return new Response(
        JSON.stringify({ error: "No room types found for this hotel" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roomsByType: Record<string, string[]> = {};
    const totalRooms = rooms.length;
    for (const r of rooms) {
      if (!roomsByType[r.room_type_id]) roomsByType[r.room_type_id] = [];
      roomsByType[r.room_type_id].push(r.id);
    }

    const roomIdToType: Record<string, string> = {};
    for (const r of rooms) roomIdToType[r.id] = r.room_type_id;

    const avgDailyPickup = recentBookings.length / 14 / Math.max(totalRooms, 1);

    const suggestions: ComputedSuggestion[] = [];

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const leadDays = i;
      const dow = d.getDay();
      const isWeekend = dow === 0 || dow === 6;

      const occupiedRoomIds = new Set(
        reservations
          .filter(r => r.check_in <= dateStr && r.check_out > dateStr)
          .map(r => r.room_id)
      );
      const directOccupiedTypes = directBookings
        .filter(r => r.check_in <= dateStr && r.check_out > dateStr)
        .map(r => r.room_type_id);
      const occupiedCount = occupiedRoomIds.size + directOccupiedTypes.length;
      const occPct = totalRooms > 0 ? (occupiedCount / totalRooms) * 100 : 50;

      const pickupForDate = recentBookings.filter(
        r => r.check_in <= dateStr && r.check_out > dateStr
      ).length;
      const pickupVsAvg = avgDailyPickup > 0 ? pickupForDate / avgDailyPickup : 1;

      const hasPickupData = recentBookings.length > 0;

      const directOccupiedForType = directOccupiedTypes.filter(tid => tid === rt.id).length;

      for (const rt of roomTypes) {
        const typeRooms = roomsByType[rt.id]?.length ?? 0;
        const typeOccupied = typeRooms > 0
          ? Array.from(occupiedRoomIds).filter(rid => roomIdToType[rid] === rt.id).length + directOccupiedForType
          : 0;
        const typeOccPct = typeRooms > 0
          ? (typeOccupied / typeRooms) * 100
          : occPct;

        const demandMult = occupancyMultiplier(typeOccPct);
        const weekendMult = isWeekend ? 1.10 : 1.0;
        const ltMult = leadTimeMultiplier(leadDays);
        const paceMult = pickupMultiplier(pickupVsAvg);

        let rate = rt.base_rate * demandMult * weekendMult * ltMult * paceMult;

        const rtRules = rules
          .filter(r => r.room_type_id === rt.id || r.room_type_id === null)
          .sort((a, b) => b.priority - a.priority);

        const appliedRuleNames: string[] = [];
        for (const rule of rtRules) {
          let match = false;
          if (rule.type === "base_rate") match = true;
          if (rule.type === "seasonal" || rule.type === "event") {
            const from = rule.date_from ? new Date(rule.date_from) : null;
            const to = rule.date_to ? new Date(rule.date_to) : null;
            match = (!from || d >= from) && (!to || d <= to);
          }
          if (rule.type === "day_of_week") {
            match = (rule.days_of_week ?? []).includes(dow);
          }
          if (rule.type === "last_minute") {
            match = rule.days_before_arrival != null && leadDays <= rule.days_before_arrival;
          }
          if (rule.type === "early_bird") {
            match = rule.days_before_arrival != null && leadDays >= rule.days_before_arrival;
          }
          if (rule.type === "occupancy") {
            match = rule.occupancy_threshold_pct != null && typeOccPct >= rule.occupancy_threshold_pct;
          }
          if (!match) continue;

          const v = rule.adjustment_value;
          if (rule.adjustment_type === "percentage_increase") rate *= 1 + v / 100;
          else if (rule.adjustment_type === "percentage_decrease") rate *= 1 - v / 100;
          else if (rule.adjustment_type === "fixed_increase") rate += v;
          else if (rule.adjustment_type === "fixed_decrease") rate -= v;
          else if (rule.adjustment_type === "set_rate") rate = v;

          if (rule.min_rate != null) rate = Math.max(rate, rule.min_rate);
          if (rule.max_rate != null) rate = Math.min(rate, rule.max_rate);
          appliedRuleNames.push(rule.name);
        }

        rate = Math.round(rate / 5) * 5;

        const factors: YieldFactors = {
          demand: demandBucket(typeOccPct),
          day_type: isWeekend ? "weekend" : "weekday",
          lead_time: leadTimeBucket(leadDays),
          pickup: pickupBucket(pickupVsAvg),
          competition: "medium",
          occupancy_pct: Math.round(typeOccPct),
        };

        const changePct = rt.base_rate > 0 ? ((rate - rt.base_rate) / rt.base_rate) * 100 : 0;
        const reasoning = buildReasoning(factors, changePct);
        const hasPickupForDate = pickupForDate > 0;
        const confidence = confidenceScore(typeOccPct, hasPickupData, hasPickupForDate, leadDays);

        suggestions.push({
          date: dateStr,
          room_type_id: rt.id,
          room_type_name: rt.name,
          current_rate: rt.base_rate,
          suggested_rate: rate,
          confidence_score: confidence,
          reasoning,
          factors,
        });
      }
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    let finalSuggestions = suggestions;

    if (anthropicKey) {
      try {
        const summaryForAI = suggestions.slice(0, 60).map(s => ({
          date: s.date,
          room: s.room_type_name,
          base: s.current_rate,
          computed: s.suggested_rate,
          occ: s.factors.occupancy_pct,
          pickup: s.factors.pickup,
          lead: s.factors.lead_time,
          dow: s.factors.day_type,
        }));

        const prompt = `You are a hotel revenue management expert. A yield management algorithm has computed the following rate suggestions. Your job is to review them and return refined suggestions with improved reasoning text (max 18 words each). You may also adjust suggested_rate by ±10% if you identify factors the algorithm may have missed (e.g. local events, school holidays, market context).

Algorithm output (sample of ${summaryForAI.length} suggestions):
${JSON.stringify(summaryForAI)}

Return a JSON array where each element has: { date, room_type_name, suggested_rate, reasoning }
ONLY return the JSON array, no other text.`;

        const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
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

        if (aiResp.ok) {
          const aiJson = await aiResp.json();
          const rawText: string = aiJson.content?.[0]?.text ?? "[]";
          const refined: { date: string; room_type_name: string; suggested_rate: number; reasoning: string }[] = JSON.parse(rawText);

          const refinedMap = new Map(refined.map(r => [`${r.date}__${r.room_type_name}`, r]));

          finalSuggestions = suggestions.map(s => {
            const key = `${s.date}__${s.room_type_name}`;
            const r = refinedMap.get(key);
            if (!r) return s;

            let aiRate = Math.round((r.suggested_rate ?? s.suggested_rate) / 5) * 5;
            const cap = s.suggested_rate * 1.10;
            const floor = s.suggested_rate * 0.90;
            if (aiRate > cap) aiRate = Math.round(cap / 5) * 5;
            if (aiRate < floor) aiRate = Math.round(floor / 5) * 5;

            const rtRules = rules.filter(rule => rule.room_type_id === s.room_type_id || rule.room_type_id === null);
            for (const rule of rtRules) {
              if (rule.min_rate != null && aiRate < rule.min_rate) aiRate = rule.min_rate;
              if (rule.max_rate != null && aiRate > rule.max_rate) aiRate = rule.max_rate;
            }

            return {
              ...s,
              suggested_rate: aiRate,
              reasoning: (r.reasoning ?? s.reasoning).slice(0, 100),
              confidence_score: Math.min(96, s.confidence_score + 4),
            };
          });
        }
      } catch {
        finalSuggestions = suggestions;
      }
    }

    await supabase
      .from("ai_price_suggestions")
      .delete()
      .eq("hotel_id", hotel_id)
      .eq("applied", false);

    const rows = finalSuggestions.map(s => ({
      hotel_id,
      ...(tenant_id ? { tenant_id } : {}),
      room_type_id: s.room_type_id,
      date: s.date,
      current_rate: s.current_rate,
      suggested_rate: s.suggested_rate,
      confidence_score: s.confidence_score,
      reasoning: s.reasoning,
      factors: s.factors,
      applied: false,
    }));

    const { error: insertError } = await supabase.from("ai_price_suggestions").insert(rows);

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, count: rows.length, powered_by: anthropicKey ? "ai_refined" : "yield_algorithm" }),
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
