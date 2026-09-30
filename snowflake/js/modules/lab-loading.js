/* Data Loading Decision Lab */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.SnowflakeViz.ScenarioEngine.labView(canvas, {
      area: 'loading-lab', renderer: 'design',
      eyebrow: '📥 Design', title: 'Data Loading Decision Lab',
      intro: 'Choose the right loading architecture as constraints tighten — late files, duplicates, schema drift, latency — and defend each decision.',
    });
  }};
  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.labLoading = M;
})();
