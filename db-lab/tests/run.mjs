#!/usr/bin/env node
/* ============================================================
   run.mjs — Node test runner for db-lab kernels.

   Usage:   node tests/run.mjs
   Add a new *.test.mjs file to the `FILES` list below and it runs.
   Exits non-zero on any failure (CI-friendly). Zero dependencies.
   ============================================================ */

import { run, reset } from "./harness.mjs";

const FILES = [
  "./kernels.test.mjs",
  "./wal.test.mjs",
  "./buffer-pool.test.mjs",
  "./bplustree.test.mjs",
  "./mvcc.test.mjs",
  "./optimizer.test.mjs",
  // Flagship kernels register their tests here as they land:
  // "./lsm.test.mjs", "./replication.test.mjs", ...
];

reset();
for (const f of FILES) {
  await import(f); // importing registers the file's suites
}

const r = run();

const GREEN = "\x1b[32m", RED = "\x1b[31m", DIM = "\x1b[2m", RESET = "\x1b[0m";
for (const s of r.suites) {
  console.log(DIM + "• " + s.name + RESET);
}
if (r.failures.length) {
  console.log("");
  for (const f of r.failures) {
    console.log(RED + "✗ " + f.suite + " › " + f.test + RESET);
    console.log("  " + f.error.replace(/\n/g, "\n  "));
  }
}
console.log("");
const tag = r.failed ? RED + "FAIL" + RESET : GREEN + "PASS" + RESET;
console.log(tag + "  " + r.passed + "/" + r.total + " tests passed");

process.exitCode = r.failed ? 1 : 0;
