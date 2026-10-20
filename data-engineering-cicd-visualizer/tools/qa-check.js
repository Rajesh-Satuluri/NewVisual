#!/usr/bin/env node
/* ============================================================
   tools/qa-check.js — content & route QA harness (pure Node)
   Loads the app's data + route registry in a minimal sandbox (no
   real DOM, no network) and asserts the curriculum is internally
   consistent and internal links resolve. Run:  node tools/qa-check.js
   Exits non-zero on any failure so CI can gate on it.

   What it checks:
     1. Curriculum has a schemaVersion and all 11 levels (0–10).
     2. Every lesson id is a real, ready route.
     3. Every prerequisite id is itself a defined lesson (no dangling).
     4. Every lesson has >=1 objective and >=1 resolvable source.
     5. Every source referenced by a lesson exists with a URL.
     6. Case study: every tier:"fact" claim carries >=1 source id that
        resolves (integrity rule — facts must be cited).
     7. No broken *literal* internal #links in js/modules/*.js.
   ============================================================ */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = path.resolve(__dirname, "..");
var JS = path.join(ROOT, "js");

var pass = 0, fail = 0;
var failures = [];
function ok(msg) { pass++; }
function bad(msg) { fail++; failures.push(msg); }
function check(cond, msg) { cond ? ok(msg) : bad(msg); }

