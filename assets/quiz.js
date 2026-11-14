/* ===================================================================
   AzQuiz — test və imtahan mühərriki
   Rejimlər:  learn  — cavab seçilən kimi izah açılır
              exam   — qaydalar ekranı, taymer, cavablar sonda
   =================================================================== */
(function (W, D) {
  "use strict";

  /* ---------- köməkçilər ---------- */
  function el(tag, cls, html) {
    var n = D.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function vaxtYaz(san) {
    var s = Math.max(0, san), h = Math.floor(s / 3600), d = Math.floor((s % 3600) / 60), q = s % 60;
    return (h > 0 ? h + ":" + pad(d) : d) + ":" + pad(q);
  }
  function yaz(ad, dəyər) {
    try { localStorage.setItem(ad, JSON.stringify(dəyər)); } catch (e) {}
  }
  function oxu(ad) {
    try { var v = localStorage.getItem(ad); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function qarisdir(a) {
    var i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  /* Variantları qarışdırır və düzgün cavabın indeksini yeniləyir.
     "hamısı / heç biri" tipli variantlar sonda saxlanılır. */
  var SON_QALAN = /(ham[ıi]s[ıi]|he[çc] bir|b[üu]t[üu]n|fərq yox|variant yoxdur)/i;
  function variantQaris(s) {
    var o = s.o || [], n = o.length, i;
    var sabit = [], gezen = [];
    for (i = 0; i < n; i++) {
      if (SON_QALAN.test(o[i])) sabit.push(i); else gezen.push(i);
    }
    qarisdir(gezen);
    var sira = gezen.concat(sabit);
    var yeniO = [], yeniA = s.a;
    for (i = 0; i < sira.length; i++) {
      yeniO.push(o[sira[i]]);
      if (sira[i] === s.a) yeniA = i;
    }
    return { s: s.s, o: yeniO, a: yeniA, e: s.e };
  }

  /* ---------- məzmun qoruması ---------- */
  var qorumaQurulub = false;
  var ortuSus = 0;                       /* bu vaxta qədər örtük açılmır (təsdiq pəncərəsi və s.) */
  function ortuSusdur(ms) { ortuSus = Date.now() + ms; }
  function qorumaQur(kök) {
    kök.classList.add("qoruma");
    if (qorumaQurulub) return;
    qorumaQurulub = true;

    D.addEventListener("contextmenu", function (e) {
      if (e.target.closest(".qoruma")) { e.preventDefault(); xeberdar("Sağ düymə bu səhifədə bağlıdır."); }
    });
    D.addEventListener("copy", function (e) {
      if (e.target.closest && e.target.closest(".qoruma")) {
        e.preventDefault(); xeberdar("Sualların kopyalanması bağlıdır.");
      }
    });
    D.addEventListener("cut", function (e) { if (e.target.closest && e.target.closest(".qoruma")) e.preventDefault(); });
    D.addEventListener("dragstart", function (e) { if (e.target.closest && e.target.closest(".qoruma")) e.preventDefault(); });

    D.addEventListener("keydown", function (e) {
      var k = (e.key || "").toLowerCase();
      if (e.key === "PrintScreen") {
        try { navigator.clipboard && navigator.clipboard.writeText(" "); } catch (_) {}
        ortuAc("Ekran şəkli aşkarlandı. Suallar müəllif hüququ ilə qorunur.");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (k === "p" || k === "s" || k === "u")) {
        e.preventDefault(); xeberdar("Bu əməliyyat bağlıdır.");
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === "i" || k === "c" || k === "j")) {
        e.preventDefault();
      }
    });

    /* Pəncərədən çıxanda məzmunu bulandır — ekran yazısına qarşı maneə */
    var ortu = el("div", "ortu", '<div class="ortu-ic"><b>Məzmun gizlədildi</b>'
      + '<span>Səhifəyə qayıtmaq üçün buraya toxunun.</span></div>');
    D.body.appendChild(ortu);
    ortu.addEventListener("click", function () { ortu.classList.remove("acq"); });
    function ortuBagla() { ortu.classList.remove("acq"); }
    W.ortuBagla = ortuBagla;
    function ortuAc(mətn) {
      if (Date.now() < ortuSus) return;
      var b = ortu.querySelector("b");
      if (mətn) b.textContent = mətn;
      ortu.classList.add("acq");
    }
    W.addEventListener("blur", function () { if (D.querySelector(".qoruma")) ortuAc("Məzmun gizlədildi"); });
    D.addEventListener("visibilitychange", function () {
      if (D.hidden && D.querySelector(".qoruma")) ortuAc("Məzmun gizlədildi");
    });
    W.ortuAc = ortuAc;
  }
  function ortuAc(m) { if (W.ortuAc) W.ortuAc(m); }
  function ortuBagla() { if (W.ortuBagla) W.ortuBagla(); }

  var sonXeber = 0;
  function xeberdar(mətn) {
    if (Date.now() - sonXeber < 1200) return;
    sonXeber = Date.now();
    var t = el("div", "toast", mətn);
    D.body.appendChild(t);
    setTimeout(function () { t.classList.add("get"); }, 2200);
    setTimeout(function () { t.remove(); }, 2700);
  }

  /* ---------- əsas sinif ---------- */
  function AzQuiz(cfg) {
    this.id = cfg.id;
    this.başlıq = cfg.title || "Test";
    this.rejim = cfg.mode === "exam" ? "exam" : "learn";
    this.dəqiqə = cfg.minutes || 0;
    this.cərimə = typeof cfg.negative === "number" ? cfg.negative : 0;
    this.qaydalar = cfg.rules || null;
    this.qoruma = cfg.protect !== false;
    this.qarışdır = cfg.shuffle !== false;
    this.onBitdi = (typeof cfg.onBitdi === "function") ? cfg.onBitdi : null;
    this.meta = cfg.meta || {};
    this.baslama = Date.now();
    this.suallar = (cfg.questions || []).slice();
    if (this.qarışdır) {
      this.suallar = qarisdir(this.suallar).map(variantQaris);
      /* Hər girişdə yeni sıra olduğu üçün köhnə cavablar bərpa olunmur. */
      this.cavablar = new Array(this.suallar.length).fill(null);
      this.bayraq = [];
      try { localStorage.removeItem("azq:" + this.id); } catch (e) {}
    } else {
      var yad = oxu("azq:" + this.id) || {};
      this.cavablar = yad.cavablar || new Array(this.suallar.length).fill(null);
      this.bayraq = yad.bayraq || [];
    }
    /* Neçənci cəhd olduğunu saxlayır — istifadəçiyə göstərilir. */
    this.cəhd = 1;
    try {
      var k = "azq:cehd:" + this.id;
      this.cəhd = (parseInt(localStorage.getItem(k) || "0", 10) || 0) + 1;
      localStorage.setItem(k, String(this.cəhd));
    } catch (e) {}
    this.indeks = 0;
    this.bitdi = false;
    this.qalan = this.dəqiqə * 60;
    this.başladı = false;
  }

  AzQuiz.prototype.yaddaSaxla = function () {
    yaz("azq:" + this.id, { cavablar: this.cavablar, bayraq: this.bayraq });
  };

  AzQuiz.prototype.cavabSayi = function () {
    var n = 0;
    for (var i = 0; i < this.cavablar.length; i++) if (this.cavablar[i] !== null) n++;
    return n;
  };

  AzQuiz.prototype.hesabla = function () {
    var düz = 0, yanlış = 0, boş = 0;
    for (var i = 0; i < this.suallar.length; i++) {
      if (this.cavablar[i] === null) boş++;
      else if (this.cavablar[i] === this.suallar[i].a) düz++;
      else yanlış++;
    }
    var xam = düz - yanlış * this.cərimə;
    if (xam < 0) xam = 0;
    return { düz: düz, yanlış: yanlış, boş: boş, bal: Math.round(xam * 100) / 100 };
  };

  /* ---------- quraşdırma ---------- */
  AzQuiz.prototype.mount = function (kök) {
    this.kök = kök;
    if (this.qoruma) qorumaQur(kök);
    if (this.rejim === "exam" && this.qaydalar) this.qaydalarEkrani();
    else { this.başladı = true; this.qur(); }
  };

  AzQuiz.prototype.qaydalarEkrani = function () {
    var o = this, k = this.kök;
    k.innerHTML = "";
    var qutu = el("div", "qaydalar");
    var sətirlər = this.qaydalar.map(function (q) { return "<li>" + q + "</li>"; }).join("");
    qutu.innerHTML =
      '<div class="q-bas"><span class="q-nis">İmtahan qaydaları</span>'
      + '<h2>' + this.başlıq + '</h2></div>'
      + '<div class="q-info">'
      + '<div><b>' + this.suallar.length + '</b><span>sual</span></div>'
      + '<div><b>' + (this.dəqiqə ? this.dəqiqə + " dəq" : "sərbəst") + '</b><span>müddət</span></div>'
      + '<div><b>' + (this.cərimə ? "var" : "yox") + '</b><span>səhv cəriməsi</span></div>'
      + '</div>'
      + '<ul class="q-list">' + sətirlər + '</ul>'
      + '<label class="q-raz"><input type="checkbox" id="q-onay"> '
      + 'Qaydaları oxudum və qəbul edirəm. Sualları kopyalamayacaq, ekran şəkli çəkib '
      + 'yaymayacağam — məzmun müəllif hüququ ilə qorunur.</label>'
      + '<button class="btn solid big" id="q-basla" disabled>İmtahana başla</button>';
    k.appendChild(qutu);

    var onay = qutu.querySelector("#q-onay"), düymə = qutu.querySelector("#q-basla");
    onay.addEventListener("change", function () { düymə.disabled = !onay.checked; });
    düymə.addEventListener("click", function () {
      o.başladı = true;
      o.cavablar = new Array(o.suallar.length).fill(null);
      o.bayraq = [];
      o.qur();
    });
  };

  AzQuiz.prototype.qur = function () {
    var o = this, k = this.kök;
    k.innerHTML = "";

    /* vəziyyət sətri */
    var zolaq = el("div", "vziyyet");
    zolaq.innerHTML =
      '<div class="vz-sol">'
      + '<span class="vz-nom"><b id="vz-i">1</b> / ' + this.suallar.length + '</span>'
      + '<span class="vz-ayir"></span>'
      + '<span class="vz-et" id="vz-cavab">0 cavablandı</span>'
      + '<span class="vz-et vz-qal" id="vz-qalan">' + this.suallar.length + ' qalıb</span>'
      + '<span class="vz-et vz-bay" id="vz-bayraq" hidden>0 işarəli</span>'
      + '</div>'
      + '<div class="vz-sag">'
      + (this.dəqiqə ? '<span class="timer" id="vz-vaxt">--:--</span>' : '')
      + '</div>'
      + '<div class="vz-xett"><i id="vz-dolu"></i></div>';
    k.appendChild(zolaq);

    this.kart = el("div", "qcard");
    k.appendChild(this.kart);

    this.naviq = el("div", "qnav");
    k.appendChild(this.naviq);

    this.xerite = el("div", "map");
    k.appendChild(this.xerite);

    this.klaviatura();
    if (this.dəqiqə) this.saatIsle();
    this.ciz();
  };

  AzQuiz.prototype.saatIsle = function () {
    var o = this, sahe = D.getElementById("vz-vaxt");
    clearTimeout(o.saatId);
    function tik() {
      if (o.bitdi || !sahe) return;
      sahe.textContent = vaxtYaz(o.qalan);
      sahe.classList.toggle("az", o.qalan <= 300);
      if (o.qalan <= 0) { o.bitir(true); return; }
      o.qalan--;
      o.saatId = setTimeout(tik, 1000);
    }
    tik();
  };

  AzQuiz.prototype.klaviatura = function () {
    var o = this;
    if (o.klavBagli) return;
    o.klavBagli = true;
    D.addEventListener("keydown", function (e) {
      if (o.bitdi || !o.başladı) return;
      if (e.key >= "1" && e.key <= "5") {
        var i = parseInt(e.key, 10) - 1;
        if (i < o.suallar[o.indeks].o.length) o.sec(i);
      }
      if (e.key === "ArrowRight" && o.indeks < o.suallar.length - 1) { o.indeks++; o.ciz(); }
      if (e.key === "ArrowLeft" && o.indeks > 0) { o.indeks--; o.ciz(); }
    });
  };

  AzQuiz.prototype.sec = function (i) {
    if (this.bitdi) return;
    var s = this.suallar[this.indeks];
    if (this.rejim === "learn" && this.cavablar[this.indeks] !== null) return;
    this.cavablar[this.indeks] = i;
    this.yaddaSaxla();
    this.ciz();
  };

  AzQuiz.prototype.bayraqDeyis = function () {
    var i = this.indeks, p = this.bayraq.indexOf(i);
    if (p > -1) this.bayraq.splice(p, 1); else this.bayraq.push(i);
    this.yaddaSaxla();
    this.ciz();
  };

  AzQuiz.prototype.vziyyetYenile = function () {
    var c = this.cavabSayi(), ü = this.suallar.length;
    var a = D.getElementById("vz-i"), b = D.getElementById("vz-cavab"),
        q = D.getElementById("vz-qalan"), f = D.getElementById("vz-bayraq"),
        d = D.getElementById("vz-dolu");
    if (a) a.textContent = this.indeks + 1;
    if (b) b.textContent = c + " cavablandı";
    if (q) q.textContent = (ü - c) + " qalıb";
    if (f) { f.hidden = this.bayraq.length === 0; f.textContent = this.bayraq.length + " işarəli"; }
    if (d) d.style.width = (c / ü * 100) + "%";
  };

  AzQuiz.prototype.ciz = function () {
    var o = this, s = this.suallar[this.indeks], seçim = this.cavablar[this.indeks];
    var hərf = ["A", "B", "C", "D", "E"];

    var h = '<div class="q-sual"><span class="q-say">' + (this.indeks + 1) + '.</span> ' + s.s + '</div>';
    h += '<div class="opts">';
    s.o.forEach(function (mətn, i) {
      var sinif = "opt";
      if (o.rejim === "learn" && seçim !== null) {
        if (i === s.a) sinif += " right";
        else if (i === seçim) sinif += " wrong";
      } else if (i === seçim) sinif += " sec";
      h += '<button class="' + sinif + '" data-i="' + i + '">'
         + '<span class="h">' + hərf[i] + '</span><span>' + mətn + '</span></button>';
    });
    h += '</div>';

    if (this.rejim === "learn" && seçim !== null && s.e) {
      h += '<div class="expl"><b>' + (seçim === s.a ? "Düzgün." : "Düzgün cavab: "
           + hərf[s.a] + ".") + '</b> ' + s.e + '</div>';
    }
    this.kart.innerHTML = h;
    this.kart.querySelectorAll(".opt").forEach(function (b) {
      b.addEventListener("click", function () { o.sec(parseInt(b.dataset.i, 10)); });
    });

    /* naviqasiya */
    var bayraqlı = this.bayraq.indexOf(this.indeks) > -1;
    this.naviq.innerHTML =
      '<button class="btn sm" id="n-ev"' + (this.indeks === 0 ? " disabled" : "") + '>← Əvvəlki</button>'
      + '<button class="btn sm' + (bayraqlı ? " bayraqli" : "") + '" id="n-bay">'
      + (bayraqlı ? "★ İşarəli" : "☆ İşarələ") + '</button>'
      + '<button class="btn sm" id="n-son"' + (this.indeks === this.suallar.length - 1 ? " disabled" : "") + '>Növbəti →</button>'
      + '<button class="btn sm solid" id="n-bit">Testi bitir</button>';
    var g = function (id) { return D.getElementById(id); };
    g("n-ev").onclick = function () { if (o.indeks > 0) { o.indeks--; o.ciz(); } };
    g("n-son").onclick = function () { if (o.indeks < o.suallar.length - 1) { o.indeks++; o.ciz(); } };
    g("n-bay").onclick = function () { o.bayraqDeyis(); };
    g("n-bit").onclick = function () {
      var boş = o.suallar.length - o.cavabSayi();
      var mətn = boş > 0 ? boş + " sual cavabsızdır. Testi bitirmək istəyirsiniz?"
                         : "Testi bitirmək istəyirsiniz?";
      ortuSusdur(600000);                /* confirm() pəncərə fokusunu aparır — örtük açılmasın */
      var beli = confirm(mətn);
      ortuSusdur(1500);
      if (beli) o.bitir(false);
    };

    /* sual xəritəsi */
    var x = "";
    this.suallar.forEach(function (_, i) {
      var c = "mb";
      if (i === o.indeks) c += " cari";
      if (o.cavablar[i] !== null) c += " dolu";
      if (o.bayraq.indexOf(i) > -1) c += " bayraqli";
      x += '<button class="' + c + '" data-i="' + i + '">' + (i + 1) + '</button>';
    });
    this.xerite.innerHTML = x;
    this.xerite.querySelectorAll(".mb").forEach(function (b) {
      b.addEventListener("click", function () { o.indeks = parseInt(b.dataset.i, 10); o.ciz(); });
    });

    this.vziyyetYenile();
  };

  /* ---------- nəticə ---------- */
  AzQuiz.prototype.bitir = function (vaxtBitdi) {
    this.bitdi = true;
    ortuSusdur(1500);
    ortuBagla();
    this.kök.classList.remove("qoruma");   /* nəticə ekranında fokus itəndə məzmun gizlədilmir */
    var n = this.hesabla(), ü = this.suallar.length;
    if (this.onBitdi) {
      try {
        this.onBitdi({
          test_id: this.id, dogru: n.düz, umumi: ü, bal: n.bal,
          yanlis: n.yanlış, bos: n.boş, vaxtBitdi: !!vaxtBitdi,
          saniye: Math.round((Date.now() - this.baslama) / 1000),
          fenn: this.meta.fenn || null, movzu: this.meta.movzu || null,
          nov: this.meta.nov || "test"
        });
      } catch (e) { if (window.console) console.warn("[quiz] onBitdi:", e); }
    }
    var faiz = Math.round(n.bal / ü * 100);
    var hərf = ["A", "B", "C", "D", "E"];
    var çevrə = 2 * Math.PI * 52, dolu = çevrə * Math.min(1, Math.max(0, n.bal / ü));

    var h = '<div class="score">'
      + '<svg viewBox="0 0 120 120" class="ring" aria-hidden="true">'
      + '<circle cx="60" cy="60" r="52" class="bg"></circle>'
      + '<circle cx="60" cy="60" r="52" class="fg" stroke-dasharray="' + dolu + ' ' + çevrə + '"></circle>'
      + '<text x="60" y="66" text-anchor="middle" class="num">' + faiz + '%</text></svg>'
      + '<div class="meta">'
      + (vaxtBitdi ? '<p class="vaxtbitdi">Vaxt bitdi — test avtomatik yekunlaşdı.</p>' : '')
      + '<div class="mt"><b>' + n.düz + '</b><span>düz</span></div>'
      + '<div class="mt"><b>' + n.yanlış + '</b><span>səhv</span></div>'
      + '<div class="mt"><b>' + n.boş + '</b><span>boş</span></div>'
      + '<div class="mt"><b>' + n.bal + '</b><span>bal / ' + ü + '</span></div>'
      + (this.cərimə
          ? '<p class="qeyd">Səhv cavablar bala təsir etdi: hər ' + Math.round(1 / this.cərimə)
            + ' səhv 1 düzgün cavabı aparır (DİM qəbul imtahanı qaydası).</p>'
          : '<p class="qeyd">Bu imtahan formatında səhv cavablar balı azaltmır.</p>')
      + '</div></div>';

    h += '<h3 class="rev-bas">Sualların təhlili</h3><div class="review">';
    for (var i = 0; i < ü; i++) {
      var s = this.suallar[i], c = this.cavablar[i];
      var vəz = c === null ? "bos" : (c === s.a ? "dz" : "sh");
      var etiket = c === null ? "Boş" : (c === s.a ? "Düz" : "Səhv");
      h += '<div class="rev ' + vəz + '">'
        + '<div class="rev-bs"><span class="rev-no">' + (i + 1) + '</span>'
        + '<span class="rev-et">' + etiket + '</span></div>'
        + '<div class="rev-sual">' + s.s + '</div>'
        + '<div class="rev-cvb">'
        + (c !== null && c !== s.a ? '<span class="sechv">Sənin cavabın: ' + hərf[c] + ') ' + s.o[c] + '</span>' : '')
        + '<span class="dzgn">Düzgün: ' + hərf[s.a] + ') ' + s.o[s.a] + '</span></div>'
        + (s.e ? '<div class="rev-izah">' + s.e + '</div>' : '')
        + '</div>';
    }
    h += '</div>';
    h += '<div class="rev-alt"><button class="btn solid" id="r-tekrar">Yenidən başla</button></div>';

    this.kök.innerHTML = h;
    var o = this;
    D.getElementById("r-tekrar").onclick = function () {
      o.cavablar = new Array(ü).fill(null);
      o.bayraq = []; o.indeks = 0; o.bitdi = false;
      o.qalan = o.dəqiqə * 60;
      if (o.qoruma) o.kök.classList.add("qoruma");
      o.yaddaSaxla();
      if (o.rejim === "exam" && o.qaydalar) o.qaydalarEkrani();
      else { o.qur(); }
    };
    this.yaddaSaxla();
    W.scrollTo({ top: this.kök.offsetTop - 70, behavior: "smooth" });
  };

  /* ---------- ixrac ---------- */
  W.AzQuiz = {
    mount: function (cfg) {
      var kök = D.getElementById(cfg.el || "quiz");
      if (!kök) return;
      var q = new AzQuiz(cfg);
      q.mount(kök);
      return q;
    }
  };
})(window, document);
