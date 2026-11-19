#!/usr/bin/env node
/* check-syntax.mjs — run `node --check` on every JS file in the tool.
   Fast, dependency-free gate; also wired into the deploy workflow.
   Usage: node scripts/check-syntax.mjs */
import { readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Flat kafka-style layout (components/, data/, modules/, sim/) + root entry
// scripts. ("js" is the legacy tree; kept here while it is still present.)
const JS_DIRS = ["components", "data", "modules", "sim", "js"];
const ROOT_FILES = ["script.js", "supabase-config.js"];
const files = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (name.endsWith(".js")) files.push(p);
  }
}
for (const d of JS_DIRS) {
  try { walk(join(root, d)); } catch { /* dir may not exist */ }
}
for (const f of ROOT_FILES) {
  try { if (statSync(join(root, f)).isFile()) files.push(join(root, f)); } catch { /* may not exist */ }
}

let failed = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ["--check", f], { stdio: "pipe" });
  } catch (e) {
    failed++;
    console.error("✗ " + f.replace(root + "/", ""));
    console.error(String(e.stderr || e.message).trim().split("\n").slice(0, 3).join("\n"));
  }
}
if (failed) {
  console.error(`\n${failed} file(s) failed syntax check (of ${files.length}).`);
  process.exit(1);
}
console.log(`✓ ${files.length} JS files pass node --check.`);
