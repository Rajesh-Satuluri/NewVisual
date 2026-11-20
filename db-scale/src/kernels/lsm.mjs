/* ============================================================
   lsm.mjs — Log-Structured Merge-tree kernel.

   A pure, deterministic LSM store: writes land in a sorted MemTable
   (backed by a WAL for durability), flush to immutable L0 SSTables, and
   leveled compaction merges runs downward. Each SSTable carries a Bloom
   filter so point lookups skip files that can't hold the key. The kernel
   reports read / write / space amplification — the three costs an LSM
   trades against each other.

   SIMPLIFICATIONS (disclosed in the lab):
     • Bloom filters are exact here (no false positives) so the read-path
       skips are clean to watch; real Blooms have a tunable FP rate.
     • AppendEntries-style incremental SSTable reads are modelled as whole
       sorted runs; compaction is deterministic (flush-triggered).
     • Values are integers; "bytes" are entry counts.
   ============================================================ */

import { createKernel } from "./kernel-contract.mjs";

export function lsmSpec(config) {
  const cfg = Object.assign({ memtableLimit: 4, fanout: 4, l0Limit: 4 }, config || {});

  return {
    config: cfg,
    init(c) {
      return {
        memtableLimit: c.memtableLimit, fanout: c.fanout, l0Limit: c.l0Limit,
        mem: {},            // key -> { value, tomb }
        wal: 0,             // logical WAL record count since last flush
        levels: [[]],       // levels[0] = [sstable...] (L0, newest last); levels[n>=1] = [run] | []
        nextSS: 1,
        inserts: 0,         // logical writes (for write-amp denominator)
        bytesWritten: 0,    // entries written by flush + compaction
        flushes: 0, compactions: 0,
        lastGet: null,      // { key, found, value, probed, skipped, where }
        note: "Empty LSM. Put some keys.",
      };
    },
    apply(s, op) { applyOp(s, op); },
    legal(s) { return legalOps(s); },
    invariants(s) { return lsmInvariants(s); },
    metrics(s) { return lsmMetrics(s); },
  };
}
export function createLsm(config) { return createKernel(lsmSpec(config)); }

/* ── ops ────────────────────────────────────────────────────────────────── */
function applyOp(s, op) {
  switch (op.type) {
    case "put":     return opPut(s, op, false);
    case "delete":  return opPut(s, op, true);
    case "get":     return opGet(s, op);
    case "flush":   return doFlush(s);
    case "compact": return fullCompact(s);
    default: throw new Error("lsm: unknown op `" + op.type + "`");
  }
}

function opPut(s, op, tomb) {
  if (typeof op.key !== "number") throw new Error((tomb ? "delete" : "put") + ": key must be a number");
  if (!tomb && op.value === undefined) throw new Error("put: needs a value");
  s.mem[op.key] = { value: tomb ? null : op.value, tomb: tomb };
  s.wal++; s.inserts++;
  s.note = (tomb ? "Deleted " : "Put ") + op.key + (tomb ? "" : "=" + op.value) + " → MemTable (WAL-logged).";
  if (Object.keys(s.mem).length >= s.memtableLimit) doFlush(s);
}

function memEntries(s) {
  return Object.keys(s.mem).map(Number).sort((a, b) => a - b).map((k) => ({ key: k, value: s.mem[k].value, tomb: s.mem[k].tomb }));
}

function doFlush(s) {
  const entries = memEntries(s);
  if (entries.length) {
    const ss = makeSS(s, entries, 0);
    s.levels[0].push(ss);
    s.flushes++; s.bytesWritten += entries.length;
    s.mem = {}; s.wal = 0;
    s.note = "Flushed MemTable → SSTable #" + ss.id + " at L0 (" + entries.length + " entries).";
    runCompaction(s);
  }
}

function makeSS(s, entries, level) {
  const keys = entries.map((e) => e.key);
  return { id: s.nextSS++, level: level, entries: entries, bloom: keys.slice(),
    min: keys[0], max: keys[keys.length - 1] };
}

