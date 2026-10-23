/* ============================================================
   toast.js — one shared transient-message helper: AirflowViz.toast(msg)
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var host = null;
  function ensureHost() {
    if (!host) {
      host = document.createElement("div");
      host.className = "toast-host";
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    return host;
  }
  AV.toast = function (msg, opts) {
    opts = opts || {};
    var h = ensureHost();
    var t = document.createElement("div");
    t.className = "toast" + (opts.type ? " toast-" + opts.type : "");
    t.innerHTML = msg;
    h.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
    }, opts.duration || 3400);
  };
})();
