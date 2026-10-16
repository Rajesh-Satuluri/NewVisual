/* ============================================================
   business-data.js — ShopSphere enterprise business case content
   The 10-step "place an order" journey and the 10 interactive
   failure scenarios (A–J). Architecture + order state model live in
   shopsphere.js. All figures are fictional simulation data.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  var journey = [
    { n: 1, title: "Browse products", m: "GET", p: "/v1/products?category=electronics&limit=20", detail: "Filter + paginate the catalog. Cacheable + CDN-friendly since it's shared, non-personalized data.", note: "Read-heavy — cache aggressively." },
    { n: 2, title: "Check inventory", m: "GET", p: "/v1/inventory/P501", detail: "Availability is a <b>snapshot</b>, not a guarantee. It can change before the order is placed.", note: "A snapshot ≠ a reservation." },
    { n: 3, title: "Create the order", m: "POST", p: "/v1/orders", detail: "Authenticate, authorize, validate input, re-check price server-side, reserve inventory, persist in a transaction. Carries an Idempotency-Key.", note: "Never trust a client-sent price." },
    { n: 4, title: "Initiate payment", m: "POST", p: "/v1/payments", detail: "Call the external provider. Because it's outside our transaction, the outcome can be uncertain — modeled with an order state machine + webhook, not a DB transaction.", note: "No DB txn can span an external provider." },
    { n: 5, title: "Receive payment confirmation", m: "WEBHOOK", p: "payment.succeeded", detail: "Provider calls our webhook. Verify signature, dedupe by event id, transition the order state, persist the event, ACK.", note: "Webhooks may be delayed, duplicated, or out of order." },
    { n: 6, title: "Reserve & fulfill inventory", m: "EVENT", p: "order.paid → fulfillment", detail: "An event triggers warehouse fulfillment asynchronously. Reservation, allocation, shipment, and final decrement are distinct steps.", note: "Async — off the customer's response path." },
    { n: 7, title: "Create shipment", m: "POST", p: "/v1/shipments", detail: "Integrate with the shipping partner; generate a tracking id.", note: "Another external integration to make resilient." },
    { n: 8, title: "Notify the customer", m: "EVENT", p: "order.shipped → notification", detail: "Send email/SMS/push. If notification fails, the order is still valid — notifications must not gate the order.", note: "Notification failure ≠ order failure." },
    { n: 9, title: "Retrieve order status", m: "GET", p: "/v1/orders/ORD-10025", detail: "Return a consistent status + timeline the customer and support can both read.", note: "One source of truth for status." },
    { n: 10, title: "Support access", m: "GET", p: "/v1/orders/ORD-10025 (as support)", detail: "Support reads it via RBAC/ABAC with audit logging — and cannot access arbitrary customers without permission.", note: "Least privilege + audit trail." }
  ];

  var scenarios = [
    { id: "A", title: "Duplicate order creation", situation: "A customer taps Buy twice after the first request times out.", teaches: "Idempotency keys, atomic persistence, unique constraints, safe retries.", detail: "The client retries a POST whose response was lost. Without an idempotency key each retry creates a new order + charge.", mitigation: "Accept an Idempotency-Key, store key→result with a unique constraint, and replay the stored response on retry.", link: "#idempotency" },
    { id: "B", title: "Payment succeeded but client timed out", situation: "The provider charged the card, but the response never reached ShopSphere.", teaches: "Uncertain outcomes, webhook reconciliation, payment lookup, state recovery.", detail: "The order is stuck in PAYMENT_PENDING while money moved. You can't assume success or failure.", mitigation: "Reconcile via the signed webhook and/or a payment-status lookup; the state machine resolves PAID or PAYMENT_FAILED. Never blind-retry a charge.", link: "#resilience" },
    { id: "C", title: "Inventory changes during checkout", situation: "Two customers try to buy the last unit at the same time.", teaches: "Atomic reservation, concurrency control, conflict handling.", detail: "Both read 'available: 1' then both try to reserve. A naive implementation oversells.", mitigation: "Reserve atomically (conditional update / row lock / unique constraint). The loser gets 409 Conflict and a clear message.", link: "#rest-resources" },
    { id: "D", title: "Payment webhook arrives twice", situation: "The provider delivers payment.succeeded two (or more) times.", teaches: "Event deduplication, durable event records, idempotent processing.", detail: "At-least-once delivery means duplicates are normal, not exceptional.", mitigation: "Dedupe by event id against a durable store; process once; ACK both. The order is only marked PAID once.", link: "#realtime-protocols" },
    { id: "E", title: "Payment service becomes unavailable", situation: "The provider slows down, then starts failing during a sale.", teaches: "Timeout budgets, bounded retries, circuit breakers, graceful pending.", detail: "Naive retries pile on and worsen the outage; checkout threads hang.", mitigation: "Timeouts + bounded retries with backoff/jitter + a circuit breaker; leave orders PAYMENT_PENDING and reconcile later rather than failing hard.", link: "#resilience" },
    { id: "F", title: "API version change breaks a mobile client", situation: "A schema change ships; last year's app can't parse responses.", teaches: "Backward compatibility, additive changes, versioning, migration.", detail: "A renamed/removed field breaks clients that can't all upgrade at once.", mitigation: "Make additive changes in-place; put breaking changes behind /v2; deprecate /v1 with a Sunset header and a migration guide.", link: "#versioning" },
    { id: "G", title: "Partner exceeds its request quota", situation: "A partner's batch job hammers the API during peak.", teaches: "Rate limiting, fair usage, Retry-After, per-partner quotas, monitoring.", detail: "One noisy partner can starve everyone else and spike cost.", mitigation: "Per-partner quotas + 429 with Retry-After + burst allowance; monitor per-key usage and alert on anomalies.", link: "#rate-limiting" },
    { id: "H", title: "Unauthorized order access", situation: "A customer changes an id in the URL and sees someone else's order.", teaches: "Object-level authorization, preventing IDOR/BOLA.", detail: "The server trusted the id without an ownership check.", mitigation: "On every object access check ownership/permission server-side; return 404 for non-owned resources.", link: "#security" },
    { id: "I", title: "Slow product search", situation: "Search latency spikes as the catalog and traffic grow.", teaches: "Query analysis, indexing, pagination, caching, latency decomposition.", detail: "A full scan + unbounded result + N+1 enrichment compound into slow responses.", mitigation: "Add indexes on filter/sort columns, paginate with a cursor, cache hot queries, batch enrichment.", link: "#performance" },
    { id: "J", title: "Out-of-order fulfillment events", situation: "order.shipped arrives before order.paid is processed.", teaches: "State-transition validation, event ordering, version numbers, reconciliation.", detail: "Events can arrive out of order across async consumers.", mitigation: "Validate transitions in the state machine (can't ship an unpaid order); park/replay early events; use sequence/version numbers.", link: "#realtime-protocols" }
  ];

  AV.data.business = { journey: journey, scenarios: scenarios };
})();
