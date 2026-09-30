/* SQL Interview Scenarios */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.SnowflakeViz.ScenarioEngine.labView(canvas, {
      area: 'sql', renderer: 'sql',
      eyebrow: '🎯 Practice', title: 'SQL Interview Scenarios',
      intro: 'Snowflake-specific SQL reasoning: QUALIFY, MERGE, SCD2, dedup, FLATTEN, Streams, Time Travel, sessionization, and CDC — connected to architecture, not generic SQL drills.',
    });
  }};
  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.labSql = M;
})();
