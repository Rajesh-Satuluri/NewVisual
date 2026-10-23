/* ============================================================
   modules/testing-challenges.js — Testing Challenges
   Diagnose common API failures from the evidence. Each challenge
   shows a symptom + evidence, reveals hints progressively, then the
   answer + explanation. Best paired with Debug mode.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // Map each challenge to an HttpSim scenario (or a code-log) for evidence.
  var EVID = {
    "c-400": { req: { method: "POST", path: "/v1/orders", headers: { Authorization: "Bearer …" } }, inject: { validationFail: false }, forceMalformed: true },
    "c-401": { req: { method: "POST", path: "/v1/orders", headers: {} }, inject: { authMissing: true } },
    "c-403": { req: { method: "GET", path: "/v1/orders/ORD-9", headers: { Authorization: "Bearer …" } }, inject: { authForbidden: true } },
    "c-429": { req: { method: "GET", path: "/v1/products", headers: {} }, inject: { gatewayRateLimited: true } },
    "c-504": { req: { method: "POST", path: "/v1/payments", headers: { Authorization: "Bearer …" } }, inject: { downstreamTimeout: true } }
  };

  var module = {
    id: "testing-challenges",
    title: "Testing Challenges",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("intermediate");
      var ch = AV.data.impl.challenges;
      var cur = 0;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Implementation · Debug</div>' +
          '<h1 class="module-title">Diagnose the failure from the evidence</h1>' +
          '<p class="module-subtitle">Most "the API is broken" tickets are a header, a token, or a status code away from being solved. Read the symptom and evidence, take the hints only if you need them, then reveal the answer.</p></div>' +

        '<div class="lab-2col wide-right">' +
          '<div class="panel"><div class="panel-title">Challenges</div><ol class="ch-list" id="ch-list">' +
            ch.map(function (c, i) { return '<li class="ch-item' + (i === 0 ? " active" : "") + '" data-i="' + i + '">' + c.title + "</li>"; }).join("") + "</ol></div>" +
          '<div id="ch-main"></div>' +
        "</div>";

      var listEl = container.querySelector("#ch-list");
      var mainEl = container.querySelector("#ch-main");

      function evidence(c) {
        var e = EVID[c.id];
        if (!e) {
          // code-level bug (undefined body): show a log/stack
          return '<div class="code-block"><div class="code-block-header"><span>server log</span><span>runtime</span></div><div class="code-block-body"><code>' +
            '<span class="code-line">POST /v1/orders 500</span>' +
            '<span class="code-line">TypeError: Cannot read properties of undefined (reading \'customerId\')</span>' +
            '<span class="code-line">    at createOrder (/app/routes/orders.js:12)</span></code></div></div>';
        }
        var res;
        if (e.forceMalformed) res = { response: { status: 400, statusText: "Bad Request", headers: { "Content-Type": "application/problem+json" }, body: { title: "Malformed JSON body", status: 400, code: "MALFORMED_JSON" } } };
        else res = AV.HttpSim.run(e.req, { reuseConn: true, inject: e.inject });
        var r = res.response;
        var cls = "st-" + Math.floor((r.status || 0) / 100) + "xx";
        return '<div class="http-msg"><div class="http-msg-head"><span>' + e.req.method + " " + e.req.path + '</span><span class="status-pill ' + cls + '">' + r.status + "</span></div>" +
          '<div class="http-msg-body">' + Object.keys(r.headers || {}).map(function (k) { return '<span class="http-hdr-key">' + k + '</span>: <span class="http-hdr-val">' + String(r.headers[k]) + "</span>"; }).join("\n") + (r.body != null ? "\n\n" + AV.fmtJSON(r.body) : "") + "</div></div>";
      }

      function render() {
        var c = ch[cur];
        mainEl.innerHTML =
          '<div class="panel"><div class="panel-title">' + c.title + "</div>" +
            '<p><b>Symptom.</b> ' + c.symptom + "</p>" +
            '<p class="text-muted text-sm"><b>Clue:</b> ' + c.clue + "</p>" +
            '<div class="panel-title" style="margin-top:var(--space-4)">Evidence</div>' + evidence(c) +
            '<div style="margin-top:var(--space-4)"><button class="btn btn-ghost btn-sm" id="ch-hint">💡 Reveal a hint</button> ' +
              '<button class="btn btn-primary btn-sm" id="ch-answer">Reveal answer</button></div>' +
            '<div id="ch-hints" style="margin-top:var(--space-3)"></div>' +
            '<div id="ch-sol"></div>' +
          "</div>";
        var shown = 0;
        var hintsEl = mainEl.querySelector("#ch-hints");
        mainEl.querySelector("#ch-hint").addEventListener("click", function () {
          if (shown >= c.hints.length) return;
          hintsEl.insertAdjacentHTML("beforeend", '<div class="callout info" style="margin-bottom:var(--space-2)"><span class="callout-icon">💡</span><div class="callout-body">' + c.hints[shown] + "</div></div>");
          shown++;
          if (shown >= c.hints.length) mainEl.querySelector("#ch-hint").disabled = true;
        });
        mainEl.querySelector("#ch-answer").addEventListener("click", function () {
          mainEl.querySelector("#ch-sol").innerHTML =
            '<div class="callout tip" style="margin-top:var(--space-3)"><span class="callout-icon">✅</span><div class="callout-body"><b>Diagnosis:</b> ' + c.answer + "</div></div>" +
            '<div class="callout" style="margin-top:var(--space-2);border-left:3px solid var(--airflow)"><span class="callout-icon">🔧</span><div class="callout-body"><b>Fix &amp; why:</b> ' + c.explain + "</div></div>";
          this.disabled = true;
        });
        listEl.querySelectorAll(".ch-item").forEach(function (el, i) { el.classList.toggle("active", i === cur); });
      }
      listEl.addEventListener("click", function (e) { var li = e.target.closest(".ch-item"); if (li) { cur = parseInt(li.getAttribute("data-i"), 10); render(); } });
      render();
    },
    destroy: function () {}
  };

  AV.registerModule(module);
})();
