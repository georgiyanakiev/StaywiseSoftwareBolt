import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BookingPayload {
  confirmationNumber: string;
  guestName: string;
  guestEmail: string;
  hotelName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  total: number;
  depositAmount: number;
  currency: string;
  requireDeposit: boolean;
  cancellationPolicy?: string;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildConfirmationEmail(p: BookingPayload): string {
  const guestFirstName = p.guestName.split(" ")[0];
  const guestCount = p.adults + (p.children ?? 0);
  const guestLabel = `${p.adults} adult${p.adults !== 1 ? "s" : ""}${p.children > 0 ? ` + ${p.children} child${p.children !== 1 ? "ren" : ""}` : ""}`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff;">

      <!-- Header -->
      <div style="background: #0f172a; padding: 28px 40px; border-radius: 12px 12px 0 0;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; background: rgba(255,255,255,0.12); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="color: #60a5fa; font-size: 20px;">&#127968;</span>
          </div>
          <span style="color: white; font-size: 18px; font-weight: 700; letter-spacing: -0.3px;">StayWise</span>
          <span style="color: #94a3b8; font-size: 13px; margin-left: auto;">${p.hotelName}</span>
        </div>
      </div>

      <!-- Body -->
      <div style="padding: 40px 40px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">

        <!-- Success badge -->
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-flex; align-items: center; gap: 8px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 999px; padding: 8px 20px;">
            <span style="color: #16a34a; font-size: 16px;">&#10003;</span>
            <span style="color: #15803d; font-size: 14px; font-weight: 600;">Booking Confirmed</span>
          </div>
        </div>

        <p style="color: #64748b; font-size: 14px; margin: 0 0 6px 0;">Dear ${guestFirstName},</p>
        <h1 style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px;">Your reservation is confirmed</h1>
        <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 28px 0;">
          Thank you for booking directly with <strong>${p.hotelName}</strong>. We look forward to welcoming you.
        </p>

        <!-- Confirmation number -->
        <div style="text-align: center; margin-bottom: 28px;">
          <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px 0;">Confirmation Number</p>
          <p style="color: #0f172a; font-size: 28px; font-weight: 900; font-family: 'Courier New', monospace; letter-spacing: 4px; margin: 0;">${p.confirmationNumber}</p>
          <p style="color: #94a3b8; font-size: 11px; margin: 6px 0 0 0;">Keep this reference for your records</p>
        </div>

        <!-- Booking details -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #0f172a; font-size: 14px; font-weight: 700; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">Reservation Details</p>

          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b; font-size: 13px; width: 50%;">Room</td>
              <td style="padding: 10px 0; color: #0f172a; font-size: 13px; font-weight: 600; text-align: right;">${p.roomName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Check-in</td>
              <td style="padding: 10px 0; color: #0f172a; font-size: 13px; font-weight: 600; text-align: right;">${formatDate(p.checkIn)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Check-out</td>
              <td style="padding: 10px 0; color: #0f172a; font-size: 13px; font-weight: 600; text-align: right;">${formatDate(p.checkOut)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Duration</td>
              <td style="padding: 10px 0; color: #0f172a; font-size: 13px; font-weight: 600; text-align: right;">${p.nights} night${p.nights !== 1 ? "s" : ""}</td>
            </tr>
            <tr style="${p.requireDeposit ? "border-bottom: 1px solid #e2e8f0;" : ""}">
              <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Guests</td>
              <td style="padding: 10px 0; color: #0f172a; font-size: 13px; font-weight: 600; text-align: right;">${guestLabel}</td>
            </tr>
            ${p.requireDeposit ? `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #d97706; font-size: 13px;">Deposit due</td>
              <td style="padding: 10px 0; color: #d97706; font-size: 13px; font-weight: 700; text-align: right;">${formatCurrency(p.depositAmount, p.currency)}</td>
            </tr>
            ` : ""}
            <tr>
              <td style="padding: 12px 0 4px 0; color: #0f172a; font-size: 15px; font-weight: 700;">Total</td>
              <td style="padding: 12px 0 4px 0; color: #0f172a; font-size: 17px; font-weight: 800; text-align: right;">${formatCurrency(p.total, p.currency)}</td>
            </tr>
          </table>
        </div>

        ${p.cancellationPolicy ? `
        <!-- Cancellation policy -->
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
          <p style="color: #92400e; font-size: 13px; line-height: 1.6; margin: 0;">
            <strong>Cancellation Policy:</strong> ${p.cancellationPolicy}
          </p>
        </div>
        ` : ""}

        <!-- What to bring -->
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 18px 20px; margin-bottom: 28px;">
          <p style="color: #1d4ed8; font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">What to bring at check-in</p>
          <ul style="color: #1e40af; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 18px;">
            <li>A valid photo ID or passport</li>
            <li>Your booking confirmation number: <strong>${p.confirmationNumber}</strong></li>
            ${p.requireDeposit ? `<li>Payment for your deposit of <strong>${formatCurrency(p.depositAmount, p.currency)}</strong></li>` : ""}
          </ul>
        </div>

        <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0 0 24px 0;">
          If you have any questions about your booking or need to make changes, please contact the hotel directly and reference your confirmation number.
        </p>

        <p style="color: #1e293b; font-size: 14px; font-weight: 500; margin: 0 0 4px 0;">We look forward to seeing you,</p>
        <p style="color: #1e293b; font-size: 14px; font-weight: 600; margin: 0;">${p.hotelName}</p>

        <!-- Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 28px;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            You're receiving this confirmation because you made a direct booking at ${p.hotelName}. Powered by StayWise. &copy; ${new Date().getFullYear()} StayWise. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: BookingPayload = await req.json();

    const required = ["confirmationNumber", "guestName", "guestEmail", "hotelName", "roomName", "checkIn", "checkOut"];
    for (const field of required) {
      if (!payload[field as keyof BookingPayload]) {
        return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const html = buildConfirmationEmail(payload);

    let sendError: string | null = null;

    try {
      await (supabase.auth.admin as unknown as {
        sendRawEmail: (opts: { to: string; subject: string; html: string }) => Promise<unknown>;
      }).sendRawEmail({
        to: payload.guestEmail,
        subject: `Booking Confirmed — ${payload.confirmationNumber} | ${payload.hotelName}`,
        html,
      });
    } catch (e) {
      sendError = String(e);
    }

    if (sendError) {
      return new Response(JSON.stringify({ success: false, error: sendError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, to: payload.guestEmail, confirmationNumber: payload.confirmationNumber }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
