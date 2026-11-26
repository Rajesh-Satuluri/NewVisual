/* ============================================================
   Cloud DE Visualizer — Databricks gap-fill regression test.

   Guards the D1–D4 additive Databricks build (CI/CD Asset Bundles,
   Liquid Clustering, System-Tables observability, Lakehouse
   Federation) against accidental removal or shape drift. Pure data
   checks, no DOM — loads the data banks under a minimal window shim.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DATA = path.join(__dirname, '..', 'js', 'data');
const noop = () => {};
const win = {};
win.window = win;
win.TableViz = { registerModule: noop, registerFormat: noop };
const ctx = vm.createContext(win);
for (const f of ['databricks-services.js', 'databricks-study.js', 'databricks-interview-qa.js', 'quiz-bank.js']) {
  vm.runInContext(fs.readFileSync(path.join(DATA, f), 'utf8'), ctx, { filename: f });
}
const TV = win.TableViz;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } }

/* ---- D1: CI/CD service deep dive ---- */
const services = TV.DatabricksServices || [];
const byId = Object.fromEntries(services.map(s => [s.id, s]));
const cicd = byId['databricks-cicd'];
ok(cicd, 'service "databricks-cicd" present');
if (cicd) {
  ok(cicd.category === 'devops', '"databricks-cicd" is in the devops category');
  ['name', 'what', 'why', 'how'].forEach(f => ok(cicd[f], `"databricks-cicd" has required section "${f}"`));
  ['architecture', 'security', 'operations', 'cost', 'walkthrough', 'examples', 'troubleshooting', 'certMapping']
    .forEach(f => ok(cicd[f], `"databricks-cicd" carries the rich section "${f}"`));
  ok(Array.isArray(cicd.interview) && cicd.interview.length >= 5, '"databricks-cicd" has >=5 interview Q&A');
  ok(cicd.interview.every(q => q.q && q.a), '"databricks-cicd" interview items all have q + a');
  const blob = JSON.stringify(cicd);
  ['Asset Bundle', 'databricks.yml', 'service principal', 'run_as'].forEach(kw =>
    ok(blob.includes(kw), `"databricks-cicd" mentions "${kw}"`));
}

/* ---- study enrichment (D1–D4 callouts) ---- */
const enrich = (TV.StudyEnrich && TV.StudyEnrich.databricks) || {};
ok(enrich['databricks-cicd'] && enrich['databricks-cicd'].callouts, 'study enrichment present for "databricks-cicd"');
const dl = enrich['delta-lake'] && enrich['delta-lake'].callouts;
ok(dl && JSON.stringify(dl).includes('Liquid Clustering'), 'delta-lake study callout covers Liquid Clustering (D2)');
const uc = enrich['unity-catalog'] && enrich['unity-catalog'].callouts;
ok(uc && JSON.stringify(uc).includes('system.billing'), 'unity-catalog study callout covers System Tables (D3)');
ok(uc && JSON.stringify(uc).includes('Lakehouse Federation'), 'unity-catalog study callout covers Lakehouse Federation (D4)');
const cl = enrich['clusters'] && enrich['clusters'].callouts;
ok(cl && JSON.stringify(cl).toLowerCase().includes('serverless'), 'clusters study callout covers serverless cost (D3)');

/* ---- interview clusters (D1/D3/D4) ---- */
const topics = TV.DatabricksInterviewQA || [];
const byTopic = Object.fromEntries(topics.map(t => [t.id, t]));
['cicd', 'observability', 'federation'].forEach(id => {
  const t = byTopic[id];
  ok(t, `interview cluster "${id}" present`);
  if (t) {
    ok(Array.isArray(t.questions) && t.questions.length >= 5, `cluster "${id}" has >=5 questions`);
    ok(t.questions.every(q => q.q && q.a), `cluster "${id}" questions all have q + a`);
  }
});
/* D2: Liquid Clustering folded into the partitioning cluster */
const part = byTopic['partitioning'];
ok(part && JSON.stringify(part).includes('Liquid Clustering'), 'partitioning cluster carries Liquid Clustering Q&A (D2)');

/* ---- quiz coverage ---- */
const quiz = (TV.QuizBank && TV.QuizBank.databricks) || [];
ok(quiz.length >= 23, `databricks quiz bank has >=23 questions (got ${quiz.length})`);
const cicdQuiz = quiz.filter(q => q.topic === 'databricks-cicd');
ok(cicdQuiz.length >= 6, `>=6 CI/CD quiz questions linked to databricks-cicd (got ${cicdQuiz.length})`);
/* new questions must break the legacy all-answers-at-index-1 bias */
const newish = quiz.filter(q => q.topic === 'databricks-cicd');
const positions = new Set(newish.map(q => q.answer));
ok(positions.size >= 3, `CI/CD quiz answers spread across >=3 positions (got ${positions.size})`);
const blob = JSON.stringify(quiz);
['Liquid Clustering', 'System Table', 'Lakehouse Federation'].forEach(kw =>
  ok(blob.includes(kw), `quiz bank covers "${kw}"`));

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
