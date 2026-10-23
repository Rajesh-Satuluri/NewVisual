/* ============================================================
   modules/home.js — Overview Dashboard
   Intro, progress stats, quick-launch cards, an interactive
   request-lifecycle diagram, and the recommended journey.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // High-level lifecycle nodes for the overview diagram.
  var LIFE = {
    viewBox: "0 0 980 220",
    nodes: [
      { id: "client", label: "Client", sub: "web / mobile", x: 20, y: 86, w: 110, h: 50, color: "cyan" },
      { id: "dns", label: "DNS", sub: "resolve host", x: 150, y: 86, w: 90, h: 50, color: "green" },
      { id: "tls", label: "TCP/TLS", sub: "secure channel", x: 258, y: 86, w: 100, h: 50, color: "green" },
      { id: "gateway", label: "Gateway", sub: "route·limit", x: 376, y: 86, w: 100, h: 50, color: "airflow" },
      { id: "auth", label: "Auth", sub: "who·what", x: 494, y: 86, w: 90, h: 50, color: "orange" },
      { id: "service", label: "Service", sub: "logic", x: 602, y: 86, w: 100, h: 50, color: "airflow" },
      { id: "data", label: "Database", sub: "or downstream", x: 720, y: 86, w: 110, h: 50, color: "green" },
      { id: "resp", label: "Response", sub: "back to client", x: 848, y: 86, w: 110, h: 50, color: "purple" }
    ],
    edges: [["client", "dns"], ["dns", "tls"], ["tls", "gateway"], ["gateway", "auth"], ["auth", "service"], ["service", "data"], ["data", "resp"], ["resp", "client", { dir: "both", curve: 70, label: "status + body" }]]
  };

  var DETAIL = {
    client: { title: "Client", resp: "Builds the request (method, path, headers, body) and interprets the response.", io: "Out: HTTP request · In: status + body", lat: "~1–2 ms to assemble", fail: "Wrong headers, no Content-Type, bad body." },
    dns: { title: "DNS resolution", resp: "Turns the hostname into an IP address.", io: "In: hostname · Out: IP", lat: "~0–20 ms (often cached)", fail: "NXDOMAIN, slow resolver.", note: "Cached or skipped on reused connections — not paid per request." },
    tls: { title: "TCP + TLS", resp: "Opens a socket and negotiates an encrypted channel for HTTPS.", io: "In: IP · Out: secure connection", lat: "~30–50 ms new; ~0 reused", fail: "Cert errors, handshake failure.", note: "Reused with keep-alive / HTTP-2 — a one-time cost, not per request." },
    gateway: { title: "API Gateway", resp: "Routes to the right service, enforces rate limits, attaches a request id.", io: "In: request · Out: forwarded request or 429", lat: "~5–10 ms", fail: "429 when over quota, routing misses." },
    auth: { title: "Authentication + Authorization", resp: "Verifies identity (authn) then permission (authz).", io: "In: credentials · Out: identity + scopes", lat: "~5–15 ms", fail: "401 (no/invalid creds) · 403 (not allowed)." },
    service: { title: "Application Service", resp: "Runs business logic — e.g. validates price server-side, builds the order.", io: "In: validated request · Out: result", lat: "~10–40 ms", fail: "500 on unhandled errors." },
    data: { title: "Database / downstream", resp: "Reads or writes state; calls external systems like the payment provider.", io: "In: query/command · Out: rows/result", lat: "~20–60 ms (varies widely)", fail: "503 DB timeout · 504 upstream timeout." },
    resp: { title: "Response", resp: "The serialized result: a status code, headers, and a body.", io: "Out: e.g. 201 + order JSON", lat: "~5–10 ms serialize + network", fail: "Wrong status code confuses clients." }
  };

  var QUICK = [
    { icon: "📨", t: "Send your first request", d: "Trace a checkout end to end.", href: "#http-lab" },
    { icon: "🔎", t: "Inspect an HTTP request", d: "Anatomy of methods & headers.", href: "#http-methods" },
    { icon: "🧱", t: "Design a REST endpoint", d: "Good vs bad API design.", href: "#endpoint-designer" },
    { icon: "🔐", t: "401 vs 403", d: "Authn vs authz, precisely.", href: "#status-codes" },
    { icon: "🔁", t: "Prevent duplicate orders", d: "Idempotency keys & retries.", href: "#idempotency" },
    { icon: "🗺️", t: "Explore the architecture", d: "Gateway, services, data, events.", href: "#architecture" },
    { icon: "🛠️", t: "Build an Express endpoint", d: "From bare server to production.", href: "#express-workshop" },
    { icon: "🐢", t: "Diagnose a slow API", d: "Where the latency hides.", href: "#resilience" }
  ];

  var JOURNEY = [
    ["Understand the API contract", "fundamentals"],
    ["Understand HTTP", "http-lab"],
    ["Design resources", "rest-resources"],
    ["Explore API architecture", "architecture"],
    ["Implement an API", "express-workshop"],
    ["Test and debug it", "testing-workbench"],
    ["Secure it", "security"],
    ["Optimize performance", "performance"],
    ["Operate in production", "production-ops"],
    ["Apply it to ShopSphere", "business-scenario"]
  ];

  var module = {
    id: "home",
    title: "Overview Dashboard",
    fullWidth: true,
    _diagram: null,

    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty(null);
      var ready = (AV.navOrder || []).filter(function (k) { return AV.routes[k] && AV.routes[k].ready; });
      var visited = [];
      try { visited = JSON.parse(localStorage.getItem("apilab-visited") || "[]"); } catch (e) {}
      var explored = ready.filter(function (k) { return visited.indexOf(k) !== -1; }).length;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">API Engineering Lab</div>' +
          '<h1 class="module-title gradient-text">Learn APIs from fundamentals to senior level</h1>' +
          '<p class="module-subtitle">Interactive labs for HTTP, REST design, architecture, protocols, security, performance and production — all tied to one realistic enterprise case: <b>ShopSphere</b>. Everything here is a hands-on simulation, not just docs.</p>' +
        "</div>" +

        '<div class="stat-row" style="margin-bottom:var(--space-6)">' +
          stat(explored, "/ " + ready.length + " live modules explored") +
          stat("21", "interactive modules (phases 1–4)") +
          stat("320", "simulated ShopSphere orders") +
          stat("5", "learning modes") +
        "</div>" +

        '<section class="section"><h2 class="section-title">Quick launch</h2>' +
          '<div class="ql-grid">' + QUICK.map(function (q) {
            return '<a class="ql-card" href="' + q.href + '"><span class="ql-icon">' + q.icon + '</span>' +
              '<div class="ql-title">' + q.t + "</div><div class=\"ql-desc\">" + q.d + "</div></a>";
          }).join("") + "</div></section>" +

        '<section class="section"><h2 class="section-title">The request lifecycle</h2>' +
          '<p class="panel-sub">Every API request crosses these stages. Click any component to see what it does, its inputs and outputs, where latency hides, and how it fails.</p>' +
          '<div class="lab-2col wide-right">' +
            '<div class="arch-canvas" id="life-canvas"></div>' +
            '<aside class="panel sticky-side" id="life-detail"></aside>' +
          "</div>" +
        "</section>" +

        '<section class="section"><h2 class="section-title">Recommended learning journey</h2>' +
          '<ol class="journey-list">' + JOURNEY.map(function (j, i) {
            var r = AV.routes[j[1]] || {};
            var cls = r.ready ? "" : " journey-soon";
            return '<li class="journey-item' + cls + '"><a href="#' + j[1] + '"><span class="journey-num">' + (i + 1) + "</span>" +
              "<span>" + j[0] + "</span>" + (r.ready ? "" : '<span class="badge">soon</span>') + "</a></li>";
          }).join("") + "</ol></section>";

      var canvas = container.querySelector("#life-canvas");
      var detail = container.querySelector("#life-detail");
      var diagram = AV.ArchDiagram.create({ nodes: LIFE.nodes, edges: LIFE.edges, viewBox: LIFE.viewBox, onSelect: show });
      canvas.appendChild(diagram.el);
      this._diagram = diagram;

      function defaultDetail() {
        detail.innerHTML = '<div class="panel-title">The 20-second tour</div>' +
          "<p>A request flows left to right: the client builds it, DNS + TLS open a secure channel (often reused), the gateway routes and rate-limits, auth checks who you are and what you may do, the service runs logic, the database or a downstream is called, and a response returns.</p>" +
          '<p class="text-muted text-sm" style="margin-top:var(--space-3)">Click any box to inspect it.</p>';
      }
      function show(id) {
        var d = DETAIL[id]; if (!d) return;
        detail.innerHTML =
          '<div class="panel-title">' + d.title + "</div>" +
          "<p>" + d.resp + "</p>" +
          '<dl class="kv" style="margin-top:var(--space-3)">' +
            "<dt>I/O</dt><dd>" + d.io + "</dd>" +
            "<dt>Latency</dt><dd>" + d.lat + " <span class=\"text-muted\">(simulated)</span></dd>" +
            "<dt>Fails as</dt><dd>" + d.fail + "</dd>" +
          "</dl>" +
          (d.note ? '<div class="callout tip" style="margin-top:var(--space-3)"><span class="callout-icon">💡</span><div class="callout-body">' + d.note + "</div></div>" : "");
      }
      defaultDetail();
    },

    destroy: function () { if (this._diagram) { this._diagram.destroy(); this._diagram = null; } }
  };

  function stat(num, label) { return '<div class="stat"><div class="stat-num">' + num + '</div><div class="stat-label">' + label + "</div></div>"; }

  AV.registerModule(module);
})();
