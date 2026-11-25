/* BALANS PAKETLƏRİ — 2, 5, 10, 15, 20, 25, 30, 50 AZN.
   price — Paddle price ID (onlayn ödəniş). 15 və 25 AZN üçün Paddle-də qiymət
   yaradılmayıb, ona görə yalnız M10/kart köçürməsi ilə mümkündür.
   mebleg — qəpiklə (200 = 2 AZN). Balansa real yazılan məbləği webhook
   funksiyası (supabase/functions/paddle-webhook) price ID-yə görə təyin edir. */
window.PADDLE_CFG = { token: "live_42d82ab3c164832d3027dda8c32", env: "production" };
window.BALANS_PAKETLERI = [
  { mebleg:  200, price: "pri_01m88qcmvvcbnneaam201r392v" },
  { mebleg:  500, price: "pri_01m88qdd33wmgcpzq475t87be5" },
  { mebleg: 1000, price: "pri_01m88qdfxzxg1b6kjt60k5nbk6", secilen: true },
  { mebleg: 1500, price: "pri_01m88wcjnvp4m67126jfnak697" },
  { mebleg: 2000, price: "pri_01m88qdk5xa70vmw0hxs5ee21e" },
  { mebleg: 2500, price: "pri_01m88wd2e8bp3g8mbcakjw5n8w" },
  { mebleg: 3000, price: "pri_01m88qdpd86fn96ksywaw6w2c2" },
  { mebleg: 5000, price: "pri_01m88qdsn67s4n4r5qe1tx035h" }
];
