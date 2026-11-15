/* Geri bildirim: bütün səhifələrdə kiçik düymə. Səhv, təklif və ya şikayət yazılır;
   mesaj bazadakı geri_bildirim_gonder funksiyası ilə yazılır; oxumaq yalnız sayt sahibinə açıqdır.
   Ziyarətçi heç bir ünvan və ya başqasının mesajını görmür. */
(function () {
  "use strict";
  if (window.__dtGeri) return;
  window.__dtGeri = true;

  var CFG = window.SB_CONFIG || {};
  var AKTIV = !!(CFG.url && CFG.anonKey && CFG.url.indexOf("http") === 0);
  var D = document;

  var CSS = [
    "#dt-geri-btn{position:fixed;right:16px;bottom:16px;z-index:8000;display:inline-flex;align-items:center;gap:8px;",
    "height:42px;padding:0 15px 0 12px;border-radius:999px;border:1px solid var(--line,#d6e0f0);",
    "background:var(--surface,#fff);color:var(--ink,#0f2240);font:600 .86rem/1 inherit;font-family:inherit;cursor:pointer;",
    "box-shadow:0 6px 20px rgba(16,52,110,.16);transition:transform .15s,border-color .15s,box-shadow .15s}",
    "#dt-geri-btn:hover{border-color:var(--nar,#1e62e0);transform:translateY(-1px)}",
    "#dt-geri-btn svg{width:18px;height:18px;color:var(--nar,#1e62e0);flex:none}",
    "@media (max-width:640px){#dt-geri-btn{width:42px;padding:0;justify-content:center;right:12px;bottom:12px}#dt-geri-btn span{display:none}}",
    "#dt-geri{position:fixed;inset:0;z-index:9100;display:grid;place-items:center;padding:16px;background:rgba(10,20,36,.5);",
    "-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}",
    "#dt-geri[hidden]{display:none}",
    "#dt-geri .gq{width:min(460px,100%);max-height:calc(100vh - 32px);overflow:auto;background:var(--surface,#fff);color:var(--ink,#0f2240);",
    "border:1px solid var(--line,#d6e0f0);border-radius:18px;padding:22px;box-shadow:0 24px 60px rgba(16,52,110,.3)}",
    "#dt-geri h2{font-size:1.15rem;margin:0 0 4px}",
    "#dt-geri .gal{font-size:.86rem;color:var(--muted,#5b6b86);margin:0 0 14px;line-height:1.45}",
    "#dt-geri .gnov{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}",
    "#dt-geri .gnov button{font:600 .84rem/1 inherit;font-family:inherit;padding:9px 14px;border-radius:999px;cursor:pointer;",
    "border:1px solid var(--line,#d6e0f0);background:transparent;color:inherit}",
    "#dt-geri .gnov button[aria-pressed=true]{background:var(--nar,#1e62e0);border-color:var(--nar,#1e62e0);color:#fff}",
    "#dt-geri textarea,#dt-geri input.gel{width:100%;box-sizing:border-box;font:inherit;font-size:.95rem;padding:10px 12px;",
    "border-radius:10px;border:1px solid var(--line,#d6e0f0);background:var(--paper,#fff);color:inherit}",
    "#dt-geri textarea{min-height:110px;resize:vertical;line-height:1.5}",
    "#dt-geri textarea:focus,#dt-geri input.gel:focus{outline:2px solid var(--nar,#1e62e0);outline-offset:0}",
    "#dt-geri .gsay{font-size:.76rem;color:var(--muted,#5b6b86);text-align:right;margin:3px 0 8px}",
    "#dt-geri .gyer{font-size:.78rem;color:var(--muted,#5b6b86);margin:0 0 10px;line-height:1.4;word-break:break-word}",
    "#dt-geri .gel{margin-bottom:6px}",
    "#dt-geri .gh{position:absolute;left:-9999px;opacity:0;height:0;width:0}",
    "#dt-geri .gd{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}",
    "#dt-geri .gst{min-height:1.2em;font-size:.86rem;margin-top:8px}",
    "#dt-geri .gst.x{color:#c0392b}#dt-geri .gst.ok{color:#1c8a4f;font-weight:600}",
    "@media print{#dt-geri-btn,#dt-geri{display:none!important}}"
  ].join("");

  var IK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M12 8.5v4M12 15.6v.01"/></svg>';
  var NOV = [["sehv", "Səhv"], ["teklif", "Təklif"], ["sikayet", "Şikayət"]];

  function kontekst() {
    try { return typeof window.dtGeriKontekst === "function" ? String(window.dtGeriKontekst() || "") : ""; } catch (e) { return ""; }
  }

  function qur() {
    var st = D.createElement("style"); st.textContent = CSS; D.head.appendChild(st);

    var btn = D.createElement("button");
    btn.id = "dt-geri-btn"; btn.type = "button"; btn.setAttribute("aria-label", "Geri bildirim göndər"); btn.title = "Səhv və ya təklif bildir";
    btn.innerHTML = IK + "<span>Geri bildirim</span>";
    D.body.appendChild(btn);

    var p = D.createElement("div");
    p.id = "dt-geri"; p.hidden = true;
    p.innerHTML =
      '<div class="gq" role="dialog" aria-modal="true" aria-labelledby="dt-geri-b" style="position:relative">' +
      '<h2 id="dt-geri-b">Geri bildirim</h2>' +
      '<p class="gal">Səhv, çatışmazlıq və ya təklifini yaz. Mesaj yalnız sayt sahibinə çatır.</p>' +
      '<div class="gnov" role="group" aria-label="Növ"></div>' +
      '<textarea id="dt-geri-m" maxlength="2000" placeholder="Nə baş verdi? Mümkünsə qısa və konkret yaz." aria-label="Mesaj"></textarea>' +
      '<div class="gsay"><span id="dt-geri-s">0</span> / 2000</div>' +
      '<p class="gyer" id="dt-geri-y"></p>' +
      '<input class="gel" id="dt-geri-e" type="email" maxlength="120" placeholder="E-poçt (cavab istəsən, ixtiyari)" autocomplete="email" aria-label="E-poçt (ixtiyari)">' +
      '<input class="gh" id="dt-geri-h" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="gst" id="dt-geri-t" aria-live="polite"></div>' +
      '<div class="gd"><button type="button" class="btn ghost" id="dt-geri-l">Ləğv et</button>' +
      '<button type="button" class="btn solid" id="dt-geri-g">Göndər</button></div></div>';
    D.body.appendChild(p);

    var nov = "sehv", acan = null, gonderilir = false;
    var $ = function (i) { return D.getElementById(i); };
    var novBox = p.querySelector(".gnov");
    NOV.forEach(function (n) {
      var b = D.createElement("button"); b.type = "button"; b.textContent = n[1]; b.setAttribute("data-n", n[0]);
      b.setAttribute("aria-pressed", n[0] === nov ? "true" : "false");
      b.addEventListener("click", function () {
        nov = n[0];
        novBox.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      });
      novBox.appendChild(b);
    });

    function aç() {
      acan = D.activeElement;
      $("dt-geri-m").value = ""; $("dt-geri-s").textContent = "0"; $("dt-geri-e").value = ""; $("dt-geri-h").value = "";
      var t = $("dt-geri-t"); t.textContent = ""; t.className = "gst";
      $("dt-geri-g").disabled = false; gonderilir = false;
      var k = kontekst();
      $("dt-geri-y").textContent = "Səhifə: " + (D.title || location.pathname) + (k ? " · " + k.split(":")[0] + " də əlavə olunacaq" : "");
      p.hidden = false;
      setTimeout(function () { $("dt-geri-m").focus(); }, 30);
    }
    function bagla() {
      p.hidden = true;
      if (acan && acan.focus) { try { acan.focus(); } catch (e) {} }
    }
    btn.addEventListener("click", aç);
    $("dt-geri-l").addEventListener("click", bagla);
    p.addEventListener("mousedown", function (e) { if (e.target === p) bagla(); });
    $("dt-geri-m").addEventListener("input", function () { $("dt-geri-s").textContent = this.value.length; });

    /* Testlərin klaviatura qısayolları bu pəncərədə işləməsin */
    ["keydown", "keyup", "keypress"].forEach(function (ad) {
      p.addEventListener(ad, function (e) {
        e.stopPropagation();
        if (ad === "keydown" && e.key === "Escape") bagla();
      });
    });

    function xeta(m) { var t = $("dt-geri-t"); t.textContent = m; t.className = "gst x"; }

    $("dt-geri-g").addEventListener("click", function () {
      if (gonderilir) return;
      var m = $("dt-geri-m").value.trim();
      if (m.length < 5) { xeta("Zəhmət olmasa mesajı bir az ətraflı yaz."); $("dt-geri-m").focus(); return; }
      if (!AKTIV) { xeta("Hazırda göndərmək mümkün deyil."); return; }
      gonderilir = true; $("dt-geri-g").disabled = true;
      var t = $("dt-geri-t"); t.className = "gst"; t.textContent = "Göndərilir…";
      var yuk = {
        p_nov: nov, p_mesaj: m, p_sehife: location.origin + location.pathname,
        p_bashliq: D.title || "", p_kontekst: kontekst(), p_elaqe: $("dt-geri-e").value.trim()
      };
      /* Bot tələsi: gizli sahə doldurulubsa heç nə göndərmirik */
      if ($("dt-geri-h").value) { t.className = "gst ok"; t.textContent = "Təşəkkürlər! Mesajın göndərildi."; setTimeout(bagla, 1600); return; }
      fetch(CFG.url.replace(/\/$/, "") + "/rest/v1/rpc/geri_bildirim_gonder", {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": CFG.anonKey },
        body: JSON.stringify(yuk)
      }).then(function (r) {
        return r.text().then(function (x) { return { ok: r.ok, s: r.status, x: x }; });
      }).then(function (o) {
        if (o.ok) {
          t.className = "gst ok"; t.textContent = "Təşəkkürlər! Mesajın göndərildi.";
          setTimeout(bagla, 1600);
        } else {
          gonderilir = false; $("dt-geri-g").disabled = false;
          xeta(o.x.indexOf("tez-tez") >= 0 ? "Çox tez-tez göndərdin. Bir az sonra yenidən cəhd et." :
               o.s === 400 ? "Mesaj qəbul olunmadı. Mətni yoxla." :
               "Göndərmək alınmadı. Bir az sonra yenidən cəhd et.");
        }
      }).catch(function () {
        gonderilir = false; $("dt-geri-g").disabled = false;
        xeta("Bağlantı alınmadı. İnterneti yoxlayıb yenidən cəhd et.");
      });
    });
  }

  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", qur); else qur();
})();
