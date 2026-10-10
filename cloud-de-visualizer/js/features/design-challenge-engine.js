/* ============================================================
   Cloud DE Visualizer — Design Challenge scoring engine (X3.10).

   Pure, dependency-free. Given a challenge and a map of
   decisionId -> chosen optionId, returns a per-decision verdict
   and an overall score. One option per decision is correct:true.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  function correctOption(decision) {
    return (decision.options || []).find(o => o.correct) || null;
  }

  function score(challenge, answers) {
    answers = answers || {};
    const decisions = (challenge && challenge.decisions) || [];
    const results = decisions.map(d => {
      const chosenId = answers[d.id] || null;
      const chosen = (d.options || []).find(o => o.id === chosenId) || null;
      const best = correctOption(d);
      return {
        decisionId: d.id,
        chosenId,
        chosen,
        best,
        answered: !!chosen,
        correct: !!(chosen && chosen.correct),
      };
    });
    const total = decisions.length;
    const answered = results.filter(r => r.answered).length;
    const correct = results.filter(r => r.correct).length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    return { results, total, answered, correct, pct };
  }

  TV.DesignChallengeEngine = { score, correctOption };
})();
