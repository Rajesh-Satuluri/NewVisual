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
];
