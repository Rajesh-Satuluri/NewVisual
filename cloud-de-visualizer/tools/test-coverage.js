#!/usr/bin/env node
/* Unit test for TV.CertCoverage (C1.1). Loads the data + engine modules
   under a window shim (same approach as validate-content.js), asserts
   invariants, and prints the real coverage snapshot per active cert. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

const FILES = [
  'js/data/_meta.js', 'js/data/taxonomy.js', 'js/data/certifications.js',
  'js/data/cert-questions.js',
  'js/features/cert-engine.js',       // weightNum helper
  'js/features/cert-coverage.js',
];

const win = {}; win.window = win;
win.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }), addEventListener() {}, head: {}, body: {} };
win.addEventListener = () => {};
const ctx = vm.createContext(win);
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });

const TV = win.TableViz;
let fails = 0;
function assert(cond, msg) { if (!cond) { console.log('  ✗ ' + msg); fails++; } else { console.log('  ✓ ' + msg); } }

console.log('CertCoverage unit tests\n');

assert(TV.CertCoverage && typeof TV.CertCoverage.forCert === 'function', 'engine present');

const aws = TV.CertCoverage.forCert('aws-dea-c01');
assert(!!aws, 'forCert(aws-dea-c01) returns a report');
assert(aws.total === (TV.CertQuestions.byCert('aws-dea-c01').length), 'total == bank size');
assert(aws.counts.objectivesTotal === aws.domains.reduce((a, d) => a + d.objectives.length, 0), 'objectivesTotal == sum of domain objectives');
assert(aws.counts.none + aws.counts.thin + aws.counts.adequate === aws.counts.objectivesTotal, 'status buckets partition objectives');
assert(aws.gaps.every((g, i, a) => i === 0 || a[i - 1].priority >= g.priority), 'gaps sorted by priority desc');
assert(aws.gaps.every(g => g.status !== 'adequate'), 'gaps contain only non-adequate objectives');

// statusFor thresholds
assert(TV.CertCoverage.statusFor(0) === 'none', 'statusFor(0)=none');
assert(TV.CertCoverage.statusFor(2) === 'thin', 'statusFor(2)=thin');
assert(TV.CertCoverage.statusFor(3) === 'adequate', 'statusFor(3)=adequate');

// unknown cert -> null
assert(TV.CertCoverage.forCert('nope') === null, 'unknown cert -> null');

// domain-only never negative; per-domain total >= sum objective counts not required (double-count), but domainOnly consistent
assert(aws.domains.every(d => d.domainOnly >= 0), 'domainOnly >= 0');

console.log('\n── Coverage snapshot (active certs) ──');
for (const rep of TV.CertCoverage.all()) {
  console.log(`\n${rep.certificationId}  (${rep.total} questions)`);
  console.log(`  objectives: ${rep.counts.adequate} adequate · ${rep.counts.thin} thin · ${rep.counts.none} none  (of ${rep.counts.objectivesTotal})` + (rep.counts.domainOnly ? ` · ${rep.counts.domainOnly} domain-only Q` : ''));
  rep.domains.forEach(d => {
    const parts = d.objectives.map(o => `${o.id}:${o.count}${o.status === 'none' ? '✗' : o.status === 'thin' ? '~' : '✓'}`).join('  ');
    console.log(`  [${d.weight}] ${d.name} (${d.total}) — ${parts}`);
  });
}

console.log(fails ? `\n✗ ${fails} assertion(s) failed` : '\n✓ all assertions passed');
process.exit(fails ? 1 : 0);
