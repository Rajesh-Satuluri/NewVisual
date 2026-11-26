// B8 · Search index — a unified, searchable index over modules, glossary terms,
// config keys, labs, reference pages, and interview surfaces.
// Each entry: { kind, title, sub, hash, text } where `text` is the match haystack.
import { MODULES, EXTRAS } from '../components/nav.js';
import { TERMS } from '../modules/glossary.js';
import { CONFIGS } from '../modules/config-reference.js';

// Per-module keyword hints to make module search richer than just the title.
const MOD_KEYWORDS = {
  m01: 'why structured streaming dstream legacy unbounded declarative',
  m02: 'unbounded table result table incremental view append',
  m03: 'architecture driver executor state store catalyst planner',
  m04: 'sources schema kafka file rate socket offsets startingOffsets replayable',
  m05: 'micro-batch triggers processingTime availableNow once continuous batch planning',
  m06: 'continuous processing low latency at-least-once epoch',
  m07: 'event time processing time out-of-order late clock',
  m08: 'watermark delay lateness eviction monotonic max event time',
  m09: 'windows tumbling sliding session gap assignment',
  m10: 'stateful aggregation state store eviction rocksdb keyed',
  m11: 'arbitrary state mapGroupsWithState flatMapGroupsWithState timeout GroupState',
  m12: 'output modes append update complete emission',
  m13: 'deduplication dropDuplicates dropDuplicatesWithinWatermark',
  m14: 'sinks foreachBatch kafka delta console memory idempotent',
  m15: 'checkpoint offset log commit log WAL recovery',
  m16: 'fault tolerance exactly-once at-least-once replay transactional',
  m17: 'stream static join enrichment dimension lookup',
  m18: 'stream stream join time range watermark outer null buffering',
  m19: 'delta merge upsert cdc medallion small files lakehouse',
  m20: 'performance tuning rocksdb shuffle partitions maxOffsetsPerTrigger backpressure',
  m21: 'monitoring StreamingQueryProgress stateOperators listener metrics lag',
  m22: 'capstone end-to-end pipeline global watermark checkpoint compatibility',
};

function buildIndex() {
  const idx = [];
  // Modules
  MODULES.forEach((m) => idx.push({
    kind: 'Module', title: `${m.num} · ${m.title}`, sub: m.group, hash: m.id,
    text: `${m.id} ${m.title} ${m.group} ${MOD_KEYWORDS[m.id] || ''}`.toLowerCase(),
  }));
  // Glossary terms
  TERMS.forEach((t) => idx.push({
    kind: 'Glossary', title: t[0], sub: 'definition', hash: t[2] || 'glossary',
    text: `${t[0]} ${t[1]}`.toLowerCase(),
  }));
  // Config keys
  CONFIGS.forEach((c) => idx.push({
    kind: 'Config', title: c[1], sub: `${c[0]} · default ${c[2]}`, hash: 'config-reference',
    text: `${c[1]} ${c[0]} ${c[3]}`.toLowerCase(),
  }));
  // Reference / labs / interview surfaces (from nav EXTRAS, minus start pages)
  const EXTRA_KIND = { Reference: 'Reference', Labs: 'Lab', Interview: 'Interview', Review: 'Review', Start: 'Page' };
  EXTRAS.forEach((e) => idx.push({
    kind: EXTRA_KIND[e.group] || 'Page', title: e.title, sub: e.group, hash: e.id,
    text: `${e.id} ${e.title} ${e.group}`.toLowerCase(),
  }));
  return idx;
}

export const SEARCH_INDEX = buildIndex();

// Simple ranked search: substring match, modules/glossary weighted first.
export function searchIndex(query, limit = 40) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  const KIND_RANK = { Module: 0, Glossary: 1, Config: 2, Lab: 3, Reference: 4, Interview: 5, Review: 6, Page: 7 };
  return SEARCH_INDEX
    .map((e) => {
      let score = 0;
      for (const t of terms) {
        if (!e.text.includes(t)) return null;
        if (e.title.toLowerCase().includes(t)) score += 3; else score += 1;
      }
      return { e, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || (KIND_RANK[a.e.kind] - KIND_RANK[b.e.kind]) || a.e.title.localeCompare(b.e.title))
    .slice(0, limit)
    .map((r) => r.e);
}
