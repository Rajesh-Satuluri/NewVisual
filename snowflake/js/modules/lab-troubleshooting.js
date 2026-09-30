/* Production Troubleshooting Lab — stepwise incident diagnosis */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.SnowflakeViz.ScenarioEngine.labView(canvas, {
      area: 'troubleshooting', renderer: 'investigation',
      eyebrow: '🚨 Troubleshoot', title: 'Production Troubleshooting Lab',
      intro: 'Real production symptoms. Investigate step by step — check the evidence, avoid the wrong assumption, and reach the root cause, resolution, prevention, and an interview-quality answer.',
    });
  }};
  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.labTroubleshooting = M;
})();
