/* ============================================================
   router.js — hash router with lazy module loading + lifecycle
   Modules self-register via DECICDViz.registerModule({...}).
   Each module: { id, title, fullWidth?, render(container), destroy() }
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.DECICDViz = window.DECICDViz || {});
  AV.modules = AV.modules || {};

  AV.registerModule = function (mod) {
    if (mod && mod.id) AV.modules[mod.id] = mod;
  };

  // ── Lazy <script> loader (one fetch per file, coalesced) ──
  var scriptState = {}; // src -> 'loading' | 'loaded' | 'error'
  var scriptWaiters = {}; // src -> [cb]

  function loadScript(src, cb) {
    if (scriptState[src] === "loaded") { cb(true); return; }
    if (scriptState[src] === "error") { cb(false); return; }
    (scriptWaiters[src] = scriptWaiters[src] || []).push(cb);
    if (scriptState[src] === "loading") return;
    scriptState[src] = "loading";
    var s = document.createElement("script");
    s.src = src;
    s.onload = function () { scriptState[src] = "loaded"; flush(src, true); };
    s.onerror = function () { scriptState[src] = "error"; flush(src, false); };
    document.body.appendChild(s);
  }
  function flush(src, ok) {
    var list = scriptWaiters[src] || [];
    scriptWaiters[src] = [];
    list.forEach(function (cb) { cb(ok); });
  }

  function Router(opts) {
    opts = opts || {};
    this.routes = opts.routes || {};
    this.container = opts.container;
    this.defaultRoute = opts.defaultRoute || "home";
    this.onRoute = opts.onRoute || function () {};
    this.current = null;
    this._bound = this._onHash.bind(this);
  }

  Router.prototype.start = function () {
    window.addEventListener("hashchange", this._bound);
    this._onHash();
  };

  Router.prototype._id = function () {
    var raw = (location.hash || "").replace(/^#/, "").trim();
    if (!raw) { AV.routeParam = ""; return this.defaultRoute; }
    // Support "#route/param" (e.g. #labs/gate-the-test) — first segment is
    // the route id, the rest is exposed as AV.routeParam for the module.
    var slash = raw.indexOf("/");
    if (slash === -1) { AV.routeParam = ""; return raw; }
    AV.routeParam = raw.slice(slash + 1);
    return raw.slice(0, slash);
  };

  Router.prototype._teardown = function () {
    if (this.current && typeof this.current.destroy === "function") {
      try { this.current.destroy(); } catch (e) { console.error("Module destroy error:", e); }
    }
    this.current = null;
    // Any active animation controls belong to the outgoing module.
    AV.activeControls = null;
  };

  Router.prototype._onHash = function () {
    var self = this;
    var id = this._id();
    this._teardown();
    this.onRoute(id);

    var route = this.routes[id];

    if (AV.modules[id]) { this._mount(AV.modules[id]); return; }

    if (route && route.ready) {
      this._renderLoading(route.title || id);
      loadScript("js/modules/" + id + ".js", function (ok) {
        if (self._id() !== id) return; // user navigated away while loading
        if (ok && AV.modules[id]) self._mount(AV.modules[id]);
        else self._renderError(id);
      });
      return;
    }

    this._renderComingSoon(id, route ? route.title : null);
  };

  Router.prototype._mount = function (mod) {
    var c = this.container;
    if (!c) return;
    c.innerHTML = "";
    c.className = "module-container" + (mod.fullWidth ? " full-width" : "");
    var canvas = document.getElementById("canvas");
    if (canvas) canvas.scrollTop = 0;
    try { mod.render(c); } catch (e) { console.error("Module render error:", e); }
    // Record the visit for the learning dashboard (local-only).
    if (AV.Progress && mod.id) { try { AV.Progress.visit(mod.id); } catch (e) {} }
    // Append the recurring e-commerce business example below concept
    // modules (no-op for modules without a lens entry).
    if (AV.BusinessLens) {
      try { AV.BusinessLens.append(c, mod.id); } catch (e) { console.error("BusinessLens error:", e); }
    }
    this.current = mod;
  };

  // ── Fallback screens ──────────────────────────────────────
  Router.prototype._title = function (id, title) {
    if (title) return title;
    return id.replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  };

  Router.prototype._renderLoading = function (title) {
    if (!this.container) return;
    this.container.className = "module-container";
    this.container.innerHTML =
      '<div class="placeholder"><div class="spinner"></div>' +
      '<div>Loading ' + this._title("", title) + "…</div></div>";
  };

  Router.prototype._renderComingSoon = function (id, title) {
    // No real route is unbuilt; this is the graceful not-found page
    // for an unknown hash (a stale link, a typo, a renamed route).
    if (!this.container) return;
    var t = this._title(id, title);
    this.container.className = "module-container";
    this.container.innerHTML =
      '<div class="module-header animate-fade-in-up">' +
        '<div class="module-eyebrow">Page not found</div>' +
        '<h1 class="module-title gradient-text">' + t + "</h1>" +
        '<p class="module-subtitle">There is no module at <code>#' + this._title(id, null).toLowerCase().replace(/\s+/g, "-") +
        "</code>. It may have been renamed or the link is out of date.</p>" +
      "</div>" +
      '<div class="callout tip animate-fade-in">' +
        '<span class="callout-icon">🧭</span>' +
        '<div class="callout-body">Try the <a href="#home">Home dashboard</a>, open ' +
        'search with <kbd>/</kbd>, or pick a topic from the sidebar.</div>' +
      "</div>";
  };

  Router.prototype._renderError = function (id) {
    if (!this.container) return;
    this.container.className = "module-container";
    this.container.innerHTML =
      '<div class="placeholder"><div class="placeholder-icon">⚠️</div>' +
      "<div>Couldn't load module <code>" + id + "</code>.</div>" +
      '<a class="btn btn-secondary" href="#home">Back to Home</a></div>';
  };

  AV.Router = Router;
})();
