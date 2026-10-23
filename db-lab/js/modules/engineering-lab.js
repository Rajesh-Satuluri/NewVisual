/* ============================================================
   engineering-lab.js — Route: #engineering-lab
   A focused hub for the ⚡ interactive labs: the kernel-backed
   simulators where you configure inputs and drive real state
   machines (vs. the Simulators grid, which lists every sim incl.
   guided walkthroughs). Each card opens the concept workspace.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}

  // What you actually drive in each kernel-backed lab.
  var DRIVE = {
    m47: "Issue writes, commit some, then <b>crash</b> the engine — and watch ARIES redo the committed work and undo the rest. Toggle steal / no-force and checkpoint timing.",
    m36: "Insert and delete keys and watch nodes <b>split, borrow and merge</b>. Every operation re-checks the balance, occupancy and separator-key invariants.",
    m30: "Request pages under <b>LRU, FIFO or CLOCK</b>; watch victims get chosen and dirty pages written back, and see the hit ratio move as you resize the pool.",
    m48: "Run concurrent transactions over row versions, take <b>snapshots</b>, and see exactly which version each transaction reads under first-updater-wins.",
    m17: "Change table sizes, selectivity and available indexes and watch the <b>cost model</b> pick access paths and join algorithms — and flip at the crossover points.",
    m41: "Put and delete keys, <b>flush</b> the memtable to SSTables and trigger <b>compaction</b>; then follow a read through the Bloom filters down the levels.",
    m63: "Elect a leader, replicate entries and <b>crash nodes</b>; see the election restriction and quorum-commit rule keep the committed log consistent.",
  };

  var Module = {
    id: "engineering-lab", title: "Engineering Lab", fullWidth: false,
    render: function (container) {
      var concepts = (DL.concepts || []).filter(function (c) {
        return (typeof DL.simTier === "function") && DL.simTier(c.id) === "interactive";
      });

      var html = '<div class="module-header animate-fade-in-up">' +
        '<div class="module-eyebrow">Engineering Lab</div>' +
        '<h1 class="module-title gradient-text">Engineering Lab</h1>' +
        '<p class="module-subtitle">' + concepts.length + ' hands-on labs backed by pure, tested simulation kernels. ' +
        'You set the inputs and drive the state machine — the picture renders the kernel’s <i>real</i> state, ' +
        'and every step re-checks the system’s invariants. No scripted animations here.</p></div>';

      // How these differ — honest framing.
      html += '<div class="callout el-callout"><div class="callout-body">' +
        '<b>⚡ Interactive lab vs. 🎬 guided walkthrough.</b> These ' + concepts.length +
        ' labs are driven by deterministic kernels in <code>sims/kernels/*.mjs</code> with their own test suites. ' +
        'The rest of the catalog is honest guided walkthroughs — play, pause and scrub authored steps. ' +
        'Browse everything on the <a href="#simulators">Simulators</a> grid.</div></div>';

      html += '<div class="el-grid">';
      concepts.forEach(function (c) {
        var drive = DRIVE[c.id] || esc(c.intuition || c.why || "Drive the simulation and inspect what changes at each step.");
        html += '<article class="el-card">' +
          '<div class="el-card-head">' +
            '<span class="el-card-icon" aria-hidden="true">' + (c.icon || "⚡") + '</span>' +
            '<div><h3 class="el-card-title">' + esc(c.title) + '</h3>' +
            '<span class="el-card-domain">' + esc(c.domain) + '</span></div>' +
            '<span class="sim-tier tier-interactive">⚡ interactive</span>' +
          '</div>' +
          '<p class="el-card-drive">' + drive + '</p>' +
          '<a class="btn btn-primary el-card-btn" href="#concept/' + c.slug + '">Open the lab →</a>' +
        '</article>';
      });
      html += '</div>';

      // Applied practice pointer.
      html += '<section class="el-applied"><h2>Then apply it</h2>' +
        '<p class="dash-sub">Take the mechanisms you just drove into a realistic setting:</p>' +
        '<div class="chip-row">' +
          '<a class="chip" href="#failure-lab">💥 Failure Lab — debug production incidents</a>' +
          '<a class="chip" href="#real-world">🛒 Real-World (ShopKart) — where each concept lives</a>' +
          '<a class="chip" href="#revision">🔁 Revision — check what you’ve mastered</a>' +
        '</div></section>';

      container.innerHTML = html;
      var canvas = document.getElementById("canvas"); if (canvas) canvas.scrollTop = 0;
    },
  };
  DL.registerModule(Module);
})();
