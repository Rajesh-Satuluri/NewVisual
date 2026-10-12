/* Unit tests for the Phase 5 multi-dimensional Progress additions.
   Loads core/progress.js under a window + ls + document shim via vm. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const store = {};
const TVseed = { ls: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = String(v); } } };
const sandbox = {
  window: { TableViz: TVseed },
  document: {
    readyState: 'complete',
    addEventListener() {},
    dispatchEvent() { return true; },
  },
};
sandbox.CustomEvent = function (t, o) { this.type = t; this.detail = o && o.detail; };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/core/progress.js'), 'utf8'), sandbox, { filename: 'progress.js' });

const P = sandbox.window.TableViz.Progress;
let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error('✗ ' + m); } }

P.reset();
ok(P.masteryDimensions, 'masteryDimensions exported');
ok(P.reviewQueue, 'reviewQueue exported');

// empty mastery
let m = P.masteryDimensions();
ok(m.overall === null, 'empty overall is null');
ok(m.dimensions.length === 6, 'six dimensions');

// incident recorder (cloud, service, passBool)
P.recordIncident('aws', 's3', true);
P.recordIncident('aws', 's3', false); // keep best
ok(P.activityInfo('incidents', 'aws/s3').best === 100, 'incident keeps best score');

// design challenge + project
P.recordDesignChallenge('realtime-clickstream', 80);
P.recordProjectStage('aws-batch-lakehouse', 40);

// interview self-rate (format, topicId, qi, rate)
P.recordInterviewSelfRate('aws', 'iq-senior-architecture', 0, 'strong');
P.recordInterviewSelfRate('aws', 'iq-senior-architecture', 1, 'partial');
const ir = P.activityBucket('interviewRates');
ok(Object.keys(ir).length === 2, 'two interview rates recorded');
ok(ir['aws/iq-senior-architecture/0'].score === 100, 'strong → 100');
ok(ir['aws/iq-senior-architecture/1'].score === 55, 'partial → 55');

// mastery now has dimensions with signal
m = P.masteryDimensions({ projectTotal: 5, incidentTotal: 10, challengeTotal: 4 });
ok(m.overall != null, 'overall computed after activity');
const byId = {}; m.dimensions.forEach(d => byId[d.id] = d.value);
ok(byId.troubleshooting != null, 'troubleshooting has value');
ok(byId.design != null, 'design has value');
ok(byId.handsOn != null, 'hands-on has value');
ok(byId.interview != null, 'interview has value');
// coverage-weighted: design 80 over 4 challenges with 1 recorded = 20
ok(byId.design === 20, 'design coverage-weighted (80/4=20), got ' + byId.design);

// quiz + rating feed knowledge/confidence
P.recordQuizAnswer('delta-lake', true); P.recordQuizAnswer('delta-lake', false);
P.setRating('delta-lake', 4);
m = P.masteryDimensions();
const k = m.dimensions.find(d => d.id === 'knowledge').value;
const c = m.dimensions.find(d => d.id === 'confidence').value;
ok(k === 50, 'knowledge = 50% (1/2), got ' + k);
ok(c === 80, 'confidence = 80% (4/5), got ' + c);

// reviewQueue over fake topics
const topics = [{ id: 'delta-lake', navId: 'delta-lake', cloud: 'databricks' }];
// force an old lastStudied by recording a view then rewriting timestamp
P.recordView('databricks', 'delta-lake');
const raw = JSON.parse(store['cde-progress']);
raw.viewed['databricks/delta-lake'].last = Date.now() - 60 * 86400000; // 60d ago
store['cde-progress'] = JSON.stringify(raw);
// bust cache
P.reset(); store['cde-progress'] = JSON.stringify(raw); // reset clears; restore then reload
// reload path: call load via a public method
const q = sandbox.window.TableViz.Progress.reviewQueue(topics);
ok(Array.isArray(q), 'reviewQueue returns array');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
