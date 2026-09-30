import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'A new engineer joins your data team. They open the dbt project and can understand it within one day. What does that project look like?',
    a: `<strong>Project structure:</strong>
    <ol>
      <li><strong>Clear folder hierarchy:</strong> <code>models/staging/</code>, <code>models/intermediate/</code>, <code>models/marts/finance/</code>, <code>models/marts/marketing/</code>. No files floating in the root.</li>
      <li><strong>Naming conventions enforced:</strong> Staging models are always <code>stg__{source}__{entity}.sql</code>. Marts are always <code>fct_</code> or <code>dim_</code>. A new engineer can infer what a model does from its name alone.</li>
      <li><strong>schema.yml documentation:</strong> Every model has a <code>description</code>. Every column has a <code>description</code>. Business terms (what does "active" mean here?) are explained inline.</li>
      <li><strong>Tests on every primary key:</strong> A <code>not_null</code> + <code>unique</code> test on every model's primary key. Running <code>dbt test</code> gives the new engineer confidence the project is healthy.</li>
      <li><strong>CONTRIBUTING.md or dbt project README:</strong> Explains the layers, naming conventions, and how to add a new model. A new engineer reads this file first — before touching any SQL.</li>
    </ol>`,
    tip: 'The best answer focuses on discoverability AND correctness signals. A new engineer needs to know: "What does this do?" (docs) AND "Can I trust this?" (tests). Both must be present.',
  },
  {
    q: 'What is dbt\'s documentation system, and how is it different from writing comments in SQL files?',
    a: `<strong>SQL comments:</strong> Live inside the file. No one reads them. Not searchable across the project. Not rendered anywhere. Become stale and misleading as the code evolves.
    <br><br>
    <strong>dbt docs system:</strong>
    <ul>
      <li><code>schema.yml</code> files contain descriptions for models, columns, sources, and macros.</li>
      <li><code>dbt docs generate</code> compiles these into a static website with a searchable data catalog.</li>
      <li>The catalog shows: column types, test coverage, upstream/downstream lineage, last refresh time, and owner metadata — all in one place.</li>
      <li>dbt Cloud hosts this catalog automatically. Every analyst can look up "what is <code>fct_revenue</code>?" in the browser without opening a SQL file.</li>
      <li><code>doc()</code> blocks allow sharing descriptions across models — write the definition of "active user" once, reference it everywhere.</li>
    </ul>
    <strong>The key difference:</strong> dbt docs are queryable, rendered, and alive. SQL comments are static text that lives and dies with the file.`,
    tip: 'The <code>doc()</code> block pattern is a lesser-known feature that signals real dbt experience. It\'s how large teams maintain consistent business term definitions across hundreds of models.',
  },
  {
    q: 'How would you design a dbt project structure for Amazon\'s 20+ business units that allows autonomy while maintaining shared standards?',
    a: `<strong>Multi-project architecture:</strong>
    <ol>
      <li><strong>Core platform project:</strong> A central dbt project owned by the Data Platform team. Contains staging models for all raw sources, utility macros, shared intermediate models (e.g., <code>dim_customer</code>, <code>dim_date</code>). Published as a dbt package.</li>
      <li><strong>Domain projects:</strong> Each BU (Retail, AWS, Prime Video) has its own dbt project. They install the core platform package and build their domain-specific marts on top: <code>fct_aws_revenue</code>, <code>fct_prime_churn</code>.</li>
      <li><strong>dbt mesh (dbt cross-project refs):</strong> Domain projects reference each other's public models using <code>ref('project_name', 'model_name')</code>. The lineage spans projects — the full data graph is visible in dbt Cloud.</li>
      <li><strong>Shared governance layer:</strong> A <code>dbt-project-evaluator</code> package runs linting rules (naming conventions, required documentation) across all projects in CI.</li>
      <li><strong>Access control:</strong> dbt model contracts define public APIs. Domain teams can't change public model signatures without a breaking-change process.</li>
    </ol>`,
    tip: 'The "dbt mesh" / cross-project refs architecture is exactly what Airbnb, LinkedIn, and Shopify use at scale. Knowing this by name signals you\'ve worked at or researched data platform architecture at serious scale.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M05 · Foundation',
    title: 'The Onboarding Nightmare',
    subtitle: '600 SQL files. No documentation. No naming convention. Watch a new engineer try to navigate this for three weeks.',
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
  ctrl.innerHTML = `<button class="ctrl-btn" id="m05-reset">↺ Restart</button>
    <span class="ctrl-label">Watch the confusion build as more files appear</span>`;
  wrap.appendChild(ctrl);
  tab.appendChild(wrap);

  const ctx = cv.getContext('2d');
  const W = 820, H = 420;

  const FILENAMES = [
    'revenue.sql', 'revenue_v2.sql', 'revenue_FINAL.sql', 'revenue_FINAL_v2.sql',
    'revenue_USE_THIS.sql', 'orders.sql', 'orders_new.sql', 'orders_2023.sql',
    'customers.sql', 'customers_COPY.sql', 'customers_old.sql', 'active_users.sql',
    'active_users_v2_REAL.sql', 'mktg_dashboard.sql', 'finance_query.sql',
    'exec_report.sql', 'exec_report_FINAL.sql', 'clv_calc.sql', 'clv_OLD.sql',
    'clv_new_method.sql', 'weekly_stats.sql', 'daily_rollup.sql', 'temp_fix.sql',
    'DONT_USE_THIS.sql', 'order_pipeline.sql', 'order_pipeline_v3.sql',
    'big_query.sql', 'DEPRECATED.sql', 'test_query.sql', 'untitled.sql',
  ];

  const FOLDERS = ['analytics/', 'finance/', 'marketing/', 'ops/', 'adhoc/', 'OLD/'];
  const QUESTIONS = ['?', '??', 'What does this join?', 'Who wrote this?', 'Is this still used?', '???'];

  let state;
  function init() {
    state = {
      time: 0,
      visibleFiles: 0,
      fileTimer: 0,
      questions: [],
      qTimer: 0,
      devBlink: 0,
      dayCounter: 0,
    };
  }
  init();
  ctrl.querySelector('#m05-reset').addEventListener('click', init);

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

    // Spawn files
    state.fileTimer += dt;
    const spawnRate = Math.min(3, 0.6 + state.time * 0.05);
    if (state.fileTimer > 1 / spawnRate && state.visibleFiles < FILENAMES.length) {
      state.visibleFiles++;
      state.fileTimer = 0;
    }

    // Spawn question marks
    state.qTimer += dt;
    if (state.qTimer > 1.2 && state.visibleFiles > 5) {
      state.questions.push({
        x: 620 + (Math.random() - 0.5) * 80,
        y: H * 0.55,
        text: QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)],
        vy: -30 - Math.random() * 20,
        life: 1.4,
        color: Math.random() > 0.5 ? '#F59E0B' : '#EF4444',
      });
      state.qTimer = 0;
    }
    state.questions = state.questions.filter(q => q.life > 0);
    state.questions.forEach(q => { q.y += q.vy * dt; q.life -= dt / 1.4; });

    state.devBlink += dt;

    // Day counter
    state.dayCounter = Math.min(21, state.time * 1.2);

    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = '#4B5E78';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('New engineer joins the team. Opens the SQL repository.', W/2, 22);

    // File tree panel
    rr(ctx, 14, 36, 560, H - 52, 8, '#0D1220', '#1E2D43');
    ctx.fillStyle = '#3B82F6';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('📁  analytics-sql-repo/', 26, 56);

    // Files in columns
    const cols = 3;
    const colW = 170;
    const rowH = 18;
    const startX = 30, startY = 74;

    let folderIdx = -1;
    state.FILENAMES_SEEN = Math.min(state.visibleFiles, FILENAMES.length);
    for (let i = 0; i < state.FILENAMES_SEEN; i++) {
      const col = Math.floor(i / Math.ceil(FILENAMES.length / cols));
      const row = i % Math.ceil(FILENAMES.length / cols);
      const x = startX + col * colW;
      const y = startY + row * rowH;

      if (y > H - 30) continue;

      const fname = FILENAMES[i];
      const isSuspicious = fname.includes('FINAL') || fname.includes('OLD') || fname.includes('DONT') || fname.includes('COPY') || fname.includes('DEPRECATED') || fname.includes('temp');
      const color = isSuspicious ? '#EF4444' : '#8895AA';

      ctx.fillStyle = color;
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('  📄  ' + fname, x, y + 12);
    }

    // File count
    if (state.FILENAMES_SEEN > 0) {
      ctx.fillStyle = state.FILENAMES_SEEN >= 25 ? '#EF4444' : '#F59E0B';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${state.FILENAMES_SEEN} files... (and growing)`, 26, H - 20);
    }

    // Developer figure
    const DEV_X = 660, DEV_Y = H * 0.45;

    // Dev circle/head
    ctx.beginPath(); ctx.arc(DEV_X, DEV_Y - 30, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#2A3D57'; ctx.fill();
    ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = 1.5; ctx.stroke();

    // Face
    ctx.fillStyle = '#CBD4E6';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(state.visibleFiles > 20 ? '😰' : state.visibleFiles > 10 ? '😕' : '🙂', DEV_X, DEV_Y - 22);

    // Body
    ctx.strokeStyle = '#2A3D57'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(DEV_X, DEV_Y - 12); ctx.lineTo(DEV_X, DEV_Y + 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(DEV_X - 16, DEV_Y - 2); ctx.lineTo(DEV_X + 16, DEV_Y - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(DEV_X, DEV_Y + 20); ctx.lineTo(DEV_X - 12, DEV_Y + 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(DEV_X, DEV_Y + 20); ctx.lineTo(DEV_X + 12, DEV_Y + 40); ctx.stroke();

    // Developer label
    ctx.fillStyle = '#4B5E78';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('New Engineer', DEV_X, DEV_Y + 58);

    // Question marks
    state.questions.forEach(q => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, q.life * 2);
      ctx.fillStyle = q.color;
      ctx.font = `bold ${q.text.length > 3 ? '9' : '14'}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(q.text, q.x, q.y);
      ctx.restore();
    });

    // Day counter
    if (state.dayCounter > 0) {
      const days = Math.floor(state.dayCounter);
      const label = days < 7 ? `Day ${days}` : days < 14 ? `Week ${Math.floor(days/7)}` : `Week 3`;
      rr(ctx, W - 140, 36, 126, 44, 6, '#131D2E', '#1E2D43');
      ctx.fillStyle = days >= 14 ? '#EF4444' : days >= 7 ? '#F59E0B' : '#10B981';
      ctx.font = 'bold 15px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, W - 77, 55);
      ctx.fillStyle = '#4B5E78';
      ctx.font = '9px Inter, sans-serif';
      ctx.fillText('still confused', W - 77, 72);
    }

    // Status message
    let msg = '';
    if (state.visibleFiles < 5) msg = 'Seems manageable at first...';
    else if (state.visibleFiles < 15) msg = 'Wait, which one is the real revenue query?';
    else if (state.visibleFiles < 25) msg = 'Are these all still used? What does FINAL_v2 mean?';
    else msg = `${state.visibleFiles}+ SQL files. Zero documentation. No naming conventions. Where do you even start?`;

    ctx.fillStyle = state.visibleFiles > 20 ? '#EF4444' : '#4B5E78';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(msg, W/2, H - 8);

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>The real cost of undocumented SQL</h3>
      <p>A Gartner study found that data engineers spend 30–40% of their time on "SQL archaeology" — reverse-engineering what existing queries do and why they were written. This is time not spent building new capabilities.</p>
      <p>At Amazon's scale, this problem multiplies. A new analyst joining the Prime Data team might inherit 400 SQL files built over 5 years by people who have since left the company. The institutional knowledge walked out the door with them.</p>
    </div>
    <div class="detail-section">
      <h3>The symptoms of an undocumented SQL warehouse</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#EF4444">
          <div class="info-card-title">File naming chaos</div>
          <div class="info-card-tag" style="color:#EF4444;background:#EF444422">Pattern</div>
          <div class="info-card-body"><code>revenue.sql</code>, <code>revenue_v2.sql</code>, <code>revenue_FINAL.sql</code>, <code>revenue_USE_THIS.sql</code> — all exist. Nobody knows which one dashboards are actually reading.</div>
        </div>
        <div class="info-card" style="border-left-color:#F59E0B">
          <div class="info-card-title">Orphaned queries</div>
          <div class="info-card-tag" style="color:#F59E0B;background:#F59E0B22">Pattern</div>
          <div class="info-card-body">30% of SQL files in a typical mature warehouse are no longer used. But nobody knows which 30%. Deleting anything feels dangerous.</div>
        </div>
        <div class="info-card" style="border-left-color:#8B5CF6">
          <div class="info-card-title">Knowledge hoarding</div>
          <div class="info-card-tag" style="color:#8B5CF6;background:#8B5CF622">Pattern</div>
          <div class="info-card-body">The one analyst who knows how the revenue query works becomes a bottleneck. Every new team member has to sit with them for a week to get context. They become a single point of failure.</div>
        </div>
        <div class="info-card" style="border-left-color:#3B82F6">
          <div class="info-card-title">Slow ramp time</div>
          <div class="info-card-tag" style="color:#3B82F6;background:#3B82F622">Pattern</div>
          <div class="info-card-body">New data engineers at companies without dbt take 4–6 weeks to become productive. With a well-documented dbt project, ramp time drops to under one week.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>What dbt documentation looks like</h3>
      <div class="code-block"><span class="cmt"># models/marts/finance/schema.yml</span>
<span class="kw">models</span>:
  - <span class="fn">name</span>: fct_revenue
    <span class="fn">description</span>: <span class="str">|
      Canonical revenue model. Net revenue after refunds,
      GAAP-compliant. Fiscal year ends Jan 31.
      Owner: finance-data-team. SLA: refreshed daily by 6am PST.
    </span>
    <span class="fn">columns</span>:
      - <span class="fn">name</span>: order_id
        <span class="fn">description</span>: <span class="str">Unique order identifier from raw_orders</span>
        <span class="fn">tests</span>: [not_null, unique]
      - <span class="fn">name</span>: net_revenue
        <span class="fn">description</span>: <span class="str">Gross revenue minus refunds and chargebacks</span>
        <span class="fn">tests</span>: [{dbt_utils.expression_is_true: {expression: ">= 0"}}]</div>
      <p>This YAML generates a searchable data catalog. Any analyst can search "revenue" and find the canonical definition, its test coverage, its owner, and its lineage — in seconds.</p>
    </div>
    <div class="detail-section">
      <h3>What problem did this module show?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Without documentation and structure, every new team member starts from zero. The tribal knowledge that makes a data team effective doesn't transfer — it just accumulates as invisible debt.</p>
    </div>
  `;
}
