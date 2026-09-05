/*
 * pyrun.js — optional in-browser Python execution for the Python-for-DSA lab.
 * Pyodide (CPython compiled to WASM) is downloaded lazily on the FIRST run only,
 * so it never affects initial page load. Execution is sandboxed in the WASM
 * runtime (no filesystem/network access to the host). If the CDN is unreachable
 * the Run button degrades to a clear message instead of breaking.
 */
(function () {
  var PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
  var loadingPromise = null;

  function load() {
    if (loadingPromise) return loadingPromise;
    loadingPromise = new Promise(function (resolve, reject) {
      if (window.loadPyodide) { window.loadPyodide({ indexURL: PYODIDE_URL }).then(resolve, reject); return; }
      var s = document.createElement("script");
      s.src = PYODIDE_URL + "pyodide.js";
      s.onload = function () {
        if (!window.loadPyodide) { reject(new Error("Python runtime failed to initialise.")); return; }
        window.loadPyodide({ indexURL: PYODIDE_URL }).then(resolve, reject);
      };
      s.onerror = function () { loadingPromise = null; reject(new Error("Couldn't download the Python runtime (network may be blocked).")); };
      document.head.appendChild(s);
    });
    return loadingPromise;
  }

  function run(code, outEl, btn) {
    outEl.hidden = false;
    outEl.className = "run-out loading";
    outEl.textContent = window.loadPyodide && loadingPromise
      ? "Running…"
      : "Loading Python… (first run downloads the runtime once — a few seconds)";
    if (btn) btn.disabled = true;

    load().then(function (py) {
      outEl.textContent = "Running…";
      var out = "", err = null;
      try {
        py.runPython("import sys, io\n__saved = sys.stdout\nsys.stdout = io.StringIO()");
        py.runPython(code);
        out = py.runPython("sys.stdout.getvalue()");
      } catch (e) {
        err = e;
      } finally {
        try { py.runPython("sys.stdout = __saved"); } catch (e2) {}
      }
      if (btn) btn.disabled = false;
      if (err) {
        outEl.className = "run-out error";
        var msg = String((err && err.message) || err);
        // show the last few lines of the traceback (the useful part)
        outEl.textContent = msg.split("\n").filter(function (l) { return l.trim(); }).slice(-6).join("\n");
      } else {
        outEl.className = "run-out ok";
        outEl.textContent = (out && out.length) ? out : "(ran successfully — no output; add print(...) to see values)";
      }
    }, function (e) {
      if (btn) btn.disabled = false;
      outEl.className = "run-out error";
      outEl.textContent = (e && e.message) || "Python runtime unavailable.";
    });
  }

  window.PYRUN = { run: run, preload: load };
})();
