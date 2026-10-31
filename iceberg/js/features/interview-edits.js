/* ============================================================
   interview-edits.js — editable interview Q&A, synced across devices.

   Lets you edit the QUESTION and ANSWER of any Interview Mode card
   (Iceberg / Delta / Hudi). Edits are stored per format in localStorage under
   the synced "iv:" prefix (iv:iedit-<fmt>), so js/features/cloudsync.js carries
   them across devices automatically, and an edit made on another device shows
   up live here on the next cloud refresh.

   Additive only: the three interview modules each call
       TV.interviewEdits.enhance(container, cfg)
   once at the end of render(). This feature then overlays an Edit control on
   each card, applies any stored overrides, and re-applies them after the filter
   rebuilds (via a MutationObserver) or after a cloud sync. It edits no module
   logic, router, or animation, and falls back silently if anything is missing.

   cfg = {
     prefix:       'int' | 'dint' | 'hint',   // the module's CSS class prefix
     fmt:          'iceberg' | 'delta' | 'hudi',
     QA:           <the module's question array>,
     answerField:  'answer' | 'a',            // which field holds the raw answer
     formatAnswer: function(raw){...}         // the module's answer formatter
   }

   Note on trust: an edited answer is rendered through the module's own
   formatAnswer (which emits the same light markup — <strong>, lists — the
   built-in answers use). Edits are your own content, gated behind your private
   sync code and only ever shared with your own devices; the question field is
   written as plain text.
   ============================================================ */
