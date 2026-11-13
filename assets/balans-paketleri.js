/* ═══════════════════════════════════════════════════════════════
   BALANS PAKETLƏRİ — Lemon Squeezy-də yaradılmış 6 məhsul.

   Hər paketdə yalnız  link  sahəsini doldurun:
   Lemon Squeezy → məhsul → Share → "Buy link" linkini dırnaqların
   arasına yapışdırın.

   mebleg — qəpiklə. 200 = 2 AZN. (Bu rəqəm yalnız sayt görünüşü
   üçündür; balansa həqiqətən yazılan məbləği webhook funksiyası
   variant ID-yə görə təyin edir.)
   ═══════════════════════════════════════════════════════════════ */
window.BALANS_PAKETLERI = [
  { mebleg:  200, link: "https://testtoplusu.lemonsqueezy.com/checkout/buy/a679df0d-8fbe-4c11-b474-27431b0135d0", izah: "1 mövzu testi" },
  { mebleg:  500, link: "https://testtoplusu.lemonsqueezy.com/checkout/buy/d39b6b87-9d62-45e7-afdd-b26739267f49", izah: "1 mövzu testi + 1 imtahan" },
  { mebleg: 1000, link: "https://testtoplusu.lemonsqueezy.com/checkout/buy/e2600378-3f57-4821-8cf2-f2f11c51d07d", izah: "5 mövzu testi", secilen: true },
  { mebleg: 2000, link: "https://testtoplusu.lemonsqueezy.com/checkout/buy/c5dfed82-112e-41c8-8ffe-b3db453f3e78", izah: "10 mövzu testi" },
  { mebleg: 3000, link: "https://testtoplusu.lemonsqueezy.com/checkout/buy/6c3301ef-6aad-46c0-9eeb-95f1d4921cf6", izah: "Tam paket (25 AZN) və ya 15 mövzu" },
  { mebleg: 5000, link: "https://testtoplusu.lemonsqueezy.com/checkout/buy/ff279ec9-19e5-4840-8564-32ad58c68ffc", izah: "Tam paket + 12 mövzu — ən sərfəli" }
];
