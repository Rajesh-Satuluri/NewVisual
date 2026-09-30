/* ============================================================
   home.js — Dashboard
   Answers: where am I, what have I learned, what am I weak at,
   what should I study next.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function pct(x) { return Math.round(x * 100); }

  function card(cls, inner) { return '<div class="dash-card ' + (cls || "") + '">' + inner + "</div>"; }

  var Module = {
    id: "home",
    title: "Dashboard",
    fullWidth: false,

    render: function (container) {
      var P = DL.Progress;
      var concepts = DL.concepts || [];
      var overall = P ? P.overall() : { viewed: 0, total: concepts.length };

      var html = "";
      html += '<div class="module-header animate-fade-in-up">' +
        '<div class="module-eyebrow">Database Engineering &amp; Internals Lab</div>' +
        '<h1 class="module-title gradient-text">Your Learning Dashboard</h1>' +
        '<p class="module-subtitle">' + overall.viewed + " of " + overall.total +
        " concepts explored. Engineering + internals + simulation + failure debugging + interview prep — one lab.</p>" +
        "</div>";

      html += '<div class="dash-grid">';

      // Continue learning
      var last = P && P.last() ? DL.conceptById[P.last()] : null;
      var cont = last
        ? '<div class="dash-label">Continue learning</div>' +
          '<a class="dash-continue" href="#concept/' + last.slug + '">' +
          '<span class="dash-continue-icon">' + (last.icon || "▶") + "</span>" +
          '<span><b>' + esc(last.title) + "</b><br><span class=\"dash-sub\">" + esc(last.domain) + "</span></span>" +
          '<span class="dash-arrow">→</span></a>'
        : '<div class="dash-label">Start learning</div>' +
          '<a class="dash-continue" href="#master-map"><span class="dash-continue-icon">🗺️</span>' +
          "<span><b>Open the Master Map</b><br><span class=\"dash-sub\">Pick any concept to begin</span></span>" +
          '<span class="dash-arrow">→</span></a>';
      html += card("dash-wide", cont);

      // Learning progress by domain
      var domHtml = '<div class="dash-label">Learning progress</div><div class="dom-list">';
      (DL.domains || []).forEach(function (d) {
        var s = P ? P.domainStats(d) : { mastery: 0, viewed: 0, total: 1 };
        domHtml += '<a class="dom-row" href="#learn/' + encodeURIComponent(d) + '">' +
          '<span class="dom-name">' + esc(d) + "</span>" +
          '<span class="dom-bar"><span class="dom-fill" style="width:' + pct(s.mastery) + '%"></span></span>' +
          '<span class="dom-pct">' + pct(s.mastery) + "%</span></a>";
      });
      domHtml += "</div>";
      html += card("dash-wide", domHtml);

      // Weak areas
      var weak = P ? P.weakConcepts(5) : [];
      var weakHtml = '<div class="dash-label">Weak areas</div>';
      if (weak.length) {
        weakHtml += '<div class="chip-row">' + weak.map(function (w) {
          var c = DL.conceptById[w.id]; if (!c) return "";
          return '<a class="chip chip-warn" href="#concept/' + c.slug + '">' + (c.icon || "•") + " " + esc(c.title) +
            ' <span class="chip-score">' + pct(w.ratio) + "%</span></a>";
        }).join("") + "</div>";
      } else {
        weakHtml += '<div class="dash-empty">No weak areas yet — take a Quick Check inside any concept to start tracking.</div>';
      }
      html += card("", weakHtml);

      // Recommended challenge
      html += card("dash-accent",
        '<div class="dash-label">Recommended challenge</div>' +
        '<div class="dash-challenge"><div class="dash-challenge-q">Why is this query taking 8 seconds?</div>' +
        '<p class="dash-sub">Investigate a slow query end-to-end — plan, index, I/O — in the Query Performance Lab.</p>' +
        '<a class="btn btn-primary" href="#failure-lab">Investigate →</a></div>');

      // Today's practice
      var practice = pickPractice(concepts, P, 3);
      var pracHtml = '<div class="dash-label">Today’s practice</div><div class="dash-list">';
      practice.forEach(function (c) {
        pracHtml += '<a class="dash-item" href="#concept/' + c.slug + '"><span>' + (c.icon || "•") + " " + esc(c.title) +
          '</span><span class="dash-sub">' + esc(c.domain) + "</span></a>";
      });
      pracHtml += "</div>";
      html += card("", pracHtml);

      // Recently viewed
      var recent = P ? P.recent().map(function (id) { return DL.conceptById[id]; }).filter(Boolean).slice(0, 6) : [];
      var recHtml = '<div class="dash-label">Recently viewed</div>';
      if (recent.length) {
        recHtml += '<div class="chip-row">' + recent.map(function (c) {
          return '<a class="chip" href="#concept/' + c.slug + '">' + (c.icon || "•") + " " + esc(c.title) + "</a>";
        }).join("") + "</div>";
      } else {
        recHtml += '<div class="dash-empty">Nothing yet. Open the <a href="#master-map">Master Map</a> to begin.</div>';
      }
      html += card("dash-wide", recHtml);

      html += "</div>"; // dash-grid
      container.innerHTML = html;
    },
  };

  // Prefer unviewed foundational concepts first.
  function pickPractice(concepts, P, n) {
    var unviewed = concepts.filter(function (c) { return !P || !P.isViewed(c.id); });
    var pool = unviewed.length ? unviewed : concepts;
    return pool.slice(0, n);
  }

  DL.registerModule(Module);
})();
