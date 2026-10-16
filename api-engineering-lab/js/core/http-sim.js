/* ============================================================
   http-sim.js — deterministic HTTP request-lifecycle simulator
   Pure (no DOM). Walks a request through the stages a real request
   crosses, assigns *simulated* per-stage latency, applies optional
   failure injection, and shapes a response via a pluggable handler.

   AV.HttpSim.run(req, opts) → {
     stages:   [{ id, label, ms, state, note, logs:[] }],   // state: ok|fail|skip
     response: { status, statusText, headers, body, networkError? },
     totalMs,  trace:[{ service, ms }]
   }

   All timings are clearly simulated — never presented as measured.
   Deterministic: same input → same output (no Math.random).
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // Baseline simulated latency per stage (ms).
  var BASE = {
    client: 2, dns: 18, connect: 34, gateway: 6, auth: 9,
    validate: 4, service: 22, data: 30, serialize: 5, deliver: 8
  };

  var STAGES = [
    { id: "client",   label: "Client builds request" },
    { id: "dns",      label: "DNS resolution" },
    { id: "connect",  label: "TCP + TLS handshake" },
    { id: "gateway",  label: "API gateway (routing, rate limit)" },
    { id: "auth",     label: "Authentication + authorization" },
    { id: "validate", label: "Request validation" },
    { id: "service",  label: "Application service (business logic)" },
    { id: "data",     label: "Database / downstream call" },
    { id: "serialize",label: "Response serialization" },
    { id: "deliver",  label: "Response travels to client" }
  ];

  var STATUS_TEXT = {
    200: "OK", 201: "Created", 202: "Accepted", 204: "No Content",
    301: "Moved Permanently", 302: "Found", 304: "Not Modified",
    400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found",
    405: "Method Not Allowed", 409: "Conflict", 422: "Unprocessable Content",
    429: "Too Many Requests", 500: "Internal Server Error", 502: "Bad Gateway",
    503: "Service Unavailable", 504: "Gateway Timeout"
  };
  function statusText(code) { return STATUS_TEXT[code] || ""; }

  function lat(id, opts) {
    var over = (opts.latency || {})[id];
    return typeof over === "number" ? over : BASE[id];
  }

  // Default mock handler: a tiny ShopSphere-aware router over an optional
  // in-memory store (AV.data.store), else a generic echo.
  function defaultHandler(req) {
    var store = AV.data && AV.data.store;
    if (store && typeof store.handle === "function") {
      var r = store.handle(req);
      if (r) return r;
    }
    // Generic fallbacks by method.
    if (req.method === "POST") return { status: 201, body: { id: "ORD-10025", status: "PENDING", echo: req.body || null } };
    if (req.method === "DELETE") return { status: 204, body: null };
    return { status: 200, body: { ok: true, path: req.path, method: req.method } };
  }

  function run(req, opts) {
    req = req || {}; opts = opts || {};
    req.method = (req.method || "GET").toUpperCase();
    req.headers = req.headers || {};
    var inj = opts.inject || {};
    var stages = [];
    var total = 0;
    var failed = false;
    var response = null;

    function add(id, state, note, logs, msOverride) {
      var ms = state === "skip" ? 0 : (typeof msOverride === "number" ? msOverride : lat(id, opts));
      if (state !== "skip") total += ms;
      stages.push({ id: id, label: stageLabel(id), ms: ms, state: state, note: note || "", logs: logs || [] });
    }
    function stageLabel(id) { for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === id) return STAGES[i].label; return id; }

    function networkError(stageId, note) {
      failed = true;
      response = { status: 0, statusText: "", headers: {}, body: null, networkError: note };
    }
    function errorResponse(code, detail, extra) {
      failed = true;
      var body = {
        type: "https://api.shopsphere.example/problems/" + code,
        title: statusText(code),
        status: code,
        detail: detail
      };
      if (extra) Object.keys(extra).forEach(function (k) { body[k] = extra[k]; });
      body.requestId = req.headers["X-Request-ID"] || "req-" + (req.method[0]) + "-7f3a21";
      response = { status: code, statusText: statusText(code), headers: { "Content-Type": "application/problem+json" }, body: body };
    }

    // 1. client
    add("client", "ok", "Serialize method, path, headers, body.", [req.method + " " + (req.path || "/")]);

    // 2. dns
    if (opts.reuseConn) add("dns", "skip", "Reused pooled connection — DNS cached.");
    else if (inj.dnsFail) { add("dns", "fail", "NXDOMAIN — hostname did not resolve.", ["getaddrinfo ENOTFOUND api.shopsphere.example"]); networkError("dns", "DNS resolution failed"); return finish(); }
    else add("dns", "ok", "Resolved api.shopsphere.example → 203.0.113.10.");

    // 3. connect (TCP + TLS)
    if (opts.reuseConn) add("connect", "skip", "Reused keep-alive connection — no new handshake.");
    else if (inj.tlsFail) { add("connect", "fail", "TLS handshake failed — certificate not trusted.", ["SSL routines: certificate verify failed"]); networkError("connect", "TLS handshake failed"); return finish(); }
    else add("connect", "ok", "TCP established; TLS 1.3 negotiated (ALPN h2).");

    // 4. gateway
    if (inj.gatewayRateLimited) { add("gateway", "fail", "Rate limit exceeded for this client.", ["429 at gateway; quota 100/min exhausted"]); errorResponse(429, "Rate limit exceeded. Retry after the window resets.", { code: "RATE_LIMITED" }); response.headers["Retry-After"] = "30"; response.headers["X-RateLimit-Remaining"] = "0"; return finish(); }
    add("gateway", "ok", "Matched route; forwarded to order-service upstream.", ["X-Request-ID attached"]);

    // 5. auth
    if (inj.authMissing) { add("auth", "fail", "No Authorization header present.", ["401 — missing credentials"]); errorResponse(401, "Authentication required. Provide a valid access token.", { code: "UNAUTHENTICATED" }); return finish(); }
    if (inj.authInvalid) { add("auth", "fail", "Token signature invalid or expired.", ["401 — token verification failed"]); errorResponse(401, "The access token is invalid or has expired.", { code: "INVALID_TOKEN" }); return finish(); }
    if (inj.authForbidden) { add("auth", "fail", "Authenticated, but lacks the required scope.", ["403 — scope orders:write required"]); errorResponse(403, "You do not have permission to perform this action.", { code: "FORBIDDEN" }); return finish(); }
    add("auth", "ok", "Identity verified; scopes satisfy the operation.");

    // 6. validate
    if (inj.validationFail) { add("validate", "fail", "Request body failed schema validation.", ["422 — items[0].quantity must be >= 1"]); errorResponse(422, "One or more request fields are invalid.", { code: "INVALID_ORDER_ITEM" }); return finish(); }
    if (inj.notFound) { add("validate", "fail", "Target resource does not exist.", ["404 — order not found"]); errorResponse(404, "The requested resource was not found.", { code: "NOT_FOUND" }); return finish(); }
    add("validate", "ok", "Body matches schema; path/query params parsed.");

    // 7 + 8. service + data (may be skipped on injected failures)
    if (inj.serverError) { add("service", "fail", "Unhandled exception in business logic.", ["500 — TypeError: cannot read property 'total'"]); add("data", "skip", "Not reached."); errorResponse(500, "An unexpected error occurred. The incident was logged.", { code: "INTERNAL_ERROR" }); return finish(); }
    add("service", "ok", "Executed business logic; pricing validated server-side.");

    if (inj.dbTimeout) { add("data", "fail", "Database query exceeded the timeout budget.", ["statement timeout after 5000ms"]); errorResponse(503, "A dependency is temporarily unavailable. Please retry.", { code: "DB_TIMEOUT" }); return finish(); }
    if (inj.downstreamTimeout) { add("data", "fail", "Downstream payment provider timed out.", ["upstream timeout after 8000ms"]); errorResponse(504, "An upstream service did not respond in time.", { code: "UPSTREAM_TIMEOUT" }); return finish(); }
    add("data", "ok", "Read/write committed; downstream calls returned.", ["1 row affected"]);

    // 9. serialize — build the success response via handler
    var handler = opts.handler || defaultHandler;
    var out;
    try { out = handler(req) || {}; } catch (e) { out = { status: 500, body: { title: "Handler error" } }; }
    var code = out.status || 200;
    response = {
      status: code,
      statusText: out.statusText || statusText(code),
      headers: Object.assign({ "Content-Type": "application/json" }, out.headers || {}),
      body: out.body !== undefined ? out.body : null
    };
    add("serialize", "ok", "Encoded " + code + " " + response.statusText + " as JSON.");

    // 10. deliver
    add("deliver", "ok", "Response sent back over the open connection.");
    return finish();

    function finish() {
      // Mark any not-yet-added stages as skipped so the UI shows the full pipeline.
      var seen = {}; stages.forEach(function (s) { seen[s.id] = true; });
      STAGES.forEach(function (s) { if (!seen[s.id]) stages.push({ id: s.id, label: s.label, ms: 0, state: "skip", note: "Not reached — request ended earlier.", logs: [] }); });
      // keep canonical order
      stages.sort(function (a, b) { return order(a.id) - order(b.id); });
      return { stages: stages, response: response, totalMs: total, failed: failed };
    }
    function order(id) { for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === id) return i; return 99; }
  }

  AV.HttpSim = {
    run: run,
    stages: STAGES,
    statusText: statusText,
    STATUS_TEXT: STATUS_TEXT
  };

  // Shared JSON pretty-printer with lightweight syntax coloring.
  // Lives in core so every module can use it regardless of load order.
  AV.fmtJSON = function (obj) {
    var s;
    try { s = JSON.stringify(obj, null, 2); } catch (e) { return String(obj); }
    return s.replace(/("(\\.|[^"])*")(\s*:)?|\b(true|false|null)\b|(-?\d+\.?\d*)/g, function (m, str, _c, colon, bool, num) {
      if (str) return colon ? '<span class="http-json-key">' + str + "</span>" + colon : '<span class="http-json-str">' + str + "</span>";
      if (bool) return '<span class="http-json-bool">' + bool + "</span>";
      if (num) return '<span class="http-json-num">' + num + "</span>";
      return m;
    });
  };
})();
