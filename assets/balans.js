(function () {
var basla = function () {
/* Balans artırma — M10 / bank kartı ilə köçürmə, admin təsdiqi ilə.
   (Lemon Squeezy sahib tərəfindən aktiv ediləndə onlayn ödəniş də görünür.) */
(function () {
  "use strict";
  var S = window.Sinaq;
  var P = window.BALANS_PAKETLERI || [];

  function el(id) { return document.getElementById(id); }
  function k(t) { return S.kacir(t == null ? "" : String(t)); }
  function azn(q) { return S.qepik(q); }

  if (!S || !S.aktiv) {
    el("b-xeber").className = "notice xeta";
    el("b-xeber").innerHTML = "<b>Hesab sistemi hələ qurulmayıb.</b> " +
      '<a href="movzular.html">Mövzu izahlarına keç</a> — onlar pulsuzdur.';
    el("b-sec").classList.add("gizli");
    return;
  }

  var M = {};            /* ödəniş məlumatları (sahibin doldurduğu) */
  var secMebleg = null, secUsul = null, sorgular = [], izleId = null;

  var IK = {
    m10: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="2.8" width="11" height="18.4" rx="2.6"/><path d="M10.5 17.6h3"/><path d="M9 8.5h6M9 11.5h4"/></svg>',
    kart: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.8" y="5.2" width="18.4" height="13.6" rx="2.6"/><path d="M2.8 9.6h18.4M6.5 15h3.5"/></svg>',
    lemon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.6"/><path d="M3.6 12h16.8M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6S14.4 18.2 12 20.6C9.6 18.2 8.4 15.3 8.4 12S9.6 5.8 12 3.4z"/></svg>',
    kopya: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.4"/><path d="M15.5 8.5V6.4A2.4 2.4 0 0 0 13.1 4H6.4A2.4 2.4 0 0 0 4 6.4v6.7a2.4 2.4 0 0 0 2.4 2.4h2.1"/></svg>',
    ok: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.4 2.7 2.7L16 9.6"/></svg>'
  };

  S.hazir().then(function () {
    if (!S.istifadeci) { location.href = "giris.html?qayit=balans.html"; return; }
    return Promise.all([S.yenile(), S._sb.rpc("odenis_melumat"), S._sb.rpc("balans_sorgularim")]).then(function (r) {
      M = (r[1] && r[1].data) || {};
      sorgular = (r[2] && r[2].data) || [];
      qur();
    });
  });

  function m10Var() { return !!M.m10_nomre; }
  function kartVar() { return !!M.kart_nomre; }
  function lemonVar() { return !!M.lemon_aktiv && P.some(function (p) { return (p.link || "").indexOf("http") === 0; }); }

  function cariCiz() {
    el("b-cari").innerHTML =
      '<span class="bc-etiket">Cari balans</span>' +
      '<span class="bc-mebleg">' + azn(S.balans()) + '</span>' +
      '<a class="kecid" href="kabinet.html">Kabinetə qayıt</a>';
    if (S.naviqasiyaQur) S.naviqasiyaQur();
  }

  function qur() {
    cariCiz();

    /* Hansı xidmət üçün gəlib? */
    var lazim = new URLSearchParams(location.search).get("lazim");
    if (lazim) {
      S.qiymet(lazim).then(function (q) {
        if (!q) return;
        var catmir = q.qiymet - S.balans();
        el("b-xeber").className = "notice";
        el("b-xeber").innerHTML = "<b>" + k(q.ad) + "</b> — " + azn(q.qiymet) +
          (catmir > 0 ? ". Çatmayan məbləğ: <b>" + azn(catmir) + "</b>."
                      : ". Balansın kifayətdir — geri qayıdıb ala bilərsən.");
      });
    }

    if (!m10Var() && !kartVar() && !lemonVar()) {
      el("b-sec").innerHTML = '<div class="notice" style="margin-top:6px"><b>Ödəniş üsulları hazırlanır.</b> ' +
        'Tezliklə M10 və kartla balans artırmaq mümkün olacaq. Təcili lazımdırsa, aşağıdakı dəstək kanalı ilə yaz.</div>';
      sorguCiz();
      return;
    }

    paketCiz();
    usulCiz();
    el("b-davam").addEventListener("click", davam);
    sorguCiz();

    /* açıq ödənilməmiş sorğu varsa birbaşa ona qayıtmaq mümkündür */
    izle();
  }

  function paketCiz() {
    var h = "";
    P.forEach(function (p) {
      h += '<button type="button" class="bkart" data-m="' + p.mebleg + '" aria-pressed="false">' +
        (p.secilen ? '<span class="bk-nisan">ən çox seçilən</span>' : '') +
        '<span class="bk-mebleg">' + azn(p.mebleg) + '</span>' +
        (p.bonus ? '<span class="bk-bonus">+' + azn(p.bonus) + ' bonus</span>' : '') +
        '<span class="bk-izah">' + (p.izah || "") + '</span></button>';
    });
    el("b-paketler").innerHTML = h;
    el("b-paketler").addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".bkart");
      if (!b) return;
      secMebleg = parseInt(b.getAttribute("data-m"), 10);
      [].forEach.call(el("b-paketler").querySelectorAll(".bkart"), function (x) {
        x.classList.toggle("secilen", x === b);
        x.setAttribute("aria-pressed", x === b ? "true" : "false");
      });
      yoxla();
    });
  }

  function usulCiz() {
    var u = [];
    if (m10Var()) u.push(["m10", "M10", "Telefon nömrəsinə və ya QR kodla köçürmə"]);
    if (kartVar()) u.push(["kart", "Bank kartı", "İstənilən bank tətbiqindən kartdan karta köçürmə"]);
    if (lemonVar()) u.push(["lemon", "Onlayn kartla", "Visa / Mastercard — avtomatik yazılır"]);
    el("b-usullar").innerHTML = u.map(function (x) {
      return '<button type="button" class="b-usul" data-u="' + x[0] + '" aria-pressed="false">' +
        '<span class="bu-ik">' + IK[x[0]] + '</span><span><b>' + x[1] + '</b><small>' + x[2] + '</small></span></button>';
    }).join("");
    if (u.length === 1) { secUsul = u[0][0]; el("b-usullar").querySelector(".b-usul").classList.add("sec"); }
    el("b-usullar").addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".b-usul");
      if (!b) return;
      secUsul = b.getAttribute("data-u");
      [].forEach.call(el("b-usullar").querySelectorAll(".b-usul"), function (x) {
        x.classList.toggle("sec", x === b);
        x.setAttribute("aria-pressed", x === b ? "true" : "false");
      });
      yoxla();
    });
  }

  function yoxla() { el("b-davam").disabled = !(secMebleg && secUsul); }

  function xeber(m, nov) {
    el("b-xeber").className = "notice " + (nov || "");
    el("b-xeber").innerHTML = m;
    if (el("b-xeber").scrollIntoView) el("b-xeber").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function xetaMetn(e) {
    var m = (e && (e.message || e)) + "";
    if (m.indexOf("cox_sorgu") > -1) return "Eyni vaxtda ən çox 3 açıq sorğu ola bilər. Əvvəlkiləri tamamla və ya ləğv et.";
    if (m.indexOf("giris_lazim") > -1) return "Hesaba yenidən daxil ol.";
    if (m.indexOf("sorgu_tapilmadi") > -1) return "Bu sorğu artıq dəyişib. Səhifəni yenilə.";
    return "Alınmadı, bir az sonra yenidən yoxla.";
  }

  function davam() {
    if (secUsul === "lemon") { lemonAc(); return; }
    var d = el("b-davam"); d.disabled = true;
    S._sb.rpc("balans_sorgu_yarat", { p_mebleg: secMebleg, p_usul: secUsul }).then(function (r) {
      d.disabled = false;
      if (r.error) { xeber(xetaMetn(r.error), "xeta"); return; }
      var s = r.data;
      sorgular = [s].concat(sorgular.filter(function (x) { return x.id !== s.id; }));
      odenisAc(s);
      sorguCiz();
    });
  }

  function lemonAc() {
    var p = P.filter(function (x) { return x.mebleg === secMebleg; })[0];
    if (!p || (p.link || "").indexOf("http") !== 0) { xeber("Bu məbləğ üçün onlayn ödəniş hazır deyil.", "xeta"); return; }
    var link = p.link + (p.link.indexOf("?") > -1 ? "&" : "?") +
      "checkout[custom][uid]=" + encodeURIComponent(S.istifadeci.id) +
      "&checkout[email]=" + encodeURIComponent(S.istifadeci.email) +
      "&checkout[billing_address][country]=AZ";
    window.open(link, "_blank", "noopener");
  }

  /* ---------- ödəniş ekranı ---------- */
  function kartFormat(n) { return String(n).replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim(); }
  function setir(etiket, deyer, kopya) {
    return '<div class="bo-setir"><span>' + etiket + '</span><b>' + k(deyer) + '</b>' +
      (kopya ? '<button type="button" class="bo-kop" data-kop="' + k(kopya) + '" aria-label="Kopyala">' + IK.kopya + '<i>Kopyala</i></button>' : '') + '</div>';
  }

  function odenisAc(s) {
    var m10 = s.usul === "m10";
    var mebAZN = (s.odenecek / 100).toFixed(2);
    var h = '<div class="bo">' +
      '<div class="bo-ust"><button type="button" class="kecid bo-geri" id="bo-geri">← Geri</button>' +
      '<span class="bo-kod">Sorğu kodu: <b>' + k(s.kod) + '</b></span></div>' +
      '<div class="bo-mebleg"><span>Dəqiq bu məbləği göndər</span><b>' + azn(s.odenecek) + '</b>' +
      '<button type="button" class="btn sm bo-kop" data-kop="' + mebAZN + '">' + IK.kopya + '<i>Məbləği kopyala</i></button>' +
      '<small>Sondakı ' + (s.odenecek - s.mebleg) + ' qəpik ödənişini tanımağımız üçündür — məbləğin hamısı (' + azn(s.odenecek) + ') balansına yazılacaq.</small></div>' +
      '<div class="bo-qrid' + (m10 && M.m10_qr ? "" : " bo-tek") + '"><div class="bo-melumat">' +
      '<h3>' + (m10 ? IK.m10 + " M10 ilə ödə" : IK.kart + " Kartla ödə") + '</h3>' +
      (m10
        ? setir("M10 nömrəsi", M.m10_nomre, String(M.m10_nomre).replace(/\s+/g, "")) + (M.m10_ad ? setir("Alan", M.m10_ad) : "")
        : setir("Kart nömrəsi", kartFormat(M.kart_nomre), String(M.kart_nomre).replace(/\s+/g, "")) +
          (M.kart_ad ? setir("Kart sahibi", M.kart_ad) : "") + (M.kart_bank ? setir("Bank", M.kart_bank) : "")) +
      setir("Qeyd / təyinat", s.kod, s.kod) +
      '<ol class="bo-adim">' +
      (m10
        ? '<li>M10 tətbiqini aç → <b>Köçürmələr</b> → nömrəyə köçürmə' + (M.m10_qr ? ' (və ya QR kodu skan et)' : '') + '.</li>'
        : '<li>Bank tətbiqində <b>kartdan karta köçürmə</b> bölməsini aç.</li>') +
      '<li>Nömrəni yaz və məbləğə dəqiq <b>' + azn(s.odenecek) + '</b> yaz.</li>' +
      '<li>Mümkündürsə qeyd hissəsinə <b>' + k(s.kod) + '</b> yaz.</li>' +
      '<li>Ödənişdən sonra aşağıdakı düyməni bas.</li></ol>' +
      (M.telimat ? '<p class="bo-telimat">' + k(M.telimat) + '</p>' : '') +
      '</div>' +
      (m10 && M.m10_qr ? '<div class="bo-qr"><img src="' + k(M.m10_qr) + '" alt="M10 QR kodu"><span>M10 tətbiqi ilə skan et</span></div>' : '') +
      '</div>' +
      '<label class="bo-gon">Göndərənin adı, telefon nömrəsi və ya kartın son 4 rəqəmi <em>(istəyə bağlı, yoxlamanı sürətləndirir)</em>' +
      '<input type="text" id="bo-gonderen" maxlength="120" placeholder="Məs.: Aysel M., 4417"></label>' +
      '<button type="button" class="btn solid lg tam" id="bo-odedim">' + IK.ok + ' Ödəniş etdim</button>' +
      '<button type="button" class="kecid bo-legv" id="bo-legv">Bu sorğunu ləğv et</button>' +
      '</div>';
    el("b-odenis").innerHTML = h;
    el("b-odenis").classList.remove("gizli");
    el("b-sec").classList.add("gizli");
    el("b-xeber").className = ""; el("b-xeber").innerHTML = "";
    if (el("b-odenis").scrollIntoView) el("b-odenis").scrollIntoView({ behavior: "smooth", block: "start" });

    el("bo-geri").onclick = secimeQayit;
    el("bo-odedim").onclick = function () {
      var b = this; b.disabled = true;
      S._sb.rpc("balans_sorgu_odedim", { p_id: s.id, p_gonderen: el("bo-gonderen").value }).then(function (r) {
        b.disabled = false;
        if (r.error) { xeber(xetaMetn(r.error), "xeta"); return; }
        yenile(r.data);
        el("b-odenis").innerHTML = '<div class="bo bo-son">' + '<span class="bo-son-ik">' + IK.ok + '</span>' +
          '<h3>Ödənişin yoxlanılır</h3><p>Sorğu <b>' + k(s.kod) + '</b> · ' + azn(s.odenecek) +
          '. Ödəniş təsdiqlənən kimi məbləğ avtomatik balansına yazılacaq — bu səhifəni açıq saxlasan, özü yenilənəcək.</p>' +
          '<div class="cta-d" style="justify-content:center"><a class="btn" href="kabinet.html">Kabinetə keç</a>' +
          '<button type="button" class="btn solid" id="bo-yeni">Başqa məbləğ</button></div></div>';
        el("bo-yeni").onclick = secimeQayit;
        izle();
      });
    };
    el("bo-legv").onclick = function () {
      S._sb.rpc("balans_sorgu_legv", { p_id: s.id }).then(function (r) {
        if (r.error) { xeber(xetaMetn(r.error), "xeta"); return; }
        s.hal = "legv"; yenile(s); secimeQayit();
      });
    };
  }

  function secimeQayit() {
    el("b-odenis").classList.add("gizli");
    el("b-sec").classList.remove("gizli");
    if (el("b-sec").scrollIntoView) el("b-sec").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function yenile(s) {
    sorgular = sorgular.map(function (x) { return x.id === s.id ? s : x; });
    sorguCiz();
  }

  /* ---------- sorğularım ---------- */
  var HAL = {
    yeni: ["Ödəniş gözlənilir", "h-yeni"], gozleyir: ["Yoxlanılır", "h-goz"], tesdiq: ["Balansa yazıldı", "h-ok"],
    redd: ["Rədd edildi", "h-redd"], legv: ["Ləğv edildi", "h-legv"]
  };
  function tarix(t) {
    var d = new Date(t), ay = ["yan","fev","mar","apr","may","iyn","iyl","avq","sen","okt","noy","dek"];
    return d.getDate() + " " + ay[d.getMonth()] + ", " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function sorguCiz() {
    var q = el("b-sorgular"); if (!q) return;
    el("b-sorgu-bolme").classList.toggle("gizli", !sorgular.length);
    q.innerHTML = sorgular.slice(0, 10).map(function (s) {
      var h = HAL[s.hal] || [s.hal, ""];
      return '<div class="b-sorgu"><div><b>' + azn(s.hal === "tesdiq" && s.yazilan ? s.yazilan : s.odenecek) + '</b>' +
        '<span>' + (s.usul === "m10" ? "M10" : "Kart") + ' · ' + k(s.kod) + ' · ' + tarix(s.yaradildi) + '</span>' +
        (s.hal === "redd" && s.admin_qeyd ? '<small>' + k(s.admin_qeyd) + '</small>' : '') + '</div>' +
        '<span class="b-hal ' + h[1] + '">' + h[0] + '</span>' +
        (s.hal === "yeni" ? '<button type="button" class="btn sm" data-ac="' + s.id + '">Davam et</button>' : '') + '</div>';
    }).join("");
    [].forEach.call(q.querySelectorAll("[data-ac]"), function (b) {
      b.onclick = function () {
        var s = sorgular.filter(function (x) { return String(x.id) === b.getAttribute("data-ac"); })[0];
        if (s) odenisAc(s);
      };
    });
  }

  /* Yoxlanılan sorğu varsa hər 30 saniyədən bir statusu yoxla; təsdiqlənəndə balans yenilənir */
  function izle() {
    clearTimeout(izleId);
    if (!sorgular.some(function (s) { return s.hal === "gozleyir"; })) return;
    izleId = setTimeout(function () {
      if (document.hidden) { izle(); return; }
      S._sb.rpc("balans_sorgularim").then(function (r) {
        if (r.error || !r.data) { izle(); return; }
        var evvel = {}; sorgular.forEach(function (s) { evvel[s.id] = s.hal; });
        sorgular = r.data;
        var yeniTesdiq = sorgular.filter(function (s) { return s.hal === "tesdiq" && evvel[s.id] === "gozleyir"; });
        sorguCiz();
        if (yeniTesdiq.length) {
          S.yenile().then(function () {
            cariCiz();
            xeber("<b>Ödənişin təsdiqləndi!</b> " + azn(yeniTesdiq[0].yazilan || yeniTesdiq[0].odenecek) +
              " balansına yazıldı. Cari balans: <b>" + azn(S.balans()) + "</b>.", "ok");
          });
        }
        izle();
      });
    }, 30000);
  }

  /* kopyalama düymələri */
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-kop]");
    if (!b) return;
    var t = b.getAttribute("data-kop");
    function oldu() {
      var i = b.querySelector("i"); if (!i) return;
      var k0 = i.textContent; i.textContent = "Kopyalandı ✓"; b.classList.add("ok");
      setTimeout(function () { i.textContent = k0; b.classList.remove("ok"); }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(oldu, oldu);
    else { var x = document.createElement("textarea"); x.value = t; document.body.appendChild(x); x.select();
      try { document.execCommand("copy"); } catch (_) {} x.remove(); oldu(); }
  });
})();
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", basla);
else basla();
})();
