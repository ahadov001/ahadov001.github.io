/* Sınaq — ortaq kod: Supabase bağlantısı, giriş vəziyyəti, başlıq, balans, alış axını. */
(function (global) {
  "use strict";
  var CFG = global.SINAQ_CONFIG || {};
  var configured = CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY &&
    CFG.SUPABASE_URL.indexOf("YOUR-") === -1 && CFG.SUPABASE_ANON_KEY.indexOf("YOUR-") === -1;

  var sb = null;
  if (configured && global.supabase) {
    sb = global.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  /* ---------- yardımçılar ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) {
    n = Number(n) || 0;
    var s = (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
    return s + " AZN";
  }
  function qs(name) { return new URLSearchParams(location.search).get(name); }
  /* ?next= yalnız eyni saytın nisbi ünvanı ola bilər (açıq yönləndirmə hücumunun qarşısı) */
  function safeNext(v, fallback) {
    if (!v || !/^[a-z0-9][a-z0-9\-_.]*\.html(\?[a-z0-9\-_.=&%]*)?(#[a-z0-9\-_]*)?$/i.test(v)) return fallback || "kabinet.html";
    return v;
  }
  function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
  function fmtDate(iso, withTime) {
    var d = new Date(iso);
    var p = function (x) { return (x < 10 ? "0" : "") + x; };
    var s = p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear();
    return withTime ? s + " " + p(d.getHours()) + ":" + p(d.getMinutes()) : s;
  }
  function grade(percent) {
    return percent >= 80 ? "Əla" : percent >= 50 ? "Yaxşı" : "Təkrar lazımdır";
  }
  function errText(err) {
    var m = String((err && (err.message || err.error_description)) || err || "");
    if (/Invalid login credentials/i.test(m)) return "E-poçt və ya şifrə yanlışdır.";
    if (/Email not confirmed/i.test(m)) return "E-poçt hələ təsdiqlənməyib. Poçt qutunuzdakı təsdiq linkinə basın.";
    if (/already registered|already been registered/i.test(m)) return "Bu e-poçt artıq qeydiyyatdadır. Daxil olun.";
    if (/Password should be at least/i.test(m)) return "Şifrə ən azı 8 simvol olmalıdır.";
    if (/rate limit|too many/i.test(m)) return "Çox sayda cəhd oldu. Bir neçə dəqiqə sonra yenidən cəhd edin.";
    if (/not_authenticated/.test(m)) return "Əvvəlcə daxil olun.";
    if (/access_denied/.test(m)) return "Bu məzmun üçün icazəniz yoxdur.";
    if (/item_not_found/.test(m)) return "Belə test tapılmadı.";
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "İnternet bağlantısı yoxdur və ya server cavab vermir.";
    return "Xəta baş verdi. Bir az sonra yenidən cəhd edin.";
  }

  /* ---------- vəziyyət ---------- */
  var state = { user: null, profile: null };

  async function loadProfile() {
    if (!sb || !state.user) { state.profile = null; return null; }
    var r = await sb.from("profiles").select("full_name,balance").eq("id", state.user.id).maybeSingle();
    state.profile = r.data || { full_name: null, balance: 0 };
    return state.profile;
  }

  var ready = (async function () {
    if (!sb) return state;
    var r = await sb.auth.getSession();
    state.user = r.data && r.data.session ? r.data.session.user : null;
    await loadProfile();
    return state;
  })();

  /* ---------- başlıq ---------- */
  function mountHeader(active) {
    var host = document.getElementById("site-head");
    if (!host) return;
    var link = function (href, label, key) {
      return '<a href="' + href + '"' + (active === key ? ' aria-current="page"' : "") + ">" + label + "</a>";
    };
    host.className = "site-head";
    host.innerHTML =
      '<div class="wrap"><a class="brand" href="index.html"><span class="seal">Az</span>Azərbaycan dili</a>' +
      '<nav aria-label="Əsas menyu">' +
      link("index.html#movzular", "Mövzular", "home") +
      link("index.html#imtahan", "İmtahan topluları", "x1") +
      link("index.html#qarisiq", "Qarışıq testlər", "x2") +
      '</nav><div id="auth-slot" class="auth-slot"></div></div>';
    ready.then(function () { renderAuthSlot(active); });
  }
  function renderAuthSlot(active) {
    var slot = document.getElementById("auth-slot");
    if (!slot) return;
    if (state.user) {
      var name = (state.profile && state.profile.full_name) || (state.user.email || "").split("@")[0];
      slot.innerHTML =
        '<a class="chip bal" href="balans.html" title="Balansı artır"><b id="bal-chip">' + esc(money(state.profile ? state.profile.balance : 0)) + "</b></a>" +
        '<a class="chip" href="kabinet.html"' + (active === "kabinet" ? ' aria-current="page"' : "") + ">" + esc(name.split(" ")[0]) + "</a>";
    } else {
      slot.innerHTML = '<a class="btn sm solid" href="giris.html?next=' + encodeURIComponent(safeNext(location.pathname.split("/").pop() + location.search, "kabinet.html")) + '">Daxil ol</a>';
    }
  }
  function updateBalanceChip() {
    var el = document.getElementById("bal-chip");
    if (el && state.profile) el.textContent = money(state.profile.balance);
  }

  function setupBanner() {
    var host = document.getElementById("setup-banner");
    if (!host || configured) return;
    host.className = "notice";
    host.style.margin = "18px 0";
    host.innerHTML = "<b>Quraşdırma tamamlanmayıb (yalnız sayt sahibi üçün).</b> <code>assets/config.js</code> faylına Supabase ünvanını və açarını yazın — təlimat <code>SETUP.md</code> faylındadır.";
  }

  /* ---------- tələb: giriş ---------- */
  async function requireLogin() {
    await ready;
    if (!state.user) {
      location.replace("giris.html?next=" + encodeURIComponent(safeNext(location.pathname.split("/").pop() + location.search, "kabinet.html")));
      return false;
    }
    return true;
  }

  async function signOut() {
    if (sb) await sb.auth.signOut();
    location.href = "index.html";
  }

  /* ---------- alış axını (balansdan) ---------- */
  function dialog(html) {
    var d = document.createElement("dialog");
    d.className = "dlg";
    d.innerHTML = html;
    document.body.appendChild(d);
    d.addEventListener("close", function () { d.remove(); });
    if (d.showModal) d.showModal(); else d.setAttribute("open", "");
    return d;
  }

  async function buy(item) {
    await ready;
    if (!sb) { alert("Sayt hələ quraşdırılmayıb."); return; }
    var slug = item.slug;
    var isBundle = item.kind === "bundle";
    var dest = isBundle ? "kabinet.html#movzular" : "test.html?i=" + encodeURIComponent(slug);
    var back = isBundle ? "index.html#paket" : "test.html?i=" + encodeURIComponent(slug);
    if (!state.user) {
      location.href = "giris.html?next=" + encodeURIComponent(back);
      return;
    }
    await loadProfile(); updateBalanceChip();
    var bal = Number(state.profile.balance) || 0, price = Number(item.price) || 0;

    if (bal < price) {
      var miss = Math.round((price - bal) * 100) / 100;
      var d1 = dialog(
        "<h3>Balans kifayət etmir</h3><p><b>" + esc(item.title) + "</b> — " + esc(money(price)) + ".</p>" +
        "<p>Balansınızda " + esc(money(bal)) + " var, çatmayan məbləğ <b>" + esc(money(miss)) + "</b>.</p>" +
        '<div class="dlg-act"><button class="btn sm" data-x>Ləğv et</button><button class="btn sm solid" data-go>Balansı artır</button></div>');
      d1.querySelector("[data-x]").onclick = function () { d1.close(); };
      d1.querySelector("[data-go]").onclick = function () {
        location.href = "balans.html?need=" + miss + "&next=" + encodeURIComponent(back);
      };
      return;
    }
    var after = Math.round((bal - price) * 100) / 100;
    var d = dialog(
      "<h3>Alışı təsdiqlə</h3><p><b>" + esc(item.title) + "</b> — " + esc(money(price)) + ".</p>" +
      "<p>Balansınız: " + esc(money(bal)) + ". Alışdan sonra <b>" + esc(money(after)) + "</b> qalacaq.</p>" +
      '<p class="dlg-err" role="alert" hidden></p>' +
      '<div class="dlg-act"><button class="btn sm" data-x>Ləğv et</button><button class="btn sm solid" data-ok>Balansdan al</button></div>');
    d.querySelector("[data-x]").onclick = function () { d.close(); };
    var ok = d.querySelector("[data-ok]"), err = d.querySelector(".dlg-err");
    ok.onclick = async function () {
      ok.disabled = true; ok.textContent = "Gözləyin…"; err.hidden = true;
      var r = await sb.rpc("purchase_item", { p_slug: slug });
      if (r.error) { err.textContent = errText(r.error); err.hidden = false; ok.disabled = false; ok.textContent = "Balansdan al"; return; }
      var st = r.data && r.data.status;
      if (st === "ok" || st === "owned") { location.href = dest; return; }
      if (st === "insufficient") {
        location.href = "balans.html?need=" + r.data.missing + "&next=" + encodeURIComponent(back);
        return;
      }
      err.textContent = "Alış alınmadı."; err.hidden = false; ok.disabled = false; ok.textContent = "Balansdan al";
    };
  }

  if (sb) {
    sb.auth.onAuthStateChange(function (ev, session) {
      state.user = session ? session.user : null;
      if (ev === "SIGNED_OUT") state.profile = null;
    });
  }

  global.Sinaq = {
    sb: sb, configured: configured, ready: ready, state: state,
    esc: esc, money: money, qs: qs, safeNext: safeNext, pct: pct, fmtDate: fmtDate, grade: grade, errText: errText,
    mountHeader: mountHeader, setupBanner: setupBanner, requireLogin: requireLogin, signOut: signOut,
    loadProfile: loadProfile, updateBalanceChip: updateBalanceChip, buy: buy, dialog: dialog
  };
})(window);
