/* ============================================================
   modules/express-workshop.js — Express.js Workshop
   16 cumulative stages from a bare server to a production-shaped
   order API. Each stage: the code delta, why it matters, and a
   sample request → response. Code shown; runs are simulated.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var module = {
    id: "express-workshop",
    title: "Express.js Workshop",
    fullWidth: true,
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("intermediate");
      var stages = AV.data.impl.expressStages;
      var i = 0;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Implementation</div>' +
          '<h1 class="module-title">Build the order API in Express, stage by stage</h1>' +
          '<p class="module-subtitle">Each stage adds one concern — routing, validation, auth, idempotency, logging, DB, tests — to the same service. The code is cumulative; runs are simulated. This mirrors how ShopSphere\'s real Node services are structured.</p></div>' +

        '<div class="lab-2col wide-right">' +
          '<div><div class="panel"><div class="ws-head"><div><div class="panel-title" style="margin:0">Stage <span id="ws-n"></span> / ' + stages.length + '</div><div id="ws-title" class="ws-title"></div></div>' +
              '<div class="ws-nav"><button class="btn btn-ghost btn-sm" id="ws-prev">← Prev</button><button class="btn btn-ghost btn-sm" id="ws-next">Next →</button></div></div>' +
              '<p id="ws-why" class="ws-why"></p>' +
              '<div id="ws-code"></div>' +
            "</div></div>" +
          '<aside class="sticky-side"><div class="panel"><div class="panel-title">Stages</div><ol class="ws-stages" id="ws-list"></ol></div>' +
            '<div class="panel"><div class="panel-title">Run a sample request</div><div id="ws-run"></div></div></aside>' +
        "</div>";

      var listEl = container.querySelector("#ws-list");
      listEl.innerHTML = stages.map(function (s, idx) { return '<li class="ws-step" data-i="' + idx + '"><span class="ws-step-n">' + s.n + "</span>" + s.title + "</li>"; }).join("");

      var codeHost = container.querySelector("#ws-code");
      var runHost = container.querySelector("#ws-run");

      function render() {
        var s = stages[i];
        container.querySelector("#ws-n").textContent = s.n;
        container.querySelector("#ws-title").textContent = s.title;
        container.querySelector("#ws-why").textContent = s.why;
        codeHost.innerHTML = "";
        codeHost.appendChild(AV.CodeViewer.create({ title: "server.js  ·  stage " + s.n + " (delta)", lang: "javascript", code: s.code }));
        var r = s.run;
        var cls = "st-" + Math.floor((r.status || 200) / 100) + "xx";
        runHost.innerHTML =
          '<div class="http-msg"><div class="http-msg-head"><span>' + (r.m || "GET") + " " + (r.p || "") + '</span></div>' +
          '<div class="http-msg-body"><span class="status-pill ' + cls + '">' + r.status + "</span>\n\n" + AV.fmtJSON(r.body) + "</div></div>";
        listEl.querySelectorAll(".ws-step").forEach(function (el, idx) { el.classList.toggle("active", idx === i); el.classList.toggle("done", idx < i); });
        container.querySelector("#ws-prev").disabled = i === 0;
        container.querySelector("#ws-next").disabled = i === stages.length - 1;
      }
      container.querySelector("#ws-prev").addEventListener("click", function () { if (i > 0) { i--; render(); } });
      container.querySelector("#ws-next").addEventListener("click", function () { if (i < stages.length - 1) { i++; render(); } });
      listEl.addEventListener("click", function (e) { var li = e.target.closest(".ws-step"); if (li) { i = parseInt(li.getAttribute("data-i"), 10); render(); } });
      render();
    },
    destroy: function () {}
  };

  AV.registerModule(module);
})();
