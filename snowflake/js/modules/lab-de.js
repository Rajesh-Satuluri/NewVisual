/* Snowflake + Data Engineering */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.SnowflakeViz.ScenarioEngine.labView(canvas, {
      area: 'de-scenarios', renderer: 'investigation',
      eyebrow: '🚨 Troubleshoot', title: 'Snowflake + Data Engineering',
      intro: 'Cross-ecosystem incidents (Airflow, Databricks, Kafka, S3, dbt, BI). Diagnose duplicates, late data, partial loads, and idempotency the way a senior data engineer would.',
    });
  }};
  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.labDe = M;
})();
