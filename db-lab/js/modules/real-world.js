/* ============================================================
   real-world.js — Route: #real-world
   ShopKart: the fictional retailer every lab maps onto. Shows the
   stack service-by-service, the concepts each service exercises, and
   the production incident that can hit it — so the theory lands in a
   recognisable system. Incident cards reuse DBLab.incidents.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function pretty(slug){return String(slug).replace(/-/g," ").replace(/\b\w/g,function(m){return m.toUpperCase();});}

  // Curated architecture. Each service lists concept slugs it exercises
  // and (optionally) the id of the incident that can hit it.
  var STACK = [
    { icon:"🧾", name:"Order service", tech:"PostgreSQL 15 primary · OLTP",
      blurb:"Takes checkout writes and serves a customer’s order history. The hot path is point lookups plus a recent-orders scan.",
      concepts:["transactions","write-ahead-logging","isolation-levels","b-plus-tree","cost-based-optimization","index-scan"],
      incident:"slow-checkout" },
    { icon:"📦", name:"Inventory service", tech:"PostgreSQL primary · high-contention writes",
      blurb:"Decrements stock and warehouse aggregates under flash-sale load — two rows updated per order, by concurrent transactions.",
      concepts:["locking","isolation-levels","mvcc"],
      incident:"deadlock-storm" },
    { icon:"📝", name:"Events ingest", tech:"PostgreSQL · append-heavy pipeline",
      blurb:"Absorbs ~25k inserts/sec of clickstream + order events. Durability rides on the WAL; checkpoints flush the dirty pages.",
      concepts:["checkpoints","write-ahead-logging","buffer-pool"],
      incident:"checkpoint-stall" },
    { icon:"🔁", name:"Read replicas", tech:"3 async streaming replicas · read fan-out",
      blurb:"Serves read-heavy traffic (‘My Orders’, catalog) off the primary. Async apply means a replica can trail the primary.",
      concepts:["replication","eventual-consistency","cap-theorem","quorum"],
      incident:"replica-lag" },
    { icon:"🔎", name:"Search & analytics", tech:"LSM-based store · partitioned",
      blurb:"Full-text product search and reporting. Write-optimised LSM storage with leveled compaction, sharded by catalog range.",
      concepts:["lsm-tree","bloom-filter","partitioning"],
      incident:null },
    { icon:"🗳️", name:"Config & coordination", tech:"Raft-replicated metadata",
      blurb:"Leader election and strongly-consistent cluster metadata (feature flags, shard map) survive node failure via quorum commit.",
      concepts:["raft-consensus","leader-election","two-phase-commit"],
      incident:null },
  ];

  function conceptChips(slugs){
    return '<div class="chip-row">' + slugs.map(function(s){
      var c = DL.conceptBySlug ? DL.conceptBySlug[s] : null;
      var label = c ? ((c.icon?c.icon+" ":"") + esc(c.title)) : esc(pretty(s));
      return '<a class="chip" href="#concept/' + encodeURIComponent(s) + '">' + label + '</a>';
    }).join("") + '</div>';
  }

  var Module = {
    id: "real-world", title: "Real-World (ShopKart)", fullWidth: false,
    render: function (container) {
      var incidents = DL.incidents || [];
      var incById = {}; incidents.forEach(function(i){ incById[i.id]=i; });

      var html = '<div class="module-header animate-fade-in-up">' +
        '<div class="module-eyebrow">Real-World Systems</div>' +
        '<h1 class="module-title gradient-text">ShopKart</h1>' +
        '<p class="module-subtitle">Everything in this lab maps onto one recognisable system: ShopKart, a fictional online retailer. ' +
        'Here is its stack, the database concepts each service leans on, and the production incident that can take it down. ' +
        'Pick a concept to learn it, or jump into the incident to debug it.</p></div>';

      html += '<div class="callout rw-callout"><span class="callout-icon">🛒</span><div class="callout-body">' +
        '<b>Why a single system?</b> Isolated demos don’t stick. Tying WAL, locking, MVCC, ' +
        'checkpoints and replication to the <i>same</i> e-commerce stack shows how they interact — and why a feature change in one ' +
        'service becomes an incident in another.</div></div>';

      html += '<section class="rw-stack">';
      STACK.forEach(function(s){
        var inc = s.incident ? incById[s.incident] : null;
        html += '<article class="rw-card">' +
          '<div class="rw-card-head"><span class="rw-icon" aria-hidden="true">' + s.icon + '</span>' +
            '<div><h3 class="rw-name">' + esc(s.name) + '</h3><span class="rw-tech">' + esc(s.tech) + '</span></div></div>' +
          '<p class="rw-blurb">' + esc(s.blurb) + '</p>' +
          '<div class="rw-label">Concepts in play</div>' + conceptChips(s.concepts);
        if (inc) {
          html += '<div class="rw-incident"><span class="rw-sev">' + esc(inc.severity) + '</span>' +
            '<div class="rw-incident-body"><b>Incident:</b> ' + esc(inc.title) +
            '<a class="rw-incident-link" href="#failure-lab">Debug it in the Failure Lab →</a></div></div>';
        } else {
          html += '<div class="rw-incident rw-incident--clear">✓ No scripted incident — explore the concepts above.</div>';
        }
        html += '</article>';
      });
      html += '</section>';

      // All incidents at a glance.
      if (incidents.length) {
        html += '<section class="rw-sec"><h2>All ShopKart incidents</h2>' +
          '<p class="dash-sub">Evidence-driven debugging drills — investigate, diagnose, and choose a remediation that actually fixes the cause.</p>' +
          '<div class="chip-row">' + incidents.map(function(i){
            return '<a class="chip chip-warn" href="#failure-lab">' + esc(i.severity) + ' · ' + esc(i.title) + '</a>';
          }).join("") + '</div></section>';
      }

      container.innerHTML = html;
      var canvas = document.getElementById("canvas"); if (canvas) canvas.scrollTop = 0;
    },
  };
  DL.registerModule(Module);
})();
