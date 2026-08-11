// supabase/functions/otp-auth/index.ts
// Mobile OTP authentication (MSG91) — mints a real Supabase Auth session
// after MSG91 confirms OTP verification server-side.
// Actions (via x-action header, matching the payment-gateway convention):
//   verify               — public. Body: { accessToken, intent? }. Verifies
//                           the MSG91 widget access token, finds the profile
//                           by phone, and returns a Supabase session.
//                           intent: 'customer' (default) auto-creates the
//                           account if it doesn't exist yet. intent:
//                           'agent' | 'builder' | 'partner' never
//                           auto-creates and requires an exact role match —
//                           it rejects with a specific code (NOT_FOUND,
//                           PENDING_REVIEW, REJECTED, ROLE_MISMATCH,
//                           ACCOUNT_SUSPENDED) rather than minting a session
//                           for the wrong portal.
//   request-agent-access — public. Body: { accessToken, full_name?,
//                           requested_role? }. Re-verifies the MSG91 access
//                           token and logs a pending row in agent_requests
//                           for an admin to review — used after a 'verify'
//                           call with intent 'agent'/'builder' comes back
//                           NOT_FOUND.
//   review-agent-request  — admin-only. Body: { requestId, decision,
//                           notes? }. Approves or rejects a pending
//                           agent_requests row (decision: 'approved' |
//                           'rejected').
//   admin-provision       — admin-only. Body: { phone, role, first_name, last_name }.
//                           Pre-creates an agent/builder account by phone so they
//                           can log in via OTP afterward with their role intact.
//                           Also marks any matching pending agent_requests row
//                           as 'approved'.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeIndianMobile } from "../_shared/phone.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-action",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function error(message: string, status = 400) {
  return json({ error: message, success: false }, status);
}

type ProfessionalIntent = "agent" | "builder" | "partner";
const PROFESSIONAL_INTENTS: ProfessionalIntent[] = ["agent", "builder", "partner"];
const APPLICATION_TABLE: Record<ProfessionalIntent, string> = {
  agent: "agent_applications",
  builder: "builder_applications",
  partner: "partner_applications",
};
// partner_applications uses `mobile_number`; agent/builder use `phone`.
const APPLICATION_PHONE_COLUMN: Record<ProfessionalIntent, string> = {
  agent: "phone",
  builder: "phone",
  partner: "mobile_number",
};

function randomPassword(): string {
  // Never persisted anywhere — generated fresh, consumed once by
  // signInWithPassword immediately below, then discarded.
  return crypto.randomUUID() + crypto.randomUUID();
}

// Supabase's Phone auth provider stays permanently disabled (MSG91 is the
// only OTP provider — see project instructions), so signInWithPassword
// cannot use `phone` as the identifier: GoTrue rejects any phone-identifier
// grant with "Phone logins are disabled" whenever that provider is off,
// regardless of Twilio/SMS config. Email/password is always-on by default,
// so every account also gets a deterministic, internal-only synthetic email
// (never shown to the user, never emailed) purely so we can mint a session
// via signInWithPassword({ email, password }) instead. This never touches
// profiles.email — the handle_new_user trigger only fires on INSERT, and
// this synthetic address is set via a separate updateUserById call.
function syntheticEmailForMobile(mobile: string): string {
  return `p${mobile}@phone.realtynow.internal`;
}

