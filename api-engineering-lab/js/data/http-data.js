/* ============================================================
   http-data.js — HTTP reference content for the Fundamentals labs
   Methods, status codes, headers, and per-stage lifecycle narration
   (keyed to AV.HttpSim stage ids). Content is original and checked
   against RFC 9110 semantics.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  var methods = [
    { m: "GET", safe: true, idem: true, body: "No (by convention)", use: "Read a resource or collection.", mistake: "Using GET to change state — it may be cached, prefetched, or retried, causing surprise writes.", status: "200, 404, 304", biz: "GET /v1/orders/ORD-10025 — fetch one order; safe to retry and cache." },
    { m: "POST", safe: false, idem: false, body: "Yes", use: "Create a resource, or trigger a non-idempotent action.", mistake: "Assuming a retried POST is safe — without an idempotency key it can create duplicates.", status: "201, 202, 400, 409, 422", biz: "POST /v1/orders — create an order; add an Idempotency-Key to make retries safe." },
    { m: "PUT", safe: false, idem: true, body: "Yes", use: "Replace a resource entirely at a known URL.", mistake: "Sending a partial body to PUT — omitted fields can be wiped because PUT replaces the whole resource.", status: "200, 201, 204, 409", biz: "PUT /v1/orders/ORD-10025 — replace the full order; repeating it lands the same final state." },
    { m: "PATCH", safe: false, idem: null, body: "Yes", use: "Apply a partial update.", mistake: "Assuming PATCH is always idempotent — 'increment quantity' is not; 'set status=PAID' is.", status: "200, 204, 409, 422", biz: "PATCH /v1/orders/ORD-10025 — update just the shipping address." },
    { m: "DELETE", safe: false, idem: true, body: "Usually no", use: "Remove (or cancel) a resource.", mistake: "Expecting the SAME response on repeat — the state effect is idempotent, but a second call may return 404.", status: "200, 204, 404", biz: "DELETE /v1/orders/ORD-10025 — cancel an order; the order is gone either way." },
    { m: "HEAD", safe: true, idem: true, body: "No", use: "Like GET but headers only — check existence/size/caching.", mistake: "Expecting a body — HEAD never returns one.", status: "200, 404, 304", biz: "HEAD /v1/orders/ORD-10025 — cheaply check an order exists before fetching it." },
    { m: "OPTIONS", safe: true, idem: true, body: "No", use: "Discover allowed methods / drive CORS preflight.", mistake: "Confusing the CORS preflight with real authorization — OPTIONS is not a security control.", status: "200, 204", biz: "Browser sends OPTIONS before a cross-origin POST to the ShopSphere API." }
  ];

  var statusCodes = [
    { code: 200, cls: "2xx", when: "Successful GET/PUT/PATCH with a body.", client: "Use the response body.", biz: "GET /v1/orders/ORD-10025 returns the order." },
    { code: 201, cls: "2xx", when: "A new resource was created.", client: "Read Location / the returned id.", biz: "POST /v1/orders created ORD-10025." },
    { code: 202, cls: "2xx", when: "Accepted for async processing; not done yet.", client: "Poll or wait for a webhook.", biz: "A refund was accepted and will process asynchronously." },
    { code: 204, cls: "2xx", when: "Success, no body to return.", client: "Don't parse a body.", biz: "DELETE /v1/orders/ORD-10025 cancelled it." },
    { code: 301, cls: "3xx", when: "Resource moved permanently.", client: "Update the stored URL; follow once.", biz: "An old /orders path now lives at /v1/orders." },
    { code: 302, cls: "3xx", when: "Temporary redirect.", client: "Follow, but keep the original URL.", biz: "Temporary routing during a migration." },
    { code: 304, cls: "3xx", when: "Cached copy is still fresh (conditional GET).", client: "Use your cached body.", biz: "Catalog unchanged since the client's ETag." },
    { code: 400, cls: "4xx", when: "Malformed request (bad JSON, wrong types).", client: "Fix the request; don't blind-retry.", biz: "Checkout body wasn't valid JSON." },
    { code: 401, cls: "4xx", when: "Missing or invalid authentication.", client: "Obtain/refresh credentials, then retry.", biz: "No/expired token on POST /v1/orders." },
    { code: 403, cls: "4xx", when: "Authenticated but not allowed.", client: "Don't retry; needs different permission.", biz: "A customer tried to read another customer's order." },
    { code: 404, cls: "4xx", when: "Resource doesn't exist (or is hidden).", client: "Stop; the id is wrong or gone.", biz: "GET an order id that never existed." },
    { code: 409, cls: "4xx", when: "Conflict with current state.", client: "Reconcile, then retry.", biz: "Duplicate order detected by a unique constraint." },
    { code: 422, cls: "4xx", when: "Well-formed but semantically invalid.", client: "Fix the fields named in the error.", biz: "Order item quantity was 0." },
    { code: 429, cls: "4xx", when: "Rate limit exceeded.", client: "Back off; honor Retry-After.", biz: "A partner exceeded its quota during a sale." },
    { code: 500, cls: "5xx", when: "Unhandled server error.", client: "Retry cautiously; it's not your fault.", biz: "A bug threw in the order service." },
    { code: 502, cls: "5xx", when: "Bad response from an upstream.", client: "Retry with backoff.", biz: "The gateway got garbage from a service." },
    { code: 503, cls: "5xx", when: "Temporarily unavailable/overloaded.", client: "Back off; honor Retry-After.", biz: "The DB was briefly unavailable." },
    { code: 504, cls: "5xx", when: "Upstream timed out.", client: "Retry carefully; outcome may be uncertain.", biz: "The payment provider didn't answer in time." }
  ];

  var headers = [
    { name: "Authorization", dir: "req", purpose: "Carries credentials (bearer token / API key).", example: "Authorization: Bearer eyJhbGci…", note: "Sent on every authenticated call; never logged in plaintext." },
    { name: "Content-Type", dir: "both", purpose: "Describes the body's media type.", example: "Content-Type: application/json", note: "Forget it and Express leaves req.body undefined." },
    { name: "Accept", dir: "req", purpose: "What media types the client can handle.", example: "Accept: application/json", note: "Drives content negotiation; not the same as Content-Type." },
    { name: "Idempotency-Key", dir: "req", purpose: "Makes an unsafe POST safe to retry.", example: "Idempotency-Key: 9f1c-checkout-42", note: "The server must persist it for this to work — a header alone does nothing." },
    { name: "Cache-Control", dir: "both", purpose: "How/whether a response may be cached.", example: "Cache-Control: max-age=60", note: "Never cache personalized or sensitive responses." },
    { name: "ETag", dir: "resp", purpose: "A version tag for a resource representation.", example: 'ETag: "a1b2c3"', note: "Pairs with If-None-Match for cheap 304s." },
    { name: "If-None-Match", dir: "req", purpose: "Conditional GET using a known ETag.", example: 'If-None-Match: "a1b2c3"', note: "Server returns 304 if unchanged — saves bandwidth." },
    { name: "Retry-After", dir: "resp", purpose: "When to retry after 429/503.", example: "Retry-After: 30", note: "Clients should honor it instead of hammering." },
    { name: "X-Request-ID", dir: "both", purpose: "Correlates one request across services/logs.", example: "X-Request-ID: req-7f3a21", note: "Different from a distributed trace id, which spans many spans." }
  ];

  // Narration per lifecycle stage (keyed to HttpSim stage ids).
  var lifecycle = {
    client: { what: "The client assembles the request.", why: "Everything downstream reads this one message — method, path, headers, body.", detail: "For checkout the mobile app builds POST /v1/orders with a JSON body and an Authorization header." },
    dns: { what: "The hostname is resolved to an IP.", why: "The client needs an address to open a socket to.", detail: "Often cached or skipped entirely on a reused connection — don't assume every request pays this cost." },
    connect: { what: "TCP connects and TLS is negotiated.", why: "HTTPS needs an encrypted channel before any data flows.", detail: "With keep-alive / HTTP-2 the handshake is reused across many requests, so it's a one-time cost, not per-request." },
    gateway: { what: "The API gateway routes and guards the request.", why: "One front door handles routing, rate limiting, and request IDs.", detail: "If the client is over quota, the gateway returns 429 here and the request never reaches a service." },
    auth: { what: "The caller is authenticated, then authorized.", why: "Identity (who) and permission (what) are different checks.", detail: "Missing/expired credentials → 401; valid identity without permission → 403." },
    validate: { what: "The request is validated against a schema.", why: "Reject bad input early, before business logic or the DB.", detail: "Malformed JSON → 400; well-formed but invalid fields → 422." },
    service: { what: "Business logic runs in the service.", why: "This is where the actual work and rules live.", detail: "The order service re-computes price server-side — it never trusts a price sent by the client." },
    data: { what: "The DB / downstream dependencies are called.", why: "State is read or written; external systems are invoked.", detail: "A DB timeout surfaces as 503; an upstream (payment provider) timeout as 504." },
    serialize: { what: "The response is serialized.", why: "The result is encoded (usually JSON) with a status + headers.", detail: "A created order returns 201 with the new order id and a Location-style pointer." },
    deliver: { what: "The response travels back to the client.", why: "The client interprets the status code and body.", detail: "A 201 tells the app the order exists; it can now show a confirmation screen." }
  };

  AV.data.http = { methods: methods, statusCodes: statusCodes, headers: headers, lifecycle: lifecycle };
})();
