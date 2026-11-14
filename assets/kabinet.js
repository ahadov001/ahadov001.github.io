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

    var p = S.profil || {};
    el("k-ad").textContent = p.ad || "Kabinet";
    el("k-alt").textContent = S.istifadeci.email +
      (p.yaradildi ? " · " + tarix(p.yaradildi) + " tarixindən" : "");

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
