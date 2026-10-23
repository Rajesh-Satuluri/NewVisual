/* ============================================================
   optimizer.mjs — cost-based query optimizer kernel (TEACHING MODEL).

   Enumerates access paths for a filtered table and join algorithms for a
   two-table foreign-key join, costs each in abstract page-I/O units, and
   picks the cheapest. The cost formulas are a SIMPLIFIED teaching model —
   they capture the SHAPE of real optimiser decisions (seq vs index
   crossover; nested-loop vs hash vs merge) but are NOT any engine's real
   numbers. Clearly labelled as such in the lab.

   Query shape:
     SELECT ... FROM outer JOIN inner ON outer.fk = inner.id
     WHERE inner.pred           -- selectivity `sel` on the inner table
   inner.id is a unique key, so each outer row joins ≤ 1 inner row and the
   estimated result size is outerRows * sel.
   ============================================================ */

import { createKernel } from "./kernel-contract.mjs";

const FANOUT = 100;         // index fan-out (keys per node) for height
const DEFAULTS = {
  outerRows: 100000,
  innerRows: 10000,
  selectivity: 0.01,        // fraction of inner rows passing the predicate
  rowsPerPage: 100,
  memoryPages: 200,         // working memory for hash build / sort
  hasIndexInner: true,      // PK/secondary index on the inner join/filter key
};
const PARAM_BOUNDS = {
  outerRows: [1, 100000000],
  innerRows: [1, 100000000],
  selectivity: [0, 1],
  rowsPerPage: [1, 10000],
  memoryPages: [1, 10000000],
};

export function optimizerSpec(config) {
  const cfg = Object.assign({}, DEFAULTS, config || {});
  return {
    config: cfg,
    init(c) {
      const s = { params: Object.assign({}, c), plan: null, note: "Adjust the knobs to see the plan change." };
      recompute(s);
      return s;
    },
    apply(s, op) {
      if (op.type !== "set") throw new Error("optimizer: unknown op `" + op.type + "`");
      if (!(op.key in s.params)) throw new Error("set: unknown param " + op.key);
      if (op.key === "hasIndexInner") { s.params.hasIndexInner = !!op.value; }
      else {
        const b = PARAM_BOUNDS[op.key];
        const v = Number(op.value);
        if (!Number.isFinite(v) || v < b[0] || v > b[1]) throw new Error("set: " + op.key + " out of range [" + b[0] + "," + b[1] + "]");
        s.params[op.key] = v;
      }
      recompute(s);
    },
    legal() { return [{ type: "set", key: "selectivity", value: 0.1 }]; },
    invariants(s) { return optInvariants(s); },
    metrics(s) { return optMetrics(s); },
  };
}

export function createOptimizer(config) { return createKernel(optimizerSpec(config)); }

/* ── cost model ─────────────────────────────────────────────────────────── */
const pages = (rows, rpp) => Math.max(1, Math.ceil(rows / rpp));
const indexHeight = (rows) => Math.max(1, Math.ceil(Math.log(Math.max(2, rows)) / Math.log(FANOUT)));
const sortCost = (pg) => pg * Math.max(1, Math.ceil(Math.log2(Math.max(2, pg)))); // external-sort teaching cost

function recompute(s) {
  const p = s.params;
  const Opg = pages(p.outerRows, p.rowsPerPage);
  const Ipg = pages(p.innerRows, p.rowsPerPage);
  const matched = Math.ceil(p.selectivity * p.innerRows);

  /* access paths for the filtered INNER table */
  const access = [];
  access.push({ name: "Seq Scan", cost: Ipg, note: "read all " + Ipg + " pages of inner" });
  if (p.hasIndexInner) {
    access.push({
      name: "Index Scan",
      cost: indexHeight(p.innerRows) + matched,
      note: indexHeight(p.innerRows) + " index + " + matched + " matched row fetches",
    });
  }
  access.sort((a, b) => a.cost - b.cost);
  const chosenAccess = access[0];

  /* join algorithms for outer ⋈ inner */
  const fits = Math.min(Opg, Ipg) <= p.memoryPages;
  const join = [];
  join.push({
    name: "Nested Loop",
    cost: Opg + p.outerRows * Ipg,
    note: "scan outer, full inner scan per outer row",
    applicable: true,
  });
  if (p.hasIndexInner) {
    join.push({
      name: "Index Nested Loop",
      cost: Opg + p.outerRows * indexHeight(p.innerRows),
      note: "probe inner's index once per outer row",
      applicable: true,
    });
  }
  join.push({
    name: "Hash Join",
    cost: fits ? Opg + Ipg : 2 * (Opg + Ipg),
    note: fits ? "build hash on inner, probe (fits in memory)" : "spills to disk (×2) — inner doesn't fit memory",
    applicable: true,
  });
  join.push({
    name: "Merge Join",
    cost: Opg + Ipg + sortCost(Opg) + (p.hasIndexInner ? 0 : sortCost(Ipg)),
    note: p.hasIndexInner ? "sort outer; inner already ordered by its index" : "sort both inputs, then merge",
    applicable: true,
  });
  join.sort((a, b) => a.cost - b.cost);
  const chosenJoin = join[0];
  const worstJoin = join[join.length - 1];

  s.plan = {
    access: access, chosenAccess: chosenAccess,
    join: join, chosenJoin: chosenJoin, worstJoin: worstJoin,
    estRows: Math.ceil(p.selectivity * p.outerRows),
    Opg: Opg, Ipg: Ipg, matched: matched, fits: fits,
  };
  s.note = "Chosen: " + chosenJoin.name + " (" + chosenJoin.cost.toLocaleString() + " I/O) with " + chosenAccess.name + " on inner.";
}

/* ── introspection ──────────────────────────────────────────────────────── */
function optInvariants(s) {
  const pl = s.plan;
  const accessMin = pl.access.every((a) => a.cost >= pl.chosenAccess.cost);
  const joinMin = pl.join.every((j) => j.cost >= pl.chosenJoin.cost);
  const nonNeg = pl.join.every((j) => j.cost >= 0) && pl.access.every((a) => a.cost >= 0);
  const card = pl.estRows >= 0 && pl.estRows <= s.params.outerRows;
  return [
    { name: "access-is-min", ok: accessMin, detail: "chosen access path is the cheapest" },
    { name: "join-is-min", ok: joinMin, detail: "chosen join is the cheapest enumerated plan" },
    { name: "costs-nonneg", ok: nonNeg, detail: "all plan costs ≥ 0" },
    { name: "cardinality-bounded", ok: card, detail: "0 ≤ est rows ≤ outer rows (FK join)" },
  ];
}

function optMetrics(s) {
  const pl = s.plan;
  return {
    estRows: pl.estRows,
    chosenJoinCost: pl.chosenJoin.cost,
    worstJoinCost: pl.worstJoin.cost,
    speedup: pl.chosenJoin.cost ? pl.worstJoin.cost / pl.chosenJoin.cost : 1,
    accessCost: pl.chosenAccess.cost,
  };
}
