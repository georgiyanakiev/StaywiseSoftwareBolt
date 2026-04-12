import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

type EmailType = "confirmation" | "checkin_reminder" | "checkout_thankyou";

interface EmailRequest {
  reservation_id: string;
  email_type: EmailType;
  language?: string;
}

interface ReservationData {
  id: string;
  hotel_id: string;
  guest_id: string;
  confirmation_code: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  total_amount: number;
  payment_status: string;
  amount_paid: number;
  status: string;
  special_requests: string;
  booking_source: string;
  guest: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  room: {
    number: string;
    floor: string;
    room_type: { name: string };
  } | null;
  room_type: { name: string } | null;
  hotel: {
    id: string;
    name: string;
    address: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    currency: string;
    check_in_time: string;
    check_out_time: string;
    language: string;
    logo_url: string;
  };
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function fmtCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function fmtDate(dateStr: string, lang: string): string {
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  return new Date(dateStr).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.max(Math.round((b.getTime() - a.getTime()) / 86400000), 1);
}

function emailWrapper(hotelName: string, lang: string, body: string): string {
  const poweredBy =
    lang === "bg"
      ? `Задвижвано от StayWise. &copy; ${new Date().getFullYear()} StayWise. Всички права запазени.`
      : `Powered by StayWise. &copy; ${new Date().getFullYear()} StayWise. All rights reserved.`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">StayWise</span></td>
      <td style="text-align:right;"><span style="color:#94a3b8;font-size:13px;">${hotelName}</span></td>
    </tr></table>
  </div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:36px 32px 28px;">
    ${body}
    <div style="border-top:1px solid #e2e8f0;padding-top:18px;margin-top:28px;">
      <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.6;">${poweredBy}</p>
    </div>
  </div>
</div>
</body></html>`;
}

function detailsTable(
  rows: [string, string][],
  totalLabel: string,
  totalValue: string
): string {
  const trs = rows
    .map(
      ([label, value]) =>
        `<tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 0;color:#64748b;font-size:13px;">${label}</td>
          <td style="padding:10px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${value}</td>
        </tr>`
    )
    .join("");

  return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px;">
    <table style="width:100%;border-collapse:collapse;">
      ${trs}
      <tr>
        <td style="padding:12px 0 4px;color:#0f172a;font-size:15px;font-weight:700;">${totalLabel}</td>
        <td style="padding:12px 0 4px;color:#0f172a;font-size:17px;font-weight:800;text-align:right;">${totalValue}</td>
      </tr>
    </table>
  </div>`;
}

function buildConfirmation(r: ReservationData, lang: string): { subject: string; html: string } {
  const bg = lang === "bg";
  const firstName = r.guest.first_name || (bg ? "Гост" : "Guest");
  const nights = nightsBetween(r.check_in, r.check_out);
  const roomName = r.room?.room_type?.name || r.room_type?.name || (bg ? "Стая" : "Room");
  const roomNum = r.room?.number ? ` (${r.room.number})` : "";
  const guestLabel = bg
    ? `${r.adults} ${r.adults === 1 ? "възрастен" : "възрастни"}${r.children > 0 ? ` + ${r.children} ${r.children === 1 ? "дете" : "деца"}` : ""}`
    : `${r.adults} adult${r.adults !== 1 ? "s" : ""}${r.children > 0 ? ` + ${r.children} child${r.children !== 1 ? "ren" : ""}` : ""}`;

  const subject = bg
    ? `Потвърждение на резервация — ${r.confirmation_code} | ${r.hotel.name}`
    : `Booking Confirmed — ${r.confirmation_code} | ${r.hotel.name}`;

  const rows: [string, string][] = [
    [bg ? "Стая" : "Room", `${roomName}${roomNum}`],
    [bg ? "Настаняване" : "Check-in", `${fmtDate(r.check_in, lang)} | ${r.hotel.check_in_time?.slice(0, 5) || "14:00"}`],
    [bg ? "Напускане" : "Check-out", `${fmtDate(r.check_out, lang)} | ${r.hotel.check_out_time?.slice(0, 5) || "11:00"}`],
    [bg ? "Продължителност" : "Duration", `${nights} ${bg ? (nights === 1 ? "нощувка" : "нощувки") : (nights === 1 ? "night" : "nights")}`],
    [bg ? "Гости" : "Guests", guestLabel],
  ];

  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:999px;padding:8px 24px;">
        <span style="color:#16a34a;font-size:16px;">&#10003;</span>
        <span style="color:#15803d;font-size:14px;font-weight:600;margin-left:6px;">${bg ? "Резервацията е потвърдена" : "Booking Confirmed"}</span>
      </div>
    </div>
    <p style="color:#64748b;font-size:14px;margin:0 0 6px;">${bg ? "Уважаеми" : "Dear"} ${firstName},</p>
    <h1 style="color:#0f172a;font-size:22px;font-weight:800;margin:0 0 8px;letter-spacing:-0.3px;">${bg ? "Вашата резервация е потвърдена" : "Your reservation is confirmed"}</h1>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;">
      ${bg ? `Благодарим ви, че избрахте <strong>${r.hotel.name}</strong>. Очакваме ви с нетърпение.` : `Thank you for booking with <strong>${r.hotel.name}</strong>. We look forward to welcoming you.`}
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">${bg ? "Номер на резервация" : "Confirmation Number"}</p>
      <p style="color:#0f172a;font-size:26px;font-weight:900;font-family:'Courier New',monospace;letter-spacing:3px;margin:0;">${r.confirmation_code}</p>
    </div>
    ${detailsTable(rows, bg ? "Обща сума" : "Total", fmtCurrency(r.total_amount, r.hotel.currency))}
    ${r.special_requests ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
      <p style="color:#1d4ed8;font-size:12px;font-weight:600;margin:0 0 4px;">${bg ? "Специални изисквания" : "Special Requests"}</p>
      <p style="color:#1e40af;font-size:13px;margin:0;line-height:1.5;">${r.special_requests}</p>
    </div>` : ""}
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 18px;margin-bottom:24px;">
      <p style="color:#1d4ed8;font-size:13px;font-weight:600;margin:0 0 6px;">${bg ? "Какво да носите при настаняване" : "What to bring at check-in"}</p>
      <ul style="color:#1e40af;font-size:13px;line-height:1.8;margin:0;padding-left:18px;">
        <li>${bg ? "Валидна лична карта или паспорт" : "A valid photo ID or passport"}</li>
        <li>${bg ? `Номер на резервация: <strong>${r.confirmation_code}</strong>` : `Your confirmation number: <strong>${r.confirmation_code}</strong>`}</li>
      </ul>
    </div>
    <p style="color:#1e293b;font-size:14px;font-weight:500;margin:0 0 4px;">${bg ? "Очакваме ви с удоволствие," : "We look forward to seeing you,"}</p>
    <p style="color:#1e293b;font-size:14px;font-weight:600;margin:0;">${r.hotel.name}</p>
    ${r.hotel.phone ? `<p style="color:#64748b;font-size:12px;margin:4px 0 0;">${r.hotel.phone}</p>` : ""}
  `;

  return { subject, html: emailWrapper(r.hotel.name, lang, body) };
}

function buildCheckinReminder(r: ReservationData, lang: string): { subject: string; html: string } {
  const bg = lang === "bg";
  const firstName = r.guest.first_name || (bg ? "Гост" : "Guest");
  const roomName = r.room?.room_type?.name || r.room_type?.name || (bg ? "Стая" : "Room");
  const roomNum = r.room?.number ? ` (${r.room.number})` : "";
  const checkInTime = r.hotel.check_in_time?.slice(0, 5) || "14:00";

  const subject = bg
    ? `Напомняне: настаняване утре | ${r.hotel.name}`
    : `Reminder: Check-in Tomorrow | ${r.hotel.name}`;

  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:8px 24px;">
        <span style="color:#2563eb;font-size:16px;">&#128197;</span>
        <span style="color:#1d4ed8;font-size:14px;font-weight:600;margin-left:6px;">${bg ? "Настаняването е утре!" : "Check-in is Tomorrow!"}</span>
      </div>
    </div>
    <p style="color:#64748b;font-size:14px;margin:0 0 6px;">${bg ? "Уважаеми" : "Dear"} ${firstName},</p>
    <h1 style="color:#0f172a;font-size:22px;font-weight:800;margin:0 0 8px;letter-spacing:-0.3px;">
      ${bg ? "Утре е големият ден!" : "Your stay begins tomorrow!"}
    </h1>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;">
      ${bg
        ? `Искаме да ви напомним, че настаняването ви в <strong>${r.hotel.name}</strong> е утре. Очакваме ви с нетърпение!`
        : `Just a friendly reminder that your stay at <strong>${r.hotel.name}</strong> begins tomorrow. We can't wait to welcome you!`}
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 0;color:#64748b;font-size:13px;">${bg ? "Номер на резервация" : "Confirmation"}</td>
          <td style="padding:10px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;font-family:'Courier New',monospace;">${r.confirmation_code}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 0;color:#64748b;font-size:13px;">${bg ? "Стая" : "Room"}</td>
          <td style="padding:10px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${roomName}${roomNum}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 0;color:#64748b;font-size:13px;">${bg ? "Час на настаняване" : "Check-in Time"}</td>
          <td style="padding:10px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${fmtDate(r.check_in, lang)} | ${checkInTime}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;font-size:13px;">${bg ? "Напускане" : "Check-out"}</td>
          <td style="padding:10px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${fmtDate(r.check_out, lang)}</td>
        </tr>
      </table>
    </div>
    ${r.hotel.address ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 18px;margin-bottom:24px;">
      <p style="color:#15803d;font-size:13px;font-weight:600;margin:0 0 4px;">${bg ? "Адрес на хотела" : "Hotel Address"}</p>
      <p style="color:#166534;font-size:13px;margin:0;line-height:1.5;">${r.hotel.address}${r.hotel.city ? `, ${r.hotel.city}` : ""}${r.hotel.country ? `, ${r.hotel.country}` : ""}</p>
    </div>` : ""}
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 18px;margin-bottom:24px;">
      <p style="color:#1d4ed8;font-size:13px;font-weight:600;margin:0 0 6px;">${bg ? "Не забравяйте" : "Don't forget"}</p>
      <ul style="color:#1e40af;font-size:13px;line-height:1.8;margin:0;padding-left:18px;">
        <li>${bg ? "Валидна лична карта или паспорт" : "Valid photo ID or passport"}</li>
        <li>${bg ? `Номер: <strong>${r.confirmation_code}</strong>` : `Reference: <strong>${r.confirmation_code}</strong>`}</li>
      </ul>
    </div>
    <p style="color:#1e293b;font-size:14px;font-weight:500;margin:0 0 4px;">${bg ? "До скоро!" : "See you soon!"}</p>
    <p style="color:#1e293b;font-size:14px;font-weight:600;margin:0;">${r.hotel.name}</p>
    ${r.hotel.phone ? `<p style="color:#64748b;font-size:12px;margin:4px 0 0;">${r.hotel.phone}</p>` : ""}
  `;

  return { subject, html: emailWrapper(r.hotel.name, lang, body) };
}

function buildCheckoutThankyou(r: ReservationData, lang: string): { subject: string; html: string } {
  const bg = lang === "bg";
  const firstName = r.guest.first_name || (bg ? "Гост" : "Guest");
  const nights = nightsBetween(r.check_in, r.check_out);

  const subject = bg
    ? `Благодарим ви за престоя! | ${r.hotel.name}`
    : `Thank You for Your Stay! | ${r.hotel.name}`;

  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#fef3c7;border:1px solid #fde68a;border-radius:999px;padding:8px 24px;">
        <span style="font-size:16px;">&#11088;</span>
        <span style="color:#92400e;font-size:14px;font-weight:600;margin-left:6px;">${bg ? "Благодарим ви!" : "Thank You!"}</span>
      </div>
    </div>
    <p style="color:#64748b;font-size:14px;margin:0 0 6px;">${bg ? "Уважаеми" : "Dear"} ${firstName},</p>
    <h1 style="color:#0f172a;font-size:22px;font-weight:800;margin:0 0 8px;letter-spacing:-0.3px;">
      ${bg ? "Благодарим ви за престоя!" : "Thank you for staying with us!"}
    </h1>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;">
      ${bg
        ? `Надяваме се, че ${nights === 1 ? "нощувката ви" : `${nights}-те ви нощувки`} в <strong>${r.hotel.name}</strong> ${nights === 1 ? "беше" : "бяха"} приятн${nights === 1 ? "а" : "и"}. Беше ни удоволствие да ви посрещнем.`
        : `We hope you enjoyed your ${nights}-night stay at <strong>${r.hotel.name}</strong>. It was our pleasure hosting you.`}
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:#0f172a;font-size:14px;font-weight:700;margin:0 0 14px;text-transform:uppercase;letter-spacing:0.5px;">${bg ? "Обобщение на престоя" : "Stay Summary"}</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 0;color:#64748b;font-size:13px;">${bg ? "Резервация" : "Confirmation"}</td>
          <td style="padding:10px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;font-family:'Courier New',monospace;">${r.confirmation_code}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 0;color:#64748b;font-size:13px;">${bg ? "Период" : "Period"}</td>
          <td style="padding:10px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${fmtDate(r.check_in, lang)} &mdash; ${fmtDate(r.check_out, lang)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;font-size:13px;">${bg ? "Продължителност" : "Duration"}</td>
          <td style="padding:10px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${nights} ${bg ? (nights === 1 ? "нощувка" : "нощувки") : (nights === 1 ? "night" : "nights")}</td>
        </tr>
      </table>
    </div>
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px 18px;margin-bottom:24px;text-align:center;">
      <p style="color:#854d0e;font-size:14px;font-weight:600;margin:0 0 6px;">${bg ? "Вашето мнение е важно за нас" : "Your feedback matters"}</p>
      <p style="color:#92400e;font-size:13px;line-height:1.6;margin:0;">
        ${bg
          ? "Ако имате препоръки или коментари, не се колебайте да се свържете с нас. Надяваме се да ви посрещнем отново скоро!"
          : "If you have any feedback or suggestions, don't hesitate to get in touch. We hope to welcome you again soon!"}
      </p>
    </div>
    <p style="color:#1e293b;font-size:14px;font-weight:500;margin:0 0 4px;">${bg ? "С най-добри пожелания," : "With warm regards,"}</p>
    <p style="color:#1e293b;font-size:14px;font-weight:600;margin:0;">${r.hotel.name}</p>
    ${r.hotel.phone ? `<p style="color:#64748b;font-size:12px;margin:4px 0 0;">${r.hotel.phone}</p>` : ""}
    ${r.hotel.email ? `<p style="color:#64748b;font-size:12px;margin:2px 0 0;">${r.hotel.email}</p>` : ""}
  `;

  return { subject, html: emailWrapper(r.hotel.name, lang, body) };
}

const BUILDERS: Record<EmailType, (r: ReservationData, lang: string) => { subject: string; html: string }> = {
  confirmation: buildConfirmation,
  checkin_reminder: buildCheckinReminder,
  checkout_thankyou: buildCheckoutThankyou,
};

async function sendViaResend(to: string, subject: string, html: string, fromName: string): Promise<{ id: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <onboarding@resend.dev>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Resend API error ${res.status}: ${errBody}`);
  }

  return await res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: EmailRequest = await req.json();
    const { reservation_id, email_type, language } = body;

    if (!reservation_id || !email_type) {
      return new Response(
        JSON.stringify({ error: "reservation_id and email_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!BUILDERS[email_type]) {
      return new Response(
        JSON.stringify({ error: `Invalid email_type: ${email_type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: reservation, error: rErr } = await supabase
      .from("reservations")
      .select(`
        *,
        guest:guests(*),
        room:rooms(*, room_type:room_types(*)),
        room_type:room_types(*),
        hotel:hotels(*)
      `)
      .eq("id", reservation_id)
      .maybeSingle();

    if (rErr || !reservation) {
      return new Response(
        JSON.stringify({ error: rErr?.message || "Reservation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const r = reservation as unknown as ReservationData;

    if (!r.guest?.email) {
      await supabase.from("guest_emails").upsert(
        {
          hotel_id: r.hotel_id,
          reservation_id: r.id,
          guest_id: r.guest_id,
          email_type,
          to_email: "",
          subject: "",
          language: language || r.hotel?.language || "en",
          status: "skipped",
          error_message: "No guest email address",
        },
        { onConflict: "reservation_id,email_type" }
      );

      return new Response(
        JSON.stringify({ success: false, skipped: true, reason: "No guest email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lang = language || r.hotel?.language || "en";
    const { subject, html } = BUILDERS[email_type](r, lang);

    let resendId = "";
    let status = "sent";
    let errorMessage = "";

    try {
      const result = await sendViaResend(r.guest.email, subject, html, r.hotel.name);
      resendId = result.id || "";
    } catch (err) {
      status = "failed";
      errorMessage = String(err);
      console.error(`Email send failed for ${email_type}/${reservation_id}:`, err);
    }

    await supabase.from("guest_emails").upsert(
      {
        hotel_id: r.hotel_id,
        reservation_id: r.id,
        guest_id: r.guest_id,
        email_type,
        to_email: r.guest.email,
        subject,
        language: lang,
        status,
        resend_id: resendId,
        error_message: errorMessage,
        sent_at: status === "sent" ? new Date().toISOString() : null,
      },
      { onConflict: "reservation_id,email_type" }
    );

    return new Response(
      JSON.stringify({
        success: status === "sent",
        status,
        email_type,
        to: r.guest.email,
        resend_id: resendId,
        error: errorMessage || undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-guest-email error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
