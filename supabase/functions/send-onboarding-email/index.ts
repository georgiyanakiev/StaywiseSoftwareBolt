import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type EmailType = "welcome" | "setup_guide" | "day3_checkin";

function buildWelcomeEmail(firstName: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff;">
      <div style="background: #0f172a; padding: 32px 40px; border-radius: 12px 12px 0 0;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; background: rgba(255,255,255,0.12); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="color: #60a5fa; font-size: 20px;">&#127968;</span>
          </div>
          <span style="color: white; font-size: 18px; font-weight: 700; letter-spacing: -0.3px;">StayWise</span>
        </div>
      </div>

      <div style="padding: 40px 40px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #64748b; font-size: 14px; margin: 0 0 6px 0;">Welcome aboard,</p>
        <h1 style="color: #0f172a; font-size: 26px; font-weight: 800; margin: 0 0 24px 0; letter-spacing: -0.5px;">Hi ${firstName} &#128075;</h1>

        <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
          Your StayWise account has been created. We're thrilled to have you — you're one step closer to running a more efficient, guest-focused property.
        </p>

        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 20px 24px; margin-bottom: 28px;">
          <p style="color: #0369a1; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">What happens next?</p>
          <ul style="color: #0c4a6e; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>An administrator will review and approve your account</li>
            <li>You'll receive access to your property dashboard</li>
            <li>We'll send you a guided setup walkthrough tomorrow</li>
          </ul>
        </div>

        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 28px 0;">
          While you wait, feel free to reply to this email with any questions. Our team is here to help you get set up smoothly.
        </p>

        <div style="background: #f8fafc; border-radius: 10px; padding: 20px 24px; margin-bottom: 28px;">
          <p style="color: #1e293b; font-size: 14px; font-weight: 600; margin: 0 0 10px 0;">What StayWise gives you:</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0; color: #475569; font-size: 13px;">&#10003;&nbsp;&nbsp;Front desk &amp; reservations management</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #475569; font-size: 13px;">&#10003;&nbsp;&nbsp;Housekeeping &amp; maintenance tracking</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #475569; font-size: 13px;">&#10003;&nbsp;&nbsp;Channel manager (Booking.com, Expedia &amp; more)</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #475569; font-size: 13px;">&#10003;&nbsp;&nbsp;Invoicing, payments &amp; financial reporting</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #475569; font-size: 13px;">&#10003;&nbsp;&nbsp;Guest portal &amp; digital check-in</td>
            </tr>
          </table>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            You're receiving this because you signed up for StayWise. &copy; ${new Date().getFullYear()} StayWise. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;
}

