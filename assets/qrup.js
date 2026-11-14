/* Qəbul imtahanı: əvvəl qrup seçilir, sonra yalnız həmin qrupun variantları açılır */
(function () {
  "use strict";
  var ACAR = "dt:qrup";
  var AD = { 1: "I qrup", 2: "II qrup", 3: "III qrup", 4: "IV qrup" };
  var DUGMELER = document.querySelectorAll(".qrp[data-qrup]");
  var KARTLAR = document.querySelectorAll("#qrup-xidmet .card[data-qrup]");
  if (!DUGMELER.length) return;

  function oxu() {
    var h = (location.hash || "").match(/^#qrup-?([1-4])$/);
    if (h) return h[1];
    try { var v = localStorage.getItem(ACAR); if (/^[1-4]$/.test(v || "")) return v; } catch (e) {}
    return "";
  }

  function sec(q, qeyd, sürüş) {
    DUGMELER.forEach(function (d) {
      var ok = d.getAttribute("data-qrup") === q;
      d.classList.toggle("sec", ok);
      d.setAttribute("aria-pressed", ok ? "true" : "false");
    });
    var say = 0;
    KARTLAR.forEach(function (k) {
      var ok = k.getAttribute("data-qrup") === q;
      k.classList.toggle("gizli", !ok);
      if (ok) say++;
    });
    var xid = document.getElementById("qrup-xidmet"),
        ip = document.getElementById("qrup-ipucu"),
        bas = document.getElementById("qrup-bas");
    xid.classList.toggle("gizli", !q);
    ip.classList.toggle("gizli", !!q);
    bas.classList.toggle("gizli", !q);
    if (q) {
      document.getElementById("qrup-bash").textContent = AD[q] + " — imtahan variantları";
      document.getElementById("qrup-alt").textContent = say + " variant. Hər biri 45 sual, 180 dəqiqə.";
      if (qeyd) {
        try { localStorage.setItem(ACAR, q); } catch (e) {}
        if (history.replaceState) history.replaceState(null, "", "#qrup-" + q);
      }
      if (sürüş && bas.scrollIntoView) bas.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  DUGMELER.forEach(function (d) {
    d.addEventListener("click", function () { sec(d.getAttribute("data-qrup"), true, true); });
  });
  window.addEventListener("hashchange", function () {
    var h = (location.hash || "").match(/^#qrup-?([1-4])$/);
    if (h) sec(h[1], false, false);
  });
  sec(oxu(), false, false);
})();
