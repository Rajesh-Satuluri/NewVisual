// Preservation regression suite (I27).
// Proves every educational source file from kafka/ and flink/ is present in the
// ported streaming/kafka and streaming/flink trees with a BYTE-IDENTICAL sha256,
// reconciled against docs/content-preservation-manifest.json.
//
// Run:  node streaming/scripts/verify-preservation.mjs   (from repo root)
// Exit: 0 = all preserved; 1 = any missing / mismatched.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');            // .../NewVisual
const streamingRoot = resolve(here, '..');             // .../NewVisual/streaming
const manifestPath = join(streamingRoot, 'docs', 'content-preservation-manifest.json');

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

let checked = 0, ok = 0;
const failures = [];

function checkApp(appKey, portedSubdir) {
  const app = manifest[appKey];
  const groups = ['entry', 'modules', 'data', 'sim', 'components'];
  for (const g of groups) {
    const files = app[g];
    if (!Array.isArray(files)) continue;
    for (const f of files) {
      // f.path is relative to the source app root, e.g. "modules/m01-intro.js"
      // (entry paths are prefixed with the app name, e.g. "kafka/index.html").
      const relInApp = f.path.startsWith(appKey + '/') ? f.path.slice(appKey.length + 1) : f.path;
      const ported = join(streamingRoot, portedSubdir, relInApp);
      const original = join(repoRoot, appKey, relInApp);
      checked++;
      let portedHash, originalHash;
      try { portedHash = sha(ported); }
      catch (e) { failures.push(`MISSING in port: ${portedSubdir}/${relInApp}`); continue; }
      try { originalHash = sha(original); }
      catch (e) { originalHash = f.sha256; } // fall back to manifest if source moved
      const expected = f.sha256 || originalHash;
      if (portedHash !== expected) {
        failures.push(`MISMATCH: ${portedSubdir}/${relInApp}\n    expected ${expected}\n    got      ${portedHash}`);
      } else {
        ok++;
      }
    }
  }
}

checkApp('kafka', 'kafka');
checkApp('flink', 'flink');

console.log(`Preservation check: ${ok}/${checked} files byte-identical.`);
if (failures.length) {
  console.error(`\n${failures.length} FAILURE(S):`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('ALL PRESERVED ✅  — every manifest file is present and byte-identical in the port.');
