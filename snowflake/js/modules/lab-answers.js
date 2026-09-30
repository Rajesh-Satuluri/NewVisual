/* Tiered Answers — bad -> good -> senior and 30/90/180-second */
(function () {
  'use strict';
  const M = { render(canvas) {
    return window.SnowflakeViz.ScenarioEngine.labView(canvas, {
      area: 'answers', renderer: 'tiered',
      eyebrow: '🎤 Interview', title: 'Bad → Good → Senior Answers',
      intro: 'For major interview questions, compare a weak, a good, and a senior-level answer — and rehearse the same topic as a 30-second, 90-second, and 3-minute response.',
    });
  }};
  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.labAnswers = M;
})();