(function () {
  "use strict";

  var TV = (window.TableViz = window.TableViz || window.IcebergViz || {});
  window.IcebergViz = window.IcebergViz || TV;

  var active = [];          // [{ container, cfg, applyAll }] for cloud re-apply
  var cloudHooked = false;

  /* ── store (per format), under the synced iv: prefix ──────── */
  function storeKey(fmt) { return "iv:iedit-" + fmt; }
  function loadStore(fmt) {
    try { return JSON.parse(localStorage.getItem(storeKey(fmt)) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function saveStore(fmt, obj) {
    try {
      var keys = Object.keys(obj);
      if (!keys.length) localStorage.removeItem(storeKey(fmt));   // tidy when empty
      else localStorage.setItem(storeKey(fmt), JSON.stringify(obj));
    } catch (e) { /* private mode — edit just won't persist */ }
  }

  /* ── one-time scoped styles ──────────────────────────────── */
  function injectStyle() {
    if (document.getElementById("ie-style")) return;
    var st = document.createElement("style");
    st.id = "ie-style";
    st.textContent = [
      ".ie-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px;}",
      ".ie-edit-hdr{flex:none;cursor:pointer;display:inline-flex;align-items:center;gap:5px;margin-left:10px;",
      "  border:1px solid var(--border-default,rgba(127,127,127,.3));border-radius:7px;",
      "  background:var(--bg-3,rgba(127,127,127,.08));color:var(--text-secondary,#8b949e);",
      "  font:600 11px/1 inherit;padding:5px 9px;white-space:nowrap;align-self:flex-start;}",
      ".ie-edit-hdr:hover{color:var(--text-primary,inherit);border-color:var(--brand,#3fb950);}",
      ".ie-btn{cursor:pointer;border-radius:7px;border:1px solid var(--border-default,rgba(127,127,127,.3));",
      "  background:var(--bg-3,rgba(127,127,127,.08));color:var(--text-primary,inherit);",
      "  font:600 12px/1 inherit;padding:6px 10px;display:inline-flex;align-items:center;gap:5px;}",
      ".ie-btn:hover{border-color:var(--brand,#3fb950);}",
      ".ie-btn-primary{background:var(--blue,#1f6feb);border-color:transparent;color:#fff;}",
      ".ie-btn-primary:hover{filter:brightness(1.08);}",
      ".ie-btn-danger{color:#ff8a8a;border-color:rgba(255,138,138,.4);background:transparent;}",
      ".ie-btn-danger:hover{background:rgba(255,138,138,.12);}",
      ".ie-badge{display:inline-block;margin-left:8px;font-size:10px;font-weight:700;text-transform:uppercase;",
      "  letter-spacing:.05em;color:var(--blue,#1f6feb);border:1px solid currentColor;border-radius:999px;",
      "  padding:1px 7px;vertical-align:middle;opacity:.9;}",
      ".ie-editor{margin-top:12px;display:flex;flex-direction:column;gap:10px;",
      "  border-top:1px dashed var(--border-subtle,rgba(127,127,127,.3));padding-top:12px;}",
      ".ie-field{display:flex;flex-direction:column;gap:4px;}",
      ".ie-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;",
      "  color:var(--text-secondary,#8b949e);}",
      ".ie-area{width:100%;box-sizing:border-box;border-radius:8px;",
      "  border:1px solid var(--border-default,rgba(127,127,127,.3));",
      "  background:var(--bg-2,rgba(127,127,127,.06));color:var(--text-primary,inherit);",
      "  font:13px/1.6 inherit;padding:8px 10px;resize:vertical;}",
      ".ie-area:focus{outline:none;border-color:var(--blue,#1f6feb);}",
      ".ie-area-q{min-height:52px;}",
      ".ie-area-a{min-height:180px;font-family:inherit;}",
      ".ie-hint{font-size:11px;color:var(--text-secondary,#8b949e);opacity:.85;margin:0;}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(st);
  }

  function svgEdit() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'width="13" height="13" aria-hidden="true">' +
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>';
  }

  /* ── apply overrides + inject the Edit control on one card ── */
  function applyCard(card, cfg) {
    var idx = parseInt(card.getAttribute("data-idx"), 10);
    if (isNaN(idx) || !cfg.QA[idx]) return;
    var store = loadStore(cfg.fmt);
    var ov = store[idx];

    var qEl = card.querySelector("." + cfg.prefix + "-q-text");
    var aEl = card.querySelector("." + cfg.prefix + "-answer-text");
    var origQ = String(cfg.QA[idx].q == null ? "" : cfg.QA[idx].q);
    var origA = String(cfg.QA[idx][cfg.answerField] == null ? "" : cfg.QA[idx][cfg.answerField]);

    // Effective values (override or original) — always set, so a Reset restores.
    if (qEl) qEl.textContent = (ov && ov.q != null) ? ov.q : origQ;
    if (aEl) {
      var rawA = (ov && ov.a != null) ? ov.a : origA;
      try { aEl.innerHTML = cfg.formatAnswer(rawA); } catch (e) { aEl.textContent = rawA; }
    }

    // "Edited" badge next to the question.
    var qMain = card.querySelector("." + cfg.prefix + "-q-main");
    if (qMain) {
      var badge = qMain.querySelector(".ie-badge");
      if (ov) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "ie-badge";
          badge.textContent = "edited";
          var qText = qMain.querySelector("." + cfg.prefix + "-q-text");
          if (qText) qText.appendChild(badge); else qMain.appendChild(badge);
        }
      } else if (badge && badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
    }

    // Edit button in the card header (question row), next to the chevron.
    var qRow = card.querySelector("." + cfg.prefix + "-q-row");
    if (qRow && !qRow.querySelector(".ie-edit-hdr")) {
      var hbtn = document.createElement("button");
      hbtn.type = "button";
      hbtn.className = "ie-edit-hdr";
      hbtn.setAttribute("data-ie", "edit");
      hbtn.setAttribute("aria-label", "Edit this question and answer");
      hbtn.innerHTML = svgEdit() + "Edit";
      // Must not bubble to the card's reveal toggle; reveal + open directly.
      hbtn.addEventListener("click", function (e) {
        e.stopPropagation();
        card.classList.add("revealed");
        openEditor(card, cfg);
      });
      var chev = qRow.querySelector("." + cfg.prefix + "-q-chevron");
      if (chev) qRow.insertBefore(hbtn, chev); else qRow.appendChild(hbtn);
    }
  }

  function applyAll(container, cfg) {
    var cards = container.querySelectorAll("." + cfg.prefix + "-card[data-idx]");
    for (var i = 0; i < cards.length; i++) applyCard(cards[i], cfg);
  }

  /* ── inline editor ───────────────────────────────────────── */
  function openEditor(card, cfg) {
    var idx = parseInt(card.getAttribute("data-idx"), 10);
    if (isNaN(idx) || !cfg.QA[idx]) return;
    var ansBlock = card.querySelector("." + cfg.prefix + "-answer");
    if (!ansBlock || ansBlock.querySelector(".ie-editor")) return;  // already open

    var store = loadStore(cfg.fmt);
    var ov = store[idx];
    var origQ = String(cfg.QA[idx].q == null ? "" : cfg.QA[idx].q);
    var origA = String(cfg.QA[idx][cfg.answerField] == null ? "" : cfg.QA[idx][cfg.answerField]);
    var curQ = (ov && ov.q != null) ? ov.q : origQ;
    var curA = (ov && ov.a != null) ? ov.a : origA;

    var aText = ansBlock.querySelector("." + cfg.prefix + "-answer-text");
    if (aText) aText.style.display = "none";

    var ed = document.createElement("div");
    ed.className = "ie-editor";
    ed.innerHTML =
      '<div class="ie-field"><label class="ie-label">Question</label>' +
        '<textarea class="ie-area ie-area-q" spellcheck="true"></textarea></div>' +
      '<div class="ie-field"><label class="ie-label">Answer</label>' +
        '<textarea class="ie-area ie-area-a" spellcheck="true"></textarea>' +
        '<p class="ie-hint">Blank line = new paragraph · start a line with <code>1.</code> for a numbered list or <code>-</code> for a bullet · wrap a label in <code>&lt;strong&gt;…&lt;/strong&gt;</code>.</p></div>' +
      '<div class="ie-toolbar">' +
        '<button type="button" class="ie-btn ie-btn-primary" data-ie="save">Save</button>' +
        '<button type="button" class="ie-btn" data-ie="cancel">Cancel</button>' +
        (ov ? '<button type="button" class="ie-btn ie-btn-danger" data-ie="reset">Reset to original</button>' : '') +
      '</div>';

    // Prefill via value (so markup/newlines are literal, not parsed as HTML).
    ed.querySelector(".ie-area-q").value = curQ;
    ed.querySelector(".ie-area-a").value = curA;

    // Keep every interaction inside the editor from toggling the card.
    ed.addEventListener("click", function (e) { e.stopPropagation(); });
    ed.addEventListener("keydown", function (e) { e.stopPropagation(); });

    ed.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-ie]") : null;
      if (!btn) return;
      var act = btn.getAttribute("data-ie");
      if (act === "save") {
        var q = ed.querySelector(".ie-area-q").value;
        var a = ed.querySelector(".ie-area-a").value;
        var s = loadStore(cfg.fmt);
        if (q === origQ && a === origA) delete s[idx];          // back to default
        else s[idx] = { q: q, a: a };
        saveStore(cfg.fmt, s);                                  // -> cloudsync pushes
        closeEditor(card, cfg);
        applyCard(card, cfg);
      } else if (act === "cancel") {
        closeEditor(card, cfg);
      } else if (act === "reset") {
        var s2 = loadStore(cfg.fmt);
        delete s2[idx];
        saveStore(cfg.fmt, s2);
        closeEditor(card, cfg);
        applyCard(card, cfg);
      }
    });

    ansBlock.appendChild(ed);
    var qa = ed.querySelector(".ie-area-q");
    if (qa) qa.focus();
  }

  function closeEditor(card, cfg) {
    var ansBlock = card.querySelector("." + cfg.prefix + "-answer");
    if (!ansBlock) return;
    var ed = ansBlock.querySelector(".ie-editor");
    if (ed && ed.parentNode) ed.parentNode.removeChild(ed);
    var aText = ansBlock.querySelector("." + cfg.prefix + "-answer-text");
    if (aText) aText.style.display = "";
  }

  /* ── public: called once per render by each interview module ─ */
  TV.interviewEdits = {
    enhance: function (container, cfg) {
      if (!container || !cfg || !cfg.prefix || !cfg.fmt || !cfg.QA || !cfg.formatAnswer) return;
      cfg.answerField = cfg.answerField || "a";
      injectStyle();

      var run = function () { applyAll(container, cfg); };
      run();

      // Re-apply after the filter rebuilds the list (innerHTML swap on the body).
      var body = container.querySelector("#" + cfg.prefix + "-body") || container;
      if (body && !body.__ieObserved && window.MutationObserver) {
        body.__ieObserved = true;
        var mo = new MutationObserver(function (muts) {
          for (var i = 0; i < muts.length; i++) {
            if (muts[i].type === "childList" && muts[i].addedNodes.length) { run(); return; }
          }
        });
        mo.observe(body, { childList: true });
      }

      // Track for cloud-refresh re-apply; prune dead containers.
      active = active.filter(function (a) { return a.container && a.container.isConnected !== false && document.contains(a.container); });
      active.push({ container: container, cfg: cfg, applyAll: run });

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
