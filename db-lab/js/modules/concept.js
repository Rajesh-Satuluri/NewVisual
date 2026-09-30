/* ============================================================
   concept.js — Universal Concept Workspace
   Route: #concept/<slug>

   Two render paths:
   • DEEP DIVE (airflow-grade): when DBLab.deepDives[slug] exists,
     tabs are filled from the authored deep-dive — a 7-facet
     narration panel beside a crisp animated visualization, a code
     viewer, reference table, gotchas, Quick Check, interview Q&A,
     and a persistent ShopKart business lens. This is the template
     every concept is being authored up to.
   • GENERIC: otherwise, the lightweight data-driven workspace that
     embeds the existing Canvas simulation via the sim-bridge.

   Re-renders on hashchange (router keeps the same base route).
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});

  function slugFromHash() {
    var raw = (location.hash || "").replace(/^#/, "").trim();
    return raw.split("/")[1] || null;
  }
  function wantsSim() {
    var raw = (location.hash || "").replace(/^#/, "").trim();
    var p = raw.split("/")[2];
    return p === "sim" || p === "play";
  }
  function wantsPlay() {
    var raw = (location.hash || "").replace(/^#/, "").trim();
    return raw.split("/")[2] === "play";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function conceptLink(c) {
    return '<a class="chip" href="#concept/' + c.slug + '">' +
      '<span class="chip-icon">' + (c.icon || "•") + "</span>" + esc(c.title) + "</a>";
  }
  function section(title, body) {
    if (!body) return "";
    return '<div class="ws-section"><h3 class="ws-h">' + esc(title) + "</h3>" +
      '<div class="ws-text">' + body + "</div></div>";
  }
  function emptyNote(msg) {
    return '<div class="ws-empty">' + esc(msg) + "</div>";
  }

  var Module = {
    id: "concept",
    title: "Concept",
    fullWidth: false,
    _teardownSim: null,
    _engine: null,
    _controls: null,
    _viz: null,
    _off: null,
    _onHash: null,

    render: function (container) {
      var self = this;
      this._container = container;
      this._draw(container);
      this._onHash = function () {
        if ((location.hash || "").indexOf("#concept/") === 0) self._draw(container);
      };
      window.addEventListener("hashchange", this._onHash);
    },

    destroy: function () {
      this._teardownAll();
      if (this._onHash) { window.removeEventListener("hashchange", this._onHash); this._onHash = null; }
    },

    _teardownAll: function () {
      if (this._off) { try { this._off(); } catch (e) {} this._off = null; }
      if (this._controls) { try { this._controls.destroy(); } catch (e) {} this._controls = null; }
      if (this._engine) { try { this._engine.destroy(); } catch (e) {} this._engine = null; }
      if (this._viz) { try { this._viz.destroy(); } catch (e) {} this._viz = null; }
      if (this._teardownSim) { try { this._teardownSim(); } catch (e) {} this._teardownSim = null; }
    },

    _draw: function (container) {
      this._teardownAll();

      var slug = slugFromHash();
      var c = slug && DL.conceptBySlug ? DL.conceptBySlug[slug] : null;

      if (!c) {
        container.innerHTML =
          '<div class="placeholder"><div class="placeholder-icon">🔍</div>' +
          "<div>Concept not found.</div>" +
          '<a class="btn btn-secondary" href="#learn">Browse all concepts</a></div>';
        return;
      }

      if (DL.Progress) DL.Progress.markViewed(c.id);

      var dd = DL.deepDives ? DL.deepDives[slug] : null;
      if (dd) this._drawDeepDive(container, c, dd);
      else this._drawGeneric(container, c);
    },

    /* ── DEEP DIVE (airflow-grade) ───────────────────────────── */
    _drawDeepDive: function (container, c, dd) {
      var self = this;
      var prereq = (c.prerequisites || []).map(function (id) { return DL.conceptById[id]; }).filter(Boolean);
      var related = (c.related || []).map(function (id) { return DL.conceptById[id]; }).filter(Boolean);
      var next = related[0] || null;

      var tabs = [
        { id: "overview", label: "Overview" },
        { id: "internals", label: "Internals" },
        { id: "simulate", label: "▶ Simulate" },
        { id: "engineering", label: "Engineering" },
        { id: "failure", label: "Failure & Tradeoffs" },
        { id: "interview", label: "Interview" },
        { id: "related", label: "Related" }
      ];

      var html = "";
      html += '<div class="module-header animate-fade-in-up">' +
        '<div class="module-eyebrow">' + esc(c.domain) + "</div>" +
        '<h1 class="module-title gradient-text">' + (c.icon || "") + " " + esc(c.title) + "</h1>" +
        '<p class="module-subtitle">' + (dd.overview && dd.overview.what ? dd.overview.what : esc(c.why || "")) + "</p>" +
        '<span class="ws-authored-badge">✍️ Authored deep dive</span>' +
        "</div>";

      html += '<div class="ws-tabs" role="tablist">';
      tabs.forEach(function (t, i) {
        html += '<button class="ws-tab' + (i === 0 ? " active" : "") + '" data-tab="' + t.id + '" role="tab">' + t.label + "</button>";
      });
      html += "</div>";

      html += '<div class="ws-body">';

      // Overview
      html += '<section class="ws-panel active" data-panel="overview">' +
        section("Why it exists", dd.overview && dd.overview.why) +
        section("The intuition", dd.overview && dd.overview.what) +
        section("How it works", dd.overview && dd.overview.how) +
        '<div class="callout tip"><span class="callout-icon">🔬</span><div class="callout-body">' +
        "Open the <b>▶ Simulate</b> tab to watch this happen step-by-step with a live reader and writer." +
        "</div></div>" +
        '<div id="ws-quickcheck"></div>' +
        "</section>";

      // Internals
      html += '<section class="ws-panel" data-panel="internals">' +
        (dd.internals || "") +
        '<div id="ws-code"></div>';
      if (dd.reference && dd.reference.length) {
        html += '<h3 class="section-title" style="margin-top:var(--space-6)">Reference</h3>' +
          '<div class="table-wrap"><table class="cmp-table"><thead><tr><th>Term</th><th>Meaning</th></tr></thead><tbody>' +
          dd.reference.map(function (r) {
            return "<tr><td class='cmp-dim'><code>" + esc(r[0]) + "</code></td><td>" + r[1] + "</td></tr>";
          }).join("") + "</tbody></table></div>";
      }
      html += "</section>";

      // Simulate — the star
      html += '<section class="ws-panel" data-panel="simulate">' +
        '<div class="arch-layout">' +
          '<div class="arch-canvas"><div id="ws-viz-host"></div></div>' +
          '<aside class="arch-detail" id="ws-viz-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="ws-viz-controls"></div>' +
        "</section>";

      // Engineering
      html += '<section class="ws-panel" data-panel="engineering">' +
        (dd.engineering || "");
      (dd.gotchas || []).forEach(function (g) {
        var k = g.kind === "warn" ? "warn" : (g.kind === "info" ? "info" : "tip");
        var icon = k === "warn" ? "⚠️" : (k === "info" ? "ℹ️" : "💡");
        html += '<div class="callout ' + k + '"><span class="callout-icon">' + icon + '</span><div class="callout-body">' + g.html + "</div></div>";
      });
      html += "</section>";

      // Failure & tradeoffs
      html += '<section class="ws-panel" data-panel="failure">' +
        (dd.failureModes || emptyNote("Failure modes are being authored.")) +
        "</section>";

      // Interview
      html += '<section class="ws-panel" data-panel="interview">';
      if (dd.interviewQs && dd.interviewQs.length) {
        dd.interviewQs.forEach(function (q, i) {
          html += '<div class="iq"><div class="iq-q">Q' + (i + 1) + ". " + esc(q.q) + "</div>" +
            '<div class="iq-a">' + q.a + "</div>" +
            (q.tip ? '<div class="callout tip" style="margin-top:8px"><span class="callout-icon">🎤</span><div class="callout-body">' + q.tip + "</div></div>" : "") +
            "</div>";
        });
      } else {
        html += emptyNote("Interview questions are being authored.");
      }
      html += "</section>";

      // Related
      html += '<section class="ws-panel" data-panel="related">';
      if (prereq.length) html += '<div class="rel-group"><div class="rel-label">Prerequisites</div><div class="chip-row">' + prereq.map(conceptLink).join("") + "</div></div>";
      if (related.length) html += '<div class="rel-group"><div class="rel-label">Related concepts</div><div class="chip-row">' + related.map(conceptLink).join("") + "</div></div>";
      if (!prereq.length && !related.length) html += emptyNote("Concept graph links are being mapped.");
      html += "</section>";

      html += "</div>"; // ws-body

      // Persistent ShopKart business lens (always visible, like airflow)
      if (dd.businessLens) {
        var b = dd.businessLens;
        html += '<section class="section lens-section"><div class="lens-card">' +
          '<div class="lens-head"><span class="lens-badge">🛒 Real business example</span>' +
          '<span class="lens-head-title">How this shows up at ShopKart</span></div>' +
          '<div class="lens-grid"><div class="lens-meta">' +
            '<div class="lens-row"><span class="lens-k">Where</span><span class="lens-v">' + b.task + "</span></div>" +
            '<div class="lens-row"><span class="lens-k">Business meaning</span><span class="lens-v">' + b.meaning + "</span></div>" +
            '<div class="lens-row"><span class="lens-k">System</span><span class="lens-v">' + b.system + "</span></div>" +
          "</div><div class=\"lens-point\"><p>" + b.point + "</p></div></div></div></section>";
      }

      // Footer
      html += '<div class="ws-footer">';
      html += '<a class="btn btn-secondary" href="#learn">← All concepts</a>';
      if (next) html += '<a class="btn btn-primary" href="#concept/' + next.slug + '">Next: ' + esc(next.title) + " →</a>";
      html += "</div>";

      container.innerHTML = html;

      // Code viewer
      if (dd.code && DL.CodeViewer) {
        var codeHost = container.querySelector("#ws-code");
        if (codeHost) codeHost.appendChild(DL.CodeViewer.create(dd.code));
      }

      // Quick check
      if (dd.quickCheck && DL.TestYourself) {
        var qcHost = container.querySelector("#ws-quickcheck");
        var qc = DL.TestYourself.create(dd.quickCheck, c.id);
        if (qcHost && qc) qcHost.appendChild(qc);
      }

      // ── Build the animated Simulate experience ──
      var vizHost = container.querySelector("#ws-viz-host");
      var detail = container.querySelector("#ws-viz-detail");
      if (vizHost && detail && dd.buildViz && dd.steps && DL.AnimationEngine) {
        this._viz = dd.buildViz(vizHost);
        var engine = new DL.AnimationEngine({
          steps: dd.steps.map(function (s) { return { label: s.label, duration: 3400 }; }),
          speed: 1
        });
        this._engine = engine;

        function showStep(idx) {
          if (idx < 0) {
            self._viz.update(-1, null);
            detail.innerHTML =
              '<div class="arch-detail-title">Two transactions, one row</div>' +
              "<p>Press <b>Play</b> to run a reader and a writer against the same ShopKart product row and watch why neither one waits for the other.</p>" +
              '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">⚡</span>' +
              '<div class="callout-body">Use <kbd>Space</kbd> to play, <kbd>←</kbd>/<kbd>→</kbd> to step.</div></div>';
            return;
          }
          var step = dd.steps[idx];
          self._viz.update(idx, step);
          detail.innerHTML = DL.Explain ? DL.Explain.render(step) : ("<p>" + (step.what || "") + "</p>");
        }

        this._off = engine.on("stepchange", function (idx) { showStep(idx); });
        if (DL.AnimationControls) {
          this._controls = DL.AnimationControls.create(engine, { title: "Ready — press play" });
          var ctrlHost = container.querySelector("#ws-viz-controls");
          if (ctrlHost) ctrlHost.appendChild(this._controls.el);
        }
        showStep(-1);
        if (wantsPlay()) { try { engine.play(); } catch (e) {} }
      }

      this._wireTabs(container, function (id) {
        // deep dive builds the viz eagerly; nothing lazy needed
      });
    },

    /* ── GENERIC (data-driven, embeds Canvas sim) ────────────── */
    _drawGeneric: function (container, c) {
      var self = this;
      var prereq = (c.prerequisites || []).map(function (id) { return DL.conceptById[id]; }).filter(Boolean);
      var related = (c.related || []).map(function (id) { return DL.conceptById[id]; }).filter(Boolean);
      var engApp = c.engineeringApp ? DL.conceptById[c.engineeringApp] : null;
      var next = related[0] || null;

      var tabs = [
        { id: "overview", label: "Overview" },
        { id: "internals", label: "Internals" },
        { id: "simulate", label: "▶ Simulate" },
        { id: "engineering", label: "Engineering" },
        { id: "failure", label: "Failure & Tradeoffs" },
        { id: "interview", label: "Interview" },
        { id: "related", label: "Related" }
      ];

      var html = "";
      html += '<div class="module-header animate-fade-in-up">' +
        '<div class="module-eyebrow">' + esc(c.domain) + "</div>" +
        '<h1 class="module-title gradient-text">' + (c.icon || "") + " " + esc(c.title) + "</h1>" +
        '<p class="module-subtitle">' + esc(c.why || "Explore the interactive simulation below to see this concept in action.") + "</p>" +
        "</div>";

      html += '<div class="ws-tabs" role="tablist">';
      tabs.forEach(function (t, i) {
        html += '<button class="ws-tab' + (i === 0 ? " active" : "") + '" data-tab="' + t.id + '" role="tab">' + t.label + "</button>";
      });
      html += "</div>";

      html += '<div class="ws-body">';
      html += '<section class="ws-panel active" data-panel="overview">' +
        section("Why it exists", c.why) +
        section("Intuition", c.intuition) +
        section("How it works", c.how || c.intuition) +
        '<div class="callout"><span class="callout-icon">✍️</span><div class="callout-body">' +
        "A full written walkthrough for this concept is on the roadmap — the interactive simulation in the <b>▶ Simulate</b> tab is fully live." +
        "</div></div>" +
        "</section>";
      html += '<section class="ws-panel" data-panel="internals">' +
        section("Inside the database", c.internals) +
        '<div class="callout tip"><span class="callout-icon">🔬</span><div class="callout-body">' +
        "Open the <b>Simulate</b> tab to watch these internals step-by-step.</div></div>" +
        "</section>";
      html += '<section class="ws-panel" data-panel="simulate">' +
        '<div id="ws-sim-host" class="ws-sim-host"></div>' +
        "</section>";
      html += '<section class="ws-panel" data-panel="engineering">' +
        section("Apply in engineering", c.engineering ||
          "When and why an engineer reaches for this — the practical decisions it drives.") +
        (engApp ? '<div class="callout"><span class="callout-icon">🏗️</span><div class="callout-body">' +
          "Applied concept: " + conceptLink(engApp) + "</div></div>" : "") +
        "</section>";
      html += '<section class="ws-panel" data-panel="failure">' +
        section("Failure modes & tradeoffs", c.failureModes) +
        '<div class="callout warn"><span class="callout-icon">💥</span><div class="callout-body">' +
        'See these break in the <a href="#failure-lab">Failure Lab</a>.</div></div>' +
        "</section>";
      html += '<section class="ws-panel" data-panel="interview">';
      if (c.interviewQs && c.interviewQs.length) {
        c.interviewQs.forEach(function (q, i) {
          html += '<div class="iq"><div class="iq-q">Q' + (i + 1) + ". " + esc(q.q) + "</div>" +
            '<div class="iq-a">' + q.a + "</div></div>";
        });
      } else {
        html += emptyNote("Interview questions for this concept are being authored. Try the Simulate tab.");
      }
      html += "</section>";
      html += '<section class="ws-panel" data-panel="related">';
      if (prereq.length) html += '<div class="rel-group"><div class="rel-label">Prerequisites</div><div class="chip-row">' + prereq.map(conceptLink).join("") + "</div></div>";
      if (related.length) html += '<div class="rel-group"><div class="rel-label">Related concepts</div><div class="chip-row">' + related.map(conceptLink).join("") + "</div></div>";
      if (!prereq.length && !related.length) html += emptyNote("Concept graph links are being mapped.");
      html += "</section>";
      html += "</div>"; // ws-body

      html += '<div class="ws-footer">';
      html += '<a class="btn btn-secondary" href="#learn">← All concepts</a>';
      if (next) html += '<a class="btn btn-primary" href="#concept/' + next.slug + '">Next: ' + esc(next.title) + " →</a>";
      html += "</div>";

      container.innerHTML = html;

      var simMounted = false;
      this._wireTabs(container, function (id) {
        if (id === "simulate" && !simMounted) {
          simMounted = true;
          var host = container.querySelector("#ws-sim-host");
          if (host && DL.SimBridge) self._teardownSim = DL.SimBridge.mount(host, c.simFile);
        }
      });
    },

    /* ── shared tab wiring ───────────────────────────────────── */
    _wireTabs: function (container, onActivate) {
      var tabBtns = container.querySelectorAll(".ws-tab");
      var panels = container.querySelectorAll(".ws-panel");
      function activate(id) {
        tabBtns.forEach(function (b) { b.classList.toggle("active", b.dataset.tab === id); });
        panels.forEach(function (p) { p.classList.toggle("active", p.dataset.panel === id); });
        if (onActivate) onActivate(id);
      }
      tabBtns.forEach(function (b) {
        b.addEventListener("click", function () { activate(b.dataset.tab); });
      });
      if (wantsSim()) activate("simulate");
      var canvas = document.getElementById("canvas");
      if (canvas) canvas.scrollTop = 0;
    }
  };

  DL.registerModule(Module);
})();
