/* modules/capstone.js — the RetailFlow capstone (Iteration 7)
   Renders the 14-milestone end-to-end project: reference repo
   structure, reproducible setup, and each milestone with acceptance
   criteria, linked lessons/labs, a reference snippet, and a local
   "mark done" (stored in Progress under cap-N ids). */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function titleOf(id) {
    var r = (NS.routes || {})[id];
    return (r && r.title) || id.replace(/-/g, " ");
  }
  function capId(n) { return "cap-" + n; }

  NS.registerModule({
    id: "capstone",
    title: "RetailFlow Capstone",
    render: function (container) {
      var C = NS.Capstone;
      if (!C) {
        container.innerHTML = '<div class="module-header"><h1 class="module-title gradient-text">Capstone</h1>' +
          '<p class="module-subtitle">Capstone data not loaded.</p></div>';
        return;
      }
      var repo = (NS.RetailFlow && NS.RetailFlow.repo) || { name: C.project, tree: [] };

      function doneCount() {
        var P = NS.Progress, n = 0;
        if (!P) return 0;
        C.milestones.forEach(function (m) { if (P.isComplete(capId(m.n))) n++; });
        return n;
      }

      function render() {
        var done = doneCount(), total = C.milestones.length;
        var pct = total ? Math.round((done / total) * 100) : 0;

        var tree = repo.tree.map(function (t) {
          return '<div class="cap-tree-row"><code class="cap-tree-path">' + esc(t.path) + "</code>" +
            '<span class="cap-tree-note">' + esc(t.note) + "</span></div>";
        }).join("");

        var setup = '<ol class="cap-setup">' + C.setup.map(function (s) {
          return "<li><code>" + esc(s) + "</code></li>";
        }).join("") + "</ol>";

        var milestones = C.milestones.map(function (m) {
          var isDone = NS.Progress && NS.Progress.isComplete(capId(m.n));
          var lessons = (m.lessons || []).map(function (id) {
            return '<a class="cap-chip" href="#' + esc(id) + '">' + esc(titleOf(id)) + "</a>";
          }).join("");
          var labs = (m.labs || []).map(function (id) {
            return '<a class="cap-chip cap-chip-lab" href="#labs/' + esc(id) + '">🧪 ' + esc(id) + "</a>";
          }).join("");
          var acc = '<ul class="cap-acc">' + (m.acceptance || []).map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul>";
          var snip = m.snippet ? '<div class="cap-snip"><div class="cap-snip-lang">' + esc(m.snippet.lang) +
            ' · reference</div><pre><code>' + esc(m.snippet.code) + "</code></pre></div>" : "";
          return '<details class="cap-ms' + (isDone ? " done" : "") + '" data-n="' + m.n + '">' +
            '<summary class="cap-ms-head">' +
              '<span class="cap-ms-n">' + (isDone ? "✓" : m.n) + "</span>" +
              '<span class="cap-ms-titles"><span class="cap-ms-title">' + esc(m.title) + "</span>" +
                '<span class="cap-ms-goal">' + esc(m.goal) + "</span></span>" +
            "</summary>" +
            '<div class="cap-ms-body">' +
              '<p class="cap-ms-builds"><b>You build:</b> ' + m.builds + "</p>" +
              '<div class="cap-ms-links">' +
                (lessons ? '<div class="cap-ms-linkrow"><span class="cap-ms-k">Lessons</span><span>' + lessons + "</span></div>" : "") +
                (labs ? '<div class="cap-ms-linkrow"><span class="cap-ms-k">Labs</span><span>' + labs + "</span></div>" : "") +
              "</div>" +
              '<div class="cap-ms-acc-h">Acceptance criteria</div>' + acc +
              snip +
              '<button type="button" class="btn btn-secondary btn-sm cap-done" data-n="' + m.n + '">' +
                (isDone ? "✓ Done — mark not done" : "Mark milestone done") + "</button>" +
            "</div>" +
          "</details>";
        }).join("");

        container.innerHTML =
          '<div class="module-header animate-fade-in-up">' +
            '<div class="module-eyebrow">🏷️ Capstone · RetailFlow</div>' +
            '<h1 class="module-title gradient-text">The RetailFlow Capstone</h1>' +
            '<p class="module-subtitle">One coherent project, fourteen milestones — carry a single revenue change from a broken formula ' +
              'all the way to a verified, governed production release. Each milestone links to the lessons and labs that prepare you.</p>' +
          "</div>" +
          '<div class="callout warn"><span class="callout-icon">🧪</span><div class="callout-body">' + esc(C.note) + "</div></div>" +
          '<section class="section"><div class="cap-progress"><div class="cap-progress-bar"><span style="width:' + pct + '%"></span></div>' +
            '<span class="cap-progress-label">' + done + " / " + total + " milestones</span></div></section>" +
          '<section class="section"><h2 class="section-title">Reference project structure</h2>' +
            '<p class="section-lead">The repository you build against — illustrative, not generated here.</p>' +
            '<div class="cap-tree">' + tree + "</div></section>" +
          '<section class="section"><h2 class="section-title">Reproducible setup</h2>' + setup + "</section>" +
          '<section class="section"><h2 class="section-title">The 14 milestones</h2>' +
            '<p class="section-lead">Each builds on the last. Expand a milestone for what you build, acceptance criteria, a reference snippet, and the lessons/labs behind it.</p>' +
            '<div class="cap-ms-list">' + milestones + "</div></section>";

        container.querySelectorAll(".cap-done").forEach(function (b) {
          b.addEventListener("click", function (e) {
            e.preventDefault(); e.stopPropagation();
            var n = +b.getAttribute("data-n");
            if (NS.Progress) NS.Progress.toggleComplete(capId(n));
            render();
          });
        });
      }

      render();
      if (NS.Progress) { try { NS.Progress.visit("capstone"); } catch (e) {} }
    },
    destroy: function () {}
  });
})();