// ── Minimal browser sandbox ─────────────────────────────────
function makeSandbox() {
  var noop = function () {};
  var doc = {
    readyState: "loading",          // keeps app.js from auto-starting
    addEventListener: noop,
    getElementById: function () { return null; },
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
    createElement: function () { return { style: {}, setAttribute: noop, appendChild: noop, classList: { add: noop, remove: noop, toggle: noop } }; },
    documentElement: { setAttribute: noop, getAttribute: function () { return null; } },
    title: ""
  };
  var store = {};
  var localStorage = {
    getItem: function (k) { return k in store ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  var sandbox = {
    console: console,
    setTimeout: function () {}, clearTimeout: function () {},
    document: doc,
    localStorage: localStorage,
    navigator: { userAgent: "node-qa" },
    location: { hash: "", href: "http://localhost/" },
    matchMedia: function () { return { matches: false, addEventListener: noop, addListener: noop }; }
  };
  sandbox.window = sandbox;      // window.X resolves to sandbox.X
  sandbox.self = sandbox;
  return sandbox;
}

function loadInto(sandbox, relPath) {
  var abs = path.join(JS, relPath);
  var code = fs.readFileSync(abs, "utf8");
  try {
    vm.runInNewContext(code, sandbox, { filename: relPath });
  } catch (e) {
    bad("Loading " + relPath + " threw: " + (e && e.message));
  }
}

var sb = makeSandbox();
// Order matters: data + app define routes and curriculum.
["data/retailflow-data.js", "data/curriculum.js", "data/casestudy-airbnb.js", "app.js"]
  .forEach(function (f) { loadInto(sb, f); });

var NS = sb.window.DECICDViz || {};
var routes = NS.routes || {};
var C = NS.Curriculum;

// ── 1. Curriculum basics ────────────────────────────────────
check(!!C, "Curriculum namespace is defined");
if (C) {
  check(typeof C.schemaVersion === "number", "Curriculum has a numeric schemaVersion");
  var levelNums = (C.levels || []).map(function (l) { return l.n; });
  for (var n = 0; n <= 10; n++) {
    check(levelNums.indexOf(n) !== -1, "Curriculum defines level " + n);
  }
}

// ── 2–5. Lessons, prereqs, objectives, sources ──────────────
if (C) {
  var ids = C.lessonIds();
  check(ids.length > 0, "Curriculum defines at least one lesson");
  ids.forEach(function (id) {
    var r = routes[id];
    check(r && r.ready, "Lesson '" + id + "' maps to a ready route");

    var pre = C.prereqs(id);
    pre.forEach(function (pid) {
      check(C.has(pid), "Prereq '" + pid + "' of '" + id + "' is itself a defined lesson");
      check(!!routes[pid], "Prereq '" + pid + "' of '" + id + "' is a real route");
      check(pid !== id, "Lesson '" + id + "' is not its own prerequisite");
    });

    check(C.objectives(id).length >= 1, "Lesson '" + id + "' has >=1 objective");

    var srcs = C.sourcesFor(id);
    check(srcs.length >= 1, "Lesson '" + id + "' has >=1 resolvable source");
    srcs.forEach(function (s) {
      check(!!s.url && /^https?:\/\//.test(s.url), "Source '" + s.id + "' of '" + id + "' has an http(s) URL");
    });
  });

  // No prerequisite cycles (simple DFS).
  var WHITE = 0, GREY = 1, BLACK = 2, color = {};
  var cycle = null;
  function dfs(id, stack) {
    color[id] = GREY;
    var pre = C.has(id) ? C.prereqs(id) : [];
    for (var i = 0; i < pre.length && !cycle; i++) {
      var p = pre[i];
      if (color[p] === GREY) { cycle = stack.concat(p).join(" → "); return; }
      if (color[p] === WHITE || color[p] === undefined) dfs(p, stack.concat(p));
    }
    color[id] = BLACK;
  }
  ids.forEach(function (id) { if (!cycle && color[id] === undefined) dfs(id, [id]); });
  check(!cycle, "Prerequisite graph has no cycles" + (cycle ? " (found: " + cycle + ")" : ""));
}

// ── 6. Case study: facts must be cited ──────────────────────
var CS = NS.CaseStudy;
if (CS && CS.claims) {
  var factCount = 0;
  var resolveSrc = typeof CS.sourceById === "function"
    ? CS.sourceById
    : function (id) { return (CS.sourceById || {})[id] || null; };
  Object.keys(CS.claims).forEach(function (group) {
    (CS.claims[group] || []).forEach(function (claim) {
      if (claim.tier === "fact") {
        factCount++;
        var cites = claim.sources || [];
        check(cites.length >= 1, "Case-study FACT in '" + group + "' carries >=1 source: \"" +
          String(claim.text || "").slice(0, 48) + "…\"");
        cites.forEach(function (c) {
          check(!!resolveSrc(c), "Case-study source id '" + c + "' resolves");
        });
      }
    });
  });
  check(factCount > 0, "Case study contains at least one documented fact");
} else {
  // Non-fatal: case study is optional to this harness.
  ok("Case study not loaded (skipped fact-citation check)");
}

// ── 7. Broken literal internal links in modules ─────────────
var modDir = path.join(JS, "modules");
var linkRe = /href=["']#([a-z0-9][a-z0-9-]*)(?:\/[^"']*)?["']/gi;
var allowed = {}; Object.keys(routes).forEach(function (k) { allowed[k] = true; });
fs.readdirSync(modDir).filter(function (f) { return /\.js$/.test(f); }).forEach(function (f) {
  var txt = fs.readFileSync(path.join(modDir, f), "utf8");
  var m;
  while ((m = linkRe.exec(txt))) {
    var target = m[1];
    check(allowed[target], "Link in modules/" + f + " → #" + target + " resolves to a known route");
  }
});

// ── 8. Every ready route has a module file on disk ──────────
Object.keys(routes).forEach(function (id) {
  if (routes[id] && routes[id].ready) {
    var f = path.join(modDir, id + ".js");
    check(fs.existsSync(f), "Ready route '" + id + "' has js/modules/" + id + ".js");
  }
});

// ── 9. Every lesson is reachable in the guided path (byLevel) ─
if (C) {
  var reachable = {};
  var bl = C.byLevel();
  Object.keys(bl).forEach(function (n) { (bl[n] || []).forEach(function (id) { reachable[id] = true; }); });
  C.lessonIds().forEach(function (id) {
    check(reachable[id], "Lesson '" + id + "' is placed in a curriculum level (reachable in the path)");
  });
}

// ── Report ──────────────────────────────────────────────────
console.log("\nQA checks: " + pass + " passed, " + fail + " failed.");
if (fail) {
  console.log("\nFailures:");
  failures.forEach(function (m) { console.log("  ✗ " + m); });
  process.exit(1);
} else {
  console.log("✓ ALL QA CHECKS PASSED");
}
