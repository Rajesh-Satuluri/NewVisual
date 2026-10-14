/* modules/labs.js — Hands-on Lab hub.
   #labs           → grid of all labs (with solved status)
   #labs/<lab-id>  → that lab's workspace (via DECICDViz.Lab)
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  NS.registerModule({
    id: "labs",
    title: "Hands-on Labs",
    render: function (container) {
      var labs = NS.Labs || [];
      var param = (NS.routeParam || "").trim();

      // ── Detail view ──────────────────────────────────────
      if (param) {
        var cfg = labs.filter(function (l) { return l.id === param; })[0];
        if (cfg && NS.Lab) {
          this._lab = NS.Lab.build(cfg);
          this._lab.render(container);
          return;
        }
        container.innerHTML =
          '<div class="module-header"><div class="module-eyebrow">Lab not found</div>' +
          '<h1 class="module-title gradient-text">' + esc(param) + '</h1>' +
          '<p class="module-subtitle">No lab with that id. <a href="#labs">Back to all labs</a>.</p></div>';
        return;
      }

      // ── Grid view ────────────────────────────────────────
      var solvedCount = 0;
      var cards = labs.map(function (l) {
        var solved = NS.Progress && NS.Progress.all().labs[l.id] && NS.Progress.all().labs[l.id].solved;
        if (solved) solvedCount++;
        return '<a class="card card-hover lab-card' + (solved ? " solved" : "") + '" href="#labs/' + l.id + '">' +
          (solved ? '<span class="lab-card-badge">✓ Solved</span>' : '') +
          '<div class="lab-card-top">' +
            '<span class="lab-card-kind" style="color:var(' + (l.tool || "--brand") + ')">' + esc(l.kind) + '</span>' +
            '<span class="lab-card-diff">' + esc(l.difficulty || "") + '</span>' +
          '</div>' +
          '<div class="card-title">' + esc(l.title) + '</div>' +
          '<p>' + (l.scenario || "") + '</p>' +
          '<span class="lab-card-lang">' + esc(l.lang) + '</span>' +
        '</a>';
      }).join("");

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">🧪 Hands-on · RetailFlow</div>' +
          '<h1 class="module-title gradient-text">Hands-on Labs</h1>' +
          '<p class="module-subtitle">Fix a real broken config, run the checks, and see why it matters. ' +
            'Your code is never executed — labs use <b>static validation</b> and <b>deterministic simulated runs</b>, ' +
            'labelled on each card. Progress saves in this browser.</p>' +
          '<p class="lab-hub-progress">' + solvedCount + ' / ' + labs.length + ' labs solved</p>' +
        '</div>' +
        '<div class="card-grid stagger">' + cards + '</div>';
    },
    destroy: function () {
      if (this._lab && this._lab.destroy) { try { this._lab.destroy(); } catch (e) {} }
      this._lab = null;
    }
  });
})();
