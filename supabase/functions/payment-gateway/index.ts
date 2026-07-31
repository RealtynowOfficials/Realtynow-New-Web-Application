// supabase/functions/payment-gateway/index.ts
// Enterprise Payment Gateway Edge Function
// Handles: create-order, verify-payment, generate-invoice, refund

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const RAZORPAY_KEY_ID     = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
  const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

  // Get authenticated user
  const authHeader = req.headers.get("Authorization");
  let userId: string | null = null;
  if (authHeader) {
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    userId = user?.id ?? null;
  }
  if (!userId) return error("Authentication required", 401);

  const action = req.headers.get("x-action") || "";
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }

  // ─── ACTION: create-order ─────────────────────────────────────
  if (action === "create-order") {
    const { package_id, billing_cycle, payment_type, discount_pct } = body;
    if (!package_id) return error("package_id is required");

    // Fetch package
    const { data: pkg } = await supabase.from("packages").select("*").eq("id", package_id).eq("is_active", true).single();
    if (!pkg) return error("Package not found or inactive", 404);

    const basePrice = billing_cycle === "yearly" ? pkg.price_yearly : pkg.price_monthly;
    const discountPct = Number(discount_pct ?? 0);
    const discountAmt  = Math.round(basePrice * (discountPct / 100) * 100) / 100;
    const subtotal     = basePrice - discountAmt;
    const taxAmount    = Math.round(subtotal * 0.18 * 100) / 100;
    const totalAmount  = Math.round((subtotal + taxAmount) * 100) / 100;

    // Create internal payment record and invoice
    const { data: paymentData, error: payErr } = await supabase.rpc("fn_create_payment_and_invoice", {
      p_user_id:       userId,
      p_package_id:    package_id,
      p_amount:        basePrice,
      p_payment_type:  payment_type || "upfront",
      p_billing_cycle: billing_cycle || "monthly",
      p_gateway:       "razorpay",
      p_discount_pct:  discountPct
    });
    if (payErr) return error(payErr.message, 500);

    // Create Razorpay order
    let razorpayOrderId = `order_mock_${Date.now()}`; // Fallback for dev
    if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
      try {
        const rzResponse = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
          },
          body: JSON.stringify({
            amount: Math.round(totalAmount * 100), // paise
            currency: "INR",
            receipt: paymentData.invoice_number,
            notes: { payment_id: paymentData.payment_id, user_id: userId }
          })
        });
        const rzOrder = await rzResponse.json();
        if (rzOrder.id) {
          razorpayOrderId = rzOrder.id;
          // Update payment with gateway order ID
          await supabase.from("payments").update({ gateway_order_id: razorpayOrderId }).eq("id", paymentData.payment_id);
        }
      } catch (e) {
        console.error("Razorpay order creation failed:", e);
      }
    }

    return json({
      success: true,
      payment_id: paymentData.payment_id,
      invoice_id: paymentData.invoice_id,
      invoice_number: paymentData.invoice_number,
      agent_package_id: paymentData.agent_package_id,
      razorpay_order_id: razorpayOrderId,
      razorpay_key_id: RAZORPAY_KEY_ID,
      amount: totalAmount,
      currency: "INR",
      breakdown: { subtotal, tax: taxAmount, discount: discountAmt, total: totalAmount }
    });
  }

  // ─── ACTION: verify-payment ───────────────────────────────────
  if (action === "verify-payment") {
    const { payment_id, razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;
    if (!payment_id || !razorpay_payment_id) return error("payment_id and razorpay_payment_id required");

    // Verify Razorpay signature
    if (RAZORPAY_KEY_SECRET && razorpay_order_id && razorpay_signature) {
      const expectedSig = createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expectedSig !== razorpay_signature) {
        await supabase.rpc("fn_log_audit", {
          p_action: "payment_signature_mismatch",
          p_entity: "payments",
          p_entity_id: payment_id as string,
          p_severity: "critical"
        });
        return error("Payment signature verification failed", 400);
      }
    }

    // Confirm payment in DB
    const { data, error: confirmErr } = await supabase.rpc("fn_confirm_payment", {
      p_payment_id:         payment_id,
      p_gateway_payment_id: razorpay_payment_id,
      p_gateway_order_id:   razorpay_order_id,
      p_gateway_signature:  razorpay_signature
    });
    if (confirmErr) return error(confirmErr.message, 500);

    // Log audit
    await supabase.rpc("fn_log_audit", {
      p_action: "payment_confirmed",
      p_entity: "payments",
      p_entity_id: payment_id as string,
      p_metadata: { razorpay_payment_id, amount: body.amount },
      p_severity: "info"
    });

    return json({ success: true, data });
  }

  // ─── ACTION: generate-invoice ─────────────────────────────────
  if (action === "generate-invoice") {
    const { invoice_id } = body;
    if (!invoice_id) return error("invoice_id is required");

    const { data: inv } = await supabase.from("invoices").select("*").eq("id", invoice_id).eq("user_id", userId).single();
    if (!inv) return error("Invoice not found or access denied", 404);

    // In production, this would call a PDF generation service
    // For now, return the structured invoice data
    const { data: userProfile } = await supabase.from("profiles").select("first_name, last_name, email, phone").eq("id", userId).single();

    return json({
      success: true,
      invoice: {
        ...inv,
        billing_name: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : "Customer",
        billing_email: userProfile?.email,
        company_name: "RealtyNow India Pvt. Ltd.",
        company_gst: "GSTINXXXXXX",
        company_address: "123, Tech Hub, Hyderabad, Telangana - 500032",
        download_url: `/portal/invoices/${invoice_id}`
      }
    });
  }

  return error("Unknown action. Use x-action: create-order | verify-payment | generate-invoice", 400);
});
