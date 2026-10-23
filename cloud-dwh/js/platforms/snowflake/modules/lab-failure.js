/* Architecture Failure Simulator */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.CDWH.ScenarioEngine.labView(canvas, {
      area: 'failure', renderer: 'chain',
      eyebrow: '🚨 Troubleshoot', title: 'Architecture Failure Simulator',
      intro: 'Make each layer fail — compute, cloud services, storage, caches — and reason through what actually happens. Tests architecture understanding over memorization.',
    });
  }};
  window.CDWH = window.CDWH || {};
  window.CDWH.Modules = window.CDWH.Modules || {};
  window.CDWH.P.snowflake.Modules.labFailure = M;
})();
