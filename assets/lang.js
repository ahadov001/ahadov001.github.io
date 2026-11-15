/* Dərs Toplusu — dil seçimi (AZ əsas, RU əlavə).
   Qayda: seçim yoxdursa həmişə Azərbaycan dili açılır. Rus dili yalnız istifadəçi özü
   seçibsə (və ya linkdə ?lang=ru varsa) yadda saxlanır və növbəti girişdə də qalır.
   Rus rejimində mətnlər assets/ru.js lüğəti ilə (dəqiq uyğunluq, rəqəmlər § ilə) tərcümə olunur;
   mövzu və test mətnləri üçün səhifə lüğəti assets/ru/<səhifə>.js yüklənir (varsa). */
(function () {
  var KEY = "dt_lang", L = "az", m = /[?&]lang=(az|ru)(?:&|#|$)/.exec(location.search);
  try {
    if (m) { L = m[1]; localStorage.setItem(KEY, L); }
    else if (localStorage.getItem(KEY) === "ru") L = "ru";
  } catch (e) { if (m) L = m[1]; }
  window.DT_LANG = L;
  var de = document.documentElement;
  de.lang = L === "ru" ? "ru" : "az";
  if (L === "ru") de.className += " lang-ru ru-yukle";

  window.dtSetLang = function (l) {
    if (l === L) return;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    var u = new URL(location.href);
    u.searchParams.delete("lang");
    location.replace(u.pathname + u.search + u.hash);
    if (u.href === location.href) location.reload();
  };

  /* ---------- dil düyməsi ---------- */
  function sw(cls) {
    var d = document.createElement("div");
    d.className = "lang-sw " + cls; d.setAttribute("role", "group"); d.setAttribute("aria-label", "Dil / Язык");
    d.innerHTML = '<button type="button" data-l="az" aria-pressed="' + (L === "az") + '" lang="az">AZ</button>' +
                  '<button type="button" data-l="ru" aria-pressed="' + (L === "ru") + '" lang="ru">RU</button>';
    return d;
  }
  function duymeQur() {
    if (document.querySelector(".lang-sw")) return;
    var h = document.getElementById("hesab-nav");
    if (h && h.parentNode) h.parentNode.insertBefore(sw("lang-hd"), h.nextSibling);
    var m = document.getElementById("esas-menyu");
    if (m) m.appendChild(sw("lang-mob"));
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest(".lang-sw button");
    if (b) window.dtSetLang(b.getAttribute("data-l"));
  });

  if (L !== "ru") {
    document.addEventListener("DOMContentLoaded", duymeQur);
    window.T = function (s) { return s; };
    return;
  }

  /* ---------- rus rejimi: lüğət ---------- */
  document.write('<script src="assets/ru.js?v=' + Math.floor(Date.now() / 600000) + '"><\/script>');
  var page = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") || "index";
  window.__ruPage = page;
  var PDC = null;
  function loadPD() {
    if (PDC) return PDC;
    PDC = {};
    var pages = window.RU_PAGES || {};
    if (pages[page]) {
      var x = new XMLHttpRequest();
      try { x.open("GET", "assets/ru/" + page + ".json?v=" + pages[page], false); x.send(); if (x.status === 200) PDC = JSON.parse(x.responseText); } catch (e) {}
    }
    return PDC;
  }
  /* quiz.js çağırır: sual konfiqurasiyasını (başlıq, sual, variant, izah) rusca ilə əvəz edir */
  window.ruCfg = function (cfg) {
    var q = loadPD().__q;
    if (!q || !cfg || !cfg.questions) return cfg;
    if (q.t) cfg.title = q.t;
    cfg.questions.forEach(function (it, i) {
      var r = q.q && q.q[i]; if (!r) return;
      if (r.s) it.s = r.s;
      if (r.o && r.o.length === (it.o || []).length) it.o = r.o;
      if (r.e) it.e = r.e;
    });
    return cfg;
  };

  function ruQur() {
    var D = window.RU_DICT || {}, RX = window.RU_RX || [], PD = loadPD();
    var hasPage = Object.keys(PD).length > 0;

    function norm(t) {
      var n = [];
      return [t.replace(/\d+(?:[.,]\d+)?/g, function (g) { n.push(g); return "§"; }), n];
    }
    function fill(v, n) {
      var i = 0;
      return v.replace(/§(\d?)/g, function (_, k) { return n[k ? k - 1 : i++] || ""; });
    }
    function tr(t) {
      t = t.replace(/\s+/g, " ");
      if (PD[t] !== undefined) return PD[t];
      if (D[t] !== undefined) return D[t];
      var n = norm(t), v = D[n[0]];
      if (v !== undefined) return fill(v, n[1]);
      for (var i = 0; i < RX.length; i++) {
        var r = RX[i][0].exec(t);
        if (r) return RX[i][1].replace(/\$(\d)/g, function (_, k) { return r[k] === undefined ? "" : (tr(r[k]) || r[k]); });
      }
      return null;
    }
    /* HTML parçaları üçün (T köməkçisi): teqlər arasındakı mətnlər ayrıca tərcümə olunur */
    window.T = function (s) {
      if (typeof s !== "string" || !s) return s;
      if (s.indexOf("<") < 0) {
        var l = s.match(/^\s*/)[0], r = s.match(/\s*$/)[0], c = s.trim();
        if (!c) return s;
        var v = tr(c); return v === null ? s : l + v + r;
      }
      return s.replace(/(^|>)([^<>]+)(?=<|$)/g, function (_, a, t) {
        var l = t.match(/^\s*/)[0], r = t.match(/\s*$/)[0], c = t.trim();
        if (!c) return _;
        var v = tr(c); return a + (v === null ? t : l + v + r);
      });
    };

    /* mövzu mətnləri: yarpaq blokların innerHTML-i səhifə lüğətində dəqiq uyğunlaşdırılır */
    function blokGez(root) {
      var els = (root.nodeType === 1 ? [root] : []).concat([].slice.call(root.querySelectorAll("*")));
      for (var i = 0; i < els.length; i++) {
        var e = els[i];
        if (!e.firstChild || SKIP.test(e.tagName.toUpperCase()) || e.hasAttribute("data-ru")) continue;
        if (e.children.length === 0 && e.childNodes.length === 1) continue;
        var h = e.innerHTML.replace(/\s+/g, " ").trim(), v = PD[h];
        if (v !== undefined) { e.innerHTML = v; e.setAttribute("data-ru", "1"); }
      }
    }
    var ATTR = ["placeholder", "title", "aria-label", "alt", "content", "value"];
    var SKIP = /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE|NOSCRIPT|SVG)$/;
    function sat(el) {
      if (el.nodeType !== 1 || SKIP.test(el.tagName.toUpperCase())) return;
      for (var i = 0; i < ATTR.length; i++) {
        var a = ATTR[i];
        if (!el.hasAttribute(a)) continue;
        if (a === "content" && el.tagName !== "META") continue;
        if (a === "value" && !(el.tagName === "INPUT" && /^(button|submit)$/.test(el.type))) continue;
        var v = el.getAttribute(a), t = v && v.trim();
        if (!t) continue;
        var r = tr(t);
        if (r !== null && r !== v) el.setAttribute(a, r);
      }
    }
    var FR = null, dyn = false;
    var AY = {yan:"янв",fev:"фев",mar:"мар",apr:"апр",may:"мая",iyn:"июн",iyl:"июл",avq:"авг",sen:"сен",okt:"окт",noy:"ноя",dek:"дек"};
    function frag(v) {
      if (!FR) {
        var ks = Object.keys(D).filter(function (k) { return k.length >= 4 && /[A-Za-zƏəİıÖöÜüĞğŞşÇç]/.test(k); }).sort(function (a, b) { return b.length - a.length; });
        FR = ks.map(function (k) {
          if (k.indexOf("§") < 0) return [k, null, D[k]];
          var re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/§/g, "(\\d+(?:[.,]\\d+)?)"), "g");
          return [k, re, D[k]];
        });
      }
      var o = v;
      for (var i = 0; i < FR.length; i++) {
        var f = FR[i];
        if (f[1]) { f[1].lastIndex = 0; o = o.replace(f[1], function () { var a = arguments, j = 1, ru = f[2]; return ru.replace(/§(\d?)/g, function (_, d) { return a[d ? +d : j++] || ""; }); }); }
        else if (o.indexOf(f[0]) >= 0) {
          if (!f[3]) f[3] = new RegExp("(^|[^A-Za-zƏəİıÖöÜüĞğŞşÇç])" + f[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![A-Za-zƏəİıÖöÜüĞğŞşÇç])", "g");
          o = o.replace(f[3], function (_, p) { return p + f[2]; });
        }
      }
      o = o.replace(/\b(\d{1,2}) (yan|fev|mar|apr|may|iyn|iyl|avq|sen|okt|noy|dek) (\d{4})/g, function (_, d, m, y) { return d + " " + AY[m] + " " + y; });
      o = o.replace(/\bgün\b/g, "дн.");
      return o;
    }
    function snode(n) {
      var p = n.parentNode;
      if (!p || SKIP.test(p.nodeName.toUpperCase()) || (p.closest && p.closest("[data-no-i18n]"))) return;
      var v = n.nodeValue, t = v.trim();
      if (!t || !/[A-Za-zƏəİıÖöÜüĞğŞşÇç]/.test(t)) return;
      var r = tr(t);
      if (r === null && dyn && t.length < 260 && !(p.closest && p.closest(".q-sual,.opts,.expl,.rev-sual,.rev-izah,.rev-cvb,.rev-alt,.dlg-q,.review"))) { var f = frag(t); if (f !== t) r = f; }
      if (r !== null) {
        var l = v.match(/^\s*/)[0], rr = v.match(/\s*$/)[0], out = l + r + rr;
        if (out !== v) n.nodeValue = out;
      }
    }
    function walk(root) {
      if (!root) return;
      if (root.nodeType === 3) { snode(root); return; }
      if (root.nodeType !== 1 && root.nodeType !== 9) return;
      if (root.nodeType === 1) { if (root.closest && root.closest("[data-no-i18n]")) return; sat(root); }
      if (hasPage && root.nodeType !== 3) blokGez(root);
      var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null, false), n;
      while ((n = tw.nextNode())) {
        if (n.nodeType === 3) snode(n);
        else if (SKIP.test(n.tagName.toUpperCase())) { /* teq özü atlanır */ }
        else sat(n);
      }
    }
    function bas() {
      var ti = document.title, t = tr(ti.trim()); if (t) document.title = t;
      var ms = document.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]');
      for (var i = 0; i < ms.length; i++) sat(ms[i]);
    }

    var busy = false, q = [];
    function isle() {
      busy = false;
      var a = q; q = [];
      dyn = true;
      for (var i = 0; i < a.length; i++) {
        var r = a[i];
        if (r.type === "childList") { for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]); }
        else if (r.type === "characterData") snode(r.target);
        else if (r.type === "attributes") sat(r.target);
      }
      dyn = false;
    }
    var mo = new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) q.push(list[i]);
      if (!busy) { busy = true; (window.requestAnimationFrame || setTimeout)(isle); }
    });

    function xeberdarliq() {
      if (hasPage || document.getElementById("ru-qeyd")) return;
      var kontent = document.querySelector("article.lesson, #quiz, .imt-wrap");
      if (!kontent) return;
      var d = document.createElement("div");
      d.id = "ru-qeyd"; d.className = "ru-qeyd"; d.setAttribute("data-no-i18n", "");
      d.innerHTML = '<span>Интерфейс страницы переведён на русский. <b>Учебные материалы и тестовые вопросы пока доступны на азербайджанском языке</b> — перевод готовится.</span>' +
        '<button type="button" aria-label="Закрыть">×</button>';
      d.querySelector("button").onclick = function () { d.remove(); };
      var host = document.querySelector("main");
      if (host && host.parentNode) host.parentNode.insertBefore(d, host);
    }

    function basla() {
      duymeQur();
      bas();
      walk(document.body);
      xeberdarliq();
      mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
      de.className = de.className.replace(/\bru-yukle\b/, "").trim();
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", basla); else basla();
    setTimeout(function () { de.className = de.className.replace(/\bru-yukle\b/, "").trim(); }, 2500);
  }
  /* ru.js document.write ilə növbədə olduğundan, DOM qurulandan sonra işə salırıq */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ruQur); else ruQur();
})();
