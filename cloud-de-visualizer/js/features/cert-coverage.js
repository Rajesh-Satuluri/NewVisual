/* ============================================================
   Cloud DE Visualizer — objective coverage engine (Phase 1 / C1.1)

   PURE logic over TV.Certifications (official objective map) and
   TV.CertQuestions (the practice-question banks). Answers one question
   honestly: for each certification, which exam objectives have enough
   practice questions, which are thin, and which have none?

   Attribution — a question counts toward an objective when:
     • question.domainId === the objective's domain, AND
     • question.objId === objective.id            (authoritative), OR
       question.topic is one of objective.topicIds (inferred)
   A question with only a domainId (no objId, no matching topic) counts
   toward the DOMAIN but toward no single objective — surfaced as
   "domain-only" so the gap is visible rather than hidden. A topic that
   matches several objectives in its domain counts toward each (a
   coverage heatmap answers "does this objective have practice?", so
   shared coverage is real) — flagged via `inferred` so authored objId
   tagging can tighten it later.

   No DOM. The Certification Center renders this. No knowledge signals
   here — this is about the QUESTION BANK, not the learner.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  // Coverage-first thresholds (per objective). Tunable in one place.
  const THRESHOLDS = { thinMax: 2, adequateMin: 3 };

  function statusFor(count) {
    if (!count) return 'none';
    if (count <= THRESHOLDS.thinMax) return 'thin';
    return 'adequate';
  }

  function weightNum(w) {
    return (TV.CertEngine && TV.CertEngine.weightNum) ? TV.CertEngine.weightNum(w)
      : (typeof w === 'number' ? w : (parseInt(String(w).match(/\d+/) || [0], 10) || 0));
  }

  /* Build { domainId -> { objId -> Set(topicId) } } once per cert. */
  function objectiveTopicIndex(cert) {
    const idx = {};
    (cert.domains || []).forEach(d => {
      idx[d.id] = {};
      (d.objectives || []).forEach(o => { idx[d.id][o.id] = new Set(o.topicIds || []); });
    });
    return idx;
  }

  function forCert(certId) {
    const cert = TV.Certifications && TV.Certifications.byId(certId);
    if (!cert) return null;
    const questions = (TV.CertQuestions && TV.CertQuestions.byCert(certId)) || [];
    const idx = objectiveTopicIndex(cert);

    // tally[domainId][objId] = count ; domainOnly[domainId] = count
    const tally = {};
    const domainOnly = {};
    (cert.domains || []).forEach(d => { tally[d.id] = {}; domainOnly[d.id] = 0; (d.objectives || []).forEach(o => { tally[d.id][o.id] = { count: 0, inferred: 0, levels: {} }; }); });

    questions.forEach(q => {
      const dm = tally[q.domainId];
      if (!dm) return; // domain unknown — the validator already flags this
      const objMap = idx[q.domainId] || {};
      let matched = [];
      if (q.objId && dm[q.objId]) {
        matched = [{ id: q.objId, inferred: false }];
      } else if (q.topic) {
        matched = Object.keys(objMap).filter(oid => objMap[oid].has(q.topic)).map(oid => ({ id: oid, inferred: true }));
      }
      if (!matched.length) { domainOnly[q.domainId]++; return; }
      matched.forEach(m => {
        const slot = dm[m.id];
        slot.count++;
        if (m.inferred) slot.inferred++;
        if (q.level != null) slot.levels[q.level] = (slot.levels[q.level] || 0) + 1;
      });
    });

    const domains = (cert.domains || []).map(d => {
      const objectives = (d.objectives || []).map(o => {
        const slot = tally[d.id][o.id];
        return {
          id: o.id, statement: o.statement, level: o.level,
          count: slot.count, inferred: slot.inferred, levels: slot.levels,
          status: statusFor(slot.count),
        };
      });
      const domTotal = objectives.reduce((a, o) => a + o.count, 0) + domainOnly[d.id];
      // domain status = worst objective (none dominates thin dominates adequate)
      const hasNone = objectives.some(o => o.status === 'none');
      const hasThin = objectives.some(o => o.status === 'thin');
      return {
        id: d.id, name: d.name, weight: d.weight, weightNum: weightNum(d.weight),
        total: domTotal, domainOnly: domainOnly[d.id],
        objectives: objectives,
        status: hasNone ? 'none' : hasThin ? 'thin' : (objectives.length ? 'adequate' : 'none'),
      };
    });

    // Gap list: objectives ranked by (status severity) then domain weight.
    const sev = { none: 2, thin: 1, adequate: 0 };
    const gaps = [];
    domains.forEach(d => d.objectives.forEach(o => {
      if (o.status !== 'adequate') {
        gaps.push({ domainId: d.id, domain: d.name, domainWeight: d.weight, weightNum: d.weightNum,
          objectiveId: o.id, statement: o.statement, count: o.count, status: o.status,
          priority: sev[o.status] * 1000 + d.weightNum });
      }
    }));
    gaps.sort((a, b) => b.priority - a.priority);

    const flat = domains.reduce((a, d) => a.concat(d.objectives), []);
    const counts = {
      objectivesTotal: flat.length,
      none: flat.filter(o => o.status === 'none').length,
      thin: flat.filter(o => o.status === 'thin').length,
      adequate: flat.filter(o => o.status === 'adequate').length,
      questions: questions.length,
      domainOnly: Object.values(domainOnly).reduce((a, b) => a + b, 0),
    };

    return { certificationId: certId, name: cert.name, total: questions.length, domains, gaps, counts, thresholds: THRESHOLDS };
  }

  function all() {
    return (TV.Certifications ? TV.Certifications.active() : []).map(c => forCert(c.certificationId)).filter(Boolean);
  }

  TV.CertCoverage = { THRESHOLDS, statusFor, forCert, all };
})();
