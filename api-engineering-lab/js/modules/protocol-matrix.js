/* ============================================================
   modules/protocol-matrix.js — Protocol Decision Matrix
   Pick requirements → a reasoned recommendation (not one universal
   winner) + a comparison table across the dimensions that matter.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var DIMS = [
    ["", "REST", "GraphQL", "gRPC", "WebSockets", "Webhooks", "Queue"],
    ["Browser-native", "✅", "✅", "⚠️ needs proxy", "✅", "✅ (receive)", "❌"],
    ["Data format", "JSON (text)", "JSON (text)", "Protobuf (binary)", "any", "JSON (text)", "any"],
    ["Streaming", "❌ (SSE separate)", "⚠️ subscriptions", "✅ native", "✅ bidirectional", "❌", "n/a"],
    ["HTTP caching", "✅ strong", "⚠️ hard", "❌", "❌", "n/a", "n/a"],
    ["Latency / payload", "good", "good", "best", "best (push)", "event-driven", "decoupled"],
    ["Coupling", "loose", "loose", "typed contract", "stateful", "loose", "very loose"],
    ["Ops complexity", "low", "medium", "medium", "high", "medium", "medium"]
  ];

  var QUESTIONS = [
    { id: "browser", q: "Called directly from a browser?" },
    { id: "stream", q: "Need realtime streaming / push?" },
    { id: "public", q: "Public / third-party consumers?" },
    { id: "internal", q: "Internal service-to-service, latency-critical?" },
    { id: "cache", q: "Benefits from HTTP caching (read-heavy)?" },
    { id: "varied", q: "Many varied client views composing entities?" },
    { id: "async", q: "Work is async / fire-and-forget (notify later)?" },
    { id: "external", q: "A third party must notify YOU of events?" }
  ];

  var module = {
    id: "protocol-matrix",
    title: "Protocol Decision Matrix",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("senior");

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Architecture · Protocols</div>' +
          '<h1 class="module-title">Choose the right protocol for the requirement</h1>' +
          '<p class="module-subtitle">There is no universal winner. Tick the constraints that apply and get a reasoned recommendation — then sanity-check it against the comparison table.</p></div>' +

        '<div class="lab-2col wide-right">' +
          '<div class="panel"><div class="panel-title">Your requirements</div><div id="pm-q">' +
            QUESTIONS.map(function (q) { return '<div class="field"><label><input type="checkbox" data-id="' + q.id + '"/> ' + q.q + "</label></div>"; }).join("") +
          "</div></div>" +
          '<aside class="sticky-side panel"><div class="panel-title">Recommendation</div><div id="pm-rec"></div></aside>' +
        "</div>" +

        '<section class="section" style="margin-top:var(--space-6)"><h2 class="section-title">Comparison matrix</h2>' +
          '<div class="panel" style="overflow-x:auto"><table class="dtable"><tbody>' +
          DIMS.map(function (row, ri) {
            return "<tr>" + row.map(function (c, ci) { return (ri === 0 || ci === 0) ? "<th>" + c + "</th>" : "<td>" + c + "</td>"; }).join("") + "</tr>";
          }).join("") + "</tbody></table></div>" +
          '<div class="callout info" style="margin-top:var(--space-4)"><span class="callout-icon">🧭</span><div class="callout-body">Real platforms mix protocols: ShopSphere serves mobile over <b>REST</b>, composes rich screens with <b>GraphQL</b>, runs internal calls over <b>gRPC</b>, pushes live tracking over <b>WebSockets</b>, receives payment confirmations via <b>webhooks</b>, and fans out fulfillment through a <b>queue</b>.</div></div>' +
        "</section>";

      var rec = container.querySelector("#pm-rec");
      function recommend() {
        var a = {}; container.querySelectorAll("#pm-q input").forEach(function (c) { a[c.getAttribute("data-id")] = c.checked; });
        var picks = [];
        if (a.external) picks.push(["Webhooks", "A third party notifying you of events is the textbook webhook case — just verify signatures and make the consumer idempotent."]);
        if (a.async) picks.push(["Message queue", "Fire-and-forget / fan-out work decouples best through a broker; the producer never waits on slow consumers."]);
        if (a.stream && a.browser) picks.push(["WebSockets (or SSE)", "Browser realtime: WebSockets for bidirectional, SSE if the push is server→client only and you want simpler + auto-reconnect."]);
        if (a.internal && !a.browser) picks.push(["gRPC", "Internal, latency-critical service-to-service calls benefit from binary Protobuf, typed contracts, and HTTP/2 streaming."]);
        if (a.varied && a.browser) picks.push(["GraphQL", "Many varied client views composing entities get exactly the fields they need in one round trip — mind N+1 and query cost."]);
        if ((a.public || a.cache) && !a.stream) picks.push(["REST", "Public, cacheable, read-heavy APIs are REST's sweet spot: ubiquitous, CDN-friendly, simple tooling."]);
        if (!picks.length) picks.push(["REST", "With no special constraints, REST is the sensible default: simple, cacheable, and understood everywhere."]);

        rec.innerHTML = picks.map(function (p, i) {
          return '<div class="callout ' + (i === 0 ? "tip" : "info") + '" style="margin-bottom:var(--space-2)"><span class="callout-icon">' + (i === 0 ? "⭐" : "➕") + '</span><div class="callout-body"><b>' + p[0] + ".</b> " + p[1] + "</div></div>";
        }).join("") + '<p class="text-muted text-sm" style="margin-top:var(--space-2)">Multiple picks are normal — most systems combine protocols per use case.</p>';
      }
      container.querySelector("#pm-q").addEventListener("change", recommend);
      recommend();
    },
    destroy: function () {}
  };

  AV.registerModule(module);
})();
