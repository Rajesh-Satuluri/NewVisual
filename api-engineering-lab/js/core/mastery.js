/* ============================================================
   mastery.js — section mastery + capstone gating
   ------------------------------------------------------------
   A section is "mastered" when its quiz average is ≥ 80% AND any
   build requirement it carries is done. Reads the signals the app
   already persists:
     apilab-quiz-<id>      per-module quiz best score
     apilab-katas          { kataId: true }     (Express Workshop)
     apilab-oa-fixed       { exId: true }        (OpenAPI Studio)
     apilab-design-review  "<pct>"               (Design Reviewer)

   AV.Mastery.sections() → [{ group, modules, quizPct, quizMastered,
     build:{label,done,detail}|null, mastered }]
   AV.Mastery.overall()  → { mastered, total, capstoneUnlocked }
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var PASS = 80;

  function quizBest(id) { try { return parseInt(localStorage.getItem("apilab-quiz-" + id), 10) || 0; } catch (e) { return 0; } }
  function jmap(key) { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) { return {}; } }
  function num(key) { try { return parseInt(localStorage.getItem(key), 10) || 0; } catch (e) { return 0; } }

  // Build requirements, keyed by section group name.
  function buildReq(group) {
    if (group === "Implementation & Testing") {
      var katas = jmap("apilab-katas");
      var nK = 0; for (var k in katas) if (katas.hasOwnProperty(k) && katas[k]) nK++;
      var totalK = (AV.data && AV.data.katas && AV.data.katas.length) || 16;
      var oa = jmap("apilab-oa-fixed");
      var nOa = 0; for (var e in oa) if (oa.hasOwnProperty(e) && oa[e]) nOa++;
      var totalOa = (AV.data && AV.data.openapiExercises && AV.data.openapiExercises.length) || 5;
      var review = num("apilab-design-review");
      var done = nK >= totalK && nOa >= totalOa && review >= PASS;
      return { label: "Build exercises", done: done,
        detail: nK + "/" + totalK + " katas · " + nOa + "/" + totalOa + " specs fixed · capstone " + (review ? review + "%" : "—") };
    }
    return null;
  }

  var Mastery = {
    sections: function () {
      var routes = AV.routes || {}, order = AV.navOrder || [];
      var banks = (AV.data && AV.data.quizBanks) || {};
      var groups = [];
      var seen = {};
      order.forEach(function (id) {
        var g = routes[id] && routes[id].group;
        if (!g || g === "Start Here") return;
        if (!seen[g]) { seen[g] = { group: g, modules: [] }; groups.push(seen[g]); }
        seen[g].modules.push(id);
      });
      return groups.map(function (sec) {
        var quizMods = sec.modules.filter(function (id) { return banks[id] && banks[id].length; });
        var pctSum = 0, counted = 0;
        quizMods.forEach(function (id) {
          var total = banks[id].length;
          if (!total) return;
          pctSum += Math.min(100, Math.round(quizBest(id) / total * 100));
          counted++;
        });
        var quizPct = counted ? Math.round(pctSum / counted) : 0;
        var quizMastered = counted > 0 && quizPct >= PASS;
        var build = buildReq(sec.group);
        var mastered = quizMastered && (!build || build.done);
        return { group: sec.group, modules: sec.modules, quizMods: quizMods, quizPct: quizPct, quizMastered: quizMastered, build: build, mastered: mastered, counted: counted };
      });
    },
    overall: function () {
      var secs = this.sections();
      var done = secs.filter(function (s) { return s.mastered; }).length;
      return { mastered: done, total: secs.length, capstoneUnlocked: done >= secs.length && secs.length > 0, sections: secs };
    }
  };

  AV.Mastery = Mastery;
})();
