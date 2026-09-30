/* ============================================================
   Intro Module — Why Snowflake? Netflix context + key concepts
   ============================================================ */

(function () {
  'use strict';

  const IntroModule = {
    render(canvas, { data }) {
      const nd = data;
      canvas.innerHTML = '';

      const page = _el('div', 'mod-page');

      /* header */
      page.appendChild(_header(
        'Introduction',
        'Why Snowflake?',
        'Netflix streams to 238 million subscribers in 190 countries, ingests 1.4 billion watch events daily, and must serve engineers, data scientists, marketers, and executives — all at once, without fighting over compute.'
      ));

      /* challenges section */
      const chalSection = _el('div', 'mod-section');
      chalSection.innerHTML = `<div class="mod-section-title">The Challenge → The Solution</div>`;

      const challenges = [
        {
          label: 'Before',
          title: 'Compute & storage were coupled',
          body: 'Traditional data warehouses forced you to pay for idle compute to keep data attached. Netflix\'s catalog and watch data would require constant over-provisioning.',
        },
        {
          label: 'After',
          title: 'Separation of storage and compute',
          body: 'Snowflake stores data in S3/GCS/Azure independently. Warehouses spin up, run queries, then auto-suspend — Netflix pays only for seconds of actual compute.',
        },
        {
          label: 'Before',
          title: 'Warehouse contention across teams',
          body: 'A heavy ML training job from Data Science would slow down executive dashboards. Teams had to share — or buy duplicate hardware.',
        },
        {
          label: 'After',
          title: 'Per-team virtual warehouses',
          body: 'ML_TRAINING_WH, ANALYTICS_WH, EXEC_WH — each team gets isolated compute. One team\'s runaway query never affects another.',
        },
        {
          label: 'Before',
          title: 'Scanning 500B rows was prohibitive',
          body: 'Without partition metadata, any query on WATCH_EVENTS had to scan terabytes of data even for highly selective filters.',
        },
        {
          label: 'After',
          title: 'Micro-partition pruning skips 70–90%',
          body: 'Snowflake tracks min/max per column per partition. A WHERE WATCH_START > 2024-01-01 query skips years of historical partitions automatically.',
        },
        {
          label: 'Before',
          title: 'Data copies for EU compliance',
          body: 'GDPR required EU subscriber data to stay in EU. Maintaining separate, synchronized copies was operationally costly.',
        },
        {
          label: 'After',
          title: 'Multi-region accounts & data residency',
          body: 'PROD_EU_WEST runs in AWS eu-west-1. Same Snowflake interface, fully isolated data plane — GDPR compliant by design.',
        },
      ];

      const grid = _el('div', 'intro-challenge-grid');
      challenges.forEach(c => {
        const card = _el('div', `intro-challenge-card ${c.label === 'Before' ? 'before' : 'after'}`);
        card.innerHTML = `<div class="intro-challenge-tag">${c.label}</div>
          <div class="intro-challenge-title">${c.title}</div>
          <div class="intro-challenge-body">${c.body}</div>`;
        grid.appendChild(card);
      });
      chalSection.appendChild(grid);
      page.appendChild(chalSection);

      /* Netflix scale */
      const scaleSection = _el('div', 'mod-section');
      scaleSection.innerHTML = `<div class="mod-section-title">Netflix at Snowflake Scale</div>`;

      const kvData = [
        { key: 'Subscribers',          val: '238M',   sub: 'across 190 countries' },
        { key: 'Daily Watch Events',   val: '1.4B',   sub: 'rows/day ingested' },
        { key: 'Watch Events Table',   val: '500B',   sub: 'rows · 180 TB' },
        { key: 'Reco Scores Table',    val: '12B',    sub: 'rows · 22 TB' },
        { key: 'Snowflake Credits',    val: '2.5M',   sub: 'per month' },
        { key: 'Data Generated',       val: '40 TB',  sub: 'per day' },
      ];

      const kv = _el('div', 'intro-kv-grid');
      kvData.forEach(d => {
        const cell = _el('div', 'intro-kv');
        cell.innerHTML = `<div class="intro-kv-key">${d.key}</div>
          <div class="intro-kv-val">${d.val}</div>
          <div class="intro-kv-sub">${d.sub}</div>`;
        kv.appendChild(cell);
      });
      scaleSection.appendChild(kv);
      page.appendChild(scaleSection);

      /* virtual warehouse rundown */
      const whSection = _el('div', 'mod-section');
      whSection.innerHTML = `<div class="mod-section-title">Virtual Warehouse Strategy</div>`;
      const whInfo = _el('div', 'info-box');
      whInfo.innerHTML = `<strong>Key insight:</strong> each Netflix team owns a dedicated warehouse. A Data Science ML job consuming every cluster on <code>ML_TRAINING_WH</code> has zero impact on <code>EXEC_WH</code> running the CEO's dashboard — they share <em>storage</em> but never <em>compute</em>.`;
      whSection.appendChild(whInfo);

      if (nd && nd.warehouses) {
        const whGrid = _el('div', 'intro-challenge-grid');
        nd.warehouses.forEach(wh => {
          const card = _el('div', 'intro-challenge-card after');
          card.style.borderLeftColor = wh.color;
          card.innerHTML = `
            <div class="intro-challenge-tag" style="color:${wh.color}">${wh.team}</div>
            <div class="intro-challenge-title" style="font-family:var(--font-mono);font-size:.8125rem">${wh.name}</div>
            <div class="intro-challenge-body">${wh.size} · clusters ${wh.clusterMin}–${wh.clusterMax} · auto-suspend ${wh.autoSuspend}s<br><br>${wh.purpose}</div>`;
          whGrid.appendChild(card);
        });
        whSection.appendChild(whGrid);
      }
      page.appendChild(whSection);

      /* three-layer primer */
      const archSection = _el('div', 'mod-section');
      archSection.innerHTML = `<div class="mod-section-title">Three-Layer Architecture Primer</div>`;
      const timeline = _el('div', 'intro-timeline');
      const layers = [
        {
          label: 'Layer 1',
          heading: 'Cloud Services — the brain',
          body: 'Always-on: query optimizer, metadata store, authentication, access control, transactions. No virtual warehouse is needed for metadata queries — Netflix saves compute credits on every SHOW TABLES.',
        },
        {
          label: 'Layer 2',
          heading: 'Virtual Warehouses — the compute',
          body: 'Ephemeral clusters of EC2/VMs that execute SQL. Netflix runs five: INGEST (X-Large, 2–10 clusters), ANALYTICS (Large), ML_TRAINING (X-Large Snowpark), MARKETING (Medium), EXEC (Small). Each scales independently.',
        },
        {
          label: 'Layer 3',
          heading: 'Centralized Storage — the data',
          body: 'All data lives in Snowflake-managed S3/GCS/Azure as compressed columnar micro-partitions (~16MB each). Immutable, automatically organized by ingestion order, never touched directly by customers.',
        },
      ];
      layers.forEach(l => {
        const item = _el('div', 'intro-timeline-item');
        item.innerHTML = `<div class="intro-timeline-dot"></div>
          <div class="intro-timeline-label">${l.label}</div>
          <div class="intro-timeline-heading">${l.heading}</div>
          <div class="intro-timeline-body">${l.body}</div>`;
        timeline.appendChild(item);
      });
      archSection.appendChild(timeline);
      page.appendChild(archSection);

      canvas.appendChild(page);
      return {};
    },
  };

  function _header(eyebrow, title, subtitle) {
    const h = document.createElement('div');
    h.className = 'mod-header';
    h.innerHTML = `<div class="mod-eyebrow">${eyebrow}</div>
      <h1 class="mod-title">${title}</h1>
      <p class="mod-subtitle">${subtitle}</p>`;
    return h;
  }

  function _el(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.intro = IntroModule;
})();
