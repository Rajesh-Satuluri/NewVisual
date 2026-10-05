/* ============================================================
   TableViz — neutral core namespace (multi-format foundation)
   Loaded FIRST, before any data/module/feature file.

   The tool is evolving from a single-format Iceberg visualizer
   into a format-aware "Open Table Formats" tool. To avoid editing
   every existing module, `window.IcebergViz` is kept as a live
   ALIAS of `window.TableViz` — legacy code that reads/writes
   `window.IcebergViz` transparently uses the same object.

   Formats register their modules under TV.formatModules[format].
   Legacy Iceberg modules still assign to the flat `TV.modules`
   map (via the alias); app.js absorbs those into the `iceberg`
   bucket at boot (see _absorbLegacyModules). New formats (Delta,
   Compare, …) must call TV.registerModule(format, mod) instead,
   so their ids never collide with Iceberg's.
   ============================================================ */
(function () {
  'use strict';

  const TV = (window.TableViz = window.TableViz || {});
  // Back-compat: existing files use window.IcebergViz / const IV = window.IcebergViz.
  window.IcebergViz = TV;

  // Format registry — each entry supplies label, brand, docs, logo, navGroups.
  // Populated by js/formats/*.js. Order here is the switcher order.
  TV.formats = TV.formats || {};

  // Per-format module registries. Legacy flat map kept for Iceberg modules.
  TV.modules = TV.modules || {};                 // legacy flat (Iceberg)
  TV.formatModules = TV.formatModules || {};     // { iceberg:{}, delta:{}, compare:{} }

  /** Register a module under a specific format. Preferred for new formats. */
  TV.registerModule = function (format, mod) {
    if (!mod || !mod.id) return mod;
    (TV.formatModules[format] = TV.formatModules[format] || {})[mod.id] = mod;
    mod.format = format;
    return mod;
  };

  /** Look up a module for a format id. */
  TV.getModule = function (format, id) {
    const bucket = TV.formatModules[format];
    return bucket ? bucket[id] : undefined;
  };

  /** Register a format descriptor. */
  TV.registerFormat = function (fmt) {
    if (!fmt || !fmt.id) return;
    TV.formats[fmt.id] = fmt;
    TV.formatModules[fmt.id] = TV.formatModules[fmt.id] || {};
  };

  /* ── localStorage-safe helpers (global) ───────────────────── */
  TV.ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  /* ── Active format ────────────────────────────────────────── */
  TV.activeFormat = null; // set by app.js at boot from tv-format
  TV.currentFormat = () => TV.activeFormat;
})();
