/* Cost Decision Lab — pick the right cost/performance strategy */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.SnowflakeViz.ScenarioEngine.labView(canvas, {
      area: 'cost', renderer: 'decision',
      eyebrow: '🔎 Optimize', title: 'Cost Decision Lab',
      intro: 'Not a calculator — a diagnostic. Decide the right cost strategy for each situation, and learn how the correct answer changes with concurrency, workload, and data volume.',
    });
  }};
  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.labCost = M;
})();
