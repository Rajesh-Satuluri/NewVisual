// interview-bank.js — the aggregated interview Q&A bank.
//
// SINGLE SOURCE OF TRUTH: every question here is imported LIVE from the concept
// modules' own `IQ` exports. Nothing is retyped or duplicated — editing a
// module's IQ updates this bank automatically. Importing a module only
// evaluates its top-level (the IQ const + function definitions); it does NOT
// run any canvas, so these static imports are cheap and side-effect-free.
//
// Shapes:
//   INTERVIEW      → [{ moduleId, label, group, questions:[{q,a,tip}] }]  (MODULES order, grouped)
//   ALL_QUESTIONS  → [{ id, moduleId, label, group, q, a, tip }]          (flat)
import { MODULES } from '../components/nav.js';

import { IQ as whyPlanning }        from '../modules/why-planning.js';
import { IQ as planningLanguage }   from '../modules/planning-language.js';
import { IQ as scBasics }           from '../modules/sc-basics.js';
import { IQ as whatIsSolver }       from '../modules/what-is-solver.js';
import { IQ as oboHeuristic }       from '../modules/obo-heuristic.js';
import { IQ as demandSorting }      from '../modules/demand-sorting.js';
import { IQ as threePhases }        from '../modules/three-phases.js';
import { IQ as networkTypes }       from '../modules/network-types.js';
import { IQ as nodesGraphs }        from '../modules/nodes-graphs.js';
import { IQ as planningHorizon }    from '../modules/planning-horizon.js';
import { IQ as inventory }          from '../modules/inventory.js';
import { IQ as demandInputs }       from '../modules/demand-inputs.js';
import { IQ as activityParams }     from '../modules/activity-params.js';
import { IQ as capacity }           from '../modules/capacity.js';
import { IQ as safetyStock }        from '../modules/safety-stock.js';
import { IQ as wip }                from '../modules/wip.js';
import { IQ as lotSizing }          from '../modules/lot-sizing.js';
import { IQ as objectiveRankList }  from '../modules/objective-rank-list.js';
import { IQ as sourcingLogic }      from '../modules/sourcing-logic.js';
import { IQ as pegging }            from '../modules/pegging.js';
import { IQ as excessCleanup }      from '../modules/excess-cleanup.js';
import { IQ as solverOutputs }      from '../modules/solver-outputs.js';
import { IQ as rca }                from '../modules/rca.js';
import { IQ as debug }              from '../modules/debug.js';
import { IQ as invocation }         from '../modules/invocation.js';
import { IQ as lotBased }           from '../modules/lot-based.js';
import { IQ as supplyCode }         from '../modules/supply-code.js';
import { IQ as shelfLife }          from '../modules/shelf-life.js';
import { IQ as classBasedPlanning } from '../modules/class-based-planning.js';
import { IQ as noCarry }            from '../modules/no-carry.js';
import { IQ as yieldTimeVarying }   from '../modules/yield-time-varying.js';
import { IQ as coProducts }         from '../modules/co-products.js';
import { IQ as multiStepRouting }   from '../modules/multi-step-routing.js';
import { IQ as specialModels }      from '../modules/special-models.js';
import { IQ as optimization }       from '../modules/optimization.js';
import { IQ as performance }        from '../modules/performance.js';
import { IQ as configUi }           from '../modules/config-ui.js';
import { IQ as deployment }         from '../modules/deployment.js';

// id → its live IQ array.
const IQ_BY_ID = {
  'why-planning': whyPlanning,
  'planning-language': planningLanguage,
  'sc-basics': scBasics,
  'what-is-solver': whatIsSolver,
  'obo-heuristic': oboHeuristic,
  'demand-sorting': demandSorting,
  'three-phases': threePhases,
  'network-types': networkTypes,
  'nodes-graphs': nodesGraphs,
  'planning-horizon': planningHorizon,
  'inventory': inventory,
  'demand-inputs': demandInputs,
  'activity-params': activityParams,
  'capacity': capacity,
  'safety-stock': safetyStock,
  'wip': wip,
  'lot-sizing': lotSizing,
  'objective-rank-list': objectiveRankList,
  'sourcing-logic': sourcingLogic,
  'pegging': pegging,
  'excess-cleanup': excessCleanup,
  'solver-outputs': solverOutputs,
  'rca': rca,
  'debug': debug,
  'invocation': invocation,
  'lot-based': lotBased,
  'supply-code': supplyCode,
  'shelf-life': shelfLife,
  'class-based-planning': classBasedPlanning,
  'no-carry': noCarry,
  'yield-time-varying': yieldTimeVarying,
  'co-products': coProducts,
  'multi-step-routing': multiStepRouting,
  'special-models': specialModels,
  'optimization': optimization,
  'performance': performance,
  'config-ui': configUi,
  'deployment': deployment,
};

// Built in MODULES order; only concept modules that carry an IQ bank appear.
export const INTERVIEW = MODULES
  .filter(m => Array.isArray(IQ_BY_ID[m.id]) && IQ_BY_ID[m.id].length)
  .map(m => ({
    moduleId: m.id,
    label: m.label,
    group: m.group,
    questions: IQ_BY_ID[m.id],
  }));

// Flat list, convenient for search / random draws.
export const ALL_QUESTIONS = INTERVIEW.flatMap(entry =>
  entry.questions.map((qq, i) => ({
    id: `${entry.moduleId}:${i}`,
    moduleId: entry.moduleId,
    label: entry.label,
    group: entry.group,
    q: qq.q,
    a: qq.a,
    tip: qq.tip,
  }))
);

// The 8 curriculum groups in curriculum order (derived from MODULES order).
export const GROUPS = INTERVIEW.reduce((acc, e) => {
  if (!acc.includes(e.group)) acc.push(e.group);
  return acc;
}, []);

export const QUESTION_COUNT = ALL_QUESTIONS.length;
