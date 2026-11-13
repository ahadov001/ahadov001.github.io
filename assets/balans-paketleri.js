/* ═══════════════════════════════════════════════════════════════
   BALANS PAKETLƏRİ — Lemon Squeezy-də yaradacağınız 4 məhsul.

   Hər paket üçün:
     1. Lemon Squeezy-də məhsul yaradın (adı: "5 AZN balans" və s.)
     2. "Share / Buy link" linkini aşağıda link sahəsinə yazın
     3. Həmin məhsulun VARIANT ID-sini webhook funksiyasındaki
        PAKETLER siyahısına əlavə edin (balans-webhook/index.ts)

   mebleg — qəpiklə. 500 = 5 AZN.
   ═══════════════════════════════════════════════════════════════ */
window.BALANS_PAKETLERI = [
  { mebleg:  500, link: "", izah: "3 mövzu testi" },
  { mebleg: 1000, link: "", izah: "5 mövzu testi", secilen: true },
  { mebleg: 2500, link: "", izah: "12 mövzu, yaxud tam paket" },
  { mebleg: 5000, link: "", izah: "25 mövzu — ən sərfəli" }
];