/* merge sorted runs; `runs` ordered HIGHEST precedence first; dropTomb removes tombstones */
function mergeRuns(runs, dropTomb) {
  const seen = {};
  runs.forEach((run) => run.forEach((e) => { if (!(e.key in seen)) seen[e.key] = e; }));
  let out = Object.keys(seen).map(Number).sort((a, b) => a - b).map((k) => seen[k]);
  if (dropTomb) out = out.filter((e) => !e.tomb);
  return out;
}

function deepestLevel(s) {
  for (let n = s.levels.length - 1; n >= 0; n--) if (s.levels[n] && s.levels[n].length) return n;
  return 0;
}
function levelEntryCount(s, n) {
  return (s.levels[n] || []).reduce((a, ss) => a + ss.entries.length, 0);
}
function capacity(s, n) { return s.memtableLimit * Math.pow(s.fanout, n); }

function runCompaction(s) {
  let guard = 0;
  while (guard++ < 50) {
    // L0 → L1 when too many L0 runs
    if (s.levels[0].length >= s.l0Limit) { compactL0(s); continue; }
    // leveled: a level n≥1 over capacity spills into n+1
    let did = false;
    for (let n = 1; n < s.levels.length; n++) {
      if (levelEntryCount(s, n) > capacity(s, n)) { compactDown(s, n); did = true; break; }
    }
    if (!did) break;
  }
}

function compactL0(s) {
  ensureLevel(s, 1);
  // precedence: newest L0 first ... oldest L0 ... then existing L1
  const runs = s.levels[0].slice().reverse().map((ss) => ss.entries);
  if (s.levels[1][0]) runs.push(s.levels[1][0].entries);
  const dropTomb = deepestLevel(s) <= 1;
  const merged = mergeRuns(runs, dropTomb);
  s.levels[0] = [];
  s.levels[1] = merged.length ? [makeSS(s, merged, 1)] : [];
  s.compactions++; s.bytesWritten += merged.length;
}

function compactDown(s, n) {
  ensureLevel(s, n + 1);
  const runs = [];
  if (s.levels[n][0]) runs.push(s.levels[n][0].entries);
  if (s.levels[n + 1][0]) runs.push(s.levels[n + 1][0].entries);
  const dropTomb = (n + 1) >= deepestLevel(s);
  const merged = mergeRuns(runs, dropTomb);
  s.levels[n] = [];
  s.levels[n + 1] = merged.length ? [makeSS(s, merged, n + 1)] : [];
  s.compactions++; s.bytesWritten += merged.length;
}

function ensureLevel(s, n) { while (s.levels.length <= n) s.levels.push([]); }

function fullCompact(s) {
  // merge everything (and the memtable) into the single deepest run
  const runs = [memEntries(s)];
  s.levels[0].slice().reverse().forEach((ss) => runs.push(ss.entries));
  for (let n = 1; n < s.levels.length; n++) if (s.levels[n][0]) runs.push(s.levels[n][0].entries);
  const merged = mergeRuns(runs, true); // deepest → drop tombstones
  s.mem = {}; s.wal = 0;
  const depth = Math.max(1, s.levels.length - 1);
  s.levels = []; for (let i = 0; i <= depth; i++) s.levels.push([]);
  s.levels[depth] = merged.length ? [makeSS(s, merged, depth)] : [];
  s.compactions++; s.bytesWritten += merged.length;
  s.note = "Full compaction → single run at L" + depth + " (" + merged.length + " live entries).";
}

/* read path: MemTable, then L0 newest→oldest, then L1.. ; Bloom skips misses */
function readPath(s, key) {
  let probed = 0, skipped = 0;
  if (key in s.mem) { const e = s.mem[key]; return { hit: true, tomb: e.tomb, value: e.value, probed: probed, skipped: skipped, where: "MemTable" }; }
  for (let i = s.levels[0].length - 1; i >= 0; i--) {
    const ss = s.levels[0][i];
    if (ss.bloom.indexOf(key) === -1) { skipped++; continue; }
    probed++;
    const e = ss.entries.find((x) => x.key === key);
    if (e) return { hit: true, tomb: e.tomb, value: e.value, probed: probed, skipped: skipped, where: "L0 #" + ss.id };
  }
  for (let n = 1; n < s.levels.length; n++) {
    const ss = s.levels[n][0]; if (!ss) continue;
    if (ss.bloom.indexOf(key) === -1) { skipped++; continue; }
    probed++;
    const e = ss.entries.find((x) => x.key === key);
    if (e) return { hit: true, tomb: e.tomb, value: e.value, probed: probed, skipped: skipped, where: "L" + n + " #" + ss.id };
  }
  return { hit: false, tomb: false, value: undefined, probed: probed, skipped: skipped, where: "not found" };
}

