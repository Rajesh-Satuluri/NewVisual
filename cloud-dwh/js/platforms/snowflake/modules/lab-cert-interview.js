/* Certification → Interview conversion */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.CDWH.ScenarioEngine.labView(canvas, {
      area: 'cert-interview', renderer: 'chain',
      eyebrow: '🎯 Practice', title: 'Certification → Interview',
      intro: 'Turn memorized SnowPro facts into applied reasoning. Each item pairs a certification-style question with the same topic reframed the way an interviewer would actually ask it.',
    });
  }};
  window.CDWH = window.CDWH || {};
  window.CDWH.Modules = window.CDWH.Modules || {};
  window.CDWH.P.snowflake.Modules.labCertInterview = M;
})();