function buildSetupGuideEmail(firstName: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff;">
      <div style="background: #0f172a; padding: 32px 40px; border-radius: 12px 12px 0 0;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; background: rgba(255,255,255,0.12); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="color: #60a5fa; font-size: 20px;">&#127968;</span>
          </div>
          <span style="color: white; font-size: 18px; font-weight: 700; letter-spacing: -0.3px;">StayWise</span>
        </div>
      </div>

      <div style="padding: 40px 40px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #64748b; font-size: 14px; margin: 0 0 6px 0;">Your setup guide,</p>
        <h1 style="color: #0f172a; font-size: 26px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px;">Get StayWise running in 5 steps</h1>
        <p style="color: #64748b; font-size: 14px; margin: 0 0 28px 0;">Hi ${firstName}, here's everything you need to hit the ground running.</p>

        <!-- Step 1 -->
        <div style="display: flex; gap: 16px; margin-bottom: 20px;">
          <div style="flex-shrink: 0; width: 32px; height: 32px; background: #0f172a; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 13px; font-weight: 700;">1</span>
          </div>
          <div>
            <p style="color: #0f172a; font-size: 15px; font-weight: 600; margin: 0 0 4px 0;">Configure your property details</p>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
              Head to <strong>Settings</strong> to add your hotel name, address, star rating, tax rate, and logo. This information appears on all guest invoices.
            </p>
          </div>
        </div>

        <!-- Step 2 -->
        <div style="display: flex; gap: 16px; margin-bottom: 20px;">
          <div style="flex-shrink: 0; width: 32px; height: 32px; background: #0f172a; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 13px; font-weight: 700;">2</span>
          </div>
          <div>
            <p style="color: #0f172a; font-size: 15px; font-weight: 600; margin: 0 0 4px 0;">Add your rooms</p>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
              Go to the <strong>Rooms</strong> section and set up each room type with its number, name, capacity, and base rate. This powers availability and pricing across all modules.
            </p>
          </div>
        </div>

        <!-- Step 3 -->
        <div style="display: flex; gap: 16px; margin-bottom: 20px;">
          <div style="flex-shrink: 0; width: 32px; height: 32px; background: #0f172a; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 13px; font-weight: 700;">3</span>
          </div>
          <div>
            <p style="color: #0f172a; font-size: 15px; font-weight: 600; margin: 0 0 4px 0;">Create your first reservation</p>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
              Try making a test booking via <strong>Reservations &#8594; New Reservation</strong>. You'll see how check-in, check-out, and invoicing all connect automatically.
            </p>
          </div>
        </div>

        <!-- Step 4 -->
        <div style="display: flex; gap: 16px; margin-bottom: 20px;">
          <div style="flex-shrink: 0; width: 32px; height: 32px; background: #0f172a; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 13px; font-weight: 700;">4</span>
          </div>
          <div>
            <p style="color: #0f172a; font-size: 15px; font-weight: 600; margin: 0 0 4px 0;">Invite your team</p>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
              Under <strong>Settings &#8594; Staff Members</strong>, invite front desk, housekeeping, and management roles. Each role has tailored permissions so staff only see what they need.
            </p>
          </div>
        </div>

        <!-- Step 5 -->
        <div style="display: flex; gap: 16px; margin-bottom: 32px;">
          <div style="flex-shrink: 0; width: 32px; height: 32px; background: #0f172a; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 13px; font-weight: 700;">5</span>
          </div>
          <div>
            <p style="color: #0f172a; font-size: 15px; font-weight: 600; margin: 0 0 4px 0;">Connect your channels</p>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
              Open <strong>Channel Manager</strong> to sync with Booking.com, Expedia, or other OTAs. Keep availability and rates consistent everywhere guests book.
            </p>
          </div>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 18px 24px; margin-bottom: 28px;">
          <p style="color: #166534; font-size: 14px; line-height: 1.6; margin: 0;">
            <strong>Pro tip:</strong> The Dashboard gives you a real-time snapshot of occupancy, upcoming check-ins, and housekeeping status — check it each morning to start your day informed.
          </p>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            You're receiving this as part of your StayWise onboarding. &copy; ${new Date().getFullYear()} StayWise. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;
}

