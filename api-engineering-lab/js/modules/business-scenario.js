/* ============================================================
   modules/business-scenario.js — ShopSphere Enterprise Business Case
   The centerpiece: context + stakeholders, interactive architecture,
   the 10-step order journey, an interactive order state machine, and
   the 10 failure scenarios with (fictional) business-impact panels.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // Fictional, clearly-simulated business impact per scenario.
  var IMPACT = {
    A: { orders: 320, customers: "~310 double-charged", revenue: "₹9.6L at risk (refundable)", err: "2.1%", recover: "15 min", resp: "Refund duplicates, add idempotency key" },
    B: { orders: 48, customers: "48 paid, no order shown", revenue: "₹7.2L in limbo", err: "0.3%", recover: "30 min", resp: "Reconcile via webhook + status lookup" },
    C: { orders: 12, customers: "12 oversold", revenue: "₹1.8L backorder cost", err: "0.1%", recover: "2 hr", resp: "Atomic reservation, cancel + apologize" },
    D: { orders: 0, customers: "none (deduped)", revenue: "₹0 (caught)", err: "0%", recover: "n/a", resp: "Dedup already prevented impact" },
    E: { orders: 1400, customers: "checkout degraded 20 min", revenue: "₹42L delayed", err: "6.8%", recover: "20 min", resp: "Circuit breaker + pending reconcile" },
    F: { orders: 5200, customers: "old-app users blocked", revenue: "₹61L/day exposure", err: "4.4%", recover: "4 hr (rollback)", resp: "Rollback, ship behind /v2" },
    G: { orders: 0, customers: "other clients slowed", revenue: "₹3L peak risk", err: "1.2%", recover: "5 min", resp: "Throttle partner, 429 + Retry-After" },
    H: { orders: 0, customers: "data exposure (severity high)", revenue: "regulatory + trust", err: "n/a", recover: "immediate patch", resp: "Add ownership checks, audit, disclose" },
    I: { orders: 0, customers: "search p95 2.4s", revenue: "conversion drop ~8%", err: "0.2%", recover: "1 day (index+cache)", resp: "Index, cursor paginate, cache" },
    J: { orders: 90, customers: "90 wrong-state orders", revenue: "ops rework", err: "0.4%", recover: "1 hr", resp: "Validate transitions, replay events" }
  };

  var module = {
    id: "business-scenario",
    title: "ShopSphere Business Case",
    fullWidth: true,
    _diagram: null,

    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("senior");
      var s = AV.data.shopsphere;
      var journey = AV.data.business.journey;
      var scenarios = AV.data.business.scenarios;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Enterprise Business Case</div>' +
          '<h1 class="module-title">🛒 ShopSphere — an e-commerce & fulfillment API platform</h1>' +
          '<p class="module-subtitle">' + s.context + " Everything in this lab ties back here. All figures are <b>fictional simulation data</b>, not real metrics.</p></div>" +

        '<div class="tabstrip">' + T("context", "Context & stakeholders", true) + T("arch", "Architecture") + T("journey", "Order journey") + T("states", "Order state machine") + T("fail", "Failure scenarios") + "</div>" +

        P("context", true,
          '<p class="panel-sub">Every stakeholder needs something different from the platform — and each has a failure mode.</p>' +
          '<div class="panel" style="overflow-x:auto"><table class="dtable"><thead><tr><th>Stakeholder</th><th>Needs from the API</th><th>What goes wrong if unmet</th></tr></thead><tbody>' +
          s.stakeholders.map(function (x) { return "<tr><td><b>" + x.who + "</b></td><td>" + x.needs + "</td><td>" + x.risk + "</td></tr>"; }).join("") + "</tbody></table></div>" +
          '<div class="note-grid" style="margin-top:var(--space-4)">' +
            mini("What ShopSphere sells", "Consumer products across regions (IN/US/EU/APAC), via web, mobile, and B2B partners.") +
            mini("Why it's the spine", "Idempotency, pagination, webhooks, OAuth, versioning, rate limiting, and tracing all show up in one coherent system here.") +
            mini("Fictional + realistic", "The company is invented, but the workflows and engineering practices are real.") +
          "</div>"
        ) +

        P("arch", false,
          '<p class="panel-sub">The platform at a glance — the same architecture explored in depth in the Architecture module.</p>' +
          '<div class="arch-canvas" id="bs-arch"></div>' +
          '<p class="text-muted text-sm" style="margin-top:var(--space-3)">Open the <a href="#architecture">Architecture Explorer</a> to trace a checkout step-by-step and inject failures.</p>'
        ) +

        P("journey", false,
          '<p class="panel-sub">The complete "place an order" flow, end to end. Step through it.</p>' +
          '<div class="panel"><div class="bs-journey" id="bs-journey"></div>' +
            '<div class="oauth-nav"><button class="btn btn-ghost btn-sm" id="bj-prev">← Prev</button><span id="bj-pos" class="mono"></span><button class="btn btn-primary btn-sm" id="bj-next">Next →</button></div></div>'
        ) +

        P("states", false,
          '<p class="panel-sub">An order moves through a state machine. Trigger events — invalid transitions are blocked (unless a failure scenario deliberately forces one).</p>' +
          '<div class="lab-2col wide-right">' +
            '<div class="arch-canvas" id="bs-sm"></div>' +
            '<aside class="sticky-side panel"><div class="panel-title">Current state: <span id="sm-cur" class="mono">PENDING</span></div>' +
              '<div class="panel-sub">Available events</div><div class="chiprow" id="sm-events"></div>' +
              '<div id="sm-msg" style="margin-top:var(--space-3)"></div>' +
              '<button class="btn btn-ghost btn-sm" id="sm-reset" style="margin-top:var(--space-3)">↺ Reset to PENDING</button></aside>' +
          "</div>"
        ) +

        P("fail", false,
          '<p class="panel-sub">Ten production failure modes. Pick one to see what it teaches, how to fix it, and a <i>fictional</i> business-impact estimate.</p>' +
          '<div class="lab-2col wide-right">' +
            '<div class="panel"><div class="panel-title">Scenarios</div><ol class="ch-list" id="bs-scn">' +
              scenarios.map(function (sc, i) { return '<li class="ch-item' + (i === 0 ? " active" : "") + '" data-i="' + i + '"><b>' + sc.id + "</b> · " + sc.title + "</li>"; }).join("") + "</ol></div>" +
            '<aside class="sticky-side" id="bs-scn-out"></aside>' +
          "</div>"
        );

      AV.ui.wireTabs(container);

      // architecture mini (static, non-animated)
      var diagram = AV.ArchDiagram.create({ nodes: s.architecture.nodes, edges: s.architecture.edges, viewBox: s.architecture.viewBox, onSelect: function () {} });
      this._diagram = diagram;
      container.querySelector("#bs-arch").appendChild(diagram.el);

      // journey stepper
      var jEl = container.querySelector("#bs-journey");
      var jPos = container.querySelector("#bj-pos");
      var ji = 0;
      function renderJourney() {
        var st = journey[ji];
        jEl.innerHTML = '<div class="bs-step-head"><span class="method-pill m-' + methodClass(st.m) + '">' + st.m + '</span><span class="mono">' + st.p + "</span></div>" +
          '<div class="bs-step-title">Step ' + st.n + " · " + st.title + "</div>" +
          "<p>" + st.detail + "</p>" +
          '<div class="callout tip"><span class="callout-icon">💡</span><div class="callout-body">' + st.note + "</div></div>" +
          '<div class="bs-dots">' + journey.map(function (_, k) { return '<span class="bs-dot' + (k === ji ? " active" : k < ji ? " done" : "") + '"></span>'; }).join("") + "</div>";
        jPos.textContent = "step " + (ji + 1) + " / " + journey.length;
        container.querySelector("#bj-prev").disabled = ji === 0;
        container.querySelector("#bj-next").disabled = ji === journey.length - 1;
      }
      container.querySelector("#bj-prev").addEventListener("click", function () { if (ji > 0) { ji--; renderJourney(); } });
      container.querySelector("#bj-next").addEventListener("click", function () { if (ji < journey.length - 1) { ji++; renderJourney(); } });
      renderJourney();

      // state machine
      var sm = AV.StateMachine.create(s.orderStates);
      container.querySelector("#bs-sm").appendChild(sm.el);
      var curState = "PENDING";
      function transitionsFrom(st) { return s.orderStates.transitions.filter(function (t) { return t.from === st; }); }
      function renderSM() {
        sm.setActive(curState);
        container.querySelector("#sm-cur").textContent = curState;
        var evs = transitionsFrom(curState);
        container.querySelector("#sm-events").innerHTML = evs.length
          ? evs.map(function (t) { return '<button class="chip" data-to="' + t.to + '">' + t.label + " → " + t.to + "</button>"; }).join("")
          : '<span class="text-muted">Terminal state — no further transitions.</span>';
      }
      container.querySelector("#sm-events").addEventListener("click", function (e) {
        var b = e.target.closest(".chip"); if (!b) return;
        var to = b.getAttribute("data-to");
        sm.flow(curState, to); curState = to; renderSM();
        container.querySelector("#sm-msg").innerHTML = '<div class="callout tip"><span class="callout-icon">✅</span><div class="callout-body">Transitioned to <b>' + to + '</b>.</div></div>';
      });
      container.querySelector("#sm-reset").addEventListener("click", function () { curState = "PENDING"; renderSM(); container.querySelector("#sm-msg").innerHTML = ""; });
      renderSM();

      // failure scenarios
      var scnOut = container.querySelector("#bs-scn-out");
      function showScn(i) {
        var sc = scenarios[i]; var im = IMPACT[sc.id];
        scnOut.innerHTML =
          '<div class="panel"><div class="panel-title">Scenario ' + sc.id + " · " + sc.title + "</div>" +
            "<p><b>Situation.</b> " + sc.situation + "</p>" +
            '<p><b>Teaches.</b> ' + sc.teaches + "</p>" +
            "<p>" + sc.detail + "</p>" +
            '<div class="callout tip"><span class="callout-icon">🛠️</span><div class="callout-body"><b>Mitigation:</b> ' + sc.mitigation + "</div></div>" +
            '<a class="btn btn-ghost btn-sm" href="' + sc.link + '" style="margin-top:var(--space-2)">Open the relevant lab →</a>' +
          "</div>" +
          '<div class="panel"><div class="panel-title">Business impact <span class="text-muted">(fictional simulation)</span></div>' +
            '<dl class="kv"><dt>Affected orders</dt><dd class="mono">' + im.orders + "</dd>" +
            "<dt>Customer impact</dt><dd>" + im.customers + "</dd>" +
            "<dt>Revenue exposure</dt><dd>" + im.revenue + "</dd>" +
            "<dt>Error rate</dt><dd class=\"mono\">" + im.err + "</dd>" +
            "<dt>Recovery time</dt><dd class=\"mono\">" + im.recover + "</dd>" +
            "<dt>Ops response</dt><dd>" + im.resp + "</dd></dl>" +
            '<p class="text-muted text-sm" style="margin-top:var(--space-2)">Engineers estimate impact from affected-request counts × average order value × duration — not from invented certainty. These numbers are illustrative.</p></div>';
      }
      container.querySelector("#bs-scn").addEventListener("click", function (e) {
        var li = e.target.closest(".ch-item"); if (!li) return;
        container.querySelectorAll("#bs-scn .ch-item").forEach(function (x) { x.classList.toggle("active", x === li); });
        showScn(parseInt(li.getAttribute("data-i"), 10));
      });
      showScn(0);
    },

    destroy: function () { if (this._diagram) { this._diagram.destroy(); this._diagram = null; } }
  };

  function T(id, l, a) { return '<button class="tab' + (a ? " active" : "") + '" data-tab="' + id + '">' + l + "</button>"; }
  function P(id, a, inner) { return '<div class="tab-panel' + (a ? " active" : "") + '" data-tab="' + id + '">' + inner + "</div>"; }
  function mini(t, d) { return '<div class="panel"><div class="panel-title">' + t + "</div><p>" + d + "</p></div>"; }
  function methodClass(m) { var x = m.toLowerCase(); return (["get", "post", "put", "patch", "delete"].indexOf(x) !== -1) ? x : "head"; }

  AV.registerModule(module);
})();
