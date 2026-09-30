/* Query Optimization Lab — reason from a Query Profile */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.SnowflakeViz.ScenarioEngine.labView(canvas, {
      area: 'query-opt', renderer: 'decision',
      eyebrow: '🔎 Optimize', title: 'Query Optimization Lab',
      intro: 'Read a hypothetical Query Profile, decide what to investigate first, and learn why — plus why the alternatives are wrong and what evidence confirms the diagnosis.',
    });
  }};
  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.labQueryOpt = M;
})();
