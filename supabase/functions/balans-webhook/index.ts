// ═══════════════════════════════════════════════════════════════
//  SINAQ — Lemon Squeezy webhook → balans artırma
//  Supabase Edge Function.  Ad: balans-webhook
//
//  Lazım olan Environment Variables (Supabase → Edge Functions → Secrets):
//    LEMON_WEBHOOK_SECRET  — Lemon Squeezy webhook-u yaradanda verilən secret
//    SB_URL                — Supabase proyektinin URL-i
//    SB_SERVICE_KEY        — service_role açarı (BUNU SAYTA QOYMAYIN!)
// ═══════════════════════════════════════════════════════════════

import { createClient } from "jsr:@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────
//  BALANS PAKETLƏRİ — variant ID → qəpik
//
//  DİQQƏT: məbləği İSTİFADƏÇİNİN LİNKİNDƏN YOX, Lemon Squeezy-nin
//  öz variant ID-sindən alırıq. Əks halda istifadəçi linkdəki
//  rəqəmi dəyişib 5 AZN ödəyərək 500 AZN balans yaza bilərdi.
//
//  Lemon Squeezy-də hər balans paketini yaradın, variant ID-sini
//  (Product → Variants bölməsindəki rəqəm) buraya yazın.
// ─────────────────────────────────────────────────────────────
const PAKETLER: Record<string, number> = {
  // ── TEST rejimi
  "2371785": 200,    //  2 AZN
  "2371788": 500,    //  5 AZN
  "2371790": 1000,   // 10 AZN
  "2371791": 2000,   // 20 AZN
  "2371795": 3000,   // 30 AZN
  "2371796": 5000,   // 50 AZN
  // ── CANLI rejim: ID-ləri buraya əlavə edin, məsələn:
  // "1234567": 200,
};
function altiOnluq(bayt: Uint8Array): string {
  return [...bayt].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// İmzanı sabit vaxtda müqayisə edir (timing attack-a qarşı)
function imzaBeraber(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let f = 0;
  for (let i = 0; i < a.length; i++) f |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return f === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("yalnız POST", { status: 405 });
  }

  const sirr = Deno.env.get("LEMON_WEBHOOK_SECRET");
  const sbUrl = Deno.env.get("SB_URL");
  const sbKey = Deno.env.get("SB_SERVICE_KEY");
  if (!sirr || !sbUrl || !sbKey) {
    console.error("Secret-lər qurulmayıb");
    return new Response("konfiqurasiya yoxdur", { status: 500 });
  }

  // ─── 1. İMZA YOXLANIŞI (bu olmasa hər kəs saxta ödəniş göndərə bilər)
  const xamMetn = await req.text();
  const gelenImza = req.headers.get("X-Signature") ?? "";
  const acar = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sirr),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const hesablanan = altiOnluq(
    new Uint8Array(await crypto.subtle.sign("HMAC", acar, new TextEncoder().encode(xamMetn))),
  );
  if (!imzaBeraber(hesablanan, gelenImza)) {
    console.warn("İmza uyğun gəlmədi — sorğu rədd edildi");
    return new Response("imza səhvdir", { status: 401 });
  }

  // ─── 2. HADİSƏNİ OXU
  let payload: any;
  try { payload = JSON.parse(xamMetn); } catch { return new Response("json səhvdir", { status: 400 }); }

  const hadise = payload?.meta?.event_name ?? "";
  if (hadise !== "order_created") {
    return new Response(JSON.stringify({ ok: true, nazere_alinmadi: hadise }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const attr = payload?.data?.attributes ?? {};
  const email: string = (attr.user_email ?? "").toLowerCase().trim();
  const lemonId: string = String(payload?.data?.id ?? attr.identifier ?? "");
  const variantId: string = String(attr.first_order_item?.variant_id ?? "");
  const custom = payload?.meta?.custom_data ?? {};
  const uid: string | null = custom?.uid ?? null;

  const mebleg = PAKETLER[variantId];
  if (!mebleg) {
    console.warn("Tanınmayan variant ID:", variantId, "— PAKETLER siyahısına əlavə edin");
    return new Response(JSON.stringify({ ok: false, sebeb: "variant_taninmir", variantId }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });

  // ─── 3. TƏKRAR WEBHOOK-U BLOKLA
  // Lemon Squeezy uğursuz cavab alanda sorğuyu təkrarlayır.
  // lemon_id unikal olduğu üçün balans iki dəfə artmır.
  const { data: movcud } = await sb.from("odenisler").select("id").eq("lemon_id", lemonId).maybeSingle();
  if (movcud) {
    return new Response(JSON.stringify({ ok: true, sebeb: "evvelce_islenib" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ─── 4. İSTİFADƏÇİNİ TAP (əvvəlcə uid, sonra e-poçt)
  let istifadeciId: string | null = null;
  if (uid) {
    const { data } = await sb.from("profiller").select("id").eq("id", uid).maybeSingle();
    if (data) istifadeciId = data.id;
  }
  if (!istifadeciId && email) {
    const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
    const tapilan = data?.users?.find((u) => (u.email ?? "").toLowerCase() === email);
    if (tapilan) istifadeciId = tapilan.id;
  }

  // ─── 5. ÖDƏNİŞİ YAZ
  const { error: oErr } = await sb.from("odenisler").insert({
    istifadeci: istifadeciId, mebleg, lemon_id: lemonId, email: email || null,
  });
  if (oErr) {
    console.error("odenisler insert xətası:", oErr.message);
    return new Response("baza xətası", { status: 500 });  // LS təkrar göndərəcək
  }

  if (!istifadeciId) {
    // Ödəniş qeydə alındı, lakin hesab tapılmadı — sahib əl ilə bağlayacaq
    console.warn("Hesab tapılmadı, ödəniş sahibsiz yazıldı:", email, lemonId);
    return new Response(JSON.stringify({ ok: true, sebeb: "hesab_tapilmadi", email }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ─── 6. BALANSI ARTIR
  const { error: bErr } = await sb.rpc("balans_artir", { p_uid: istifadeciId, p_mebleg: mebleg });
  if (bErr) {
    console.error("balans_artir xətası:", bErr.message);
    return new Response("balans xətası", { status: 500 });
  }

  console.log("Balans artırıldı:", email, mebleg, "qəpik");
  return new Response(JSON.stringify({ ok: true, mebleg, istifadeci: istifadeciId }), {
    headers: { "Content-Type": "application/json" },
  });
});
