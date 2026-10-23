/* Data Loading Decision Lab */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.CDWH.ScenarioEngine.labView(canvas, {
      area: 'loading-lab', renderer: 'design',
      eyebrow: '📥 Design', title: 'Data Loading Decision Lab',
      intro: 'Choose the right loading architecture as constraints tighten — late files, duplicates, schema drift, latency — and defend each decision.',
    });
  }};
  window.CDWH = window.CDWH || {};
  window.CDWH.Modules = window.CDWH.Modules || {};
  window.CDWH.P.snowflake.Modules.labLoading = M;
})();
