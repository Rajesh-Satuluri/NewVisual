/* Interview Traps */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.SnowflakeViz.ScenarioEngine.labView(canvas, {
      area: 'traps', renderer: 'traps',
      eyebrow: '🎯 Practice', title: 'Interview Traps',
      intro: 'Common Snowflake misconceptions. Decide whether each claim is accurate or a trap, then learn why people get it wrong and the interview-safe wording.',
    });
  }};
  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.labTraps = M;
})();
