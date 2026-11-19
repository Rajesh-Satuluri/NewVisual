/* ============================================================
   review.js — spaced-review store (misses resurface on 1/3/7 days)
   ------------------------------------------------------------
   When a Test-Yourself question is missed, it's queued here. The
   Review page re-asks due items: answer right → the interval grows
   (1 → 3 → 7 days, then it graduates out); wrong → back to 1 day.

   Storage: apilab-review = { v:1, items: { "<moduleId>::<qkey>":
     { mod, q, stage, due, misses } } }
   qkey is a small hash of the question text, so reordering or
   extending a bank never corrupts the queue.

   AV.Review.addMiss(mod, qText) · dueItems() · upcoming() ·
   grade(key, correct) · findQuestion(item) · counts()
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var KEY = "apilab-review";
  var DAY = 24 * 60 * 60 * 1000;
  var INTERVALS = [1 * DAY, 3 * DAY, 7 * DAY];

  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  function load() {
    try { var o = JSON.parse(localStorage.getItem(KEY)); if (o && o.v === 1 && o.items) return o; } catch (e) {}
    return { v: 1, items: {} };
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  var Review = {
    // A fresh miss is due immediately (review it today); correct
    // reviews then push it out 1 → 3 → 7 days before it graduates.
    addMiss: function (mod, qText) {
      if (!mod || !qText) return;
      var s = load();
      var k = mod + "::" + hash(qText);
      var it = s.items[k];
      if (it) { it.stage = 0; it.due = Date.now(); it.misses = (it.misses || 0) + 1; }
      else s.items[k] = { mod: mod, q: qText, stage: 0, due: Date.now(), misses: 1 };
      save(s);
    },

    // Right → next interval (stage 1→1d, 2→3d, 3→7d, then graduate).
    // Wrong → back to stage 0, due now (practise again this session).
    grade: function (key, correct) {
      var s = load();
      var it = s.items[key];
      if (!it) return;
      if (correct) {
        it.stage = (it.stage || 0) + 1;
        if (it.stage > INTERVALS.length) { delete s.items[key]; save(s); return; }
        it.due = Date.now() + INTERVALS[it.stage - 1];
      } else {
        it.stage = 0;
        it.misses = (it.misses || 0) + 1;
        it.due = Date.now();
      }
      save(s);
    },

    // A missed question is practice material right away: "due" means
    // due-or-overdue, and the Review page also offers early practice.
    dueItems: function () {
      var s = load(), now = Date.now(), out = [];
      for (var k in s.items) if (s.items.hasOwnProperty(k) && s.items[k].due <= now) out.push({ key: k, item: s.items[k] });
      out.sort(function (a, b) { return a.item.due - b.item.due; });
      return out;
    },
    upcoming: function () {
      var s = load(), now = Date.now(), out = [];
      for (var k in s.items) if (s.items.hasOwnProperty(k) && s.items[k].due > now) out.push({ key: k, item: s.items[k] });
      out.sort(function (a, b) { return a.item.due - b.item.due; });
      return out;
    },
    counts: function () {
      var s = load(), due = 0, total = 0, now = Date.now();
      for (var k in s.items) if (s.items.hasOwnProperty(k)) { total++; if (s.items[k].due <= now) due++; }
      return { due: due, total: total };
    },

    // Locate the full MCQ for a queued item by question-text match.
    findQuestion: function (item) {
      var bank = (AV.data && AV.data.quizBanks && AV.data.quizBanks[item.mod]) || [];
      for (var i = 0; i < bank.length; i++) if (bank[i].q === item.q) return bank[i];
      return null;
    },

    reset: function () { save({ v: 1, items: {} }); }
  };

  AV.Review = Review;
})();