function buildDay3CheckinEmail(firstName: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff;">
      <div style="background: #0f172a; padding: 32px 40px; border-radius: 12px 12px 0 0;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; background: rgba(255,255,255,0.12); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="color: #60a5fa; font-size: 20px;">&#127968;</span>
          </div>
          <span style="color: white; font-size: 18px; font-weight: 700; letter-spacing: -0.3px;">StayWise</span>
        </div>
      </div>

      <div style="padding: 40px 40px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #64748b; font-size: 14px; margin: 0 0 6px 0;">Day 3 check-in,</p>
        <h1 style="color: #0f172a; font-size: 26px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px;">How's it going, ${firstName}?</h1>
        <p style="color: #64748b; font-size: 14px; margin: 0 0 28px 0;">You've had a few days with StayWise — we wanted to check in.</p>

        <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
          We hope you're finding your way around. If anything is unclear or not working the way you expect, we want to know — your feedback directly shapes the product.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; margin-bottom: 28px;">
          <p style="color: #1e293b; font-size: 14px; font-weight: 600; margin: 0 0 16px 0;">A few things worth exploring if you haven't yet:</p>

          <div style="margin-bottom: 14px;">
            <p style="color: #0f172a; font-size: 14px; font-weight: 600; margin: 0 0 2px 0;">Dynamic Pricing</p>
            <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
              Set rules to automatically adjust room rates based on occupancy, season, or day of week. Found under <strong>Dynamic Pricing</strong> in the sidebar.
            </p>
          </div>

          <div style="margin-bottom: 14px;">
            <p style="color: #0f172a; font-size: 14px; font-weight: 600; margin: 0 0 2px 0;">Guest Portal</p>
            <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
              Let guests complete digital check-in forms before arrival. Saves time at the desk and creates a more professional first impression.
            </p>
          </div>

          <div style="margin-bottom: 14px;">
            <p style="color: #0f172a; font-size: 14px; font-weight: 600; margin: 0 0 2px 0;">Upselling</p>
            <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
              Create a catalogue of add-ons (airport transfers, breakfast upgrades, spa access) that guests can request during their stay.
            </p>
          </div>

          <div>
            <p style="color: #0f172a; font-size: 14px; font-weight: 600; margin: 0 0 2px 0;">Reports</p>
            <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
              The Reports section gives you occupancy trends, revenue breakdowns, and booking source analysis. Great for end-of-month reviews.
            </p>
          </div>
        </div>

        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 18px 24px; margin-bottom: 28px;">
          <p style="color: #92400e; font-size: 14px; line-height: 1.6; margin: 0;">
            <strong>Need help?</strong> Reply directly to this email and a member of our team will respond within one business day. We read every message.
          </p>
        </div>

        <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0 0 28px 0;">
          Thanks for choosing StayWise, ${firstName}. We're rooting for your property's success.
        </p>

        <p style="color: #1e293b; font-size: 14px; font-weight: 500; margin: 0;">
          — The StayWise Team
        </p>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 24px;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            You're receiving this as part of your StayWise onboarding sequence. &copy; ${new Date().getFullYear()} StayWise. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;
}

const SUBJECTS: Record<EmailType, string> = {
  welcome: "Welcome to StayWise — your account is being reviewed",
  setup_guide: "Your StayWise setup guide — 5 steps to get started",
  day3_checkin: "Checking in — how's StayWise working for you?",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { onboardingEmailId } = await req.json();

    if (!onboardingEmailId) {
      return new Response(JSON.stringify({ error: "onboardingEmailId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: record, error: fetchErr } = await supabase
      .from("onboarding_emails")
      .select("*")
      .eq("id", onboardingEmailId)
      .maybeSingle();

    if (fetchErr || !record) {
      return new Response(JSON.stringify({ error: "Record not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (record.status === "sent") {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailType = record.email_type as EmailType;
    let html: string;

    if (emailType === "welcome") {
      html = buildWelcomeEmail(record.first_name);
    } else if (emailType === "setup_guide") {
      html = buildSetupGuideEmail(record.first_name);
    } else {
      html = buildDay3CheckinEmail(record.first_name);
    }

    let sendError: string | null = null;

    try {
      await (supabase.auth.admin as unknown as {
        sendRawEmail: (opts: { to: string; subject: string; html: string }) => Promise<unknown>;
      }).sendRawEmail({
        to: record.email,
        subject: SUBJECTS[emailType],
        html,
      });
    } catch (e) {
      sendError = String(e);
    }

    if (sendError) {
      await supabase
        .from("onboarding_emails")
        .update({ status: "failed", error_message: sendError })
        .eq("id", onboardingEmailId);

      return new Response(JSON.stringify({ success: false, error: sendError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("onboarding_emails")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", onboardingEmailId);

    return new Response(JSON.stringify({ success: true, emailType, to: record.email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
