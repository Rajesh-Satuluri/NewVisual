import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'You join Amazon and discover 40 analysts each maintain their own SQL file for "revenue". How do you consolidate them?',
    a: `<ol>
      <li><strong>Audit phase:</strong> Run a SQL similarity tool (or grep) across all 40 files to cluster by JOIN patterns and metric definitions. Group into families: gross-revenue variants, net-revenue variants, refund-adjusted variants.</li>
      <li><strong>Define canonical versions:</strong> Align Finance, Revenue Accounting, and Business Intelligence on 2–3 official definitions (e.g., gross_revenue, net_revenue, recognized_revenue) with documented inclusion/exclusion rules.</li>
      <li><strong>Build dbt staging + mart models:</strong> Each canonical definition becomes a dbt model in the <code>marts/finance/</code> folder. All teams reference <code>ref('fct_revenue')</code> instead of re-writing the JOIN.</li>
      <li><strong>Deprecation plan:</strong> Replace the 40 files over 2–3 sprints. Use dbt exposures to track which dashboards consume which model, making it safe to deprecate old queries.</li>
      <li><strong>Governance:</strong> Block new dashboards from connecting directly to raw tables via a data catalog policy.</li>
    </ol>`,
    tip: 'Frame your answer around an audit-first approach. Saying "I\'d just rewrite them all in dbt" misses the discovery and alignment work that\'s 80% of the real effort.',
  },
  {
    q: 'What are the specific organizational and technical reasons that metrics drift apart in a multi-team data org?',
    a: `<strong>Organizational:</strong>
    <ul>
      <li>No central ownership of metric definitions — each team optimizes for their KPIs</li>
      <li>Siloed tooling: Marketing uses Looker, Finance uses Excel, Product uses Mode</li>
      <li>Incentive misalignment: Marketing wants big gross numbers, Finance wants conservative net numbers</li>
    </ul>
    <strong>Technical:</strong>
    <ul>
      <li>No shared transformation layer — each team writes SQL from raw tables</li>
      <li>Schema changes in source systems propagate silently</li>
      <li>Different timezone handling, fiscal year calendars, NULL treatment</li>
      <li>No automated tests to catch when two "revenue" queries return different totals</li>
    </ul>`,
    tip: 'Name both the organizational AND technical root causes. Interviewers at senior levels expect you to diagnose systemic issues, not just describe symptoms.',
  },
  {
    q: 'Amazon Prime runs thousands of dashboards across 20+ business units. Design a system that guarantees consistent "active subscriber" definitions.',
    a: `<ol>
      <li><strong>Single mart model:</strong> <code>dim_prime_subscriber</code> in dbt with one definition of "active" (e.g., paid subscription, within grace period, not refunded in last 30d). All dashboards JOIN to this model.</li>
      <li><strong>Semantic layer:</strong> Expose the model through a semantic layer (dbt Metrics, Cube.js) so BI tools consume pre-defined <code>active_subscribers</code> metric — no raw SQL possible.</li>
      <li><strong>dbt contracts:</strong> Use dbt model contracts to enforce column names and types. A PR that renames <code>is_active</code> to <code>active_flag</code> fails CI.</li>
      <li><strong>Cross-team dbt tests:</strong> Add a custom test that asserts total active subs from the mart matches Finance's billing system count within 0.1%. Runs nightly.</li>
      <li><strong>Ownership metadata:</strong> Tag the model with <code>owner: prime-data-team</code> in schema.yml. Any change requires a review from that team.</li>
    </ol>`,
    tip: 'Mention the semantic layer as the enforcement mechanism — knowing that dbt models alone don\'t prevent a BI analyst from writing raw SQL in Tableau is a senior-level insight.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M01 · Foundation',
    title: 'The Data Chaos',
    subtitle: 'Before dbt, every team wrote SQL independently. Watch what happens when six teams share a warehouse but nothing else.',
    tabs: [
      { id: 'visual', label: '🎬 Live Demo' },
      { id: 'detail', label: '📋 The Problem' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  const cleanup = buildVisual(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildVisual(container) {
  const tab = container.querySelector('#tab-visual');
  const wrap = document.createElement('div');
  wrap.className = 'canvas-wrap';

  const cv = document.createElement('canvas');
  cv.width = 820; cv.height = 420;
  cv.style.cssText = 'width:100%;max-width:820px';
  wrap.appendChild(cv);

  const ctrl = document.createElement('div');
  ctrl.className = 'canvas-controls';
  ctrl.innerHTML = `<button class="ctrl-btn" id="m01-reset">↺ Restart</button>
    <span class="ctrl-label">Watch SQL files multiply as each team works independently</span>`;
  wrap.appendChild(ctrl);
  tab.appendChild(wrap);

  const ctx = cv.getContext('2d');
  const W = 820, H = 420;

  const TABLES = ['raw_orders', 'raw_customers', 'raw_payments', 'raw_products', 'raw_events', 'raw_inventory'];
  const TEAMS = [
    { name: 'Marketing',   color: '#FF6B35' },
    { name: 'Finance',     color: '#4ECDC4' },
    { name: 'Operations',  color: '#45B7D1' },
    { name: 'Product',     color: '#96CEB4' },
    { name: 'ML / DS',     color: '#8B5CF6' },
    { name: 'Exec Board',  color: '#F59E0B' },
  ];
  const SQL = ['SELECT *', 'JOIN users', 'WHERE active', 'CASE WHEN', 'SUM(total)', 'GROUP BY', 'revenue =', 'COALESCE', 'DISTINCT', 'ORDER BY', 'COUNT(*)', 'cust_ltv'];

  let state;
  function init() {
    state = {
      time: 0, phase: 0,
      tableOp: TABLES.map(() => 0),
      teamOp: TEAMS.map(() => 0),
      particles: [], spawnT: 0,
    };
  }
  init();
  ctrl.querySelector('#m01-reset').addEventListener('click', init);

  const TBL_X = 22, TBL_W = 190, TBL_H = 36, TBL_Y0 = 90;
  const TEAM_X = 660;

  function tblCenter(i) { return { x: TBL_X + TBL_W, y: TBL_Y0 + i * TBL_H + TBL_H / 2 }; }
  function teamCenter(i) { return { x: TEAM_X + 22, y: 62 + i * 58 + 18 }; }

  function rr(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }

  let raf = null, lastT = 0;

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    state.time += dt;

    // Phase transitions
    const t = state.time;
    if (state.phase === 0) {
      state.tableOp = state.tableOp.map((op, i) => {
        const target = t > 0.3 + i * 0.22 ? 1 : 0;
        return Math.min(1, op + (target - op) * Math.min(1, dt * 5));
      });
      if (t > 0.3 + TABLES.length * 0.22 + 0.4) state.phase = 1;
    }
    if (state.phase >= 1) {
      const phaseStart = 0.3 + TABLES.length * 0.22 + 0.4;
      state.teamOp = state.teamOp.map((op, i) => {
        const target = (t - phaseStart) > i * 0.28 ? 1 : 0;
        return Math.min(1, op + (target - op) * Math.min(1, dt * 4));
      });
      if (state.teamOp.every(op => op > 0.85) && state.phase === 1) state.phase = 2;
    }
    if (state.phase >= 2) {
      state.spawnT += dt;
      const rate = Math.min(4, 0.8 + state.time * 0.08);
      if (state.spawnT > 1 / rate) {
        const ti = Math.floor(Math.random() * TEAMS.length);
        const from = teamCenter(ti);
        const to = tblCenter(Math.floor(Math.random() * TABLES.length));
        const steps = 60 + Math.random() * 30;
        state.particles.push({
          x: from.x, y: from.y,
          dx: (to.x - from.x) / steps, dy: (to.y - from.y) / steps,
          color: TEAMS[ti].color,
          label: SQL[Math.floor(Math.random() * SQL.length)],
          life: 1, maxLife: 0.9 + Math.random() * 0.6,
          wobble: (Math.random() - 0.5) * 2,
        });
        state.spawnT = 0;
      }
      state.particles = state.particles.filter(p => p.life > 0.05);
      state.particles.forEach(p => {
        p.x += p.dx * 60 * dt;
        p.y += p.dy * 60 * dt + p.wobble * dt * 8;
        p.life -= dt / p.maxLife;
      });
    }

    // Draw
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, W, H);

    // Title
    if (state.phase < 2) {
      ctx.globalAlpha = 1 - state.phase;
      ctx.fillStyle = '#4B5E78';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('A company with raw data in Snowflake.  Six teams need reports.', W/2, 22);
      ctx.globalAlpha = 1;
    }

    // DB box
    const dbOp = Math.min(...state.tableOp, 1);
    if (dbOp > 0.01) {
      ctx.globalAlpha = dbOp;
      rr(ctx, TBL_X, 44, TBL_W, H - 64, 8, '#0F1A2E', '#1E2D43');
      rr(ctx, TBL_X + 4, 48, TBL_W - 8, 34, 6, '#162238', null);
      ctx.fillStyle = '#29ABE2';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❄  Snowflake', TBL_X + TBL_W/2, 71);
      ctx.globalAlpha = 1;
    }

    TABLES.forEach((name, i) => {
      const op = state.tableOp[i];
      if (op < 0.01) return;
      ctx.globalAlpha = op;
      const y = TBL_Y0 + i * TBL_H;
      rr(ctx, TBL_X + 4, y + 2, TBL_W - 8, TBL_H - 4, 4,
         i % 2 === 0 ? '#131D2E' : '#0F1626', null);
      ctx.fillStyle = '#3B82F6';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('▤  ' + name, TBL_X + 14, y + 20);
      ctx.globalAlpha = 1;
    });

    // Teams panel
    TEAMS.forEach((team, i) => {
      const op = state.teamOp[i];
      if (op < 0.01) return;
      const c = teamCenter(i);
      ctx.globalAlpha = op;
      ctx.beginPath(); ctx.arc(c.x, c.y, 22, 0, Math.PI * 2);
      ctx.fillStyle = team.color + '30'; ctx.fill();
      ctx.beginPath(); ctx.arc(c.x, c.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = team.color; ctx.fill();
      ctx.fillStyle = '#CBD4E6';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(team.name, c.x + 28, c.y + 4);
      ctx.globalAlpha = 1;
    });

    // Particles
    state.particles.forEach(p => {
      if (p.life < 0.05) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 3) * 0.88;
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      const tw = ctx.measureText(p.label).width + 10;
      rr(ctx, p.x - tw/2, p.y - 9, tw, 18, 5, p.color, null);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.label, p.x, p.y);
      ctx.restore();
    });

    // Chaos counter
    if (state.phase >= 2 && state.particles.length > 0) {
      const n = state.particles.length;
      ctx.fillStyle = n > 40 ? '#EF4444' : n > 20 ? '#F59E0B' : '#10B981';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${n} SQL files in flight`, W - 14, 18);
    }

    // Chaos label at peak
    if (state.phase >= 2 && state.time > 14) {
      ctx.globalAlpha = Math.min(1, (state.time - 14) * 0.4);
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('6 teams × uncoordinated SQL = zero shared truth', W/2, H - 18);
      ctx.globalAlpha = 1;
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>The world before dbt</h3>
      <p>In a typical company circa 2015–2020, data lived in a warehouse but <strong>transformation logic lived nowhere</strong> — or rather, it lived everywhere at once. Every analyst had their own folder of SQL files. Every team's dashboard connected directly to raw tables and applied its own business rules inline.</p>
      <p>This worked fine for 3 people. It fell apart at 30.</p>
    </div>
    <div class="detail-section">
      <h3>What the chaos looks like in practice</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#EF4444">
          <div class="info-card-title">30+ duplicate queries</div>
          <div class="info-card-tag" style="color:#EF4444;background:#EF444422">Pain</div>
          <div class="info-card-body">Marketing, Finance, and Ops each maintain their own version of "revenue". None agree. All are "correct" by their own definitions.</div>
        </div>
        <div class="info-card" style="border-left-color:#F59E0B">
          <div class="info-card-title">No documentation</div>
          <div class="info-card-tag" style="color:#F59E0B;background:#F59E0B22">Pain</div>
          <div class="info-card-body">A new analyst opens a file named <code>final_v3_USE_THIS.sql</code>. There are no comments. The JOIN condition references a column that no longer exists.</div>
        </div>
        <div class="info-card" style="border-left-color:#8B5CF6">
          <div class="info-card-title">No dependency map</div>
          <div class="info-card-tag" style="color:#8B5CF6;background:#8B5CF622">Pain</div>
          <div class="info-card-body">Finance changes one view. Two weeks later, the Marketing dashboard silently starts showing wrong numbers. Nobody knows why.</div>
        </div>
        <div class="info-card" style="border-left-color:#3B82F6">
          <div class="info-card-title">Manual execution</div>
          <div class="info-card-tag" style="color:#3B82F6;background:#3B82F622">Pain</div>
          <div class="info-card-body">Refreshing reports means running SQL files by hand, in the right order, hoping nothing changed upstream. There is no orchestration.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>Amazon-scale version of this problem</h3>
      <p>Amazon runs 20+ business units: Retail, AWS, Prime Video, Advertising, Alexa, Fulfillment, Pharmacy. Each has its own analytics team. Without a shared transformation layer, the same question — "how many active customers does Amazon have?" — would yield a different answer from every team.</p>
      <p>At Amazon scale, metric inconsistency isn't just embarrassing — it leads to billions of dollars in misallocated marketing spend and incorrect business decisions.</p>
    </div>
    <div class="detail-section">
      <h3>The question this module leaves you with</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">If every team writes SQL differently and nothing is shared, what does it take to make 50 analysts agree on a single number?</p>
      <p>Keep that question in mind. We'll answer it — but only after you feel the full weight of the problem.</p>
    </div>
  `;
}
