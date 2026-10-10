/* Unit tests for TV.DesignChallengeEngine + data integrity.
   Zero-dep: loads the browser IIFEs under a window shim via vm. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { window: {}, document: { getElementById: () => null } };
sandbox.window.TableViz = {};
vm.createContext(sandbox);

function load(rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}
load('js/data/design-challenges.js');
load('js/features/design-challenge-engine.js');

const TV = sandbox.window.TableViz;
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error('✗ ' + msg); } }

// data present
ok(TV.DesignChallenges, 'DesignChallenges registered');
ok(TV.DesignChallengeEngine, 'DesignChallengeEngine registered');
const all = TV.DesignChallenges.all();
ok(all.length >= 4, 'has ≥4 challenges (got ' + all.length + ')');

// every decision has exactly one correct option
let decTotal = 0;
all.forEach(c => c.decisions.forEach(d => {
  decTotal++;
  const correct = d.options.filter(o => o.correct).length;
  ok(correct === 1, `${c.id}/${d.id} has exactly one correct option`);
  d.options.forEach(o => ok(!!o.rationale, `${c.id}/${d.id}/${o.id} has rationale`));
}));
ok(decTotal >= 10, 'has a substantial number of decision points (' + decTotal + ')');

// scoring: all-correct => 100%
const ch = all[0];
const allCorrect = {};
ch.decisions.forEach(d => { allCorrect[d.id] = d.options.find(o => o.correct).id; });
let r = TV.DesignChallengeEngine.score(ch, allCorrect);
ok(r.pct === 100, 'all-correct scores 100% (got ' + r.pct + ')');
ok(r.correct === ch.decisions.length, 'all-correct counts every decision');

// scoring: all-wrong => 0%
const allWrong = {};
ch.decisions.forEach(d => { allWrong[d.id] = d.options.find(o => !o.correct).id; });
r = TV.DesignChallengeEngine.score(ch, allWrong);
ok(r.pct === 0, 'all-wrong scores 0% (got ' + r.pct + ')');

// scoring: partial + unanswered handled
const partial = {};
ch.decisions.forEach((d, i) => { if (i === 0) partial[d.id] = d.options.find(o => o.correct).id; });
r = TV.DesignChallengeEngine.score(ch, partial);
ok(r.answered === 1, 'tracks answered count');
ok(r.correct === 1, 'partial: one correct');
ok(r.pct === Math.round(100 / ch.decisions.length), 'partial pct computed over total');

// byId
ok(TV.DesignChallenges.byId(ch.id) === ch, 'byId resolves');
ok(TV.DesignChallenges.byId('nope') === null, 'byId unknown → null');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
