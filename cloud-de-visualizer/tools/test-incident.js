#!/usr/bin/env node
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const FILES = [
  'js/data/incidents.js', 'js/data/incidents-databricks.js', 'js/data/incidents-aws.js',
  'js/data/incidents-azure.js', 'js/data/incidents-fabric.js', 'js/features/incident-engine.js',
];
const win = {}; win.window = win;
win.document = { getElementById: () => null, createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }), addEventListener() {}, head: {}, body: {} };
const ctx = vm.createContext(win);
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const TV = win.TableViz, IE = TV.IncidentEngine;
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

console.log('IncidentEngine unit tests\n');
ok(TV.Incidents.count() === 39, 'all 39 incidents registered (got ' + TV.Incidents.count() + ')');
['databricks', 'aws', 'azure', 'fabric'].forEach(c => ok(TV.Incidents.byCloud(c).length > 0, 'cloud ' + c + ' has incidents (' + TV.Incidents.byCloud(c).length + ')'));

const inc = TV.Incidents.byId('inc-dbx-skew');
const s = IE.newSession(inc);
// inspect only the key investigations, pick correct root + remediation
IE.keyInvestigations(inc).forEach(k => IE.inspect(s, k));
s.rootPick = IE.correctIndex(inc.rootCauses);
s.remedPick = IE.correctIndex(inc.remediations);
let r = IE.score(s);
ok(r.keyCoverage === 100, 'full key coverage scores 100');
ok(r.rootCorrect && r.remedCorrect, 'correct root + remediation recognized');
ok(r.overall === 100, 'perfect session scores 100 (got ' + r.overall + ')');

// wrong picks + no investigation
const s2 = IE.newSession(inc);
s2.rootPick = (IE.correctIndex(inc.rootCauses) + 1) % inc.rootCauses.length;
s2.remedPick = (IE.correctIndex(inc.remediations) + 1) % inc.remediations.length;
r = IE.score(s2);
ok(r.overall === 0, 'no investigation + wrong picks scores 0 (got ' + r.overall + ')');
ok(r.missedKey.length === IE.keyInvestigations(inc).length, 'missedKey lists all key investigations when none inspected');

// every incident: exactly one correct root + remediation, ≥1 key investigation
let structOk = true;
TV.Incidents.list().forEach(i => {
  if (i.rootCauses.filter(x => x.correct).length !== 1) structOk = false;
  if (i.remediations.filter(x => x.correct).length !== 1) structOk = false;
  if (!i.investigations.some(x => x.key)) structOk = false;
});
ok(structOk, 'every incident has exactly one correct root/remediation and ≥1 key investigation');

console.log(fails ? `\n✗ ${fails} failed` : '\n✓ all passed');
process.exit(fails ? 1 : 0);
