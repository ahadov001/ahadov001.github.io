/* Qəbul imtahanı: əvvəl qrup seçilir, sonra yalnız həmin qrupun variantları açılır.
   Heç nə yadda saxlanmır — hər girişdə səhifə yığcam başlayır. */
(function () {
  "use strict";
  var ACAR = "dt:qrup";
  var AD = { 1: "I qrup", 2: "II qrup", 3: "III qrup", 4: "IV qrup" };
  var DUGMELER = document.querySelectorAll(".qrp[data-qrup]");
  var KARTLAR = document.querySelectorAll("#qrup-xidmet .card[data-qrup]");
  if (!DUGMELER.length) return;

  /* Seçim yadda saxlanmır: səhifəyə hər girişdə hər şey yığcam görünür. */
  try { localStorage.removeItem(ACAR); } catch (e) {}
  if (/^#qrup-?[1-4]$/.test(location.hash || "") && history.replaceState) history.replaceState(null, "", location.pathname + location.search);

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
      if (sürüş && bas.scrollIntoView) bas.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  DUGMELER.forEach(function (d) {
    d.addEventListener("click", function () {
      var q = d.getAttribute("data-qrup");
      /* eyni qrupa təkrar klik — bağlayır */
      sec(d.classList.contains("sec") ? "" : q, true, true);
    });
  });
  sec("", false, false);

  /* Sertifikasiya bölməsi: düyməyə klikləyəndə açılır, təkrar klikdə bağlanır */
  var SD = document.getElementById("sert-dugme"), SX = document.getElementById("sert-xidmet");
  if (SD && SX) {
    SD.addEventListener("click", function () {
      var ac = SX.classList.contains("gizli");
      SX.classList.toggle("gizli", !ac);
      SD.classList.toggle("sec", ac);
      SD.setAttribute("aria-pressed", ac ? "true" : "false");
      SD.setAttribute("aria-expanded", ac ? "true" : "false");
      if (ac && SX.scrollIntoView) SX.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
})();
