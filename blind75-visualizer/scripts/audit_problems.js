#!/usr/bin/env node
/*
 * audit_problems.js — coverage guard for the Python (DSA) practice problems.
 *
 * Every DSA problem must fall cleanly into EVERY lens and filter the tool ships:
 *   • Pattern lens      — category must be one of core.js CATEGORY_ORDER
 *   • Data Structure    — ds_groups.dsBucketOf must place it in a real DS_ORDER
 *                         bucket (never the "Other" safety net)
 *   • Difficulty lens   — difficulty must be exactly Easy / Medium / Hard
 *   • Importance filter — IMPORTANCE tier, if present, must be a known tier
 *                         (absent is allowed: the UI defaults to "common")
 *   • Blind 75 / All    — informational: whether lc is in the Blind 75 set
 *   • Reference links   — informational: whether a default animation link exists
 * Plus structural invariants: unique id, unique lc, and the two lenses must
 * bucket the SAME total count as B.all() (no problem silently dropped).
 *
 * Run it after adding ANY new problem:  node scripts/audit_problems.js
 * Exits 0 when every problem is fully covered, non-zero (and prints the
 * offenders) otherwise — so it also works as a CI / pre-deploy gate.
 */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = path.resolve(__dirname, "..");

// A minimal browser-ish sandbox: the data files are pure IIFEs that only touch
// `window`. One shared context means each file sees the globals the last one set.
var sandbox = { window: {}, console: console };
sandbox.window.window = sandbox.window;
var context = vm.createContext(sandbox);

function load(rel) {
  var file = path.join(ROOT, rel);
  var code = fs.readFileSync(file, "utf8");
  vm.runInContext(code, context, { filename: rel });
}

// Load order mirrors index.html: registry first, then the per-LC side tables,
// then the 18 DSA pattern files, then the lens definitions.
load("js/core.js");
load("data/reflinks.js");
load("data/importance.js");
[
  "arrays_hashing", "two_pointers", "sliding_window", "stack", "binary_search",
  "linked_list", "trees", "tries", "heap", "backtracking", "graphs",
  "advanced_graphs", "dp_1d", "dp_2d", "greedy", "intervals", "math_geometry",
  "bit_manipulation"
].forEach(function (name) { load("data/" + name + ".js"); });
load("data/ds_groups.js");

var B = sandbox.window.BLIND75;
var all = B.all();
var errors = [];
var warnings = [];

var CAT_OK = {};
B.CATEGORY_ORDER.forEach(function (c) { CAT_OK[c] = true; });
var DS_OK = {};
B.DS_ORDER.forEach(function (d) { DS_OK[d] = true; });
var DIFF_OK = { Easy: true, Medium: true, Hard: true };
var IMP_OK = { essential: true, common: true, occasional: true };

var seenId = {}, seenLc = {};

all.forEach(function (p) {
  var who = (p && p.title) || (p && p.id) || "(unknown)";
  var lc = p && p.lc;

  // Pattern lens
  if (!CAT_OK[p.category]) {
    errors.push(who + " [lc " + lc + "]: category \"" + p.category + "\" is not in CATEGORY_ORDER (Pattern lens).");
  }
  // Data Structure lens — must resolve to a real bucket, never "Other".
  var ds = B.dsBucketOf(p);
  if (!DS_OK[ds]) {
    errors.push(who + " [lc " + lc + "]: data-structure bucket \"" + ds + "\" is not a real DS_ORDER bucket (meta.dataStructure = \"" + ((p.meta && p.meta.dataStructure) || "") + "\").");
  }
  // Difficulty lens + difficulty filter
  if (!DIFF_OK[p.difficulty]) {
    errors.push(who + " [lc " + lc + "]: difficulty \"" + p.difficulty + "\" must be exactly Easy / Medium / Hard.");
  }
  // Unique id. Missing id is a real authoring bug.
  if (!p.id) errors.push(who + ": missing id.");
  else if (seenId[p.id]) errors.push("Duplicate id \"" + p.id + "\" (" + who + ").");
  else seenId[p.id] = true;

  // lc: an explicit `null` is an intentional, allowed state (Educative-style
  // named problems with no LeetCode number; the lc-keyed lookups all degrade
  // gracefully). Only a MISSING key (undefined) is an authoring mistake, and
  // uniqueness / per-lc side-table checks apply only to real lc numbers.
  if (!("lc" in p)) {
    errors.push(who + ": the lc field is absent (use `lc: null` for a problem with no LeetCode number).");
  } else if (lc != null) {
    if (seenLc[lc]) errors.push("Duplicate lc " + lc + " (" + who + ").");
    else seenLc[lc] = true;

    // Importance filter — absent defaults to "common" in the UI (allowed), but
    // a present value must be a known tier.
    var imp = B.IMPORTANCE && B.IMPORTANCE[lc];
    if (imp && !IMP_OK[imp]) {
      errors.push(who + " [lc " + lc + "]: importance tier \"" + imp + "\" is unknown.");
    }
    if (!imp) warnings.push(who + " [lc " + lc + "]: no IMPORTANCE tier (UI will default to \"common\").");
    // Reference links — informational only.
    if (!(B.REF_LINKS && B.REF_LINKS[lc])) {
      warnings.push(who + " [lc " + lc + "]: no default REF_LINKS animation link.");
    }
  }
});

// Lens totals must match the flat registry — nothing dropped, nothing doubled.
function lensTotal(groups) {
  return groups.reduce(function (n, g) { return n + g.problems.length; }, 0);
}
var dsGroups = B.byDataStructure();
var diffGroups = B.byDifficulty();
var dsTotal = lensTotal(dsGroups);
var diffTotal = lensTotal(diffGroups);
if (dsTotal !== all.length) errors.push("Data Structure lens buckets " + dsTotal + " problems but registry has " + all.length + ".");
if (diffTotal !== all.length) errors.push("Difficulty lens buckets " + diffTotal + " problems but registry has " + all.length + ".");
var otherBucket = dsGroups.filter(function (g) { return g.category === "Other"; })[0];
if (otherBucket) errors.push("Data Structure lens has a non-empty \"Other\" bucket (" + otherBucket.problems.length + " problems fell through the classifier).");

// ---- Report ----------------------------------------------------------------
console.log("Audited " + all.length + " DSA problems.\n");

console.log("Data Structure lens:");
dsGroups.forEach(function (g) { console.log("  " + pad(g.category, 24) + g.problems.length); });
console.log("\nDifficulty lens:");
diffGroups.forEach(function (g) { console.log("  " + pad(g.category, 24) + g.problems.length); });

function pad(s, n) { while (s.length < n) s += " "; return s; }

if (warnings.length) {
  console.log("\n" + warnings.length + " warning(s) (non-blocking):");
  warnings.forEach(function (w) { console.log("  ! " + w); });
}

if (errors.length) {
  console.log("\nFAIL — " + errors.length + " coverage error(s):");
  errors.forEach(function (e) { console.log("  ✗ " + e); });
  process.exit(1);
}
console.log("\nPASS — every problem falls within every lens and filter.");
