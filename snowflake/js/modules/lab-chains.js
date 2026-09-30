/* Interview Follow-Up Chains — progressive questioning */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.SnowflakeViz.ScenarioEngine.labView(canvas, {
      area: 'chains', renderer: 'chain',
      eyebrow: '🎤 Interview', title: 'Interview Follow-Up Chains',
      intro: 'Interviewers rarely stop at one question. Work through progressive follow-ups that get more practical each step — reveal a strong answer, then face the next drill-down.',
    });
  }};
  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.labChains = M;
})();
