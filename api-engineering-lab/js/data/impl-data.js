/* ============================================================
   impl-data.js — Implementation & Testing content
   Express workshop stages (cumulative), request collections for the
   testing workbench, testing challenges, and the ShopSphere OpenAPI
   spec. Code is original and internally consistent across stages.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  // Each stage shows the DELTA added at that stage + why + a sample run.
  var expressStages = [
    { n: 1, title: "Basic server", why: "Stand up an HTTP server that responds at all. Everything else hangs off this.",
      code: "const express = require('express');\nconst app = express();\n\napp.get('/health', (req, res) => res.json({ status: 'ok' }));\n\nconst PORT = process.env.PORT || 3000;\napp.listen(PORT, () => console.log(`API on :${PORT}`));",
      run: { m: "GET", p: "/health", status: 200, body: { status: "ok" } } },
    { n: 2, title: "A GET endpoint", why: "Serve a resource. Return an array for a collection; 404 for a missing item.",
      code: "let orders = [{ orderId: 'ORD-10025', status: 'PENDING', total: 29980 }];\n\napp.get('/v1/orders', (req, res) => res.json({ data: orders }));\n\napp.get('/v1/orders/:id', (req, res) => {\n  const o = orders.find(o => o.orderId === req.params.id);\n  if (!o) return res.status(404).json({ title: 'Not Found' });\n  res.json(o);\n});",
      run: { m: "GET", p: "/v1/orders/ORD-10025", status: 200, body: { orderId: "ORD-10025", status: "PENDING", total: 29980 } } },
    { n: 3, title: "A POST endpoint", why: "Accept a creation. Return 201 and the new resource.",
      code: "app.post('/v1/orders', (req, res) => {\n  const order = { orderId: 'ORD-' + Date.now(), status: 'PENDING' };\n  orders.push(order);\n  res.status(201).json(order);\n});",
      run: { m: "POST", p: "/v1/orders", status: 201, body: { orderId: "ORD-1700000000000", status: "PENDING" } } },
    { n: 4, title: "Parse JSON bodies", why: "Without a body parser, req.body is undefined — the #1 Express gotcha.",
      code: "// BEFORE any routes that read a body:\napp.use(express.json());\n\n// now req.body works:\napp.post('/v1/orders', (req, res) => {\n  console.log(req.body.customerId); // defined now\n  // ...\n});",
      run: { m: "POST", p: "/v1/orders", status: 201, body: { ok: true, note: "req.body is populated" } } },
    { n: 5, title: "Input validation", why: "Reject bad input early with 422 — before any business logic or DB call.",
      code: "function validateOrder(req, res, next) {\n  const { customerId, items } = req.body || {};\n  if (!customerId || !Array.isArray(items) || items.length === 0)\n    return res.status(422).json({ title: 'Validation failed', code: 'INVALID_ORDER' });\n  for (const it of items)\n    if (!it.productId || !(it.quantity >= 1))\n      return res.status(422).json({ title: 'Validation failed', code: 'INVALID_ORDER_ITEM' });\n  next();\n}\napp.post('/v1/orders', validateOrder, createOrder);",
      run: { m: "POST", p: "/v1/orders (quantity: 0)", status: 422, body: { title: "Validation failed", code: "INVALID_ORDER_ITEM" } } },
    { n: 6, title: "Resource storage", why: "An in-memory store for the lesson; swap for a DB later behind the same interface.",
      code: "const store = {\n  orders: new Map(),\n  create(o) { this.orders.set(o.orderId, o); return o; },\n  get(id) { return this.orders.get(id) || null; },\n  list() { return [...this.orders.values()]; }\n};",
      run: { m: "GET", p: "/v1/orders", status: 200, body: { data: ["…orders from the store…"] } } },
    { n: 7, title: "Central error handling", why: "One error middleware turns thrown errors into safe Problem Details — no stack traces leak.",
      code: "// LAST middleware (4 args marks it as the error handler):\napp.use((err, req, res, next) => {\n  const status = err.status || 500;\n  console.error(req.id, err); // full detail to logs only\n  res.status(status).json({\n    title: status === 500 ? 'Internal error' : err.title,\n    status, code: err.code, requestId: req.id\n  });\n});",
      run: { m: "POST", p: "/v1/orders (server throws)", status: 500, body: { title: "Internal error", status: 500, requestId: "req-7f3a21" } } },
    { n: 8, title: "Authentication middleware", why: "Identify the caller from a bearer token; 401 if missing/invalid.",
      code: "function authenticate(req, res, next) {\n  const h = req.headers.authorization || '';\n  const token = h.startsWith('Bearer ') ? h.slice(7) : null;\n  if (!token) return res.status(401).json({ title: 'Authentication required', code: 'UNAUTHENTICATED' });\n  try { req.user = verifyToken(token); next(); }\n  catch { res.status(401).json({ title: 'Invalid token', code: 'INVALID_TOKEN' }); }\n}\napp.use('/v1', authenticate);",
      run: { m: "POST", p: "/v1/orders (no token)", status: 401, body: { title: "Authentication required", code: "UNAUTHENTICATED" } } },
    { n: 9, title: "Authorization checks", why: "Authentication ≠ authorization. Check scope/ownership before acting.",
      code: "function requireScope(scope) {\n  return (req, res, next) => {\n    if (!req.user.scopes.includes(scope))\n      return res.status(403).json({ title: 'Forbidden', code: 'FORBIDDEN' });\n    next();\n  };\n}\napp.post('/v1/orders', requireScope('orders:write'), validateOrder, createOrder);\n// Ownership: a customer may only read THEIR orders\nif (order.customerId !== req.user.customerId) return res.status(404).end();",
      run: { m: "POST", p: "/v1/orders (wrong scope)", status: 403, body: { title: "Forbidden", code: "FORBIDDEN" } } },
    { n: 10, title: "Pagination & filtering", why: "Never return unbounded collections. Cap the limit; support filters.",
      code: "app.get('/v1/orders', (req, res) => {\n  const limit = Math.min(parseInt(req.query.limit) || 20, 100);\n  let rows = store.list();\n  if (req.query.status) rows = rows.filter(o => o.status === req.query.status);\n  const offset = parseInt(req.query.offset) || 0;\n  res.json({ data: rows.slice(offset, offset + limit),\n    pagination: { total: rows.length, limit, offset } });\n});",
      run: { m: "GET", p: "/v1/orders?status=PAID&limit=20", status: 200, body: { data: ["…"], pagination: { total: 128, limit: 20, offset: 0 } } } },
    { n: 11, title: "Idempotent order creation", why: "Make retries safe: store the key→response; replay on repeat.",
      code: "const idem = new Map();\napp.post('/v1/orders', (req, res) => {\n  const key = req.headers['idempotency-key'];\n  if (key && idem.has(key)) return res.status(200).json(idem.get(key));\n  const order = store.create(buildOrder(req));\n  if (key) idem.set(key, order);     // + persistence + TTL in prod\n  res.status(201).json(order);\n});",
      run: { m: "POST", p: "/v1/orders (same key ×3)", status: 201, body: { orderId: "ORD-10025", note: "one order; retries replay it" } } },
    { n: 12, title: "Structured logging", why: "Log JSON with a request id so you can correlate across services.",
      code: "app.use((req, res, next) => {\n  req.id = req.headers['x-request-id'] || crypto.randomUUID();\n  const t = Date.now();\n  res.on('finish', () => console.log(JSON.stringify({\n    reqId: req.id, method: req.method, path: req.path,\n    status: res.statusCode, ms: Date.now() - t\n  })));\n  next();\n});",
      run: { m: "GET", p: "/v1/orders", status: 200, body: { log: '{ "reqId": "…", "status": 200, "ms": 12 }' } } },
    { n: 13, title: "Database integration", why: "Swap the in-memory store for a DB; use transactions + parameterized queries.",
      code: "async function createOrder(req, res, next) {\n  const client = await pool.connect();\n  try {\n    await client.query('BEGIN');\n    const { rows } = await client.query(\n      'INSERT INTO orders(customer_id, total) VALUES($1,$2) RETURNING *',\n      [req.body.customerId, computeTotal(req.body.items)]); // parameterized → no SQLi\n    await client.query('COMMIT');\n    res.status(201).json(rows[0]);\n  } catch (e) { await client.query('ROLLBACK'); next(e); }\n  finally { client.release(); }\n}",
      run: { m: "POST", p: "/v1/orders", status: 201, body: { orderId: "ORD-10025", status: "PENDING", total: 29980 } } },
    { n: 14, title: "OpenAPI documentation", why: "Describe the contract once; serve interactive docs from it.",
      code: "const openapi = YAML.load('./openapi/openapi.yaml');\napp.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));\n// optional: validate requests against the spec\napp.use(OpenApiValidator.middleware({ apiSpec: './openapi/openapi.yaml' }));",
      run: { m: "GET", p: "/docs", status: 200, body: { note: "interactive API docs rendered from openapi.yaml" } } },
    { n: 15, title: "Automated tests", why: "Lock the contract: assert status + body for happy and error paths.",
      code: "const request = require('supertest');\n\ntest('creates an order', async () => {\n  const res = await request(app).post('/v1/orders')\n    .set('Authorization', 'Bearer test').send({ customerId: 'C1', items: [{ productId: 'P501', quantity: 1 }] });\n  expect(res.status).toBe(201);\n  expect(res.body.orderId).toBeDefined();\n});\n\ntest('rejects an empty cart', async () => {\n  const res = await request(app).post('/v1/orders')\n    .set('Authorization', 'Bearer test').send({ customerId: 'C1', items: [] });\n  expect(res.status).toBe(422);\n});",
      run: { m: "npm test", p: "", status: 200, body: { note: "2 passed (create 201, empty-cart 422)" } } },
    { n: 16, title: "Production considerations", why: "Config, health, limits, security headers, graceful shutdown.",
      code: "app.use(helmet());                       // security headers\napp.use(express.json({ limit: '100kb' })); // cap body size\napp.use(rateLimit({ windowMs: 60000, max: 100 }));\napp.get('/health', (req, res) => res.json({ status: 'ok' }));\n\nconst server = app.listen(PORT);\nprocess.on('SIGTERM', () => server.close(() => process.exit(0))); // drain in-flight",
      run: { m: "GET", p: "/health", status: 200, body: { status: "ok" } } }
  ];

  var collections = [
    { name: "Catalog", reqs: [
      { m: "GET", p: "/v1/products", desc: "List products" },
      { m: "GET", p: "/v1/inventory/P501", desc: "Check stock snapshot" } ] },
    { name: "Orders", reqs: [
      { m: "POST", p: "/v1/orders", headers: { "Idempotency-Key": "chk-1" }, body: { customerId: "C1024", items: [{ productId: "P501", quantity: 2 }] }, desc: "Create an order" },
      { m: "GET", p: "/v1/orders/{{orderId}}", desc: "Fetch the created order (chained id)" },
      { m: "GET", p: "/v1/orders?status=PAID&limit=10", desc: "List paid orders" } ] },
    { name: "Failure scenarios", reqs: [
      { m: "POST", p: "/v1/orders", desc: "Create without auth → 401", inject: { authMissing: true } },
      { m: "POST", p: "/v1/orders", headers: { Authorization: "Bearer bad" }, desc: "Bad scope → 403", inject: { authForbidden: true } },
      { m: "POST", p: "/v1/orders", body: { items: [{ productId: "P501", quantity: 0 }] }, desc: "Invalid body → 422", inject: { validationFail: true } },
      { m: "GET", p: "/v1/products", desc: "Over quota → 429", inject: { gatewayRateLimited: true } } ] }
  ];

  var challenges = [
    { id: "c-undefined-body", title: "req.body is undefined in Express", symptom: "Your POST handler reads req.body.customerId and gets 'Cannot read properties of undefined'.", clue: "The request has a JSON body and Content-Type: application/json.", hints: ["Did the request reach the handler at all?", "What turns the raw body into req.body?", "Order matters: middleware runs top-to-bottom."], answer: "You forgot app.use(express.json()) (or put it AFTER the route).", explain: "Express doesn't parse bodies by default. Add app.use(express.json()) BEFORE any route that reads req.body. Without it, req.body is undefined." },
    { id: "c-400", title: "Server returns 400 for a 'valid' request", symptom: "A POST returns 400 Bad Request even though the payload looks right.", clue: "The body was copy-pasted from a JS object.", hints: ["Is the body actually valid JSON?", "Check for trailing commas or single quotes.", "Does Content-Type match the body?"], answer: "The body isn't valid JSON (e.g. single quotes or a trailing comma), so parsing fails → 400.", explain: "400 means the server couldn't parse/understand the request. Validate the JSON (double quotes, no trailing commas) and set Content-Type: application/json." },
    { id: "c-401", title: "Every request returns 401", symptom: "All calls to /v1/* return 401 Unauthorized.", clue: "You're sending a token.", hints: ["Is the Authorization header actually present on the wire?", "Is the scheme 'Bearer <token>'?", "Has the token expired?"], answer: "Missing/malformed Authorization header or an expired token.", explain: "401 = unauthenticated. Send 'Authorization: Bearer <token>', refresh if expired. (401 ≠ 403.)" },
    { id: "c-403", title: "403 despite a valid token", symptom: "Authentication works, but one endpoint returns 403.", clue: "Other endpoints work with the same token.", hints: ["Authn succeeded — so what's left?", "Does the token have the required scope?", "Is it someone else's resource?"], answer: "The token is valid but lacks the required scope (or you're accessing another user's resource).", explain: "403 = authenticated but not permitted. Retrying with the same identity won't help — you need the right scope/ownership." },
    { id: "c-dup", title: "Duplicate orders appearing", symptom: "Some customers get charged twice during flaky network conditions.", clue: "It correlates with mobile users on poor connections.", hints: ["What does the client do when a response is lost?", "Is the POST idempotent?", "Is there a unique constraint?"], answer: "Retries on a non-idempotent POST with no idempotency key create duplicates.", explain: "Accept an Idempotency-Key, persist key→result, and add a unique constraint so a retry returns the same order instead of a new one." },
    { id: "c-429", title: "A partner suddenly gets 429s", symptom: "A partner integration starts failing with 429 during a sale.", clue: "Traffic from that partner spiked.", hints: ["What does 429 mean?", "Is there a Retry-After header?", "Per-partner quota?"], answer: "The partner exceeded its rate-limit quota.", explain: "429 = too many requests. The client should honor Retry-After and back off; you may raise that partner's quota or add burst allowance." },
    { id: "c-504", title: "Checkout intermittently returns 504", symptom: "Some checkouts hang then return 504 Gateway Timeout.", clue: "It lines up with payment-provider slowness.", hints: ["Whose timeout is 504?", "Which dependency is slow?", "What happens to the charge on timeout?"], answer: "An upstream (payment provider) exceeded the gateway's timeout budget.", explain: "504 = upstream didn't respond in time. Add timeouts + bounded retries + a circuit breaker, and reconcile the uncertain charge via webhook — never blind-retry a payment." }
  ];

  var openapiYaml =
    "openapi: 3.1.0\n" +
    "info:\n  title: ShopSphere Orders API\n  version: 1.0.0\n" +
    "servers:\n  - url: https://api.shopsphere.example\n" +
    "paths:\n" +
    "  /v1/orders:\n" +
    "    post:\n" +
    "      summary: Create an order\n      operationId: createOrder\n" +
    "      security: [{ bearerAuth: [] }]\n" +
    "      parameters:\n        - in: header\n          name: Idempotency-Key\n          schema: { type: string }\n" +
    "      requestBody:\n        required: true\n        content:\n          application/json:\n            schema: { $ref: '#/components/schemas/NewOrder' }\n" +
    "      responses:\n        '201': { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/Order' } } } }\n        '422': { description: Validation failed }\n" +
    "  /v1/orders/{orderId}:\n" +
    "    get:\n      summary: Get an order\n      operationId: getOrder\n      security: [{ bearerAuth: [] }]\n" +
    "      parameters:\n        - in: path\n          name: orderId\n          required: true\n          schema: { type: string }\n" +
    "      responses:\n        '200': { description: OK }\n        '404': { description: Not found }\n" +
    "components:\n" +
    "  securitySchemes:\n    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }\n" +
    "  schemas:\n" +
    "    NewOrder:\n      type: object\n      required: [customerId, items]\n      properties:\n        customerId: { type: string }\n        items:\n          type: array\n          items:\n            type: object\n            required: [productId, quantity]\n            properties:\n              productId: { type: string }\n              quantity: { type: integer, minimum: 1 }\n" +
    "    Order:\n      type: object\n      properties:\n        orderId: { type: string }\n        status: { type: string, enum: [PENDING, PAID, SHIPPED, DELIVERED, CANCELLED] }\n        total: { type: number }\n        currency: { type: string }";

  AV.data.impl = { expressStages: expressStages, collections: collections, challenges: challenges, openapiYaml: openapiYaml };
})();
