/* ============================================================
   Deep-dive coverage ledger + honest gap report.

   Loads the four service data banks under a minimal TableViz shim
   (the same technique as test-service-detail.js), inspects every
   service for the presence of each enrichment field, and prints a
   per-cloud ledger plus an overall summary. With --md it writes
   DEEP_DIVE_COVERAGE.md.

   A service is "deep" when it carries ALL core enrichment fields:
     architecture, security, operations, cost,
     walkthrough, examples, troubleshooting, certMapping
   plus the baseline fields it always had (what/why/how/…).

   This is a structural ledger: it reports what EXISTS, never that
   content has been independently verified. Code examples in the
   banks are authored as illustrative, not tested — the report says
   so explicitly.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

/* ── Minimal TableViz shim: capture *Services registrations ── */
const TV = {
  ServiceDetail: { registerAll() {}, registerHome() {}, navGroupsFor() { return []; } },
  InterviewQA: { register() {}, navGroup() { return null; } },
  registerFormat() {},
  registerModule() {},
};
const sandbox = { window: { TableViz: TV }, document: { getElementById: () => null } };
sandbox.window.matchMedia = () => ({ matches: false });
vm.createContext(sandbox);

const BANKS = [
  { cloud: 'AWS',        file: 'js/data/aws-services.js',        global: 'AwsServices' },
  { cloud: 'Azure',      file: 'js/data/azure-services.js',      global: 'AzureServices' },
  { cloud: 'Databricks', file: 'js/data/databricks-services.js', global: 'DatabricksServices' },
  { cloud: 'Fabric',     file: 'js/data/fabric-services.js',     global: 'FabricServices' },
];

/* Core enrichment fields that define a full deep dive. */
const CORE = ['architecture', 'security', 'operations', 'cost',
  'walkthrough', 'examples', 'troubleshooting', 'certMapping'];
/* Baseline fields every service should always have. */
const BASE = ['tagline', 'what', 'why', 'how', 'deUseCase', 'integrations', 'runtime', 'interview'];

function has(svc, f) {
  const v = svc[f];
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return !!v;
}

function loadBank(b) {
  const code = fs.readFileSync(path.join(ROOT, b.file), 'utf8');
  vm.runInContext(code, sandbox, { filename: b.file });
  const arr = TV[b.global] || sandbox.window.TableViz[b.global];
  if (!Array.isArray(arr)) throw new Error(`No TV.${b.global} array from ${b.file}`);
  return arr;
}

const lines = [];
const out = (s = '') => { lines.push(s); console.log(s); };

out('# Deep-Dive Coverage Ledger');
out('');
out(`_Generated ${new Date().toISOString().slice(0, 10)} by tools/coverage-ledger.js — a structural audit of enrichment-field presence. It reports what content EXISTS; it does not claim any content has been independently verified, and all code examples in the banks are authored as illustrative, not tested._`);
out('');

let grandTotal = 0, grandDeep = 0;
const partials = [];

for (const b of BANKS) {
  const svcs = loadBank(b);
  let deep = 0;
  const rows = [];
  for (const s of svcs) {
    const missingCore = CORE.filter(f => !has(s, f));
    const missingBase = BASE.filter(f => !has(s, f));
    const isDeep = missingCore.length === 0 && missingBase.length === 0;
    if (isDeep) deep++;
    else partials.push({ cloud: b.cloud, id: s.id, missing: [...missingBase, ...missingCore] });
    rows.push({ id: s.id, name: s.name, status: isDeep ? 'verified-structure' : 'partial',
      missing: [...missingBase, ...missingCore] });
  }
  grandTotal += svcs.length; grandDeep += deep;
  out(`## ${b.cloud} — ${deep}/${svcs.length} full deep dives`);
  out('');
  out('| Service | Status | Missing fields |');
  out('|---|---|---|');
  for (const r of rows) {
    out(`| ${r.name} (\`${r.id}\`) | ${r.status === 'verified-structure' ? '✅ full' : '🔶 partial'} | ${r.missing.length ? r.missing.join(', ') : '—'} |`);
  }
  out('');
}

out('## Summary');
out('');
out(`- **Full deep dives:** ${grandDeep}/${grandTotal} services (${Math.round(grandDeep / grandTotal * 100)}%).`);
out(`- **Partial:** ${partials.length} services.`);
out('');
out('### Honest gap report');
out('');
if (!partials.length) {
  out('- No structural gaps: every service carries all baseline + core enrichment fields.');
} else {
  for (const p of partials) out(`- **${p.cloud} / ${p.id}** — missing: ${p.missing.join(', ')}`);
}
out('');
out('### Scope & caveats (what "full" does and does not mean)');
out('');
out('- **"Full" = structural completeness only** — the service carries every baseline and core enrichment field. It does NOT mean the prose or code has been independently fact-checked against a live cloud run.');
out('- **Code examples are illustrative** — authored to teach the shape of a solution, not executed against a cloud. The renderer labels them "Illustrative".');
out('- **Cert mappings** reference official exam objectives as understood at authoring time; verify against the current official exam guide before relying on them.');
out('- **No prices are hardcoded** — cost sections describe billing models and direct the reader to the official pricing page.');

if (process.argv.includes('--md')) {
  fs.writeFileSync(path.join(ROOT, 'DEEP_DIVE_COVERAGE.md'), lines.join('\n') + '\n');
  console.log('\n[wrote DEEP_DIVE_COVERAGE.md]');
}

/* Exit non-zero only if a service is missing BASELINE fields (a real
   regression); partial deep fields are reported, not failed. */
const baselineBroken = partials.filter(p => p.missing.some(m => BASE.includes(m)));
process.exit(baselineBroken.length ? 1 : 0);
