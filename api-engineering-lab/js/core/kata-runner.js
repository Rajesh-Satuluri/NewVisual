/* ============================================================
   kata-runner.js — in-browser grader for Express-style katas
   ------------------------------------------------------------
   Compiles learner code with new Function (shadowing the risky
   globals so exercises stay honest), provides mock req/res/next
   in the Express shape, runs each kata's tests, and returns
   structured pass/fail results. Deterministic, no network.

   API:
     AV.KataRunner.mockReq(opts)  → Express-shaped request
     AV.KataRunner.mockRes()      → Express-shaped response recorder
     AV.KataRunner.run(kata, code) → { ok, error, results:[{name,pass,detail}] }
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  function mockReq(opts) {
    opts = opts || {};
    var headers = {};
    var src = opts.headers || {};
    for (var k in src) if (src.hasOwnProperty(k)) headers[k.toLowerCase()] = src[k];
    return {
      method: opts.method || "GET",
      path: opts.path || "/",
      params: opts.params || {},
      query: opts.query || {},
      body: "body" in opts ? opts.body : undefined,
      headers: headers,
      user: opts.user,
      id: opts.id,
      get: function (name) { return headers[String(name).toLowerCase()]; }
    };
  }

  function mockRes() {
    var res = {
      statusCode: 200,
      body: undefined,
      headers: {},
      ended: false,
      jsonCalls: 0,
      status: function (c) { res.statusCode = c; return res; },
      json: function (b) { res.body = b; res.ended = true; res.jsonCalls++; return res; },
      send: function (b) { res.body = b; res.ended = true; return res; },
      set: function (k, v) {
        if (typeof k === "object") { for (var kk in k) if (k.hasOwnProperty(kk)) res.headers[kk.toLowerCase()] = k[kk]; }
        else res.headers[String(k).toLowerCase()] = v;
        return res;
      },
      setHeader: function (k, v) { return res.set(k, v); },
      end: function () { res.ended = true; return res; },
      on: function () { return res; }
    };
    return res;
  }

  function mockNext() {
    var fn = function (err) { fn.called = true; fn.calls++; if (err !== undefined) fn.error = err; };
    fn.called = false; fn.calls = 0; fn.error = undefined;
    return fn;
  }

  // Compile learner code. The kata names the function it must define
  // (kata.fnName). Extra helpers from kata.env() are injected as
  // named locals; risky globals are shadowed to undefined so the
  // exercise can't cheat its way around the point being taught.
  var SHADOW = ["window", "document", "localStorage", "sessionStorage", "fetch", "XMLHttpRequest", "require", "module", "exports", "process", "globalThis", "importScripts", "alert", "location"];

  function compile(code, kata) {
    var env = kata.env ? kata.env() : {};
    var envKeys = [], envVals = [];
    for (var k in env) if (env.hasOwnProperty(k)) { envKeys.push(k); envVals.push(env[k]); }
    var params = envKeys.concat(SHADOW);
    var src = '"use strict";\n' + code + "\n;return (typeof " + kata.fnName + ' === "function") ? ' + kata.fnName + " : null;";
    var factory = new Function(params.join(","), src); // eslint-disable-line no-new-func
    var fn = factory.apply(null, envVals);
    if (!fn) throw new Error("Define a function named `" + kata.fnName + "` — the tests call it.");
    return { fn: fn, env: env };
  }

  // Assertion helpers handed to each test.
  var assert = {
    eq: function (got, want, what) {
      if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error((what || "value") + ": expected " + JSON.stringify(want) + ", got " + JSON.stringify(got));
    },
    status: function (res, want) {
      if (res.statusCode !== want) throw new Error("status: expected " + want + ", got " + res.statusCode);
    },
    ok: function (cond, msg) { if (!cond) throw new Error(msg || "assertion failed"); },
    has: function (obj, key, what) {
      if (!obj || typeof obj !== "object" || !(key in obj)) throw new Error((what || "body") + ": missing `" + key + "` — got " + JSON.stringify(obj));
    }
  };

  function run(kata, code) {
    // Compile once up front so syntax errors surface before any test.
    try { compile(code, kata); }
    catch (e) { return { ok: false, error: friendly(e), results: [] }; }

    var results = [];
    var allPass = true;
    for (var i = 0; i < kata.tests.length; i++) {
      var t = kata.tests[i];
      try {
        // Fresh env per test — no state leaks between tests.
        var compiled = compile(code, kata);
        t.run(compiled.fn, { req: mockReq, res: mockRes, next: mockNext, assert: assert, env: compiled.env });
        results.push({ name: t.name, pass: true });
      } catch (e) {
        allPass = false;
        results.push({ name: t.name, pass: false, detail: friendly(e) });
      }
    }
    return { ok: allPass, results: results };
  }

  function friendly(e) {
    var m = (e && e.message) || String(e);
    if (/Unexpected token|Unexpected end of input/.test(m)) return "Syntax error: " + m;
    return m;
  }

  AV.KataRunner = { mockReq: mockReq, mockRes: mockRes, mockNext: mockNext, run: run };
})();
