/* ============================================================
   lab.js — DECICDViz.Lab  (v2, Iteration 6)
   The reusable hands-on lab engine. Supports four lab MODES that
   share one schema, one progress record, and one honest-execution
   promise:

     repair    — fix an intentionally broken config/implementation
     guided     — a task in small checked steps (per-step checkpoints)
     incident   — investigate logs/symptoms → diagnose root cause
     challenge  — a problem + acceptance criteria, minimal hand-holding

   SAFETY: learner input is NEVER executed. No eval/Function. Checks
   are deterministic static analysis (regex / structural parsing) or
   scripted simulated runs, and every value rendered is HTML-escaped.
   Each lab's kind ("Static validation" / "Simulated execution") and
   mode are shown honestly in the UI.

   Also exports DECICDViz.LabValidators — small reusable static
   validators (YAML indentation lint, key presence) labs can call.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ── Reusable static validators ──────────────────────────────
  var LabValidators = {
    // Structural YAML lint: flags tabs in indentation and odd/inconsistent
    // indentation. Not a full parser — a cheap, honest structural check.
    yamlLint: function (text) {
      var lines = String(text || "").split("\n");
      var errors = [];
      lines.forEach(function (ln, i) {
        if (!ln.trim() || ln.trim()[0] === "#" || ln.trim() === "---") return;
        var lead = (ln.match(/^(\s*)/) || ["", ""])[1];
        if (lead.indexOf("\t") !== -1) errors.push({ line: i + 1, msg: "Tab in indentation — YAML wants spaces." });
        else if (lead.length % 2 !== 0) errors.push({ line: i + 1, msg: "Indentation is not a multiple of 2 spaces." });
      });
      return { ok: errors.length === 0, errors: errors };
    },
    hasKey: function (text, key) {
      return new RegExp("(^|\\n)\\s*" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:").test(String(text || ""));
    },
    matches: function (text, re) { return re.test(String(text || "")); },
    // Count distinct keyword hits (for free-text diagnosis grading).
    keywordHits: function (text, keywords) {
      var t = String(text || "").toLowerCase(), hits = [];
      (keywords || []).forEach(function (k) {
        if (t.indexOf(String(k).toLowerCase()) !== -1) hits.push(k);
      });
      return hits;
    }
  };
  NS.LabValidators = LabValidators;

  // ── Minimal LCS line diff (for the reference comparison) ────
  function lineDiff(a, b) {
    var A = String(a).replace(/\s+$/gm, "").split("\n");
    var B = String(b).replace(/\s+$/gm, "").split("\n");
    var n = A.length, m = B.length, dp = [];
    for (var i = 0; i <= n; i++) { dp[i] = []; for (var j = 0; j <= m; j++) dp[i][j] = 0; }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    var out = []; i = 0; j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { out.push({ t: " ", l: A[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: "-", l: A[i] }); i++; }
      else { out.push({ t: "+", l: B[j] }); j++; }
    }
    while (i < n) out.push({ t: "-", l: A[i++] });
    while (j < m) out.push({ t: "+", l: B[j++] });
    return out;
  }

  var MODE = {
    repair:    { label: "Code repair", icon: "🔧" },
    guided:    { label: "Guided", icon: "🧭" },
    incident:  { label: "Incident investigation", icon: "🚨" },
    challenge: { label: "Independent challenge", icon: "🎯" }
  };

  // Shared header (title, scenario, context, objectives, prereqs).
  function headerHTML(c) {
    var m = MODE[c.mode || "repair"] || MODE.repair;
    var objectives = (c.objectives && c.objectives.length)
      ? '<div class="lab-meta-block"><div class="lab-meta-h">🎯 Objectives</div><ul class="lab-obj">' +
        c.objectives.map(function (o) { return "<li>" + o + "</li>"; }).join("") + "</ul></div>"
      : (c.objective ? '<div class="lab-meta-block"><div class="lab-meta-h">🎯 Objective</div><p>' + c.objective + "</p></div>" : "");
    var prereqs = (c.prerequisites && c.prerequisites.length)
      ? '<div class="lab-meta-block"><div class="lab-meta-h">📎 Prerequisites</div><div class="lab-prereqs">' +
        c.prerequisites.map(function (p) {
          var title = (NS.routes && NS.routes[p] && NS.routes[p].title) || p;
          return '<a class="lesson-prereq-chip" href="#' + esc(p) + '">' + esc(title) + "</a>";
        }).join("") + "</div></div>"
      : "";
    var ctx = c.businessContext ? '<div class="callout tip lab-context"><span class="callout-icon">🏷️</span><div class="callout-body">' + c.businessContext + "</div></div>" : "";
    return '<div class="lab-topline">' +
        '<a class="lab-back" href="#labs">← All labs</a>' +
        '<span class="lab-mode" title="Lab mode">' + m.icon + " " + esc(m.label) + "</span>" +
        '<span class="lab-kind" title="How this lab checks your work">' + esc(c.kind) + "</span>" +
      "</div>" +
      '<div class="module-header">' +
        '<div class="module-eyebrow" style="color:var(' + (c.tool || "--brand") + ')">🧪 Hands-on Lab · ' + esc(c.difficulty || "") + "</div>" +
        '<h1 class="module-title gradient-text">' + esc(c.title) + "</h1>" +
        (c.scenario ? '<p class="module-subtitle">' + c.scenario + "</p>" : "") +
      "</div>" + ctx +
      (objectives || prereqs ? '<div class="lab-meta-grid">' + objectives + prereqs + "</div>" : "");
  }

  // Render a results block from a validate() result, with rich feedback.
  function renderResults(output, win, c, res, onSolved) {
    var checks = res.checks || [], logs = res.logs || [];
    output.innerHTML =
      '<div class="lab-verdict ' + (res.pass ? "ok" : "bad") + '">' +
        (res.pass ? "✓ All checks passed" : "✗ " + checks.filter(function (x) { return !x.pass; }).length + " check(s) failing") +
      "</div>" +
      '<ul class="lab-checks">' + checks.map(function (ch) {
        return '<li class="' + (ch.pass ? "pass" : "fail") + '"><span class="lab-check-ic">' +
          (ch.pass ? "✓" : "✗") + '</span><span><b>' + esc(ch.label) + "</b>" +
          (ch.detail ? '<span class="lab-check-detail">' + esc(ch.detail) + "</span>" : "") +
          (!ch.pass && ch.why ? '<span class="lab-check-why"><b>Why:</b> ' + ch.why + "</span>" : "") +
          (!ch.pass && ch.robust ? '<span class="lab-check-robust"><b>Robust fix:</b> ' + ch.robust + "</span>" : "") +
          (!ch.pass && ch.revisit ? '<span class="lab-check-revisit">↪ <a href="#' + esc(ch.revisit) + '">Revisit the concept</a></span>' : "") +
          "</span></li>";
      }).join("") + "</ul>" +
      (logs.length ? '<div class="lab-logs-h">Simulated log</div><pre class="lab-logs">' + logs.map(esc).join("\n") + "</pre>" : "");
    if (res.pass) {
      if (NS.Progress) {
        try {
          if (NS.Progress.recordLabEvidence) NS.Progress.recordLabEvidence(c.id, { solved: true, hints: (res._hints || 0) });
          else NS.Progress.recordLab(c.id, true);
        } catch (e) {}
      }
      win.hidden = false;
      win.innerHTML =
        '<div class="lab-win-h">🎉 Solved</div>' +
        (c.takeaway ? '<div class="lab-takeaway"><b>Production takeaway:</b> ' + c.takeaway + "</div>" : "") +
        (c.interview && c.interview.length ? '<div class="lab-iv-h">Interview angle</div>' +
          c.interview.map(function (q) { return '<details class="lab-iv"><summary>' + esc(q.q) + "</summary><div>" + q.a + "</div></details>"; }).join("") : "");
      if (onSolved) onSolved();
    } else { win.hidden = true; }
  }

  // ── Editor-based workspace (repair / guided / challenge) ────
  function buildEditorLab(c) {
    return {
      id: "lab-" + c.id, title: c.title, _cfg: c, _hintsShown: 0,
      render: function (host) {
        var self = this; self._hintsShown = 0;
        var isChallenge = c.mode === "challenge", isGuided = c.mode === "guided";

        var leftSteps = "";
        if (isGuided && c.steps && c.steps.length) {
          leftSteps = '<div class="lab-sec"><div class="lab-sec-h">Steps</div><ol class="lab-gsteps">' +
            c.steps.map(function (s, i) {
              return '<li class="lab-gstep" data-i="' + i + '"><div class="lab-gstep-t">' + s.title + "</div>" +
                (s.detail ? '<div class="lab-gstep-d">' + s.detail + "</div>" : "") +
                (s.check ? '<button type="button" class="btn btn-ghost btn-sm lab-gcheck" data-i="' + i + '">Check this step</button><span class="lab-gstat"></span>' : "") +
              "</li>";
            }).join("") + "</ol></div>";
        } else if (c.instructions && c.instructions.length) {
          leftSteps = '<div class="lab-sec"><div class="lab-sec-h">Steps</div><ol class="lab-steps">' +
            c.instructions.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ol></div>";
        }

        var acceptance = (isChallenge && c.acceptance && c.acceptance.length)
          ? '<div class="lab-sec"><div class="lab-sec-h">✅ Acceptance criteria</div><ul class="lab-acc">' +
            c.acceptance.map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul></div>" : "";
        var constraints = (c.constraints && c.constraints.length)
          ? '<div class="lab-sec"><div class="lab-sec-h">Constraints</div><ul class="lab-acc">' +
            c.constraints.map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul></div>" : "";

        var wrap = document.createElement("div");
        wrap.className = "lab-wrap";
        wrap.innerHTML =
          headerHTML(c) +
          '<div class="lab-grid">' +
            '<aside class="lab-left">' +
              acceptance + constraints + leftSteps +
              '<div class="lab-sec lab-hints"><div class="lab-sec-h">💡 Hints</div>' +
                '<div class="lab-hint-list"></div>' +
                (c.hints && c.hints.length ? '<button type="button" class="btn btn-ghost btn-sm lab-hint-btn">Show a hint</button>' : '<p class="lab-empty">No hints for this one.</p>') +
              "</div>" +
              (c.commonMistakes && c.commonMistakes.length ?
                '<details class="lab-sec lab-mistakes"><summary class="lab-sec-h">⚠️ Common mistakes</summary><ul>' +
                c.commonMistakes.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul></details>" : "") +
            "</aside>" +
            '<section class="lab-center">' +
              '<div class="lab-editor-head"><span class="lab-file">' + esc(c.file || (c.lang + " editor")) + "</span>" +
                '<span class="lab-lang">' + esc(c.lang) + "</span></div>" +
              '<textarea class="lab-editor" spellcheck="false" aria-label="Editable code"></textarea>' +
              '<div class="lab-actions">' +
                '<button type="button" class="btn btn-primary lab-run">▶ Run checks</button>' +
                '<button type="button" class="btn btn-secondary lab-reset">Reset</button>' +
                '<button type="button" class="btn btn-ghost lab-diff">Compare with reference</button>' +
                '<button type="button" class="btn btn-ghost lab-sol">Show solution</button>' +
              "</div>" +
              '<div class="lab-diff-mount"></div>' +
            "</section>" +
            '<aside class="lab-right">' +
              '<div class="lab-sec-h">Results</div>' +
              '<div class="lab-output"><p class="lab-empty">Edit the code, then <b>Run checks</b>. ' +
                "Nothing is really executed — this is <b>" + esc(String(c.kind).toLowerCase()) + "</b>.</p></div>" +
              '<div class="lab-win" hidden></div>' +
            "</aside>" +
          "</div>";
        host.appendChild(wrap);

        var editor = wrap.querySelector(".lab-editor");
        var output = wrap.querySelector(".lab-output");
        var win = wrap.querySelector(".lab-win");
        var diffMount = wrap.querySelector(".lab-diff-mount");
        var hintList = wrap.querySelector(".lab-hint-list");
        var hintBtn = wrap.querySelector(".lab-hint-btn");
        editor.value = c.starter || "";

        function renderHints() {
          var items = (c.hints || []).slice(0, self._hintsShown);
          hintList.innerHTML = items.map(function (h, i) { return '<div class="lab-hint">' + (i + 1) + ". " + h + "</div>"; }).join("");
          if (hintBtn) {
            if (self._hintsShown >= (c.hints || []).length) { hintBtn.disabled = true; hintBtn.textContent = "No more hints"; }
            else hintBtn.textContent = self._hintsShown ? "Show another hint" : "Show a hint";
          }
        }
        if (hintBtn) hintBtn.addEventListener("click", function () {
          if (self._hintsShown < (c.hints || []).length) self._hintsShown++;
          renderHints();
        });

        function runChecks() {
          diffMount.innerHTML = "";
          var res;
          try { res = c.validate(editor.value); }
          catch (e) { res = { pass: false, checks: [{ label: "Validator error", pass: false, detail: String(e.message || e) }], logs: [] }; }
          res._hints = self._hintsShown;
          renderResults(output, win, c, res);
        }

        // Guided per-step checkpoints
        if (isGuided && c.steps) {
          wrap.querySelectorAll(".lab-gcheck").forEach(function (b) {
            b.addEventListener("click", function () {
              var i = +b.getAttribute("data-i"); var step = c.steps[i];
              var ok = false;
              try { ok = !!step.check(editor.value); } catch (e) { ok = false; }
              var li = wrap.querySelector('.lab-gstep[data-i="' + i + '"]');
              var stat = li.querySelector(".lab-gstat");
              li.classList.toggle("done", ok);
              stat.textContent = ok ? "✓ done" : "✗ not yet";
              stat.className = "lab-gstat " + (ok ? "ok" : "no");
            });
          });
        }

        wrap.querySelector(".lab-run").addEventListener("click", runChecks);
        wrap.querySelector(".lab-reset").addEventListener("click", function () {
          editor.value = c.starter || "";
          output.innerHTML = '<p class="lab-empty">Reset. Edit, then Run checks.</p>';
          win.hidden = true; diffMount.innerHTML = "";
        });
        wrap.querySelector(".lab-sol").addEventListener("click", function () {
          var msg = isChallenge
            ? "This is an independent challenge — try the hints and your own design first. Reveal the reference solution anyway?"
            : "Reveal the reference solution? Try the hints first.";
          if (!window.confirm(msg)) return;
          editor.value = c.solution || "";
          diffMount.innerHTML = ""; runChecks();
        });
        wrap.querySelector(".lab-diff").addEventListener("click", function () {
          var d = lineDiff(editor.value, c.solution || "");
          diffMount.innerHTML =
            '<div class="lab-diff"><div class="lab-diff-h">Your code vs reference solution ' +
            '(<span class="d-rem">− yours</span> / <span class="d-add">+ reference</span>)</div><pre>' +
            d.map(function (r) {
              var cls = r.t === "+" ? "d-add" : (r.t === "-" ? "d-rem" : "");
              return '<span class="' + cls + '">' + esc(r.t + " " + r.l) + "</span>";
            }).join("\n") + "</pre></div>";
        });

        renderHints();
      },
      destroy: function () {}
    };
  }

  // ── Incident investigation workspace ────────────────────────
  function buildIncidentLab(c) {
    var inc = c.incident || {};
    return {
      id: "lab-" + c.id, title: c.title, _cfg: c, _shown: 0,
      render: function (host) {
        var self = this; self._shown = 0;
        var wrap = document.createElement("div");
        wrap.className = "lab-wrap";
        wrap.innerHTML =
          headerHTML(c) +
          '<section class="section"><h2 class="section-title">1 · The evidence</h2>' +
            '<p class="section-lead">Reveal the signals one at a time and form a hypothesis before you diagnose.</p>' +
            '<div class="inc-evidence"></div>' +
            ((inc.evidence && inc.evidence.length) ? '<button type="button" class="btn btn-secondary inc-next">Reveal next signal</button>' : "") +
          "</section>" +
          '<section class="section inc-diag" hidden><h2 class="section-title">2 · Diagnose the root cause</h2>' +
            '<div class="inc-q"></div></section>' +
          '<section class="section inc-corr" hidden><h2 class="section-title">3 · Propose the recovery</h2>' +
            '<p class="section-lead">' + (inc.correction && inc.correction.prompt ? inc.correction.prompt : "Describe how you would recover and verify.") + "</p>" +
            '<textarea class="inc-corr-text" spellcheck="false" aria-label="Your recovery plan"></textarea>' +
            '<button type="button" class="btn btn-primary inc-corr-check">Check my plan</button>' +
            '<div class="inc-corr-fb" hidden></div>' +
          "</section>" +
          '<div class="lab-win inc-win" hidden></div>';
        host.appendChild(wrap);

        var evWrap = wrap.querySelector(".inc-evidence");
        var nextBtn = wrap.querySelector(".inc-next");
        var diagSec = wrap.querySelector(".inc-diag");
        var qWrap = wrap.querySelector(".inc-q");
        var corrSec = wrap.querySelector(".inc-corr");
        var corrText = wrap.querySelector(".inc-corr-text");
        var corrFb = wrap.querySelector(".inc-corr-fb");
        var win = wrap.querySelector(".inc-win");
        var diagnosed = false;

        function paintEvidence() {
          var items = (inc.evidence || []).slice(0, self._shown);
          evWrap.innerHTML = items.map(function (e) {
            return '<div class="inc-ev"><span class="inc-ev-t">' + esc(e.t || "") + "</span>" +
              '<span class="inc-ev-l">' + e.line + "</span></div>";
          }).join("");
          if (nextBtn) {
            if (self._shown >= (inc.evidence || []).length) {
              nextBtn.disabled = true; nextBtn.textContent = "All signals revealed";
              diagSec.hidden = false;
            } else nextBtn.textContent = self._shown ? "Reveal next signal" : "Reveal first signal";
          }
        }
        if (nextBtn) nextBtn.addEventListener("click", function () {
          if (self._shown < (inc.evidence || []).length) self._shown++;
          paintEvidence();
        });

        // Diagnosis MCQ
        if (inc.question) {
          qWrap.innerHTML = '<div class="inc-q-text">' + esc(inc.question.q) + "</div>" +
            '<div class="inc-opts">' + inc.question.options.map(function (o, i) {
              return '<button type="button" class="inc-opt" data-o="' + i + '">' + esc(o.label) + "</button>";
            }).join("") + '</div><div class="inc-fb" hidden></div>';
          qWrap.addEventListener("click", function (e) {
            var b = e.target.closest(".inc-opt"); if (!b) return;
            var o = inc.question.options[+b.getAttribute("data-o")];
            qWrap.querySelectorAll(".inc-opt").forEach(function (x) { x.classList.remove("ok", "no", "sel"); });
            b.classList.add(o.ok ? "ok" : "no", "sel");
            var fb = qWrap.querySelector(".inc-fb");
            fb.hidden = false; fb.className = "inc-fb " + (o.ok ? "good" : "bad");
            fb.innerHTML = (o.ok ? "✅ Correct root cause. " : "❌ Not the root cause. ") + esc(o.why || "");
            if (o.ok) { diagnosed = true; corrSec.hidden = false; }
          });
        }

        // Correction grading (keyword-based, honest heuristic)
        wrap.querySelector(".inc-corr-check").addEventListener("click", function () {
          var kws = (inc.correction && inc.correction.keywords) || [];
          var hits = LabValidators.keywordHits(corrText.value, kws);
          var need = Math.max(1, Math.ceil(kws.length * 0.6));
          var ok = diagnosed && hits.length >= need;
          corrFb.hidden = false;
          corrFb.className = "inc-corr-fb " + (ok ? "good" : "bad");
          corrFb.innerHTML = ok
            ? "✅ Your plan covers the key recovery steps (" + hits.map(esc).join(", ") + ")."
            : "❌ " + (diagnosed ? "Mention the key recovery ideas: think " + kws.map(esc).join(", ") + "." : "Diagnose the root cause above first.");
          if (ok) {
            if (NS.Progress) { try { (NS.Progress.recordLabEvidence || NS.Progress.recordLab).call(NS.Progress, c.id, { solved: true }); } catch (e) {} }
            win.hidden = false;
            win.innerHTML = '<div class="lab-win-h">🎉 Incident resolved</div>' +
              (inc.rootCause ? '<div class="lab-takeaway"><b>Root cause:</b> ' + inc.rootCause + "</div>" : "") +
              (inc.prevention ? '<div class="lab-takeaway"><b>Prevention:</b> ' + inc.prevention + "</div>" : "") +
              (c.correction && c.correction.sample ? "" : "") +
              (inc.correction && inc.correction.sample ? '<details class="lab-iv"><summary>A model recovery plan</summary><div>' + inc.correction.sample + "</div></details>" : "");
          }
        });

        paintEvidence();
      },
      destroy: function () {}
    };
  }

  function build(cfg) {
    if ((cfg.mode || "repair") === "incident") return buildIncidentLab(cfg);
    return buildEditorLab(cfg);
  }

  NS.Lab = { build: build };
})();
