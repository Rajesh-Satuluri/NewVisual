/* ============================================================
   Cloud DE Visualizer — Progress / signal store (Recommendation
   Engine, Phase 1).

   The app historically persisted almost no learning signal (only a
   single best-quiz-score integer per cloud). The recommendation
   engine needs real per-topic signals, so this module is the single
   source of truth for everything the engine reasons about:

     • viewed   — which topics you've opened, how often, and when
                  (captured automatically from the app:navigate event)
     • quiz     — per-topic correct/total accuracy (recorded by the
                  Test Yourself quiz once its questions are tagged)
     • ratings  — your own 1–5 confidence per topic (self-assessment)
     • role     — the target role the recommendations optimize for

   Everything lives under ONE JSON localStorage key (cde-progress) so
   it reads/writes atomically and is easy to export or reset. All
   access goes through TV.ls (try/catch-safe) and every public method
   degrades gracefully when storage is unavailable.

   Pure data only — NO DOM, NO scoring. The engine
   (recommend-engine.js) consumes TV.Progress; the dashboard
   (modules/recommendations.js) renders it. Keeping the three layers
   separate is deliberate (see the Phase-1 plan).
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  const KEY = 'cde-progress';
  const VERSION = 1;
  const DAY = 86400000; // ms

  /* Topics viewed at least this long ago (ms) are "due for review",
     scaled down for weaker topics in the engine. */
  const REVIEW_AFTER = 10 * DAY;

  const DEFAULT_ROLE = 'data-engineer';

  function _now() { return Date.now(); }

  function _blank() {
    return { v: VERSION, role: DEFAULT_ROLE, viewed: {}, quiz: {}, ratings: {}, weights: null, updated: 0 };
  }

  /* ── Load / persist ──────────────────────────────────────── */
  let _cache = null;

  function load() {
    if (_cache) return _cache;
    let data = null;
    try { data = JSON.parse(TV.ls.get(KEY) || 'null'); } catch (e) { data = null; }
    if (!data || typeof data !== 'object') data = _blank();
    // Forward-compatible shape guards (never throw on a partial object).
    data.v = data.v || VERSION;
    data.role = data.role || DEFAULT_ROLE;
    data.viewed = data.viewed || {};
    data.quiz = data.quiz || {};
    data.ratings = data.ratings || {};
    if (!('weights' in data)) data.weights = null;
    _cache = data;
    return _cache;
  }

  function save() {
    const d = load();
    d.updated = _now();
    try { TV.ls.set(KEY, JSON.stringify(d)); } catch (e) { /* storage full / blocked — stay in-memory */ }
    // Let the dashboard refresh itself when signals change.
    try { document.dispatchEvent(new CustomEvent('progress:change')); } catch (e) {}
    return d;
  }

  /* ── Viewed topics (studied signal) ──────────────────────── */
  /* key convention: "<cloud>/<navId>" — matches the hash route, so a
     service page #databricks/delta-lake stores "databricks/delta-lake"
     and an interview drill #azure/iq-adf-security stores
     "azure/iq-adf-security". Pages that aren't topics (home,
     recommend) are recorded too but simply ignored by the engine. */
  function viewKey(cloud, id) { return cloud + '/' + id; }

  function recordView(cloud, id) {
    if (!cloud || !id) return;
    const d = load();
    const k = viewKey(cloud, id);
    const t = _now();
    const cur = d.viewed[k] || { count: 0, first: t, last: t };
    cur.count += 1;
    cur.last = t;
    if (!cur.first) cur.first = t;
    d.viewed[k] = cur;
    save();
  }

  function viewedInfo(cloud, id) { return load().viewed[viewKey(cloud, id)] || null; }

  /* ── Per-topic quiz accuracy ─────────────────────────────── */
  /* topicId is a taxonomy topic id (see taxonomy.js). The quiz tags
     each question with the topic it tests; every answered question
     calls recordQuizAnswer so cumulative accuracy builds over time. */
  function recordQuizAnswer(topicId, correct) {
    if (!topicId) return;
    const d = load();
    const cur = d.quiz[topicId] || { correct: 0, total: 0, last: 0 };
    cur.total += 1;
    if (correct) cur.correct += 1;
    cur.last = _now();
    d.quiz[topicId] = cur;
    save();
  }

  function quizInfo(topicId) { return load().quiz[topicId] || null; }

  /* ── Self-rated confidence (1–5) ─────────────────────────── */
  function setRating(topicId, n) {
    if (!topicId) return;
    const d = load();
    const v = Math.max(1, Math.min(5, Math.round(+n || 0)));
    if (!v) { delete d.ratings[topicId]; } else { d.ratings[topicId] = v; }
    save();
  }
  function getRating(topicId) { return load().ratings[topicId] || null; }
  function clearRating(topicId) {
    const d = load();
    if (topicId in d.ratings) { delete d.ratings[topicId]; save(); }
  }

  /* ── Target role ─────────────────────────────────────────── */
  function setRole(role) { const d = load(); d.role = role || DEFAULT_ROLE; save(); }
  function getRole() { return load().role || DEFAULT_ROLE; }

  /* ── Configurable engine weights (optional personalization) ─ */
  function setWeights(w) { const d = load(); d.weights = w || null; save(); }
  function getWeights() { return load().weights; }

  /* ── Normalized signal bundle for the engine ─────────────────
     Returns a flat, engine-friendly view for one topic. All
     "missing" signals are null (not 0) so the engine can tell
     "unknown" from "zero" and renormalize over what's present. */
  function topicSignals(topic) {
    if (!topic) return null;
    const d = load();
    const vk = viewKey(topic.cloud, topic.navId || topic.id);
    const v = d.viewed[vk] || null;
    const q = d.quiz[topic.id] || null;
    const r = d.ratings[topic.id] || null;

    const last = Math.max(v ? v.last : 0, q ? q.last : 0);
    const daysSince = last ? Math.floor((_now() - last) / DAY) : null;

    return {
      studied: !!v,
      views: v ? v.count : 0,
      lastStudied: last || null,          // ms epoch, or null
      daysSinceStudied: daysSince,         // integer days, or null
      quizAccuracy: q && q.total ? Math.round((q.correct / q.total) * 100) : null, // 0–100 or null
      quizAttempts: q ? q.total : 0,
      rating: r,                           // 1–5 or null
      reviewDue: !!(last && (_now() - last) > REVIEW_AFTER),
      hasAnySignal: !!(v || q || r),
    };
  }

  /* ── Aggregate helpers ───────────────────────────────────── */
  function hasAnyProgress() {
    const d = load();
    return Object.keys(d.viewed).length > 0 ||
           Object.keys(d.quiz).length > 0 ||
           Object.keys(d.ratings).length > 0;
  }

  function reset() {
    _cache = _blank();
    try { TV.ls.set(KEY, JSON.stringify(_cache)); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('progress:change')); } catch (e) {}
  }

  function exportJSON() { return JSON.stringify(load(), null, 2); }

  /* ── Auto-capture "viewed" from navigation ───────────────────
     app.js fires app:navigate with {id, format} on every screen
     change. We record it as a studied signal. Non-topic screens
     (home / recommend) are stored but ignored downstream. */
  function _initCapture() {
    document.addEventListener('app:navigate', function (e) {
      const d = e && e.detail;
      if (!d || !d.id || !d.format) return;
      if (d.id === 'home' || d.id === 'recommend') return; // not study targets
      recordView(d.format, d.id);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _initCapture);
  else _initCapture();

  /* ── Public API ──────────────────────────────────────────── */
  TV.Progress = {
    REVIEW_AFTER, DAY,
    load, save, reset, exportJSON, hasAnyProgress,
    recordView, viewedInfo,
    recordQuizAnswer, quizInfo,
    setRating, getRating, clearRating,
    setRole, getRole,
    setWeights, getWeights,
    topicSignals,
  };
})();
