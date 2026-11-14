/* ============================================================
   modules/express-workshop.js — Express.js Workshop
   16 cumulative stages from a bare server to a production-shaped
   order API. Each stage now has two halves:
     Learn — the code delta, why it matters, a sample run.
     Build — a code kata: edit real code, run real tests in the
             browser (AV.KataRunner), pass to complete the stage.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var DONE_KEY = "apilab-katas";
  function doneMap() { try { return JSON.parse(localStorage.getItem(DONE_KEY) || "{}"); } catch (e) { return {}; } }
  function markDone(id) {
    try { var m = doneMap(); m[id] = true; localStorage.setItem(DONE_KEY, JSON.stringify(m)); } catch (e) {}
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var module = {
    id: "express-workshop",
    title: "Express.js Workshop",
    fullWidth: true,
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("intermediate");
      var stages = AV.data.impl.expressStages;
      var katas = AV.data.katas || [];
      function kataFor(stage) { for (var k = 0; k < katas.length; k++) if (katas[k].stage === stage.n) return katas[k]; return null; }
      var i = 0;
      var drafts = {}; // per-kata editor state while the module is open
      var hintIdx = {};

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Implementation &amp; Testing</div>' +
          '<h1 class="module-title">Build the order API in Express, stage by stage</h1>' +
          '<p class="module-subtitle">Each stage adds one concern — routing, validation, auth, idempotency, logging, DB, tests. First <b>Learn</b> the pattern, then <b>Build</b> it yourself: your code runs against real tests, right here in the browser. Pass all 16 and you\'ve written the spine of ShopSphere\'s order service.</p></div>' +

        '<div class="lab-2col wide-right">' +
          '<div><div class="panel"><div class="ws-head"><div><div class="panel-title" style="margin:0">Stage <span id="ws-n"></span> / ' + stages.length + '</div><div id="ws-title" class="ws-title"></div></div>' +
              '<div class="ws-nav"><button class="btn btn-ghost btn-sm" id="ws-prev">← Prev</button><button class="btn btn-ghost btn-sm" id="ws-next">Next →</button></div></div>' +
              '<p id="ws-why" class="ws-why"></p>' +
              '<div class="tabstrip" style="margin-bottom:var(--space-3)">' +
                '<button class="tab active" data-wtab="learn">📖 Learn</button>' +
                '<button class="tab" data-wtab="build">🛠️ Build <span id="ws-kata-badge"></span></button>' +
              "</div>" +
              '<div id="ws-learn"></div>' +
              '<div id="ws-build" class="hidden"></div>' +
            "</div></div>" +
          '<aside class="sticky-side"><div class="panel"><div class="panel-title">Stages</div><ol class="ws-stages" id="ws-list"></ol></div>' +
            '<div class="panel" id="ws-run-panel"><div class="panel-title">Run a sample request</div><div id="ws-run"></div></div></aside>' +
        "</div>";

      var listEl = container.querySelector("#ws-list");
      var learnHost = container.querySelector("#ws-learn");
      var buildHost = container.querySelector("#ws-build");
      var runHost = container.querySelector("#ws-run");
      var tab = "learn";

      function renderList() {
        var done = doneMap();
        listEl.innerHTML = stages.map(function (s, idx) {
          var kata = kataFor(s);
          var tick = kata && done[kata.id] ? " ✅" : "";
          return '<li class="ws-step" data-i="' + idx + '"><span class="ws-step-n">' + s.n + "</span>" + s.title + tick + "</li>";
        }).join("");
        listEl.querySelectorAll(".ws-step").forEach(function (el, idx) { el.classList.toggle("active", idx === i); el.classList.toggle("done", idx < i); });
      }

      function renderLearn(s) {
        learnHost.innerHTML = "";
        learnHost.appendChild(AV.CodeViewer.create({ title: "server.js  ·  stage " + s.n + " (delta)", lang: "javascript", code: s.code }));
        var r = s.run;
        var cls = "st-" + Math.floor((r.status || 200) / 100) + "xx";
        runHost.innerHTML =
          '<div class="http-msg"><div class="http-msg-head"><span>' + (r.m || "GET") + " " + (r.p || "") + '</span></div>' +
          '<div class="http-msg-body"><span class="status-pill ' + cls + '">' + r.status + "</span>\n\n" + AV.fmtJSON(r.body) + "</div></div>";
      }

      function renderBuild(s) {
        var kata = kataFor(s);
        if (!kata) { buildHost.innerHTML = '<p class="text-muted">No kata for this stage.</p>'; return; }
        var done = doneMap();
        var code = drafts[kata.id] != null ? drafts[kata.id] : kata.starter;
        buildHost.innerHTML =
          '<div class="callout info"><span class="callout-icon">🛠️</span><div class="callout-body"><b>Your turn.</b> ' + kata.task + "</div></div>" +
          '<textarea class="textarea mono" id="kata-src" rows="14" spellcheck="false" autocapitalize="off" autocomplete="off">' + esc(code) + "</textarea>" +
          '<div class="chiprow" style="margin-top:var(--space-2);gap:var(--space-2)">' +
            '<button class="btn btn-primary btn-sm" id="kata-run">▶ Run tests</button>' +
            '<button class="btn btn-ghost btn-sm" id="kata-hint">💡 Hint</button>' +
            '<button class="btn btn-ghost btn-sm" id="kata-reset">↺ Reset</button>' +
            '<button class="btn btn-ghost btn-sm" id="kata-solution">👀 Reveal solution</button>' +
          "</div>" +
          '<div id="kata-hint-out" style="margin-top:var(--space-2)"></div>' +
          '<div id="kata-out" style="margin-top:var(--space-3)">' +
            (done[kata.id] ? '<div class="callout tip"><span class="callout-icon">✅</span><div class="callout-body">Already passed. Re-run any time — the tests don\'t get easier.</div></div>' : '<p class="text-muted text-sm">' + kata.tests.length + " tests are waiting. Edit the code, then run them.</p>") +
          "</div>" +
          '<div id="kata-solution-out" style="margin-top:var(--space-3)"></div>';

        var src = buildHost.querySelector("#kata-src");
        src.addEventListener("input", function () { drafts[kata.id] = src.value; });
        // Tab inserts two spaces instead of leaving the editor.
        src.addEventListener("keydown", function (e) {
          if (e.key === "Tab") {
            e.preventDefault();
            var st = src.selectionStart, en = src.selectionEnd;
            src.value = src.value.slice(0, st) + "  " + src.value.slice(en);
            src.selectionStart = src.selectionEnd = st + 2;
            drafts[kata.id] = src.value;
          }
        });

        buildHost.querySelector("#kata-run").addEventListener("click", function () {
          var out = buildHost.querySelector("#kata-out");
          var result = AV.KataRunner.run(kata, src.value);
          if (result.error) {
            out.innerHTML = '<div class="callout danger"><span class="callout-icon">🧨</span><div class="callout-body"><b>Didn\'t compile:</b> ' + esc(result.error) + "</div></div>";
            return;
          }
          var passed = result.results.filter(function (r) { return r.pass; }).length;
          out.innerHTML =
            '<ul class="tick-list">' + result.results.map(function (r) {
              return "<li>" + (r.pass ? "✅ " + esc(r.name) : "❌ <b>" + esc(r.name) + "</b><br><span class=\"text-muted text-sm mono\">" + esc(r.detail || "") + "</span>") + "</li>";
            }).join("") + "</ul>" +
            (result.ok
              ? '<div class="callout tip" style="margin-top:var(--space-2)"><span class="callout-icon">🎉</span><div class="callout-body"><b>All ' + result.results.length + ' tests pass.</b> Stage ' + s.n + " built. " + (i < stages.length - 1 ? 'On to <a href="#" id="kata-next-link">stage ' + (s.n + 1) + "</a>." : "That was the last stage — you've built the whole service.") + "</div></div>"
              : '<div class="callout warn" style="margin-top:var(--space-2)"><span class="callout-icon">🔧</span><div class="callout-body">' + passed + " / " + result.results.length + " passing. Read the first failure closely — it names exactly what's missing.</div></div>");
          if (result.ok) {
            markDone(kata.id);
            renderList();
            var nl = out.querySelector("#kata-next-link");
            if (nl) nl.addEventListener("click", function (e) { e.preventDefault(); if (i < stages.length - 1) { i++; render(); } });
          }
        });

        buildHost.querySelector("#kata-hint").addEventListener("click", function () {
          var n = hintIdx[kata.id] || 0;
          var shown = kata.hints.slice(0, Math.min(n + 1, kata.hints.length));
          hintIdx[kata.id] = n + 1;
          buildHost.querySelector("#kata-hint-out").innerHTML = shown.map(function (h, idx) {
            return '<div class="callout info" style="margin-top:var(--space-1)"><span class="callout-icon">💡</span><div class="callout-body"><b>Hint ' + (idx + 1) + ":</b> " + esc(h) + "</div></div>";
          }).join("");
        });

        buildHost.querySelector("#kata-reset").addEventListener("click", function () {
          drafts[kata.id] = kata.starter;
          src.value = kata.starter;
        });

        buildHost.querySelector("#kata-solution").addEventListener("click", function () {
          var host = buildHost.querySelector("#kata-solution-out");
          if (host.childNodes.length) { host.innerHTML = ""; return; }
          host.innerHTML = '<p class="text-muted text-sm">One reference solution — yours may differ and still pass. Type it out rather than pasting: your fingers are part of the learning.</p>';
          host.appendChild(AV.CodeViewer.create({ title: "reference solution", lang: "javascript", code: kata.solution }));
        });
      }

      function setTab(t) {
        tab = t;
        container.querySelectorAll("[data-wtab]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-wtab") === t); });
        learnHost.classList.toggle("hidden", t !== "learn");
        buildHost.classList.toggle("hidden", t !== "build");
        container.querySelector("#ws-run-panel").style.display = t === "learn" ? "" : "none";
      }

      function render() {
        var s = stages[i];
        container.querySelector("#ws-n").textContent = s.n;
        container.querySelector("#ws-title").textContent = s.title;
        container.querySelector("#ws-why").textContent = s.why;
        var kata = kataFor(s);
        container.querySelector("#ws-kata-badge").textContent = kata && doneMap()[kata.id] ? "✅" : "";
        renderLearn(s);
        renderBuild(s);
        renderList();
        container.querySelector("#ws-prev").disabled = i === 0;
        container.querySelector("#ws-next").disabled = i === stages.length - 1;
        setTab(tab);
      }

      container.querySelectorAll("[data-wtab]").forEach(function (b) {
        b.addEventListener("click", function () { setTab(b.getAttribute("data-wtab")); });
      });
      container.querySelector("#ws-prev").addEventListener("click", function () { if (i > 0) { i--; render(); } });
      container.querySelector("#ws-next").addEventListener("click", function () { if (i < stages.length - 1) { i++; render(); } });
      listEl.addEventListener("click", function (e) { var li = e.target.closest(".ws-step"); if (li) { i = parseInt(li.getAttribute("data-i"), 10); render(); } });
      render();
    },
    destroy: function () {}
  };

  AV.registerModule(module);
})();
