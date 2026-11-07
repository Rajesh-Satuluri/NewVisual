#!/usr/bin/env node
/* test.mjs — run the unit-test suite with node --test.
   Covers the sim engine + data-bank logic (co-located *.test.mjs).
   Dependency-free; mirrors Kafka's `node --test` gate. Also wired into CI.
   Usage: node scripts/test.mjs */
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEST_DIRS = ["sim", "js/data"]; // where *.test.mjs may live
const files = [];

function walk(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".test.mjs")) files.push(p);
  }
}
for (const d of TEST_DIRS) walk(join(root, d));

if (!files.length) {
  console.log("No *.test.mjs found yet — nothing to run.");
  process.exit(0);
}

const res = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exit(res.status === null ? 1 : res.status);
