/*
 * cloud-store.js — the local state bridge between the Cloud DE Visualizer and
 * the cross-device cloud sync (js/core/cloudsync.js).
 *
 * It owns two synced buckets and exposes them as a single "cloud bundle":
 *
 *   • progress — the whole TV.Progress object (localStorage key `cde-progress`):
 *                viewed topics, quiz accuracy, self-ratings, activities,
 *                interview self-rates, role/goal. Merged last-write-wins on its
 *                own `updated` timestamp (whichever device saved most recently
 *                wins the blob — simple and never corrupts a personal store).
 *
 *   • iqEdits  — per-question interview Q&A edits (localStorage key
 *                `cde-iq-edits`), a two-level map so concurrent edits to
 *                DIFFERENT questions never collide under the 3-way merge:
 *                  { "<format>/<topicId>": { "<qi>": { q?, a? } } }
 *                `q` is plain text, `a` is rich HTML (from the editor).
 *
 * Public API (window.CDEVIZ.store):
 *   cloudBuckets()            -> { progress, iqEdits }     (for a push)
 *   applyCloudBuckets(b)      -> bool changed              (adopt a pull/merge)
 *   getIqEdit(fmt, tid, qi)   -> { q?, a? } | null
 *   setIqEdit(fmt, tid, qi, o)
 *   clearIqEdit(fmt, tid, qi)
 *
 * No build step, no dependencies, ES5-safe. If cloud sync is off this still
 * works — edits/progress just stay local (same as before sync existed).
 */
(function () {
  'use strict';
  var TV = window.TableViz;
  if (!TV) return;
  var C = (window.CDEVIZ = window.CDEVIZ || {});

  var IQ_KEY = 'cde-iq-edits';

  // ---- iqEdits local store -------------------------------------------------
  function loadIq() {
    try {
      var o = JSON.parse(TV.ls.get(IQ_KEY) || 'null');
      return (o && typeof o === 'object') ? o : {};
    } catch (e) { return {}; }
  }
  function saveIq(map) {
    try { TV.ls.set(IQ_KEY, JSON.stringify(map || {})); } catch (e) {}
  }
  function groupKey(fmt, tid) { return String(fmt) + '/' + String(tid); }

  function getIqEdit(fmt, tid, qi) {
    var g = loadIq()[groupKey(fmt, tid)];
    var ov = g ? g[String(qi)] : null;
    return (ov && typeof ov === 'object') ? ov : null;
  }
  function setIqEdit(fmt, tid, qi, obj) {
    var map = loadIq();
    var gk = groupKey(fmt, tid), qk = String(qi);
    if (!obj || (obj.q == null && obj.a == null)) { clearIqEdit(fmt, tid, qi); return; }
    if (!map[gk]) map[gk] = {};
    map[gk][qk] = obj;
    saveIq(map);
    if (C.cloud && C.cloud.onLocalChange) { try { C.cloud.onLocalChange(); } catch (e) {} }
  }
  function clearIqEdit(fmt, tid, qi) {
    var map = loadIq();
    var gk = groupKey(fmt, tid), qk = String(qi);
    var g = map[gk];
    if (!g || !(qk in g)) return;
    delete g[qk];
    var any = false, k; for (k in g) { if (g.hasOwnProperty(k)) { any = true; break; } }
    if (!any) delete map[gk];
    saveIq(map);
    if (C.cloud && C.cloud.onLocalChange) { try { C.cloud.onLocalChange(); } catch (e) {} }
  }

  // ---- cloud bundle --------------------------------------------------------
  function cloudBuckets() {
    return {
      progress: (TV.Progress && TV.Progress.snapshot) ? TV.Progress.snapshot() : {},
      iqEdits: loadIq()
    };
  }

  // Adopt an already-merged bundle from the cloud. Returns true if anything on
  // this device actually changed (so the caller can re-render).
  function applyCloudBuckets(b) {
    b = b || {};
    var changed = false;

    if (b.iqEdits && typeof b.iqEdits === 'object') {
      var beforeIq = JSON.stringify(loadIq());
      var afterIq = JSON.stringify(b.iqEdits);
      if (beforeIq !== afterIq) { saveIq(b.iqEdits); changed = true; }
    }

    if (b.progress && typeof b.progress === 'object' && TV.Progress && TV.Progress.adopt) {
      if (TV.Progress.adopt(b.progress)) changed = true;
    }

    return changed;
  }

  C.store = {
    cloudBuckets: cloudBuckets,
    applyCloudBuckets: applyCloudBuckets,
    getIqEdit: getIqEdit,
    setIqEdit: setIqEdit,
    clearIqEdit: clearIqEdit
  };
})();
