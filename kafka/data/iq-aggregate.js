// Aggregates every module's inline interview Q&A into one list, by dynamically
// importing each module and reading its exported `IQ` array. This keeps the
// Study Hub in sync with the modules automatically — no duplicated content.
import { MODULES } from '../components/nav.js';

const LOADERS = {
  m01: () => import('../modules/m01-intro.js'),
  m02: () => import('../modules/m02-messaging.js'),
  m03: () => import('../modules/m03-architecture.js'),
  m04: () => import('../modules/m04-producer.js'),
  m05: () => import('../modules/m05-broker.js'),
  m06: () => import('../modules/m06-partitions.js'),
  m07: () => import('../modules/m07-replication.js'),
  m08: () => import('../modules/m08-consumer-groups.js'),
  m09: () => import('../modules/m09-offsets.js'),
  m10: () => import('../modules/m10-retention.js'),
  m11: () => import('../modules/m11-delivery.js'),
  m12: () => import('../modules/m12-connect.js'),
  m13: () => import('../modules/m13-streams.js'),
  m14: () => import('../modules/m14-schema-registry.js'),
  m15: () => import('../modules/m15-security.js'),
  m16: () => import('../modules/m16-monitoring.js'),
  m17: () => import('../modules/m17-performance.js'),
  m18: () => import('../modules/m18-failure.js'),
  m19: () => import('../modules/m19-amazon-pipeline.js'),
  m20: () => import('../modules/m20-competitors.js'),
  m21: () => import('../modules/m21-mirrormaker.js'),
  m22: () => import('../modules/m22-partition-reassignment.js'),
};

const numOf = id => id.replace(/^m/, '');

let _cache = null;

// Returns a flat array of every interview question across all modules, each
// tagged with its source module. Result is cached after the first load.
export async function loadAllIQ() {
  if (_cache) return _cache;

  const results = await Promise.all(MODULES.map(async m => {
    const loader = LOADERS[m.id];
    if (!loader) return [];
    try {
      const mod = await loader();
      const list = Array.isArray(mod.IQ) ? mod.IQ : [];
      return list.map((qa, i) => ({
        moduleId: m.id, moduleTitle: m.label, moduleNum: numOf(m.id),
        group: m.group, icon: m.icon,
        difficulty: qa.difficulty || 'medium',
        q: qa.q, a: qa.a, tip: qa.tip, idx: i,
      }));
    } catch (e) {
      console.warn('IQ aggregate: failed to load', m.id, e);
      return [];
    }
  }));

  _cache = results.flat();
  return _cache;
}
