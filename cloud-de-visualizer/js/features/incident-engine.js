/* ============================================================
   Cloud DE Visualizer — Incident engine (Phase 2 / O2.2)

   PURE logic + scoring for the incident simulator. No DOM. The UI
   (incident-sim.js) drives a session through phases; this module owns
   the investigation bookkeeping and the scored diagnosis.

   Scoring reflects how an engineer is judged in a real incident:
     • diagnostic reasoning — did you inspect the decisive evidence
       (the investigations flagged key:true) before committing?
     • evidence-based root cause — did you pick the correct root cause?
     • correct remediation — did you pick the right fix?
   Over-inspecting (looking at everything) is noted, not rewarded — a
   targeted investigation that hits the key clues scores full marks.

   Overall = 30% key-evidence coverage + 40% root cause + 30% remediation.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  function newSession(incident) {
    return { incident, inspected: [], rootPick: null, remedPick: null, submitted: false };
  }

  function inspect(session, invId) {
    if (session.inspected.indexOf(invId) === -1) session.inspected.push(invId);
    return (session.incident.evidence || {})[invId] || '(no additional detail)';
  }

  function keyInvestigations(incident) {
    return (incident.investigations || []).filter(i => i.key).map(i => i.id);
  }

  function correctIndex(arr) {
    return (arr || []).findIndex(x => x.correct);
  }

  function score(session) {
    const inc = session.incident;
    const keys = keyInvestigations(inc);
    const keyFound = keys.filter(k => session.inspected.indexOf(k) !== -1).length;
    const keyCoverage = keys.length ? keyFound / keys.length : 1;

    const rootIdx = correctIndex(inc.rootCauses);
    const remedIdx = correctIndex(inc.remediations);
    const rootCorrect = session.rootPick != null && session.rootPick === rootIdx;
    const remedCorrect = session.remedPick != null && session.remedPick === remedIdx;

    const overall = Math.round(100 * (0.30 * keyCoverage + 0.40 * (rootCorrect ? 1 : 0) + 0.30 * (remedCorrect ? 1 : 0)));
    const grade = overall >= 85 ? 'Strong diagnosis' : overall >= 60 ? 'On the right track' : 'Needs a more evidence-led approach';

    // efficiency note: inspected count vs how many were needed
    const inspectedCount = session.inspected.length;
    const totalInvestigations = (inc.investigations || []).length;

    return {
      keyFound, keyTotal: keys.length, keyCoverage: Math.round(keyCoverage * 100),
      rootCorrect, remedCorrect,
      correctRootIndex: rootIdx, correctRemedIndex: remedIdx,
      overall, grade,
      inspectedCount, totalInvestigations,
      inspectedAll: inspectedCount >= totalInvestigations && totalInvestigations > 0,
      missedKey: keys.filter(k => session.inspected.indexOf(k) === -1),
    };
  }

  TV.IncidentEngine = { newSession, inspect, keyInvestigations, correctIndex, score };
})();
