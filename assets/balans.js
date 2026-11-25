(function () {
var basla = function () {
/* Balans artırma — M10 / bank kartı ilə köçürmə, admin təsdiqi ilə.
   (Paddle ilə onlayn ödəniş sahib tərəfindən aktiv ediləndə görünür; balans avtomatik artır.) */
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
  var secMebleg = null, secUsul = null, sorgular = [], izleId = null, birbasa = false;

  var IK = {
    m10: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="2.8" width="11" height="18.4" rx="2.6"/><path d="M10.5 17.6h3"/><path d="M9 8.5h6M9 11.5h4"/></svg>',
    kart: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.8" y="5.2" width="18.4" height="13.6" rx="2.6"/><path d="M2.8 9.6h18.4M6.5 15h3.5"/></svg>',
    lemon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.6"/><path d="M3.6 12h16.8M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6S14.4 18.2 12 20.6C9.6 18.2 8.4 15.3 8.4 12S9.6 5.8 12 3.4z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.3 21.8l4.9-1.3A9.8 9.8 0 1 0 12 2.2zm0 1.8a8 8 0 1 1-4.2 14.8l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 0 1 12 4zm-3 3.6c-.2 0-.5.1-.7.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.200 4.900 4.300 2.400.9 2.900.7 3.400.7.5-.1 1.700-.7 1.900-1.400.2-.7.2-1.200.2-1.400-.1-.1-.3-.2-.7-.4l-1.900-.9c-.3-.1-.5-.1-.7.1l-.9 1.100c-.2.2-.3.2-.6.1-.3-.2-1.200-.4-2.300-1.400-.9-.8-1.400-1.700-1.600-2-.2-.3 0-.5.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.100c-.2-.5-.5-.5-.7-.5z"/></svg>',
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
  function kartVar() { return !!(M.kartlar && M.kartlar.length); }
  function waLink(s) {
    if (!M.whatsapp) return "";
    var ad = (S.profil && S.profil.ad) ? S.profil.ad : "";
    var t = "Salam! Dərs Toplusu saytında balans artırma ödənişi etmişəm.\n" +
      "Sorğu kodu: " + s.kod + "\nMəbləğ: " + (s.odenecek / 100).toFixed(2).replace(".", ",") + " AZN\n" +
      "Üsul: " + (s.hedef || (s.usul === "m10" ? "M10" : "Bank kartı")) + "\n" +
      (ad ? "Ad: " + ad + "\n" : "") + "Hesab: " + S.istifadeci.email + "\nÇeki əlavə edirəm.";
    return "https://wa.me/" + M.whatsapp + "?text=" + encodeURIComponent(t);
  }
  function waDugme(s, sinif) {
    var l = waLink(s); if (!l) return "";
    return '<a class="btn wa ' + (sinif || "") + '" href="' + l + '" target="_blank" rel="noopener">' + IK.wa + ' Çeki WhatsApp-da göndər</a>';
  }
  function lemonVar() { return !!M.lemon_aktiv && !!(window.PADDLE_CFG && window.PADDLE_CFG.token) && P.some(function (p) { return (p.price || "").indexOf("pri_") === 0; }); }

  function cariCiz() {
    el("b-cari").innerHTML =
      '<span class="bc-etiket">Cari balans</span>' +
      '<span class="bc-mebleg">' + azn(S.balans()) + '</span>' +
      '<a class="kecid" href="kabinet.html">Kabinetə qayıt</a>';
    if (S.naviqasiyaQur) S.naviqasiyaQur();
  }

  function qur() {
    cariCiz();
    if (new URLSearchParams(location.search).get("odenis") === "ok") { odenisSonrasi(); return; }

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

    /* Onlayn ödəniş aktivdirsə: yalnız paket seçilir, klikdən sonra ödəniş pəncərəsi avtomatik açılır */
    if (lemonVar()) {
      birbasa = true;
      ["b-bas2", "b-usullar", "b-davam", "b-nece"].forEach(function (i) { var x = el(i); if (x) x.classList.add("gizli"); });
      /* köhnə keşlənmiş HTML üçün: 2-ci başlıq və açıqlama siyahısını mətnə görə də gizlət */
      [].forEach.call(document.querySelectorAll("h2.b-bas, ol.b-nece"), function (x) { if (!/Məbləği seç/.test(x.textContent) || x.tagName === "OL") { if (x.tagName === "OL" || /Ödəniş yolunu/.test(x.textContent)) x.classList.add("gizli"); } });
      if (el("b-lead")) el("b-lead").textContent = "Məbləği seç — təhlükəsiz ödəniş pəncərəsi avtomatik açılacaq. Ödənişdən dərhal sonra məbləğ balansına yazılır, səni saytın özünə qaytarırıq.";
      paketCiz();
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
        '<span class="bk-mebleg">' + azn(p.mebleg) + '</span></button>';
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
      if (birbasa) { lemonAc(); return; }
      yoxla();
    });
    /* xidmət üçün çatmayan məbləğ varsa, onu ödəyən ən kiçik paketi əvvəlcədən seç */
    var lazim = new URLSearchParams(location.search).get("lazim");
    if (lazim) {
      S.qiymet(lazim).then(function (q) {
        if (!q) return;
        var c = q.qiymet - S.balans();
        if (c <= 0) return;
        var u = P.filter(function (p) { return p.mebleg >= c; })[0] || P[P.length - 1];
        var b = u && el("b-paketler").querySelector('.bkart[data-m="' + u.mebleg + '"]');
        if (b) { if (birbasa) { b.classList.add("secilen"); b.setAttribute("aria-pressed","true"); secMebleg = u.mebleg; } else b.click(); }
      });
    }
  }

  /* ödəniş seçimləri: M10 + hər kart ayrıca seçim */
  var USULLAR = [];
  function ton(t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 360; return h; }
  function nisan(ad, logo) {
    if (logo) return '<img src="' + k(logo) + '" alt="" loading="lazy">';
    var m = String(ad || "?").trim().split(/\s+/).map(function (x) { return x.charAt(0); }).join("").slice(0, 2).toUpperCase();
    return '<span class="bu-mono" style="--h:' + ton(String(ad)) + '">' + k(m) + '</span>';
  }
  function kartEtiket(c) { return (c.bank || "Bank") + " ••" + String(c.nomre).slice(-4); }
  function usulCiz() {
    USULLAR = [];
    if (m10Var()) USULLAR.push({ id: "m10", usul: "m10", kart: null, ad: "M10", alt: "Telefon nömrəsinə və ya QR kodla köçürmə", nisan: nisan("M10", M.m10_logo), logo: !!M.m10_logo });
    (M.kartlar || []).forEach(function (c, i) {
      USULLAR.push({ id: "kart:" + i, usul: "kart", kart: i, ad: (c.bank || "Bank") + " kartı", alt: "Kart ••" + String(c.nomre).slice(-4) + " · kartdan karta köçürmə", nisan: nisan(c.bank, c.logo), logo: !!c.logo });
    });
    if (lemonVar()) USULLAR.push({ id: "lemon", usul: "lemon", kart: null, ad: "Onlayn kartla", alt: "Visa / Mastercard / Apple Pay — avtomatik yazılır", nisan: '<span class="bu-ik2">' + IK.lemon + '</span>', logo: false });
    el("b-usullar").innerHTML = USULLAR.map(function (x) {
      return '<button type="button" class="b-usul v2" data-u="' + x.id + '" aria-pressed="false">' +
        '<span class="bu-logo' + (x.logo ? " has" : "") + '">' + x.nisan + '</span><span class="bu-metn"><b>' + k(x.ad) + '</b><small>' + k(x.alt) + '</small></span>' +
        '<span class="bu-tik" aria-hidden="true">' + IK.ok + '</span></button>';
    }).join("");
    if (USULLAR.length === 1) { secUsul = USULLAR[0].id; el("b-usullar").querySelector(".b-usul").classList.add("sec"); }
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
    if (m.indexOf("kart_yoxdur") > -1) return "Bu kart artıq mövcud deyil. Səhifəni yeniləyib yenidən seç.";
    if (m.indexOf("giris_lazim") > -1) return "Hesaba yenidən daxil ol.";
    if (m.indexOf("sorgu_tapilmadi") > -1) return "Bu sorğu artıq dəyişib. Səhifəni yenilə.";
    return "Alınmadı, bir az sonra yenidən yoxla.";
  }

  function davam() {
    if (secUsul === "lemon") { lemonAc(); return; }
    var d = el("b-davam"); d.disabled = true;
    var u = USULLAR.filter(function (x) { return x.id === secUsul; })[0];
    if (!u) { d.disabled = false; return; }
    var arg = { p_mebleg: secMebleg, p_usul: u.usul };
    if (u.usul === "kart") arg.p_kart = u.kart;
    S._sb.rpc("balans_sorgu_yarat", arg).then(function (r) {
      d.disabled = false;
      if (r.error) { xeber(xetaMetn(r.error), "xeta"); return; }
      var s = r.data;
      sorgular = [s].concat(sorgular.filter(function (x) { return x.id !== s.id; }));
      odenisAc(s);
      sorguCiz();
    });
  }

  var paddleHazir = null;
  function paddleYukle() {
    if (paddleHazir) return paddleHazir;
    paddleHazir = new Promise(function (ok, xeta) {
      var yuk = function () {
        try {
          var C = window.PADDLE_CFG || {};
          if (C.env === "sandbox") window.Paddle.Environment.set("sandbox");
          window.Paddle.Initialize({ token: C.token, eventCallback: paddleHadise });
          ok(window.Paddle);
        } catch (e) { xeta(e); }
      };
      if (window.Paddle) { yuk(); return; }
      var sc = document.createElement("script");
      sc.src = "https://cdn.paddle.com/paddle/v2/paddle.js"; sc.onload = yuk;
      sc.onerror = function () { paddleHazir = null; xeta(new Error("yuklenmedi")); };
      document.head.appendChild(sc);
    });
    return paddleHazir;
  }
  function baza(v) { try { if (v === undefined) return sessionStorage.getItem("bal_evvel"); sessionStorage.setItem("bal_evvel", String(v)); } catch (e) { return null; } }
  function paddleHadise(e) {
    if (!e || e.name !== "checkout.completed") return;
    location.href = "balans.html?odenis=ok";
  }
  /* ödənişdən sonra: balans artana qədər gözlə, sonra kabinetə yönləndir */
  function odenisSonrasi() {
    el("b-sec").classList.add("gizli");
    if (el("b-lead")) el("b-lead").textContent = "Ödənişin alındı. Balansın yenilənir…";
    var evvel = parseInt(baza(), 10), say = 0;
    el("b-xeber").className = "notice ok";
    el("b-xeber").innerHTML = "<b>Ödəniş qəbul olundu.</b> Balansın avtomatik yenilənir, bir neçə saniyə gözlə…";
    function bitir(metn) {
      el("b-xeber").innerHTML = metn + " Səni kabinetə yönləndiririk…";
      setTimeout(function () { location.href = "kabinet.html"; }, 2500);
    }
    (function yoxla() {
      S.yenile().then(function () {
        cariCiz();
        if (!isNaN(evvel) && S.balans() > evvel) { bitir("<b>Balans artırıldı!</b> Cari balans: <b>" + azn(S.balans()) + "</b>."); return; }
        if (++say < 25) setTimeout(yoxla, 2000);
        else bitir("Ödənişin alındı, balans bir neçə dəqiqə ərzində yenilənəcək. Yenilənməsə dəstəyə yaz.");
      }, function () { if (++say < 25) setTimeout(yoxla, 2000); });
    })();
  }
  function lemonAc() {
    var p = P.filter(function (x) { return x.mebleg === secMebleg; })[0];
    if (!p || (p.price || "").indexOf("pri_") !== 0) { xeber("Bu məbləğ üçün onlayn ödəniş hazır deyil.", "xeta"); return; }
    baza(S.balans());
    paddleYukle().then(function (Pd) {
      Pd.Checkout.open({
        items: [{ priceId: p.price, quantity: 1 }],
        customData: { uid: S.istifadeci.id },
        customer: { email: S.istifadeci.email },
        settings: { displayMode: "overlay", theme: "light", locale: "en", variant: "one-page",
                    successUrl: location.origin + "/balans.html?odenis=ok" }
      });
    }).catch(function () { xeber("Ödəniş pəncərəsi açılmadı. İnterneti yoxla və yenidən cəhd et.", "xeta"); });
  }

  /* ---------- ödəniş ekranı ---------- */
  function kartFormat(n) { return String(n).replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim(); }
  function setir(etiket, deyer, kopya) {
    return '<div class="bo-setir"><span>' + etiket + '</span><b>' + k(deyer) + '</b>' +
      (kopya ? '<button type="button" class="bo-kop" data-kop="' + k(kopya) + '" aria-label="Kopyala">' + IK.kopya + '<i>Kopyala</i></button>' : '') + '</div>';
  }

  function kartTap(s) {
    var L = M.kartlar || [], t = null;
    L.forEach(function (c) { if (!t && s.hedef && kartEtiket(c) === s.hedef) t = c; });
    return t || L[0];
  }

  function odenisAc(s) {
    var m10 = s.usul === "m10";
    var c = m10 ? null : kartTap(s);
    var mebAZN = (s.odenecek / 100).toFixed(2);
    var ad = m10 ? "M10" : (c.bank || "Bank") + " kartı";
    var logo = m10 ? M.m10_logo : c.logo;
    var wa = waLink(s);
    var h = '<div class="bo">' +
      '<div class="bo-ust"><button type="button" class="kecid bo-geri" id="bo-geri">← Geri</button>' +
      '<span class="bo-kod">Sorğu kodu: <b>' + k(s.kod) + '</b></span></div>' +
      '<div class="bo-metod"><span class="bu-logo' + (logo ? " has" : "") + '">' + nisan(m10 ? "M10" : c.bank, logo) + '</span>' +
      '<span><b>' + k(ad) + '</b><small>' + (m10 ? "Telefon nömrəsinə və ya QR kodla köçür" : "Kartdan karta köçür") + '</small></span></div>' +
      '<div class="bo-mebleg"><span>Dəqiq bu məbləği göndər</span><b>' + azn(s.odenecek) + '</b>' +
      '<button type="button" class="btn sm bo-kop" data-kop="' + mebAZN + '">' + IK.kopya + '<i>Məbləği kopyala</i></button>' +
      (s.odenecek > s.mebleg ? '<small>Sondakı ' + (s.odenecek - s.mebleg) + ' qəpik ödənişini tanımağımız üçündür — məbləğin hamısı (' + azn(s.odenecek) + ') balansına yazılacaq.</small>' : '<small>Balansına yazılacaq məbləğ: ' + azn(s.odenecek) + '</small>') + '</div>' +
      '<div class="bo-qrid' + (m10 && M.m10_qr ? "" : " bo-tek") + '"><div class="bo-melumat">' +
      (m10
        ? setir("M10 nömrəsi", M.m10_nomre, String(M.m10_nomre).replace(/\s+/g, "")) + (M.m10_ad ? setir("Alan", M.m10_ad) : "")
        : setir("Kart nömrəsi", kartFormat(c.nomre), String(c.nomre).replace(/\s+/g, "")) +
          (c.ad ? setir("Kart sahibi", c.ad) : "") + (c.bank ? setir("Bank", c.bank) : "")) +
      setir("Qeyd / təyinat", s.kod, s.kod) +
      '<ol class="bo-adim">' +
      (m10
        ? '<li>M10 tətbiqini aç → <b>Köçürmələr</b> → nömrəyə köçürmə' + (M.m10_qr ? ' (və ya QR kodu skan et)' : '') + '.</li>'
        : '<li>Bank tətbiqində <b>kartdan karta köçürmə</b> bölməsini aç.</li>') +
      '<li>Nömrəni yaz və məbləğə dəqiq <b>' + azn(s.odenecek) + '</b> yaz.</li>' +
      '<li>Mümkündürsə qeyd hissəsinə <b>' + k(s.kod) + '</b> yaz.</li></ol>' +
      (M.telimat ? '<p class="bo-telimat">' + k(M.telimat) + '</p>' : '') +
      '</div>' +
      (m10 && M.m10_qr ? '<div class="bo-qr"><img src="' + k(M.m10_qr) + '" alt="M10 QR kodu"><span>M10 tətbiqi ilə skan et</span></div>' : '') +
      '</div>' +
      '<div class="bo-cek"><div class="bo-cek-ik">' + IK.wa + '</div><div><b>Ödənişi etdikdən sonra çeki bizimlə paylaş</b>' +
      '<p>Köçürməni bitirən kimi çekin (qəbzin) şəklini WhatsApp ilə göndər. Sorğunun kodu, məbləği və hesabın mesajda hazır yazılıb, yalnız şəkli əlavə et. ' +
      'Sorğu artıq bizdə görünür — çeki yoxlayıb təsdiqləyən kimi məbləğ avtomatik balansına yazılır.</p></div></div>' +
      (wa
        ? '<a class="btn wa lg tam" id="bo-wa" href="' + wa + '" target="_blank" rel="noopener">' + IK.wa + ' Ödəniş etdim — çeki WhatsApp-da göndər</a>'
        : '<button type="button" class="btn solid lg tam" id="bo-odedim">' + IK.ok + ' Ödəniş etdim</button>') +
      '<p class="bo-hal" id="bo-hal"' + (s.hal === "gozleyir" ? "" : " hidden") + '>' + IK.ok + ' Sorğun yoxlamaya göndərildi. Çek gələn kimi baxılacaq. Status bu səhifədə özü yenilənir.</p>' +
      '<button type="button" class="kecid bo-legv" id="bo-legv">Bu sorğunu ləğv et</button>' +
      '</div>';
    el("b-odenis").innerHTML = h;
    el("b-odenis").classList.remove("gizli");
    el("b-sec").classList.add("gizli");
    el("b-xeber").className = ""; el("b-xeber").innerHTML = "";
    if (el("b-odenis").scrollIntoView) el("b-odenis").scrollIntoView({ behavior: "smooth", block: "start" });

    el("bo-geri").onclick = secimeQayit;
    function odedim() {
      if (s.hal !== "yeni") return;
      S._sb.rpc("balans_sorgu_odedim", { p_id: s.id, p_gonderen: null }).then(function (r) {
        if (r.error) { return; }
        s = r.data; yenile(s);
        if (el("bo-hal")) el("bo-hal").hidden = false;
        izle();
      });
    }
    if (el("bo-wa")) el("bo-wa").addEventListener("click", odedim);
    if (el("bo-odedim")) el("bo-odedim").onclick = function () { odedim(); };
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
        '<span>' + k(s.hedef || (s.usul === "m10" ? "M10" : "Kart")) + ' · ' + k(s.kod) + ' · ' + tarix(s.yaradildi) + '</span>' +
        (s.hal === "redd" && s.admin_qeyd ? '<small>' + k(s.admin_qeyd) + '</small>' : '') + '</div>' +
        '<span class="b-hal ' + h[1] + '">' + h[0] + '</span>' +
        (s.hal === "yeni" ? '<button type="button" class="btn sm" data-ac="' + s.id + '">Davam et</button>' : '') +
        (s.hal === "gozleyir" ? waDugme(s, "sm") : '') + '</div>';
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
