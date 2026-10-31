/* ============================================================
   interview-edits.js — in-place editable interview Q&A, synced across devices.

   Click "Edit" in a card header and the QUESTION and the formatted ANSWER
   become editable right where they're shown (contentEditable — WYSIWYG, no raw
   markup). Save stores the edited HTML per format under the synced "iv:" prefix
   (iv:iedit-<fmt>), so js/features/cloudsync.js carries edits across devices
   automatically, and an edit made on another device re-applies live on the next
   cloud refresh.

   Works for all three interview modules (Iceberg / Delta / Hudi). Each calls
       TV.interviewEdits.enhance(container, cfg)
   once at the end of render(). Additive: no module logic, router or animation
   is changed, and it no-ops if anything is missing.

   cfg = {
     prefix:'int'|'dint'|'hint', fmt:'iceberg'|'delta'|'hudi',
     QA:<array>, answerField:'answer'|'a', formatAnswer:function(raw){...}
   }

   Note on trust: edits are your own content, rendered as HTML you authored,
   gated behind your private sync code and shared only with your own devices.
   ============================================================ */
(function () {
  "use strict";

  var TV = (window.TableViz = window.TableViz || window.IcebergViz || {});
  window.IcebergViz = window.IcebergViz || TV;

  var active = [];
  var cloudHooked = false;

  /* ── store (per format), under the synced iv: prefix ──────── */
  function storeKey(fmt) { return "iv:iedit-" + fmt; }
  function loadStore(fmt) {
    try { return JSON.parse(localStorage.getItem(storeKey(fmt)) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function saveStore(fmt, obj) {
    try {
      if (!Object.keys(obj).length) localStorage.removeItem(storeKey(fmt));
      else localStorage.setItem(storeKey(fmt), JSON.stringify(obj));
    } catch (e) { /* private mode — edit just won't persist */ }
  }

  /* ── one-time scoped styles ──────────────────────────────── */
  function injectStyle() {
    if (document.getElementById("ie-style")) return;
    var st = document.createElement("style");
    st.id = "ie-style";
    st.textContent = [
      ".ie-hdr-tools{flex:none;display:inline-flex;gap:6px;align-items:flex-start;margin-left:10px;}",
      ".ie-btn{cursor:pointer;border-radius:7px;border:1px solid var(--border-default,rgba(127,127,127,.3));",
      "  background:var(--bg-3,rgba(127,127,127,.08));color:var(--text-secondary,#8b949e);",
      "  font:600 11px/1 inherit;padding:5px 9px;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;}",
      ".ie-btn:hover{color:var(--text-primary,inherit);border-color:var(--brand,#3fb950);}",
      ".ie-btn-primary{background:var(--blue,#1f6feb);border-color:transparent;color:#fff;}",
      ".ie-btn-primary:hover{filter:brightness(1.08);color:#fff;}",
      ".ie-btn-danger{color:#ff8a8a;border-color:rgba(255,138,138,.4);background:transparent;}",
      ".ie-btn-danger:hover{background:rgba(255,138,138,.12);}",
      ".ie-badge{display:inline-block;margin-left:8px;font-size:10px;font-weight:700;text-transform:uppercase;",
      "  letter-spacing:.05em;color:var(--blue,#1f6feb);border:1px solid currentColor;border-radius:999px;",
      "  padding:1px 7px;vertical-align:middle;opacity:.9;}",
      /* the editable regions while editing */
      ".ie-editing [contenteditable=\"true\"]{outline:none;border:1px solid var(--blue,#1f6feb);",
      "  border-radius:8px;padding:8px 10px;background:var(--bg-2,rgba(127,127,127,.06));",
      "  box-shadow:0 0 0 3px rgba(31,111,235,.12);cursor:text;}",
      ".ie-editing [contenteditable=\"true\"]:focus{border-color:var(--blue,#1f6feb);}",
      ".ie-edit-tip{font-size:11px;color:var(--text-secondary,#8b949e);opacity:.85;margin:8px 0 0;}",
      ".ie-edit-tip code{font-family:var(--font-mono,ui-monospace,Menlo,monospace);}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(st);
  }

  function svgEdit() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'width="13" height="13" aria-hidden="true">' +
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>';
  }
  function fmtAnswer(cfg, raw) {
    try { return cfg.formatAnswer(String(raw == null ? "" : raw)); }
    catch (e) { return String(raw == null ? "" : raw); }
  }
  function origQHtml(cfg, idx) { return String(cfg.QA[idx].q == null ? "" : cfg.QA[idx].q); }
  function origAHtml(cfg, idx) { return fmtAnswer(cfg, cfg.QA[idx][cfg.answerField]); }
  function origCHtml(cfg, idx) { return String(cfg.QA[idx].code == null ? "" : cfg.QA[idx].code); }

  /* ── badge + header tools ────────────────────────────────── */
  function ensureBadge(card, cfg, on) {
    var qMain = card.querySelector("." + cfg.prefix + "-q-main");
    if (!qMain) return;
    var qText = qMain.querySelector("." + cfg.prefix + "-q-text");
    var badge = qMain.querySelector(".ie-badge");
    if (on) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "ie-badge";
        badge.textContent = "edited";
        if (qText && qText.nextSibling) qMain.insertBefore(badge, qText.nextSibling);
        else qMain.appendChild(badge);
      }
    } else if (badge && badge.parentNode) {
      badge.parentNode.removeChild(badge);
    }
  }

  function renderTools(card, cfg) {
    var tools = card.__ieTools;
    if (!tools) return;
    var editing = !!card.__ieEditing;
    var hasOv = !!loadStore(cfg.fmt)[parseInt(card.getAttribute("data-idx"), 10)];
    if (editing) {
      tools.innerHTML =
        '<button type="button" class="ie-btn ie-btn-primary" data-ie="save">Save</button>' +
        '<button type="button" class="ie-btn" data-ie="cancel">Cancel</button>' +
        (hasOv ? '<button type="button" class="ie-btn ie-btn-danger" data-ie="reset">Reset</button>' : '');
    } else {
      tools.innerHTML = '<button type="button" class="ie-btn" data-ie="edit">' + svgEdit() + "Edit</button>";
    }
  }

  function ensureTools(card, cfg) {
    if (card.__ieTools) { renderTools(card, cfg); return; }
    var qRow = card.querySelector("." + cfg.prefix + "-q-row");
    if (!qRow) return;
    var tools = document.createElement("div");
    tools.className = "ie-hdr-tools";
    card.__ieTools = tools;
    tools.addEventListener("click", function (e) {
      e.stopPropagation();                      // never toggle the card
      var btn = e.target.closest ? e.target.closest("[data-ie]") : null;
      if (!btn) return;
      var act = btn.getAttribute("data-ie");
      if (act === "edit") startEdit(card, cfg);
      else if (act === "save") saveEdit(card, cfg);
      else if (act === "cancel") cancelEdit(card, cfg);
      else if (act === "reset") resetEdit(card, cfg);
    });
    var chev = qRow.querySelector("." + cfg.prefix + "-q-chevron");
    if (chev) qRow.insertBefore(tools, chev); else qRow.appendChild(tools);
    renderTools(card, cfg);
  }

  // Stop editable clicks/keys from toggling the card or firing app shortcuts.
  function ensureGuards(card, cfg, els) {
    els.forEach(function (el) {
      if (!el || el.__ieGuarded) return;
      el.__ieGuarded = true;
      el.addEventListener("click", function (e) { if (card.__ieEditing) e.stopPropagation(); });
      el.addEventListener("keydown", function (e) {
        if (!card.__ieEditing) return;
        e.stopPropagation();
        if (e.key === "Escape") { cancelEdit(card, cfg); }
        else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { saveEdit(card, cfg); }
      });
    });
  }

  /* ── apply overrides + wire a card ───────────────────────── */
  function applyCard(card, cfg) {
    var idx = parseInt(card.getAttribute("data-idx"), 10);
    if (isNaN(idx) || !cfg.QA[idx]) return;
    var ov = loadStore(cfg.fmt)[idx];
    var qEl = card.querySelector("." + cfg.prefix + "-q-text");
    var aEl = card.querySelector("." + cfg.prefix + "-answer-text");
    var cEl = card.querySelector("." + cfg.prefix + "-answer-code");  // may be absent

    if (!card.__ieEditing) {       // don't clobber an in-progress edit
      if (qEl) qEl.innerHTML = (ov && ov.qHtml != null) ? ov.qHtml : origQHtml(cfg, idx);
      if (aEl) aEl.innerHTML = (ov && ov.aHtml != null) ? ov.aHtml : origAHtml(cfg, idx);
      if (cEl) cEl.innerHTML = (ov && ov.cHtml != null) ? ov.cHtml : origCHtml(cfg, idx);
    }
    ensureBadge(card, cfg, !!ov);
    ensureTools(card, cfg);
    ensureGuards(card, cfg, [qEl, aEl, cEl]);
  }

  function applyAll(container, cfg) {
    var cards = container.querySelectorAll("." + cfg.prefix + "-card[data-idx]");
    for (var i = 0; i < cards.length; i++) applyCard(cards[i], cfg);
  }

  /* ── edit lifecycle (in place) ───────────────────────────── */
  function startEdit(card, cfg) {
    card.classList.add("revealed");                 // answer must be visible
    card.classList.add("ie-editing");
    card.__ieEditing = true;
    var qEl = card.querySelector("." + cfg.prefix + "-q-text");
    var aEl = card.querySelector("." + cfg.prefix + "-answer-text");
    var cEl = card.querySelector("." + cfg.prefix + "-answer-code");
    if (qEl) qEl.setAttribute("contenteditable", "true");
    if (aEl) aEl.setAttribute("contenteditable", "true");
    if (cEl) cEl.setAttribute("contenteditable", "true");

    // A small formatting hint under the answer (removed on exit).
    var ansBlock = card.querySelector("." + cfg.prefix + "-answer");
    if (ansBlock && !ansBlock.querySelector(".ie-edit-tip")) {
      var tip = document.createElement("p");
      tip.className = "ie-edit-tip";
      tip.innerHTML = "Editing in place — type to change the text. <b>Ctrl/Cmd+B</b> bolds a selection · " +
        "<b>Ctrl/Cmd+Enter</b> saves · <b>Esc</b> cancels.";
      ansBlock.appendChild(tip);
    }
    renderTools(card, cfg);
    if (aEl && aEl.focus) aEl.focus();
  }

  function endEdit(card, cfg) {
    card.__ieEditing = false;
    card.classList.remove("ie-editing");
    var qEl = card.querySelector("." + cfg.prefix + "-q-text");
    var aEl = card.querySelector("." + cfg.prefix + "-answer-text");
    var cEl = card.querySelector("." + cfg.prefix + "-answer-code");
    if (qEl) qEl.removeAttribute("contenteditable");
    if (aEl) aEl.removeAttribute("contenteditable");
    if (cEl) cEl.removeAttribute("contenteditable");
    var ansBlock = card.querySelector("." + cfg.prefix + "-answer");
    var tip = ansBlock && ansBlock.querySelector(".ie-edit-tip");
    if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
  }

  function saveEdit(card, cfg) {
    var idx = parseInt(card.getAttribute("data-idx"), 10);
    if (isNaN(idx) || !cfg.QA[idx]) return;
    var qEl = card.querySelector("." + cfg.prefix + "-q-text");
    var aEl = card.querySelector("." + cfg.prefix + "-answer-text");
    var cEl = card.querySelector("." + cfg.prefix + "-answer-code");
    var qHtml = qEl ? qEl.innerHTML.trim() : "";
    var aHtml = aEl ? aEl.innerHTML.trim() : "";
    var hasCode = !!cEl;
    var cHtml = hasCode ? cEl.innerHTML.trim() : null;
    var store = loadStore(cfg.fmt);
    // If everything matches the original render, drop the override (back to default).
    var same = qHtml === origQHtml(cfg, idx).trim() &&
               aHtml === origAHtml(cfg, idx).trim() &&
               (!hasCode || cHtml === origCHtml(cfg, idx).trim());
    if (same) delete store[idx];
    else {
      var entry = { qHtml: qHtml, aHtml: aHtml };
      if (hasCode) entry.cHtml = cHtml;
      store[idx] = entry;
    }
    saveStore(cfg.fmt, store);                        // -> cloudsync pushes
    endEdit(card, cfg);
    applyCard(card, cfg);
  }

  function cancelEdit(card, cfg) {
    endEdit(card, cfg);
    applyCard(card, cfg);                             // restore stored/original
  }

  function resetEdit(card, cfg) {
    var idx = parseInt(card.getAttribute("data-idx"), 10);
    var store = loadStore(cfg.fmt);
    delete store[idx];
    saveStore(cfg.fmt, store);
    endEdit(card, cfg);
    applyCard(card, cfg);
  }

  /* ── public: called once per render by each interview module ─ */
  TV.interviewEdits = {
    enhance: function (container, cfg) {
      if (!container || !cfg || !cfg.prefix || !cfg.fmt || !cfg.QA || !cfg.formatAnswer) return;
      cfg.answerField = cfg.answerField || "a";
      injectStyle();

      var run = function () { applyAll(container, cfg); };
      run();

      var body = container.querySelector("#" + cfg.prefix + "-body") || container;
      if (body && !body.__ieObserved && window.MutationObserver) {
        body.__ieObserved = true;
        new MutationObserver(function (muts) {
          for (var i = 0; i < muts.length; i++) {
            if (muts[i].type === "childList" && muts[i].addedNodes.length) { run(); return; }
          }
        }).observe(body, { childList: true });
      }

      active = active.filter(function (a) { return a.container && document.contains(a.container); });
      active.push({ container: container, applyAll: run });

      if (!cloudHooked) {
        cloudHooked = true;
        window.addEventListener("tableviz:cloud-refresh", function () {
          for (var i = 0; i < active.length; i++) {
            try { if (document.contains(active[i].container)) active[i].applyAll(); } catch (e) {}
          }
        });
      }
    }
  };
})();
