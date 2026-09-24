/*
 * sidebar-resize.js — draggable divider between the sidebar and the main pane.
 * ---------------------------------------------------------------------------
 * The whole app is one CSS grid (.shell = `var(--sidebar-w) 1fr`) shared by
 * every stack and both Learn and Practice modes, so resizing is just a matter
 * of driving `--sidebar-w`. This module injects a thin handle on the seam and
 * lets the person drag it left/right (or use arrow keys); the chosen width is
 * saved as a pref so it sticks across problems, modes, stacks and reloads.
 *
 * Desktop only: below 900px the sidebar is an off-canvas drawer and the handle
 * hides itself (see layout.css). When the sidebar is collapsed the handle hides
 * too, and the saved width is restored on expand.
 *
 * No dependencies, ES5-safe.
 */
(function () {
  "use strict";

  var MIN = 240;          // keep search + filters + categories usable
  var MAX_ABS = 620;      // hard ceiling regardless of viewport
  var DEFAULT = 320;      // matches --sidebar-w in main.css
  var KEY = "sidebarW";   // stored via the app's prefs (covered by export/import)
  var docEl = document.documentElement;

  function store() { return window.BLIND75 && window.BLIND75.store; }

  function savePx(px) {
    var s = store();
    if (s && s.setPref) { s.setPref(KEY, px); return; }
    try { localStorage.setItem("blind75:sidebarW", String(px)); } catch (e) {}
  }
  function loadPx() {
    var s = store(), v = null;
    if (s && s.getPref) v = s.getPref(KEY);
    if (v == null) { try { v = localStorage.getItem("blind75:sidebarW"); } catch (e) {} }
    var n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }

  function maxW() { return Math.min(MAX_ABS, Math.round(window.innerWidth * 0.55)); }
  function clamp(px) { return Math.max(MIN, Math.min(maxW(), px)); }
  function apply(px) { docEl.style.setProperty("--sidebar-w", px + "px"); }
  function current() {
    var v = parseInt(getComputedStyle(docEl).getPropertyValue("--sidebar-w"), 10);
    return isNaN(v) ? DEFAULT : v;
  }

  function init() {
    var shell = document.querySelector(".shell");
    if (!shell || shell.querySelector(".sidebar-resizer")) return;

    // restore any saved width before the first paint settles
    var saved = loadPx();
    if (saved != null) apply(clamp(saved));

    var hz = document.createElement("div");
    hz.className = "sidebar-resizer";
    hz.setAttribute("role", "separator");
    hz.setAttribute("aria-orientation", "vertical");
    hz.setAttribute("aria-label", "Resize sidebar — drag, use arrow keys, or double-click to reset");
    hz.setAttribute("tabindex", "0");
    hz.title = "Drag to resize · double-click to reset";
    shell.appendChild(hz);

    var dragging = false;

    function onMove(e) {
      if (!dragging) return;
      var x = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
      var rect = shell.getBoundingClientRect();
      apply(clamp(Math.round(x - rect.left)));
      if (e.cancelable) e.preventDefault();
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove("resizing");
      savePx(current());
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    hz.addEventListener("pointerdown", function (e) {
      if (e.button && e.button !== 0) return;   // primary button only
      dragging = true;
      document.body.classList.add("resizing");
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      if (e.cancelable) e.preventDefault();
    });

    hz.addEventListener("dblclick", function () { apply(DEFAULT); savePx(DEFAULT); });

    hz.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? 40 : 16, cur = current();
      if (e.key === "ArrowLeft") { cur = clamp(cur - step); }
      else if (e.key === "ArrowRight") { cur = clamp(cur + step); }
      else if (e.key === "Home") { cur = DEFAULT; }
      else return;
      apply(cur); savePx(cur); e.preventDefault();
    });

    // keep the width within bounds if the viewport shrinks
    window.addEventListener("resize", function () {
      var cur = current(), c = clamp(cur);
      if (c !== cur) { apply(c); savePx(c); }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
