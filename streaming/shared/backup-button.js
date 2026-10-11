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
   • The zip URL is derived from THIS script's own src: the site root
     is the part before "shared/backup-button.js", and the tool is the
     first path segment below it, so the link always points at
     <root>/<tool>/<tool>.zip — correct on the tool's home page AND on
     any deeper sub-page (e.g. a routed Next.js page). Override the file
     with data-zip="whatever.zip" (resolved at the site root; the
     landing page uses this for the whole-repo "download all" archive).
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

  // --- absolute URL of the site root, derived from THIS script's own src ---
  // The script is always included as ".../shared/backup-button.js"; the part
  // before "shared/backup-button.js" is the site root (e.g. ".../NewVisual/").
  // Because currentScript.src resolves to an absolute URL, this is correct no
  // matter how many "../" the include used or how deep the current page is.
  function siteRootURL(self) {
    var src = (self && self.src) || "";
    src = src.replace(/[?#].*$/, "");
    var idx = src.indexOf("shared/backup-button.js");
    return idx >= 0 ? src.slice(0, idx) : null; // ends in "/", or null
  }

  // --- the tool folder = first path segment below the site root ---
  function toolFolder(rootURL) {
    var basePath = "/";
    if (rootURL) {
      try { basePath = new URL(rootURL).pathname; } catch (e) { basePath = "/"; }
    }
    var path = location.pathname || "/";
    var rel = path.indexOf(basePath) === 0 ? path.slice(basePath.length) : path;
    var seg = rel.split("/").filter(Boolean)[0];
    return seg || currentDirName();
  }

  // --- resolve the final href for the download link ---
  // Priority: explicit data-zip (resolved at the site root so it works from any
  // depth) → else the tool's own <root>/<tool>/<tool>.zip.
  function resolveZipHref(ds, rootURL) {
    if (ds.zip) return rootURL ? rootURL + ds.zip : ds.zip;
    var tool = toolFolder(rootURL);
    var name = (tool || "project") + ".zip";
    return rootURL ? rootURL + tool + "/" + name : name;
  }

  var ICON =
    '<svg class="nv-backup-ic" width="15" height="15" viewBox="0 0 24 24"' +
    ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
    ' stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
    '<polyline points="7 10 12 15 17 10"/>' +
    '<line x1="12" y1="15" x2="12" y2="3"/></svg>';

  var HOME_ICON =
    '<svg class="nv-backup-ic" width="15" height="15" viewBox="0 0 24 24"' +
    ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
    ' stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M3 10.5 12 3l9 7.5"/>' +
    '<path d="M5 9.5V21h14V9.5"/>' +
    '<path d="M9.5 21v-6h5v6"/></svg>';

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
    // Home button: a quieter, secondary pill so Backup stays the accent.
    ".nv-home{background:rgba(120,130,150,.16);color:inherit;",
    "  border:1px solid rgba(130,140,160,.34);}",
    ".nv-home:hover{background:rgba(120,130,150,.28);color:inherit;}",
    ".nv-actions{display:inline-flex;align-items:center;gap:8px;}",
    ".nv-backup--inbar{align-self:center;padding:8px 12px;",
    "  box-shadow:0 1px 2px rgba(0,0,0,.15);}",
    ".nv-home.nv-backup--inbar{box-shadow:none;}",
    ".nv-backup--fixed{position:fixed;top:12px;right:14px;z-index:9999;",
    "  padding:9px 13px;box-shadow:0 4px 16px rgba(0,0,0,.28);}",
    ".nv-actions--fixed{position:fixed;top:12px;right:14px;z-index:9999;}",
    ".nv-actions--fixed .nv-backup{position:static;padding:9px 13px;",
    "  box-shadow:0 4px 16px rgba(0,0,0,.28);}",
    "@media (max-width:560px){",
    "  .nv-backup-txt{display:none;}",
    "  .nv-backup--inbar{padding:8px;}",
    "  .nv-backup--fixed{padding:9px;top:10px;right:10px;}",
    "  .nv-actions--fixed{top:10px;right:10px;gap:6px;}",
    "  .nv-actions--fixed .nv-backup{padding:9px;}",
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

  // --- build the download/backup pill ---
  function makeBackup(ds, rootURL) {
    var zip = resolveZipHref(ds, rootURL);
    var label = ds.label || "Backup";
    var title = ds.title || "Download this project as a .zip backup";
    var a = document.createElement("a");
    a.id = "nv-backup-link";
    a.className = "nv-backup";
    a.href = zip;
    a.setAttribute("download", "");
    a.setAttribute("rel", "nofollow");
    a.title = title;
    a.setAttribute("aria-label", title);
    a.innerHTML = ICON + '<span class="nv-backup-txt"></span>';
    a.querySelector(".nv-backup-txt").textContent = label;
    return a;
  }

  // --- build the "back to the hub" pill ---
  // Skipped with data-home="off"; hidden automatically on the hub page itself
  // (when the current folder IS the site root, there is nowhere higher to go).
  function makeHome(ds, rootURL) {
    if (ds.home === "off") return null;
    var href = ds.homeHref || rootURL || "/";
    // On the landing page the tool folder is empty → don't show a self-link.
    if (!ds.homeHref && !toolFolder(rootURL)) return null;
    var label = ds.homeLabel || "Home";
    var title = ds.homeTitle || "Back to all labs (home)";
    var a = document.createElement("a");
    a.id = "nv-home-link";
    a.className = "nv-backup nv-home";
    a.href = href;
    a.title = title;
    a.setAttribute("aria-label", title);
    a.innerHTML = HOME_ICON + '<span class="nv-backup-txt"></span>';
    a.querySelector(".nv-backup-txt").textContent = label;
    return a;
  }

  function init() {
    if (document.getElementById("nv-backup-link")) return; // idempotent

    var self = findSelf();
    var ds = (self && self.dataset) || {};
    var rootURL = siteRootURL(self);

    injectStyleOnce();

    var backup = makeBackup(ds, rootURL);
    var home = makeHome(ds, rootURL);

    var host =
      document.querySelector(".topbar-actions") ||
      document.querySelector(".topbar-right");

    if (host) {
      // Slot both into the app's own actions bar: Home left of Backup, both
      // left of any existing icons, for a native in-header look.
      backup.className += " nv-backup--inbar";
      host.insertBefore(backup, host.firstChild);
      if (home) {
        home.className += " nv-backup--inbar";
        host.insertBefore(home, backup);
      }
      // On a narrow screen a crowded toolbar can overflow the viewport,
      // leaving the in-bar buttons off-screen and unreachable. If that
      // happened, lift them out into a fixed top-right group instead.
      var box = backup.getBoundingClientRect();
      if (box.width === 0 || box.right > window.innerWidth + 2 || box.left < -2) {
        mountFixed(home, backup);
      }
    } else {
      mountFixed(home, backup);
    }
  }

  // --- fixed top-right group holding [Home] [Backup] ---
  function mountFixed(home, backup) {
    backup.className = backup.className
      .replace(" nv-backup--inbar", "")
      .replace(" nv-backup--fixed", "");
    var wrap = document.createElement("div");
    wrap.className = "nv-actions nv-actions--fixed";
    if (home) {
      home.className = home.className.replace(" nv-backup--inbar", "");
      wrap.appendChild(home);
    }
    wrap.appendChild(backup);
    (document.body || document.documentElement).appendChild(wrap);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
