/* ============================================================
   modules/observability.js — Observability
   Logs vs metrics vs traces, correlation id vs distributed trace id,
   and an SLO / error-budget panel. Illustrative values.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var module = {
    id: "observability",
    title: "Observability",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("advanced");
      var slos = AV.data.perf.slos;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Performance · Ops</div>' +
          '<h1 class="module-title">You can\'t operate what you can\'t see</h1>' +
          '<p class="module-subtitle">Logs, metrics, and traces answer different questions. Together with correlation + trace ids and SLOs, they turn a 2 a.m. outage from guesswork into a diagnosis.</p></div>' +

        '<div class="tabstrip">' + T("three", "Logs · Metrics · Traces", true) + T("ids", "Correlation vs Trace IDs") + T("slo", "SLOs & error budget") + "</div>" +

        P("three", true,
          '<div class="note-grid">' +
            pillar("📝 Logs", "Discrete events with context.", "Answers: <i>what happened for this one request?</i>", "Structured JSON, one line per event, keyed by request id. High detail, high volume.") +
            pillar("📊 Metrics", "Aggregated numbers over time.", "Answers: <i>how is the system behaving overall?</i>", "Request rate, error rate, latency percentiles. Cheap to store, great for alerts + dashboards.") +
            pillar("🔗 Traces", "One request across many services.", "Answers: <i>where did the time go across services?</i>", "A tree of spans sharing a trace id. Reveals the slow hop in a distributed call.") +
          "</div>" +
          '<div class="panel" style="margin-top:var(--space-4)"><div class="panel-title">The three, for one slow checkout</div>' +
            '<div class="code-block"><div class="code-block-header"><span>structured log</span><span>order-service</span></div><div class="code-block-body"><code>' +
            '<span class="code-line">{"ts":"...","level":"warn","reqId":"req-7f3a21","traceId":"abc123","msg":"payment slow","ms":842}</span></code></div></div>' +
            '<div class="obs-trace" style="margin-top:var(--space-3)">' +
              span("gateway", 6, 2) + span("order-service", 60, 6) + span("inventory", 20, 24) + span("payment → provider", 820, 44, true) + span("db write", 30, 90) +
            "</div><p class=\"text-muted text-sm\" style=\"margin-top:var(--space-2)\">Trace timeline (simulated): the payment→provider span dominates — that's your culprit.</p>" +
          "</div>"
        ) +

        P("ids", false,
          '<div class="lab-2col">' +
            '<div class="panel"><div class="panel-title">Correlation ID (request id)</div><p>One id for <b>one request</b> as it flows through your logs. You generate it at the edge (or accept the client\'s) and attach it to every log line.</p><div class="http-msg"><div class="http-msg-body mono">X-Request-ID: req-7f3a21</div></div></div>' +
            '<div class="panel"><div class="panel-title">Distributed trace ID</div><p>One id for <b>a whole operation across services</b>, with child <b>span ids</b> per hop. Propagated via trace headers (W3C <code>traceparent</code>).</p><div class="http-msg"><div class="http-msg-body mono">traceparent: 00-abc123...-span01-01</div></div></div>' +
          "</div>" +
          '<div class="callout warn" style="margin-top:var(--space-4)"><span class="callout-icon">🧩</span><div class="callout-body"><b>They\'re related but not interchangeable.</b> A correlation id ties together the logs of a single request; a trace id ties together the spans of an operation across many services (which may span many requests). Good systems carry both and link them.</div></div>'
        ) +

        P("slo", false,
          '<p class="panel-sub">An SLO is a target you hold yourself to; the gap below 100% is your <b>error budget</b> — spend it on shipping.</p>' +
          '<div class="note-grid">' + slos.map(function (s) { return '<div class="panel"><div class="panel-title">' + s.k + '</div><p class="mono" style="color:var(--airflow-bright)">' + s.ex + "</p><p class=\"text-muted text-sm\">" + s.note + "</p></div>"; }).join("") + "</div>" +
          '<div class="panel" style="margin-top:var(--space-4)"><div class="panel-title">Observability panel (illustrative)</div><div class="stat-row">' +
            stat("1,240", "req / min") + stat("0.04%", "error rate", "good") + stat("96 ms", "p50") + stat("280 ms", "p95") + stat("640 ms", "p99", "warn") +
          "</div></div>" +
          '<div class="callout info" style="margin-top:var(--space-4)"><span class="callout-icon">🎯</span><div class="callout-body">Alert on <b>symptoms users feel</b> (error rate, p95/p99 latency, availability) against the SLO — not on every CPU blip. When the error budget is nearly spent, freeze risky releases until reliability recovers.</div></div>'
        );

      AV.ui.wireTabs(container);
    },
    destroy: function () {}
  };

  function T(id, l, a) { return '<button class="tab' + (a ? " active" : "") + '" data-tab="' + id + '">' + l + "</button>"; }
  function P(id, a, inner) { return '<div class="tab-panel' + (a ? " active" : "") + '" data-tab="' + id + '">' + inner + "</div>"; }
  function pillar(t, lead, q, d) { return '<div class="panel"><div class="panel-title">' + t + '</div><p><b>' + lead + "</b></p><p>" + q + "</p><p class=\"text-muted text-sm\">" + d + "</p></div>"; }
  function span(label, ms, left, hot) { var w = Math.max(3, Math.min(60, ms / 15)); return '<div class="obs-span"><span class="obs-span-label">' + label + '</span><span class="obs-span-bar" style="margin-left:' + left + '%;width:' + w + '%;background:' + (hot ? "var(--orange)" : "var(--airflow)") + '"></span><span class="obs-span-ms">' + ms + "ms</span></div>"; }
  function stat(n, l, kind) { var c = kind === "good" ? "var(--green)" : kind === "warn" ? "var(--orange)" : "var(--airflow-bright)"; return '<div class="stat"><div class="stat-num" style="color:' + c + '">' + n + '</div><div class="stat-label">' + l + "</div></div>"; }

  AV.registerModule(module);
})();
