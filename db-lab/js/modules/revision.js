/* ============================================================
   revision.js — Mastery & Revision (route #revision).
   Evidence-based mastery overview, a prerequisite-aware review queue,
   assessment history, and the verification ledger (sources). Reads real
   progress from DBLab.Progress — never fabricates mastery.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function byId(id) { var a = DL.concepts || []; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }

  function status(c) { return DL.Progress ? DL.Progress.conceptStatus(c.id) : "not-started"; }
  function meta(s) { return DL.Progress ? DL.Progress.statusMeta(s) : { label: s, cls: "" }; }

  // A concept is "ready" to study if all its prerequisites are at least practiced.
  function prereqsReady(c) {
    var pr = c.prerequisites || [];
    for (var i = 0; i < pr.length; i++) {
      var p = byId(pr[i]); if (!p) continue;
      if (status(p) === "not-started") return false;
    }
    return true;
  }

  function masteryHTML() {
    var domains = DL.domains || [];
    var concepts = DL.concepts || [];
    var rows = domains.map(function (d) {
      var list = concepts.filter(function (c) { return c.domain === d; });
      if (!list.length) return "";
      var counts = { "mastered": 0, "understood": 0, "practiced": 0, "needs-review": 0, "not-started": 0 };
      list.forEach(function (c) { counts[status(c)] = (counts[status(c)] || 0) + 1; });
      var total = list.length;
      var seg = ["mastered", "understood", "practiced", "needs-review", "not-started"].map(function (k) {
        var pct = (counts[k] / total * 100).toFixed(1);
        return counts[k] ? '<span class="rv-seg ' + meta(k).cls + '" style="width:' + pct + '%" title="' + counts[k] + " " + meta(k).label + '"></span>' : "";
      }).join("");
      var done = counts.mastered + counts.understood;
      return '<div class="rv-domain"><div class="rv-domain-h"><span>' + esc(d) + '</span><span class="rv-domain-n">' + done + "/" + total + " studied</span></div>" +
        '<div class="rv-bar">' + seg + "</div></div>";
    }).join("");
    return '<section class="rv-sec"><h3>Your mastery</h3><p class="rv-sub">Status is earned from views + knowledge-check accuracy — never from a click.</p>' + rows + "</section>";
  }

  function queueHTML() {
    var concepts = DL.concepts || [];
    // needs-review first, then practiced-but-not-mastered whose prereqs are ready
    var review = concepts.filter(function (c) { return status(c) === "needs-review"; });
    var next = concepts.filter(function (c) { return (status(c) === "practiced" || status(c) === "understood") && prereqsReady(c); });
    var newReady = concepts.filter(function (c) { return status(c) === "not-started" && prereqsReady(c) && (c.prerequisites || []).length; });

    function card(c, tag, tagcls) {
      var m = meta(status(c));
      return '<a class="rv-card" href="#concept/' + c.slug + '"><span class="rv-card-tag ' + tagcls + '">' + tag + "</span>" +
        '<span class="rv-card-title">' + (c.icon || "") + " " + esc(c.title) + "</span>" +
        '<span class="status-chip ' + m.cls + '">' + esc(m.label) + "</span></a>";
    }
    var items = review.slice(0, 6).map(function (c) { return card(c, "review", "t-review"); })
      .concat(next.slice(0, 6).map(function (c) { return card(c, "reinforce", "t-next"); }))
      .concat(newReady.slice(0, 4).map(function (c) { return card(c, "ready", "t-new"); })).join("");
    if (!items) items = '<p class="rv-empty">Study a few concepts and take their knowledge checks — your review queue will build from how you actually do.</p>';
    return '<section class="rv-sec"><h3>Review queue <span class="rv-hint">prerequisite-aware</span></h3><div class="rv-queue">' + items + "</div></section>";
  }

  function historyHTML() {
    var concepts = DL.concepts || [];
    var hist = [];
    concepts.forEach(function (c) {
      var q = DL.Progress && DL.Progress.quizFor(c.id);
      if (q && q.total) hist.push({ c: c, q: q });
    });
    hist.sort(function (a, b) { return b.q.at - a.q.at; });
    if (!hist.length) return '<section class="rv-sec"><h3>Assessment history</h3><p class="rv-empty">No knowledge checks taken yet. Open a concept’s Test-Yourself to start building a record.</p></section>';
    var rows = hist.slice(0, 12).map(function (h) {
      var pct = Math.round(h.q.correct / h.q.total * 100);
      return '<div class="rv-hrow"><a href="#concept/' + h.c.slug + '">' + esc(h.c.title) + "</a>" +
        '<span class="rv-score ' + (pct >= 85 ? "good" : pct >= 60 ? "ok" : "low") + '">' + h.q.correct + "/" + h.q.total + " · " + pct + "%</span></div>";
    }).join("");
    return '<section class="rv-sec"><h3>Assessment history</h3><div class="rv-hist">' + rows + "</div></section>";
  }

  function sourcesHTML() {
    var sources = DL.sources || [];
    if (!sources.length) return "";
    var rows = sources.map(function (s) {
      return '<tr><td class="rv-claim">' + esc(s.claim) + '</td><td class="rv-eng">' + esc(s.engine) + (s.version && s.version !== "—" ? " " + esc(s.version) : "") +
        '<span class="rv-scope rv-' + s.scope + '">' + esc(s.scope) + "</span></td>" +
        '<td><a href="' + esc(s.url) + '" target="_blank" rel="noopener">source ↗</a><span class="rv-rev">rev ' + esc(s.reviewed) + "</span></td></tr>";
    }).join("");
    return '<section class="rv-sec"><h3>Sources &amp; verification</h3><p class="rv-sub">Every important technical claim is traceable to primary documentation, with the engine/version it applies to and when it was last checked.</p>' +
      '<div class="table-wrap"><table class="rv-sources"><thead><tr><th>Claim</th><th>Applies to</th><th>Reference</th></tr></thead><tbody>' + rows + "</tbody></table></div></section>";
  }

  DL.registerModule({
    id: "revision", title: "Revision", fullWidth: false,
    render: function (container) {
      var ov = DL.Progress ? DL.Progress.overall() : { viewed: 0, total: (DL.concepts || []).length };
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Mastery &amp; Revision</div>' +
        '<h1 class="module-title gradient-text">Mastery &amp; Revision</h1>' +
        '<p class="module-subtitle">' + ov.viewed + " of " + ov.total + " concepts opened. Your mastery, review queue and assessment history below are computed from real activity.</p></div>" +
        masteryHTML() + queueHTML() + historyHTML() + sourcesHTML();
      var c = document.getElementById("canvas"); if (c) c.scrollTop = 0;
    },
  });
})();
