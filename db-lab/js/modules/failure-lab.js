/* ============================================================
   failure-lab.js — Production Incident Engine (route #failure-lab).
   An evidence-driven debugging workbench over DBLab.incidents: read the
   symptoms, run diagnostics to uncover evidence, commit a diagnosis, pick
   a remediation, and get scored on the investigation. ShopKart scenarios.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function conceptTitle(slug) {
    var all = DL.concepts || [];
    for (var i = 0; i < all.length; i++) if (all[i].slug === slug) return all[i].title;
    return slug;
  }

  var st = null; // { incident, revealed:{}, hypothesis, remediation, phase }
  var host = null;

  function reset() { st = null; }

  function startIncident(id) {
    var inc = (DL.incidents || []).filter(function (x) { return x.id === id; })[0];
    st = { incident: inc, revealed: {}, hypothesis: null, remediation: null, phase: "investigate" };
    render();
  }

  function render() {
    if (!host) return;
    if (!st) { host.innerHTML = listHTML(); wireList(); return; }
    host.innerHTML = investigationHTML();
    wireInvestigation();
    var c = document.getElementById("canvas"); if (c) c.scrollTop = 0;
  }

  function listHTML() {
    var incs = DL.incidents || [];
    var cards = incs.map(function (inc) {
      return '<button class="incident-card" data-inc="' + inc.id + '">' +
        '<span class="incident-sev sev-' + esc(inc.severity.replace(/[^A-Za-z0-9]/g, "")) + '">' + esc(inc.severity) + "</span>" +
        '<span class="incident-title">' + esc(inc.title) + "</span>" +
        '<span class="incident-sys">' + esc(inc.system) + "</span>" +
        '<span class="incident-ctx">' + esc(inc.context.slice(0, 120)) + "…</span></button>";
    }).join("");
    return '<div class="module-header animate-fade-in-up">' +
      '<div class="module-eyebrow">Production Challenges</div>' +
      '<h1 class="module-title gradient-text">Failure Lab — Incident Engine</h1>' +
      '<p class="module-subtitle">Diagnose realistic ShopKart database incidents from evidence: investigate, form a hypothesis, defend it, and choose a remediation. Scenarios are hypothetical/composite teaching cases with real mechanics.</p></div>' +
      '<div class="incident-grid">' + cards + "</div>";
  }

  function investigationHTML() {
    var inc = st.incident;
    var h = "";
    h += '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">' + esc(inc.severity) + " · Production Challenge</div>" +
      '<h1 class="module-title">' + esc(inc.title) + "</h1>" +
      '<p class="module-subtitle">' + esc(inc.system) + "</p>" +
      '<div class="incident-disclaimer">⚠ Hypothetical / composite teaching scenario — realistic mechanics, not a specific real outage.</div></div>';

    h += '<a class="btn btn-secondary incident-back" href="#failure-lab" data-act="back">← All incidents</a>';

    // context + symptoms
    h += '<section class="incident-sec"><h3>Situation</h3><p>' + esc(inc.context) + "</p>" +
      '<div class="incident-meta"><span><b>Workload:</b> ' + esc(inc.workload) + "</span><span><b>Baseline:</b> " + esc(inc.baseline) + "</span></div>" +
      '<ul class="incident-symptoms">' + inc.symptoms.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></section>";

    // diagnostics
    var nRev = Object.keys(st.revealed).length;
    h += '<section class="incident-sec"><h3>Run diagnostics <span class="incident-hint">' + nRev + "/" + inc.actions.length + " run</span></h3><div class=\"incident-actions\">";
    inc.actions.forEach(function (a) {
      var done = st.revealed[a.id];
      h += '<div class="incident-action ' + (done ? "done" : "") + '">' +
        '<button class="incident-run" data-run="' + a.id + '" ' + (done || st.phase !== "investigate" ? "disabled" : "") + ">" + (done ? "✓ " : "▶ ") + esc(a.label) + "</button>";
      if (done) {
        var sig = a.signal === "smoking-gun" ? "🔫 smoking gun" : a.signal === "relevant" ? "• relevant" : "✂ red herring";
        h += '<div class="incident-evidence ev-' + a.signal + '"><span class="ev-sig">' + sig + "</span>" + a.reveals + "</div>";
      }
      h += "</div>";
    });
    h += "</div></section>";

    // hypothesis
    if (st.phase === "investigate") {
      h += '<section class="incident-sec"><h3>Commit your diagnosis</h3>' +
        '<div class="incident-hyps">' + inc.hypotheses.map(function (hy) {
          return '<label class="incident-hyp"><input type="radio" name="hyp" value="' + hy.id + '" ' + (st.hypothesis === hy.id ? "checked" : "") + '/> ' + esc(hy.text) + "</label>";
        }).join("") + "</div>" +
        '<button class="btn btn-primary" data-act="diagnose" ' + (nRev === 0 ? "disabled title=\"Run at least one diagnostic first\"" : "") + ">Commit diagnosis</button>" +
        (nRev === 0 ? '<span class="incident-note">Investigate before you commit.</span>' : "") + "</section>";
    } else {
      // revealed root cause + remediation
      var chosen = inc.hypotheses.filter(function (x) { return x.id === st.hypothesis; })[0];
      h += '<section class="incident-sec"><h3>Diagnosis</h3>' +
        '<div class="incident-verdict ' + (chosen && chosen.correct ? "right" : "wrong") + '">' +
        (chosen && chosen.correct ? "✓ Correct: " : "✗ Not quite: ") + esc(chosen ? chosen.text : "") + "</div>" +
        '<div class="incident-root"><b>Root cause.</b> ' + esc(inc.rootCause) + "</div></section>";

      if (st.phase === "diagnosed") {
        h += '<section class="incident-sec"><h3>Choose a remediation</h3><div class="incident-rems">' +
          inc.remediations.map(function (r) {
            return '<label class="incident-rem"><input type="radio" name="rem" value="' + r.id + '" ' + (st.remediation === r.id ? "checked" : "") + '/> ' + esc(r.text) + "</label>";
          }).join("") + "</div>" +
          '<button class="btn btn-primary" data-act="apply" ' + (st.remediation ? "" : "disabled") + ">Apply remediation</button></section>";
      } else {
        // resolved — show remediation feedback + score + lessons
        var rem = inc.remediations.filter(function (x) { return x.id === st.remediation; })[0];
        h += '<section class="incident-sec"><h3>Remediation</h3>' +
          '<div class="incident-remverdict eff-' + rem.effect + '"><b>' + (rem.effect === "fix" ? "✓ Resolves it" : rem.effect === "partial" ? "~ Partial" : "✗ Harmful") + ".</b> " + esc(rem.note) + "</div></section>";
        h += scoreHTML();
        h += '<section class="incident-sec"><h3>Learn the mechanism</h3><div class="incident-links">' +
          inc.relatedConcepts.map(function (slug) { return '<a class="incident-link" href="#concept/' + slug + '">' + esc(conceptTitle(slug)) + " →</a>"; }).join("") + "</div>" +
          '<button class="btn btn-secondary" data-act="back">← Try another incident</button></section>';
      }
    }
    return h;
  }

  function computeScore() {
    var inc = st.incident, pts = 0, parts = [];
    var hy = inc.hypotheses.filter(function (x) { return x.id === st.hypothesis; })[0];
    if (hy && hy.correct) { pts += 50; parts.push(["Correct diagnosis", 50]); } else parts.push(["Diagnosis", 0]);
    // found the smoking gun
    var sg = inc.actions.filter(function (a) { return a.signal === "smoking-gun"; })[0];
    if (sg && st.revealed[sg.id]) { pts += 20; parts.push(["Found the smoking gun", 20]); } else parts.push(["Smoking gun missed", 0]);
    // efficiency: didn't run every red herring
    var herrings = inc.actions.filter(function (a) { return a.signal === "red-herring" && st.revealed[a.id]; }).length;
    var effPts = Math.max(0, 10 - herrings * 4);
    pts += effPts; parts.push(["Efficient investigation", effPts]);
    var rem = inc.remediations.filter(function (x) { return x.id === st.remediation; })[0];
    var rPts = rem.effect === "fix" ? 20 : rem.effect === "partial" ? 8 : 0;
    pts += rPts; parts.push(["Remediation quality", rPts]);
    return { pts: pts, parts: parts };
  }

  function scoreHTML() {
    var sc = computeScore();
    var grade = sc.pts >= 90 ? "A" : sc.pts >= 75 ? "B" : sc.pts >= 60 ? "C" : "D";
    return '<section class="incident-sec incident-score"><h3>Investigation score</h3>' +
      '<div class="incident-scorebar"><div class="incident-grade grade-' + grade + '">' + grade + "</div>" +
      '<div class="incident-scoreval">' + sc.pts + "/100</div></div>" +
      '<ul class="incident-scoreparts">' + sc.parts.map(function (p) { return "<li><span>" + esc(p[0]) + "</span><b>+" + p[1] + "</b></li>"; }).join("") + "</ul></section>";
  }

  function wireList() {
    host.querySelectorAll("[data-inc]").forEach(function (b) {
      b.addEventListener("click", function () { startIncident(b.dataset.inc); });
    });
  }

  function wireInvestigation() {
    host.querySelectorAll("[data-run]").forEach(function (b) {
      b.addEventListener("click", function () { st.revealed[b.dataset.run] = true; render(); });
    });
    host.querySelectorAll('input[name="hyp"]').forEach(function (r) {
      r.addEventListener("change", function () { st.hypothesis = r.value; });
    });
    host.querySelectorAll('input[name="rem"]').forEach(function (r) {
      r.addEventListener("change", function () { st.remediation = r.value; render(); });
    });
    host.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        var a = b.dataset.act;
        if (a === "back") { e.preventDefault(); reset(); render(); return; }
        if (a === "diagnose") { if (st.hypothesis) { st.phase = "diagnosed"; render(); } return; }
        if (a === "apply") { if (st.remediation) { st.phase = "resolved"; if (DL.Progress) try { DL.Progress.recordQuiz("incident-" + st.incident.id, computeScore().pts >= 75 ? 1 : 0, 1); } catch (_) {} render(); } return; }
      });
    });
  }

  DL.registerModule({
    id: "failure-lab", title: "Failure Lab", fullWidth: false,
    render: function (container) { host = container; reset(); render(); },
  });
})();
