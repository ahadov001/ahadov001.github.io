(function () {
var basla = function () {
/* Şəxsi kabinet — irəliləyiş, transkript, alışlar */
(function () {
  "use strict";
  var S = window.Sinaq, X = window.XERITE || { fennler: [] };

  function el(id) { return document.getElementById(id); }
  function faiz(d, u) { return u ? Math.round(d / u * 100) : 0; }
  function tarix(t) {
    var d = new Date(t);
    var ay = ["yan","fev","mar","apr","may","iyn","iyl","avq","sen","okt","noy","dek"];
    return d.getDate() + " " + ay[d.getMonth()] + " " + d.getFullYear() + ", " +
           String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function sinif(f) { return f >= 80 ? "yaxsi" : f >= 50 ? "orta" : "zeif"; }

  if (!S || !S.aktiv) {
    el("k-yuklenir").className = "notice xeta";
    el("k-yuklenir").innerHTML = "<b>Hesab sistemi hələ qurulmayıb.</b> " +
      '<a href="movzular.html">Mövzu izahlarına keç</a> — onlar pulsuzdur.';
    return;
  }

  S.hazir().then(function () {
    if (!S.istifadeci) { location.href = "giris.html?qayit=kabinet.html"; return; }
    return S.yenile().then(qur);
  });

  function qur() {
    el("k-yuklenir").classList.add("gizli");
    el("k-govde").classList.remove("gizli");

    basliqCiz();

    el("k-cixis").addEventListener("click", function () {
      S.cixis().then(function () { location.href = "index.html"; });
    });

    document.querySelectorAll(".kt-d").forEach(function (d) {
      d.addEventListener("click", function () {
        var k = d.getAttribute("data-k");
        /* həm yan menyuda, həm sekmələrdə eyni bölmə işarələnsin */
        document.querySelectorAll(".kt-d").forEach(function (x) {
          x.classList.toggle("aktiv", x.getAttribute("data-k") === k);
        });
        ["ireli", "transkript", "alislar"].forEach(function (n) {
          el("k-" + n).classList.toggle("gizli", n !== k);
        });
        var t = el("k-teb");
        if (d.closest(".k-menyu") && t && t.scrollIntoView) t.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    var prm = el("k-param");
    if (prm) prm.addEventListener("click", function () { profilAc(true); });

    dashQur();
    statQur();
    ireliQur();
    transkriptQur();
    alislarQur();
    profilQur();
    el("k-qelem").addEventListener("click", function () {
      profilAc(el("k-profil").classList.contains("gizli"));
    });

    /* kabinet.html#transkript kimi keçidlər uyğun bölməni açır */
    function hashdanAc() {
      var h = (location.hash || "").replace("#", "");
      if (h === "profil") { profilAc(true); return; }
      if (["ireli", "transkript", "alislar"].indexOf(h) < 0) return;
      var d = document.querySelector('.kt-d[data-k="' + h + '"]');
      if (d) d.click();
    }
    hashdanAc();
    window.addEventListener("hashchange", hashdanAc);
  }

  /* ----------------------------------------------------- başlıq (avatar, ad, bio) */
  var HEDEFLER = [
    ["", "Seçilməyib"], ["IX sinif buraxılış", "IX sinif buraxılış"],
    ["XI sinif buraxılış", "XI sinif buraxılış"], ["Qəbul imtahanı", "Qəbul imtahanı"],
    ["MİQ", "MİQ — müəllim qəbulu"], ["Öyrənirəm", "Sadəcə öyrənirəm"]
  ];
  function basliqCiz() {
    var p = S.profil || {};
    el("k-av").innerHTML = S.avatar(p);
    el("k-ad").textContent = p.ad ? "Salam, " + p.ad + "!" : "Salam!";
    el("k-alt").textContent = S.istifadeci.email +
      (p.yaradildi ? " · " + tarix(p.yaradildi) + " tarixindən" : "");
    el("k-bio").textContent = p.bio || "";
    el("k-bio").classList.toggle("gizli", !p.bio);
    var c = "";
    if (p.hedef && p.hedef !== "Öyrənirəm") c += '<span class="k-cip">🎯 ' + S.kacir(p.hedef) + '</span>';
    else if (p.hedef) c += '<span class="k-cip">📚 Öyrənirəm</span>';
    el("k-cipler").innerHTML = c;
  }

  /* ----------------------------------------------------- profil: şəkil, ad, görünüş, hesab */
  var taslaq = {};
  function profilQur() {
    var p = S.profil || {};
    taslaq = { ad: p.ad || "", bio: p.bio || "", hedef: p.hedef || "", avatar: p.avatar || "", reng: p.reng || "a1" };

    var rnk = S.RENGLER.map(function (r) {
      return '<button type="button" class="pf-rnk av-' + r + '" data-reng="' + r + '" aria-label="Rəng ' + r + '"></button>';
    }).join("");
    var emj = S.EMOJILER.map(function (e) {
      return '<button type="button" class="pf-emj" data-emj="' + e + '" aria-label="' + e + '">' + e + '</button>';
    }).join("");
    var hd = HEDEFLER.map(function (x) {
      return '<option value="' + S.kacir(x[0]) + '">' + S.kacir(x[1]) + '</option>';
    }).join("");
    var tm = S.tema();

    el("k-profil").innerHTML =
      '<div class="pf-qrid">' +
        '<div class="pf-kart">' +
          '<h3>Şəkil</h3>' +
          '<div class="pf-onizle"><div class="pf-av" id="pf-av"></div>' +
            '<div class="pf-dgm">' +
              '<label class="btn sm solid pf-yukle" for="pf-fayl">Şəkil yüklə</label>' +
              '<input type="file" id="pf-fayl" accept="image/*" hidden>' +
              '<button type="button" class="btn sm" id="pf-sil">Şəkli sil</button>' +
            '</div></div>' +
          '<p class="pf-ipucu">Şəkil avtomatik kvadrata kəsilib kiçildilir. Və ya hazır emoji seç:</p>' +
          '<div class="pf-emjler">' + emj + '</div>' +
          '<p class="pf-ipucu" style="margin-top:14px">Fon rəngi:</p>' +
          '<div class="pf-rnkler">' + rnk + '</div>' +
        '</div>' +

        '<div class="pf-kart">' +
          '<h3>Haqqında</h3>' +
          '<label class="pf-sah"><span>Ad</span>' +
            '<input type="text" id="pf-ad" maxlength="60" autocomplete="name"></label>' +
          '<label class="pf-sah"><span>Hədəfim</span>' +
            '<select id="pf-hedef">' + hd + '</select></label>' +
          '<label class="pf-sah"><span>Qısa məlumat <em id="pf-say">0/140</em></span>' +
            '<textarea id="pf-bio" rows="3" maxlength="140" ' +
            'placeholder="Məs.: Tibb universitetinə hazırlaşıram"></textarea></label>' +
          '<div class="pf-alt"><button type="button" class="btn solid" id="pf-saxla">Yadda saxla</button>' +
            '<span class="pf-xeber" id="pf-xeber" role="status"></span></div>' +
        '</div>' +

        '<div class="pf-kart">' +
          '<h3>Görünüş</h3>' +
          '<p class="pf-ipucu">Saytın rəng rejimi (yalnız bu brauzerdə yadda qalır):</p>' +
          '<div class="pf-tema" id="pf-tema">' +
            '<button type="button" data-t="sistem">Sistem</button>' +
            '<button type="button" data-t="aciq">Açıq</button>' +
            '<button type="button" data-t="tund">Tünd</button>' +
          '</div>' +
        '</div>' +

        '<div class="pf-kart">' +
          '<h3>Hesab</h3>' +
          '<label class="pf-sah"><span>E-poçt</span>' +
            '<input type="text" id="pf-eposta" readonly></label>' +
          '<label class="pf-sah"><span>Yeni parol</span>' +
            '<input type="password" id="pf-parol" minlength="6" autocomplete="new-password" ' +
            'placeholder="Ən azı 6 simvol"></label>' +
          '<div class="pf-alt"><button type="button" class="btn" id="pf-parol-d">Parolu dəyiş</button>' +
            '<span class="pf-xeber" id="pf-parol-x" role="status"></span></div>' +
        '</div>' +
      '</div>';

    el("pf-ad").value = taslaq.ad;
    el("pf-bio").value = taslaq.bio;
    el("pf-hedef").value = taslaq.hedef;
    el("pf-eposta").value = S.istifadeci.email || "";
    sayYaz();
    onizleCiz();
    temaIsaret(tm);

    el("pf-ad").addEventListener("input", function () { taslaq.ad = this.value; onizleCiz(); });
    el("pf-bio").addEventListener("input", function () { taslaq.bio = this.value; sayYaz(); });
    el("pf-hedef").addEventListener("change", function () { taslaq.hedef = this.value; });

    el("k-profil").addEventListener("click", function (e) {
      var t = e.target;
      var r = t.closest && t.closest("[data-reng]");
      if (r) { taslaq.reng = r.getAttribute("data-reng"); onizleCiz(); return; }
      var m = t.closest && t.closest("[data-emj]");
      if (m) { taslaq.avatar = "e:" + m.getAttribute("data-emj"); onizleCiz(); return; }
      var tt = t.closest && t.closest("#pf-tema [data-t]");
      if (tt) { S.tema(tt.getAttribute("data-t")); temaIsaret(tt.getAttribute("data-t")); }
    });
    el("pf-sil").addEventListener("click", function () { taslaq.avatar = ""; onizleCiz(); });
    el("pf-fayl").addEventListener("change", function () {
      var f = this.files && this.files[0]; this.value = "";
      if (!f) return;
      sekilHazirla(f).then(function (u) { taslaq.avatar = u; onizleCiz(); },
        function (m) { xeber("pf-xeber", m, true); });
    });
    el("pf-saxla").addEventListener("click", saxla);
    el("pf-parol-d").addEventListener("click", parolDeyis);
  }

  /* qələm düyməsi: fərdiləşdirmə panelini aç / bağla */
  function profilAc(ac) {
    var p = el("k-profil"), d = el("k-qelem");
    p.classList.toggle("gizli", !ac);
    d.setAttribute("aria-expanded", ac ? "true" : "false");
    d.classList.toggle("aktiv", !!ac);
    if (ac && p.scrollIntoView) p.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function sayYaz() { el("pf-say").textContent = (taslaq.bio || "").length + "/140"; }
  function temaIsaret(t) {
    document.querySelectorAll("#pf-tema [data-t]").forEach(function (b) {
      b.classList.toggle("aktiv", b.getAttribute("data-t") === t);
    });
  }
  function onizleCiz() {
    el("pf-av").innerHTML = S.avatar({ avatar: taslaq.avatar, reng: taslaq.reng, ad: taslaq.ad });
    document.querySelectorAll("[data-reng]").forEach(function (b) {
      b.classList.toggle("sec", b.getAttribute("data-reng") === taslaq.reng);
    });
    document.querySelectorAll("[data-emj]").forEach(function (b) {
      b.classList.toggle("sec", taslaq.avatar === "e:" + b.getAttribute("data-emj"));
    });
  }
  function xeber(id, m, xeta) {
    var x = el(id); x.textContent = m; x.className = "pf-xeber" + (xeta ? " xeta" : " ok");
  }

  /* Şəkli kvadrata kəs, 192×192-yə kiçilt, JPEG-ə çevir */
  function sekilHazirla(fayl) {
    return new Promise(function (hell, rədd) {
      if (!/^image\//.test(fayl.type)) return rədd("Yalnız şəkil faylı seçin.");
      if (fayl.size > 12 * 1024 * 1024) return rədd("Şəkil çox böyükdür (12 MB-dan az olmalıdır).");
      var url = URL.createObjectURL(fayl), im = new Image();
      im.onload = function () {
        var O = 192, c = document.createElement("canvas"); c.width = c.height = O;
        var x = c.getContext("2d"), q = Math.min(im.width, im.height);
        x.fillStyle = "#fff"; x.fillRect(0, 0, O, O);
        x.drawImage(im, (im.width - q) / 2, (im.height - q) / 2, q, q, 0, 0, O, O);
        URL.revokeObjectURL(url);
        var d = c.toDataURL("image/jpeg", 0.82);
        if (d.length > 58000) d = c.toDataURL("image/jpeg", 0.6);
        d.length > 58000 ? rədd("Şəkil işlənə bilmədi, başqa şəkil seçin.") : hell(d);
      };
      im.onerror = function () { URL.revokeObjectURL(url); rədd("Bu şəkil oxunmadı. JPG və ya PNG seçin."); };
      im.src = url;
    });
  }

  function saxla() {
    var b = el("pf-saxla");
    var ad = (taslaq.ad || "").trim();
    if (!ad) { xeber("pf-xeber", "Ad boş ola bilməz.", true); return; }
    b.disabled = true; b.textContent = "Saxlanır…";
    S.profilYaz({
      ad: ad.slice(0, 60), bio: (taslaq.bio || "").trim().slice(0, 140) || null,
      hedef: taslaq.hedef || null, avatar: taslaq.avatar || null, reng: taslaq.reng || "a1"
    }).then(function (r) {
      b.disabled = false; b.textContent = "Yadda saxla";
      if (!r.ok) { xeber("pf-xeber", "Saxlanmadı: " + (r.mesaj || "xəta"), true); return; }
      basliqCiz();
      xeber("pf-xeber", r.yerel
        ? "Saxlandı (yalnız bu cihazda — bütün cihazlar üçün baza yenilənməlidir)."
        : "Saxlandı ✓", false);
    });
  }

  function parolDeyis() {
    var v = el("pf-parol").value;
    if (v.length < 6) { xeber("pf-parol-x", "Parol ən azı 6 simvol olmalıdır.", true); return; }
    var b = el("pf-parol-d"); b.disabled = true;
    S.parolDeyis(v).then(function (r) {
      b.disabled = false;
      if (r.ok) { el("pf-parol").value = ""; xeber("pf-parol-x", "Parol dəyişdirildi ✓", false); }
      else xeber("pf-parol-x", r.mesaj || "Dəyişdirilmədi", true);
    });
  }

  /* ----------------------------------------------------- ümumi statistika */
  function statQur() {
    var n = S.neticeler || [];
    var islenmis = {};
    n.forEach(function (r) { if (r.fenn && r.movzu) islenmis[r.fenn + ":" + r.movzu] = 1; });
    var ummovzu = 0;
    X.fennler.forEach(function (f) { ummovzu += f.movzular.length; });

    var ortaF = n.length
      ? Math.round(n.reduce(function (a, r) { return a + faiz(r.dogru, r.umumi); }, 0) / n.length)
      : 0;
    var sonYeddi = n.filter(function (r) {
      return (Date.now() - new Date(r.tarix).getTime()) < 7 * 864e5;
    }).length;

    el("k-stat").innerHTML =
      kart(n.length, "həll edilmiş test", "k1", IK.test) +
      kart(ortaF + "%", "orta nəticə", "k2", IK.chart) +
      kart(Object.keys(islenmis).length + "<small>/" + ummovzu + "</small>", "işlənmiş mövzu", "k3", IK.book) +
      kart(sonYeddi, "son 7 gündə", "k4", IK.clock);
  }
  function kart(b, a, r, i) {
    return '<div class="ks">' + (i ? '<span class="ki ' + r + '">' + i + '</span>' : '') +
      '<b>' + b + '</b><span>' + a + '</span></div>';
  }

  /* ----------------------------------------------------- ümumi baxış (dashboard) */
  function ik(p) {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }
  var IK = {
    test: ik('<rect x="3.8" y="3.8" width="16.4" height="16.4" rx="4.2"/><path d="m8.2 12.2 2.7 2.7 4.9-5.6"/>'),
    chart: ik('<path d="M4 20h16"/><path d="M7 16.5v-5M12 16.5V7M17 16.5v-8"/>'),
    book: ik('<path d="M2.8 5.6C5.3 4.2 8 4.2 12 6.1c4-1.9 6.7-1.9 9.2-.5v13.6c-2.5-1.4-5.2-1.4-9.2.5-4-1.9-6.7-1.9-9.2-.5z"/><path d="M12 6.1v13.6"/>'),
    clock: ik('<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3 2"/>'),
    flame: ik('<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.4-5.4 3.6-7.8.5 1.6 1.4 2.6 2.4 3.1C11.6 6.8 12.8 4.4 15.2 3c-.4 2.8.9 4.6 2.2 6.3 1 1.3 1.6 2.7 1.6 4.6C19 18 16 21 12 21z"/>'),
    star: ik('<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>'),
    trophy: ik('<path d="M8 4h8v5.2a4 4 0 0 1-8 0z"/><path d="M8 6H5.2v1.1A3.1 3.1 0 0 0 8.3 10.2M16 6h2.8v1.1a3.1 3.1 0 0 1-3.1 3.1"/><path d="M12 13.2v3.6M8.6 20.3h6.8M9.6 16.8h4.8"/>'),
    bag: ik('<path d="M5.5 8h13l-1 12.5h-11z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>')
  };
  function gunAcar(t) { var d = new Date(t); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }
  /* ardıcıl aktiv günlər: bu gündən (və ya dünəndən) geriyə fasiləsiz test həll edilən günlər */
  function ardicil(n) {
    var gunler = {};
    n.forEach(function (r) { if (r.tarix) gunler[gunAcar(r.tarix)] = 1; });
    var d = new Date(); d.setHours(12, 0, 0, 0);
    if (!gunler[gunAcar(d)]) d.setDate(d.getDate() - 1);
    var say = 0;
    while (gunler[gunAcar(d)]) { say++; d.setDate(d.getDate() - 1); }
    return say;
  }
  function dashQur() {
    var n = S.neticeler || [], p = S.profil || {};
    var islenmis = {}, ummovzu = 0;
    n.forEach(function (r) { if (r.fenn && r.movzu) islenmis[r.fenn + ":" + r.movzu] = 1; });
    X.fennler.forEach(function (f) { ummovzu += f.movzular.length; });
    var pay = ummovzu ? Math.round(Object.keys(islenmis).length / ummovzu * 100) : 0;
    var bal = Math.round(n.reduce(function (a, r) {
      var b = (r.bal !== null && r.bal !== undefined) ? +r.bal : +r.dogru; return a + (isNaN(b) ? 0 : b);
    }, 0) * 100) / 100;
    var gun = ardicil(n);
    var C = 2 * Math.PI * 50;
    var d = el("k-dash");
    if (d) d.innerHTML =
      '<div class="k-salam">' +
        '<div class="k-halqa"><svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="kgrad" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#155EEF"/><stop offset="1" stop-color="#0BA5A4"/></linearGradient></defs>' +
        '<circle cx="60" cy="60" r="50" class="hb"/><circle cx="60" cy="60" r="50" class="hf" stroke-dasharray="' +
        (C * pay / 100).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg><div><span><b>' + pay + '%</b><span>ümumi irəliləyiş</span></span></div></div>' +
        '<div style="flex:1;min-width:0"><h2>' + (n.length ? "Davam et, yaxşı gedirsən!" : "Hazırlığa başla!") + '</h2>' +
        '<p>' + Object.keys(islenmis).length + ' / ' + ummovzu + ' mövzu üzrə test həll etmisən.</p>' +
        '<div class="k-zol"><i style="width:' + pay + '%"></i></div>' +
        '<div class="k-cip2"><div><span class="ki k4">' + IK.flame + '</span><span><b>' + gun + ' gün</b><span>ardıcıl aktivlik</span></span></div>' +
        '<div><span class="ki k1">' + IK.star + '</span><span><b>' + bal + '</b><span>toplam bal</span></span></div></div></div>' +
      '</div>' +
      '<div class="k-balans"><div><span class="kb-etiket">Mövcud balans</span><div class="kb-mebleg">' + S.qepik(S.balans()) + '</div></div>' +
        '<a class="btn sm" href="balans.html">+ Balansı artır</a></div>';

    /* son fəaliyyətlər və imtahan nəticələri */
    function setir(r, ikon, cls) {
      var f = faiz(r.dogru, r.umumi);
      return '<div><span class="ki ' + cls + '">' + ikon + '</span><span class="ks-m"><b>' + S.kacir(r.movzu || r.test_id || "Test") +
        '</b><span>' + tarix(r.tarix) + '</span></span><span class="tr-faiz ' + sinif(f) + '">' + f + '%</span></div>';
    }
    var son = n.slice(0, 5).map(function (r) { return setir(r, r.nov === "imtahan" ? IK.trophy : IK.test, r.nov === "imtahan" ? "k3" : "k1"); }).join("");
    var imt = n.filter(function (r) { return r.nov === "imtahan"; }).slice(0, 5).map(function (r) { return setir(r, IK.trophy, "k3"); }).join("");
    var iki = el("k-iki");
    if (iki) iki.innerHTML =
      '<div class="k-panel"><h3>Son fəaliyyətlər <a href="#k-teb" data-ac="transkript">Hamısı</a></h3><div class="k-son">' +
        (son || '<p class="k-bos">Hələ test həll etməmisən. <a href="testler.html">Testlərə başla</a></p>') + '</div></div>' +
      '<div class="k-panel"><h3>İmtahan nəticələri <a href="imtahan-qebul.html">İmtahanlar</a></h3><div class="k-son">' +
        (imt || '<p class="k-bos">Hələ imtahan modeli həll etməmisən. <a href="imtahan-qebul.html">İmtahan seç</a></p>') + '</div></div>';
    var hamisi = iki && iki.querySelector('[data-ac="transkript"]');
    if (hamisi) hamisi.addEventListener("click", function (e) {
      e.preventDefault(); var b = document.querySelector('.k-teb .kt-d[data-k="transkript"]'); if (b) b.click();
      var t = el("k-teb"); if (t && t.scrollIntoView) t.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    /* premium kartı */
    var pr = el("k-prem");
    if (pr) {
      var alinan = Object.keys(S.alinmis || {}).length;
      pr.innerHTML = S.acilib("paket")
        ? '<b>Tam paket aktivdir</b><p>Bütün testlər və imtahan modelləri həmişəlik açıqdır.</p>'
        : '<b>Tam paket</b><p>' + (alinan ? alinan + ' xidmət alınıb. ' : '') + 'Hamısı bir ödənişlə — 25 AZN.</p><a href="index.html#paket">Ətraflı</a>';
    }
  }

  /* ----------------------------------------------------- irəliləyiş */
  function ireliQur() {
    var n = S.neticeler || [];
    /* mövzu → ən yaxşı faiz */
    var enYaxsi = {};
    n.forEach(function (r) {
      if (!r.fenn || !r.movzu) return;
      var k = r.fenn + ":" + r.movzu, f = faiz(r.dogru, r.umumi);
      if (enYaxsi[k] === undefined || f > enYaxsi[k]) enYaxsi[k] = f;
    });

    var h = '<p class="lead" style="font-size:.95rem;margin-bottom:18px">' +
            'Hansı mövzuları işləmisən, hansılara hələ baxmamısan — fənn-fənn.</p>';

    X.fennler.forEach(function (f) {
      var islenen = f.movzular.filter(function (m) { return enYaxsi[f.id + ":" + m.id] !== undefined; });
      var orta = islenen.length
        ? Math.round(islenen.reduce(function (a, m) { return a + enYaxsi[f.id + ":" + m.id]; }, 0) / islenen.length)
        : 0;
      var pay = Math.round(islenen.length / f.movzular.length * 100);

      h += '<details class="kf">' +
        '<summary><span class="kf-ad">' + f.ad + '</span>' +
        '<span class="kf-say">' + islenen.length + " / " + f.movzular.length + ' mövzu</span>' +
        '<span class="kf-cubuq"><i style="width:' + pay + '%"></i></span>' +
        (islenen.length ? '<span class="kf-orta ' + sinif(orta) + '">' + orta + '%</span>' : '') +
        '</summary><div class="kf-list">';

      f.movzular.forEach(function (m) {
        var k = f.id + ":" + m.id;
        var ff = enYaxsi[k];
        var alinib = S.acilib(k) || f.pulsuz === m.id;
        var hal, etiket;
        if (ff !== undefined) { hal = sinif(ff); etiket = ff + "%"; }
        else if (alinib) { hal = "acik"; etiket = "açıq, işlənməyib"; }
        else { hal = "qapali"; etiket = "alınmayıb"; }
        h += '<a class="km ' + hal + '" href="' + m.ders + '">' +
             '<span class="km-ad">' + m.ad + '</span>' +
             '<span class="km-hal">' + etiket + '</span></a>';
      });
      h += '</div></details>';
    });
    el("k-ireli").innerHTML = h;
  }

  /* ----------------------------------------------------- transkript */
  function transkriptQur() {
    var n = (S.neticeler || []).slice();
    if (!n.length) {
      el("k-transkript").innerHTML =
        '<div class="notice">Hələ test həll etməmisən. ' +
        '<a href="testler.html">Testlərə başla</a> — nəticələrin burada yığılacaq.</div>';
      return;
    }
    var h = qrafik(n) +
      '<div class="tsc"><table class="tr-cedvel"><thead><tr>' +
      '<th>Tarix</th><th>Test</th><th>Növ</th><th>Nəticə</th><th>Faiz</th>' +
      '</tr></thead><tbody>';
    n.forEach(function (r) {
      var f = faiz(r.dogru, r.umumi);
      h += '<tr><td class="tr-tarix">' + tarix(r.tarix) + '</td>' +
           '<td>' + S.kacir(r.movzu || r.test_id) + '</td>' +
           '<td><span class="tr-nov">' + (r.nov || "test") + '</span></td>' +
           '<td>' + r.dogru + " / " + r.umumi +
             (r.bal !== null && r.bal !== undefined && +r.bal !== r.dogru
               ? ' <small>(bal ' + r.bal + ')</small>' : '') + '</td>' +
           '<td><span class="tr-faiz ' + sinif(f) + '">' + f + '%</span></td></tr>';
    });
    h += '</tbody></table></div>';
    el("k-transkript").innerHTML = h;
  }

  /* sadə inkişaf qrafiki — son 20 nəticə */
  function qrafik(n) {
    var son = n.slice(0, 20).reverse();
    if (son.length < 2) return "";
    var G = 100, EN = 520, bosluq = EN / (son.length - 1);
    var nq = son.map(function (r, i) {
      return [i * bosluq, G - faiz(r.dogru, r.umumi) / 100 * (G - 10) - 5];
    });
    var yol = nq.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    var daire = nq.map(function (p) {
      return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.2"/>';
    }).join("");
    var orta = Math.round(son.reduce(function (a, r) { return a + faiz(r.dogru, r.umumi); }, 0) / son.length);
    return '<div class="qrf"><div class="qrf-bas"><b>İnkişaf — son ' + son.length +
      ' test</b><span>orta ' + orta + '%</span></div>' +
      '<svg viewBox="0 -4 ' + EN + ' ' + (G + 8) + '" class="qrf-svg" preserveAspectRatio="none">' +
      '<line x1="0" y1="' + (G - 50 / 100 * (G - 10) - 5) + '" x2="' + EN + '" y2="' +
        (G - 50 / 100 * (G - 10) - 5) + '" class="qrf-50"/>' +
      '<path d="' + yol + '" class="qrf-yol"/>' + daire + '</svg>' +
      '<div class="qrf-alt"><span>əvvəl</span><span>50% xətti</span><span>son</span></div></div>';
  }

  /* ----------------------------------------------------- alışlar */
  function alislarQur() {
    var a = Object.keys(S.alinmis || {});
    if (!a.length) {
      el("k-alislar").innerHTML =
        '<div class="notice">Hələ heç nə almamısan. Aldığın mövzu və imtahan '
        + 'variantları burada görünəcək.</div>';
      return;
    }
    var ad = {};
    X.fennler.forEach(function (f) {
      f.movzular.forEach(function (m) { ad[f.id + ":" + m.id] = f.ad + " · " + m.ad; });
    });
    (X.imtahanlar || []).forEach(function (i) { ad[i.id] = i.ad; });
    ad["paket"] = "Tam paket — bütün fənlər";

    var h = '<p class="lead" style="font-size:.95rem;margin-bottom:18px">' +
            a.length + ' xidmət alınıb. Hamısı həmişəlik açıqdır.</p><div class="al-list">';
    a.sort().forEach(function (k) {
      h += '<div class="al-s"><span class="al-ad">' + S.kacir(ad[k] || k) + '</span>' +
           '<span class="al-tarix">' + tarix(S.alinmis[k]) + '</span></div>';
    });
    el("k-alislar").innerHTML = h + '</div>';
  }
})();
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", basla);
else basla();
})();
