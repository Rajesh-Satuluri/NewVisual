/* Cost Decision Lab — pick the right cost/performance strategy */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.CDWH.ScenarioEngine.labView(canvas, {
      area: 'cost', renderer: 'decision',
      eyebrow: '🔎 Optimize', title: 'Cost Decision Lab',
      intro: 'Not a calculator — a diagnostic. Decide the right cost strategy for each situation, and learn how the correct answer changes with concurrency, workload, and data volume.',
    });
  }};
  window.CDWH = window.CDWH || {};
  window.CDWH.Modules = window.CDWH.Modules || {};
  window.CDWH.P.snowflake.Modules.labCost = M;
})();
