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
    const { staffMemberId, firstName, lastName, email } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: admins } = await supabase
      .from("staff_members")
      .select("email, first_name, last_name")
      .eq("role", "admin")
      .eq("approval_status", "approved")
      .eq("is_active", true);

    const projectUrl = Deno.env.get("SUPABASE_URL")!;
    const projectRef = projectUrl.split("//")[1].split(".")[0];
    const settingsUrl = `https://supabase.com/dashboard/project/${projectRef}/auth/users`;

    const adminEmails = (admins ?? []).map((a: { email: string }) => a.email);

    for (const adminEmail of adminEmails) {
      const adminRecord = (admins ?? []).find((a: { email: string }) => a.email === adminEmail);
      const adminName = adminRecord ? `${adminRecord.first_name}` : "Admin";

      await supabase.auth.admin.sendRawEmail({
        to: adminEmail,
        subject: `New Access Request — ${firstName} ${lastName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff;">
            <div style="background: #0f172a; padding: 32px 40px; border-radius: 12px 12px 0 0;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; background: rgba(255,255,255,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 18px;">🏨</span>
                </div>
                <span style="color: white; font-size: 18px; font-weight: 600; letter-spacing: -0.3px;">StayWise</span>
              </div>
            </div>

            <div style="padding: 36px 40px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">Hi ${adminName},</p>
              <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 20px 0; letter-spacing: -0.4px;">New Account Request</h2>

              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                A new user has registered and is awaiting your approval to access StayWise.
              </p>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px 24px; margin-bottom: 28px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 500; width: 110px;">Full name</td>
                    <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${firstName} ${lastName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 500;">Email</td>
                    <td style="padding: 6px 0; color: #0f172a; font-size: 14px;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 500;">Status</td>
                    <td style="padding: 6px 0;">
                      <span style="background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 20px;">Pending Approval</span>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                To approve or reject this request, go to <strong>Settings &rarr; Staff Members</strong> in your StayWise dashboard, or manage users directly in Supabase.
              </p>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 8px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  This is an automated notification from StayWise. The user will not have access until you approve their account.
                </p>
              </div>
            </div>
          </div>
        `,
      });
    }

    return new Response(JSON.stringify({ success: true, notified: adminEmails.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
