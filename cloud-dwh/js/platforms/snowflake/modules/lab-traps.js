/* Interview Traps */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.CDWH.ScenarioEngine.labView(canvas, {
      area: 'traps', renderer: 'traps',
      eyebrow: '🎯 Practice', title: 'Interview Traps',
      intro: 'Common Snowflake misconceptions. Decide whether each claim is accurate or a trap, then learn why people get it wrong and the interview-safe wording.',
    });
  }};
  window.CDWH = window.CDWH || {};
  window.CDWH.Modules = window.CDWH.Modules || {};
  window.CDWH.P.snowflake.Modules.labTraps = M;
})();
