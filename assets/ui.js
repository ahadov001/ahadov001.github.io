/* Dərs Toplusu — kiçik görünüş köməkçisi.
   Yan panellər (mövzu siyahısı, mündəricat) kompüterdə açıq, telefonda bağlı başlayır.
   Heç nə yadda saxlanmır: səhifəyə hər girişdə səliqəli vəziyyət. */
(function () {
  "use strict";
  var genis = !(window.matchMedia && window.matchMedia("(max-width:1000px)").matches);
  var list = document.querySelectorAll("details[data-mobil-bagli]");
  for (var i = 0; i < list.length; i++) list[i].open = genis;

  /* Yan paneldə cari mövzu görünən yerdə olsun */
  if (genis) {
    var c = document.querySelector(".yan .ys-list a.cari");
    var y = c && c.closest(".yan");
    if (c && y && y.scrollHeight > y.clientHeight) {
      y.scrollTop = Math.max(0, c.offsetTop - y.clientHeight / 2);
    }
  }
})();
