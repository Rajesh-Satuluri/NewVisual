// Node unit tests for the pure merge core of cloudsync.js.
// Run: node dbt/components/cloudsync.test.mjs
import { isSyncedKey, unionArrays, mergeAll } from './cloudsync.js';

let pass = 0, fail = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function t(name, got, want) {
  if (eq(got, want)) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name, '\n     got ', JSON.stringify(got), '\n     want', JSON.stringify(want)); }
}

// isSyncedKey
t('syncs dbt- keys', isSyncedKey('dbt-done'), true);
t('syncs dbt_ keys', isSyncedKey('dbt_x'), true);
t('skips the sync code', isSyncedKey('dbt:synccode'), false);
t('skips foreign keys', isSyncedKey('kafka-done'), false);

// unionArrays
t('union dedups', unionArrays(['a', 'b'], ['b', 'c']).sort(), ['a', 'b', 'c']);

// dbt-done unions across devices (never un-masters a module)
t('dbt-done unions',
  mergeAll({}, { 'dbt-done': ['m01'] }, { 'dbt-done': ['m02'] })['dbt-done'].sort(),
  ['m01', 'm02']);

// solved-exercise lists union
t('studio-solved unions',
  mergeAll({}, { 'dbt-studio-solved': ['q1'] }, { 'dbt-studio-solved': ['q2'] })['dbt-studio-solved'].sort(),
  ['q1', 'q2']);

// quiz scores take the max
t('quiz score takes max',
  mergeAll({}, { 'dbt-quiz-m10': 2 }, { 'dbt-quiz-m10': 5 })['dbt-quiz-m10'], 5);

// an interview-Q edit: local change over a common ancestor wins
t('iqedit local change wins',
  mergeAll(
    { 'dbt-iqedit-m10-0': { a: 'old' } },
    { 'dbt-iqedit-m10-0': { a: 'mine' } },
    { 'dbt-iqedit-m10-0': { a: 'old' } }
  )['dbt-iqedit-m10-0'],
  { a: 'mine' });

// unchanged locally → take remote edit
t('iqedit remote change applied',
  mergeAll(
    { 'dbt-iqedit-m10-0': { a: 'old' } },
    { 'dbt-iqedit-m10-0': { a: 'old' } },
    { 'dbt-iqedit-m10-0': { a: 'theirs' } }
  )['dbt-iqedit-m10-0'],
  { a: 'theirs' });

// theme is a plain LWW pref
t('theme LWW: local change wins',
  mergeAll({ 'dbt-theme': 'light' }, { 'dbt-theme': 'dark' }, { 'dbt-theme': 'light' })['dbt-theme'],
  'dark');

// foreign keys never leak into the merged bundle
t('foreign key ignored',
  Object.prototype.hasOwnProperty.call(mergeAll({}, { 'kafka-done': ['x'] }, {}), 'kafka-done'),
  false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
