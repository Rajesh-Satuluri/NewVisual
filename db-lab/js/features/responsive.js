/* ============================================================
   responsive.js — off-canvas sidebar drawer + touch wiring
   Adds a hamburger + backdrop; the drawer is active below 1024px
   (CSS in responsive.css). Desktop keeps the persistent sidebar.
   ============================================================ */
(function () {
  "use strict";
  var sidebar = document.getElementById("sidebar");
  var topbar = document.getElementById("topbar");
  var appBody = document.querySelector(".app-body");
  if (!sidebar || !topbar || !appBody) return;

  var mq = window.matchMedia("(max-width: 1024px)");

  // Hamburger button (leftmost in the topbar).
  var btn = document.createElement("button");
  btn.className = "icon-btn hamburger";
  btn.id = "sidebar-toggle";
  btn.type = "button";
  btn.title = "Menu";
  btn.setAttribute("aria-label", "Toggle navigation menu");
  btn.setAttribute("aria-controls", "sidebar");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
    '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  topbar.insertBefore(btn, topbar.firstChild);

  // Dismiss backdrop.
  var backdrop = document.createElement("div");
  backdrop.className = "sidebar-backdrop";
  backdrop.id = "sidebar-backdrop";
  appBody.appendChild(backdrop);

  function open() {
    sidebar.classList.add("open");
    backdrop.classList.add("visible");
    btn.setAttribute("aria-expanded", "true");
  }
  function close() {
    sidebar.classList.remove("open");
    backdrop.classList.remove("visible");
    btn.setAttribute("aria-expanded", "false");
  }
  function toggle() { sidebar.classList.contains("open") ? close() : open(); }

  btn.addEventListener("click", toggle);
  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  // Close after choosing a destination while in drawer mode.
  sidebar.addEventListener("click", function (e) {
    if (e.target.closest("a") && mq.matches) close();
  });
  // Leaving drawer widths resets the drawer state.
  function onMq(e) { if (!e.matches) close(); }
  if (mq.addEventListener) mq.addEventListener("change", onMq);
  else if (mq.addListener) mq.addListener(onMq);
})();
