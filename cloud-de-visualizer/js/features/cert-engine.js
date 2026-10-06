/* ============================================================
   Cloud DE Visualizer — Certification engine (Phase 2 / C2).

   PURE logic over TV.Certifications (the official overlay),
   TV.Taxonomy / TV.Recommend (topic knowledge scores) and
   TV.Progress (quiz, ratings, cert practice-exam, lab completion).
   Produces per-objective / per-domain / per-cert readiness, honest
   gap analysis, shared-topic overlap and a next-cert recommendation.

   Readiness blends the signals the spec asks for:
     theory       — knowledge over the objective's mapped topics
     practiceExam — cert practice-exam accuracy (when taken)
     handsOn      — lab playbooks completed (when labs exist)
   Overall = weighted (theory .5 / exam .3 / handsOn .2), renormalized
   over whichever signals are present. Domain contributions use the
   OFFICIAL weightings from the exam guide.

   No DOM. The Certification Center / dashboard render this.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  const DONE_SCORE = 80;    // topic counts as "completed" for a cert at/above this
  function _round(n) { return Math.round(n); }
  function _clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /* Parse a weight that may be a number (34) or a range string ("30–35"). */
  function weightNum(w) {
    if (typeof w === 'number') return w;
    const m = String(w).match(/(\d+)\D+(\d+)/);
    if (m) return (parseInt(m[1], 10) + parseInt(m[2], 10)) / 2;
    const s = String(w).match(/\d+/);
    return s ? parseInt(s[0], 10) : 0;
  }

  function _score(topicId) {
    const t = TV.Taxonomy.byId(topicId);
    if (!t || !TV.Recommend) return null;
    const ks = TV.Recommend.calculateTopicScore(t);
    return { id: t.id, label: t.label, route: t.route, score: ks.score, started: ks.started };
  }

  /* ── Objective / domain / cert readiness ─────────────────────── */
  function objectiveReadiness(obj) {
    const topics = (obj.topicIds || []).map(_score).filter(Boolean);
    const score = topics.length ? _round(topics.reduce((a, t) => a + t.score, 0) / topics.length) : 0;
    const gapN = (obj.gaps || []).length;
    const coverage = _round((topics.length / Math.max(1, topics.length + gapN)) * 100);
    return { id: obj.id, statement: obj.statement, level: obj.level, score: score,
             coverage: coverage, topics: topics, gaps: obj.gaps || [], examFocus: obj.examFocus || [] };
  }

  function domainReadiness(domain) {
    const objectives = (domain.objectives || []).map(objectiveReadiness);
    const score = objectives.length ? _round(objectives.reduce((a, o) => a + o.score, 0) / objectives.length) : 0;
    return { id: domain.id, name: domain.name, weight: domain.weight, weightNum: weightNum(domain.weight),
             score: score, objectives: objectives };
  }

  function _labsFor(certId) {
    const all = (TV.CertLabs && TV.CertLabs.list) || [];
    return all.filter(l => (l.certIds || []).indexOf(certId) !== -1 || l.certId === certId);
  }

  function certReadiness(cert) {
    const domains = (cert.domains || []).map(domainReadiness);
    const wsum = domains.reduce((a, d) => a + d.weightNum, 0) || 1;
    const theory = _round(domains.reduce((a, d) => a + d.score * d.weightNum, 0) / wsum);

    // practice-exam signal
    const ex = TV.Progress && TV.Progress.certExamInfo(cert.certificationId);
    const practiceExam = ex && ex.total ? _round((ex.correct / ex.total) * 100) : null;

    // hands-on signal
    const labs = _labsFor(cert.certificationId);
    const labsDone = labs.filter(l => TV.Progress && TV.Progress.isLabDone(l.id)).length;
    const handsOn = labs.length ? _round((labsDone / labs.length) * 100) : null;

    // troubleshooting proxy: topics tagged 'troubleshooting' among cert topics
    const tTopics = certTopicIds(cert).map(id => TV.Taxonomy.byId(id)).filter(t => t && (t.skills || []).indexOf('troubleshooting') !== -1);
    const troubleshooting = tTopics.length
      ? _round(tTopics.reduce((a, t) => a + TV.Recommend.calculateTopicScore(t).score, 0) / tTopics.length) : null;

    // overall = weighted blend over present signals
    const parts = [{ w: 0.5, v: theory }];
    if (practiceExam != null) parts.push({ w: 0.3, v: practiceExam });
    if (handsOn != null) parts.push({ w: 0.2, v: handsOn });
    const sw = parts.reduce((a, p) => a + p.w, 0);
    const overall = _round(parts.reduce((a, p) => a + p.w * p.v, 0) / sw);

    // topic completion
    const ids = certTopicIds(cert);
    const done = ids.filter(id => { const s = _score(id); return s && s.score >= DONE_SCORE; }).length;

    return {
      certificationId: cert.certificationId, name: cert.name,
      overall: overall, theory: theory, practiceExam: practiceExam, handsOn: handsOn, troubleshooting: troubleshooting,
      domains: domains, topicsTotal: ids.length, topicsDone: done, topicsRemaining: ids.length - done,
      labsTotal: labs.length, labsDone: labsDone,
      tier: readinessTier({ overall: overall, practiceExam: practiceExam, handsOn: handsOn, labsTotal: labs.length }),
    };
  }

  /* ── Readiness tier (spec gating) ────────────────────────────── */
  function readinessTier(x) {
    const o = x.overall || 0;
    const examOk = x.practiceExam == null || x.practiceExam >= 80;
    const labsOk = !x.labsTotal || x.handsOn == null || x.handsOn >= 80;
    if (o >= 85 && (x.practiceExam != null && x.practiceExam >= 80) && labsOk) return 'EXAM READY';
    if (o >= 80 && examOk) return 'READY';
    if (o >= 60) return 'NEARLY READY';
    return 'NOT READY';
  }

  /* ── Topic set for a cert (unique, resolvable) ───────────────── */
  function certTopicIds(cert) {
    const set = new Set();
    (cert.domains || []).forEach(d => (d.objectives || []).forEach(o => (o.topicIds || []).forEach(id => {
      if (TV.Taxonomy.byId(id)) set.add(id);
    })));
    return [...set];
  }

  /* ── Gap analysis: lowest weighted-impact objectives ─────────── */
  function certGaps(cert, n) {
    const out = [];
    (cert.domains || []).forEach(d => {
      const w = weightNum(d.weight);
      (d.objectives || []).forEach(o => {
        const r = objectiveReadiness(o);
        out.push({ domain: d.name, domainWeight: d.weight, statement: o.statement,
          score: r.score, coverage: r.coverage, topicIds: o.topicIds || [], gaps: o.gaps || [],
          impact: w * (100 - r.score) });
      });
    });
    return out.sort((a, b) => b.impact - a.impact).slice(0, n || 5);
  }

  /* ── Shared-topic overlap: "learn once, apply to many" ───────── */
  function certsForTopic(topicId) {
    return TV.Certifications.active()
      .filter(c => certTopicIds(c).indexOf(topicId) !== -1)
      .map(c => ({ certificationId: c.certificationId, name: c.name, examCode: c.examCode }));
  }

  /* ── Summaries for the center / portfolio ────────────────────── */
  function certSummaries() {
    return TV.Certifications.active().map(certReadiness);
  }

  function recommendNextCert() {
    const sums = certSummaries().filter(s => s.tier !== 'EXAM READY');
    if (!sums.length) return null;
    // Highest current readiness (closest to done), tie-break fewer remaining topics.
    sums.sort((a, b) => (b.overall - a.overall) || (a.topicsRemaining - b.topicsRemaining));
    const top = sums[0];
    const cert = TV.Certifications.byId(top.certificationId);
    return { cert: cert, readiness: top,
      reason: 'Your readiness here (' + top.overall + '%) is the closest to exam-ready — finishing it needs the least new study.' };
  }

  function _vendorKey(cert) {
    const v = String(cert.vendor || '').toLowerCase();
    if (v.indexOf('aws') !== -1) return 'aws';
    if (v.indexOf('databricks') !== -1) return 'databricks';
    return 'azure'; // Microsoft / Fabric
  }

  /* ── Adaptive study plan (7 / 14 / 30 / 60 days) ─────────────── */
  function certStudyPlan(cert, days) {
    days = [7, 14, 30, 60].indexOf(days) !== -1 ? days : 30;
    // weakest topics first (unstudied/low score), excluding mastered
    const weakTopics = certTopicIds(cert).map(_score).filter(Boolean)
      .filter(t => t.score < DONE_SCORE).sort((a, b) => a.score - b.score);
    const labs = ((TV.CertLabs && TV.CertLabs.byCert(cert.certificationId)) || [])
      .filter(l => !(TV.Progress && TV.Progress.isLabDone(l.id)));

    const learnDays = Math.max(1, Math.round(days * 0.6));
    const practiceDays = Math.max(1, Math.round(days * 0.25));
    const examStart = learnDays + practiceDays + 1;
    const phases = [];

    phases.push({ title: 'Learn the weak domains', range: 'Days 1–' + learnDays,
      items: weakTopics.slice(0, Math.max(4, Math.round(days / 2))).map(t => ({ kind: 'study', label: t.label, route: t.route, done: false })) });

    if (labs.length) {
      phases.push({ title: 'Hands-on labs', range: 'Days ' + (learnDays + 1) + '–' + (learnDays + practiceDays),
        items: labs.slice(0, Math.max(3, Math.round(days / 5))).map(l => ({ kind: 'lab', label: l.title, done: false })) });
    }

    const hasExam = TV.CertQuestions && TV.CertQuestions.has(cert.certificationId);
    const examItems = [];
    if (hasExam) examItems.push({ kind: 'exam', label: 'Take a full practice exam, then review every miss', done: false });
    const weakDomains = certReadiness(cert).domains.slice().sort((a, b) => a.score - b.score).slice(0, 2);
    weakDomains.forEach(d => examItems.push({ kind: 'review', label: 'Review ' + d.name + ' (' + d.score + '%)', done: false }));
    phases.push({ title: 'Practice exams & final review', range: 'Days ' + examStart + '–' + days, items: examItems });

    return { days: days, phases: phases };
  }

  /* ── Cram sheet: weak topics + comparisons + traps ───────────── */
  function certCram(cert) {
    const vk = _vendorKey(cert);
    const weakTopics = certTopicIds(cert).map(_score).filter(Boolean)
      .filter(t => t.score < 70).sort((a, b) => a.score - b.score).slice(0, 8);
    return {
      weakTopics: weakTopics,
      comparisons: (TV.CertCompare && TV.CertCompare[vk]) || [],
      traps: (TV.CertTrapsFor && TV.CertTrapsFor(vk)) || [],
    };
  }

  TV.CertEngine = {
    weightNum, objectiveReadiness, domainReadiness, certReadiness, readinessTier,
    certTopicIds, certGaps, certsForTopic, certSummaries, recommendNextCert,
    certStudyPlan, certCram,
  };
})();
