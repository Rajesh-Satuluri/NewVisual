/* ============================================================
   Cloud DE Visualizer — scenario-based interview Q&A gate.

   Guards the additive "Scenario"-tagged situational interview
   questions added to the Databricks and Azure interview banks
   (S1-S5) against accidental removal or shape drift. Pure data
   checks, no DOM — loads the banks under a minimal window shim.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DATA = path.join(__dirname, '..', 'js', 'data');
function load(file) {
  const w = {};
  w.window = w;
  w.TableViz = { registerModule() {}, registerFormat() {} };
  const ctx = vm.createContext(w);
  vm.runInContext(fs.readFileSync(path.join(DATA, file), 'utf8'), ctx, { filename: file });
  return w.TableViz;
}

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } }

function scenarioQs(cluster) {
  return (cluster.questions || []).filter(q => (q.tags || []).includes('Scenario'));
}

/* ---- Databricks interview bank ---- */
const dbx = load('databricks-interview-qa.js').DatabricksInterviewQA || [];
const dbxById = Object.fromEntries(dbx.map(t => [t.id, t]));
let dbxScenario = 0;
dbx.forEach(t => { dbxScenario += scenarioQs(t).length; });
ok(dbxScenario >= 28, `Databricks bank carries >=28 Scenario-tagged Q&A (got ${dbxScenario})`);
// Representative clusters that must retain at least one scenario question.
['spark-arch', 'joins', 'partitioning', 'memory-oom', 'delta', 'streaming', 'optimization', 'unity', 'cicd', 'observability', 'federation', 'senior-architecture']
  .forEach(id => {
    const t = dbxById[id];
    ok(t, `Databricks cluster "${id}" present`);
    if (t) ok(scenarioQs(t).length >= 1, `Databricks cluster "${id}" has >=1 Scenario-tagged Q&A`);
  });

/* ---- Azure interview bank ---- */
const az = load('azure-interview-qa.js').AzureInterviewQA || [];
const azById = Object.fromEntries(az.map(t => [t.id, t]));
let azScenario = 0;
az.forEach(t => { azScenario += scenarioQs(t).length; });
ok(azScenario >= 50, `Azure bank carries >=50 Scenario-tagged Q&A (got ${azScenario})`);
// Representative clusters across ADF, ADO and platform.
['adf-fundamentals', 'adf-ir', 'adf-incremental', 'adf-security', 'adf-cicd',
 'ado-fundamentals', 'ado-repos', 'ado-pipelines-yaml', 'ado-service-connections', 'ado-cicd-for-data',
 'storage', 'synapse', 'security', 'monitoring', 'senior-architecture']
  .forEach(id => {
    const t = azById[id];
    ok(t, `Azure cluster "${id}" present`);
    if (t) ok(scenarioQs(t).length >= 1, `Azure cluster "${id}" has >=1 Scenario-tagged Q&A`);
  });

/* ---- shape: every scenario question is well-formed ---- */
[...dbx, ...az].forEach(t => {
  scenarioQs(t).forEach((q, i) => {
    ok(q.q && typeof q.q === 'string', `${t.id} scenario #${i} has a question string`);
    ok(q.a && typeof q.a === 'string' && q.a.length > 80, `${t.id} scenario #${i} has a substantive answer`);
    ok(Array.isArray(q.tags) && q.tags.includes('Scenario'), `${t.id} scenario #${i} carries the Scenario tag`);
  });
});

/* ---- scenario answers read as situational, not definitional ---- */
const allScenario = [...dbx, ...az].flatMap(scenarioQs);
const situational = allScenario.filter(q => /^Scenario:/i.test(q.q));
ok(situational.length >= 75,
  `>=75 scenario questions are phrased as "Scenario: ..." (got ${situational.length}/${allScenario.length})`);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
