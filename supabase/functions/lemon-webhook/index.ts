// Lemon Squeezy → Supabase: uğurlu ödənişdən sonra istifadəçinin balansını artırır.
// Deploy:  supabase functions deploy lemon-webhook --no-verify-jwt
// Secrets: LEMON_WEBHOOK_SECRET  (Lemon Squeezy-də webhook yaradanda özünüz yazdığınız "signing secret")
//          SUPABASE_URL və SUPABASE_SERVICE_ROLE_KEY avtomatik verilir.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SECRET = Deno.env.get("LEMON_WEBHOOK_SECRET") ?? "";
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function validSignature(raw: string, header: string): Promise<boolean> {
  if (!SECRET || !header) return false;
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const expected = hex(await crypto.subtle.sign("HMAC", key, enc.encode(raw)));
  // sabit vaxtlı müqayisə
  if (expected.length !== header.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ header.charCodeAt(i);
  return diff === 0;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get("x-signature") ?? ""))) {
    return json({ error: "bad_signature" }, 401);
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return json({ error: "bad_json" }, 400); }

  const event: string = payload?.meta?.event_name ?? "";
  if (event !== "order_created" && event !== "order_refunded") return json({ ignored: event });

  const userId: string = payload?.meta?.custom_data?.user_id ?? "";
  const orderId: string = String(payload?.data?.id ?? "");
  const attrs = payload?.data?.attributes ?? {};
  const variantId = String(attrs?.first_order_item?.variant_id ?? "");

  if (!UUID.test(userId) || !orderId || !variantId) return json({ ignored: "missing_fields" });

  // Məbləğ Lemon Squeezy-dən yox, öz cədvəlimizdən götürülür: variant → AZN
  const { data: pkg, error: pkgErr } = await db
    .from("topup_packages").select("amount").eq("variant_id", variantId).maybeSingle();
  if (pkgErr) return json({ error: "db_error" }, 500);
  if (!pkg) return json({ ignored: "unknown_variant", variantId });

  if (event === "order_created") {
    if (attrs?.status !== "paid") return json({ ignored: "not_paid", status: attrs?.status });
    const { data, error } = await db.rpc("credit_topup", {
      p_user: userId, p_amount: pkg.amount, p_ref: `ls:${orderId}`, p_note: `Balans artırıldı (+${pkg.amount} AZN)`,
    });
    if (error) {
      // istifadəçi tapılmadısa təkrar cəhd mənasızdır
      if (String(error.message).includes("profile_missing")) return json({ ignored: "profile_missing" });
      return json({ error: error.message }, 500);
    }
    return json(data);
  }

  const { data, error } = await db.rpc("refund_topup", {
    p_user: userId, p_amount: pkg.amount, p_ref: `ls-refund:${orderId}`, p_note: "Ödəniş geri qaytarıldı",
  });
  if (error) {
    if (String(error.message).includes("profile_missing")) return json({ ignored: "profile_missing" });
    return json({ error: error.message }, 500);
  }
  return json(data);
});