// Confirms an OTP was actually verified, server-side, using the secret Auth
// Key. Never trust a client-supplied mobile number — take it from MSG91's
// own response. Shared by the `verify` and `request-agent-access` actions.
async function verifyMsg91AccessToken(
  accessToken: string,
  authKey: string,
): Promise<{ mobile: string } | { error: string; status: number }> {
  let msg91Res: Response;
  try {
    msg91Res = await fetch("https://control.msg91.com/api/v5/widget/verifyAccessToken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authkey: authKey, "access-token": accessToken }),
    });
  } catch {
    return { error: "Could not reach MSG91 to verify OTP", status: 502 };
  }
  const msg91Data = await msg91Res.json().catch(() => null);
  if (!msg91Data || msg91Data.type !== "success") {
    return { error: "OTP verification failed or expired", status: 401 };
  }
  const mobile = normalizeIndianMobile(String(msg91Data.message ?? ""));
  if (!mobile) return { error: "MSG91 did not return a valid mobile number", status: 502 };
  return { mobile };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const MSG91_AUTH_KEY = Deno.env.get("MSG91_AUTH_KEY") ?? "";

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const action = req.headers.get("x-action") || "";
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }

  // ─── ACTION: verify ────────────────────────────────────────────
  // Public — the caller has no session yet, that's the whole point.
  if (action === "verify") {
    const accessToken = body.accessToken as string | undefined;
    const rawIntent = body.intent as string | undefined;
    const intent: "customer" | ProfessionalIntent = PROFESSIONAL_INTENTS.includes(rawIntent as ProfessionalIntent)
      ? (rawIntent as ProfessionalIntent)
      : "customer";
    if (!accessToken) return error("accessToken is required");
    if (!MSG91_AUTH_KEY) return error("MSG91 is not configured on the server", 500);

    const verified = await verifyMsg91AccessToken(accessToken, MSG91_AUTH_KEY);
    if ("error" in verified) return error(verified.error, verified.status);
    const { mobile } = verified;

    // Find an existing profile by phone (service role — bypasses RLS).
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, role, status")
      .eq("phone", mobile)
      .maybeSingle();

    let userId = existingProfile?.id as string | undefined;
    let isNewUser = false;

    if (PROFESSIONAL_INTENTS.includes(intent as ProfessionalIntent)) {
      const professionalIntent = intent as ProfessionalIntent;
      // Agent / Builder / Partner tabs: never auto-create, and the
      // account's actual role must exactly match the selected tab — no more
      // sharing one "agent" bucket between agent and builder logins.
      if (!existingProfile) {
        // No account yet. Distinguish "never applied" from "applied but
        // still pending/rejected" by checking that role's own application
        // table, so the UI can show a specific, honest message instead of
        // one generic "not found" for every case.
        const appTable = APPLICATION_TABLE[professionalIntent];
        const phoneColumn = APPLICATION_PHONE_COLUMN[professionalIntent];
        const { data: latestApp } = await admin
          .from(appTable)
          .select("id, status")
          .eq(phoneColumn, mobile)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestApp?.status === "rejected") {
          return json(
            { error: "Your application was not approved. Please contact RealtyNow support for more information.", success: false, code: "REJECTED" },
            403,
          );
        }
        if (latestApp) {
          return json(
            { error: "Your application is still under review. Please wait for admin approval.", success: false, code: "PENDING_REVIEW" },
            403,
          );
        }

        // Agent/Builder keep the existing self-serve "request account
        // access" follow-up (agent_requests). Partner has its own
        // registration form (partner_applications), so there's nothing to
        // request — the caller should just be pointed at registration.
        if (professionalIntent === "agent" || professionalIntent === "builder") {
          const { data: existingRequest } = await admin
            .from("agent_requests")
            .select("id")
            .eq("mobile", mobile)
            .eq("status", "pending")
            .maybeSingle();

          let requestId = existingRequest?.id;
          if (!requestId) {
            const { data: inserted, error: insertErr } = await admin
              .from("agent_requests")
              .insert({ mobile, requested_role: professionalIntent, status: "pending" })
              .select("id")
              .single();
            if (insertErr) return error(insertErr.message, 500);
            requestId = inserted?.id;
          }

          return json(
            {
              error: "Your account has not been created yet. Please contact the administrator.",
              success: false,
              code: "NOT_FOUND",
              requestId,
            },
            403,
          );
        }

        return json(
          { error: "No partner application was found for this mobile number. Please register as a partner first.", success: false, code: "NOT_FOUND" },
          403,
        );
      }
      if (existingProfile.role !== professionalIntent) {
        return json(
          {
            error: "This mobile number is registered under a different account type.",
            success: false,
            code: "ROLE_MISMATCH",
            actualRole: existingProfile.role,
          },
          403,
        );
      }
      if (existingProfile.status === "suspended") {
        return json(
          { error: "Your account has been suspended. Please contact RealtyNow support.", success: false, code: "ACCOUNT_SUSPENDED" },
          403,
        );
      }
    } else if (!userId) {
      const tempPassword = randomPassword();
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        phone: mobile,
        phone_confirm: true,
        password: tempPassword,
        user_metadata: { role: "customer" },
      });
      if (createErr || !created?.user) {
        return error(createErr?.message ?? "Could not create account", 500);
      }
      userId = created.user.id;
      isNewUser = true;
    }

    // Rotate a fresh throwaway password and immediately consume it to mint
    // a real Supabase session (proper access/refresh token pair, auto-
    // refresh works normally — no custom JWT signing needed). Also
    // (re)stamp the synthetic email on every login so accounts created
    // before this fix get backfilled automatically on next sign-in.
    const signInPassword = randomPassword();
    const syntheticEmail = syntheticEmailForMobile(mobile);
    const { error: pwErr } = await admin.auth.admin.updateUserById(userId!, {
      email: syntheticEmail,
      email_confirm: true,
      password: signInPassword,
    });
    if (pwErr) return error(pwErr.message, 500);

    const plainClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: signInData, error: signInErr } = await plainClient.auth.signInWithPassword({
      email: syntheticEmail,
      password: signInPassword,
    });
    if (signInErr || !signInData?.session) {
      return error(signInErr?.message ?? "Could not sign in", 500);
    }

    await admin
      .from("profiles")
      .update({ is_mobile_verified: true, otp_verified_at: new Date().toISOString(), last_login: new Date().toISOString() })
      .eq("id", userId!);

    return json({
      success: true,
      isNewUser,
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    });
  }

  // ─── ACTION: request-agent-access ──────────────────────────────
  // Public — called after a 'verify' with intent 'agent'/'builder' comes
  // back NOT_FOUND, using the same (already-verified) MSG91 access token.
  if (action === "request-agent-access") {
    const requestId = body.requestId as string | undefined;
    const fullName = (body.full_name as string | undefined)?.trim() || null;
    const requestedRole = body.requested_role === "builder" ? "builder" : "agent";
    if (!requestId) return error("requestId is required");

    const { error: updateErr } = await admin
      .from("agent_requests")
      .update({ full_name: fullName, requested_role: requestedRole })
      .eq("id", requestId);
    if (updateErr) return error(updateErr.message, 500);

    return json({ success: true });
  }

  // ─── ACTION: review-agent-request ──────────────────────────────
  // Admin-only — approve/reject a pending agent_requests row.
  if (action === "review-agent-request") {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return error("Authentication required", 401);

    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return error("Authentication required", 401);

    const { data: callerProfile } = await admin.from("profiles").select("role").eq("id", caller.id).maybeSingle();
    if (callerProfile?.role !== "admin") return error("Admin access required", 403);

    const requestId = body.requestId as string | undefined;
    const decision = body.decision as string | undefined;
    if (!requestId || !["approved", "rejected"].includes(decision ?? "")) {
      return error("requestId and decision ('approved' | 'rejected') are required");
    }

    const { error: updateErr } = await admin
      .from("agent_requests")
      .update({
        status: decision,
        reviewed_by: caller.id,
        reviewed_at: new Date().toISOString(),
        notes: (body.notes as string | undefined) ?? null,
      })
      .eq("id", requestId);
    if (updateErr) return error(updateErr.message, 500);

    return json({ success: true });
  }

  // ─── ACTION: admin-provision ───────────────────────────────────
  // Admin-only — pre-creates an agent/builder account by phone.
  if (action === "admin-provision") {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return error("Authentication required", 401);

    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return error("Authentication required", 401);

    const { data: callerProfile } = await admin.from("profiles").select("role").eq("id", caller.id).maybeSingle();
    if (callerProfile?.role !== "admin") return error("Admin access required", 403);

    const phoneRaw = body.phone as string | undefined;
    const role = body.role as string | undefined;
    const firstName = body.first_name as string | undefined;
    const lastName = body.last_name as string | undefined;

    if (!phoneRaw || !role || !["agent", "builder"].includes(role)) {
      return error("phone and role ('agent' | 'builder') are required");
    }
    const mobile = normalizeIndianMobile(phoneRaw);
    if (!mobile) return error("Invalid mobile number");

    const { data: existingProfile } = await admin.from("profiles").select("id").eq("phone", mobile).maybeSingle();
    if (existingProfile) return error("A profile with this mobile number already exists", 409);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      phone: mobile,
      phone_confirm: true,
      password: randomPassword(),
      user_metadata: { role, first_name: firstName, last_name: lastName },
    });
    if (createErr || !created?.user) {
      return error(createErr?.message ?? "Could not create account", 500);
    }

    // handle_new_user() already inserted a default profile row; update it
    // with the role/name the admin specified (trigger defaults role to
    // 'customer' when raw_user_meta_data doesn't carry it through cleanly).
    await admin
      .from("profiles")
      .update({ role, first_name: firstName, last_name: lastName, status: "active" })
      .eq("id", created.user.id);

    // If this mobile number had a pending self-serve request, close it out.
    await admin
      .from("agent_requests")
      .update({ status: "approved", reviewed_by: caller.id, reviewed_at: new Date().toISOString() })
      .eq("mobile", mobile)
      .eq("status", "pending");

    return json({ success: true, user_id: created.user.id });
  }

  return error("Unknown action. Use x-action: verify | request-agent-access | review-agent-request | admin-provision", 400);
});
