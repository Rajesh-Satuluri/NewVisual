// Aggregates every module's inline Interview Q&A into one list, by dynamically
// importing each module and reading its exported `IQ` array. This keeps the
// Study Hub in sync with the modules automatically — no duplicated content, and
// a question only ever lives once (in its module's `IQ`).
//
// Mirrors kafka/data/iq-aggregate.js. Paths come from the loader map (the single
// source of truth for route → file), so this never drifts from the router.
import { MODULES, EXTRAS } from '../components/nav.js';
import { MODULE_FILES } from './loader-map.js';

// The pages whose Interview Q&A we surface in the Study Hub: every numbered
// module, plus the two reference pages that carry real interview Q&A.
const SOURCES = [...MODULES, ...EXTRAS.filter(e => e.id === 'concepts' || e.id === 'comparison')];

let _cache = null;

// Returns a flat array of every interview question across all modules, each
// tagged with its source module. Result is cached after the first load.
export async function loadAllIQ() {
  if (_cache) return _cache;

  const results = await Promise.all(SOURCES.map(async m => {
    const file = MODULE_FILES[m.id];
    if (!file) return [];
    try {
      const mod = await import(`../modules/${file}`);
      const list = Array.isArray(mod.IQ) ? mod.IQ : [];
      return list.map((qa, i) => ({
        moduleId: m.id,
        moduleTitle: m.title,
        moduleNum: m.num || '',
        group: m.group,
        icon: m.icon,
        q: qa.q,
        a: qa.a,
        tip: qa.tip || '',
        idx: i,
      }));
    } catch (e) {
      console.warn('IQ aggregate: failed to load', m.id, e);
      return [];
    }
  }));

  _cache = results.flat();
  return _cache;
}
