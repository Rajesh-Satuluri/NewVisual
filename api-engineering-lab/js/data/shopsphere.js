/* ============================================================
   shopsphere.js — the recurring enterprise business case
   ShopSphere: a fictional multi-region e-commerce + fulfillment
   API platform. Provides: business context, a deterministic order
   dataset + in-memory store (with a request router used by the
   HTTP simulator), the architecture graph, sample payloads, and
   the order state model. All data is fictional simulation data.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  /* ── Deterministic order dataset (no Math.random) ─────────── */
  var STATUSES = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
  var REGIONS = ["IN", "US", "EU", "APAC"];
  var CURRENCY = { IN: "INR", US: "USD", EU: "EUR", APAC: "SGD" };
  var PRODUCTS = [
    { id: "P501", name: "Noise-Cancelling Headphones", price: 14990, cat: "electronics" },
    { id: "P502", name: "Mechanical Keyboard", price: 8499, cat: "electronics" },
    { id: "P503", name: "4K Monitor 27\"", price: 28999, cat: "electronics" },
    { id: "P504", name: "USB-C Hub", price: 2499, cat: "accessories" },
    { id: "P505", name: "Laptop Stand", price: 1999, cat: "accessories" },
    { id: "P506", name: "Webcam 1080p", price: 3999, cat: "electronics" },
    { id: "P507", name: "Ergonomic Mouse", price: 2899, cat: "accessories" },
    { id: "P508", name: "Standing Desk", price: 42999, cat: "furniture" }
  ];

  // Simple deterministic pseudo-random so the dataset is reproducible.
  function seeded(n) { var x = Math.sin(n) * 10000; return x - Math.floor(x); }

  function buildOrders(count) {
    var out = [];
    var base = Date.UTC(2024, 0, 1); // 2024-01-01
    for (var i = 0; i < count; i++) {
      var r = seeded(i + 1);
      var r2 = seeded(i + 101);
      var r3 = seeded(i + 211);
      var region = REGIONS[Math.floor(r * REGIONS.length)];
      var status = STATUSES[Math.floor(r2 * STATUSES.length)];
      var nItems = 1 + Math.floor(r3 * 3);
      var items = [], total = 0;
      for (var k = 0; k < nItems; k++) {
        var p = PRODUCTS[Math.floor(seeded(i * 7 + k + 3) * PRODUCTS.length)];
        var qty = 1 + Math.floor(seeded(i * 13 + k + 5) * 2);
        items.push({ productId: p.id, name: p.name, quantity: qty, unitPrice: p.price });
        total += p.price * qty;
      }
      var dayOffset = Math.floor(r * 120); // spread over ~4 months
      var ts = base + dayOffset * 86400000 + Math.floor(seeded(i + 7) * 86400000);
      out.push({
        orderId: "ORD-" + (10000 + i),
        customerId: "C" + (1000 + Math.floor(r2 * 400)),
        status: status,
        total: total,
        currency: CURRENCY[region],
        region: region,
        createdAt: new Date(ts).toISOString(),
        items: items
      });
    }
    // Stable sort by createdAt ascending for cursor demos.
    out.sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : (a.orderId < b.orderId ? -1 : 1); });
    return out;
  }

  var ORDERS = buildOrders(320);

  /* ── In-memory store + request router (used by HttpSim) ───── */
  var store = {
    orders: ORDERS.slice(),
    products: PRODUCTS.slice(),
    idempotencyKeys: {}, // key -> saved response
    _seq: 10025,

    reset: function () {
      this.orders = ORDERS.slice();
      this.idempotencyKeys = {};
      this._seq = 10025;
    },
    getOrder: function (id) { for (var i = 0; i < this.orders.length; i++) if (this.orders[i].orderId === id) return this.orders[i]; return null; },

    // Minimal router: returns { status, body, headers? } or null if unmatched.
    handle: function (req) {
      var path = (req.path || "").split("?")[0];
      var m = req.method;
      // /v1/products
      if (m === "GET" && path === "/v1/products") {
        return { status: 200, body: { data: this.products, count: this.products.length } };
      }
      // /v1/inventory/:id
      var inv = path.match(/^\/v1\/inventory\/(P\d+)$/);
      if (m === "GET" && inv) {
        var avail = 3 + Math.floor(seeded(inv[1].length + inv[1].charCodeAt(2)) * 40);
        return { status: 200, body: { productId: inv[1], available: avail, asOf: "2024-05-01T09:00:00Z", note: "snapshot — not a reservation" } };
      }
      // /v1/orders/:id
      var one = path.match(/^\/v1\/orders\/(ORD-\d+)$/);
      if (one) {
        var o = this.getOrder(one[1]);
        if (!o) return { status: 404, body: { title: "Not Found", status: 404, detail: "No order " + one[1] } };
        if (m === "GET") return { status: 200, body: o };
        if (m === "DELETE") { o.status = "CANCELLED"; return { status: 204, body: null }; }
        if (m === "PUT" || m === "PATCH") { if (req.body && req.body.status) o.status = req.body.status; return { status: 200, body: o }; }
      }
      // /v1/orders (collection)
      if (path === "/v1/orders") {
        if (m === "GET") return { status: 200, body: { data: this.orders.slice(0, 20), pagination: { total: this.orders.length, limit: 20, offset: 0 } } };
        if (m === "POST") return this.createOrder(req);
      }
      return null;
    },

    createOrder: function (req) {
      var key = req.headers["Idempotency-Key"];
      if (key && this.idempotencyKeys[key]) {
        var saved = this.idempotencyKeys[key];
        return { status: saved.status, body: saved.body, headers: { "Idempotency-Replayed": "true" } };
      }
      var id = "ORD-" + (this._seq++);
      var body = req.body || {};
      var total = 0;
      (body.items || []).forEach(function (it) {
        var p = null; for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === it.productId) p = PRODUCTS[i];
        if (p) total += p.price * (it.quantity || 1);
      });
      var order = { orderId: id, customerId: body.customerId || "C1024", status: "PENDING", total: total, currency: "INR", createdAt: "2024-05-01T10:00:00Z", items: body.items || [] };
      this.orders.push(order);
      var resp = { status: 201, body: { orderId: id, status: "PENDING", total: total, currency: "INR" } };
      if (key) this.idempotencyKeys[key] = resp;
      return resp;
    }
  };
  AV.data.store = store;

  /* ── Architecture graph (ShopSphere platform) ─────────────── */
  var architecture = {
    viewBox: "0 0 980 560",
    nodes: [
      { id: "web", label: "Web App", sub: "React SPA", x: 40, y: 40, w: 120, h: 56, color: "cyan" },
      { id: "mobile", label: "Mobile App", sub: "iOS / Android", x: 40, y: 120, w: 120, h: 56, color: "cyan" },
      { id: "partner", label: "Partner", sub: "B2B system", x: 40, y: 200, w: 120, h: 56, color: "purple" },
      { id: "cdn", label: "CDN", sub: "edge cache", x: 210, y: 40, w: 110, h: 56, color: "green" },
      { id: "lb", label: "Load Balancer", sub: "+ TLS term", x: 210, y: 130, w: 110, h: 56, color: "airflow" },
      { id: "gateway", label: "API Gateway", sub: "routing · rate limit", x: 370, y: 130, w: 130, h: 60, color: "airflow" },
      { id: "idp", label: "Identity (IdP)", sub: "OAuth2 / OIDC", x: 370, y: 40, w: 130, h: 56, color: "orange" },
      { id: "order", label: "Order Service", sub: "core domain", x: 560, y: 130, w: 130, h: 60, color: "airflow" },
      { id: "product", label: "Product Service", sub: "catalog", x: 560, y: 40, w: 130, h: 56, color: "airflow" },
      { id: "inventory", label: "Inventory Service", sub: "stock + reserve", x: 560, y: 230, w: 130, h: 56, color: "airflow" },
      { id: "payment", label: "Payment Integ.", sub: "to provider", x: 560, y: 320, w: 130, h: 56, color: "orange" },
      { id: "fulfill", label: "Fulfillment", sub: "warehouse", x: 560, y: 410, w: 130, h: 56, color: "airflow" },
      { id: "notify", label: "Notification", sub: "email/SMS/push", x: 560, y: 500, w: 130, h: 48, color: "purple" },
      { id: "db", label: "Relational DB", sub: "orders, payments", x: 760, y: 130, w: 120, h: 56, color: "green" },
      { id: "cache", label: "Cache", sub: "Redis", x: 760, y: 40, w: 120, h: 56, color: "green" },
      { id: "broker", label: "Message Broker", sub: "events", x: 760, y: 320, w: 120, h: 56, color: "purple" },
      { id: "provider", label: "Payment Provider", sub: "external", x: 760, y: 410, w: 120, h: 56, color: "red" },
      { id: "obs", label: "Observability", sub: "logs·metrics·traces", x: 760, y: 500, w: 120, h: 48, color: "cyan" }
    ],
    edges: [
      ["web", "cdn"], ["web", "lb"], ["mobile", "lb"], ["partner", "gateway"],
      ["cdn", "gateway"], ["lb", "gateway"],
      ["gateway", "idp", { dir: "both", label: "verify token" }], ["gateway", "order"],
      ["order", "product"], ["order", "inventory"], ["order", "payment"],
      ["order", "fulfill"], ["order", "db", { dir: "both", label: "read/write" }],
      ["product", "cache", { dir: "both" }], ["payment", "provider", { dir: "both" }],
      ["order", "broker"], ["broker", "fulfill"], ["broker", "notify"],
      ["provider", "gateway", { label: "webhook", curve: 60 }]
    ],
    detail: {
      gateway: { title: "API Gateway", plain: "The single front door. Terminates TLS, authenticates, rate-limits, routes to the right service, and emits request IDs for tracing.", checks: ["Route matching + version routing", "Rate limiting / quotas", "Auth token verification (delegated to IdP)", "Request/response transformation", "Centralized logging + metrics"], business: "Protects ShopSphere's checkout services during flash-sale traffic spikes and gives every request a trace ID.", note: { v: "note", text: "A gateway handles cross-cutting concerns — but business authorization still needs enforcement inside each service." } },
      order: { title: "Order Service", plain: "Owns the order domain and its state machine. Coordinates pricing, inventory reservation, payment, and fulfillment.", checks: ["Validates orders server-side (never trusts client price)", "Runs the order state machine", "Writes to the orders DB in a transaction", "Publishes domain events to the broker"], business: "Turning a cart into a durable, auditable order is the heart of ShopSphere's revenue path." },
      payment: { title: "Payment Integration", plain: "Talks to the external provider. Because the provider is outside our transaction boundary, outcomes can be uncertain — handled via a state machine + webhooks.", checks: ["Initiates charges with an idempotency key", "Reconciles via signed webhooks", "Handles timeouts + duplicate attempts"], business: "A double charge or a lost confirmation directly hurts customers and support load." },
      db: { title: "Relational Database", plain: "The source of truth for orders and payments. Transactions guarantee a valid order is never half-written.", checks: ["ACID transactions for order writes", "Unique constraints prevent duplicates", "Indexes back pagination + lookups"], business: "When the morning report looks wrong, on-call checks the DB first." },
      provider: { title: "External Payment Provider", plain: "A third party we don't control. It may be slow, may time out, and sends asynchronous webhooks that can duplicate or arrive out of order.", checks: ["Signed webhook events", "At-least-once delivery (expect duplicates)", "Independent availability"], business: "ShopSphere's checkout reliability partly depends on a system it cannot fix directly — so it must degrade gracefully." }
    }
  };
  // Shared responsibility text for any node not expanded above.
  architecture.nodes.forEach(function (n) {
    if (!architecture.detail[n.id]) {
      architecture.detail[n.id] = { title: n.label, plain: n.sub + " — select other highlighted components to see how a request flows through them." };
    }
  });

  /* ── Order state model ────────────────────────────────────── */
  var orderStates = {
    viewBox: "0 0 960 430",
    states: [
      { id: "PENDING", label: "PENDING", x: 40, y: 40, kind: "queued" },
      { id: "PAYMENT_PENDING", label: "PAYMENT_PENDING", x: 240, y: 40, w: 160, kind: "scheduled" },
      { id: "PAID", label: "PAID", x: 460, y: 40, kind: "running" },
      { id: "PROCESSING", label: "PROCESSING", x: 660, y: 40, kind: "running" },
      { id: "SHIPPED", label: "SHIPPED", x: 660, y: 140, kind: "deferred" },
      { id: "DELIVERED", label: "DELIVERED", x: 660, y: 240, kind: "success" },
      { id: "PAYMENT_FAILED", label: "PAYMENT_FAILED", x: 240, y: 160, w: 160, kind: "failed" },
      { id: "CANCELLED", label: "CANCELLED", x: 40, y: 260, kind: "skipped" },
      { id: "REFUND_PENDING", label: "REFUND_PENDING", x: 300, y: 300, w: 150, kind: "up_for_retry" },
      { id: "REFUNDED", label: "REFUNDED", x: 520, y: 300, kind: "upstream_failed" }
    ],
    transitions: [
      { from: "PENDING", to: "PAYMENT_PENDING", label: "checkout" },
      { from: "PAYMENT_PENDING", to: "PAID", label: "paid" },
      { from: "PAYMENT_PENDING", to: "PAYMENT_FAILED", label: "declined" },
      { from: "PAID", to: "PROCESSING", label: "reserve" },
      { from: "PROCESSING", to: "SHIPPED", label: "ship" },
      { from: "SHIPPED", to: "DELIVERED", label: "deliver" },
      { from: "PENDING", to: "CANCELLED", label: "cancel" },
      { from: "PAYMENT_FAILED", to: "CANCELLED", label: "give up" },
      { from: "PAID", to: "REFUND_PENDING", label: "refund req" },
      { from: "REFUND_PENDING", to: "REFUNDED", label: "refunded" }
    ]
  };

  /* ── Sample payloads + context ────────────────────────────── */
  AV.data.shopsphere = {
    name: "ShopSphere",
    tagline: "Enterprise e-commerce & order-fulfillment API platform (fictional)",
    context: "ShopSphere is a fictional multi-region retailer running a web store, a mobile app, warehouse integrations, an external payment provider, shipping partners, and support tools — all coordinated through an API platform.",
    stakeholders: [
      { who: "Customer", needs: "Browse, order, pay, and track reliably.", risk: "Double charges or lost orders destroy trust." },
      { who: "Mobile team", needs: "A stable contract old app versions can keep using.", risk: "A breaking change strands users who can't upgrade." },
      { who: "Payments team", needs: "Exactly-once payment effects despite flaky networks.", risk: "Duplicate or missing charges = refunds + support load." },
      { who: "Platform ops", needs: "Traces, metrics, SLOs to run it in production.", risk: "No observability = long outages, blind debugging." },
      { who: "Security team", needs: "Authn/authz, least privilege, audited access.", risk: "A missing authorization check leaks customer data." }
    ],
    endpoints: [
      { m: "GET", p: "/v1/products", d: "Browse catalog (filter, paginate)" },
      { m: "GET", p: "/v1/inventory/{productId}", d: "Availability snapshot" },
      { m: "POST", p: "/v1/orders", d: "Create an order (idempotent)" },
      { m: "GET", p: "/v1/orders/{orderId}", d: "Fetch one order" },
      { m: "GET", p: "/v1/orders", d: "List a customer's orders" },
      { m: "POST", p: "/v1/payments", d: "Initiate a payment" },
      { m: "POST", p: "/v1/shipments", d: "Create a shipment" }
    ],
    sampleOrderRequest: {
      customerId: "C1024",
      items: [{ productId: "P501", quantity: 2 }]
    },
    sampleOrderResponse: {
      orderId: "ORD-10025",
      status: "PENDING",
      total: 29980,
      currency: "INR"
    },
    sampleProblem: {
      type: "https://api.shopsphere.example/problems/invalid-order",
      title: "Order validation failed",
      status: 422,
      detail: "One or more order items are invalid.",
      instance: "/v1/orders",
      code: "INVALID_ORDER_ITEM",
      requestId: "req-7f3a21"
    },
    architecture: architecture,
    orderStates: orderStates,
    products: PRODUCTS
  };
})();