function opGet(s, op) {
  const r = readPath(s, op.key);
  const found = r.hit && !r.tomb;
  s.lastGet = { key: op.key, found: found, value: found ? r.value : null, probed: r.probed, skipped: r.skipped, where: r.where };
  s.note = "Get " + op.key + " → " + (found ? r.value + " (from " + r.where + ")" : "not found") +
    " · probed " + r.probed + " SSTable(s), Bloom skipped " + r.skipped + ".";
}

/** Oracle: the value visible for `key` (undefined if absent/deleted). */
export function getValue(kernelOrState, key) {
  const s = kernelOrState.state || kernelOrState;
  const r = readPath(s, key);
  return r.hit && !r.tomb ? r.value : undefined;
}

/* ── introspection ──────────────────────────────────────────────────────── */
function allSSTables(s) { let out = []; s.levels.forEach((lv) => out = out.concat(lv)); return out; }

function liveKeys(s) {
  const keys = new Set();
  Object.keys(s.mem).forEach((k) => keys.add(Number(k)));
  allSSTables(s).forEach((ss) => ss.entries.forEach((e) => keys.add(e.key)));
  let live = 0;
  keys.forEach((k) => { if (getValue(s, k) !== undefined) live++; });
  return live;
}

function legalOps(s) {
  const n = (s.inserts % 20) + 1;
  return [{ type: "put", key: n, value: n * 10 }, { type: "get", key: n }, { type: "flush" }, { type: "compact" }];
}

function lsmInvariants(s) {
  const checks = [];
  checks.push({ name: "memtable-bounded", ok: Object.keys(s.mem).length < s.memtableLimit || s.inserts === 0,
    detail: Object.keys(s.mem).length + " < " + s.memtableLimit + " (flush on fill)" });
  // each SSTable sorted; L≥1 single run
  let sorted = true, singleRun = true;
  s.levels.forEach((lv, n) => {
    lv.forEach((ss) => { for (let i = 1; i < ss.entries.length; i++) if (ss.entries[i].key <= ss.entries[i - 1].key) sorted = false; });
    if (n >= 1 && lv.length > 1) singleRun = false;
  });
  checks.push({ name: "sstables-sorted", ok: sorted, detail: "every SSTable is key-sorted" });
  checks.push({ name: "leveled-runs", ok: singleRun, detail: "each level ≥ L1 is one non-overlapping run" });
  // Bloom completeness: a filter must list exactly its SSTable's keys (no false negatives)
  let bloomOk = true;
  allSSTables(s).forEach((ss) => {
    if (ss.bloom.length !== ss.entries.length) bloomOk = false;
    ss.entries.forEach((e) => { if (ss.bloom.indexOf(e.key) === -1) bloomOk = false; });
  });
  checks.push({ name: "bloom-complete", ok: bloomOk, detail: "every SSTable key is in its Bloom filter (no false negatives)" });
  return checks;
}

function lsmMetrics(s) {
  const tables = allSSTables(s);
  const totalEntries = tables.reduce((a, ss) => a + ss.entries.length, 0) + Object.keys(s.mem).length;
  const live = liveKeys(s);
  const levelsWithData = s.levels.filter((lv) => lv.length).length;
  return {
    memtable: Object.keys(s.mem).length,
    sstables: tables.length,
    levels: levelsWithData,
    liveKeys: live,
    writeAmp: s.inserts ? s.bytesWritten / s.inserts : 0,
    spaceAmp: live ? totalEntries / live : 0,
    readAmp: s.levels[0].length + Math.max(0, levelsWithData - 1), // worst-case tables probed
    flushes: s.flushes, compactions: s.compactions,
  };
}
