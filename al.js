/* Ödəniş düymələrini links.js faylındakı linklərlə bağlayır. */
(function () {
  var L = window.ALIS_LINKLERI || {};
  var bos = 0, hamisi = 0;
  document.querySelectorAll("[data-al]").forEach(function (a) {
    hamisi++;
    var link = L[a.getAttribute("data-al")];
    if (link) { a.href = link; a.target = "_blank"; a.rel = "noopener"; }
    else { bos++; a.classList.add("off"); a.setAttribute("aria-disabled", "true"); a.removeAttribute("href"); }
  });
  if (bos > 0) {
    var box = document.getElementById("xeberdarliq");
    if (box) {
      box.className = "notice";
      box.style.marginTop = "18px";
      box.innerHTML = "<b>Quraşdırma qeydi (yalnız sayt sahibi üçün).</b> " + bos + " / " + hamisi +
        " ödəniş linki hələ boşdur. <code>assets/links.js</code> faylını açıb Lemon Squeezy " +
        "linklərini yapışdırın — bu xəbərdarlıq avtomatik yox olacaq.";
    }
  }
})();
