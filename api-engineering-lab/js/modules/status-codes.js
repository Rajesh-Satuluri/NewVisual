/* ============================================================
   modules/status-codes.js — Status Code Explorer
   Grid of status codes grouped by class; click to inspect when to
   use it, what the client should do, and the ShopSphere example.
   Filter by class; a focused 401-vs-403 comparison.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var CLASSES = [
    { k: "2xx", label: "2xx Success" },
    { k: "3xx", label: "3xx Redirect / cache" },
    { k: "4xx", label: "4xx Client error" },
    { k: "5xx", label: "5xx Server error" }
  ];

  var module = {
    id: "status-codes",
    title: "Status Code Explorer",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("beginner");
      var codes = AV.data.http.statusCodes;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Fundamentals</div>' +
          '<h1 class="module-title">Status codes tell the client what to do next</h1>' +
          '<p class="module-subtitle">A status code is a contract: it says what happened and what the caller should do. Getting them right is a product decision — the mobile app branches its whole UX on them. Click any code to inspect it.</p></div>' +

        '<div class="chiprow" id="sc-filter" style="margin-bottom:var(--space-4)">' +
          '<button class="chip active" data-k="all">All</button>' +
          CLASSES.map(function (c) { return '<button class="chip" data-k="' + c.k + '">' + c.label + "</button>"; }).join("") +
        "</div>" +

        '<div class="lab-2col wide-right">' +
          '<div id="sc-grid" class="sc-grid"></div>' +
          '<aside class="panel sticky-side" id="sc-detail"></aside>' +
        "</div>" +

        '<div class="callout warn" style="margin-top:var(--space-6)"><span class="callout-icon">🔐</span><div class="callout-body"><b>401 vs 403 — the classic mix-up.</b> <b>401 Unauthorized</b> really means <i>unauthenticated</i>: we don\'t know who you are (no/invalid/expired credentials) — fix the token and retry. <b>403 Forbidden</b> means we know exactly who you are, but you\'re not allowed — retrying with the same identity won\'t help.</div></div>';

      var grid = container.querySelector("#sc-grid");
      var detail = container.querySelector("#sc-detail");
      var filter = container.querySelector("#sc-filter");

      function cls(code) { return "st-" + Math.floor(code / 100) + "xx"; }
      function renderGrid(k) {
        grid.innerHTML = codes.filter(function (c) { return k === "all" || c.cls === k; }).map(function (c) {
          return '<button class="sc-chip ' + cls(c.code) + '" data-code="' + c.code + '"><span class="sc-code">' + c.code + '</span><span class="sc-text">' + AV.HttpSim.statusText(c.code) + "</span></button>";
        }).join("");
      }
      function show(code) {
        var c = null; for (var i = 0; i < codes.length; i++) if (codes[i].code === code) c = codes[i];
        if (!c) return;
        detail.innerHTML =
          '<div class="panel-title" style="display:flex;justify-content:space-between;align-items:center">' + c.code + " " + AV.HttpSim.statusText(c.code) + '<span class="status-pill ' + cls(c.code) + '">' + c.cls + "</span></div>" +
          '<dl class="kv"><dt>When to use</dt><dd>' + c.when + "</dd>" +
          "<dt>Client should</dt><dd>" + c.client + "</dd>" +
          "<dt>ShopSphere</dt><dd>" + c.biz + "</dd></dl>";
      }
      filter.addEventListener("click", function (e) {
        var b = e.target.closest(".chip"); if (!b) return;
        filter.querySelectorAll(".chip").forEach(function (x) { x.classList.toggle("active", x === b); });
        renderGrid(b.getAttribute("data-k"));
      });
      grid.addEventListener("click", function (e) {
        var b = e.target.closest(".sc-chip"); if (!b) return;
        grid.querySelectorAll(".sc-chip").forEach(function (x) { x.classList.toggle("selected", x === b); });
        show(parseInt(b.getAttribute("data-code"), 10));
      });

      renderGrid("all");
      detail.innerHTML = '<div class="panel-title">Pick a code</div><p>Select any status code to see when to use it, what the client should do, and how it shows up in ShopSphere.</p>';
    },
    destroy: function () {}
  };

  AV.registerModule(module);
})();
