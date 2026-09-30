/* ============================================================
   Caching Module — Result Cache, Local Disk Cache, Metadata Cache
   Three-tier animation showing Netflix query lifecycle
   ============================================================ */

(function () {
  'use strict';

  const AE = () => window.SnowflakeViz.AnimationEngine;

  const CachingModule = {
    render(canvas) {
      canvas.innerHTML = '';

      const wrap = _el('div', 'cache-page');
      canvas.appendChild(wrap);

      const hdr = _el('div', 'mod-header');
      hdr.innerHTML = `
        <div class="mod-eyebrow">Query &amp; Data</div>
        <h1 class="mod-title">Caching Architecture</h1>
        <p class="mod-subtitle">Snowflake's three-tier cache eliminates redundant compute for Netflix's 2M+ daily queries — serving most repeated queries in milliseconds at zero warehouse cost.</p>`;
      wrap.appendChild(hdr);

      const layout = _el('div', 'cache-layout');
      wrap.appendChild(layout);

      const left  = _el('div', 'cache-left');
      const right = _el('div', 'cache-right');
      layout.appendChild(left);
      layout.appendChild(right);

      /* ── Cache tier diagram ── */
      const TIERS = [
        {
          id: 'result',
          icon: '⚡',
          name: 'Result Cache',
          layer: 'Cloud Services Layer',
          color: '#a371f7',
          detail: 'Stores final query results. Identical queries return instantly — no warehouse compute used. Shared across all users in the account.',
          metrics: ['0 credits consumed', '&lt; 5ms response', 'TTL: 24 hrs', 'Account-wide'],
        },
        {
          id: 'local',
          icon: '💾',
          name: 'Local Disk Cache',
          layer: 'Virtual Warehouse (SSD)',
          color: '#29b5e8',
          detail: 'Each warehouse node caches remote micro-partition files on local SSD after first read. Repeat scans of the same data skip remote storage entirely.',
          metrics: ['SSD-speed reads', 'Per-warehouse', 'Evicts on suspend'],
        },
        {
          id: 'metadata',
          icon: '🗂️',
          name: 'Metadata Cache',
          layer: 'Cloud Services Layer',
          color: '#3fb950',
          detail: 'Partition min/max statistics, table schemas, and object metadata always cached in Cloud Services memory — enables partition pruning with zero I/O.',
          metrics: ['Always in-memory', 'Enables pruning', 'Zero I/O cost'],
        },
      ];

      const tiersTitle = _el('div', 'partition-section-title');
      tiersTitle.textContent = 'Cache Tier Stack — L1 → L2 → Remote Storage';
      left.appendChild(tiersTitle);

      TIERS.forEach((t, idx) => {
        const tier = _el('div', 'cache-tier');
        tier.id = `cache-tier-${t.id}`;
        tier.style.setProperty('--tier-color', t.color);
        tier.innerHTML = `
          <div class="cache-tier-header">
            <div class="cache-tier-icon">${t.icon}</div>
            <div class="cache-tier-info">
              <div class="cache-tier-name">${t.name}</div>
              <div class="cache-tier-layer">${t.layer}</div>
            </div>
            <div class="cache-tier-badge" style="background:${t.color}20;border-color:${t.color};color:${t.color}">L${idx + 1}</div>
          </div>
          <div class="cache-tier-detail">${t.detail}</div>
          <div class="cache-tier-chips">${t.metrics.map(m => `<span class="cache-tier-chip">${m}</span>`).join('')}</div>
          <div class="cache-hit-bar" id="cache-hit-${t.id}"></div>`;
        left.appendChild(tier);

        if (idx < TIERS.length - 1) {
          const arr = _el('div', 'cache-tier-arrow');
          arr.textContent = '↓ Miss falls through';
          left.appendChild(arr);
        }
      });

      /* ── Query lifecycle timeline ── */
      const tlTitle = _el('div', 'partition-section-title');
      tlTitle.style.marginTop = '1.75rem';
      tlTitle.textContent = 'Query Lifecycle — Netflix Recommendation Query';
      left.appendChild(tlTitle);

      const timeline = _el('div', 'cache-timeline');
      timeline.id = 'cache-timeline';
      [
        { id: 'q-submit',  label: 'Query submitted to Cloud Services' },
        { id: 'q-meta',    label: 'Result Cache checked' },
        { id: 'q-wh',      label: 'Warehouse activated (on miss)' },
        { id: 'q-local',   label: 'Local Disk Cache checked' },
        { id: 'q-remote',  label: 'Remote storage read (on miss)' },
        { id: 'q-store',   label: 'Results written to cache & returned' },
      ].forEach(s => {
        const row = _el('div', 'cache-tl-row');
        row.id = `tl-${s.id}`;
        row.innerHTML = `<div class="cache-tl-dot"></div><span class="cache-tl-label">${s.label}</span><span class="cache-tl-dur" id="tl-dur-${s.id}"></span>`;
        timeline.appendChild(row);
      });
      left.appendChild(timeline);

      /* ── Right: info panel ── */
      const panel = _el('div', 'anim-panel');
      panel.id = 'cache-panel';
      panel.innerHTML = `
        <div class="anim-panel-step-num" id="cpanel-step">Overview</div>
        <div class="anim-panel-title"    id="cpanel-title">Three-Tier Caching</div>
        <div class="anim-panel-body"     id="cpanel-body">Press Play to see how Snowflake's cache tiers serve Netflix's 2M+ daily queries — most at zero compute cost.</div>
        <div class="anim-panel-facts"    id="cpanel-facts"></div>`;
      right.appendChild(panel);

      /* ── Stats grid ── */
      const statsTitle = _el('div', 'partition-section-title');
      statsTitle.style.marginTop = '1.5rem';
      statsTitle.textContent = 'Cache Impact — Netflix Scale';
      right.appendChild(statsTitle);

      const stats = _el('div', 'cache-stats');
      stats.id = 'cache-stats';
      stats.innerHTML = `
        <div class="cache-stat-card"><div class="cache-stat-val" id="cs-hits">—</div><div class="cache-stat-lbl">Result Cache Hits/day</div></div>
        <div class="cache-stat-card"><div class="cache-stat-val" id="cs-credits">—</div><div class="cache-stat-lbl">Credits Saved/day</div></div>
        <div class="cache-stat-card"><div class="cache-stat-val" id="cs-latency">—</div><div class="cache-stat-lbl">P50 Latency (cached)</div></div>`;
      right.appendChild(stats);

      /* ── Fact card ── */
      const factCard = _el('div', 'cache-fact-card');
      factCard.innerHTML = `
        <div class="cache-fact-label">Netflix Caching Impact</div>
        <div class="cache-fact-body">Netflix's nightly recommendation batch runs 2,000+ warehouse queries. Result Cache serves ~85% of identical sub-queries from 10 parallel warehouse clusters — saving an estimated $4,800/day in compute credits. Local Disk Cache cuts average query latency from 45s to 8s for warm workloads.</div>`;
      right.appendChild(factCard);

      /* ── Engine ── */
      const ctx = { container: canvas, panel };
      const engine = new (AE())({ steps: _buildSteps(ctx), speed: 1 });
      engine.setContext(ctx);
      window.SnowflakeViz.AnimationControls.register(engine);

      return { destroy: () => engine.destroy() };
    },
  };

  /* ── Step helpers ── */
  function _setPanel(ctx, step, title, body, facts = []) {
    const p = ctx.panel;
    if (!p) return;
    p.querySelector('#cpanel-step').textContent  = step;
    p.querySelector('#cpanel-title').textContent = title;
    p.querySelector('#cpanel-body').innerHTML    = body;
    p.querySelector('#cpanel-facts').innerHTML   = facts.map(f => `<div class="anim-panel-fact">${f}</div>`).join('');
    p.classList.add('highlighted');
  }

  function _resetAll(ctx) {
    ctx.container.querySelectorAll('.cache-tier').forEach(el => el.classList.remove('tier-active', 'tier-hit', 'tier-miss'));
    ctx.container.querySelectorAll('.cache-hit-bar').forEach(el => { el.className = 'cache-hit-bar'; el.textContent = ''; });
    ctx.container.querySelectorAll('.cache-tl-row').forEach(el => el.classList.remove('tl-active', 'tl-done'));
    ctx.container.querySelectorAll('[id^="tl-dur-"]').forEach(el => { el.textContent = ''; });
    ctx.panel?.classList.remove('highlighted');
  }

  function _tier(ctx, id, state) {
    const el = ctx.container.querySelector(`#cache-tier-${id}`);
    if (!el) return;
    el.classList.remove('tier-active', 'tier-hit', 'tier-miss');
    el.classList.add('tier-active', `tier-${state}`);
    const bar = el.querySelector('.cache-hit-bar');
    if (bar) {
      bar.className = `cache-hit-bar ${state}`;
      bar.textContent = state === 'hit' ? '✓ CACHE HIT — served instantly' : '✗ CACHE MISS — falling through';
    }
  }

  function _tl(ctx, id, dur, done) {
    const el = ctx.container.querySelector(`#tl-${id}`);
    if (!el) return;
    el.classList.remove('tl-active', 'tl-done');
    el.classList.add(done ? 'tl-done' : 'tl-active');
    const d = el.querySelector(`#tl-dur-${id}`);
    if (d && dur) d.textContent = dur;
  }

  function _stats(ctx, hits, credits, latency) {
    const s = (id, v) => { const e = ctx.container.querySelector('#' + id); if (e) e.textContent = v; };
    s('cs-hits', hits);
    s('cs-credits', credits);
    s('cs-latency', latency);
  }

  function _buildSteps(ctx) {
    const F = AE().fnStep;
    return [
      F('Cache Overview', 'Three tiers, three latency profiles',
        c => {
          _resetAll(c);
          _setPanel(c, 'Step 1 of 8', 'Three-Tier Caching Architecture',
            'Snowflake uses three cache layers. Each tier prevents redundant work for lower tiers. Netflix sees 85%+ of recommendation queries served from Result Cache — never touching a warehouse.',
            [
              'L1 Result Cache: Cloud Services, account-wide, 24h TTL, 0 credits',
              'L2 Local Disk Cache: SSD on each warehouse node, evicts on suspend',
              'Metadata Cache: always-warm partition stats for zero-I/O pruning',
            ]);
        }, _resetAll, 3000),

      F('Query Submitted', 'Netflix recommendation query arrives',
        c => {
          _resetAll(c);
          _tl(c, 'q-submit', '< 1ms', false);
          _setPanel(c, 'Step 2 of 8', 'Query Arrives at Cloud Services',
            'The Netflix Data Science team submits: SELECT user_id, APPROX_TOP_K(genre, 5) FROM EVENTS_DB.RAW.WATCH_EVENTS WHERE watch_date >= DATEADD(day,-30,CURRENT_DATE) GROUP BY user_id. Cloud Services intercepts first — before any warehouse is involved.',
            [
              'Cloud Services normalizes & hashes the SQL for cache lookup',
              '~2M queries/day at Netflix — most are repeated aggregations',
              'Cache lookup is free: no warehouse credits, < 1ms overhead',
              'Query hash includes: SQL text + session params (role, database, warehouse)',
            ]);
        }, _resetAll, 3500),

      F('Result Cache HIT', 'Identical query was run 4 hours ago',
        c => {
          _resetAll(c);
          _tl(c, 'q-submit', '< 1ms', true);
          _tl(c, 'q-meta', '2ms', false);
          _tier(c, 'result', 'hit');
          _stats(c, '1.2M', '~$4,800', '2ms');
          _setPanel(c, 'Step 3 of 8', 'Result Cache HIT — Zero Compute Credits',
            'Cloud Services finds an exact match. The result set from 4 hours ago is returned immediately. No warehouse activates, no credits consumed. The user gets their result in 2ms.',
            [
              '✓ Result Cache HIT — exact query + params match found',
              '0 credits used — Cloud Services serves the cached result',
              '2ms total latency vs. ~45s for a fresh full scan',
              'Netflix saves ~$4,800/day from recommendation query cache hits alone',
            ]);
        }, _resetAll, 4000),

      F('Result Cache MISS', 'Table updated — cache invalidated',
        c => {
          _resetAll(c);
          _tl(c, 'q-submit', '< 1ms', true);
          _tl(c, 'q-meta', '3ms', false);
          _tier(c, 'result', 'miss');
          _setPanel(c, 'Step 4 of 8', 'Result Cache MISS — DML Invalidated Entry',
            'WATCH_EVENTS was loaded by Snowpipe 2 hours ago with new data. Any DML on a table automatically purges its Result Cache entries. Cloud Services falls through — ANALYTICS_WH must process the query.',
            [
              '✗ Result Cache MISS — Snowpipe DML invalidated the entry',
              'Any INSERT/UPDATE/DELETE/MERGE on a table clears Result Cache for that table',
              'ANALYTICS_WH (XL, 4 clusters) will be activated next',
              'Local Disk Cache checked first — warehouse SSD may already have the data',
            ]);
        }, _resetAll, 4000),

      F('Warehouse Activation', 'ANALYTICS_WH resumes from suspension',
        c => {
          _resetAll(c);
          _tl(c, 'q-submit', '< 1ms', true);
          _tl(c, 'q-meta',   '3ms',   true);
          _tl(c, 'q-wh',     '~5s',   false);
          _tier(c, 'result', 'miss');
          _setPanel(c, 'Step 5 of 8', 'ANALYTICS_WH Resumes — ~5 Second Cold Start',
            'The warehouse was suspended (auto-suspend after 10 minutes idle). Resume takes ~5 seconds. Nodes check their local SSD buffers immediately — warm data from earlier sessions may be present.',
            [
              'ANALYTICS_WH XL: 16 worker nodes across 4 clusters',
              'Suspend-resume: ~5s resume time, billed 60s minimum per resume',
              'Each node has 200 GB SSD for local disk cache',
              'Local cache survives across queries but evicts on warehouse suspend',
            ]);
        }, _resetAll, 3500),

      F('Local Disk Cache HIT', 'Partition files still on SSD from 25 min ago',
        c => {
          _resetAll(c);
          _tl(c, 'q-submit', '< 1ms', true);
          _tl(c, 'q-meta',   '3ms',   true);
          _tl(c, 'q-wh',     '~5s',   true);
          _tl(c, 'q-local',  '~200ms', false);
          _tier(c, 'result', 'miss');
          _tier(c, 'local',  'hit');
          _setPanel(c, 'Step 6 of 8', 'Local Disk Cache HIT — SSD Speed',
            'The WATCH_EVENTS partition files are still cached on warehouse SSD from a run 25 minutes ago. Worker nodes read at ~500 MB/s (SSD) rather than waiting for S3 (~50 MB/s). Query completes in ~8s vs. ~45s cold.',
            [
              '✓ Local Disk Cache HIT — partition files cached on SSD',
              'SSD read: ~200ms vs. S3 fetch: ~3-5s for same data block',
              'Netflix: ~80% of warehouse queries hit local cache within 60 min',
              'Cache invalidated when warehouse suspends or node is recycled',
            ]);
        }, _resetAll, 4000),

      F('Remote Storage Read', 'Cold start — files fetched from S3',
        c => {
          _resetAll(c);
          _tl(c, 'q-submit', '< 1ms', true);
          _tl(c, 'q-meta',   '3ms',   true);
          _tl(c, 'q-wh',     '~5s',   true);
          _tl(c, 'q-local',  'miss',  true);
          _tl(c, 'q-remote', '~4.2s', false);
          _tier(c, 'result',   'miss');
          _tier(c, 'local',    'miss');
          _tier(c, 'metadata', 'hit');
          _setPanel(c, 'Step 7 of 8', 'Remote Storage Read — Metadata Cache Guides Pruning',
            'Local cache missed (warehouse resumed cold). Nodes fetch from S3. Metadata Cache provides partition min/max stats — 73% of partitions pruned before any S3 call is made.',
            [
              '✗ Local Disk Cache MISS — warehouse resumed cold, SSD empty',
              '✓ Metadata Cache HIT — partition stats always in Cloud Services memory',
              'Pruning: 73% of partitions eliminated before S3 fetches',
              'Only 27% of data (surviving partitions) actually read from S3',
            ]);
        }, _resetAll, 4000),

      F('Results Cached & Returned', 'Result stored for 24h — next run is free',
        c => {
          _resetAll(c);
          _tl(c, 'q-submit', '< 1ms', true);
          _tl(c, 'q-meta',   '3ms',   true);
          _tl(c, 'q-wh',     '~5s',   true);
          _tl(c, 'q-local',  'miss',  true);
          _tl(c, 'q-remote', '~4.2s', true);
          _tl(c, 'q-store',  '< 1ms', false);
          _tier(c, 'result', 'hit');
          _stats(c, '1.2M+', '~$4,800', '2ms avg');
          _setPanel(c, 'Step 8 of 8', 'Results Written to Cache — 24h TTL',
            'Query complete. Results written to Result Cache with 24h TTL. Partition files now on local SSD. The next 10 downstream dashboard queries that run the same aggregation return instantly at zero credit cost.',
            [
              'Result Cache entry created — 24h TTL, visible account-wide',
              'Partition files now on local SSD — subsequent queries use local cache',
              '10 downstream dashboards will HIT Result Cache — 0 credits each',
              'Netflix pattern: first run each day uses compute; rest are cache hits',
            ]);
        }, _resetAll, 4000),
    ];
  }

  function _el(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.caching = CachingModule;
})();
