/* ============================================================
   security-data.js — API Security Lab content
   Authn vs authz, API keys, OAuth 2.0 / OIDC, JWT, authz models,
   the OWASP API Top-10 (fictional, safe), and rate-limiting algos.
   All examples use fictional data; no real tokens or attacks.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  // Identity scenarios for the authn-vs-authz lab.
  var identities = [
    { who: "No credentials", authn: false, authz: false, code: 401, msg: "No token at all → we don't know who you are.", note: "Authentication failed." },
    { who: "Invalid / expired token", authn: false, authz: false, code: 401, msg: "Token present but signature invalid or expired.", note: "Authentication failed." },
    { who: "Customer (reads own order)", authn: true, authz: true, code: 200, msg: "Valid token; owns the resource; has orders:read.", note: "Allowed." },
    { who: "Customer (reads another's order)", authn: true, authz: false, code: 404, msg: "Valid identity, but not the owner — return 404 (not 403) so you don't even confirm it exists.", note: "Authorization failed (object-level)." },
    { who: "Support agent (no permission)", authn: true, authz: false, code: 403, msg: "Authenticated, but lacks the support:orders scope.", note: "Authorization failed (scope)." },
    { who: "Admin", authn: true, authz: true, code: 200, msg: "Valid token with admin scope.", note: "Allowed." }
  ];

  var authzModels = [
    { k: "RBAC", full: "Role-Based Access Control", how: "Permissions attach to roles; users get roles.", ex: "customer / support / admin.", pro: "Simple, auditable.", con: "Role explosion for fine-grained needs." },
    { k: "ABAC", full: "Attribute-Based Access Control", how: "Decisions from attributes (user, resource, context).", ex: "allow if order.region == user.region AND time is business hours.", pro: "Fine-grained, flexible.", con: "Harder to reason about + test." },
    { k: "ACL", full: "Access Control List", how: "Per-resource list of who can do what.", ex: "this document: alice=read, bob=write.", pro: "Precise per-object.", con: "Scales poorly across many objects." },
    { k: "Ownership", full: "Resource ownership check", how: "The caller may act only on resources they own.", ex: "order.customerId == token.customerId.", pro: "Stops IDOR/BOLA.", con: "Must be enforced on EVERY endpoint." }
  ];

  var owasp = [
    { id: "API1", title: "Broken Object-Level Authorization (BOLA)", risk: "Changing an id in the URL returns someone else's data.", fix: "Check ownership on every object access — never trust the id alone." },
    { id: "API2", title: "Broken Authentication", risk: "Weak tokens, no expiry, guessable sessions.", fix: "Strong token verification, short expiry + refresh, rotate secrets." },
    { id: "API3", title: "Broken Object Property-Level Auth / Excessive Data", risk: "Returning fields the caller shouldn't see (SSN, internal flags).", fix: "Explicit response schemas; never serialize the whole DB row." },
    { id: "API4", title: "Unrestricted Resource Consumption", risk: "No rate/size limits → cost blow-ups and DoS.", fix: "Rate limits, body-size caps, pagination, timeouts, quotas." },
    { id: "API5", title: "Broken Function-Level Authorization", risk: "A non-admin can call admin endpoints.", fix: "Enforce role/scope per function, deny by default." },
    { id: "API7", title: "Server-Side Request Forgery (SSRF)", risk: "The server fetches an attacker-supplied URL (e.g. 169.254.169.254).", fix: "Allow-list outbound hosts; block internal ranges." },
    { id: "API8", title: "Injection", risk: "Unsanitized input reaches SQL/OS/NoSQL.", fix: "Parameterized queries, validation, least privilege." },
    { id: "INJ", title: "Security Misconfiguration / CORS", risk: "Permissive CORS, verbose errors, default creds.", fix: "Lock down CORS, hide internals, harden defaults." }
  ];

  // Safe BOLA demo data (fictional).
  var bolaOrders = {
    "ORD-10025": { customerId: "C1024", total: 29980, items: "Headphones ×2" },
    "ORD-20099": { customerId: "C7777", total: 142990, items: "Standing Desk ×1" }
  };

  // Rate-limiting algorithms (for the rate-limiting module).
  var rateAlgos = [
    { k: "Fixed window", how: "Count requests per fixed clock window (e.g. per minute); reset at the boundary.", pro: "Trivial to implement.", con: "Boundary bursts: 2× the limit can slip through across a window edge." },
    { k: "Sliding window", how: "Count over a rolling time window, smoothing the boundary.", pro: "No edge bursts; fair.", con: "More state/compute to track timestamps." },
    { k: "Token bucket", how: "Tokens refill at a steady rate; each request spends one; bucket caps the burst.", pro: "Allows controlled bursts; smooth average.", con: "Two params (rate + burst) to tune." },
    { k: "Leaky bucket", how: "Requests queue and drain at a constant rate; overflow is dropped.", pro: "Perfectly smooth output rate.", con: "Adds latency; queue can fill." }
  ];

  AV.data.security = { identities: identities, authzModels: authzModels, owasp: owasp, bolaOrders: bolaOrders, rateAlgos: rateAlgos };
})();
