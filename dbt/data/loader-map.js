// ─────────────────────────────────────────────────────────────────────────────
// Loader map — the SINGLE SOURCE OF TRUTH for route id → module file.
//
// Both the router (script.js) and the Build Health harness import this, so a
// route can never exist in one place and be missing in the other. Values are
// paths relative to dbt/modules/. Import-safe in Node (pure data, no DOM, no
// dynamic import at load) so tools/ can read it too.
// ─────────────────────────────────────────────────────────────────────────────

export const MODULE_FILES = {
  home: 'home.js',
  m01: 'm01-data-chaos.js',
  m02: 'm02-revenue-disagreement.js',
  m03: 'm03-duplication-trap.js',
  m04: 'm04-broken-dashboards.js',
  m05: 'm05-onboarding-nightmare.js',
  m06: 'm06-trust-crisis.js',
  m07: 'm07-etl-era.js',
  m08: 'm08-elt-revolution.js',
  m09: 'm09-introducing-dbt.js',
  m10: 'm10-dbt-models.js',
  m11: 'm11-dbt-tests.js',
  m12: 'm12-snapshots.js',
  m13: 'm13-incremental-models.js',
  m14: 'm14-macros.js',
  m15: 'm15-lineage-dag.js',
  m16: 'm16-when-not-to-use.js',
  m17: 'm17-dbt-internals.js',
  m18: 'm18-compile-vs-execute.js',
  m19: 'm19-manifest-explorer.js',
  m20: 'm20-state-selection.js',
  m21: 'm21-incremental-strategies.js',
  m22: 'm22-testing-lab.js',
  m23: 'm23-source-freshness.js',
  m24: 'm24-failure-simulator.js',
  m25: 'm25-debugging-tree.js',
  m26: 'm26-performance-lab.js',
  m27: 'm27-cicd-lab.js',
  m28: 'm28-environments.js',
  m29: 'm29-adapters-warehouses.js',
  m30: 'm30-dbt-airflow.js',
  m31: 'm31-case-studies.js',
  m32: 'm32-command-playground.js',
  m33: 'm33-production-lab.js',
  // Practice
  studio: 'studio.js',
  'config-lab': 'config-lab.js',
  'incident-simulator': 'incident-simulator.js',
  'project-explorer': 'project-explorer.js',
  'spaced-review': 'spaced-review.js',
  // Reference & review
  'build-health': 'build-health.js',
  modes: 'modes.js',
  readiness: 'readiness.js',
  'interview-bank': 'interview-bank.js',
  'interview-sim': 'interview-sim.js',
  'master-map': 'master-map.js',
  comparison: 'comparison.js',
  glossary: 'glossary.js',
  cheatsheet: 'cheatsheet.js',
  study: 'study.js',
};
