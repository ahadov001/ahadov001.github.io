/* Alış düymələri — balansdan ödəmə. */
(function () {
  function hazir(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }
  hazir(function () {
    var dugmeler = [].slice.call(document.querySelectorAll("[data-al]"));
    if (!dugmeler.length) return;
    var S = window.Sinaq;

    if (!S || !S.aktiv) {
      dugmeler.forEach(function (a) {
        a.classList.add("off");
        a.setAttribute("aria-disabled", "true");
        a.removeAttribute("href");
        a.textContent = "Hazırlanır";
      });
      if (location.search.indexOf("admin=1") > -1) {
        var b = document.getElementById("xeberdarliq");
        if (b) {
          b.className = "notice"; b.style.marginTop = "18px";
          b.innerHTML = "<b>Quraşdırma qeydi (yalnız sizə görünür).</b> " +
            "Supabase qurulmayıb — <code>assets/config.js</code> faylını doldurun.";
        }
      }
      return;
    }

    S.hazir().then(function () {
      dugmeler.forEach(function (a) {
        var acar = a.getAttribute("data-al");
        a.removeAttribute("href");

        if (S.acilib(acar)) { acildi(a, acar); return; }
        if (!S.istifadeci) {
          a.textContent = "Giriş et və al";
          a.setAttribute("href", "giris.html?qayit=" + encodeURIComponent(location.pathname.split("/").pop()));
          return;
        }

        S.qiymet(acar).then(function (q) {
          if (!q) { a.classList.add("off"); a.textContent = "Hazırlanır"; return; }
          a.setAttribute("data-qiymet", q.qiymet);
          yenile(a, acar, q);
        });
      });
    });

    function yenile(a, acar, q) {
      if (S.balans() >= q.qiymet) {
        a.textContent = "Balansdan al — " + S.qepik(q.qiymet);
        a.onclick = function (e) {
          e.preventDefault();
          if (a.dataset.gedir) return;
          a.dataset.gedir = "1";
          var kohne = a.textContent;
          a.textContent = "Alınır…";
          S.al(acar).then(function (r) {
            delete a.dataset.gedir;
            if (r.ok) { acildi(a, acar); mesaj(a, "Alındı. Balans: " + S.qepik(S.balans()), "ok"); }
            else if (r.sebeb === "balans_catmir") { location.href = "balans.html?lazim=" + encodeURIComponent(acar); }
            else { a.textContent = kohne; mesaj(a, "Alınmadı: " + (r.sebeb || "xəta"), "xeta"); }
          });
        };
      } else {
        a.textContent = "Balansı artır";
        a.setAttribute("href", "balans.html?lazim=" + encodeURIComponent(acar));
      }
    }

    function acildi(a, acar) {
      a.textContent = "Açıqdır — keç";
      a.onclick = null;
      a.classList.remove("off");
      var hedef = a.getAttribute("data-acilan");
      if (hedef) a.setAttribute("href", hedef);
    }

    function mesaj(a, m, nov) {
      var q = a.parentNode.querySelector(".al-mesaj");
      if (!q) {
        q = document.createElement("p");
        q.className = "al-mesaj xirda";
        a.parentNode.appendChild(q);
      }
      q.className = "al-mesaj xirda " + (nov || "");
      q.textContent = m;
    }
  });
})();
