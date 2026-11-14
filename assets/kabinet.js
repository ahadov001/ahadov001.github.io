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
        document.querySelectorAll(".kt-d").forEach(function (x) { x.classList.remove("aktiv"); });
        d.classList.add("aktiv");
        var k = d.getAttribute("data-k");
        ["ireli", "transkript", "alislar"].forEach(function (n) {
          el("k-" + n).classList.toggle("gizli", n !== k);
        });
      });
    });

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
    el("k-ad").textContent = p.ad || "Kabinet";
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
      kart(Object.keys(islenmis).length + "<small>/" + ummovzu + "</small>", "işlənmiş mövzu") +
      kart(n.length, "həll edilmiş test") +
      kart(ortaF + "%", "orta nəticə") +
      kart(sonYeddi, "son 7 gündə");
  }
  function kart(b, a) {
    return '<div class="ks"><b>' + b + '</b><span>' + a + '</span></div>';
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

      h += '<details class="kf"' + (islenen.length ? " open" : "") + '>' +
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
