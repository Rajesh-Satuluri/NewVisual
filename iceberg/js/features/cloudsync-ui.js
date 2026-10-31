/* ============================================================
   cloudsync-ui.js — the control surface for cross-device cloud sync.

   Adds a "Cloud sync" section INSIDE the existing Backup & Restore modal
   (built by js/features/backup.js), so backup, offline copy and cross-device
   sync all live in one place. All the actual syncing is in
   js/features/cloudsync.js; this file is purely UI.

   Additive only: it wraps TV._openBackup to inject one extra .bk-section the
   first time the dialog opens, reusing the dialog's own classes (.bk-section,
   .btn, .badge, …). It edits no existing module and leaves backup.js untouched.
   ES5-safe.
   ============================================================ */
(function () {
  "use strict";

  var TV = (window.TableViz = window.TableViz || window.IcebergViz || {});
  window.IcebergViz = window.IcebergViz || TV;

  var SECTION_ID = "cs-section";
  var statusEl = null, lastEl = null, codeInput = null;

  /* ── a little scoped style (input + status only) ──────────── */
  function injectStyleOnce() {
    if (document.getElementById("cs-style")) return;
    var st = document.createElement("style");
    st.id = "cs-style";
    st.textContent = [
      ".bk-cloud-row{display:flex;gap:8px;align-items:center;margin:8px 0 2px;}",
      ".cs-code{flex:1;min-width:0;padding:9px 11px;border-radius:9px;",
      "  border:1px solid var(--border-subtle,rgba(127,127,127,.35));",
      "  background:var(--bg-3,rgba(127,127,127,.08));color:inherit;",
      "  font:600 13px/1 var(--font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);",
      "  letter-spacing:.5px;}",
      ".cs-status{margin:10px 0 2px;font-size:12.5px;min-height:1.2em;opacity:.9;}",
      ".cs-last{font-variant-numeric:tabular-nums;}",
      ".cs-badge{margin-left:8px;}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(st);
  }

  function icon(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'width="15" height="15" aria-hidden="true">' + paths + '</svg>';
  }

  function setStatus(txt) { if (statusEl) statusEl.textContent = txt || ""; }
  function refreshLast() {
    if (lastEl && TV.cloud && TV.cloud.syncLabel) lastEl.textContent = TV.cloud.syncLabel();
  }

  /* ── build + inject the section ───────────────────────────── */
  function buildSection() {
    injectStyleOnce();
    var sec = document.createElement("div");
    sec.id = SECTION_ID;
    sec.className = "bk-section bk-cloud-section";

    var configured = !!(TV.cloud && TV.cloud.configured && TV.cloud.configured());
    var warn = configured ? "" :
      '<div class="bk-hint" style="margin-top:0;">Backend not set up yet. Add your Supabase ' +
      '<code class="bk-code">url</code> and <code class="bk-code">anonKey</code> in ' +
      '<code class="bk-code">js/supabase-config.js</code> and run ' +
      '<code class="bk-code">supabase/schema.sql</code> once, then reload.</div>';

    sec.innerHTML =
      '<div class="bk-section-title">Cloud sync' +
        '<span class="badge badge-blue cs-badge">across devices</span></div>' +
      '<p class="bk-desc">Keep your <strong>progress, quiz scores, theme and preferences</strong> in step across phones and computers. ' +
        'Type the same <strong>sync code</strong> on each device and they share the same data — no account, no email. ' +
        'Your code is sent only to look up your row and is never stored on the server.</p>' +
      warn +
      '<div class="bk-cloud-row">' +
        '<input class="cs-code" type="text" autocomplete="off" spellcheck="false" ' +
          'placeholder="your-sync-code" aria-label="Sync code" />' +
        '<button class="btn btn-secondary" data-cs="gen" type="button">Generate</button>' +
      '</div>' +
      '<div class="bk-actions">' +
        '<button class="btn btn-primary" data-cs="link" type="button">' +
          icon('<path d="M9 17H7A5 5 0 017 7h2"/><path d="M15 7h2a5 5 0 010 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/>') +
          'Link &amp; sync</button>' +
        '<button class="btn btn-secondary" data-cs="sync" type="button">' +
          icon('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>') +
          'Sync now</button>' +
        '<button class="btn btn-danger" data-cs="unlink" type="button">' +
          icon('<path d="M18.36 6.64A9 9 0 1120.77 15"/><line x1="12" y1="2" x2="12" y2="12"/>') +
          'Disconnect</button>' +
      '</div>' +
      '<p class="cs-status" role="status"></p>' +
      '<p class="bk-hint cs-last"></p>' +
      '<p class="bk-hint">Keep your sync code private — anyone who has it can read and change your synced data.</p>';

    return sec;
  }

  function wire(sec) {
    codeInput = sec.querySelector(".cs-code");
    statusEl = sec.querySelector(".cs-status");
    lastEl = sec.querySelector(".cs-last");

    sec.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-cs]") : null;
      if (!btn) return;
      var act = btn.getAttribute("data-cs");
      if (!TV.cloud) { setStatus("Cloud sync isn’t available."); return; }

      if (act === "gen") {
        codeInput.value = TV.cloud.generateCode();
        codeInput.focus(); codeInput.select();

      } else if (act === "link") {
        var code = (codeInput.value || "").trim();
        if (code.replace(/-/g, "").length < 8) { setStatus("Code must be at least 8 characters."); return; }
        TV.cloud.link(code);

      } else if (act === "sync") {
        TV.cloud.pull({ force: true });

      } else if (act === "unlink") {
        TV.cloud.unlink();
        codeInput.value = "";
      }
    });

    if (TV.cloud && TV.cloud.onStatus) TV.cloud.onStatus(setStatus);
    if (TV.cloud && TV.cloud.onSync) TV.cloud.onSync(refreshLast);
  }

  // Insert the section into the backup modal (before the footer), once.
  function ensureSection() {
    var modal = document.getElementById("bk-modal");
    if (!modal) return;
    var box = modal.querySelector(".modal-box");
    if (!box || box.querySelector("#" + SECTION_ID)) { syncOnOpen(); return; }
    var sec = buildSection();
    var footer = box.querySelector(".bk-footer");
    if (footer) box.insertBefore(sec, footer);
    else box.appendChild(sec);
    wire(sec);
    syncOnOpen();
  }

  // Reflect current code + status whenever the dialog opens.
  function syncOnOpen() {
    if (!TV.cloud) return;
    if (codeInput) codeInput.value = TV.cloud.getCode() || "";
    setStatus(TV.cloud.status ? TV.cloud.status() : "");
    refreshLast();
  }

  /* ── wrap TV._openBackup so the section appears on open ────── */
  function install() {
    var orig = TV._openBackup;
    if (typeof orig !== "function") return false;
    if (orig.__csWrapped) return true;
    var wrapped = function () {
      var r = orig.apply(this, arguments);
      // Modal is built synchronously inside open(); inject right after.
      ensureSection();
      return r;
    };
    wrapped.__csWrapped = true;
    TV._openBackup = wrapped;
    return true;
  }

  // backup.js may load before or after us; retry briefly until _openBackup exists.
  if (!install()) {
    var tries = 0;
    var t = setInterval(function () {
      if (install() || ++tries > 40) clearInterval(t);  // ~4s max
    }, 100);
  }
})();
