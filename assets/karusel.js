/* Fənn karuseli — sol/sağ oxlar */
(function () {
  var k = document.getElementById("karusel");
  if (!k) return;
  var sol = document.getElementById("ox-sol"), sag = document.getElementById("ox-sag");
  function addim() { var c = k.querySelector(".fcard"); return c ? c.offsetWidth + 14 : 240; }
  function yenile() {
    var son = k.scrollWidth - k.clientWidth - 2;
    sol.disabled = k.scrollLeft <= 2;
    sag.disabled = k.scrollLeft >= son;
  }
  sol.addEventListener("click", function () { k.scrollBy({ left: -addim() * 2, behavior: "smooth" }); });
  sag.addEventListener("click", function () { k.scrollBy({ left: addim() * 2, behavior: "smooth" }); });
  k.addEventListener("scroll", yenile);
  window.addEventListener("resize", yenile);
  yenile();
})();
