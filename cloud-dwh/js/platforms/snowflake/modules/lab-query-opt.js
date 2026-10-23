/* Query Optimization Lab — reason from a Query Profile */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.CDWH.ScenarioEngine.labView(canvas, {
      area: 'query-opt', renderer: 'decision',
      eyebrow: '🔎 Optimize', title: 'Query Optimization Lab',
      intro: 'Read a hypothetical Query Profile, decide what to investigate first, and learn why — plus why the alternatives are wrong and what evidence confirms the diagnosis.',
    });
  }};
  window.CDWH = window.CDWH || {};
  window.CDWH.Modules = window.CDWH.Modules || {};
  window.CDWH.P.snowflake.Modules.labQueryOpt = M;
})();
