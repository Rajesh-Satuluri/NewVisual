// exercise-registry.js — a lightweight catalogue of every exercise id + its
// competency area, so the Home competency panel can show "solved / total"
// without eagerly importing every module. Each iteration appends its ids here;
// the ids MUST match the `id` field on the actual exercise objects.

export const REGISTRY = [
  // ── Iter A · Sandbox demo set ──────────────────────────────────────────────
  { id: 'sbx-predict-version', area: 'ibpl' },
  { id: 'sbx-write-topn',      area: 'ibpl' },
  { id: 'sbx-fix-compare',     area: 'debug' },
  { id: 'sbx-predict-grain',   area: 'model' },
  { id: 'sbx-explain-safediv', area: 'concept' },
  // ── Iter B · Data Model (m02) ──────────────────────────────────────────────
  { id: 'm02-diag-badkey',      area: 'debug' },
  { id: 'm02-diag-version',     area: 'debug' },
  { id: 'm02-diag-grain',       area: 'debug' },
  { id: 'm02-predict-rollup',   area: 'model' },
  { id: 'm02-predict-nullzero', area: 'concept' },
  { id: 'm02-write-grain',      area: 'ibpl' },
  { id: 'm02-model-design',     area: 'model' },
  // ── Iter C · Aggregation & Spreading (m13) ─────────────────────────────────
  { id: 'm13-predict-policy',   area: 'model' },
  { id: 'm13-predict-nullavg',  area: 'concept' },
  { id: 'm13-predict-copysum',  area: 'debug' },
  { id: 'm13-predict-distself', area: 'model' },
  { id: 'm13-diag-nospread',    area: 'debug' },
  { id: 'm13-explain-basis',    area: 'concept' },
  // ── Iter D · IBPL Language (m06 Playground, m07–m09) ───────────────────────
  { id: 'pg-predict-select',    area: 'ibpl' },
  { id: 'pg-fill-version',      area: 'ibpl' },
  { id: 'pg-write-req',         area: 'ibpl' },
  { id: 'pg-fix-eq',            area: 'debug' },
  { id: 'pg-diag-scope',        area: 'ibpl' },
  { id: 'pg-fix-null',          area: 'debug' },
  { id: 'pg-write-leadoffset',  area: 'ibpl' },
  { id: 'pg-opt-scope',         area: 'debug' },
  { id: 'pg-explain-rule',      area: 'ibpl' },
  { id: 'pg-design-calc',       area: 'business' },
  { id: 'm07-predict-cartesian',area: 'ibpl' },
  { id: 'm07-predict-recur',    area: 'ibpl' },
  { id: 'm07-diag-scopepick',   area: 'ibpl' },
  { id: 'm08-write-bias',       area: 'ibpl' },
  { id: 'm08-fix-nullprop',     area: 'debug' },
  { id: 'm09-diag-command',     area: 'ibpl' },
  { id: 'm09-explain-softdel',  area: 'concept' },
  // ── Iter E · Deep Dive (m10 build project, m11/m12/m14) ────────────────────
  { id: 'bp-dims',     area: 'model' },
  { id: 'bp-grain',    area: 'model' },
  { id: 'bp-measures', area: 'model' },
  { id: 'bp-agg',      area: 'model' },
  { id: 'bp-ibpl',     area: 'ibpl' },
  { id: 'bp-validate', area: 'debug' },
  { id: 'bp-version',  area: 'business' },
  { id: 'bp-perf',     area: 'business' },
  { id: 'm11-diag-orphan',    area: 'debug' },
  { id: 'm12-diag-lineage',   area: 'debug' },
  { id: 'm12-predict-change', area: 'model' },
  { id: 'm14-predict-scenario', area: 'business' },
];
