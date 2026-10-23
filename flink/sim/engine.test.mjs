// Unit tests for the deterministic Flink sim engine. Run: node sim/engine.test.mjs
import {
  javaStringHashCode, murmurHash, defaultMaxParallelism, keyGroupFor,
  subtaskForKeyGroup, subtaskForKey, assignKeys, rescale, operatorWatermark, skewFactor,
} from './engine.js';

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.log('✗ ' + name); } };
const eq = (name, a, b) => ok(name + ` (got ${a}, want ${b})`, a === b);

// hashing is deterministic
eq('hashCode deterministic', javaStringHashCode('driver-42'), javaStringHashCode('driver-42'));
ok('murmurHash non-negative', murmurHash(javaStringHashCode('x')) >= 0);
ok('murmurHash deterministic', murmurHash(123) === murmurHash(123));

// defaultMaxParallelism: power of two, clamped
eq('defaultMaxP(1) floor 128', defaultMaxParallelism(1), 128);
eq('defaultMaxP(4) floor 128', defaultMaxParallelism(4), 128);
ok('defaultMaxP power of two', (defaultMaxParallelism(200) & (defaultMaxParallelism(200) - 1)) === 0);
ok('defaultMaxP(200) >= 300 rounded up', defaultMaxParallelism(200) >= 300);
ok('defaultMaxP cap 32768', defaultMaxParallelism(100000) === 32768);

// keyGroupFor in range
const maxP = 128;
let inRange = true;
for (let i = 0; i < 500; i++) { const kg = keyGroupFor('k' + i, maxP); if (kg < 0 || kg >= maxP) inRange = false; }
ok('keyGroupFor within [0,maxP)', inRange);

// subtaskForKeyGroup in range
let stRange = true;
for (let kg = 0; kg < maxP; kg++) { const st = subtaskForKeyGroup(kg, 8, maxP); if (st < 0 || st >= 8) stRange = false; }
ok('subtaskForKeyGroup within [0,p)', stRange);

// assignment: every key placed exactly once, all subtasks present
const keys = Array.from({ length: 1000 }, (_, i) => 'driver-' + i);
const a = assignKeys(keys, 8, maxP);
const placed = Object.values(a.bySubtask).reduce((n, arr) => n + arr.length, 0);
eq('assignKeys places every key once', placed, keys.length);
eq('assignKeys creates p subtasks', Object.keys(a.bySubtask).length, 8);
ok('assignKeys subtaskOf consistent', keys.every(k => a.bySubtask[a.subtaskOf[k]].includes(k)));

// determinism: same inputs → same assignment
const a2 = assignKeys(keys, 8, maxP);
ok('assignKeys deterministic', keys.every(k => a.subtaskOf[k] === a2.subtaskOf[k]));

// subtaskForKey matches assignment
ok('subtaskForKey matches assignKeys', keys.slice(0, 50).every(k => subtaskForKey(k, 8, maxP) === a.subtaskOf[k]));

// rescale: key groups are the unit of redistribution → key never changes group
const r = rescale(keys, 8, 16, maxP);
ok('rescale keeps key groups fixed', keys.every(k => r.before.keyGroupOf[k] === r.after.keyGroupOf[k]));
ok('rescale reports some movement when scaling up', r.moved.length > 0);
ok('rescale movedFraction in [0,1]', r.movedFraction >= 0 && r.movedFraction <= 1);
ok('rescale no-op when parallelism unchanged', rescale(keys, 8, 8, maxP).moved.length === 0);

// watermark propagation: min across non-idle
eq('operatorWatermark = min', operatorWatermark([100, 80, 120]), 80);
eq('operatorWatermark skips idle', operatorWatermark([100, 50, 120], new Set([1])), 100);
ok('operatorWatermark null when all idle', operatorWatermark([100, 80], new Set([0, 1])) === null);

// skew factor
ok('skewFactor 1.0 when balanced', Math.abs(skewFactor({ 0: [1, 2], 1: [3, 4] }) - 1) < 1e-9);
ok('skewFactor > 1 when skewed', skewFactor({ 0: [1, 2, 3, 4], 1: [5] }) > 1);

console.log(fail === 0
  ? `\nALL ${pass} ENGINE TESTS PASSED`
  : `\n${fail} FAILED, ${pass} passed`);
process.exit(fail === 0 ? 0 : 1);
