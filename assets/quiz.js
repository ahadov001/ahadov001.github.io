/* Azərbaycan dili — test mühərriki.
   AzQuiz.mount({id, title, mode:"learn"|"exam", minutes, questions:[{s,o,a,e}]}) */
(function (global) {
  "use strict";

  var HARF = ["A", "B", "C", "D", "E"];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function store(key, val) {
    try {
      if (val === undefined) {
        var raw = global.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      }
      global.localStorage.setItem(key, JSON.stringify(val));
    } catch (err) { /* localStorage bağlıdırsa testə mane olmur */ }
    return null;
  }

  function vaxt(saniye) {
    var d = Math.floor(saniye / 60), s = saniye % 60;
    return d + ":" + (s < 10 ? "0" : "") + s;
  }

  function AzQuiz(cfg) {
    this.cfg = cfg;
    this.qs = cfg.questions;
    this.n = this.qs.length;
    this.mode = cfg.mode || "learn";
    this.key = "azq:" + (cfg.uid || "anon") + ":" + cfg.id;
    this.i = 0;
    this.bitdi = false;
    this.cavab = new Array(this.n).fill(null);
    this.qaliq = (cfg.minutes || 0) * 60;
    this.baslangic = null;
    this.t0 = Date.now();

    var yadda = store(this.key);
    if (yadda && yadda.cavab && yadda.cavab.length === this.n && !yadda.bitdi) {
      this.cavab = yadda.cavab;
      this.i = yadda.i || 0;
    }
  }

  AzQuiz.prototype.yadda = function () {
    store(this.key, { cavab: this.cavab, i: this.i, bitdi: this.bitdi });
  };

  AzQuiz.prototype.dogruSay = function () {
    var k = 0, self = this;
    this.cavab.forEach(function (c, idx) { if (c === self.qs[idx].a) k++; });
    return k;
  };

  AzQuiz.prototype.mount = function (root) {
    this.root = root;
    root.className = "quiz";

    var bar = el("div", "qbar");
    this.pos = el("span", "pos");
    var track = el("div", "track");
    this.fill = el("div", "fill");
    track.appendChild(this.fill);
    bar.appendChild(this.pos);
    bar.appendChild(track);
    if (this.mode === "exam" && this.qaliq > 0) {
      this.saat = el("span", "timer", vaxt(this.qaliq));
      bar.appendChild(this.saat);
    }
    root.appendChild(bar);

    this.govde = el("div");
    root.appendChild(this.govde);

    this.ciz();
    this.klaviatura();
    if (this.mode === "exam" && this.qaliq > 0) this.saatIsle();
  };

  AzQuiz.prototype.saatIsle = function () {
    var self = this;
    this.baslangic = Date.now();
    this.tick = setInterval(function () {
      if (self.bitdi) { clearInterval(self.tick); return; }
      self.qaliq--;
      if (self.saat) {
        self.saat.textContent = vaxt(Math.max(0, self.qaliq));
        if (self.qaliq <= 60) self.saat.classList.add("low");
      }
      if (self.qaliq <= 0) { clearInterval(self.tick); self.bitir(); }
    }, 1000);
  };

  AzQuiz.prototype.klaviatura = function () {
    var self = this;
    document.addEventListener("keydown", function (ev) {
      if (self.bitdi) return;
      if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName)) return;
      var q = self.qs[self.i];
      if (ev.key >= "1" && ev.key <= String(q.o.length)) {
        self.sec(parseInt(ev.key, 10) - 1);
      } else if (ev.key === "ArrowRight") {
        if (self.i < self.n - 1) { self.i++; self.ciz(); }
      } else if (ev.key === "ArrowLeft") {
        if (self.i > 0) { self.i--; self.ciz(); }
      }
    });
  };

  AzQuiz.prototype.sec = function (idx) {
    if (this.bitdi) return;
    if (this.mode === "learn" && this.cavab[this.i] !== null) return;
    this.cavab[this.i] = idx;
    this.yadda();
    this.ciz();
  };

  AzQuiz.prototype.ciz = function () {
    if (this.bitdi) return;
    var self = this, q = this.qs[this.i], secilmis = this.cavab[this.i];
    var cavablanan = this.cavab.filter(function (c) { return c !== null; }).length;

    this.pos.textContent = (this.i + 1) + " / " + this.n + " sual";
    this.fill.style.width = Math.round((cavablanan / this.n) * 100) + "%";

    this.govde.textContent = "";
    var card = el("div", "qcard");
    card.appendChild(el("div", "qtext", (this.i + 1) + ". " + q.s));

    var opts = el("div", "opts");
    q.o.forEach(function (metn, k) {
      var b = el("button", "opt");
      b.type = "button";
      b.setAttribute("aria-pressed", secilmis === k ? "true" : "false");
      var key = el("span", "key", HARF[k]);
      b.appendChild(key);
      b.appendChild(el("span", null, metn));
      if (self.mode === "learn" && secilmis !== null) {
        b.disabled = true;
        if (k === q.a) b.className = "opt right";
        else if (k === secilmis) b.className = "opt wrong";
      }
      b.addEventListener("click", function () { self.sec(k); });
      opts.appendChild(b);
    });
    card.appendChild(opts);

    if (self.mode === "learn" && secilmis !== null) {
      var ex = el("div", "expl");
      var bold = el("b", null, secilmis === q.a ? "Düzdür. " : "Düz cavab: " + HARF[q.a] + ". ");
      ex.appendChild(bold);
      ex.appendChild(document.createTextNode(q.e || ""));
      card.appendChild(ex);
    }
    this.govde.appendChild(card);

    var nav = el("div", "qnav");
    var geri = el("button", "btn sm", "← Əvvəlki");
    geri.type = "button";
    geri.disabled = this.i === 0;
    geri.addEventListener("click", function () { self.i--; self.ciz(); });
    var sag = el("div");
    sag.style.display = "flex";
    sag.style.gap = "10px";
    if (this.i < this.n - 1) {
      var ireli = el("button", "btn sm", "Növbəti →");
      ireli.type = "button";
      ireli.addEventListener("click", function () { self.i++; self.ciz(); });
      sag.appendChild(ireli);
    }
    var bitir = el("button", "btn sm solid", "Testi bitir");
    bitir.type = "button";
    bitir.addEventListener("click", function () { self.bitir(); });
    sag.appendChild(bitir);
    nav.appendChild(geri);
    nav.appendChild(sag);
    this.govde.appendChild(nav);

    var map = el("div", "map");
    this.qs.forEach(function (_, k) {
      var b = el("button", null, String(k + 1));
      b.type = "button";
      b.setAttribute("aria-label", (k + 1) + "-ci sual");
      var cls = [];
      if (self.cavab[k] !== null) {
        if (self.mode === "learn") cls.push(self.cavab[k] === self.qs[k].a ? "ok" : "no");
        else cls.push("done");
      }
      if (k === self.i) cls.push("cur");
      b.className = cls.join(" ");
      b.addEventListener("click", function () { self.i = k; self.ciz(); });
      map.appendChild(b);
    });
    this.govde.appendChild(map);
  };

  AzQuiz.prototype.bitir = function () {
    this.bitdi = true;
    if (this.tick) clearInterval(this.tick);
    this.yadda();

    var self = this, dogru = this.dogruSay(), faiz = Math.round((dogru / this.n) * 100);
    var sured = Math.round((Date.now() - (this.baslangic || this.t0)) / 1000);

    this.root.textContent = "";

    var box = el("div", "score");
    var R = 54, C = 2 * Math.PI * R;
    var reng = faiz >= 80 ? "var(--ok)" : faiz >= 50 ? "var(--gold)" : "var(--bad)";
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 124 124");
    svg.setAttribute("class", "ring");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Nəticə: " + faiz + " faiz");
    svg.innerHTML =
      '<circle cx="62" cy="62" r="' + R + '" fill="none" stroke="var(--line)" stroke-width="11"/>' +
      '<circle cx="62" cy="62" r="' + R + '" fill="none" stroke="' + reng + '" stroke-width="11" stroke-linecap="round"' +
      ' stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - faiz / 100)) + '" transform="rotate(-90 62 62)"/>' +
      '<text x="62" y="70" text-anchor="middle" font-size="27" font-weight="700" fill="var(--ink)"' +
      ' font-family="Literata, Georgia, serif">' + faiz + '%</text>';
    box.appendChild(svg);

    var sag = el("div");
    sag.appendChild(el("h2", null,
      faiz >= 80 ? "Əla nəticə" : faiz >= 50 ? "Yaxşı, amma boşluqlar var" : "Mövzunu təkrar etmək lazımdır"));
    sag.appendChild(el("p", null, this.cfg.title));
    var meta = el("div", "meta");
    function tile(b, s) {
      var d = el("div");
      d.appendChild(el("b", null, b));
      d.appendChild(el("span", null, s));
      return d;
    }
    meta.appendChild(tile(dogru + " / " + this.n, "düzgün cavab"));
    meta.appendChild(tile(String(this.n - dogru), "səhv və boş"));
    if (sured !== null) meta.appendChild(tile(vaxt(sured), "sərf olunan vaxt"));
    sag.appendChild(meta);

    var yeni = el("button", "btn sm", "Testi yenidən həll et");
    yeni.type = "button";
    yeni.style.marginTop = "16px";
    yeni.addEventListener("click", function () {
      self.cavab = new Array(self.n).fill(null);
      self.i = 0; self.bitdi = false; self.t0 = Date.now(); self.baslangic = null;
      self.qaliq = (self.cfg.minutes || 0) * 60;
      self.yadda();
      self.root.textContent = "";
      self.mount(self.root);
      global.scrollTo({ top: 0, behavior: "smooth" });
    });
    sag.appendChild(yeni);
    box.appendChild(sag);
    this.root.appendChild(box);

    if (typeof this.cfg.onFinish === "function") {
      var status = el("div", "notice save-status", "Nəticə saxlanılır…");
      status.setAttribute("role", "status");
      this.root.appendChild(status);
      Promise.resolve(this.cfg.onFinish({ answers: this.cavab.slice(), seconds: sured, score: dogru, total: this.n }))
        .then(function (res) {
          status.textContent = "";
          status.appendChild(document.createTextNode((res && res.text) || "Nəticə saxlanıldı. "));
          if (res && res.href) {
            var a = el("a", null, res.linkText || "Kabinetə bax");
            a.href = res.href;
            status.appendChild(a);
          }
        })
        .catch(function () { status.textContent = "Nəticəni saxlamaq mümkün olmadı, amma təhlil aşağıdadır."; });
    }

    var basliq = el("h2", null, "Cavabların təhlili");
    basliq.style.marginTop = "34px";
    basliq.style.fontSize = "1.3rem";
    this.root.appendChild(basliq);

    var rev = el("div", "review");
    this.qs.forEach(function (q, k) {
      var mene = self.cavab[k], duz = mene === q.a;
      var d = el("div", "rev " + (duz ? "ok" : "no"));
      d.appendChild(el("div", "n", (k + 1) + "-ci sual · " + (duz ? "düzgün" : "səhv")));
      d.appendChild(el("div", "qq", q.s));
      var l1 = el("div", "ln");
      l1.appendChild(el("i", null, "Sənin cavabın: "));
      l1.appendChild(el("span", duz ? "good" : "bad",
        mene === null ? "boş buraxılıb" : HARF[mene] + ") " + q.o[mene]));
      d.appendChild(l1);
      if (!duz) {
        var l2 = el("div", "ln");
        l2.appendChild(el("i", null, "Düzgün cavab: "));
        l2.appendChild(el("span", "good", HARF[q.a] + ") " + q.o[q.a]));
        d.appendChild(l2);
      }
      if (q.e) d.appendChild(el("div", "why", q.e));
      rev.appendChild(d);
    });
    this.root.appendChild(rev);
    this.root.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  global.AzQuiz = {
    mount: function (cfg) {
      var root = document.getElementById(cfg.el || "quiz");
      if (!root) return;
      var q = new AzQuiz(cfg);
      q.mount(root);
      return q;
    }
  };
})(window);
