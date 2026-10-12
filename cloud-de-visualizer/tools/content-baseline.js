/* ============================================================
   Content-preservation baseline & regression gate (Phase 0).

   Loads every data bank under a minimal TableViz shim, records a
   snapshot of content counts AND the full set of stable content IDs
   (services, interview Q&A, cert questions, incidents, labs, project
   tracks, design challenges, learning paths, certifications), and:

     • with --write : writes tools/content-baseline.json (the snapshot)
     • default      : re-computes the live snapshot and DIFFS it against
                      the committed baseline, FAILING (exit 1) if any
                      existing content ID disappeared or a count dropped.

   This is the guardrail for the redesign: every later iteration runs
   `node tools/content-baseline.js` and must not lose content. Additions
   (new IDs / higher counts) are reported but never fail.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SNAP = path.join(__dirname, 'content-baseline.json');

/* ── Shim: registries the data files expect ── */
const incidentList = [];
const TV = {
  ls: { get: () => null, set: () => {} },
  ServiceDetail: { registerAll() {}, registerHome() {}, navGroupsFor() { return []; } },
  InterviewQA: { register() {}, navGroup() { return null; } },
  Incidents: { register(arr) { (arr || []).forEach(x => incidentList.push(x)); return incidentList.length; }, list() { return incidentList.slice(); } },
  registerFormat() {}, registerModule() {},
};
const sandbox = { window: { TableViz: TV }, document: { getElementById: () => null }, console };
sandbox.window.matchMedia = () => ({ matches: false });
vm.createContext(sandbox);

/* Load order: incidents.js before the per-cloud incident seeds. */
const FILES = [
  'js/data/_meta.js', 'js/data/taxonomy.js',
  'js/data/aws-services.js', 'js/data/azure-services.js', 'js/data/databricks-services.js', 'js/data/fabric-services.js',
  'js/data/aws-interview-qa.js', 'js/data/azure-interview-qa.js', 'js/data/databricks-interview-qa.js', 'js/data/fabric-interview-qa.js',
  'js/data/certifications.js', 'js/data/cert-questions.js', 'js/data/cert-labs.js', 'js/data/cert-compare.js', 'js/data/cert-traps.js',
  'js/data/incidents.js', 'js/data/incidents-aws.js', 'js/data/incidents-azure.js', 'js/data/incidents-databricks.js', 'js/data/incidents-fabric.js',
  'js/data/design-challenges.js', 'js/data/learning-paths.js', 'js/data/project-tracks.js',
  'js/data/quiz-bank.js', 'js/data/intuition.js', 'js/data/equivalences.js',
];
for (const f of FILES) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f }); }
  catch (e) { console.error(`load error ${f}: ${e.message}`); process.exit(2); }
}
const T = sandbox.window.TableViz;

/* ── Helpers to pull ids out of the various shapes ── */
const ids = (arr, key = 'id') => (Array.isArray(arr) ? arr.map(x => x && x[key]).filter(Boolean) : []);
function interviewIds(bank) {
  // Interview QA banks: object of topicId -> { questions:[...] } OR array of topics.
  if (!bank) return [];
  if (Array.isArray(bank)) return ids(bank);
  return Object.keys(bank);
}
function certQuestionIds(bank) {
  // cert-questions.js: object keyed by certId -> [questions] OR flat array.
  if (!bank) return [];
  if (Array.isArray(bank)) return ids(bank, 'id');
  const out = [];
  for (const k of Object.keys(bank)) {
    const v = bank[k];
    if (Array.isArray(v)) v.forEach((q, i) => out.push(`${k}:${q && q.id ? q.id : i}`));
  }
  return out;
}

const snapshot = {
  generated: new Date().toISOString(),
  groups: {
    'services.aws': ids(T.AwsServices),
    'services.azure': ids(T.AzureServices),
    'services.databricks': ids(T.DatabricksServices),
    'services.fabric': ids(T.FabricServices),
    'interview.aws': interviewIds(T.AwsInterviewQA),
    'interview.azure': interviewIds(T.AzureInterviewQA),
    'interview.databricks': interviewIds(T.DatabricksInterviewQA),
    'interview.fabric': interviewIds(T.FabricInterviewQA),
    'certifications': ((T.Certifications && (T.Certifications.tracks || []).concat(T.Certifications.retired || [])) || []).map(c => c.certificationId || c.id).filter(Boolean),
    'certQuestions': ids(T.CertQuestions && T.CertQuestions.all ? T.CertQuestions.all() : T.CertQuestions),
    'certLabs': ids(T.CertLabs && T.CertLabs.list ? T.CertLabs.list : T.CertLabs),
    'designChallenges': (T.DesignChallenges && T.DesignChallenges.ids ? T.DesignChallenges.ids() : ids(T.DesignChallenges)),
    'learningPaths': ids(T.LearningPaths && T.LearningPaths.all ? T.LearningPaths.all() : T.LearningPaths),
    'projectTracks': (T.ProjectTracks && T.ProjectTracks.ids ? T.ProjectTracks.ids() : ids(T.ProjectTracks)),
    'incidents': ids(T.Incidents ? T.Incidents.list() : []),
  },
};

if (process.argv.includes('--write')) {
  fs.writeFileSync(SNAP, JSON.stringify(snapshot, null, 2) + '\n');
  let total = 0;
  for (const [g, arr] of Object.entries(snapshot.groups)) { console.log(`  ${g}: ${arr.length}`); total += arr.length; }
  console.log(`\n[wrote tools/content-baseline.json]  ${total} content IDs across ${Object.keys(snapshot.groups).length} groups`);
  process.exit(0);
}

/* ── Diff mode ── */
if (!fs.existsSync(SNAP)) { console.error('No baseline; run with --write first.'); process.exit(2); }
const base = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
let removed = 0, added = 0;
const report = [];
for (const g of Object.keys(base.groups)) {
  const was = new Set(base.groups[g]);
  const now = new Set(snapshot.groups[g] || []);
  const gone = [...was].filter(x => !now.has(x));
  const neu = [...now].filter(x => !was.has(x));
  if (gone.length) { removed += gone.length; report.push(`  ✗ ${g}: REMOVED ${gone.length} -> ${gone.join(', ')}`); }
  if (neu.length) { added += neu.length; report.push(`  + ${g}: added ${neu.length}`); }
}
// Groups present before but missing entirely now.
for (const g of Object.keys(base.groups)) if (!(g in snapshot.groups)) { removed += base.groups[g].length; report.push(`  ✗ ${g}: GROUP MISSING`); }

console.log('Content-preservation check vs tools/content-baseline.json');
report.forEach(r => console.log(r));
if (!removed) console.log(`\n✓ No content removed. (${added} addition(s).)`);
else console.log(`\n✗ ${removed} content ID(s) removed — investigate before proceeding.`);
process.exit(removed ? 1 : 0);
