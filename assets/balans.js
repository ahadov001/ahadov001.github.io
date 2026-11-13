(function () {
var basla = function () {
/* Balans artırma səhifəsi */
(function () {
  "use strict";
  var S = window.Sinaq;
  var P = window.BALANS_PAKETLERI || [];

  function el(id) { return document.getElementById(id); }

  if (!S || !S.aktiv) {
    el("b-xeber").className = "notice xeta";
    el("b-xeber").innerHTML = "<b>Hesab sistemi hələ qurulmayıb.</b> " +
      '<a href="movzular.html">Mövzu izahlarına keç</a> — onlar pulsuzdur.';
    return;
  }

  S.hazir().then(function () {
    if (!S.istifadeci) { location.href = "giris.html?qayit=balans.html"; return; }
    return S.yenile().then(qur);
  });

  function qur() {
    el("b-cari").innerHTML =
      '<span class="bc-etiket">Cari balans</span>' +
      '<span class="bc-mebleg">' + S.qepik(S.balans()) + '</span>' +
      '<a class="kecid" href="kabinet.html">Kabinetə qayıt</a>';

    /* Hansı xidmət üçün gəlib? */
    var lazim = new URLSearchParams(location.search).get("lazim");
    if (lazim) {
      S.qiymet(lazim).then(function (q) {
        if (!q) return;
        var catmir = q.qiymet - S.balans();
        el("b-xeber").className = "notice";
        el("b-xeber").innerHTML = "<b>" + S.kacir(q.ad) + "</b> — " + S.qepik(q.qiymet) +
          (catmir > 0 ? ". Çatmayan məbləğ: <b>" + S.qepik(catmir) + "</b>."
                      : ". Balansın kifayətdir — geri qayıdıb ala bilərsən.");
      });
    }

    if (!P.length) {
      el("b-paketler").innerHTML =
        '<div class="notice xeta" style="grid-column:1/-1"><b>Balans paketləri qurulmayıb.</b> ' +
        'Sayt sahibi <code>assets/balans-paketleri.js</code> faylını doldurmalıdır.</div>';
      return;
    }

    var h = "";
    P.forEach(function (p) {
      var link = p.link || "";
      var aktiv = link.indexOf("http") === 0;
      /* hesab ID-sini ödənişə əlavə edirik — balans düzgün hesaba yazılsın */
      if (aktiv) {
        var ayirici = link.indexOf("?") > -1 ? "&" : "?";
        link += ayirici + "checkout[custom][uid]=" + encodeURIComponent(S.istifadeci.id) +
                "&checkout[email]=" + encodeURIComponent(S.istifadeci.email) +
                "&checkout[billing_address][country]=AZ";
      }
      h += '<div class="bkart' + (p.secilen ? " secilen" : "") + '">' +
        (p.secilen ? '<span class="bk-nisan">ən çox seçilən</span>' : '') +
        '<span class="bk-mebleg">' + S.qepik(p.mebleg) + '</span>' +
        (p.bonus ? '<span class="bk-bonus">+' + S.qepik(p.bonus) + ' bonus</span>' : '') +
        '<span class="bk-izah">' + (p.izah || "") + '</span>' +
        (aktiv
          ? '<a class="dugme" href="' + link + '" target="_blank" rel="noopener">Ödə</a>'
          : '<span class="dugme off">Hazırlanır</span>') +
        '</div>';
    });
    el("b-paketler").innerHTML = h;
  }
})();
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", basla);
else basla();
})();
