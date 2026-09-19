/* ============================================================
   backup-button.js — drop-in "Download this project (.zip)" button
   ------------------------------------------------------------
   One shared, self-contained component used across every NewVisual
   app so the person can grab an offline backup of any tool in one
   click. Include it once per project:

       <script src="../shared/backup-button.js" defer></script>

   Behaviour
   ---------
   • Links to <project>.zip sitting in the same folder as the page.
     The archive is built fresh on every deploy by the GitHub Pages
     workflow (see .github/workflows/deploy.yml) — it is never
     committed to git, so there is no repo bloat and the download is
     always current as of the last deploy.
   • The zip name is derived from the current folder (e.g.
     /airflow-visualizer/ -> airflow-visualizer.zip). Override with
     data-zip="whatever.zip" (the landing page uses this for the
     whole-repo "download all" archive).
   • Placement: slots into the app's existing top-right actions bar
     (.topbar-actions / .topbar-right) when one exists, for a native
     look; otherwise renders as a fixed pill in the top-right corner.
     Either way it lands "top right", as requested.
   • Self-injects its own scoped styles (.nv-backup*), works on light
     and dark headers, and collapses to an icon on narrow screens.

   No dependencies, no build step, ES5-safe.
   ============================================================ */
(function () {
  "use strict";

  // --- locate this <script> so we can read its data-* overrides ---
  function findSelf() {
    if (document.currentScript) return document.currentScript;
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i--) {
      var src = all[i].getAttribute("src") || "";
      if (/backup-button\.js(\?|#|$)/.test(src)) return all[i];
    }
    return null;
  }

  // --- name of the folder the page is served from ---
  function currentDirName() {
    var segs = (location.pathname || "").split("/").filter(Boolean);
    // drop a trailing file segment like "index.html"
    if (segs.length && /\.[a-z0-9]+$/i.test(segs[segs.length - 1])) segs.pop();
    return segs.length ? segs[segs.length - 1] : "";
  }

  var ICON =
    '<svg class="nv-backup-ic" width="15" height="15" viewBox="0 0 24 24"' +
    ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
    ' stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
    '<polyline points="7 10 12 15 17 10"/>' +
    '<line x1="12" y1="15" x2="12" y2="3"/></svg>';

  var CSS = [
    ".nv-backup{",
    "  display:inline-flex;align-items:center;gap:7px;",
    "  font:600 13px/1 inherit;font-family:inherit;",
    "  text-decoration:none;white-space:nowrap;cursor:pointer;",
    "  border:1px solid transparent;border-radius:8px;",
    "  background:#0a6fd0;color:#ffffff;",
    "  -webkit-tap-highlight-color:transparent;user-select:none;",
    "  transition:background .15s ease, transform .1s ease, box-shadow .15s ease;",
    "}",
    ".nv-backup:hover{background:#0857a8;color:#ffffff;}",
    ".nv-backup:active{transform:translateY(1px);}",
    ".nv-backup:focus-visible{outline:2px solid #7cc0ff;outline-offset:2px;}",
    ".nv-backup-ic{display:block;flex:0 0 auto;}",
    ".nv-backup--inbar{align-self:center;padding:8px 12px;",
    "  box-shadow:0 1px 2px rgba(0,0,0,.15);}",
    ".nv-backup--fixed{position:fixed;top:12px;right:14px;z-index:9999;",
    "  padding:9px 13px;box-shadow:0 4px 16px rgba(0,0,0,.28);}",
    "@media (max-width:560px){",
    "  .nv-backup-txt{display:none;}",
    "  .nv-backup--inbar{padding:8px;}",
    "  .nv-backup--fixed{padding:9px;top:10px;right:10px;}",
    "}",
    "@media (prefers-reduced-motion:reduce){.nv-backup{transition:none;}}"
  ].join("\n");

  function injectStyleOnce() {
    if (document.getElementById("nv-backup-style")) return;
    var st = document.createElement("style");
    st.id = "nv-backup-style";
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function init() {
    if (document.getElementById("nv-backup-link")) return; // idempotent

    var self = findSelf();
    var ds = (self && self.dataset) || {};
    var dir = currentDirName();
    var zip = ds.zip || ((dir || "project") + ".zip");
    var label = ds.label || "Backup";
    var title = ds.title || "Download this project as a .zip backup";

    injectStyleOnce();

    var a = document.createElement("a");
    a.id = "nv-backup-link";
    a.className = "nv-backup";
    a.href = zip;
    a.setAttribute("download", "");
    a.setAttribute("rel", "nofollow");
    a.title = title;
    a.setAttribute("aria-label", title);
    a.innerHTML = ICON + '<span class="nv-backup-txt"></span>';
    a.querySelector(".nv-backup-txt").textContent = label; // safe text set

    var host =
      document.querySelector(".topbar-actions") ||
      document.querySelector(".topbar-right");

    if (host) {
      a.className += " nv-backup--inbar";
      host.insertBefore(a, host.firstChild); // just left of the existing icons
    } else {
      a.className += " nv-backup--fixed";
      (document.body || document.documentElement).appendChild(a);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
