/* ============================================================
   kata-data.js — "Your turn" code katas for the Express Workshop
   One kata per workshop stage. Each defines: the task, starter
   code with blanks, the function name the grader calls, hints,
   the reference solution, and the tests (run via AV.KataRunner).
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  function sampleOrders() {
    return [
      { orderId: "ORD-10025", customerId: "C1024", status: "PENDING", total: 29980 },
      { orderId: "ORD-10026", customerId: "C2048", status: "PAID", total: 4999 },
      { orderId: "ORD-10027", customerId: "C1024", status: "SHIPPED", total: 15000 }
    ];
  }

  var KATAS = [

    { stage: 1, id: "k01", fnName: "healthHandler",
      task: "Write the handler for <code>GET /health</code>. It must respond with JSON <code>{ status: \"ok\" }</code> and a 200.",
      starter: "function healthHandler(req, res) {\n  // respond with { status: 'ok' }\n}",
      hints: ["res.json(obj) sends a JSON response.", "The default status is already 200 — you only need to send the body."],
      solution: "function healthHandler(req, res) {\n  res.json({ status: 'ok' });\n}",
      tests: [
        { name: "responds 200", run: function (fn, c) { var r = c.res(); fn(c.req({ path: "/health" }), r); c.assert.status(r, 200); } },
        { name: "body is { status: 'ok' }", run: function (fn, c) { var r = c.res(); fn(c.req({}), r); c.assert.eq(r.body, { status: "ok" }, "body"); } },
        { name: "actually sends a response", run: function (fn, c) { var r = c.res(); fn(c.req({}), r); c.assert.ok(r.ended, "nothing was sent — call res.json(...)"); } }
      ] },

    { stage: 2, id: "k02", fnName: "getOrder",
      task: "Write <code>GET /v1/orders/:id</code>. Find the order whose <code>orderId</code> equals <code>req.params.id</code> in the <code>orders</code> array (provided). Respond with the order, or <b>404</b> with <code>{ title: \"Not Found\" }</code> when it doesn't exist.",
      starter: "function getOrder(req, res) {\n  // `orders` is in scope: [{ orderId, customerId, status, total }, …]\n  // find req.params.id — respond with the order or a 404\n}",
      hints: ["Array.prototype.find is your friend.", "Missing resource → res.status(404).json({ title: 'Not Found' }).", "Return after sending the 404 so you don't send twice."],
      solution: "function getOrder(req, res) {\n  const o = orders.find(o => o.orderId === req.params.id);\n  if (!o) return res.status(404).json({ title: 'Not Found' });\n  res.json(o);\n}",
      env: function () { return { orders: sampleOrders() }; },
      tests: [
        { name: "returns an existing order", run: function (fn, c) { var r = c.res(); fn(c.req({ params: { id: "ORD-10026" } }), r); c.assert.status(r, 200); c.assert.has(r.body, "orderId"); c.assert.eq(r.body.orderId, "ORD-10026", "orderId"); } },
        { name: "404 for a missing order", run: function (fn, c) { var r = c.res(); fn(c.req({ params: { id: "ORD-99999" } }), r); c.assert.status(r, 404); } },
        { name: "404 body is a Problem-style object", run: function (fn, c) { var r = c.res(); fn(c.req({ params: { id: "ORD-99999" } }), r); c.assert.has(r.body, "title"); } },
        { name: "doesn't send two responses", run: function (fn, c) { var r = c.res(); fn(c.req({ params: { id: "ORD-99999" } }), r); c.assert.ok(r.jsonCalls <= 1, "res.json was called " + r.jsonCalls + " times — did you forget `return`?"); } }
      ] },

    { stage: 3, id: "k03", fnName: "createOrder",
      task: "Write <code>POST /v1/orders</code>. Build an order <code>{ orderId, customerId, status: \"PENDING\" }</code> (take <code>customerId</code> from the body, make any unique <code>orderId</code>), push it into <code>orders</code>, and respond <b>201</b> with the new order.",
      starter: "function createOrder(req, res) {\n  // build the order, store it in `orders`, respond 201\n}",
      hints: ["Creation responds 201, not 200: res.status(201).json(order).", "'ORD-' + Date.now() is a fine lesson-grade id.", "Don't forget to push it into the array — the test checks storage."],
      solution: "function createOrder(req, res) {\n  const order = { orderId: 'ORD-' + Date.now(), customerId: req.body.customerId, status: 'PENDING' };\n  orders.push(order);\n  res.status(201).json(order);\n}",
      env: function () { return { orders: [] }; },
      tests: [
        { name: "responds 201", run: function (fn, c) { var r = c.res(); fn(c.req({ method: "POST", body: { customerId: "C1" } }), r); c.assert.status(r, 201); } },
        { name: "returns the created order", run: function (fn, c) { var r = c.res(); fn(c.req({ method: "POST", body: { customerId: "C7" } }), r); c.assert.has(r.body, "orderId"); c.assert.eq(r.body.customerId, "C7", "customerId"); c.assert.eq(r.body.status, "PENDING", "status"); } },
        { name: "stores the order", run: function (fn, c) { var r = c.res(); fn(c.req({ method: "POST", body: { customerId: "C1" } }), r); c.assert.ok(c.env.orders.length === 1, "the order wasn't pushed into `orders`"); } }
      ] },

    { stage: 4, id: "k04", fnName: "jsonBodyParser",
      task: "Write a tiny version of <code>express.json()</code>: middleware that, when <code>Content-Type</code> is <code>application/json</code> and <code>req.body</code> is still a raw string, parses it into an object. Invalid JSON → <b>400</b> with <code>{ title: \"Malformed JSON\" }</code>. Otherwise call <code>next()</code>.",
      starter: "function jsonBodyParser(req, res, next) {\n  // if content-type is application/json and req.body is a string:\n  //   parse it (JSON.parse) — on failure respond 400\n  // always call next() when you don't respond\n}",
      hints: ["req.headers['content-type'] — header names are lower-case.", "Wrap JSON.parse in try/catch; the catch is your 400.", "Middleware that doesn't end the response MUST call next()."],
      solution: "function jsonBodyParser(req, res, next) {\n  const ct = req.headers['content-type'] || '';\n  if (ct.indexOf('application/json') !== -1 && typeof req.body === 'string') {\n    try { req.body = JSON.parse(req.body); }\n    catch (e) { return res.status(400).json({ title: 'Malformed JSON' }); }\n  }\n  next();\n}",
      tests: [
        { name: "parses a valid JSON body", run: function (fn, c) { var q = c.req({ headers: { "Content-Type": "application/json" }, body: '{"a":1}' }); var n = c.next(); fn(q, c.res(), n); c.assert.eq(q.body, { a: 1 }, "req.body"); c.assert.ok(n.called, "next() was not called"); } },
        { name: "400 on malformed JSON", run: function (fn, c) { var r = c.res(); var n = c.next(); fn(c.req({ headers: { "content-type": "application/json" }, body: "{'bad': json,}" }), r, n); c.assert.status(r, 400); c.assert.ok(!n.called, "don't call next() after responding 400"); } },
        { name: "passes non-JSON requests through untouched", run: function (fn, c) { var q = c.req({ headers: { "content-type": "text/plain" }, body: "hello" }); var n = c.next(); fn(q, c.res(), n); c.assert.eq(q.body, "hello", "req.body"); c.assert.ok(n.called, "next() was not called"); } }
      ] },

    { stage: 5, id: "k05", fnName: "validateOrder",
      task: "Write validation middleware for order creation. Reject with <b>422</b> and <code>{ title: \"Validation failed\", code }</code> when: <code>customerId</code> is missing (<code>code: \"INVALID_ORDER\"</code>), <code>items</code> is missing/empty (<code>INVALID_ORDER</code>), or any item lacks <code>productId</code> or has <code>quantity &lt; 1</code> (<code>INVALID_ORDER_ITEM</code>). Valid input → <code>next()</code>.",
      starter: "function validateOrder(req, res, next) {\n  const { customerId, items } = req.body || {};\n  // reject bad input with 422 + a machine-readable code; else next()\n}",
      hints: ["Array.isArray(items) && items.length > 0 covers the collection checks.", "Loop the items; `!(it.quantity >= 1)` also catches undefined and strings.", "Always `return` after responding so later checks don't run."],
      solution: "function validateOrder(req, res, next) {\n  const { customerId, items } = req.body || {};\n  if (!customerId || !Array.isArray(items) || items.length === 0)\n    return res.status(422).json({ title: 'Validation failed', code: 'INVALID_ORDER' });\n  for (const it of items)\n    if (!it.productId || !(it.quantity >= 1))\n      return res.status(422).json({ title: 'Validation failed', code: 'INVALID_ORDER_ITEM' });\n  next();\n}",
      tests: [
        { name: "accepts a valid order", run: function (fn, c) { var n = c.next(); fn(c.req({ body: { customerId: "C1", items: [{ productId: "P501", quantity: 2 }] } }), c.res(), n); c.assert.ok(n.called, "next() should be called for valid input"); } },
        { name: "422 when customerId is missing", run: function (fn, c) { var r = c.res(); fn(c.req({ body: { items: [{ productId: "P501", quantity: 1 }] } }), r, c.next()); c.assert.status(r, 422); c.assert.eq(r.body && r.body.code, "INVALID_ORDER", "code"); } },
        { name: "422 when items is empty", run: function (fn, c) { var r = c.res(); fn(c.req({ body: { customerId: "C1", items: [] } }), r, c.next()); c.assert.status(r, 422); } },
        { name: "422 when quantity is 0", run: function (fn, c) { var r = c.res(); fn(c.req({ body: { customerId: "C1", items: [{ productId: "P501", quantity: 0 }] } }), r, c.next()); c.assert.status(r, 422); c.assert.eq(r.body && r.body.code, "INVALID_ORDER_ITEM", "code"); } },
        { name: "survives a missing body", run: function (fn, c) { var r = c.res(); fn(c.req({}), r, c.next()); c.assert.status(r, 422); } }
      ] },

    { stage: 6, id: "k06", fnName: "makeStore",
      task: "Write <code>makeStore()</code> returning a storage object with three methods: <code>create(order)</code> (saves by <code>orderId</code>, returns the order), <code>get(id)</code> (returns the order or <code>null</code>), <code>list()</code> (returns an array of all orders).",
      starter: "function makeStore() {\n  // back it with a Map keyed by orderId\n  return {\n    create(order) { /* … */ },\n    get(id) { /* … */ },\n    list() { /* … */ }\n  };\n}",
      hints: ["const byId = new Map(); closure state beats globals.", "get: return byId.get(id) || null.", "list: [...byId.values()] or Array.from."],
      solution: "function makeStore() {\n  const byId = new Map();\n  return {\n    create(order) { byId.set(order.orderId, order); return order; },\n    get(id) { return byId.get(id) || null; },\n    list() { return [...byId.values()]; }\n  };\n}",
      tests: [
        { name: "create returns the order and get finds it", run: function (fn, c) { var s = fn(); var o = { orderId: "ORD-1", total: 10 }; c.assert.eq(s.create(o), o, "create return"); c.assert.eq(s.get("ORD-1"), o, "get"); } },
        { name: "get returns null for unknown ids", run: function (fn, c) { var s = fn(); c.assert.eq(s.get("nope"), null, "get(unknown)"); } },
        { name: "list returns everything", run: function (fn, c) { var s = fn(); s.create({ orderId: "A" }); s.create({ orderId: "B" }); c.assert.eq(s.list().length, 2, "list length"); } },
        { name: "two stores don't share state", run: function (fn, c) { var a = fn(), b = fn(); a.create({ orderId: "A" }); c.assert.eq(b.list().length, 0, "second store size"); } }
      ] },

    { stage: 7, id: "k07", fnName: "errorHandler",
      task: "Write the central error middleware <code>(err, req, res, next)</code>. Status = <code>err.status</code> or 500. For 500s the body title must be the generic <code>\"Internal error\"</code> (never <code>err.message</code> — no leaks); otherwise use <code>err.title</code>. Always include <code>status</code>, <code>code: err.code</code> and <code>requestId: req.id</code>.",
      starter: "function errorHandler(err, req, res, next) {\n  // status from err.status (default 500)\n  // 500 → generic title; else err.title\n  // include status, code, requestId\n}",
      hints: ["const status = err.status || 500;", "Ternary: status === 500 ? 'Internal error' : err.title.", "req.id was set by the logging middleware — pass it through as requestId."],
      solution: "function errorHandler(err, req, res, next) {\n  const status = err.status || 500;\n  res.status(status).json({\n    title: status === 500 ? 'Internal error' : err.title,\n    status, code: err.code, requestId: req.id\n  });\n}",
      tests: [
        { name: "known error keeps its title and status", run: function (fn, c) { var r = c.res(); var e = new Error("boom"); e.status = 422; e.title = "Validation failed"; e.code = "INVALID"; fn(e, c.req({ id: "req-1" }), r, c.next()); c.assert.status(r, 422); c.assert.eq(r.body.title, "Validation failed", "title"); } },
        { name: "unknown error becomes a generic 500", run: function (fn, c) { var r = c.res(); fn(new Error("SELECT * FROM users failed at db.js:42"), c.req({ id: "req-2" }), r, c.next()); c.assert.status(r, 500); c.assert.eq(r.body.title, "Internal error", "title"); } },
        { name: "never leaks err.message on a 500", run: function (fn, c) { var r = c.res(); fn(new Error("secret stack detail"), c.req({ id: "x" }), r, c.next()); c.assert.ok(JSON.stringify(r.body).indexOf("secret") === -1, "the raw error message leaked into the response"); } },
        { name: "carries the request id", run: function (fn, c) { var r = c.res(); fn(new Error("x"), c.req({ id: "req-7f3a21" }), r, c.next()); c.assert.eq(r.body.requestId, "req-7f3a21", "requestId"); } }
      ] },

    { stage: 8, id: "k08", fnName: "authenticate",
      task: "Write authentication middleware. Read the <code>Authorization</code> header; it must be <code>Bearer &lt;token&gt;</code>. No token → <b>401</b> <code>{ title: \"Authentication required\", code: \"UNAUTHENTICATED\" }</code>. Verify with <code>verifyToken(token)</code> (provided — throws when invalid): invalid → <b>401</b> <code>{ code: \"INVALID_TOKEN\" }</code>; valid → set <code>req.user</code> and call <code>next()</code>.",
      starter: "function authenticate(req, res, next) {\n  // 1. extract the bearer token from req.headers.authorization\n  // 2. missing → 401 UNAUTHENTICATED\n  // 3. verifyToken(token) throws when invalid → 401 INVALID_TOKEN\n  // 4. valid → req.user = …; next()\n}",
      hints: ["h.startsWith('Bearer ') ? h.slice(7) : null", "verifyToken throws — that's what try/catch is for.", "Don't call next() inside the catch."],
      solution: "function authenticate(req, res, next) {\n  const h = req.headers.authorization || '';\n  const token = h.startsWith('Bearer ') ? h.slice(7) : null;\n  if (!token) return res.status(401).json({ title: 'Authentication required', code: 'UNAUTHENTICATED' });\n  try { req.user = verifyToken(token); next(); }\n  catch (e) { res.status(401).json({ title: 'Invalid token', code: 'INVALID_TOKEN' }); }\n}",
      env: function () {
        return { verifyToken: function (token) {
          if (token === "good-token") return { sub: "C1024", scopes: ["orders:read", "orders:write"] };
          throw new Error("invalid token");
        } };
      },
      tests: [
        { name: "401 UNAUTHENTICATED without a header", run: function (fn, c) { var r = c.res(); fn(c.req({}), r, c.next()); c.assert.status(r, 401); c.assert.eq(r.body && r.body.code, "UNAUTHENTICATED", "code"); } },
        { name: "401 for a non-Bearer scheme", run: function (fn, c) { var r = c.res(); fn(c.req({ headers: { Authorization: "Basic abc123" } }), r, c.next()); c.assert.status(r, 401); } },
        { name: "401 INVALID_TOKEN when verification fails", run: function (fn, c) { var r = c.res(); fn(c.req({ headers: { Authorization: "Bearer forged" } }), r, c.next()); c.assert.status(r, 401); c.assert.eq(r.body && r.body.code, "INVALID_TOKEN", "code"); } },
        { name: "valid token → req.user + next()", run: function (fn, c) { var q = c.req({ headers: { Authorization: "Bearer good-token" } }); var n = c.next(); fn(q, c.res(), n); c.assert.ok(n.called, "next() was not called"); c.assert.eq(q.user && q.user.sub, "C1024", "req.user.sub"); } }
      ] },

    { stage: 9, id: "k09", fnName: "requireScope",
      task: "Write the authorization middleware <i>factory</i> <code>requireScope(scope)</code>: it returns middleware that responds <b>403</b> <code>{ title: \"Forbidden\", code: \"FORBIDDEN\" }</code> when <code>req.user.scopes</code> doesn't include the scope, and calls <code>next()</code> when it does. (401 is authentication — this is the other one.)",
      starter: "function requireScope(scope) {\n  return (req, res, next) => {\n    // 403 when the scope is missing; next() when present\n  };\n}",
      hints: ["A factory: the outer function captures `scope`, the inner one is the middleware.", "req.user.scopes.includes(scope)", "403 means 'I know who you are, and no' — don't send 401 here."],
      solution: "function requireScope(scope) {\n  return (req, res, next) => {\n    if (!req.user || !req.user.scopes || !req.user.scopes.includes(scope))\n      return res.status(403).json({ title: 'Forbidden', code: 'FORBIDDEN' });\n    next();\n  };\n}",
      tests: [
        { name: "allows a caller holding the scope", run: function (fn, c) { var mw = fn("orders:write"); var n = c.next(); mw(c.req({ user: { scopes: ["orders:write"] } }), c.res(), n); c.assert.ok(n.called, "next() was not called"); } },
        { name: "403 (not 401) when the scope is missing", run: function (fn, c) { var mw = fn("orders:write"); var r = c.res(); mw(c.req({ user: { scopes: ["orders:read"] } }), r, c.next()); c.assert.status(r, 403); } },
        { name: "machine-readable code FORBIDDEN", run: function (fn, c) { var mw = fn("admin"); var r = c.res(); mw(c.req({ user: { scopes: [] } }), r, c.next()); c.assert.eq(r.body && r.body.code, "FORBIDDEN", "code"); } },
        { name: "different scopes are independent", run: function (fn, c) { var read = fn("orders:read"), admin = fn("admin"); var n = c.next(); var u = { user: { scopes: ["orders:read"] } }; read(c.req(u), c.res(), n); c.assert.ok(n.called, "read should pass"); var r = c.res(); admin(c.req(u), r, c.next()); c.assert.status(r, 403); } }
      ] },

    { stage: 10, id: "k10", fnName: "listOrders",
      task: "Write <code>GET /v1/orders</code> with pagination + filtering over <code>store.list()</code> (provided, 150 orders). Rules: <code>limit</code> defaults to 20 and is <b>capped at 100</b>; <code>offset</code> defaults to 0; <code>?status=X</code> filters first. Respond <code>{ data, pagination: { total, limit, offset } }</code> where <code>total</code> counts the <i>filtered</i> rows.",
      starter: "function listOrders(req, res) {\n  // read limit/offset/status from req.query (strings!)\n  // filter → count total → slice the page\n}",
      hints: ["Math.min(parseInt(req.query.limit) || 20, 100)", "Filter BEFORE computing total and slicing.", "rows.slice(offset, offset + limit)"],
      solution: "function listOrders(req, res) {\n  const limit = Math.min(parseInt(req.query.limit) || 20, 100);\n  const offset = parseInt(req.query.offset) || 0;\n  let rows = store.list();\n  if (req.query.status) rows = rows.filter(o => o.status === req.query.status);\n  res.json({ data: rows.slice(offset, offset + limit),\n    pagination: { total: rows.length, limit, offset } });\n}",
      env: function () {
        var rows = [];
        for (var i = 0; i < 150; i++) rows.push({ orderId: "ORD-" + (10000 + i), status: i % 3 === 0 ? "PAID" : "PENDING", total: 1000 + i });
        return { store: { list: function () { return rows.slice(); } } };
      },
      tests: [
        { name: "defaults to 20 rows", run: function (fn, c) { var r = c.res(); fn(c.req({ query: {} }), r); c.assert.eq(r.body.data.length, 20, "data length"); c.assert.eq(r.body.pagination.total, 150, "total"); } },
        { name: "caps limit at 100", run: function (fn, c) { var r = c.res(); fn(c.req({ query: { limit: "5000" } }), r); c.assert.ok(r.body.data.length <= 100, "returned " + r.body.data.length + " rows — the cap leaked"); } },
        { name: "offset pages through", run: function (fn, c) { var r1 = c.res(), r2 = c.res(); fn(c.req({ query: { limit: "10", offset: "0" } }), r1); fn(c.req({ query: { limit: "10", offset: "10" } }), r2); c.assert.ok(r1.body.data[0].orderId !== r2.body.data[0].orderId, "page 2 repeats page 1"); } },
        { name: "status filter changes total", run: function (fn, c) { var r = c.res(); fn(c.req({ query: { status: "PAID" } }), r); c.assert.eq(r.body.pagination.total, 50, "filtered total"); c.assert.ok(r.body.data.every(function (o) { return o.status === "PAID"; }), "unfiltered rows leaked in"); } }
      ] },

    { stage: 11, id: "k11", fnName: "createOrder",
      task: "Make order creation idempotent. Read the <code>Idempotency-Key</code> header. First time: create via <code>store.create(...)</code>, remember key→order in <code>idem</code> (a Map, provided), respond <b>201</b>. Same key again: respond <b>200</b> with the <i>stored</i> order — and don't create another.",
      starter: "function createOrder(req, res) {\n  const key = req.headers['idempotency-key'];\n  // replay? → 200 with the remembered order\n  // else create, remember (if key present), 201\n  // store.create({ orderId: 'ORD-' + seq(), …req.body }) is available\n}",
      hints: ["idem.has(key) / idem.get(key) / idem.set(key, order)", "Replay returns the SAME orderId — that's the whole point.", "No key → just create (but then retries aren't safe)."],
      solution: "function createOrder(req, res) {\n  const key = req.headers['idempotency-key'];\n  if (key && idem.has(key)) return res.status(200).json(idem.get(key));\n  const order = store.create({ orderId: 'ORD-' + seq(), customerId: req.body.customerId, status: 'PENDING' });\n  if (key) idem.set(key, order);\n  res.status(201).json(order);\n}",
      env: function () {
        var n = 0; var created = [];
        return {
          idem: new Map(),
          seq: function () { return ++n; },
          store: { create: function (o) { created.push(o); return o; }, _created: created }
        };
      },
      tests: [
        { name: "first request creates → 201", run: function (fn, c) { var r = c.res(); fn(c.req({ method: "POST", headers: { "Idempotency-Key": "chk-1" }, body: { customerId: "C1" } }), r); c.assert.status(r, 201); c.assert.has(r.body, "orderId"); } },
        { name: "replay returns the SAME order with 200", run: function (fn, c) { var r1 = c.res(), r2 = c.res(); var mk = function () { return c.req({ method: "POST", headers: { "Idempotency-Key": "chk-2" }, body: { customerId: "C1" } }); }; fn(mk(), r1); fn(mk(), r2); c.assert.status(r2, 200); c.assert.eq(r2.body.orderId, r1.body.orderId, "replayed orderId"); } },
        { name: "replay does NOT create a second order", run: function (fn, c) { var mk = function () { return c.req({ method: "POST", headers: { "idempotency-key": "chk-3" }, body: { customerId: "C1" } }); }; fn(mk(), c.res()); fn(mk(), c.res()); fn(mk(), c.res()); c.assert.eq(c.env.store._created.length, 1, "orders created"); } },
        { name: "different keys create different orders", run: function (fn, c) { var r1 = c.res(), r2 = c.res(); fn(c.req({ method: "POST", headers: { "Idempotency-Key": "a" }, body: {} }), r1); fn(c.req({ method: "POST", headers: { "Idempotency-Key": "b" }, body: {} }), r2); c.assert.ok(r1.body.orderId !== r2.body.orderId, "distinct keys must create distinct orders"); } }
      ] },

    { stage: 12, id: "k12", fnName: "requestLogger",
      task: "Write logging middleware. Set <code>req.id</code> from the <code>X-Request-Id</code> header, or generate one with <code>uuid()</code> (provided) when absent. Push a structured entry <code>{ reqId, method, path }</code> into the <code>logs</code> array (provided), then call <code>next()</code>.",
      starter: "function requestLogger(req, res, next) {\n  // req.id = incoming header or uuid()\n  // logs.push({ reqId, method, path })\n  // next()\n}",
      hints: ["Header names arrive lower-cased: req.headers['x-request-id'].", "Reusing the incoming id is what makes cross-service correlation work.", "Log an object, not a string — structured logs are queryable."],
      solution: "function requestLogger(req, res, next) {\n  req.id = req.headers['x-request-id'] || uuid();\n  logs.push({ reqId: req.id, method: req.method, path: req.path });\n  next();\n}",
      env: function () { var n = 0; return { logs: [], uuid: function () { return "gen-" + (++n); } }; },
      tests: [
        { name: "propagates an incoming X-Request-Id", run: function (fn, c) { var q = c.req({ headers: { "X-Request-Id": "req-abc" } }); fn(q, c.res(), c.next()); c.assert.eq(q.id, "req-abc", "req.id"); } },
        { name: "generates an id when none arrives", run: function (fn, c) { var q = c.req({}); fn(q, c.res(), c.next()); c.assert.ok(!!q.id, "req.id was not set"); } },
        { name: "writes a structured entry", run: function (fn, c) { fn(c.req({ method: "POST", path: "/v1/orders", headers: { "x-request-id": "r1" } }), c.res(), c.next()); var e = c.env.logs[0]; c.assert.ok(e && typeof e === "object", "nothing was pushed into logs"); c.assert.eq(e.reqId, "r1", "reqId"); c.assert.eq(e.method, "POST", "method"); c.assert.eq(e.path, "/v1/orders", "path"); } },
        { name: "calls next() so the request continues", run: function (fn, c) { var n = c.next(); fn(c.req({}), c.res(), n); c.assert.ok(n.called, "next() was not called"); } }
      ] },

    { stage: 13, id: "k13", fnName: "createOrder",
      task: "Create the order through the database — <b>with a parameterized query</b>. Call <code>db.query(sql, params)</code> (provided) using placeholders <code>$1, $2</code> for <code>customerId</code> and <code>total</code> (from the body). Respond <b>201</b> with <code>rows[0]</code>. String-concatenating values into the SQL fails the SQL-injection test.",
      starter: "function createOrder(req, res) {\n  const { customerId, total } = req.body;\n  // db.query('INSERT INTO orders(customer_id, total) VALUES(…) RETURNING *', […])\n  // respond 201 with rows[0]\n}",
      hints: ["db.query(sql, params) returns { rows } synchronously in this lab.", "Placeholders: VALUES($1, $2) — the driver escapes, you don't.", "If the test input shows up inside your SQL string, you concatenated."],
      solution: "function createOrder(req, res) {\n  const { customerId, total } = req.body;\n  const { rows } = db.query(\n    'INSERT INTO orders(customer_id, total) VALUES($1, $2) RETURNING *',\n    [customerId, total]);\n  res.status(201).json(rows[0]);\n}",
      env: function () {
        var calls = [];
        return { db: { _calls: calls, query: function (sql, params) {
          calls.push({ sql: String(sql), params: params });
          return { rows: [{ orderId: "ORD-20001", customerId: params && params[0], total: params && params[1], status: "PENDING" }] };
        } } };
      },
      tests: [
        { name: "responds 201 with the inserted row", run: function (fn, c) { var r = c.res(); fn(c.req({ method: "POST", body: { customerId: "C1", total: 999 } }), r); c.assert.status(r, 201); c.assert.eq(r.body && r.body.orderId, "ORD-20001", "orderId"); } },
        { name: "uses placeholders, not concatenation", run: function (fn, c) { fn(c.req({ method: "POST", body: { customerId: "C9", total: 5 } }), c.res()); var call = c.env.db._calls[c.env.db._calls.length - 1]; c.assert.ok(call, "db.query was never called"); c.assert.ok(/\$1/.test(call.sql), "no $1 placeholder in the SQL"); c.assert.ok(call.sql.indexOf("C9") === -1, "the raw value appears inside the SQL string — that's injectable"); } },
        { name: "survives a hostile customerId (SQLi probe)", run: function (fn, c) { var evil = "x'); DROP TABLE orders;--"; fn(c.req({ method: "POST", body: { customerId: evil, total: 1 } }), c.res()); var call = c.env.db._calls[c.env.db._calls.length - 1]; c.assert.ok(call.sql.indexOf("DROP TABLE") === -1, "the injection payload reached the SQL string"); c.assert.ok(call.params && call.params[0] === evil, "the value should travel in params, unchanged"); } }
      ] },

    { stage: 14, id: "k14", fnName: "specLint",
      task: "Write a mini spec linter: <code>specLint(spec)</code> takes a parsed OpenAPI object and returns an array of problem strings. Report <code>\"missing openapi version\"</code>, <code>\"missing info.title\"</code>, <code>\"missing paths\"</code> (absent or empty object), and for each operation without a <code>responses</code> object: <code>\"&lt;METHOD&gt; &lt;path&gt;: no responses\"</code> (method upper-case). A clean spec returns <code>[]</code>.",
      starter: "function specLint(spec) {\n  const problems = [];\n  // check spec.openapi, spec.info?.title, spec.paths\n  // walk paths → operations (get/post/put/patch/delete) → responses\n  return problems;\n}",
      hints: ["Object.keys(spec.paths || {}) — empty paths is also a problem.", "For each path object, loop ['get','post','put','patch','delete'].", "method.toUpperCase() + ' ' + path + ': no responses'"],
      solution: "function specLint(spec) {\n  const problems = [];\n  if (!spec.openapi) problems.push('missing openapi version');\n  if (!spec.info || !spec.info.title) problems.push('missing info.title');\n  const paths = spec.paths || {};\n  const keys = Object.keys(paths);\n  if (keys.length === 0) problems.push('missing paths');\n  for (const p of keys)\n    for (const m of ['get', 'post', 'put', 'patch', 'delete'])\n      if (paths[p][m] && !paths[p][m].responses)\n        problems.push(m.toUpperCase() + ' ' + p + ': no responses');\n  return problems;\n}",
      tests: [
        { name: "clean spec → no problems", run: function (fn, c) { var out = fn({ openapi: "3.1.0", info: { title: "T" }, paths: { "/a": { get: { responses: { 200: {} } } } } }); c.assert.eq(out, [], "problems"); } },
        { name: "flags a missing title and version", run: function (fn, c) { var out = fn({ paths: { "/a": { get: { responses: {} } } } }); c.assert.ok(out.indexOf("missing openapi version") !== -1, "version problem not reported"); c.assert.ok(out.indexOf("missing info.title") !== -1, "title problem not reported"); } },
        { name: "flags empty paths", run: function (fn, c) { var out = fn({ openapi: "3.1.0", info: { title: "T" }, paths: {} }); c.assert.ok(out.indexOf("missing paths") !== -1, "empty paths not reported"); } },
        { name: "names the operation with no responses", run: function (fn, c) { var out = fn({ openapi: "3.1.0", info: { title: "T" }, paths: { "/v1/orders": { post: { summary: "x" } } } }); c.assert.ok(out.indexOf("POST /v1/orders: no responses") !== -1, "expected 'POST /v1/orders: no responses', got " + JSON.stringify(out)); } }
      ] },

    { stage: 15, id: "k15", fnName: "checkCreateOrderResponse",
      task: "Write the assertion a contract test would run: <code>checkCreateOrderResponse(res)</code> receives <code>{ status, body }</code> and must <b>throw</b> (any Error) unless: status is 201, <code>body.orderId</code> is a non-empty string, and <code>body.status</code> is <code>\"PENDING\"</code>. A conforming response returns normally.",
      starter: "function checkCreateOrderResponse(res) {\n  // throw new Error('…') on each violation; say WHAT was wrong\n}",
      hints: ["A test that can't fail tests nothing — make sure each rule can throw.", "typeof res.body.orderId === 'string' && res.body.orderId.length > 0", "Three rules → three throws with three different messages."],
      solution: "function checkCreateOrderResponse(res) {\n  if (res.status !== 201) throw new Error('expected 201, got ' + res.status);\n  if (typeof res.body.orderId !== 'string' || !res.body.orderId)\n    throw new Error('orderId must be a non-empty string');\n  if (res.body.status !== 'PENDING') throw new Error('status must be PENDING');\n}",
      tests: [
        { name: "accepts a conforming response", run: function (fn, c) { fn({ status: 201, body: { orderId: "ORD-1", status: "PENDING" } }); } },
        { name: "rejects a 200 (wrong status code)", run: function (fn, c) { var threw = false; try { fn({ status: 200, body: { orderId: "ORD-1", status: "PENDING" } }); } catch (e) { threw = true; } c.assert.ok(threw, "a 200 must fail the contract — creation is 201"); } },
        { name: "rejects a missing orderId", run: function (fn, c) { var threw = false; try { fn({ status: 201, body: { status: "PENDING" } }); } catch (e) { threw = true; } c.assert.ok(threw, "missing orderId must fail"); } },
        { name: "rejects a wrong initial state", run: function (fn, c) { var threw = false; try { fn({ status: 201, body: { orderId: "ORD-1", status: "SHIPPED" } }); } catch (e) { threw = true; } c.assert.ok(threw, "a freshly created order can't already be SHIPPED"); } }
      ] },

    { stage: 16, id: "k16", fnName: "bodyLimitGuard",
      task: "Production hardening: write middleware that rejects oversized payloads. When the <code>Content-Length</code> header exceeds <b>100000</b> bytes, respond <b>413</b> with <code>{ title: \"Payload too large\", code: \"PAYLOAD_TOO_LARGE\" }</code>; otherwise (including when the header is absent) call <code>next()</code>.",
      starter: "function bodyLimitGuard(req, res, next) {\n  // parseInt the content-length header; > 100000 → 413; else next()\n}",
      hints: ["req.headers['content-length'] is a string (or undefined).", "parseInt(x, 10) || 0 treats a missing header as 0.", "413 Payload Too Large is the precise status — not 400."],
      solution: "function bodyLimitGuard(req, res, next) {\n  const len = parseInt(req.headers['content-length'], 10) || 0;\n  if (len > 100000)\n    return res.status(413).json({ title: 'Payload too large', code: 'PAYLOAD_TOO_LARGE' });\n  next();\n}",
      tests: [
        { name: "small bodies pass through", run: function (fn, c) { var n = c.next(); fn(c.req({ headers: { "Content-Length": "512" } }), c.res(), n); c.assert.ok(n.called, "next() was not called"); } },
        { name: "413 above the limit", run: function (fn, c) { var r = c.res(); fn(c.req({ headers: { "content-length": "2000000" } }), r, c.next()); c.assert.status(r, 413); c.assert.eq(r.body && r.body.code, "PAYLOAD_TOO_LARGE", "code"); } },
        { name: "exactly at the limit still passes", run: function (fn, c) { var n = c.next(); fn(c.req({ headers: { "content-length": "100000" } }), c.res(), n); c.assert.ok(n.called, "100000 is not > 100000 — it should pass"); } },
        { name: "no header → pass through", run: function (fn, c) { var n = c.next(); fn(c.req({}), c.res(), n); c.assert.ok(n.called, "a missing header shouldn't 413"); } }
      ] }
  ];

  AV.data.katas = KATAS;
})();
