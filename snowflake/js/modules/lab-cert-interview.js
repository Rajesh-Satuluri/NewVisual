/* Certification → Interview conversion */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.SnowflakeViz.ScenarioEngine.labView(canvas, {
      area: 'cert-interview', renderer: 'chain',
      eyebrow: '🎯 Practice', title: 'Certification → Interview',
      intro: 'Turn memorized SnowPro facts into applied reasoning. Each item pairs a certification-style question with the same topic reframed the way an interviewer would actually ask it.',
    });
  }};
  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.labCertInterview = M;
})();
