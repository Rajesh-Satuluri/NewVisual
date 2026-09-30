/* ============================================================
   Home Module — landing page
   ============================================================ */

(function () {
  'use strict';

  const D = () => window.IcebergViz.Data;

  const mod = {
    id: 'home',
    title: 'Home',
    group: 'foundations',
    _cleanups: [],

    render(container) {
      container.innerHTML = '';
      container.className = '';

      const page = document.createElement('div');
      page.className = 'home-page page-enter';
      page.innerHTML = _buildHTML();
      container.appendChild(page);

      _wireInteractions(page, this._cleanups);
      _animateCounters(page);
    },

    destroy() {
      this._cleanups.forEach(fn => fn && fn());
      this._cleanups = [];
      window.IcebergViz.AnimationControls.hide();
    },
  };

  /* ── HTML ──────────────────────────────────────────────── */
  function _buildHTML() {
    const stats = D().shopkart.stats;
    return `
<style>
.home-page {
  overflow-y: auto;
  height: 100%;
}

/* Hero */
.home-hero {
  background: linear-gradient(180deg, var(--bg-0) 0%, var(--bg-1) 100%);
  padding: 72px var(--space-8) 56px;
  text-align: center;
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--border-default);
}

.home-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(74,174,255,0.07) 0%, transparent 70%);
  pointer-events: none;
}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 14px;
  background: var(--blue-subtle);
  border: 1px solid rgba(88,166,255,0.2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--blue);
  margin-bottom: var(--space-5);
}

.hero-logo-wrap {
  margin-bottom: var(--space-5);
}

.hero-logo-svg {
  display: inline-block;
}

.hero-title {
  font-size: clamp(32px, 5vw, 56px);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: var(--space-5);
  line-height: 1.1;
  color: var(--text-primary);
}

.hero-subtitle {
  font-size: clamp(var(--text-base), 1.8vw, var(--text-xl));
  color: var(--text-secondary);
  max-width: 580px;
  margin: 0 auto var(--space-8);
  line-height: var(--leading-relaxed);
}

.hero-cta-row {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: var(--space-10);
}

/* ShopKart Stats */
.stats-banner {
  display: flex;
  justify-content: center;
  gap: var(--space-6);
  flex-wrap: wrap;
}

.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stats-value {
  font-size: var(--text-3xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.stats-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stats-div {
  width: 1px;
  background: var(--border-default);
  align-self: stretch;
  margin: 4px 0;
}

/* Sections */
.home-section {
  padding: var(--space-12) var(--space-8);
  max-width: 1200px;
  margin: 0 auto;
}

.home-section-header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.home-section-label {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--orange);
  margin-bottom: var(--space-2);
}

.home-section-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-3);
}

.home-section-desc {
  font-size: var(--text-base);
  color: var(--text-secondary);
  max-width: 520px;
  margin: 0 auto;
}

/* Feature cards grid */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

/* Learning path */
.learning-path {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-3);
}

.path-card {
  background: var(--bg-2);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  cursor: pointer;
  transition: border-color var(--ease-base), transform var(--ease-base), box-shadow var(--ease-base);
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.path-card:hover {
  border-color: var(--border-muted);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.path-card.coming-soon {
  opacity: 0.45;
  cursor: default;
}

.path-card.coming-soon:hover { transform: none; box-shadow: none; }

.path-num {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 2px;
}

.path-info-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.path-info-desc {
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.4;
}

/* Incident strip */
.incident-strip {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.incident-card {
  background: var(--bg-2);
  border: 1px solid var(--border-default);
  border-left: 3px solid var(--red);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  padding: var(--space-4) var(--space-5);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-4);
}

.incident-id {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--red);
  font-weight: 600;
  white-space: nowrap;
}

.incident-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.incident-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.incident-resolution {
  font-size: var(--text-xs);
  color: var(--green);
  text-align: right;
  max-width: 200px;
  line-height: 1.4;
}

/* Footer */
.home-footer {
  padding: var(--space-8);
  text-align: center;
  border-top: 1px solid var(--border-default);
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>

<!-- Hero -->
<div class="home-hero hero-enter">
  <div class="hero-eyebrow">
    <span>🏔</span>
    <span>Interactive Learning Platform</span>
  </div>

  <div class="hero-logo-wrap">
    ${_logoSVG()}
  </div>

  <h1 class="hero-title">
    Master Apache Iceberg
    <br><span class="gradient-text">Visually</span>
  </h1>

  <p class="hero-subtitle">
    An interactive, animation-driven platform that teaches Apache Iceberg
    from metadata internals to production architecture — through the lens of
    the ShopKart Global E-Commerce Lakehouse.
  </p>

  <div class="hero-cta-row">
    <button class="btn btn-primary btn-xl" data-nav="architecture">
      ${_iconPlay()} Start Learning
    </button>
    <button class="btn btn-secondary btn-xl" data-nav="why-iceberg">
      Why Iceberg?
    </button>
  </div>

  <!-- Stats banner -->
  <div class="stats-banner">
    <div class="stats-item">
      <div class="stats-value gradient-text" data-count="50" data-suffix="M">0</div>
      <div class="stats-label">Daily Customers</div>
    </div>
    <div class="stats-div"></div>
    <div class="stats-item">
      <div class="stats-value gradient-text-warm" data-count="20" data-suffix="M">0</div>
      <div class="stats-label">Orders / Day</div>
    </div>
    <div class="stats-div"></div>
    <div class="stats-item">
      <div class="stats-value" style="color:var(--green)" data-count="8" data-suffix=" TB">0</div>
      <div class="stats-label">New Data / Day</div>
    </div>
    <div class="stats-div"></div>
    <div class="stats-item">
      <div class="stats-value" style="color:var(--purple)" data-count="6" data-suffix=" PB">0</div>
      <div class="stats-label">Historical Data</div>
    </div>
    <div class="stats-div"></div>
    <div class="stats-item">
      <div class="stats-value" style="color:var(--yellow)" data-count="30">0</div>
      <div class="stats-label">Countries</div>
    </div>
  </div>
</div>

<!-- Features -->
<div class="home-section">
  <div class="home-section-header">
    <div class="home-section-label">What You'll Master</div>
    <h2 class="home-section-title">Every Iceberg Concept, Visualized</h2>
    <p class="home-section-desc">
      From metadata hierarchy to concurrency internals — every concept becomes
      interactive with step-by-step animations and real production examples.
    </p>
  </div>

  <div class="features-grid cards-enter">
    ${_featureCards()}
  </div>
</div>

<!-- Production Incidents -->
<div class="home-section" style="background: var(--bg-0); margin: 0; max-width: none; padding: var(--space-10) var(--space-8); border-top: 1px solid var(--border-default); border-bottom: 1px solid var(--border-default);">
<div style="max-width:1200px;margin:0 auto">
  <div class="home-section-header">
    <div class="home-section-label">ShopKart Production History</div>
    <h2 class="home-section-title">Five Real Incidents — Each Solved by Iceberg</h2>
    <p class="home-section-desc">
      These aren't hypothetical examples. These are the production failures that
      drove the entire data engineering team to migrate to Apache Iceberg.
    </p>
  </div>
  <div class="incident-strip">
    ${_incidentCards()}
  </div>
</div>
</div>

<!-- Learning Path -->
<div class="home-section">
  <div class="home-section-header">
    <div class="home-section-label">Curriculum</div>
    <h2 class="home-section-title">The Learning Path</h2>
    <p class="home-section-desc">
      Structured like a real senior engineering curriculum — from fundamentals
      to production architecture to interview mastery.
    </p>
  </div>
  <div class="learning-path cards-enter">
    ${_pathCards()}
  </div>
</div>

<!-- Footer -->
<div class="home-footer">
  Built on the Apache Iceberg Engineering Handbook &nbsp;·&nbsp; ShopKart Global E-Commerce Lakehouse &nbsp;·&nbsp;
  50M customers · 20M orders/day · 6 PB
</div>
`;
  }

  /* ── Feature Cards ─────────────────────────────────────── */
  function _featureCards() {
    const features = [
      { icon: '🏗', color: 'var(--blue)', bg: 'var(--blue-subtle)', title: 'Architecture Deep Dive', desc: 'Explore the complete metadata hierarchy: Catalog → metadata.json → manifest-list → manifest → data files with interactive diagrams.', nav: 'architecture' },
      { icon: '📋', color: 'var(--purple)', bg: 'var(--purple-subtle)', title: 'Metadata Explorer', desc: 'Navigate the real ShopKart S3 file tree. Read actual metadata.json, manifest-list.avro, and manifest files with syntax highlighting.', nav: 'metadata-explorer' },
      { icon: '⚡', color: 'var(--orange)', bg: 'var(--orange-subtle)', title: 'Write Operations', desc: 'Watch INSERT, UPDATE, DELETE, MERGE, and OVERWRITE operations create files, update manifests, and commit snapshots step by step.', nav: 'insert' },
      { icon: '🔍', color: 'var(--teal)', bg: 'var(--teal-subtle)', title: 'Query Planner', desc: 'See how predicate pushdown and manifest pruning eliminate 99.9% of data reads. 384 MB instead of 6 PB for the same query.', nav: 'query-planner' },
      { icon: '📸', color: 'var(--green)', bg: 'var(--green-subtle)', title: 'Snapshot Explorer', desc: 'Visualize the snapshot chain, time travel through history, roll back corrupted data, and manage branches and tags.', nav: 'snapshot-explorer' },
      { icon: '🔄', color: 'var(--yellow)', bg: 'var(--yellow-subtle)', title: 'Schema Evolution', desc: 'Evolve the ShopKart schema 6 times without ever rewriting a data file. Understand column IDs, safe operations, and what fails.', nav: 'schema-evolution' },
      { icon: '📦', color: 'var(--blue)', bg: 'var(--blue-subtle)', title: 'Hidden Partitioning', desc: 'See how partition transforms work, why users never write partition predicates, and how partition evolution changes strategy without migration.', nav: 'hidden-partitioning' },
      { icon: '⏱', color: 'var(--red)', bg: 'var(--red-subtle)', title: 'Time Travel', desc: 'Query any historical snapshot. Recover corrupted data with rollback_to_snapshot. Create compliance tags with 7-year retention.', nav: 'time-travel' },
      { icon: '⚔', color: 'var(--purple)', bg: 'var(--purple-subtle)', title: 'Concurrency Simulator', desc: 'Run two simultaneous writers and watch Iceberg\'s optimistic concurrency control either merge commits or detect conflicts.', nav: 'concurrency' },
      { icon: '🎓', color: 'var(--orange)', bg: 'var(--orange-subtle)', title: 'Interview Mode', desc: '200+ interview questions from FAANG, Databricks, Snowflake interviews — with full Iceberg answers drawn from handbook examples.', nav: 'interview' },
      { icon: '🏆', color: 'var(--green)', bg: 'var(--green-subtle)', title: 'Quiz Mode', desc: 'Test your knowledge with adaptive quizzes covering all Iceberg concepts. Track your progress from beginner to architect level.', nav: 'quiz' },
      { icon: '📄', color: 'var(--teal)', bg: 'var(--teal-subtle)', title: 'Cheat Sheets', desc: 'Dense reference cards for metadata structures, SQL syntax, partition transforms, and production troubleshooting patterns.', nav: 'cheatsheets' },
    ];
    return features.map(f => `
      <div class="feature-card" data-nav="${f.nav}" role="button" tabindex="0">
        <div class="feature-card-icon" style="background:${f.bg};color:${f.color}">${f.icon}</div>
        <div class="feature-card-title">${f.title}</div>
        <div class="feature-card-desc">${f.desc}</div>
      </div>
    `).join('');
  }

  /* ── Incident Cards ────────────────────────────────────── */
  function _incidentCards() {
    return D().shopkart.incidents.map(inc => `
      <div class="incident-card">
        <div class="incident-id">${inc.id}</div>
        <div>
          <div class="incident-title">${inc.title}</div>
          <div class="incident-desc">${inc.description}</div>
        </div>
        <div class="incident-resolution">✓ ${inc.resolution}</div>
      </div>
    `).join('');
  }

  /* ── Learning Path Cards ───────────────────────────────── */
  function _pathCards() {
    const path = [
      { num: '01', color: 'var(--blue)', bg: 'var(--blue-subtle)', title: 'Why Iceberg', desc: 'Problems with Hive, Delta, Hudi', nav: 'why-iceberg' },
      { num: '02', color: 'var(--blue)', bg: 'var(--blue-subtle)', title: 'Architecture', desc: 'Metadata hierarchy', nav: 'architecture' },
      { num: '03', color: 'var(--purple)', bg: 'var(--purple-subtle)', title: 'Metadata Explorer', desc: 'Files on S3', nav: 'metadata-explorer' },
      { num: '04', color: 'var(--purple)', bg: 'var(--purple-subtle)', title: 'Snapshot Explorer', desc: 'Snapshot chain & history', nav: 'snapshot-explorer', soon: true },
      { num: '05', color: 'var(--orange)', bg: 'var(--orange-subtle)', title: 'CREATE TABLE', desc: 'Files created, Glue call', nav: 'create-table', soon: true },
      { num: '06', color: 'var(--orange)', bg: 'var(--orange-subtle)', title: 'INSERT', desc: 'Write path, manifest commit', nav: 'insert', soon: true },
      { num: '07', color: 'var(--orange)', bg: 'var(--orange-subtle)', title: 'UPDATE / DELETE', desc: 'Position deletes, v2', nav: 'update', soon: true },
      { num: '08', color: 'var(--teal)', bg: 'var(--teal-subtle)', title: 'Read Path', desc: 'Catalog → data, I/O count', nav: 'read-path', soon: true },
      { num: '09', color: 'var(--teal)', bg: 'var(--teal-subtle)', title: 'Query Planner', desc: 'Manifest pruning, 16000x', nav: 'query-planner', soon: true },
      { num: '10', color: 'var(--green)', bg: 'var(--green-subtle)', title: 'Schema Evolution', desc: 'Column IDs, safe ops', nav: 'schema-evolution', soon: true },
      { num: '11', color: 'var(--green)', bg: 'var(--green-subtle)', title: 'Hidden Partitioning', desc: 'Transforms, evolution', nav: 'hidden-partitioning', soon: true },
      { num: '12', color: 'var(--red)', bg: 'var(--red-subtle)', title: 'Time Travel', desc: 'Rollback, tags, branches', nav: 'time-travel', soon: true },
      { num: '13', color: 'var(--yellow)', bg: 'var(--yellow-subtle)', title: 'Concurrency', desc: 'OCC, conflict resolution', nav: 'concurrency', soon: true },
      { num: '14', color: 'var(--purple)', bg: 'var(--purple-subtle)', title: 'Catalogs', desc: 'Glue, Nessie, REST', nav: 'catalog-explorer', soon: true },
      { num: '15', color: 'var(--orange)', bg: 'var(--orange-subtle)', title: 'Interview Mode', desc: '200+ FAANG questions', nav: 'interview', soon: true },
    ];
    return path.map(p => `
      <div class="path-card${p.soon ? ' coming-soon' : ''}" data-nav="${p.nav}">
        <div class="path-num" style="background:${p.bg};color:${p.color}">${p.num}</div>
        <div>
          <div class="path-info-title">${p.title}</div>
          <div class="path-info-desc">${p.desc}${p.soon ? ' <span style="color:var(--text-disabled)">(coming soon)</span>' : ''}</div>
        </div>
      </div>
    `).join('');
  }

  /* ── Wire Interactions ─────────────────────────────────── */
  function _wireInteractions(page, cleanups) {
    const handler = (e) => {
      const el = e.target.closest('[data-nav]');
      if (!el) return;
      const id = el.dataset.nav;
      if (id) window.IcebergViz.navigate(id);
    };
    page.addEventListener('click', handler);
    page.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') handler(e);
    });
    cleanups.push(() => page.removeEventListener('click', handler));
  }

  /* ── Counter Animation ─────────────────────────────────── */
  function _animateCounters(page) {
    const els = page.querySelectorAll('[data-count]');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        let start = 0;
        const step = target / 40;
        const t = setInterval(() => {
          start = Math.min(start + step, target);
          el.textContent = Math.round(start) + suffix;
          if (start >= target) clearInterval(t);
        }, 30);
        obs.unobserve(el);
      });
    }, { threshold: 0.5 });
    els.forEach(el => obs.observe(el));
  }

  /* ── Logo SVG ──────────────────────────────────────────── */
  function _logoSVG() {
    return `
<svg class="hero-logo-svg float-anim logo-glow" width="80" height="80" viewBox="0 0 80 80" fill="none">
  <defs>
    <linearGradient id="lg1" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#4aaeff"/>
      <stop offset="100%" stop-color="#a371f7"/>
    </linearGradient>
  </defs>
  <!-- Iceberg shape: visible tip + hidden mass below waterline -->
  <polygon points="40,4 68,34 12,34" fill="url(#lg1)" opacity="0.95"/>
  <line x1="5" y1="38" x2="75" y2="38" stroke="rgba(74,174,255,0.4)" stroke-width="1.5" stroke-dasharray="4 3"/>
  <polygon points="40,42 72,70 8,70" fill="url(#lg1)" opacity="0.35"/>
  <text x="40" y="77" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif"
    font-size="7" font-weight="700" letter-spacing="2" fill="rgba(74,174,255,0.6)">ICEBERG</text>
</svg>`;
  }

  function _iconPlay() {
    return `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><polygon points="5,3 19,12 5,21"/></svg>`;
  }

  /* ── Register ──────────────────────────────────────────── */
  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules.home = mod;
})();
