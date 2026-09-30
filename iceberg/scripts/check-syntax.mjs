/* ============================================================
   check-syntax.mjs — syntax-check every JS file in the project.
   A single broken file can silently kill a whole module
   (unregistered) with no visible error, so we gate on `node --check`
   for every .js under this project directory.
   Usage: node scripts/check-syntax.mjs
   ============================================================ */
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.git', '.verify-artifacts']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith('.js') || name.endsWith('.mjs')) out.push(full);
  }
  return out;
}

const files = walk(ROOT);
let failed = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (err) {
    failed++;
    console.error(`✗ SYNTAX ERROR  ${relative(ROOT, f)}`);
    console.error(String(err.stderr || err.message).trim());
  }
}

if (failed) {
  console.error(`\n${failed} file(s) failed syntax check.`);
  process.exit(1);
}
console.log(`✓ ${files.length} JS files passed syntax check.`);
