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
  var Q = [];
  function tar(t) { if (!t) return "—"; var d = new Date(t); return d.toLocaleDateString("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + d.toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" }); }
  function qciz() {
    var a = ($("zs-axtar").value || "").toLowerCase().trim();
    var L = Q.filter(function (x) { return !a || ((x.ad || "") + " " + (x.email || "")).toLowerCase().indexOf(a) >= 0; });
    $("zs-qeyd").innerHTML = L.length ? L.map(function (x, i) {
      return '<div class="zs-qs"><span class="zs-qn">' + (Q.length - Q.indexOf(x)) + '</span><span class="zs-qa"><b>' + k(x.ad || "(adsız)") + '</b><small>' + k(x.email || "") + '</small></span>' +
        '<span class="zs-qt"><small>Qeydiyyat</small>' + k(tar(x.t)) + '</span><span class="zs-qt"><small>Son giriş</small>' + k(tar(x.son)) + '</span>' +
        '<span class="zs-qb">' + k(S.qepik(x.balans || 0)) + '<button type="button" class="zs-art" data-id="' + k(x.id || "") + '">+ Balans</button></span></div>';
    }).join("") : '<p class="xirda">Heç kim tapılmadı.</p>';
  }
  var M = null;
  function modal(x) {
    if (M) M.remove();
    M = document.createElement("div"); M.className = "zs-modal";
    M.innerHTML = '<div class="zs-mk" role="dialog"><h3>Balans artır</h3><p class="xirda"><b>' + k(x.ad || "(adsız)") + '</b><br>' + k(x.email || "") + '<br>Cari balans: ' + k(S.qepik(x.balans || 0)) + '</p>' +
      '<label>Məbləğ (AZN)<input type="number" id="zs-m" min="0.01" max="1000" step="0.01" inputmode="decimal" placeholder="məs. 5.00"></label>' +
      '<p class="zs-mx" id="zs-mx"></p><div class="zs-md"><button type="button" class="btn ghost" id="zs-l">Ləğv et</button><button type="button" class="btn" id="zs-t">Davam</button></div></div>';
    document.body.appendChild(M);
    var inp = M.querySelector("#zs-m"), msg = M.querySelector("#zs-mx"), t = M.querySelector("#zs-t"), eminmi = false;
    function bagla() { M.remove(); M = null; }
    M.addEventListener("click", function (e) { if (e.target === M) bagla(); });
    M.querySelector("#zs-l").addEventListener("click", bagla);
    inp.focus();
    inp.addEventListener("input", function () { eminmi = false; t.textContent = "Davam"; msg.textContent = ""; });
    t.addEventListener("click", function () {
      var az = parseFloat(String(inp.value).replace(",", ".")), q = Math.round(az * 100);
      if (!isFinite(q) || q <= 0 || q > 100000) { msg.textContent = "Məbləğ 0.01 – 1000 AZN arası olmalıdır."; return; }
      if (!eminmi) { eminmi = true; msg.textContent = (x.ad || x.email) + " hesabına " + (q / 100).toFixed(2) + " AZN əlavə ediləcək. Təsdiq üçün yenidən basın."; t.textContent = "Təsdiq et"; return; }
      t.disabled = true; t.textContent = "Göndərilir…";
      S._sb.rpc("adm_balans_elave", { p_id: x.id, p_mebleg: q }).then(function (r) {
        if (r.error) { t.disabled = false; t.textContent = "Təsdiq et"; msg.textContent = "Xəta: " + (r.error.message || "alınmadı"); return; }
        msg.textContent = "Əlavə edildi. Yeni balans: " + S.qepik(r.data.balans); t.hidden = true;
        M.querySelector("#zs-l").textContent = "Bağla"; qyukle();
      });
    });
  }
  function qyukle() {
    return S._sb.rpc("adm_qeydiyyatlar").then(function (r) {
      if (r.error || !r.data) return;
      Q = r.data.siyahi || []; $("zs-qsay").textContent = "(cəmi " + (r.data.say || Q.length) + ")"; qciz();
    });
  }
  function yukle() {
    qyukle();
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
    $("zs-axtar").addEventListener("input", qciz);
    $("zs-qeyd").addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".zs-art"); if (!b) return;
      var x = Q.filter(function (u) { return u.id === b.getAttribute("data-id"); })[0]; if (x) modal(x);
    });
  });
});
