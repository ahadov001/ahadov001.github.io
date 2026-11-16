/* Anonim ziyarət sayğacı: şəxsi məlumat yığmır — yalnız təsadüfi brauzer nömrəsi, səhifə adı, dil və cihaz növü. */
(function () {
  "use strict";
  try {
    var C = window.SB_CONFIG || {};
    if (!C.url || !C.anonKey || /bot|crawl|spider|headless/i.test(navigator.userAgent) || navigator.webdriver) return;
    if (localStorage.getItem("dt_noz") === "1") return; /* sayt sahibinin öz girişləri sayılmır */
    var vid = localStorage.getItem("dt_vid");
    if (!vid) {
      vid = ""; var a = "abcdefghijklmnopqrstuvwxyz0123456789", b = new Uint8Array(16);
      (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach(function (_, i) { b[i] = Math.random() * 255; });
      for (var i = 0; i < 16; i++) vid += a[b[i] % a.length];
      localStorage.setItem("dt_vid", vid);
    }
    var sehife = (location.pathname.split("/").pop() || "index.html");
    var dil = document.documentElement.lang === "ru" ? "ru" : "az";
    var cihaz = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "m" : "d";
    function gonder(tip) {
      try {
        fetch(C.url + "/rest/v1/rpc/ziyaret_yaz", {
          method: "POST", keepalive: true,
          headers: { "Content-Type": "application/json", apikey: C.anonKey, Authorization: "Bearer " + C.anonKey },
          body: JSON.stringify({ p_vid: vid, p_sehife: sehife, p_dil: dil, p_cihaz: cihaz, p_tip: tip })
        }).catch(function () {});
      } catch (e) {}
    }
    gonder("y");
    setInterval(function () { if (document.visibilityState === "visible") gonder("h"); }, 120000);
  } catch (e) {}
})();
