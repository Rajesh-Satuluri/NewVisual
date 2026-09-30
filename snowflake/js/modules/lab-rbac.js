/* RBAC Design Lab */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.SnowflakeViz.ScenarioEngine.labView(canvas, {
      area: 'rbac-lab', renderer: 'design',
      eyebrow: '🔐 Design', title: 'RBAC Design Lab',
      intro: 'Design role structures step by step: access vs business roles, hierarchy, future grants, ownership, masking and row-access policies, and least-privilege cleanup.',
    });
  }};
  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.labRbac = M;
})();
