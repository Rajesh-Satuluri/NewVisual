/* ============================================================
   Cloud DE Visualizer — Recommendation engine (Phase 1).

   PURE logic. No DOM, no rendering. Consumes TV.Taxonomy (the topic
   graph + importance/skills/prereqs) and TV.Progress (the user's
   signals), and produces ranked, explained recommendations plus the
   readiness scores the dashboard shows.

   Design goals (from the plan):
     • transparent, weighted scoring — never random
     • respects prerequisites (won't push an advanced topic while a
       prerequisite is weak; surfaces the prerequisite instead)
     • every recommendation carries WHY, derived from actual signals
     • works on day one (cold start) by falling back to importance,
       then personalizes as quiz/rating/view signals accrue
     • weights are configurable + role-aware

   Public API: TV.Recommend
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  /* ── Configurable priority weights (sum ≈ 1 → base score is 0–100) ── */
  const DEFAULT_WEIGHTS = {
    gap:          0.30, // how much you don't yet know (knowledge gap)
    interview:    0.22, // interview importance of the topic
    production:   0.14, // production/ops importance
    architecture: 0.10, // architecture importance
    unlock:       0.12, // how many later topics this one unlocks (prereq value)
    review:       0.07, // spaced-review pressure
    foundation:   0.05, // foundational + not-started bonus
  };

  const STRONG_SCORE = 85;   // at/above this (with evidence) → "mastered", skip
  const WEAK_SCORE   = 60;   // below this (and started) → weak
  const PREREQ_OK    = 55;   // prereq at/above this is considered satisfied

  function _clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function _round(n) { return Math.round(n); }

  function weights() {
    const w = TV.Progress && TV.Progress.getWeights && TV.Progress.getWeights();
    return Object.assign({}, DEFAULT_WEIGHTS, w || {});
  }

  /* ── Dependents map (reverse of prereqs → "unlocks") ──────── */
  let _dependents = null;
  function _dependentsOf(id) {
    if (!_dependents) {
      _dependents = {};
      TV.Taxonomy.topics().forEach(t => {
        (t.prereqs || []).forEach(p => { (_dependents[p] = _dependents[p] || []).push(t.id); });
      });
    }
    return _dependents[id] || [];
  }

  /* ── Knowledge score (0–100) from available signals ──────────
     Renormalizes over whichever signals are present, so a topic
     judged only by self-rating still scores sensibly, and quiz
     accuracy (once there's enough of it) dominates. */
  function calculateTopicScore(topic, sig) {
    sig = sig || (TV.Progress ? TV.Progress.topicSignals(topic) : null) || {};
    const parts = [];
    const basis = [];

    if (sig.quizAccuracy != null) {
      const reliability = _clamp((sig.quizAttempts || 0) / 4, 0, 1); // ramps to full over ~4 Qs
      parts.push({ w: 0.5 * (0.4 + 0.6 * reliability), v: sig.quizAccuracy });
      basis.push('quiz');
    }
    if (sig.rating != null) {
      parts.push({ w: 0.3, v: (sig.rating - 1) / 4 * 100 });
      basis.push('rating');
    }
    if (sig.studied) {
      // Opening a page is exposure, not mastery — capped low.
      parts.push({ w: 0.2, v: _clamp(40 + ((sig.views || 1) - 1) * 8, 40, 65) });
      basis.push('viewed');
    }

    if (!parts.length) return { score: 0, started: false, basis: [] };

    let sumW = 0, sumWV = 0;
    parts.forEach(p => { sumW += p.w; sumWV += p.w * p.v; });
    let score = sumWV / sumW;

    // Mild recency decay once well past the review horizon.
    if (sig.daysSinceStudied != null) {
      const over = sig.daysSinceStudied - 14;
      if (over > 0) score *= (1 - _clamp(over / 120, 0, 0.25));
    }
    return { score: _round(_clamp(score, 0, 100)), started: true, basis: basis };
  }

  function calculateKnowledgeGap(topic, sig, ks) {
    ks = ks || calculateTopicScore(topic, sig);
    return ks.started ? _round(100 - ks.score) : 100;
  }

  /* ── Prerequisites, resolved with their current scores ───────── */
  function getPrerequisites(topic) {
    return (topic.prereqs || []).map(pid => {
      const pt = TV.Taxonomy.byId(pid);
      if (!pt) return null;
      const ks = calculateTopicScore(pt);
      return { topic: pt, score: ks.score, started: ks.started, weak: !ks.started || ks.score < PREREQ_OK };
    }).filter(Boolean);
  }

  function _isMastered(sig, ks) {
    return ks.started && ks.score >= STRONG_SCORE &&
      ((sig.quizAttempts || 0) >= 3 || (sig.rating || 0) >= 4);
  }

  /* ── Recommendation TYPE from state ──────────────────────────── */
  function _classify(topic, sig, ks, prereqs) {
    const gap = calculateKnowledgeGap(topic, sig, ks);
    const imp = topic.importance || {};
    const hasSkill = (s) => (topic.skills || []).indexOf(s) !== -1;

    if (!ks.started && topic.foundation) return 'FOUNDATION_GAP';
    if (prereqs.some(p => p.weak) && topic.difficulty === 'advanced') return 'PREREQUISITE';
    if (sig.reviewDue && ks.started && ks.score >= WEAK_SCORE) return 'REVIEW_DUE';
    if (ks.started && ks.score < WEAK_SCORE) {
      if (hasSkill('troubleshooting')) return 'PERFORMANCE_GAP';
      return 'WEAK_TOPIC';
    }
    if (hasSkill('governance')) return 'SECURITY_GAP';
    if ((imp.interview || 0) >= 80 && gap >= 25) return 'INTERVIEW_PRIORITY';
    if (hasSkill('production') && (imp.production || 0) >= 78) return 'PRODUCTION_GAP';
    if (hasSkill('architecture')) return 'ARCHITECTURE_GAP';
    if (hasSkill('streaming')) return 'INTERVIEW_PRIORITY';
    if (ks.started && ks.score >= WEAK_SCORE && topic.difficulty === 'advanced') return 'ADVANCED_NEXT_STEP';
    return 'INTERVIEW_PRIORITY';
  }

  const TYPE_LABEL = {
    FOUNDATION_GAP: 'Foundation', PREREQUISITE: 'Prerequisite', WEAK_TOPIC: 'Weak topic',
    REVIEW_DUE: 'Review due', INTERVIEW_PRIORITY: 'Interview priority', PRODUCTION_GAP: 'Production gap',
    ARCHITECTURE_GAP: 'Architecture gap', SECURITY_GAP: 'Security gap', PERFORMANCE_GAP: 'Performance gap',
    ADVANCED_NEXT_STEP: 'Advanced next step',
  };

  /* ── Role-aware scalar (tilts priority by target role) ───────── */
  function _roleScalar(topic, rw, interviewF, productionF, archF) {
    let s = 1
      + (rw.interview - 1) * (interviewF / 100) * 0.5
      + (rw.production - 1) * (productionF / 100) * 0.5
      + (rw.architecture - 1) * (archF / 100) * 0.5;
    if (rw.troubleshooting && (topic.skills || []).indexOf('troubleshooting') !== -1) {
      s += (rw.troubleshooting - 1) * 0.3;
    }
    if (rw.boostSkills && rw.boostSkills.some(bs => (topic.skills || []).indexOf(bs) !== -1)) {
      s += 0.1;
    }
    return _clamp(s, 0.75, 1.35);
  }

  /* ── Priority score (0–100), transparent weighted sum ────────── */
  function calculateRecommendationScore(topic, ctx) {
    ctx = ctx || {};
    const sig = ctx.sig || (TV.Progress ? TV.Progress.topicSignals(topic) : {}) || {};
    const ks = ctx.ks || calculateTopicScore(topic, sig);
    const w = ctx.weights || weights();
    const rw = ctx.roleWeights || TV.Taxonomy.roleWeights(ctx.role || (TV.Progress && TV.Progress.getRole()));
    const imp = topic.importance || {};

    const gapF = calculateKnowledgeGap(topic, sig, ks);
    const interviewF = imp.interview || 0;
    const productionF = imp.production || 0;
    const archF = imp.architecture || 0;
    const unlockF = _clamp(_dependentsOf(topic.id).length * 25, 0, 100);
    const reviewF = sig.reviewDue ? _clamp(40 + gapF * 0.6, 0, 100) : 0;
    const foundationF = (topic.foundation && !ks.started) ? 100 : 0;

    const base =
      gapF * w.gap + interviewF * w.interview + productionF * w.production +
      archF * w.architecture + unlockF * w.unlock + reviewF * w.review + foundationF * w.foundation;

    const priority = _clamp(_round(base * _roleScalar(topic, rw, interviewF, productionF, archF)), 0, 100);
    return priority;
  }

  /* ── Human reasons, derived from the actual signals ──────────── */
  function generateReason(topic, sig, ks, prereqs, type, roleLabel) {
    const out = [];
    const imp = topic.importance || {};

    if (!ks.started) out.push("You haven't opened this topic yet");
    if (sig.quizAccuracy != null) out.push('Your quiz accuracy here is ' + sig.quizAccuracy + '% (' + sig.quizAttempts + ' answered)');
    if (sig.rating != null) out.push('You rated your own confidence ' + sig.rating + '/5');
    if (sig.reviewDue && sig.daysSinceStudied != null) out.push('Last studied ' + sig.daysSinceStudied + ' days ago — due for review');

    const weakP = prereqs.filter(p => p.weak);
    weakP.forEach(p => {
      out.push('Prerequisite “' + p.topic.label + '” is ' + (p.started ? 'still weak (' + p.score + '%)' : 'not started yet'));
    });

    if (topic.foundation) out.push('A foundation other topics build on');
    if ((imp.interview || 0) >= 80) out.push('Frequently tested in ' + (roleLabel || 'Data Engineer') + ' interviews');
    if ((imp.production || 0) >= 80 && (topic.skills || []).indexOf('production') !== -1) out.push('High production relevance (reliability / ops)');

    const deps = _dependentsOf(topic.id).map(id => { const t = TV.Taxonomy.byId(id); return t ? t.label : null; }).filter(Boolean);
    if (deps.length) out.push('Unlocks: ' + deps.slice(0, 3).join(', ') + (deps.length > 3 ? '…' : ''));

    if (!out.length) out.push('Rounds out your ' + (topic.cloud) + ' coverage');
    return out;
  }

  const EST = { intro: 20, intermediate: 30, advanced: 40 };
  function _actions(topic, sig) {
    const a = [];
    if (topic.kind === 'service') {
      a.push('Read the service page — focus on the “Why it exists” / intuition');
      a.push('Work the interview Q&A at the bottom of the page');
    } else {
      a.push('Work through the drill questions');
      a.push('Re-attempt the ones you miss');
    }
    if (!sig.studied) a.unshift('Open ' + topic.label);
    if (TV.QuizBank && TV.QuizBank[topic.cloud]) a.push('Take the ' + topic.cloud + ' quiz to test recall');
    return a;
  }

  /* ── The central recommendation data model ───────────────────── */
  function buildRecommendation(topic, ctx) {
    ctx = ctx || {};
    const role = ctx.role || (TV.Progress && TV.Progress.getRole());
    const roleLabel = TV.Taxonomy.roleWeights(role).label;
    const sig = (TV.Progress ? TV.Progress.topicSignals(topic) : {}) || {};
    const ks = calculateTopicScore(topic, sig);
    const prereqs = getPrerequisites(topic);
    const priority = calculateRecommendationScore(topic, Object.assign({ sig: sig, ks: ks }, ctx));
    const type = _classify(topic, sig, ks, prereqs);
    const gap = calculateKnowledgeGap(topic, sig, ks);
    const imp = topic.importance || {};

    return {
      topicId: topic.id,
      title: topic.label,
      cloud: topic.cloud,
      category: topic.category,
      kind: topic.kind,
      route: topic.route,
      difficulty: topic.difficulty,
      skills: topic.skills,
      priorityScore: priority,
      knowledgeScore: ks.score,
      started: ks.started,
      gapScore: gap,
      targetScore: _clamp(Math.max(STRONG_SCORE, ks.score + 25), 0, 100),
      recommendationType: type,
      typeLabel: TYPE_LABEL[type] || type,
      reason: generateReason(topic, sig, ks, prereqs, type, roleLabel),
      prerequisites: prereqs.map(p => ({ id: p.topic.id, title: p.topic.label, route: p.topic.route, score: p.score, weak: p.weak, started: p.started })),
      actions: _actions(topic, sig),
      estimatedMinutes: (EST[topic.difficulty] || 30) + (sig.reviewDue ? 10 : 0),
      interviewImportance: imp.interview || 0,
      productionImportance: imp.production || 0,
      architectureImportance: imp.architecture || 0,
      signals: sig,
    };
  }

  /* ── Next best topics (ranked, prereq-gated, deduped) ─────────── */
  function getNextBestTopics(n, ctx) {
    ctx = ctx || {};
    n = _clamp(n || 5, 3, 8);
    const topics = TV.Taxonomy.topics();

    const scored = topics.map(t => {
      const sig = (TV.Progress ? TV.Progress.topicSignals(t) : {}) || {};
      const ks = calculateTopicScore(t, sig);
      const prereqs = getPrerequisites(t);
      const blocked = prereqs.some(p => p.weak) && t.difficulty !== 'intro';
      return { topic: t, sig, ks, prereqs, blocked, mastered: _isMastered(sig, ks),
               priority: calculateRecommendationScore(t, Object.assign({ sig, ks }, ctx)) };
    });

    const eligible = scored
      .filter(s => !s.mastered)          // don't re-recommend strong topics
      .filter(s => !s.blocked)           // gate: the weak prereq ranks instead
      .sort((a, b) => b.priority - a.priority);

    // Soft diversity cap: at most 3 from any one cloud in the shortlist.
    const out = [], cloudCount = {};
    for (const s of eligible) {
      const c = s.topic.cloud;
      if ((cloudCount[c] || 0) >= 3 && out.length >= n) break;
      if ((cloudCount[c] || 0) >= 3) continue;
      out.push(buildRecommendation(s.topic, ctx));
      cloudCount[c] = (cloudCount[c] || 0) + 1;
      if (out.length >= n) break;
    }
    return out;
  }

  /* ── Spaced-review queue ─────────────────────────────────────── */
  function getReviewTopics(limit) {
    return TV.Taxonomy.topics()
      .map(t => {
        const sig = (TV.Progress ? TV.Progress.topicSignals(t) : {}) || {};
        const ks = calculateTopicScore(t, sig);
        return { t, sig, ks };
      })
      .filter(x => x.sig.reviewDue && x.ks.started)
      .sort((a, b) => ((b.t.importance.interview || 0) * (100 - b.ks.score)) - ((a.t.importance.interview || 0) * (100 - a.ks.score)))
      .slice(0, limit || 6)
      .map(x => buildRecommendation(x.t));
  }

  /* ── Weak areas (started but low) ────────────────────────────── */
  function getWeakAreas(limit) {
    return TV.Taxonomy.topics()
      .map(t => ({ t, ks: calculateTopicScore(t) }))
      .filter(x => x.ks.started && x.ks.score < WEAK_SCORE)
      .sort((a, b) => ((b.t.importance.interview || 0) - b.ks.score) - ((a.t.importance.interview || 0) - a.ks.score))
      .slice(0, limit || 6)
      .map(x => buildRecommendation(x.t));
  }

  /* ── Interview readiness by skill (coverage-aware) ───────────── */
  function _skillReadiness(skill) {
    const topics = TV.Taxonomy.forSkill(skill);
    if (!topics.length) return null;
    let num = 0, den = 0, weakest = null;
    topics.forEach(t => {
      const ks = calculateTopicScore(t);
      const w = (t.importance.interview || 50);
      num += ks.score * w;
      den += 100 * w;
      if (!weakest || ks.score < weakest.score) weakest = { topic: t, score: ks.score };
    });
    return { skill, label: TV.Taxonomy.SKILLS[skill] || skill, pct: _round((num / den) * 100), count: topics.length, weakest };
  }

  function getInterviewReadiness() {
    const skills = TV.Taxonomy.INTERVIEW_SKILLS.map(_skillReadiness).filter(Boolean);
    skills.sort((a, b) => a.pct - b.pct); // weakest first
    // Overall: importance-weighted coverage over all topics.
    let num = 0, den = 0;
    TV.Taxonomy.topics().forEach(t => {
      const ks = calculateTopicScore(t);
      const w = (t.importance.interview || 50);
      num += ks.score * w; den += 100 * w;
    });
    const overall = den ? _round((num / den) * 100) : 0;
    return { overall: overall, skills: skills, weakest: skills[0] || null };
  }

  /* ── Overall coverage snapshot (for the header ring) ─────────── */
  function getOverview() {
    const topics = TV.Taxonomy.topics();
    let started = 0, strong = 0;
    topics.forEach(t => {
      const sig = (TV.Progress ? TV.Progress.topicSignals(t) : {}) || {};
      const ks = calculateTopicScore(t, sig);
      if (ks.started) started++;
      if (_isMastered(sig, ks)) strong++;
    });
    const ir = getInterviewReadiness();
    return { total: topics.length, started: started, strong: strong,
             interviewReadiness: ir.overall, weakestSkill: ir.weakest,
             personalized: TV.Progress ? TV.Progress.hasAnyProgress() : false };
  }

  /* ── Learning paths (adaptive sequences) ─────────────────────────
     Annotates a curated path's steps with the user's current state so
     the path adapts instead of being a static checklist:
       done     — mastered (skipped going forward)
       active   — the next thing to do (first non-done step)
       upcoming — later steps
     plus per-step: started, score, weak (started but <60), and
     `reinforce` (weak/missing prerequisites worth shoring up first). */
  function generateLearningPath(pathId) {
    const defs = TV.LearningPaths || [];
    const def = typeof pathId === 'object' ? pathId : defs.find(p => p.id === pathId);
    if (!def) return null;

    let activeAssigned = false;
    const steps = (def.steps || []).map(id => {
      const t = TV.Taxonomy.byId(id);
      if (!t) return null;
      const sig = (TV.Progress ? TV.Progress.topicSignals(t) : {}) || {};
      const ks = calculateTopicScore(t, sig);
      const done = _isMastered(sig, ks);
      const weak = ks.started && ks.score < WEAK_SCORE;
      let state = done ? 'done' : 'upcoming';
      if (!done && !activeAssigned) { state = 'active'; activeAssigned = true; }
      // Prereqs worth reinforcing that aren't already earlier in this path.
      const earlier = new Set((def.steps || []).slice(0, (def.steps || []).indexOf(id)));
      const reinforce = getPrerequisites(t)
        .filter(p => p.weak && !earlier.has(p.topic.id))
        .map(p => ({ id: p.topic.id, title: p.topic.label, route: p.topic.route, score: p.score, started: p.started }));
      return {
        id: t.id, title: t.label, route: t.route, cloud: t.cloud, kind: t.kind,
        difficulty: t.difficulty, score: ks.score, started: ks.started,
        done: done, weak: weak, state: state, reinforce: reinforce,
      };
    }).filter(Boolean);

    const doneCount = steps.filter(s => s.done).length;
    const active = steps.find(s => s.state === 'active') || null;
    return {
      id: def.id, title: def.title, goal: def.goal, icon: def.icon, cloud: def.cloud,
      steps: steps,
      progress: { done: doneCount, total: steps.length, pct: steps.length ? _round((doneCount / steps.length) * 100) : 0 },
      nextStep: active,
    };
  }

  function getLearningPaths() {
    return (TV.LearningPaths || []).map(p => generateLearningPath(p)).filter(Boolean);
  }

  /* Which curated paths contain a given topic (for cross-linking recs). */
  function pathsForTopic(topicId) {
    return (TV.LearningPaths || [])
      .filter(p => (p.steps || []).indexOf(topicId) !== -1)
      .map(p => ({ id: p.id, title: p.title, cloud: p.cloud, route: '#' + p.cloud + '/paths' }));
  }

  /* ── Today's study plan (time-boxed session from current gaps) ────
     Fills a minute budget with: top next-best topics to study, a
     spaced-review item, and a closing quiz on the cloud you're working.
     Deterministic — same gaps produce the same plan. */
  function generateDailyPlan(minutes) {
    const budget = [30, 60, 120].indexOf(minutes) !== -1 ? minutes : 60;
    let remaining = budget;
    const blocks = [];
    const used = new Set();

    // Reserve room so a longer session still ends with review + a quiz.
    const reserve = budget >= 60 ? 20 : 10;

    const next = getNextBestTopics(6);
    for (const rec of next) {
      if (remaining - reserve < 15 && blocks.length) break; // keep room, but guarantee ≥1 study
      if (remaining < 15) break;
      const m = Math.min(rec.estimatedMinutes || 30, remaining);
      blocks.push({ type: 'study', minutes: m, title: rec.title, route: rec.route,
        cloud: rec.cloud, detail: rec.typeLabel, reason: rec.reason[0] || '' });
      used.add(rec.cloud);
      remaining -= m;
    }

    const rev = getReviewTopics(1);
    if (rev.length && remaining >= 10) {
      blocks.push({ type: 'review', minutes: 10, title: rev[0].title, route: rev[0].route,
        cloud: rev[0].cloud, detail: 'Spaced review', reason: (rev[0].signals.daysSinceStudied || '') + 'd since last study' });
      remaining -= 10;
    }

    // Close with a quiz on a cloud in the plan that actually has a bank.
    if (remaining >= 10) {
      const cloud = [...used].find(c => TV.QuizBank && TV.QuizBank[c]) ||
        (TV.QuizBank ? Object.keys(TV.QuizBank)[0] : null);
      if (cloud) {
        blocks.push({ type: 'quiz', minutes: 10, title: 'Test yourself — ' + cloud, cloud: cloud,
          detail: 'Quiz', reason: 'Lock in recall on what you studied' });
        remaining -= 10;
      }
    }

    return { budget: budget, used: budget - remaining, blocks: blocks };
  }

  /* ── Public API ──────────────────────────────────────────────── */
  TV.Recommend = {
    DEFAULT_WEIGHTS, TYPE_LABEL,
    calculateTopicScore, calculateKnowledgeGap, calculateRecommendationScore,
    getPrerequisites, buildRecommendation,
    getNextBestTopics, getReviewTopics, getWeakAreas,
    getInterviewReadiness, getOverview,
    generateLearningPath, getLearningPaths, generateDailyPlan, pathsForTopic,
  };
})();
