/* Feature Decision Simulator — choose the right Snowflake feature */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.SnowflakeViz.ScenarioEngine.labView(canvas, {
      area: 'decisions', renderer: 'decision',
      eyebrow: '🎯 Practice', title: 'Feature Decision Simulator',
      intro: 'Given a requirement, pick the right feature — then see why it fits, why the alternatives do not, the trade-offs, cost and performance impact, and when the alternative would win.',
    });
  }};
  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.labDecisions = M;
})();
