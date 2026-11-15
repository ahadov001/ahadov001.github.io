// ═══════════════════════════════════════════════════════════════
//  SINAQ — Geri bildirim → bazaya yazır + sizə e-poçt göndərir
//  Supabase Edge Function.  Ad: geri-bildirim
//
//  Secrets (Supabase → Edge Functions → Secrets):
//    SB_URL          — Supabase proyektinin URL-i        (balans-webhook ilə eyni)
//    SB_SERVICE_KEY  — service_role açarı                (balans-webhook ilə eyni)
//    RESEND_API_KEY  — resend.com-dan API açarı (pulsuz hesab kifayətdir)
//    SAHIB_EMAIL     — mesajların gələcəyi e-poçt ünvanınız (saytda GÖRÜNMƏZ)
//    RESEND_FROM     — (ixtiyari) göndərən ünvan. Verilməsə Resend-in test
//                      ünvanı işlədilir; bu halda mesaj yalnız Resend-ə
//                      qeydiyyatdan keçdiyiniz e-poçta çata bilər.
//
//  DİQQƏT: funksiyanı yerləşdirəndə "Verify JWT" seçimini SÖNDÜRÜN
//  (saytın ziyarətçiləri giriş etməmiş də mesaj göndərə bilməlidir).
//  E-poçt göndərilməsə belə mesaj bazada (geri_bildirimler) qalır.
// ═══════════════════════════════════════════════════════════════
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const NOVLER: Record<string, string> = { sehv: "Səhv", teklif: "Təklif", sikayet: "Şikayət" };

function cavab(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
const kes = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

async function sha(s: string): Promise<string> {
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return cavab({ ok: false, xeta: "metod" }, 405);

  let g: Record<string, unknown>;
  try { g = await req.json(); } catch { return cavab({ ok: false, xeta: "format" }, 400); }

  // Bot tələsi: gizli sahə doldurulubsa sakitcə "uğurlu" deyirik
  if (kes(g.sayt, 50)) return cavab({ ok: true });

  const nov = kes(g.nov, 10);
  const mesaj = kes(g.mesaj, 2000);
  if (!NOVLER[nov] || mesaj.length < 5) return cavab({ ok: false, xeta: "mesaj" }, 400);

  const sehife = kes(g.sehife, 300);
  const bashliq = kes(g.bashliq, 200);
  const kontekst = kes(g.kontekst, 500);
  let elaqe = kes(g.elaqe, 120);
  if (elaqe && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(elaqe)) elaqe = "";

  const sb = createClient(Deno.env.get("SB_URL")!, Deno.env.get("SB_SERVICE_KEY")!);
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "yoxdur";
  const ip_hash = await sha(ip + "|" + (Deno.env.get("SB_SERVICE_KEY") || "").slice(-12));

  // Sadə spam qoruması: 10 dəqiqədə bir cihazdan ən çox 3 mesaj
  const bu = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await sb.from("geri_bildirimler").select("id", { count: "exact", head: true })
    .eq("ip_hash", ip_hash).gte("tarix", bu);
  if ((count ?? 0) >= 3) return cavab({ ok: false, xeta: "tez-tez" }, 429);

  const { error } = await sb.from("geri_bildirimler").insert({ nov, mesaj, sehife, bashliq, kontekst, elaqe, ip_hash });
  if (error) { console.error("insert", error.message); return cavab({ ok: false, xeta: "baza" }, 500); }

  // E-poçt (alınmasa da mesaj artıq bazadadır)
  const acar = Deno.env.get("RESEND_API_KEY"), kime = Deno.env.get("SAHIB_EMAIL");
  if (acar && kime) {
    const mətn = [
      `Növ: ${NOVLER[nov]}`,
      `Səhifə: ${bashliq || "—"}`,
      `Keçid: ${sehife || "—"}`,
      kontekst ? `Kontekst: ${kontekst}` : "",
      elaqe ? `Cavab üçün e-poçt: ${elaqe}` : "",
      "",
      mesaj,
    ].filter((x) => x !== "").join("\n");
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${acar}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: Deno.env.get("RESEND_FROM") || "Dərs Toplusu <onboarding@resend.dev>",
          to: [kime],
          subject: `[Dərs Toplusu] ${NOVLER[nov]}: ${bashliq || sehife || "səhifə"}`.slice(0, 180),
          text: mətn,
          ...(elaqe ? { reply_to: elaqe } : {}),
        }),
      });
      if (!r.ok) console.error("resend", r.status, await r.text());
    } catch (e) { console.error("resend", String(e)); }
  }
  return cavab({ ok: true });
});
