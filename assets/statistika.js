/* Ziyarət statistikası — yalnız sayt sahibi. İcazəni bazadakı funksiya yoxlayır. */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  var S = window.Sinaq, $ = function (i) { return document.getElementById(i); };
  function k(t) { return S.kacir(t == null ? "" : String(t)); }
  function say(n) { return String(n == null ? 0 : n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function hal(m, link) {
    $("zs-hal").hidden = false; $("zs-govde").hidden = true;
    $("zs-hal").innerHTML = k(m) + (link ? ' <a href="' + link[0] + '">' + k(link[1]) + '</a>' : "");
    $("zs-say").textContent = "";
  }
  function kart(ad, v, alt, vurgu) {
    return '<div class="zs-kart' + (vurgu ? " vurgu" : "") + '"><span>' + k(ad) + '</span><b>' + say(v) + '</b>' + (alt ? '<small>' + k(alt) + '</small>' : '') + '</div>';
  }
  function gunAd(g) { var p = String(g).slice(5, 10).split("-"); return p[1] + "." + p[0]; }
  function ciz(d) {
    $("zs-kartlar").innerHTML =
      kart("İndi onlayn", d.onlayn, "son 5 dəqiqə", true) +
      kart("Bu gün ziyarətçi", d.bugun_ziyaretci, say(d.bugun_baxis) + " səhifə baxışı") +
      kart("Dünən", d.dunen_ziyaretci, "ziyarətçi") +
      kart("Son 7 gün", d.h7_ziyaretci, "unikal ziyarətçi") +
      kart("Son 30 gün", d.h30_ziyaretci, "unikal ziyarətçi") +
      kart("Cəmi ziyarətçi", d.umumi_ziyaretci, say(d.umumi_baxis) + " baxış") +
      kart("Bu gün yeni", d.yeni_bugun, "ilk dəfə gələn") +
      kart("Qayıdanlar", d.qayidan, "bir neçə dəfə gələn");
    var g = d.gunler || [], mx = 1;
    g.forEach(function (x) { mx = Math.max(mx, x.b); });
    $("zs-qrafik").innerHTML = g.map(function (x) {
      return '<div class="zs-sut" title="' + k(gunAd(x.gun)) + ': ' + x.z + ' ziyarətçi, ' + x.b + ' baxış"><div class="zs-cubuq"><i class="b" style="height:' + Math.round(x.b / mx * 100) + '%"></i><i class="z" style="height:' + Math.round(x.z / mx * 100) + '%"></i></div><b>' + x.z + '</b><small>' + k(gunAd(x.gun)) + '</small></div>';
    }).join("");
    var s = d.sehifeler || [], sm = 1; s.forEach(function (x) { sm = Math.max(sm, x.b); });
    $("zs-sehifeler").innerHTML = s.length ? s.map(function (x) {
      return '<div class="zs-sira"><span class="zs-ad">' + k(x.s) + '</span><span class="zs-zol"><i style="width:' + Math.round(x.b / sm * 100) + '%"></i></span><b>' + x.b + '</b></div>';
    }).join("") : '<p class="xirda">Hələ məlumat yoxdur.</p>';
    var dl = d.dil || {}, ch = d.cihaz || {};
    function pay(a, b, an, bn) { var t = (a || 0) + (b || 0) || 1; return '<div class="zs-pay"><span>' + an + ' <b>' + say(a || 0) + '</b></span><span class="zs-zol"><i style="width:' + Math.round((a || 0) / t * 100) + '%"></i></span><span>' + bn + ' <b>' + say(b || 0) + '</b></span></div>'; }
    $("zs-bolgu").innerHTML = pay(dl.az, dl.ru, "Azərbaycanca", "Русский") + pay(ch.d, ch.m, "Kompüter", "Telefon");
    $("zs-say").textContent = "İndi saytda " + (d.onlayn || 0) + " nəfər var · bu gün " + (d.bugun_ziyaretci || 0) + " ziyarətçi.";
    $("zs-hal").hidden = true; $("zs-govde").hidden = false;
  }
  function yukle() {
    return S._sb.rpc("adm_ziyaret_statistika").then(function (r) {
      if (r.error) { hal("Bu səhifə yalnız sayt sahibinin hesabı üçündür.", ["index.html", "Ana səhifə"]); return; }
      try { localStorage.setItem("dt_noz", "1"); } catch (e) {}
      ciz(r.data || {});
    });
  }
  S.hazir().then(function () {
    if (!S.aktiv) { hal("Hesab sistemi qurulmayıb."); return; }
    if (!S.istifadeci) { hal("Statistikanı görmək üçün sayt sahibi hesabı ilə daxil olun.", ["giris.html", "Daxil ol"]); return; }
    yukle(); setInterval(function () { if (document.visibilityState === "visible") yukle(); }, 30000);
    $("zs-yenile").addEventListener("click", yukle);
  });
});
