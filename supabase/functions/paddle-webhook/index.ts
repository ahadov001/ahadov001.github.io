// ═══════════════════════════════════════════════════════════════
//  Dərs Toplusu — Paddle webhook → balansı avtomatik artırma / geri qaytarma
//  Supabase Edge Function.  Ad: paddle-webhook   (JWT yoxlaması: SÖNÜLÜ)
//
//  Secrets:
//    PADDLE_WEBHOOK_SECRET — Paddle → Notifications → destination → Secret key
//    SB_URL, SB_SERVICE_KEY — (balans-webhook ilə eyni)
//
//  Məbləğ İSTİFADƏÇİDƏN YOX, Paddle-in öz price ID-sindən götürülür.
// ═══════════════════════════════════════════════════════════════
import { createClient } from "jsr:@supabase/supabase-js@2";

// Paddle price ID → qəpik (200 = 2 AZN)
const PAKETLER: Record<string, number> = {
  "pri_01m88qcmvvcbnneaam201r392v": 200,   //  2 AZN  ($1.20)
  "pri_01m88qdd33wmgcpzq475t87be5": 500,   //  5 AZN  ($3)
  "pri_01m88qdfxzxg1b6kjt60k5nbk6": 1000,  // 10 AZN  ($6)
  "pri_01m88qdk5xa70vmw0hxs5ee21e": 2000,  // 20 AZN  ($12)
  "pri_01m88qdpd86fn96ksywaw6w2c2": 3000,  // 30 AZN  ($18)
  "pri_01m88qdsn67s4n4r5qe1tx035h": 5000,  // 50 AZN  ($30)
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
function beraber(a: string, b: string) {
  if (a.length !== b.length) return false;
  let f = 0; for (let i = 0; i < a.length; i++) f |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return f === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("yalnız POST", { status: 405 });
  const sirr = Deno.env.get("PADDLE_WEBHOOK_SECRET");
  const sbUrl = Deno.env.get("SB_URL"), sbKey = Deno.env.get("SB_SERVICE_KEY");
  if (!sirr || !sbUrl || !sbKey) { console.error("Secret-lər qurulmayıb"); return new Response("konfiqurasiya yoxdur", { status: 500 }); }

  // ─── 1. İMZA:  Paddle-Signature: ts=...;h1=...   h1 = HMAC_SHA256(secret, ts + ":" + body)
  const xam = await req.text();
  const bas = req.headers.get("Paddle-Signature") ?? "";
  const ts = /ts=(\d+)/.exec(bas)?.[1] ?? "";
  const h1s = [...bas.matchAll(/h1=([0-9a-f]+)/gi)].map((m) => m[1].toLowerCase());
  if (!ts || !h1s.length) return new Response("imza yoxdur", { status: 401 });
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 3600) return new Response("imza köhnədir", { status: 401 });
  const acar = await crypto.subtle.importKey("raw", new TextEncoder().encode(sirr), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const hes = hex(new Uint8Array(await crypto.subtle.sign("HMAC", acar, new TextEncoder().encode(ts + ":" + xam))));
  if (!h1s.some((h) => beraber(h, hes))) { console.warn("İmza uyğun gəlmədi"); return new Response("imza səhvdir", { status: 401 }); }

  let p: any; try { p = JSON.parse(xam); } catch { return new Response("json səhvdir", { status: 400 }); }
  const hadise: string = p?.event_type ?? "";
  const d = p?.data ?? {};
  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });

  // ═══ GERİ QAYTARMA (tam) ═════════════════════════════════════
  if (hadise === "adjustment.updated" || hadise === "adjustment.created") {
    if (d.action !== "refund" || d.status !== "approved") return json({ ok: true, nazere_alinmadi: hadise + ":" + d.status });
    if (d.type !== "full") { console.warn("Qismən geri qaytarma — əl ilə baxın:", d.transaction_id); return json({ ok: true, sebeb: "qismen_emal_olunmadi" }); }
    const { data, error } = await sb.rpc("geri_qaytar", { p_lemon_id: "paddle:" + d.transaction_id });
    if (error) { console.error("geri_qaytar:", error.message); return new Response("baza xətası", { status: 500 }); }
    return json(data);
  }

  // ═══ ÖDƏNİŞ ══════════════════════════════════════════════════
  if (hadise !== "transaction.completed") return json({ ok: true, nazere_alinmadi: hadise });
  if (d.status && d.status !== "completed") return json({ ok: true, sebeb: "tamamlanmayib" });

  const items: any[] = d.items ?? [];
  let mebleg = 0, taninmir = "";
  for (const it of items) {
    const m = PAKETLER[it?.price?.id ?? it?.price_id ?? ""];
    if (!m) { taninmir = it?.price?.id ?? "?"; break; }
    mebleg += m * (Number(it?.quantity) || 1);
  }
  if (taninmir || !mebleg) { console.warn("Tanınmayan price:", taninmir); return json({ ok: false, sebeb: "price_taninmir", price: taninmir }); }

  const rawUid = d?.custom_data?.uid;
  const uid = typeof rawUid === "string" && UUID_RE.test(rawUid) ? rawUid : null;
  const { data, error } = await sb.rpc("odenis_isle", {
    p_lemon_id: "paddle:" + d.id, p_uid: uid, p_email: "", p_mebleg: mebleg,
  });
  if (error) { console.error("odenis_isle:", error.message); return new Response("baza xətası", { status: 500 }); }
  console.log("Ödəniş:", d.id, mebleg, JSON.stringify(data));
  return json(data);
});
