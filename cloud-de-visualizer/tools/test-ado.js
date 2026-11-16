/* ============================================================
   Cloud DE Visualizer — Azure DevOps content regression test.

   Guards the JD-aligned Azure DevOps build (service deep dives,
   interview Q&A clusters, study enrichment and quiz questions)
   against accidental removal or shape drift. Pure data checks,
   no DOM — loads the data banks under a minimal window shim.
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
for (const f of ['azure-services.js', 'azure-study.js', 'azure-interview-qa.js', 'quiz-bank.js']) {
  vm.runInContext(fs.readFileSync(path.join(DATA, f), 'utf8'), ctx, { filename: f });
}
const TV = win.TableViz;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } }

/* ---- service deep dives ---- */
const services = TV.AzureServices || [];
const byId = Object.fromEntries(services.map(s => [s.id, s]));
const DEVOPS = ['azure-pipelines', 'azure-devops', 'azure-repos', 'azure-artifacts', 'azure-boards-test', 'github-actions'];
const OTHER = { 'azure-service-bus': 'messaging', 'azure-containers': 'containers' };

DEVOPS.forEach(id => {
  const s = byId[id];
  ok(s, `service "${id}" present`);
  if (!s) return;
  ok(s.category === 'devops', `"${id}" is in the devops category`);
  ['name', 'what', 'why', 'how'].forEach(f => ok(s[f], `"${id}" has required section "${f}"`));
  ['architecture', 'security', 'operations', 'cost', 'walkthrough', 'examples', 'troubleshooting', 'certMapping'].forEach(f =>
    ok(s[f], `"${id}" carries the rich section "${f}"`));
  ok(Array.isArray(s.interview) && s.interview.length >= 5, `"${id}" has >=5 interview Q&A`);
  ok(s.interview.every(q => q.q && q.a), `"${id}" interview items all have q + a`);
});

Object.entries(OTHER).forEach(([id, cat]) => {
  const s = byId[id];
  ok(s, `service "${id}" present`);
  if (!s) return;
  ok(s.category === cat, `"${id}" is in the ${cat} category`);
  ['what', 'why', 'how'].forEach(f => ok(s[f], `"${id}" has required section "${f}"`));
  ok(Array.isArray(s.interview) && s.interview.length >= 5, `"${id}" has >=5 interview Q&A`);
});

/* ---- study enrichment ---- */
const enrich = (TV.StudyEnrich && TV.StudyEnrich.azure) || {};
DEVOPS.concat(Object.keys(OTHER)).forEach(id =>
  ok(enrich[id] && enrich[id].callouts, `study enrichment present for "${id}"`));

/* ---- interview Q&A clusters ---- */
const topics = TV.AzureInterviewQA || [];
const ado = topics.filter(t => t.id && t.id.startsWith('ado-'));
ok(ado.length >= 12, `>=12 ado-* interview topic clusters (got ${ado.length})`);
const adoQ = ado.reduce((n, t) => n + (t.questions ? t.questions.length : 0), 0);
ok(adoQ >= 100, `>=100 Azure DevOps interview Q&A (got ${adoQ})`);
ok(ado.every(t => Array.isArray(t.questions) && t.questions.every(q => q.q && q.a)), 'all ado-* questions have q + a');
['ado-fundamentals', 'ado-repos', 'ado-pipelines-yaml', 'ado-pipelines-advanced',
 'ado-service-connections', 'ado-environments', 'ado-artifacts', 'ado-github-cicd',
 'ado-cicd-for-data', 'ado-service-bus', 'ado-containers', 'ado-scenarios'].forEach(id =>
  ok(ado.some(t => t.id === id), `interview cluster "${id}" present`));

/* ---- quiz coverage ---- */
const quiz = (TV.QuizBank && TV.QuizBank.azure) || [];
ok(quiz.length >= 20, `azure quiz bank has >=20 questions (got ${quiz.length})`);
const cicd = quiz.filter(q => q.topic === 'iq-cicd');
ok(cicd.length >= 6, `>=6 CI/CD quiz questions linked to iq-cicd (got ${cicd.length})`);
const positions = new Set(quiz.map(q => q.answer));
ok(positions.size >= 3, `quiz answers are spread across >=3 positions (got ${positions.size})`);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
