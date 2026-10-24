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

  // Where the automatic publisher runs (GitHub Actions). Shown to the user so
  // they can watch a publish happen.
  var GH_ACTIONS_URL = "https://github.com/Rajesh-Satuluri/NewVisual/actions/workflows/bake-edits.yml";

  // ---- "Last synced …" label shown near My Notes --------------------------
  // The notes sections (app.js + problemlab.js) drop in a <span
  // class="note-sync-time">; a single listener keeps whichever one is on
  // screen up to date, so there are no per-render listener leaks.
  function injectSyncLabelStyle() {
    if (document.getElementById("cs-label-style")) return;
    var st = document.createElement("style");
    st.id = "cs-label-style";
    st.textContent =
      ".note-sync-time{display:block;margin-top:6px;font-size:11.5px;opacity:.6;" +
      "font-variant-numeric:tabular-nums;letter-spacing:.2px;}";
    (document.head || document.documentElement).appendChild(st);
  }
  function refreshSyncLabels() {
    var txt = (B.cloud && B.cloud.syncLabel) ? B.cloud.syncLabel() : "";
    var els = document.querySelectorAll(".note-sync-time");
    for (var i = 0; i < els.length; i++) els[i].textContent = txt;
  }
  injectSyncLabelStyle();
  if (B.cloud) {
    if (B.cloud.onSync) B.cloud.onSync(refreshSyncLabels);
    if (B.cloud.onStatus) B.cloud.onStatus(refreshSyncLabels); // catch link/unlink
  }
  // Let the notes renderers fill a freshly created label immediately.
  B.refreshSyncLabels = refreshSyncLabels;

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
    "@media (prefers-color-scheme:light){.cs-card{background:#fff;color:#0b1a2b;}}",
    /* publish toast */
    ".cs-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);",
    "  z-index:10001;max-width:min(92vw,520px);box-sizing:border-box;",
    "  background:var(--panel,#121a2a);color:var(--ink,#e7eef7);",
    "  border:1px solid rgba(255,255,255,.14);border-left:4px solid #0a6fd0;",
    "  border-radius:11px;box-shadow:0 12px 40px rgba(0,0,0,.45);",
    "  padding:13px 15px;font:13.5px/1.5 inherit;}",
    ".cs-toast.err{border-left-color:#ff8a8a;}",
    ".cs-toast b{display:block;margin-bottom:2px;font-size:14px;}",
    ".cs-toast a{color:#5cb3ff;}",
    ".cs-toast .cs-x{float:right;margin-left:12px;cursor:pointer;opacity:.6;",
    "  background:none;border:0;color:inherit;font-size:16px;line-height:1;}",
    "@media (prefers-color-scheme:light){.cs-toast{background:#fff;color:#0b1a2b;}}"
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
    sub.textContent = "Sync everything across devices — progress, review schedule, streak, notes and code edits. Type the same sync code on every device and they share the same data.";
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

    var pubBtn = document.createElement("button");
    pubBtn.className = "cs-btn cs-btn-primary";
    pubBtn.type = "button";
    pubBtn.textContent = "↑ Publish to GitHub";
    pubBtn.title = "Push your edits so they're baked into the live tool and the Backup";
    pubBtn.addEventListener("click", publishNow);

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
    actions.appendChild(pubBtn);
    actions.appendChild(discBtn);
    actions.appendChild(spacer);
    actions.appendChild(closeBtn);
    card.appendChild(actions);

    var note = document.createElement("p");
    note.className = "cs-note";
    note.textContent = "Keep your sync code private — anyone who has it can read and change all of your synced study data.";
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

  // ---- publish toast ------------------------------------------------------
  var toastEl = null, toastTimer = null;
  function toast(titleHtml, bodyHtml, isErr, stickyMs) {
    injectStyleOnce();
    if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    if (toastTimer) clearTimeout(toastTimer);
    toastEl = document.createElement("div");
    toastEl.className = "cs-toast" + (isErr ? " err" : "");
    toastEl.setAttribute("role", "status");
    toastEl.innerHTML =
      '<button class="cs-x" aria-label="Dismiss">&times;</button>' +
      "<b></b><span></span>";
    toastEl.querySelector("b").textContent = titleHtml;
    toastEl.querySelector("span").innerHTML = bodyHtml; // bodyHtml is built by us only
    toastEl.querySelector(".cs-x").addEventListener("click", function () {
      if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    });
    (document.body || document.documentElement).appendChild(toastEl);
    toastTimer = setTimeout(function () {
      if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    }, stickyMs || 9000);
  }

  // ---- "Publish now": push edits to the cloud; the scheduled GitHub Action
  // bakes them into the site (and the Backup zip) within a few minutes. ------
  var publishing = false;
  function publishNow() {
    if (publishing) return;
    if (!B.cloud || !B.cloud.enabled()) {
      // Sync must be on, otherwise the edits never leave this browser and the
      // publisher has nothing to read. Walk the user straight into setup.
      toast("Turn on Cloud sync first",
        "Your edits only live in this browser until sync is on. Opening Cloud sync — pick a code and press <b>Link &amp; sync</b>, then Publish.",
        true, 11000);
      open();
      return;
    }
    publishing = true;
    toast("Publishing…", "Sending your latest edits to the cloud.", false, 60000);
    B.cloud.flush().then(function () {
      publishing = false;
      toast("Saved to the cloud ✓",
        'GitHub will bake your edits into the live tool and the Backup within a few minutes. ' +
        'You can watch it at <a href="' + GH_ACTIONS_URL + '" target="_blank" rel="noopener">GitHub Actions</a>.',
        false, 12000);
    })["catch"](function (err) {
      publishing = false;
      toast("Couldn't publish", (err && err.message ? err.message : "Please try again."), true, 11000);
    });
  }
  B.publishEdits = publishNow;

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

    // A one-click "publish my edits to GitHub" item, right below Cloud sync.
    if (!document.getElementById("publishEditsBtn")) {
      var pub = document.createElement("button");
      pub.id = "publishEditsBtn";
      pub.className = "menu-item";
      pub.setAttribute("role", "menuitem");
      pub.textContent = "↑ Publish edits → GitHub";
      pub.addEventListener("click", function () {
        menu.classList.add("hidden");
        publishNow();
      });
      menu.insertBefore(pub, item.nextSibling);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addMenuItem);
  else addMenuItem();
})();
