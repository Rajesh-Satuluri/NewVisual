/* ============================================================
   lab.js — DECICDViz.Lab
   The reusable hands-on lab workspace. Given a lab config it
   renders a 3-panel workspace: objectives/instructions (left),
   an editable code pane (centre), and run output + diagnostics
   + progressive hints (right), with a collapsible theory/expected
   section and a reference-solution diff.

   SAFETY: learner input is NEVER executed. `eval`/`Function` are
   never used. Validation is deterministic static analysis (regex /
   structural checks) or a scripted simulated run, and every value
   rendered into the DOM is HTML-escaped. Each lab's `kind` label
   ("Static validation" / "Simulated execution") is shown honestly.

   Lab config:
     { id, title, tool, lang, difficulty, kind, objective, scenario,
       instructions:[..], starter, solution, hints:[..], takeaway,
       interview:[{q,a}], validate(code) -> { pass, checks:[{label,
       pass, detail}], logs:[..] } }
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ── Minimal LCS line diff (for the reference comparison) ────
  function lineDiff(a, b) {
    var A = a.replace(/\s+$/gm, "").split("\n");
    var B = b.replace(/\s+$/gm, "").split("\n");
    var n = A.length, m = B.length;
    var dp = [];
    for (var i = 0; i <= n; i++) { dp[i] = []; for (var j = 0; j <= m; j++) dp[i][j] = 0; }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    var out = [];
    i = 0; j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { out.push({ t: " ", l: A[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: "-", l: A[i] }); i++; }
      else { out.push({ t: "+", l: B[j] }); j++; }
    }
    while (i < n) { out.push({ t: "-", l: A[i++] }); }
    while (j < m) { out.push({ t: "+", l: B[j++] }); }
    return out;
  }

  function build(cfg) {
    return {
      id: "lab-" + cfg.id,
      title: cfg.title,
      _cfg: cfg,
      _hintsShown: 0,
      render: function (host) {
        var self = this;
        var c = cfg;
        self._hintsShown = 0;

        var wrap = document.createElement("div");
        wrap.className = "lab-wrap";
        wrap.innerHTML =
          '<div class="lab-topline">' +
            '<a class="lab-back" href="#labs">← All labs</a>' +
            '<span class="lab-kind" title="How this lab checks your work">' + esc(c.kind) + '</span>' +
          '</div>' +
          '<div class="module-header">' +
            '<div class="module-eyebrow" style="color:var(' + (c.tool || "--brand") + ')">🧪 Hands-on Lab · ' + esc(c.difficulty || "") + '</div>' +
            '<h1 class="module-title gradient-text">' + esc(c.title) + '</h1>' +
            (c.scenario ? '<p class="module-subtitle">' + c.scenario + '</p>' : '') +
          '</div>' +
          '<div class="lab-grid">' +
            '<aside class="lab-left">' +
              '<div class="lab-sec"><div class="lab-sec-h">🎯 Objective</div><p>' + (c.objective || "") + '</p></div>' +
              (c.instructions && c.instructions.length ?
                '<div class="lab-sec"><div class="lab-sec-h">Steps</div><ol class="lab-steps">' +
                  c.instructions.map(function (s) { return "<li>" + s + "</li>"; }).join("") + '</ol></div>' : '') +
              '<div class="lab-sec lab-hints"><div class="lab-sec-h">💡 Hints</div>' +
                '<div class="lab-hint-list"></div>' +
                (c.hints && c.hints.length ? '<button type="button" class="btn btn-ghost btn-sm lab-hint-btn">Show a hint</button>' : '<p class="lab-empty">No hints for this one.</p>') +
              '</div>' +
            '</aside>' +
            '<section class="lab-center">' +
              '<div class="lab-editor-head"><span class="lab-file">' + esc(c.file || (c.lang + " editor")) + '</span>' +
                '<span class="lab-lang">' + esc(c.lang) + '</span></div>' +
              '<textarea class="lab-editor" spellcheck="false" aria-label="Editable code"></textarea>' +
              '<div class="lab-actions">' +
                '<button type="button" class="btn btn-primary lab-run">▶ Run checks</button>' +
                '<button type="button" class="btn btn-secondary lab-reset">Reset</button>' +
                '<button type="button" class="btn btn-ghost lab-diff">Compare with reference</button>' +
                '<button type="button" class="btn btn-ghost lab-sol">Show solution</button>' +
              '</div>' +
              '<div class="lab-diff-mount"></div>' +
            '</section>' +
            '<aside class="lab-right">' +
              '<div class="lab-sec-h">Results</div>' +
              '<div class="lab-output"><p class="lab-empty">Edit the code, then <b>Run checks</b>. ' +
                'Nothing is really executed — this is <b>' + esc(c.kind.toLowerCase()) + '</b>.</p></div>' +
              '<div class="lab-win" hidden></div>' +
            '</aside>' +
          '</div>';
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
          hintList.innerHTML = items.map(function (h, i) {
            return '<div class="lab-hint">' + (i + 1) + ". " + h + "</div>";
          }).join("");
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
          var checks = res.checks || [];
          var logs = res.logs || [];
          output.innerHTML =
            '<div class="lab-verdict ' + (res.pass ? "ok" : "bad") + '">' +
              (res.pass ? "✓ All checks passed" : "✗ " + checks.filter(function (x) { return !x.pass; }).length + " check(s) failing") +
            '</div>' +
            '<ul class="lab-checks">' + checks.map(function (ch) {
              return '<li class="' + (ch.pass ? "pass" : "fail") + '"><span class="lab-check-ic">' +
                (ch.pass ? "✓" : "✗") + '</span><span><b>' + esc(ch.label) + '</b>' +
                (ch.detail ? '<span class="lab-check-detail">' + esc(ch.detail) + '</span>' : '') + '</span></li>';
            }).join("") + '</ul>' +
            (logs.length ? '<div class="lab-logs-h">Simulated log</div><pre class="lab-logs">' +
              logs.map(esc).join("\n") + '</pre>' : '');

          if (res.pass) {
            if (NS.Progress) { try { NS.Progress.recordLab(c.id, true); } catch (e) {} }
            win.hidden = false;
            win.innerHTML =
              '<div class="lab-win-h">🎉 Solved</div>' +
              (c.takeaway ? '<div class="lab-takeaway"><b>Production takeaway:</b> ' + c.takeaway + '</div>' : '') +
              (c.interview && c.interview.length ?
                '<div class="lab-iv-h">Interview angle</div>' + c.interview.map(function (q) {
                  return '<details class="lab-iv"><summary>' + esc(q.q) + '</summary><div>' + q.a + '</div></details>';
                }).join("") : '');
          }
        }

        wrap.querySelector(".lab-run").addEventListener("click", runChecks);
        wrap.querySelector(".lab-reset").addEventListener("click", function () {
          editor.value = c.starter || "";
          output.innerHTML = '<p class="lab-empty">Reset. Edit, then Run checks.</p>';
          win.hidden = true; diffMount.innerHTML = "";
        });
        wrap.querySelector(".lab-sol").addEventListener("click", function () {
          if (!window.confirm("Reveal the reference solution? Try the hints first.")) return;
          editor.value = c.solution || "";
          diffMount.innerHTML = "";
          runChecks();
        });
        wrap.querySelector(".lab-diff").addEventListener("click", function () {
          var d = lineDiff(editor.value, c.solution || "");
          diffMount.innerHTML =
            '<div class="lab-diff"><div class="lab-diff-h">Your code vs reference solution ' +
            '(<span class="d-rem">− yours</span> / <span class="d-add">+ reference</span>)</div><pre>' +
            d.map(function (r) {
              var cls = r.t === "+" ? "d-add" : (r.t === "-" ? "d-rem" : "");
              return '<span class="' + cls + '">' + esc(r.t + " " + r.l) + '</span>';
            }).join("\n") + '</pre></div>';
        });

        renderHints();
      },
      destroy: function () {}
    };
  }

  NS.Lab = { build: build };
})();
