/* End-to-End Interview Case Study */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.SnowflakeViz.ScenarioEngine.labView(canvas, {
      area: 'case-study', renderer: 'chain',
      eyebrow: '🎤 Interview', title: 'End-to-End Case Study',
      intro: 'One architecture, interrogated end to end — ingestion, duplicates, late data, schema, optimization, cost, isolation, RBAC, recovery, and failure — the way a senior interview case actually unfolds.',
    });
  }};
  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.labCase = M;
})();
