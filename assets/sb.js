/* ═══════════════════════════════════════════════════════════════
   SINAQ — hesab, balans və irəliləyiş
   Supabase qurulmayıbsa sayt yenə işləyir: dərslər pulsuz qalır,
   testlər «qurulum tamamlanmayıb» kimi görünür.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var CFG = window.SB_CONFIG || {};
  var AKTIV = !!(CFG.url && CFG.anonKey && CFG.url.indexOf("http") === 0);

  var S = {
    aktiv: AKTIV,
    hazirmi: false,
    istifadeci: null,
    profil: null,
    alinmis: {},      // { "kimya:rabite": true }
    neticeler: [],
    _gozleyen: [],
    _sb: null
  };
  window.Sinaq = S;

  function qepik(q) { return (q / 100).toFixed(2).replace(".", ",") + " AZN"; }
  S.qepik = qepik;

  /* ---------------------------------------------------------- yüklənmə */
  function sbYukle() {
    if (!AKTIV) return Promise.resolve(null);
    return import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")
      .then(function (m) {
        S._sb = m.createClient(CFG.url, CFG.anonKey);
        return S._sb;
      })
      .catch(function (e) {
        console.error("[sinaq] Supabase yüklənmədi:", e);
        S.aktiv = false;
        return null;
      });
  }

  S.hazir = function () {
    if (S.hazirmi) return Promise.resolve(S);
    if (S._hazirP) return S._hazirP;
    S._hazirP = sbYukle().then(function (sb) {
      if (!sb) { S.hazirmi = true; return S; }
      return sb.auth.getSession().then(function (r) {
        S.istifadeci = (r.data && r.data.session && r.data.session.user) || null;
        sb.auth.onAuthStateChange(function (_e, sess) {
          S.istifadeci = (sess && sess.user) || null;
        });
        if (!S.istifadeci) { S.hazirmi = true; return S; }
        return S.yenile().then(function () { S.hazirmi = true; return S; });
      });
    });
    return S._hazirP;
  };

  /* ---------------------------------------------------------- məlumat */
  S.yenile = function () {
    if (!S._sb || !S.istifadeci) return Promise.resolve(S);
    return S._sb.rpc("kabinet").then(function (r) {
      if (r.error) { console.error("[sinaq] kabinet:", r.error.message); return S; }
      var d = r.data || {};
      S.profil = d.profil || null;
      S.neticeler = d.neticeler || [];
      S.alinmis = {};
      (d.alislar || []).forEach(function (a) { S.alinmis[a.acar] = a.tarix; });
      return S;
    });
  };

  S.balans = function () { return (S.profil && S.profil.balans) || 0; };

  /* Tam paket hər şeyi açır */
  S.acilib = function (acar) {
    return !!(S.alinmis[acar] || S.alinmis["paket"]);
  };

  /* ---------------------------------------------------------- hesab */
  S.qeydiyyat = function (email, parol, ad) {
    if (!S._sb) return Promise.reject(new Error("qurulum yoxdur"));
    return S._sb.auth.signUp({
      email: email, password: parol, options: { data: { ad: ad || "" } }
    });
  };
  S.giris = function (email, parol) {
    if (!S._sb) return Promise.reject(new Error("qurulum yoxdur"));
    return S._sb.auth.signInWithPassword({ email: email, password: parol })
      .then(function (r) {
        if (!r.error) { S.istifadeci = r.data.user; return S.yenile().then(function () { return r; }); }
        return r;
      });
  };
  S.cixis = function () {
    if (!S._sb) return Promise.resolve();
    return S._sb.auth.signOut().then(function () {
      S.istifadeci = null; S.profil = null; S.alinmis = {}; S.neticeler = [];
    });
  };
  S.parolBerpa = function (email) {
    if (!S._sb) return Promise.reject(new Error("qurulum yoxdur"));
    return S._sb.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname.replace(/[^\/]*$/, "giris.html")
    });
  };

  /* ---------------------------------------------------------- alış */
  S.al = function (acar) {
    if (!S._sb) return Promise.resolve({ ok: false, sebeb: "qurulum_yoxdur" });
    if (!S.istifadeci) return Promise.resolve({ ok: false, sebeb: "giris_yoxdur" });
    return S._sb.rpc("xidmet_al", { p_acar: acar }).then(function (r) {
      if (r.error) return { ok: false, sebeb: "xeta", mesaj: r.error.message };
      var d = r.data || {};
      if (d.ok) {
        S.alinmis[acar] = new Date().toISOString();
        if (S.profil && typeof d.balans === "number") S.profil.balans = d.balans;
      } else if (typeof d.balans === "number" && S.profil) {
        S.profil.balans = d.balans;
      }
      return d;
    });
  };

  S.qiymet = function (acar) {
    if (!S._sb) return Promise.resolve(null);
    return S._sb.from("qiymetler").select("ad,qiymet").eq("acar", acar).maybeSingle()
      .then(function (r) { return r.data || null; });
  };

  /* ---------------------------------------------------------- nəticə */
  S.neticeYaz = function (n) {
    if (!S._sb || !S.istifadeci) return Promise.resolve(false);
    return S._sb.from("neticeler").insert({
      istifadeci: S.istifadeci.id,
      test_id: n.test_id, fenn: n.fenn || null, movzu: n.movzu || null,
      nov: n.nov || "test", dogru: n.dogru, umumi: n.umumi,
      bal: (typeof n.bal === "number" ? n.bal : null),
      saniye: n.saniye || null
    }).then(function (r) {
      if (r.error) { console.warn("[sinaq] nəticə yazılmadı:", r.error.message); return false; }
      S.neticeler.unshift({
        test_id: n.test_id, fenn: n.fenn, movzu: n.movzu, nov: n.nov,
        dogru: n.dogru, umumi: n.umumi, bal: n.bal, saniye: n.saniye,
        tarix: new Date().toISOString()
      });
      return true;
    });
  };

  /* ---------------------------------------------------------- naviqasiya */
  function naviqasiyaQur() {
    var yer = document.getElementById("hesab-nav");
    if (!yer) return;
    if (!S.aktiv) { yer.innerHTML = ""; return; }
    if (S.istifadeci) {
      yer.innerHTML =
        '<a class="nav-bal" href="kabinet.html" title="Şəxsi kabinet">' +
        '<span class="nb-ad">' + (S.profil && S.profil.ad ? kacir(S.profil.ad) : "Kabinet") + '</span>' +
        '<span class="nb-bal">' + qepik(S.balans()) + '</span></a>';
    } else {
      yer.innerHTML = '<a class="nav-giris" href="giris.html">Giriş / Qeydiyyat</a>';
    }
  }
  function kacir(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  S.kacir = kacir;
  S.naviqasiyaQur = naviqasiyaQur;

  /* ---------------------------------------------------------- kilid pəncərəsi */
  /* Testin başında: alınmayıbsa üzərinə pəncərə açılır. */
  S.kilidYoxla = function (acar, baslik) {
    return S.hazir().then(function () {
      naviqasiyaQur();
      if (!S.aktiv) { kilidGoster(acar, baslik, "qurulum"); return false; }
      if (!S.istifadeci) { kilidGoster(acar, baslik, "giris"); return false; }
      if (S.acilib(acar)) return true;
      kilidGoster(acar, baslik, "al");
      return false;
    });
  };

  function kilidGoster(acar, baslik, hal) {
    var q = document.getElementById("quiz");
    if (q) q.innerHTML = "";
    var qab = document.createElement("div");
    qab.className = "kilidqutu";

    if (hal === "qurulum") {
      qab.innerHTML = '<h3>Testlər hazırlanır</h3><p class="lead">Bu bölmə tezliklə açılacaq. ' +
        'Mövzu izahları isə indi tamamilə pulsuzdur.</p>' +
        '<a class="dugme" href="movzular.html">Mövzu izahlarına keç</a>';
    } else if (hal === "giris") {
      qab.innerHTML = '<h3>' + kacir(baslik || "Bu test") + '</h3>' +
        '<p class="lead">Testi açmaq üçün hesabınıza daxil olun. Qeydiyyat 20 saniyə çəkir ' +
        'və irəliləyişiniz yadda saxlanılır.</p>' +
        '<a class="dugme" href="giris.html?qayit=' + encodeURIComponent(location.pathname.split("/").pop()) +
        '">Giriş / Qeydiyyat</a>' +
        '<p class="xirda">Mövzu izahları hesab olmadan da pulsuzdur.</p>';
    } else {
      qab.innerHTML = '<h3>' + kacir(baslik || "Bu test") + '</h3>' +
        '<p class="lead kq-qiymet">Qiymət yüklənir…</p>' +
        '<div class="kq-dugmeler"></div>' +
        '<p class="xirda">Bir dəfə alınan mövzu həmişəlik açıq qalır — 3 toplunun hamısı.</p>';
      S.qiymet(acar).then(function (q) {
        var bal = S.balans();
        var p = qab.querySelector(".kq-qiymet");
        var d = qab.querySelector(".kq-dugmeler");
        if (!q) {
          p.textContent = "Bu xidmət hələ qurulmayıb.";
          return;
        }
        p.innerHTML = "Qiymət: <b>" + qepik(q.qiymet) + "</b> · Balansınız: <b>" +
                      qepik(bal) + "</b>";
        if (bal >= q.qiymet) {
          d.innerHTML = '<button class="dugme" id="kq-al">Balansdan al — ' + qepik(q.qiymet) + '</button>';
          d.querySelector("#kq-al").addEventListener("click", function () {
            var b = this; b.disabled = true; b.textContent = "Alınır…";
            S.al(acar).then(function (r) {
              if (r.ok) { location.reload(); }
              else if (r.sebeb === "balans_catmir") { location.href = "balans.html?lazim=" + acar; }
              else { b.disabled = false; b.textContent = "Yenidən yoxla";
                     p.innerHTML += '<br><span class="xeta">Alınmadı: ' + kacir(r.sebeb || "") + '</span>'; }
            });
          });
        } else {
          d.innerHTML = '<a class="dugme" href="balans.html?lazim=' + encodeURIComponent(acar) +
            '">Balansı artır</a>' +
            '<p class="xirda">Çatmayan məbləğ: <b>' + qepik(q.qiymet - bal) + '</b></p>';
        }
      });
    }
    var ana = document.querySelector("main .wrap") || document.body;
    ana.appendChild(qab);
  }

  /* Hər səhifədə naviqasiyanı qur */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { S.hazir().then(naviqasiyaQur); });
  } else {
    S.hazir().then(naviqasiyaQur);
  }
})();
