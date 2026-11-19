/* ============================================================
   modules/interview-prep.js — Knowledge & Interview Prep
   Four surfaces over AV.data.interviewBank:
     Bank   — 40+ questions, filter by category, reveal strong-answer
              points + the trap + a 0/1/2 rubric.
     Drill  — progressive follow-up chains (AV.FollowUpChain): an
              interviewer that keeps drilling the same scenario.
     Depth  — one question answered junior/mid/senior (AV.TieredAnswer).
     Mock   — a timed 5-question mock loop, self-graded on the rubric.
   Falls back to the legacy practice bank if the new one is absent.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var CAT_LABEL = { design: "System design", debugging: "Debugging", "trade-off": "Trade-offs", estimation: "Estimation", behavioral: "Behavioral" };
  var LEVEL_LABEL = { mid: "Mid", senior: "Senior", staff: "Staff" };

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var FRAMEWORK = [
    ["1 · Define", "State the concept crisply in one sentence."],
    ["2 · Mechanism", "Explain how it actually works under the hood."],
    ["3 · Business use", "Tie it to a concrete case (ShopSphere checkout)."],
    ["4 · Trade-offs", "Name the cost / when NOT to use it."],
    ["5 · Failure mode", "Describe how it breaks in production."],
    ["6 · Mitigation", "How you'd detect + prevent that failure."]
  ];

  var module = {
    id: "interview-prep",
    title: "Knowledge & Interview Prep",
    _timer: null,
    render: function (container) {
      var self = this;
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("advanced");
      var bank = AV.data.interviewBank;
      var legacy = (AV.data.practice && AV.data.practice.interview) || [];

      if (!bank || !bank.questions || !bank.questions.length) { renderLegacy(); return; }

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Production &amp; Practice</div>' +
          '<h1 class="module-title">Interview preparation</h1>' +
          '<p class="module-subtitle">' + bank.questions.length + ' questions across system design, debugging, trade-offs, estimation and behavioral — each with the strong-answer points, the trap that sinks candidates, and a 0/1/2 rubric. Then drill depth with a follow-up interviewer, and sit a timed mock.</p></div>' +

        '<div class="tabstrip">' + T("bank", "Question bank", true) + T("drill", "Follow-up drills") + T("depth", "Answer at depth") + T("mock", "Mock interview") + T("framework", "The framework") + "</div>" +

        P("bank", true,
          '<div class="chiprow" id="ip-cats" style="margin-bottom:var(--space-3)"></div><div id="ip-list"></div>'
        ) +
        P("drill", false, '<p class="panel-sub">A real interviewer keeps pulling the thread. Pick a scenario; answer, reveal, self-rate, and it drills deeper.</p><div class="chiprow" id="ip-chains" style="margin-bottom:var(--space-3)"></div><div id="ip-chain-host"></div>') +
        P("depth", false, '<p class="panel-sub">The same question, answered three ways. The gap between "mid" and "senior" is exactly what loops are listening for.</p><div class="chiprow" id="ip-tiered" style="margin-bottom:var(--space-3)"></div><div id="ip-tier-host"></div>') +
        P("mock", false, '<div id="ip-mock"></div>') +
        P("framework", false,
          '<div class="panel"><div class="panel-title">The answer framework</div><div class="note-grid">' +
            FRAMEWORK.map(function (f) { return '<div class="panel" style="background:var(--bg-3)"><div class="panel-title" style="color:var(--airflow-bright)">' + f[0] + "</div><p>" + f[1] + "</p></div>"; }).join("") + "</div></div>"
        );

      AV.ui.wireTabs(container);

      // ── Question bank with category filter ──
      var cats = ["all"].concat(bank.categories || []);
      var activeCat = "all";
      var catHost = container.querySelector("#ip-cats");
      var listHost = container.querySelector("#ip-list");
      function drawCats() {
        catHost.innerHTML = cats.map(function (c) {
          var n = c === "all" ? bank.questions.length : bank.questions.filter(function (q) { return q.category === c; }).length;
          return '<button class="chip' + (c === activeCat ? " active" : "") + '" data-cat="' + c + '">' + (c === "all" ? "All" : (CAT_LABEL[c] || c)) + " (" + n + ")</button>";
        }).join("");
      }
      function drawList() {
        var qs = bank.questions.filter(function (q) { return activeCat === "all" || q.category === activeCat; });
        listHost.innerHTML = qs.map(function (q, idx) {
          return '<div class="panel" style="margin-bottom:var(--space-3)"><div class="panel-title" style="display:flex;gap:var(--space-2);align-items:center">' +
              '<span class="chip active" style="cursor:default">' + (CAT_LABEL[q.category] || q.category) + "</span>" +
              '<span class="prep-badge steps">' + (LEVEL_LABEL[q.level] || q.level) + "</span></div>" +
            "<p><b>Q.</b> " + q.q + "</p>" +
            '<button class="btn btn-ghost btn-sm ip-reveal" data-id="' + q.id + '">Show a strong answer</button>' +
            '<div class="ip-sol" data-id="' + q.id + '"></div></div>';
        }).join("");
      }
      catHost.addEventListener("click", function (e) { var b = e.target.closest("[data-cat]"); if (!b) return; activeCat = b.getAttribute("data-cat"); drawCats(); drawList(); });
      listHost.addEventListener("click", function (e) {
        var b = e.target.closest(".ip-reveal"); if (!b) return;
        var q = bank.questions.filter(function (x) { return x.id === b.getAttribute("data-id"); })[0];
        if (!q) return;
        var sol = listHost.querySelector('.ip-sol[data-id="' + q.id + '"]');
        sol.innerHTML =
          '<div class="callout tip" style="margin-top:var(--space-2)"><span class="callout-icon">🎯</span><div class="callout-body"><b>Hit these points:</b><ul class="tick-list">' +
            q.points.map(function (p) { return "<li>" + p + "</li>"; }).join("") + "</ul></div></div>" +
          '<div class="callout warn" style="margin-top:var(--space-2)"><span class="callout-icon">⚠️</span><div class="callout-body"><b>The trap:</b> ' + q.trap + "</div></div>" +
          (q.rubric ? '<details style="margin-top:var(--space-2)"><summary class="text-muted">Scoring rubric</summary><ul class="tick-list" style="margin-top:var(--space-2)">' +
            q.rubric.map(function (r, ri) { return "<li><b>" + ri + ":</b> " + r + "</li>"; }).join("") + "</ul></details>" : "");
        b.disabled = true;
      });
      drawCats(); drawList();

      // ── Follow-up drills ──
      var chains = bank.chains || [];
      var chainTabs = container.querySelector("#ip-chains");
      var chainHost = container.querySelector("#ip-chain-host");
      chainTabs.innerHTML = chains.map(function (c, idx) { return '<button class="chip" data-chain="' + idx + '">' + esc(c.topic) + "</button>"; }).join("");
      function openChain(idx) {
        chainTabs.querySelectorAll(".chip").forEach(function (x, xi) { x.classList.toggle("active", xi === idx); });
        chainHost.innerHTML = "";
        if (AV.FollowUpChain) chainHost.appendChild(AV.FollowUpChain.create(chains[idx], function () {}).el);
      }
      chainTabs.addEventListener("click", function (e) { var b = e.target.closest("[data-chain]"); if (b) openChain(parseInt(b.getAttribute("data-chain"), 10)); });
      if (chains.length) openChain(0);

      // ── Tiered depth ──
      var tiered = bank.tiered || [];
      var tierTabs = container.querySelector("#ip-tiered");
      var tierHost = container.querySelector("#ip-tier-host");
      tierTabs.innerHTML = tiered.map(function (t, idx) { return '<button class="chip" data-tier="' + idx + '">' + esc(t.question.length > 40 ? t.question.slice(0, 40) + "…" : t.question) + "</button>"; }).join("");
      function openTier(idx) {
        tierTabs.querySelectorAll(".chip").forEach(function (x, xi) { x.classList.toggle("active", xi === idx); });
        tierHost.innerHTML = "";
        if (AV.TieredAnswer) tierHost.appendChild(AV.TieredAnswer.create(tiered[idx], function () {}, {}).el);
      }
      tierTabs.addEventListener("click", function (e) { var b = e.target.closest("[data-tier]"); if (b) openTier(parseInt(b.getAttribute("data-tier"), 10)); });
      if (tiered.length) openTier(0);

      // ── Mock interview ──
      var mockHost = container.querySelector("#ip-mock");
      function drawMockIntro() {
        mockHost.innerHTML =
          '<div class="panel"><div class="panel-title">Timed mock interview</div>' +
            '<p>Five questions, drawn at random across categories, ~3 minutes each. For each: think out loud, reveal the model answer, and score yourself honestly on the rubric (0 missed · 1 decent · 2 strong). At the end you get an aggregate — treat 1.3+ average as loop-ready.</p>' +
            '<button class="btn btn-primary" id="ip-mock-start">▶ Start mock (5 questions)</button></div>';
        mockHost.querySelector("#ip-mock-start").addEventListener("click", startMock);
      }
      function startMock() {
        var pool = bank.questions.slice();
        for (var a = pool.length - 1; a > 0; a--) { var j = Math.floor(Math.random() * (a + 1)); var t = pool[a]; pool[a] = pool[j]; pool[j] = t; }
        var qs = pool.slice(0, 5);
        var i = 0, totalScore = 0;
        var startTs = Date.now();

        function drawQ() {
          var q = qs[i];
          mockHost.innerHTML =
            '<div class="panel"><div class="ty-head"><span class="ty-badge">🎤 Question ' + (i + 1) + " / " + qs.length + '</span>' +
              '<span class="ty-best" id="ip-mock-clock"></span></div>' +
            '<div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-2)"><span class="chip active" style="cursor:default">' + (CAT_LABEL[q.category] || q.category) + '</span><span class="prep-badge steps">' + (LEVEL_LABEL[q.level] || q.level) + "</span></div>" +
            '<p class="ty-q">' + q.q + "</p>" +
            '<button class="btn btn-ghost btn-sm" id="ip-mock-reveal">Reveal model answer</button>' +
            '<div id="ip-mock-ans" hidden></div></div>';
          var clock = mockHost.querySelector("#ip-mock-clock");
          var qStart = Date.now();
          if (self._timer) clearInterval(self._timer);
          self._timer = setInterval(function () {
            if (!document.body.contains(clock)) { clearInterval(self._timer); return; }
            var s = Math.floor((Date.now() - qStart) / 1000);
            clock.textContent = Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
          }, 1000);

          mockHost.querySelector("#ip-mock-reveal").addEventListener("click", function () {
            this.disabled = true;
            var ans = mockHost.querySelector("#ip-mock-ans");
            ans.hidden = false;
            ans.innerHTML =
              '<div class="callout tip" style="margin-top:var(--space-2)"><span class="callout-icon">🎯</span><div class="callout-body"><b>Strong answer hits:</b><ul class="tick-list">' +
                q.points.map(function (p) { return "<li>" + p + "</li>"; }).join("") + "</ul></div></div>" +
              '<div class="callout warn" style="margin-top:var(--space-2)"><span class="callout-icon">⚠️</span><div class="callout-body"><b>Trap:</b> ' + q.trap + "</div></div>" +
              '<div class="ty-q" style="margin-top:var(--space-3)">Score yourself:</div>' +
              '<div class="chiprow"><button class="btn btn-ghost btn-sm ip-score" data-s="0">0 · missed</button>' +
                '<button class="btn btn-ghost btn-sm ip-score" data-s="1">1 · decent</button>' +
                '<button class="btn btn-primary btn-sm ip-score" data-s="2">2 · strong</button></div>';
            ans.querySelectorAll(".ip-score").forEach(function (b) {
              b.addEventListener("click", function () {
                totalScore += parseInt(b.getAttribute("data-s"), 10);
                i++;
                if (i >= qs.length) finishMock();
                else drawQ();
              });
            });
          });
        }
        function finishMock() {
          if (self._timer) { clearInterval(self._timer); self._timer = null; }
          var avg = (totalScore / qs.length).toFixed(1);
          var mins = Math.round((Date.now() - startTs) / 60000);
          var verdict = avg >= 1.3 ? "Loop-ready on this sample." : avg >= 0.8 ? "Getting there — tighten the weak answers." : "More reps needed — revisit the modules behind the misses.";
          mockHost.innerHTML =
            '<div class="panel"><div class="panel-title">Mock complete</div>' +
              '<div class="stat-row"><div class="stat"><div class="stat-num gradient-text">' + avg + '</div><div class="stat-label">avg score / 2</div></div>' +
              '<div class="stat"><div class="stat-num">' + totalScore + " / " + (qs.length * 2) + '</div><div class="stat-label">total</div></div>' +
              '<div class="stat"><div class="stat-num">' + mins + 'm</div><div class="stat-label">elapsed</div></div></div>' +
              '<p>' + verdict + '</p><button class="btn btn-primary" id="ip-mock-again">Run another mock</button></div>';
          mockHost.querySelector("#ip-mock-again").addEventListener("click", drawMockIntro);
        }
        drawQ();
      }
      drawMockIntro();

      function renderLegacy() {
        container.innerHTML =
          '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Practice</div>' +
            '<h1 class="module-title">Interview preparation</h1>' +
            '<p class="module-subtitle">Senior API answers follow a shape: define → mechanism → business → trade-offs → failure → mitigation.</p></div>' +
          '<section class="section"><div id="ip-list"></div></section>';
        var listEl = container.querySelector("#ip-list");
        listEl.innerHTML = legacy.map(function (b, idx) {
          return '<div class="panel" style="margin-bottom:var(--space-3)"><div class="panel-title"><span class="chip active" style="cursor:default">' + b.topic + "</span></div><p><b>Q.</b> " + b.q + "</p>" +
            '<button class="btn btn-ghost btn-sm ip-reveal" data-idx="' + idx + '">Show answer elements</button><div class="ip-sol" data-idx="' + idx + '"></div></div>';
        }).join("");
        listEl.addEventListener("click", function (e) {
          var b = e.target.closest(".ip-reveal"); if (!b) return;
          var item = legacy[parseInt(b.getAttribute("data-idx"), 10)];
          listEl.querySelector('.ip-sol[data-idx="' + b.getAttribute("data-idx") + '"]').innerHTML =
            '<div class="callout tip" style="margin-top:var(--space-2)"><span class="callout-icon">🎯</span><div class="callout-body"><b>Hit these points:</b><ul class="tick-list">' +
              item.points.map(function (p) { return "<li>" + p + "</li>"; }).join("") + "</ul></div></div>";
          b.disabled = true;
        });
      }
    },
    destroy: function () { if (this._timer) { clearInterval(this._timer); this._timer = null; } }
  };

  function T(id, l, a) { return '<button class="tab' + (a ? " active" : "") + '" data-tab="' + id + '">' + l + "</button>"; }
  function P(id, a, inner) { return '<div class="tab-panel' + (a ? " active" : "") + '" data-tab="' + id + '">' + inner + "</div>"; }

  AV.registerModule(module);
})();
