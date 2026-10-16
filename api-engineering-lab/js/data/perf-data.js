/* ============================================================
   perf-data.js — API Performance Lab content
   Latency components, caching layers, observability signals, SLOs.
   All timings are simulated and labeled as such.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  var latencyComponents = [
    { k: "client", label: "Client processing", base: 3, min: 0, max: 40 },
    { k: "network", label: "Network (round trip)", base: 35, min: 5, max: 300 },
    { k: "gateway", label: "Gateway", base: 6, min: 1, max: 50 },
    { k: "auth", label: "Authentication", base: 9, min: 1, max: 80 },
    { k: "app", label: "Application logic", base: 22, min: 2, max: 200 },
    { k: "db", label: "Database", base: 30, min: 2, max: 500 },
    { k: "deps", label: "External dependency", base: 25, min: 0, max: 800 },
    { k: "serialize", label: "Response serialization", base: 5, min: 1, max: 60 }
  ];

  var cacheLayers = [
    { k: "Browser cache", where: "In the user's browser", good: "Zero network for repeat views.", watch: "Hard to invalidate; respect Cache-Control." },
    { k: "CDN / edge", where: "Near the user, globally", good: "Absorbs huge read traffic for shared content.", watch: "Only for cacheable, non-personalized responses." },
    { k: "Reverse proxy", where: "In front of your app", good: "Caches hot responses close to the service.", watch: "Keep keys correct (vary on auth/locale)." },
    { k: "Application cache", where: "In the service (e.g. Redis)", good: "Caches computed results / hot objects.", watch: "Invalidation + staleness are your problem." },
    { k: "Database cache", where: "In the DB / query layer", good: "Speeds repeated queries + buffers.", watch: "Not a substitute for indexes or good queries." }
  ];

  var slos = [
    { k: "Availability", ex: "99.9% of requests succeed", note: "'Three nines' ≈ 43 min/month of error budget." },
    { k: "Latency (p95)", ex: "95% of requests < 300 ms", note: "Tail latency (p95/p99) matters more than the average." },
    { k: "Error rate", ex: "< 0.1% 5xx", note: "Separate client errors (4xx) from server errors (5xx)." },
    { k: "Error budget", ex: "the 0.1% you're allowed to fail", note: "Spend it on releases; freeze changes when it's exhausted." }
  ];

  AV.data.perf = { latencyComponents: latencyComponents, cacheLayers: cacheLayers, slos: slos };
})();
