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
      return S._sb.from("profiller").select("*").eq("id", S.istifadeci.id).maybeSingle()
        .then(function (q) {
          if (!S.profil) S.profil = {};
          var sira = q && q.data;
          if (sira) PROFIL_SAHELER.forEach(function (k) { if (k in sira) S.profil[k] = sira[k]; });
          /* SQL 03 hələ işə salınmayıbsa — sahələr bu cihazdakı ehtiyatdan oxunur */
          if (!(sira && "avatar" in sira)) {
            var y = yerelOxu();
            PROFIL_SAHELER.forEach(function (k) { if (y[k] !== undefined) S.profil[k] = y[k]; });
          }
          return S;
        }, function () { return S; });
    });
  };

  /* ---------------------------------------------------------- profil fərdiləşdirmə */
  var PROFIL_SAHELER = ["ad", "avatar", "reng", "bio", "hedef"];
  function yerelAcar() { return "dt:profil:" + (S.istifadeci ? S.istifadeci.id : "-"); }
  function yerelOxu() {
    try { return JSON.parse(localStorage.getItem(yerelAcar()) || "{}") || {}; } catch (e) { return {}; }
  }
  function yerelYaz(patch) {
    try {
      var y = yerelOxu();
      Object.keys(patch).forEach(function (k) { y[k] = patch[k]; });
      localStorage.setItem(yerelAcar(), JSON.stringify(y));
      return true;
    } catch (e) { return false; }
  }

  /* patch: {ad, avatar, reng, bio, hedef} — nəticə: {ok, yerel?, mesaj?} */
  S.profilYaz = function (patch) {
    if (!S._sb || !S.istifadeci) return Promise.resolve({ ok: false, mesaj: "Giriş lazımdır" });
    var tem = {};
    PROFIL_SAHELER.forEach(function (k) { if (k in patch) tem[k] = patch[k]; });
    function berkit(yerel) {
      if (!S.profil) S.profil = {};
      Object.keys(tem).forEach(function (k) { S.profil[k] = tem[k]; });
      naviqasiyaQur();
      return { ok: true, yerel: !!yerel };
    }
    return S._sb.from("profiller").update(tem).eq("id", S.istifadeci.id).select("id")
      .then(function (r) {
        if (!r.error) {
          if (r.data && r.data.length) {
            try { localStorage.removeItem(yerelAcar()); } catch (e) {}
            return berkit(false);
          }
          return { ok: false, mesaj: "Profil sətri tapılmadı" };
        }
        var m = String(r.error.message || "") + " " + String(r.error.code || "");
        if (/column|42703|PGRST204|schema cache/i.test(m)) {
          yerelYaz(tem);                       /* SQL 03 hələ işə salınmayıb */
          return berkit(true);
        }
        return { ok: false, mesaj: r.error.message };
      });
  };

  S.parolDeyis = function (yeni) {
    if (!S._sb || !S.istifadeci) return Promise.resolve({ ok: false, mesaj: "Giriş lazımdır" });
    return S._sb.auth.updateUser({ password: yeni }).then(function (r) {
      return r.error ? { ok: false, mesaj: r.error.message } : { ok: true };
    });
  };

  S.RENGLER = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"];
  S.EMOJILER = ["🦊", "🐼", "🦉", "🐯", "🚀", "🎯", "📚", "⚡", "🌟", "🎓", "🦁", "🐬"];

  /* Avatar: foto (data:), emoji ("e:🦊") və ya baş hərf */
  S.avatar = function (p, ad) {
    p = p || {};
    var rn = (S.RENGLER.indexOf(p.reng) > -1) ? p.reng : "a1";
    var av = p.avatar || "", ic;
    if (av.indexOf("data:image/") === 0) {
      ic = '<img src="' + kacir(av) + '" alt="" draggable="false">';
    } else if (av.indexOf("e:") === 0) {
      ic = '<span class="av-e">' + kacir(av.slice(2)) + '</span>';
    } else {
      var n = String(p.ad || ad || "").trim();
      ic = n ? '<span class="av-h">' + kacir(n.charAt(0).toUpperCase()) + '</span>' : IK_PROFIL;
    }
    return '<span class="av av-' + rn + '">' + ic + '</span>';
  };

  /* Görünüş: sistem / açıq / tünd — yalnız bu brauzerdə yadda qalır */
  S.tema = function (t) {
    try {
      if (t === undefined) return localStorage.getItem("dt:tema") || "sistem";
      if (t === "sistem") localStorage.removeItem("dt:tema"); else localStorage.setItem("dt:tema", t);
    } catch (e) {}
    var r = document.documentElement;
    var cari = S.tema();
    if (cari === "aciq") r.setAttribute("data-theme", "light");
    else if (cari === "tund") r.setAttribute("data-theme", "dark");
    else r.removeAttribute("data-theme");
  };
  S.tema();

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
  /* Sağ yuxarı küncdə üç komponent: balans · dəstək · profil */

  var IK_DESTEK =
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="9"/>' +
    '<path d="M9.7 9.4a2.4 2.4 0 1 1 3.4 2.2c-.7.45-1.1 1-1.1 1.8v.25"/>' +
    '<path d="M12 17.1h.01"/></svg>';

  var IK_PROFIL =
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="8.6" r="3.6"/>' +
    '<path d="M5.2 19.8c0-3.5 3-5.4 6.8-5.4s6.8 1.9 6.8 5.4"/></svg>';

  function destekDugmesi() {
    return '<a class="nav-ik nav-destek" href="#destek" title="Dəstək və əlaqə" ' +
           'aria-label="Dəstək və əlaqə">' + IK_DESTEK + '</a>';
  }

  function naviqasiyaQur() {
    var yer = document.getElementById("hesab-nav");
    if (!yer) return;

    var h = "";

    if (S.aktiv && S.istifadeci) {
      var ad = (S.profil && S.profil.ad) ? String(S.profil.ad).trim() : "";

      h += '<a class="nav-bal" href="balans.html" title="Balansı artır">' +
           '<span class="nb-ad">Balans</span>' +
           '<span class="nb-bal">' + qepik(S.balans()) + '</span></a>';

      h += destekDugmesi();

      h += '<div class="nav-menyu">' +
           '<button type="button" class="nav-ik nav-profil" id="nav-profil-d" ' +
           'aria-haspopup="true" aria-expanded="false" aria-controls="nav-acilan" ' +
           'aria-label="Profil menyusu" title="Profil">' +
           S.avatar(S.profil, ad) +
           '</button>' +
           '<div class="nav-acilan" id="nav-acilan" role="menu" hidden>' +
             '<div class="na-bas">' + S.avatar(S.profil, ad) +
               '<span class="na-mtn"><b>' + kacir(ad || "Hesabım") + '</b>' +
               '<span>' + kacir(S.istifadeci.email || "") + '</span></span>' +
             '</div>' +
             '<a role="menuitem" href="kabinet.html">Şəxsi kabinet</a>' +
             '<a role="menuitem" href="kabinet.html#ireli">İrəliləyiş</a>' +
             '<a role="menuitem" href="kabinet.html#transkript">Transkript</a>' +
             '<a role="menuitem" href="kabinet.html#alislar">Alışlar</a>' +
             '<button role="menuitem" type="button" class="na-cixis" id="nav-cixis">Çıxış</button>' +
           '</div></div>';
    } else if (S.aktiv) {
      h += destekDugmesi();
      h += '<a class="nav-giris" href="giris.html">Giriş / Qeydiyyat</a>';
    } else {
      /* Hesab sistemi qurulmasa da dəstək keçidi qalır */
      h += destekDugmesi();
    }

    yer.innerHTML = h;

    /* Hamburger menyunun altı: profil + çıxış (və ya giriş) */
    var alt = document.getElementById("nm-alt");
    if (alt) {
      if (S.aktiv && S.istifadeci) {
        alt.innerHTML =
          '<a href="kabinet.html" class="nm-profil">' + S.avatar(S.profil, ad0()) +
          '<span>Profil</span></a>' +
          '<button type="button" class="nm-cixis" id="nm-cixis">Çıxış</button>';
      } else if (S.aktiv) {
        alt.innerHTML = '<a href="giris.html" class="nm-giris">Giriş / Qeydiyyat</a>';
      } else {
        alt.innerHTML = "";
      }
    }
  }
  function ad0() { return (S.profil && S.profil.ad) ? String(S.profil.ad).trim() : ""; }

  /* Profil menyusu: aç/bağla, kənara basanda və Esc ilə bağlanır */
  function menyuBagla() {
    var m = document.getElementById("nav-acilan");
    var d = document.getElementById("nav-profil-d");
    if (m) m.hidden = true;
    if (d) d.setAttribute("aria-expanded", "false");
  }
  document.addEventListener("click", function (e) {
    var t = e.target;
    var dugme = t && t.closest ? t.closest("#nav-profil-d") : null;
    if (dugme) {
      var m = document.getElementById("nav-acilan");
      if (!m) return;
      var ac = m.hidden;
      hambBagla();
      m.hidden = !ac;
      dugme.setAttribute("aria-expanded", ac ? "true" : "false");
      return;
    }
    if (t && t.closest && t.closest("#nav-cixis, #nm-cixis")) {
      S.cixis().then(function () { location.href = "index.html"; });
      return;
    }
    if (!(t && t.closest && t.closest("#nav-acilan"))) menyuBagla();
    else if (t.closest("a")) menyuBagla();
  });
  function hambBagla() {
    var h = document.getElementById("nav-hamb");
    if (h && h.open) h.open = false;
  }
  document.addEventListener("click", function (e) {
    var h = document.getElementById("nav-hamb");
    if (!h || !h.open) return;
    var t = e.target;
    if (t && t.closest && (!t.closest("#nav-hamb") || t.closest("#esas-menyu a"))) hambBagla();
  });
  document.addEventListener("toggle", function (e) {
    if (e.target && e.target.id === "nav-hamb" && e.target.open) menyuBagla();
  }, true);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { menyuBagla(); hambBagla(); }
  });

  /* Dəstək ikonu — səhifənin altındaki dəstək bölməsinə yumşaq sürüşmə */
  document.addEventListener("click", function (e) {
    var t = e.target, a = null;
    try { a = t && t.closest ? t.closest('a[href="#destek"]') : null; } catch (_) { a = null; }
    if (!a) return;
    var hedef = document.getElementById("destek");
    if (!hedef) return;              // bölmə yoxdursa adi keçid işləsin
    e.preventDefault();
    if (hedef.scrollIntoView) hedef.scrollIntoView({ behavior: "smooth", block: "start" });
    else location.hash = "destek";
    if (history.replaceState) history.replaceState(null, "", "#destek");
  });

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
