/* Unit tests for TV.ProjectTracks data integrity.
   Zero-dep: loads the browser IIFE under a window shim via vm. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { window: {}, document: { getElementById: () => null } };
sandbox.window.TableViz = {};
vm.createContext(sandbox);
function load(rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel }); }
load('js/data/project-tracks.js');

const TV = sandbox.window.TableViz;
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error('✗ ' + msg); } }

ok(TV.ProjectTracks, 'ProjectTracks registered');
const all = TV.ProjectTracks.all();
ok(all.length === 5, 'has 5 project tracks (got ' + all.length + ')');

const validClouds = new Set(['aws', 'azure', 'databricks', 'fabric', 'multi-cloud']);
const ids = new Set();
let totalStages = 0;
all.forEach(t => {
  ok(t.id && !ids.has(t.id), 'unique id: ' + t.id); ids.add(t.id);
  ok(validClouds.has(t.cloud), `${t.id}: valid cloud (${t.cloud})`);
  ok(Array.isArray(t.architecture) && t.architecture.length, `${t.id}: has architecture`);
  ok(Array.isArray(t.skills) && t.skills.length, `${t.id}: has skills`);
  ok(Array.isArray(t.stages) && t.stages.length >= 2, `${t.id}: has ≥2 stages`);
  const stIds = new Set();
  t.stages.forEach(s => {
    totalStages++;
    ok(s.id && !stIds.has(s.id), `${t.id}/${s.id}: unique stage id`); stIds.add(s.id);
    ok(!!s.title && !!s.objective && !!s.deliverable, `${t.id}/${s.id}: has title/objective/deliverable`);
    ok(Array.isArray(s.steps) && s.steps.length, `${t.id}/${s.id}: has steps`);
    ok(Array.isArray(s.verify) && s.verify.length, `${t.id}/${s.id}: has verify`);
  });
  (t.refs || []).forEach(r => ok(/^https:\/\//.test(r.url || ''), `${t.id}: ref https (${r.label})`));
});
ok(totalStages >= 20, 'substantial total stages (' + totalStages + ')');

// helpers
ok(TV.ProjectTracks.byId(all[0].id) === all[0], 'byId resolves');
ok(TV.ProjectTracks.byId('nope') === null, 'byId unknown → null');
ok(TV.ProjectTracks.byCloud('aws').length >= 1, 'byCloud filters');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
