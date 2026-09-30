/* ============================================================
   sim-bridge.js — mount a db-internals Canvas ES-module sim
   into any shell container. Bridges the IIFE shell world to the
   sims' `export function mount(container)` modules via dynamic
   import(). Specifiers resolve against the page (db-lab/), so
   concept.simFile is stored as "sims/modules/mXX-*.js".
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});

  var cache = {}; // simFile -> module namespace (import promise result)

  var SimBridge = {
    /**
     * Mount a sim into `host`. Returns a teardown function.
     * @param {HTMLElement} host   container to render into
     * @param {string} simFile     e.g. "sims/modules/m48-mvcc.js"
     * @param {object}  [opts]      { hideHero:true }
     */
    mount: function (host, simFile, opts) {
      opts = opts || {};
      if (!host) return function () {};
      host.classList.add("sim-embed");
      if (opts.hideHero !== false) host.classList.add("sim-embed--nohero");

      host.innerHTML =
        '<div class="sim-loading"><div class="spinner"></div>' +
        "<div>Loading simulation…</div></div>";

      var disposed = false;
      var mounted = null; // whatever the sim's mount returns (may expose destroy)

      function run(mod) {
        if (disposed) return;
        host.innerHTML = "";
        try {
          if (mod && typeof mod.mount === "function") {
            mounted = mod.mount(host);
          } else {
            SimBridge._err(host, simFile, "module has no mount()");
          }
        } catch (e) {
          console.error("Sim mount error:", simFile, e);
          SimBridge._err(host, simFile, e && e.message);
        }
      }

      if (cache[simFile]) {
        run(cache[simFile]);
      } else {
        import("../../" + simFile.replace(/^sims\//, "sims/"))
          // NOTE: import() in a classic script resolves relative to the
          // document base URL (db-lab/), so pass the page-relative path.
          .then(function (mod) { cache[simFile] = mod; run(mod); })
          .catch(function (e) {
            // Retry with a page-relative specifier (base-URL form).
            import(new URL(simFile, document.baseURI).href)
              .then(function (mod) { cache[simFile] = mod; run(mod); })
              .catch(function (e2) {
                console.error("Sim import failed:", simFile, e, e2);
                SimBridge._err(host, simFile, "failed to load module");
              });
          });
      }

      return function teardown() {
        disposed = true;
        try {
          if (mounted && typeof mounted.destroy === "function") mounted.destroy();
        } catch (e) { /* ignore */ }
        host.innerHTML = "";
      };
    },

    _err: function (host, simFile, msg) {
      host.innerHTML =
        '<div class="placeholder"><div class="placeholder-icon">⚠️</div>' +
        "<div>Couldn't load simulation <code>" +
        (simFile || "") + "</code>" + (msg ? " — " + msg : "") + ".</div></div>";
    },
  };

  DL.SimBridge = SimBridge;
})();
