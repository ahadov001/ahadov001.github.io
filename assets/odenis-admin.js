/* Ödəniş sorğuları — yalnız sayt sahibi. Həqiqi icazəni bazadakı funksiyalar yoxlayır. */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  var S = window.Sinaq, $ = function (i) { return document.getElementById(i); };
  var data = [], filtr = "gozleyir", qr = "";
  var USUL = { m10: "M10", kart: "Kart" };
  var HAL = { yeni: "Ödənilməyib", gozleyir: "Yoxlanılmalı", tesdiq: "Təsdiqləndi", redd: "Rədd edildi", legv: "Ləğv edildi" };

  function k(t) { return S.kacir(t == null ? "" : String(t)); }
  function azn(q) { return S.qepik(q); }
  function tarix(t) {
    if (!t) return "";
    var d = new Date(t), p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function hal(m, link) {
    $("os-hal").hidden = false; $("os-govde").hidden = true;
    $("os-hal").innerHTML = k(m) + (link ? ' <a href="' + link[0] + '">' + k(link[1]) + '</a>' : "");
    $("os-say").textContent = "";
  }

  function say() {
    var c = { gozleyir: 0, yeni: 0, tesdiq: 0, redd: 0 };
    data.forEach(function (d) { var h = d.hal === "legv" ? "redd" : d.hal; if (c[h] !== undefined) c[h]++; });
    Object.keys(c).forEach(function (h) { $("os-c-" + h).textContent = c[h]; });
    $("os-say").textContent = c.gozleyir ? c.gozleyir + " ödəniş yoxlanılmalıdır. Bank / M10 tətbiqində gəlib-gəlmədiyini yoxla, sonra təsdiqlə."
                                         : "Yoxlanılmalı ödəniş yoxdur.";
  }

  function ciz() {
    var list = data.filter(function (d) {
      return filtr === "redd" ? (d.hal === "redd" || d.hal === "legv") : d.hal === filtr;
    });
    var q = $("os-siyahi");
    if (!list.length) { q.innerHTML = '<p class="gb-bos">Bu bölmədə sorğu yoxdur.</p>'; return; }
    q.innerHTML = "";
    list.forEach(function (d) {
      var kart = document.createElement("div");
      kart.className = "gb-kart os-kart" + (d.hal === "tesdiq" || d.hal === "redd" || d.hal === "legv" ? " gb-b" : "");
      kart.innerHTML =
        '<div class="gb-bas"><span class="gb-nov os-' + d.hal + '">' + HAL[d.hal] + '</span>' +
        '<span class="gb-tarix">' + tarix(d.yaradildi) + (d.odendi ? ' · ödədim: ' + tarix(d.odendi) : '') + '</span></div>' +
        '<div class="os-esas"><b class="os-meb">' + azn(d.hal === "tesdiq" && d.yazilan ? d.yazilan : d.odenecek) + '</b>' +
        '<span class="os-cip">' + (USUL[d.usul] || d.usul) + '</span><span class="os-cip">Kod: ' + k(d.kod) + '</span>' +
        '<span class="os-cip">Paket: ' + azn(d.mebleg) + '</span></div>' +
        '<p class="gb-meta">İstifadəçi: <b>' + k(d.ad || "—") + '</b> · ' + k(d.email || "") + ' · balans: ' + azn(d.cari_balans || 0) + '</p>' +
        (d.gonderen ? '<p class="gb-ktx">Göndərən: ' + k(d.gonderen) + '</p>' : '') +
        (d.admin_qeyd ? '<p class="gb-meta">Qeyd: ' + k(d.admin_qeyd) + '</p>' : '') +
        '<div class="gb-dugme"></div>';
      var dg = kart.querySelector(".gb-dugme");
      if (d.hal === "gozleyir" || d.hal === "yeni") {
        var t = document.createElement("button"); t.className = "btn sm solid"; t.textContent = "Təsdiqlə və balansa yaz";
        var r = document.createElement("button"); r.className = "btn sm gb-sil"; r.textContent = "Rədd et";
        dg.appendChild(r); dg.appendChild(t);
        t.onclick = function () { tesdiqAc(kart, d); };
        r.onclick = function () { reddAc(kart, d); };
      }
      q.appendChild(kart);
    });
  }

  function tesdiqAc(kart, d) {
    var dg = kart.querySelector(".gb-dugme");
    dg.innerHTML = '<label class="os-tes">Balansa yazılacaq məbləğ (AZN) <input type="number" step="0.01" min="0.01" value="' +
      (d.odenecek / 100).toFixed(2) + '"></label><button class="btn sm">Ləğv</button><button class="btn sm solid">Balansa yaz</button>';
    var inp = dg.querySelector("input"), b = dg.querySelectorAll("button");
    b[0].onclick = ciz;
    b[1].onclick = function () {
      var q = Math.round(parseFloat(String(inp.value).replace(",", ".")) * 100);
      if (!q || q <= 0) { inp.focus(); return; }
      b[1].disabled = true; b[1].textContent = "Yazılır…";
      S._sb.rpc("adm_sorgu_tesdiq", { p_id: d.id, p_mebleg: q }).then(function (r) {
        if (r.error) { b[1].disabled = false; b[1].textContent = "Balansa yaz"; alert("Alınmadı: " + r.error.message); return; }
        d.hal = "tesdiq"; d.yazilan = r.data.yazilan; d.cari_balans = r.data.balans; say(); ciz();
      });
    };
  }

  function reddAc(kart, d) {
    var dg = kart.querySelector(".gb-dugme");
    dg.innerHTML = '<label class="os-tes">Səbəb (istifadəçi görəcək, istəyə bağlı) <input type="text" maxlength="300" placeholder="Məs.: ödəniş daxil olmayıb"></label>' +
      '<button class="btn sm">Ləğv</button><button class="btn sm gb-sil">Rədd et</button>';
    var inp = dg.querySelector("input"), b = dg.querySelectorAll("button");
    b[0].onclick = ciz;
    b[1].onclick = function () {
      b[1].disabled = true;
      S._sb.rpc("adm_sorgu_redd", { p_id: d.id, p_qeyd: inp.value }).then(function (r) {
        if (r.error) { b[1].disabled = false; alert("Alınmadı: " + r.error.message); return; }
        d.hal = "redd"; d.admin_qeyd = inp.value; say(); ciz();
      });
    };
  }

  function yukle() {
    $("os-say").textContent = "Yüklənir…";
    return S._sb.rpc("adm_sorgular").then(function (r) {
      if (r.error) { hal("Bu səhifə yalnız sayt sahibinin hesabı üçündür.", ["index.html", "Ana səhifə"]); return false; }
      data = r.data || []; $("os-hal").hidden = true; $("os-govde").hidden = false; say(); ciz(); return true;
    });
  }

  /* ---------- ödəniş məlumatları formu ---------- */
  function formDoldur(m) {
    var f = $("os-form");
    ["m10_nomre", "m10_ad", "whatsapp", "telimat"].forEach(function (n) { f.elements[n].value = m[n] || ""; });
    f.elements.lemon_aktiv.checked = !!m.lemon_aktiv;
    kartlarCiz(m.kartlar || []);
    qr = m.m10_qr || ""; qrCiz();
    var us = []; if (m.m10_nomre) us.push("M10"); if ((m.kartlar || []).length) us.push("Kart (" + m.kartlar.length + ")"); if (m.whatsapp) us.push("WhatsApp"); if (m.lemon_aktiv) us.push("Lemon");
    $("os-ayar-hal").textContent = us.length ? "Aktiv: " + us.join(", ") : "Doldurulmayıb — istifadəçilər hələ ödəniş edə bilmir";
    $("os-ayar").open = !us.length;
  }
  function kartlarCiz(list) {
    var q = $("os-kartlar"); q.innerHTML = "";
    (list.length ? list : []).forEach(function (c) { kartSetir(c); });
    $("os-kart-elave").hidden = q.children.length >= 6;
  }
  function kartSetir(c) {
    var q = $("os-kartlar"), d = document.createElement("div"); d.className = "os-kart-s";
    d.innerHTML = '<input data-k="nomre" inputmode="numeric" placeholder="Kart nömrəsi: 4169 0000 0000 0000" maxlength="30" aria-label="Kart nömrəsi">' +
      '<input data-k="ad" placeholder="Kart sahibi" maxlength="80" aria-label="Kart sahibi">' +
      '<input data-k="bank" placeholder="Bank" maxlength="60" aria-label="Bank">' +
      '<button type="button" class="btn sm gb-sil" aria-label="Kartı sil">Sil</button>';
    ["nomre", "ad", "bank"].forEach(function (n) { d.querySelector('[data-k="' + n + '"]').value = (c && c[n]) || ""; });
    d.querySelector("button").onclick = function () { d.remove(); $("os-kart-elave").hidden = q.children.length >= 6; };
    q.appendChild(d);
    $("os-kart-elave").hidden = q.children.length >= 6;
  }
  $("os-kart-elave").addEventListener("click", function () { kartSetir({}); });
  function kartlariTop() {
    return [].map.call($("os-kartlar").children, function (d) {
      var o = {}; ["nomre", "ad", "bank"].forEach(function (n) { o[n] = d.querySelector('[data-k="' + n + '"]').value.trim(); }); return o;
    }).filter(function (o) { return o.nomre; });
  }
  function waNomre(v) {
    var d = String(v || "").replace(/\D/g, "");
    if (!d) return "";
    if (d.length === 10 && d[0] === "0") d = "994" + d.slice(1);
    else if (d.length === 9) d = "994" + d;
    return d;
  }
  function qrCiz() { var i = $("os-qr-img"); i.hidden = !qr; if (qr) i.src = qr; }
  $("os-qr-fayl").addEventListener("change", function () {
    var f = this.files && this.files[0]; this.value = "";
    if (!f || !/^image\//.test(f.type)) return;
    var url = URL.createObjectURL(f), im = new Image();
    im.onload = function () {
      var O = Math.min(520, Math.max(im.width, im.height)), sc = O / Math.max(im.width, im.height);
      var c = document.createElement("canvas"); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc);
      var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      var d = c.toDataURL("image/png"); if (d.length > 380000) d = c.toDataURL("image/jpeg", 0.9);
      qr = d; qrCiz();
    };
    im.src = url;
  });
  $("os-qr-sil").onclick = function () { qr = ""; qrCiz(); };
  $("os-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = this, x = $("os-form-x"), p = {};
    ["m10_nomre", "m10_ad", "telimat"].forEach(function (n) { p[n] = f.elements[n].value; });
    p.lemon_aktiv = f.elements.lemon_aktiv.checked; p.m10_qr = qr;
    p.kartlar = kartlariTop();
    for (var i = 0; i < p.kartlar.length; i++) {
      if (!/^[\d\s]{12,23}$/.test(p.kartlar[i].nomre)) { x.className = "pf-xeber xeta"; x.textContent = (i + 1) + "-ci kartın nömrəsi yalnız rəqəmlərdən (12–19) ibarət olmalıdır."; return; }
    }
    p.whatsapp = waNomre(f.elements.whatsapp.value);
    if (p.whatsapp && (p.whatsapp.length < 9 || p.whatsapp.length > 15)) { x.className = "pf-xeber xeta"; x.textContent = "WhatsApp nömrəsi düzgün deyil."; return; }
    x.className = "pf-xeber"; x.textContent = "Saxlanır…";
    S._sb.rpc("adm_ayar_yaz", { p: p }).then(function (r) {
      if (r.error) { x.className = "pf-xeber xeta"; x.textContent = "Saxlanmadı: " + r.error.message; return; }
      x.className = "pf-xeber ok"; x.textContent = "Saxlandı ✓"; formDoldur(r.data || p); $("os-ayar").open = true;
    });
  });

  document.querySelectorAll("#os-bar .gb-f").forEach(function (b) {
    b.addEventListener("click", function () {
      filtr = b.getAttribute("data-f");
      document.querySelectorAll("#os-bar .gb-f").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      ciz();
    });
  });
  $("os-yenile").addEventListener("click", yukle);

  S.hazir().then(function () {
    if (!S.aktiv || !S._sb) { hal("Hesab sistemi hazır deyil."); return; }
    if (!S.istifadeci) { hal("Davam etmək üçün hesabına daxil ol.", ["giris.html?qayit=odenis-sorgulari.html", "Giriş"]); return; }
    yukle().then(function (ok) {
      if (!ok) return;
      S._sb.rpc("odenis_melumat").then(function (r) { formDoldur((r && r.data) || {}); });
    });
  });
});
