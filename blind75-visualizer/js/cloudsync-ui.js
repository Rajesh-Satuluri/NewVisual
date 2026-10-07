/*
 * cloudsync-ui.js — the settings control for cross-device cloud sync.
 *
 * Adds a "☁ Cloud sync" item to the top-bar More (⋯) menu that opens a small
 * dialog where you set your shared sync code, link the device, sync on demand,
 * or disconnect. All the actual syncing lives in js/modules/cloudsync.js; this
 * file is purely the UI and is self-contained (scoped styles, ES5-safe).
 */
(function () {
  "use strict";

  var B = window.BLIND75 || (window.BLIND75 = {});

  var CSS = [
    ".cs-overlay{position:fixed;inset:0;z-index:10000;display:flex;",
    "  align-items:center;justify-content:center;padding:16px;",
    "  background:rgba(4,10,20,.55);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);}",
    ".cs-overlay[hidden]{display:none;}",
    ".cs-card{width:100%;max-width:440px;box-sizing:border-box;",
    "  background:var(--panel,#121a2a);color:var(--ink,#e7eef7);",
    "  border:1px solid rgba(255,255,255,.12);border-radius:14px;",
    "  box-shadow:0 20px 60px rgba(0,0,0,.5);padding:20px 20px 18px;",
    "  font:14px/1.5 inherit;}",
    ".cs-card h2{margin:0 0 4px;font-size:17px;display:flex;align-items:center;gap:8px;}",
    ".cs-sub{margin:0 0 14px;opacity:.75;font-size:12.5px;}",
    ".cs-row{display:flex;gap:8px;margin:10px 0;}",
    ".cs-row input{flex:1;min-width:0;padding:9px 11px;border-radius:9px;",
    "  border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.25);",
    "  color:inherit;font:600 14px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.5px;}",
    ".cs-btn{cursor:pointer;border-radius:9px;border:1px solid transparent;",
    "  padding:9px 13px;font:600 13px/1 inherit;white-space:nowrap;}",
    ".cs-btn-primary{background:#0a6fd0;color:#fff;}",
    ".cs-btn-primary:hover{background:#0857a8;}",
    ".cs-btn-ghost{background:rgba(255,255,255,.08);color:inherit;}",
    ".cs-btn-ghost:hover{background:rgba(255,255,255,.16);}",
    ".cs-btn-danger{background:transparent;color:#ff8a8a;border-color:rgba(255,138,138,.4);}",
    ".cs-btn-danger:hover{background:rgba(255,138,138,.12);}",
    ".cs-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;}",
    ".cs-actions .cs-spacer{flex:1;}",
    ".cs-status{margin-top:12px;font-size:12.5px;min-height:1.2em;opacity:.9;}",
    ".cs-note{margin-top:12px;font-size:12px;opacity:.7;}",
    ".cs-warn{margin:10px 0;padding:9px 11px;border-radius:9px;font-size:12.5px;",
    "  background:rgba(255,196,0,.12);border:1px solid rgba(255,196,0,.35);}",
    ".cs-warn code{font-family:ui-monospace,Menlo,monospace;}",
    "@media (prefers-color-scheme:light){.cs-card{background:#fff;color:#0b1a2b;}}"
  ].join("\n");

  function injectStyleOnce() {
    if (document.getElementById("cs-style")) return;
    var st = document.createElement("style");
    st.id = "cs-style";
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  var overlay = null, codeInput = null, statusEl = null;

  function buildModal() {
    if (overlay) return overlay;
    injectStyleOnce();

    overlay = document.createElement("div");
    overlay.className = "cs-overlay";
    overlay.setAttribute("hidden", "");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Cloud sync settings");

    var card = document.createElement("div");
    card.className = "cs-card";
    overlay.appendChild(card);

    var h = document.createElement("h2");
    h.textContent = "☁ Cloud sync";
    card.appendChild(h);

    var sub = document.createElement("p");
    sub.className = "cs-sub";
    sub.textContent = "Sync your notes and code edits across devices. Type the same sync code on every device and they share the same data.";
    card.appendChild(sub);

    if (!B.cloud || !B.cloud.configured()) {
      var warn = document.createElement("div");
      warn.className = "cs-warn";
      warn.innerHTML = "Backend not configured yet. Add your Supabase <code>url</code> and <code>anonKey</code> in " +
        "<code>js/supabase-config.js</code> and run <code>supabase/schema.sql</code> once, then reload.";
      card.appendChild(warn);
    }

    var row = document.createElement("div");
    row.className = "cs-row";
    codeInput = document.createElement("input");
    codeInput.type = "text";
    codeInput.placeholder = "your-sync-code";
    codeInput.autocomplete = "off";
    codeInput.spellcheck = false;
    codeInput.setAttribute("aria-label", "Sync code");
    var genBtn = document.createElement("button");
    genBtn.className = "cs-btn cs-btn-ghost";
    genBtn.type = "button";
    genBtn.textContent = "Generate";
    genBtn.addEventListener("click", function () {
      if (B.cloud) codeInput.value = B.cloud.generateCode();
      codeInput.focus();
      codeInput.select();
    });
    row.appendChild(codeInput);
    row.appendChild(genBtn);
    card.appendChild(row);

    statusEl = document.createElement("div");
    statusEl.className = "cs-status";
    card.appendChild(statusEl);

    var actions = document.createElement("div");
    actions.className = "cs-actions";

    var linkBtn = document.createElement("button");
    linkBtn.className = "cs-btn cs-btn-primary";
    linkBtn.type = "button";
    linkBtn.textContent = "Link & sync";
    linkBtn.addEventListener("click", function () {
      var code = (codeInput.value || "").trim();
      if (code.replace(/-/g, "").length < 8) { setStatus("Code must be at least 8 characters."); return; }
      if (B.cloud) B.cloud.link(code);
    });

    var syncBtn = document.createElement("button");
    syncBtn.className = "cs-btn cs-btn-ghost";
    syncBtn.type = "button";
    syncBtn.textContent = "Sync now";
    syncBtn.addEventListener("click", function () {
      if (B.cloud) B.cloud.pull({ force: true });
    });

    var discBtn = document.createElement("button");
    discBtn.className = "cs-btn cs-btn-danger";
    discBtn.type = "button";
    discBtn.textContent = "Disconnect";
    discBtn.addEventListener("click", function () {
      if (B.cloud) B.cloud.unlink();
      codeInput.value = "";
    });

    var spacer = document.createElement("div");
    spacer.className = "cs-spacer";

    var closeBtn = document.createElement("button");
    closeBtn.className = "cs-btn cs-btn-ghost";
    closeBtn.type = "button";
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", close);

    actions.appendChild(linkBtn);
    actions.appendChild(syncBtn);
    actions.appendChild(discBtn);
    actions.appendChild(spacer);
    actions.appendChild(closeBtn);
    card.appendChild(actions);

    var note = document.createElement("p");
    note.className = "cs-note";
    note.textContent = "Keep your sync code private — anyone who has it can read and change your synced notes and code.";
    card.appendChild(note);

    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function (e) {
      if (!overlay.hasAttribute("hidden") && e.key === "Escape") close();
    });

    if (B.cloud && B.cloud.onStatus) B.cloud.onStatus(setStatus);

    (document.body || document.documentElement).appendChild(overlay);
    return overlay;
  }

  function setStatus(txt) { if (statusEl) statusEl.textContent = txt || ""; }

  function open() {
    buildModal();
    if (B.cloud) codeInput.value = B.cloud.getCode() || "";
    setStatus(B.cloud ? B.cloud.status() : "");
    overlay.removeAttribute("hidden");
    codeInput.focus();
  }
  function close() { if (overlay) overlay.setAttribute("hidden", ""); }

  // ---- inject the menu item into the top-bar "More" menu ------------------
  function addMenuItem() {
    var menu = document.getElementById("settingsMenu");
    if (!menu || document.getElementById("cloudSyncBtn")) return;
    var item = document.createElement("button");
    item.id = "cloudSyncBtn";
    item.className = "menu-item";
    item.setAttribute("role", "menuitem");
    item.textContent = "☁ Cloud sync";
    item.addEventListener("click", function () {
      menu.classList.add("hidden"); // close the pop-menu
      open();
    });
    var anchor = document.getElementById("importBtn");
    if (anchor && anchor.parentNode === menu) menu.insertBefore(item, anchor.nextSibling);
    else menu.appendChild(item);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addMenuItem);
  else addMenuItem();
})();
