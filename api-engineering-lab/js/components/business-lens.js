/* ============================================================
   business-lens.js — the recurring ShopSphere business example
   Appended below concept modules by the router so the same
   enterprise e-commerce platform illustrates each API concept
   in a concrete business context. Keys are module route ids.
   AirflowViz.BusinessLens.append(container, moduleId)
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var DATA = {
    fundamentals: {
      op: "POST /v1/orders", system: "Order Service",
      meaning: "A controlled door between the app and the business.",
      point: "When a shopper taps <b>Place Order</b>, the app never touches order tables directly — it calls the order API, which validates identity, re-checks price, reserves stock, and records the order. The API is the <b>contract</b> that lets five teams and three external partners integrate without stepping on each other."
    },
    "http-lab": {
      op: "POST /v1/orders", system: "Gateway → Order Service → DB",
      meaning: "One checkout request, traced end to end.",
      point: "Checkout is a single HTTP request that crosses DNS, TLS, the gateway, auth, validation, business logic, and the database before a <code>201 Created</code> comes back. Knowing exactly where the time (and the failures) live is what lets ShopSphere keep checkout fast and debuggable."
    },
    "http-methods": {
      op: "GET / POST / PUT / PATCH / DELETE /v1/orders", system: "Order Service",
      meaning: "The verb communicates intent and retry-safety.",
      point: "Reading an order (GET) is safe to repeat; creating one (POST) is not — which is exactly why ShopSphere adds an idempotency key to checkout. Picking the right method per action is what makes the order API predictable for the mobile and partner clients."
    },
    "status-codes": {
      op: "201 · 409 · 422 · 429 · 504", system: "Order Service",
      meaning: "The status code tells the client what to do next.",
      point: "A <code>201</code> means the order exists; a <code>409</code> means a duplicate; a <code>429</code> means back off; a <code>504</code> means retry carefully. ShopSphere's mobile app branches its entire UX on these codes, so using them correctly is a product decision, not just a technical one."
    },
    "json-lab": {
      op: "application/json bodies", system: "All services",
      meaning: "The shared data shape every client parses.",
      point: "Every ShopSphere client — web, mobile, partner — parses the same JSON order shape. A malformed body or a surprise <code>null</code> breaks checkout on someone's device, so schema validation at the edge protects the whole platform."
    },
    "rest-resources": {
      op: "/v1/orders/{id}/items", system: "Order Service",
      meaning: "URLs name things; methods act on them.",
      point: "ShopSphere models orders, items, payments, and shipments as resources with consistent, pluralized paths. A clean resource model is what lets a new partner integrate from the docs alone, without a kickoff call."
    },
    "endpoint-designer": {
      op: "GET /v1/orders?status=PAID&limit=20", system: "Order Service",
      meaning: "Good design is a contract that ages well.",
      point: "Verb-free paths, consistent pluralization, documented error codes, and bounded collections are the difference between an API partners love and one they file tickets against. ShopSphere reviews every new endpoint against these rules before it ships."
    },
    pagination: {
      op: "GET /v1/orders?cursor=…&limit=20", system: "Order Service + DB",
      meaning: "Return thousands of orders without melting the DB.",
      point: "A customer-support agent scrolling a customer's 2,000 orders can't get them all in one response. Cursor pagination keeps each page fast and stable even as new orders arrive mid-scroll — offset pagination would duplicate or skip rows."
    },
    idempotency: {
      op: "POST /v1/orders  +  Idempotency-Key", system: "Order Service + DB",
      meaning: "A double-tap must not create two orders.",
      point: "On a flaky mobile connection the app retries checkout. Without an idempotency key, each retry creates a new order — and a new charge. The key + a unique DB record make the retry safe: the same request returns the same order."
    },
    versioning: {
      op: "/v1/orders → /v2/orders", system: "Gateway + Order Service",
      meaning: "Evolve the API without breaking old apps.",
      point: "ShopSphere can't force every phone to update at once. Versioning + additive changes let the new app use <code>/v2</code> while last year's app keeps calling <code>/v1</code> — nobody's checkout breaks on release day."
    },
    "error-design": {
      op: "422 application/problem+json", system: "All services",
      meaning: "Errors a client can act on, logs an engineer can trust.",
      point: "A consistent Problem Details error with a stable <code>code</code> and a <code>requestId</code> lets the mobile app show the right message and lets on-call find the exact failing request — without ever leaking a stack trace to the customer."
    },
    architecture: {
      op: "whole platform", system: "Gateway + services + data",
      meaning: "Who does what, and where a request flows.",
      point: "A checkout touches the gateway, identity, order, inventory, payment, the DB, the broker, and an external provider. Seeing the boundaries is what lets ShopSphere scale, secure, and debug each piece independently."
    },
    resilience: {
      op: "payment provider timeout", system: "Order ↔ Payment ↔ Provider",
      meaning: "One slow dependency must not take down checkout.",
      point: "When the external payment provider slows down, naive retries can pile on and turn a blip into an outage. Timeouts, bounded retries with backoff + jitter, and a circuit breaker let ShopSphere fail fast and recover instead of melting down."
    },
    protocols: {
      op: "order details query", system: "Clients ↔ services",
      meaning: "Pick the protocol that fits the job.",
      point: "ShopSphere serves mobile over REST, fetches rich order+shipment+customer views with GraphQL, and runs internal service-to-service calls over gRPC. Each choice is a trade-off in latency, caching, and tooling — not a one-size-fits-all."
    },
    "realtime-protocols": {
      op: "payment.succeeded webhook", system: "Provider → Order Service",
      meaning: "Async events decouple slow or external steps.",
      point: "Payment confirmation, live order tracking, and warehouse hand-off are asynchronous. Webhooks, WebSockets, and a message broker let ShopSphere react to events that arrive late, out of order, or twice — without blocking the customer."
    },
    "protocol-matrix": {
      op: "choose per use case", system: "Platform-wide",
      meaning: "Match requirements to the right approach.",
      point: "Browser reach, streaming, caching, and operational cost pull in different directions. ShopSphere's architects weigh them per feature rather than standardizing on one protocol everywhere."
    },
    "express-workshop": {
      op: "POST /v1/orders (Node + Express)", system: "Order Service",
      meaning: "From a bare server to a production-shaped API.",
      point: "The same order endpoint, built up stage by stage — routing, validation, auth, idempotency, structured logging — mirrors how ShopSphere's real Node services are structured so the lessons transfer straight to the codebase."
    },
    "testing-workbench": {
      op: "run the ShopSphere collection", system: "All endpoints",
      meaning: "Exercise the API like a real client.",
      point: "Before shipping, ShopSphere engineers run the same request collection — browse, create, pay, ship — chaining IDs between calls, exactly as the mobile app would. Catching a 400 here is far cheaper than catching it in production."
    },
    "testing-challenges": {
      op: "why is this returning 401 / 400 / 429?", system: "Order Service",
      meaning: "Diagnose from the evidence, not guesses.",
      point: "Most 'the API is broken' tickets are a missing header, an expired token, or a tripped rate limit. Reading the status code and response body first is the skill that resolves ShopSphere support tickets in minutes instead of hours."
    },
    "openapi-studio": {
      op: "openapi.yaml for /v1/orders", system: "Contract",
      meaning: "One spec drives docs, SDKs, and tests.",
      point: "ShopSphere's OpenAPI document is the single contract partners read, clients are generated from, and contract tests check against. When the spec changes, everyone downstream sees it — which is exactly the point."
    }
  };

  function row(k, v, mono) {
    return '<div class="lens-row"><span class="lens-k">' + k + "</span>" +
      (mono ? '<code class="lens-v-mono">' + v + "</code>" : '<span class="lens-v">' + v + "</span>") + "</div>";
  }

  function create(id) {
    var d = DATA[id];
    if (!d) return null;
    var sec = document.createElement("section");
    sec.className = "section lens-section animate-fade-in";
    sec.innerHTML =
      '<div class="lens-card">' +
        '<div class="lens-head">' +
          '<span class="lens-badge">🛒 Real business example</span>' +
          '<span class="lens-head-title">How this shows up in ShopSphere\'s API platform</span>' +
        "</div>" +
        '<div class="lens-grid">' +
          '<div class="lens-meta">' +
            row("Operation", d.op, true) +
            row("Business meaning", d.meaning, false) +
            row("System", d.system, false) +
          "</div>" +
          '<div class="lens-point"><p>' + d.point + "</p>" +
            '<a class="lens-link" href="#business-scenario">See the full ShopSphere order journey →</a>' +
          "</div>" +
        "</div>" +
      "</div>";
    return sec;
  }

  function append(container, id) { if (!container) return; var el = create(id); if (el) container.appendChild(el); }
  AV.BusinessLens = { create: create, append: append, has: function (id) { return !!DATA[id]; } };
})();
