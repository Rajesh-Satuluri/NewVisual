/* ============================================================
   Cloud DE Visualizer — Production Incident registry (Phase 2 / O2.1)

   The incident simulator presents a realistic production failure and
   makes the learner INVESTIGATE before the answer is revealed: choose
   what to inspect, read the evidence it returns, commit to a root cause,
   then a remediation — scored on diagnostic reasoning, not a single
   generic click.

   Incident shape:
   {
     id,                      // stable unique id, e.g. 'inc-dbx-skew'
     cloud,                   // 'databricks' | 'aws' | 'azure' | 'fabric'
     title,
     difficulty,             // 1..7 (reuse the question level scale)
     service,                 // taxonomy topic id (for cross-linking), optional
     certIds: [],             // related certifications, optional
     context,                 // business context (1–2 sentences)
     architecture,            // the relevant pipeline/architecture
     expected,                // expected behavior
     symptoms: [ '...' ],     // observed symptoms
     investigations: [        // the choices the learner may inspect
       { id, label,           //   id keys into `evidence`
         key: true|false }    //   key:true = this inspection reveals the decisive clue
     ],
     evidence: {              // id -> what inspecting it reveals
       <investigationId>: 'the log / metric / config the learner sees'
     },
     rootCauses: [            // single-best-answer diagnosis
       { text, correct: true|false } ],
     remediations: [          // single-best-answer fix
       { text, correct: true|false } ],
     validation: [ '...' ],   // how to confirm the fix worked
     prevention: [ '...' ],   // how to stop it recurring
     followUps: [ '...' ],    // interview follow-up questions
     officialRef: { label, url },
     lastReviewed?            // optional per-record override
   }

   Cloud seed files call TV.Incidents.register([...]). No DOM here.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  const LIST = [];
  const CLOUDS = ['databricks', 'aws', 'azure', 'fabric'];

  TV.Incidents = {
    CLOUDS,
    register(arr) { (arr || []).forEach(x => LIST.push(x)); return LIST.length; },
    list() { return LIST.slice(); },
    byId(id) { return LIST.find(x => x.id === id) || null; },
    byCloud(cloud) { return LIST.filter(x => x.cloud === cloud); },
    clouds() { return CLOUDS.filter(c => LIST.some(x => x.cloud === c)); },
    count() { return LIST.length; },
  };
})();
