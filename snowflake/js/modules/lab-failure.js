/* Architecture Failure Simulator */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.SnowflakeViz.ScenarioEngine.labView(canvas, {
      area: 'failure', renderer: 'chain',
      eyebrow: '🚨 Troubleshoot', title: 'Architecture Failure Simulator',
      intro: 'Make each layer fail — compute, cloud services, storage, caches — and reason through what actually happens. Tests architecture understanding over memorization.',
    });
  }};
  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.labFailure = M;
})();
