/*
 * onboard.js — a one-time welcome overlay (M6.2). Shows on the first visit only
 * (guarded by a localStorage flag), introduces the five-stack / two-mode model
 * and the power features (⌘K palette, Rosetta, dashboard), and gets out of the
 * way. Re-openable via window.ONBOARD.open() if ever wired to a "?" button.
 *
 * Self-contained; accessible (role=dialog, focus moved in and restored, Esc to
 * close, focus-visible friendly). Load after app.js.
 */
(function () {
  var FLAG = "blind75:onboarded:v1";
  var overlay = null, lastFocus = null;

  function seen() { try { return localStorage.getItem(FLAG) === "1"; } catch (e) { return true; } }
  function markSeen() { try { localStorage.setItem(FLAG, "1"); } catch (e) {} }

  function build() {
    overlay = document.createElement("div");
    overlay.id = "onboard";
    overlay.className = "onb hidden";
    overlay.innerHTML =
      '<div class="onb-card" role="dialog" aria-modal="true" aria-labelledby="onb-title">' +
      '  <div class="onb-mark">DE</div>' +
      '  <h2 id="onb-title">Welcome to the Data Engineering Coding Stack</h2>' +
      '  <p class="onb-lead">Everything you need to prep the coding rounds — in one place.</p>' +
      '  <ul class="onb-list">' +
      '    <li><b>Five stacks × two modes.</b> Switch <b>Python · NumPy · Pandas · PySpark · SQL</b> in the top bar, each with a <b>📘 Learn</b> curriculum and a <b>💻 Practice</b> problem set.</li>' +
      '    <li><b>Runnable in the browser.</b> Python, NumPy and Pandas snippets run live — edit and re-run any solution.</li>' +
      '    <li><b>⌘K to jump anywhere.</b> Fuzzy-search every topic and problem, or follow a guided study path.</li>' +
      '    <li><b>🔀 Rosetta.</b> See the same task in SQL, Pandas, PySpark and Python side by side.</li>' +
      '    <li><b>📊 Dashboard.</b> Track readiness and spaced-repetition review across all five stacks.</li>' +
      '  </ul>' +
      '  <div class="onb-actions">' +
      '    <button class="onb-btn onb-primary" data-act="start">Start learning</button>' +
      '    <button class="onb-btn" data-act="palette">Try ⌘K search</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    overlay.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      if (e.key === "Tab") trapFocus(e);
    });
    overlay.querySelector('[data-act="start"]').addEventListener("click", close);
    overlay.querySelector('[data-act="palette"]').addEventListener("click", function () {
      close();
      if (window.PALETTE) window.PALETTE.open();
    });
  }

  function focusables() {
    return Array.prototype.slice.call(overlay.querySelectorAll("button"));
  }
  function trapFocus(e) {
    var f = focusables(); if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open() {
    if (!overlay) build();
    lastFocus = document.activeElement;
    overlay.classList.remove("hidden");
    requestAnimationFrame(function () { overlay.classList.add("open"); });
    document.body.classList.add("cmdk-lock");
    var p = overlay.querySelector(".onb-primary"); if (p) p.focus();
  }
  function close() {
    markSeen();
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.classList.remove("cmdk-lock");
    setTimeout(function () { overlay.classList.add("hidden"); }, 180);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  function init() {
    if (!seen()) setTimeout(open, 450); // let the app paint first
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.ONBOARD = { open: open, close: close };
})();
