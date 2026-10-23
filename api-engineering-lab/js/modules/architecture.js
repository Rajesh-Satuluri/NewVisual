/* ============================================================
   modules/architecture.js — API Architecture Explorer (flagship)
   Clickable ShopSphere architecture (ArchDiagram) with a detail
   panel, an animated end-to-end checkout trace (AnimationEngine),
   and an architecture-style comparison (monolith → event-driven).
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // Checkout trace: each step lights nodes + edges.
  var TRACE = [
    { label: "Client → gateway", nodes: ["web", "lb", "gateway"], edges: [["web", "lb"], ["lb", "gateway"]], note: "The mobile app's POST /v1/orders reaches the gateway via the load balancer." },
    { label: "Verify token", nodes: ["gateway", "idp"], edges: [["gateway", "idp"]], note: "The gateway verifies the access token with the identity provider and attaches a request id." },
    { label: "Route to order service", nodes: ["gateway", "order"], edges: [["gateway", "order"]], note: "Authenticated + under quota, the request is routed to the order service." },
    { label: "Validate price", nodes: ["order", "product", "cache"], edges: [["order", "product"], ["product", "cache"]], note: "The order service re-checks prices against the catalog (cached) — it never trusts a client price." },
    { label: "Reserve inventory", nodes: ["order", "inventory"], edges: [["order", "inventory"]], note: "Inventory is reserved for the items so two shoppers can't buy the last unit." },
    { label: "Persist order", nodes: ["order", "db"], edges: [["order", "db"]], note: "The order is written to the DB in a transaction; a unique constraint + idempotency key prevent duplicates." },
    { label: "Charge payment", nodes: ["order", "payment", "provider"], edges: [["order", "payment"], ["payment", "provider"]], note: "Payment integration calls the external provider. This is outside our transaction — handled with a state machine + webhook." },
    { label: "Publish event", nodes: ["order", "broker"], edges: [["order", "broker"]], note: "An order.created event is published to the broker — fulfillment and notification react asynchronously." },
    { label: "Async fan-out", nodes: ["broker", "fulfill", "notify"], edges: [["broker", "fulfill"], ["broker", "notify"]], note: "Fulfillment and notification consume the event independently — they don't block the customer's response." },
    { label: "Respond 201", nodes: ["order", "gateway", "web"], edges: [["order", "gateway"], ["gateway", "web"] ], note: "A 201 with the new order id returns to the app — even before fulfillment finishes." }
  ];

  var MODES = [
    { k: "Monolith", pro: "Simple to build, deploy, and reason about; one codebase, one transaction.", con: "Scales as one unit; a change anywhere risks everything; team coupling.", when: "Early stage, small team, unproven product." },
    { k: "Modular monolith", pro: "Clear internal module boundaries, still one deploy + easy transactions.", con: "Still deploys as one unit; boundaries need discipline.", when: "Most teams, most of the time — a great default." },
    { k: "Microservices", pro: "Independent deploy + scaling per service; team autonomy.", con: "Distributed-systems tax: network failures, eventual consistency, ops overhead.", when: "Large orgs with clear domains and strong platform/observability." },
    { k: "Gateway + BFF", pro: "One front door; a backend-for-frontend tailors payloads per client (web vs mobile).", con: "Another layer to run; BFFs can drift.", when: "Multiple distinct clients needing different shapes." },
    { k: "Event-driven", pro: "Loose coupling, resilience, natural async workflows (fulfillment, notifications).", con: "Harder to trace/debug; eventual consistency; needs a broker.", when: "Workflows with async steps and independent consumers." },
    { k: "Hybrid sync + async", pro: "Sync request-response where the user waits; async events for the rest.", con: "Two mental models to operate.", when: "Realistic large systems — ShopSphere is this." }
  ];

  var module = {
    id: "architecture",
    title: "Architecture Explorer",
    fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _offStep: null,

    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("advanced");
      var self = this;
      var arch = AV.data.shopsphere.architecture;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Architecture</div>' +
          '<h1 class="module-title">How a checkout flows through the ShopSphere platform</h1>' +
          '<p class="module-subtitle">Press play to trace a <code>POST /v1/orders</code> across the gateway, services, database, broker, and the external payment provider. Click any component to inspect its responsibility, I/O, and failure modes.</p></div>' +

        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="arch-canvas"></div>' +
          '<aside class="arch-detail" id="arch-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="arch-controls"></div>' +

        '<section class="section" style="margin-top:var(--space-8)"><h2 class="section-title">Architecture styles — trade-offs</h2>' +
          '<p class="panel-sub">There is no universally best style. Microservices are not automatically superior — they trade simplicity for independence and add a distributed-systems tax.</p>' +
          '<div class="note-grid">' + MODES.map(function (m) {
            return '<div class="panel"><div class="panel-title">' + m.k + "</div>" +
              '<dl class="kv"><dt>Pros</dt><dd>' + m.pro + "</dd><dt>Cons</dt><dd>" + m.con + "</dd><dt>Use when</dt><dd>" + m.when + "</dd></dl></div>";
          }).join("") + "</div></section>";

      var canvas = container.querySelector("#arch-canvas");
      var detail = container.querySelector("#arch-detail");
      var controlsMount = container.querySelector("#arch-controls");

      var diagram = AV.ArchDiagram.create({ nodes: arch.nodes, edges: arch.edges, viewBox: arch.viewBox, onSelect: showNode });
      canvas.appendChild(diagram.el);
      this._diagram = diagram;

      function defaultDetail() {
        detail.innerHTML = '<div class="arch-detail-title">The platform at a glance</div>' +
          "<p>ShopSphere separates the <b>front door</b> (gateway + identity) from <b>domain services</b> (order, product, inventory, payment, fulfillment) from <b>state</b> (DB, cache) and <b>events</b> (broker). Some steps are synchronous (the customer waits); others are asynchronous (fulfillment, notifications).</p>" +
          '<p class="text-muted text-sm" style="margin-top:var(--space-3)">Press <kbd>Space</kbd> to trace a checkout · click any box to inspect it.</p>';
      }
      function showNode(id) {
        var d = arch.detail[id]; if (!d) return;
        var checks = d.checks ? '<div class="arch-detail-sub">What it does</div><ul class="arch-check-list">' + d.checks.map(function (c) { return "<li>" + c + "</li>"; }).join("") + "</ul>" : "";
        var biz = d.business ? '<div class="callout info arch-biz"><span class="callout-icon">🛒</span><div class="callout-body"><b>ShopSphere:</b> ' + d.business + "</div></div>" : "";
        var note = d.note ? '<div class="callout tip" style="margin-top:var(--space-3)"><span class="callout-icon">💡</span><div class="callout-body">' + d.note.text + "</div></div>" : "";
        detail.innerHTML = '<div class="arch-detail-title">' + d.title + "</div><p>" + (d.plain || "") + "</p>" + checks + biz + note;
      }
      function showStep(i) {
        diagram.clearSelection();
        if (i < 0) { defaultDetail(); return; }
        var s = TRACE[i];
        detail.innerHTML = '<div class="arch-detail-title">Step ' + (i + 1) + " / " + TRACE.length + ": " + s.label + "</div><p>" + s.note + "</p>" +
          '<p class="text-muted text-sm" style="margin-top:var(--space-3)">' + (i === 6 ? "Note: the payment provider is external — its outcome can be uncertain, which is why ShopSphere uses a webhook to reconcile." : i === 8 ? "These run after the response — the customer isn't kept waiting." : "") + "</p>";
      }

      var steps = TRACE.map(function (s) { return { label: s.label, duration: 2200 }; });
      var engine = new AV.AnimationEngine({ steps: steps, speed: 1 });
      this._engine = engine;
      this._offStep = engine.on("stepchange", function (i) {
        if (i < 0) { diagram.clear(); showStep(-1); return; }
        var s = TRACE[i];
        diagram.setActive(s.nodes, s.edges);
        showStep(i);
      });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — trace a checkout" });
      controlsMount.appendChild(controls.el);
      this._controls = controls;
      defaultDetail();
    },

    destroy: function () {
      if (this._offStep) this._offStep();
      if (this._controls) this._controls.destroy();
      if (this._engine) this._engine.destroy();
      if (this._diagram) this._diagram.destroy();
      this._engine = this._controls = this._diagram = this._offStep = null;
    }
  };

  AV.registerModule(module);
})();
