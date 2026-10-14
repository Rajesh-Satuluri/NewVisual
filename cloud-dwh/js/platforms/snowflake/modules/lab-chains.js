/* Interview Follow-Up Chains — progressive questioning */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.CDWH.ScenarioEngine.labView(canvas, {
      area: 'chains', renderer: 'chain',
      eyebrow: '🎤 Interview', title: 'Interview Follow-Up Chains',
      intro: 'Interviewers rarely stop at one question. Work through progressive follow-ups that get more practical each step — reveal a strong answer, then face the next drill-down.',
    });
  }};
  window.CDWH = window.CDWH || {};
  window.CDWH.Modules = window.CDWH.Modules || {};
  window.CDWH.P.snowflake.Modules.labChains = M;
})();
