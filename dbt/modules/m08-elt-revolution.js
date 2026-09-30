import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'Explain the architectural shift from ETL to ELT. What specifically changed in the data infrastructure landscape that made ELT viable?',
    a: `<strong>The ETL → ELT shift:</strong>
    <ul>
      <li><strong>ETL:</strong> Extract from source → Transform in ETL tool (on separate server) → Load cleaned data to warehouse. Transform happens BEFORE loading.</li>
      <li><strong>ELT:</strong> Extract from source → Load raw data to warehouse → Transform using SQL inside the warehouse. Transform happens AFTER loading.</li>
    </ul>
    <strong>What changed:</strong>
    <ol>
      <li><strong>Cheap elastic compute:</strong> Snowflake, BigQuery, Redshift introduced pay-per-query pricing. Running a complex transformation costs cents instead of requiring a dedicated server.</li>
      <li><strong>Columnar storage:</strong> Cloud warehouses store data columnar, making analytical queries (aggregations, GROUP BY) 10–100× faster than row-store databases.</li>
      <li><strong>Separation of storage and compute:</strong> You can store 10TB of raw data cheaply, then spin up compute only when you need to transform it. The old ETL model paid for transformation capacity 24/7.</li>
      <li><strong>SQL maturity:</strong> Window functions, CTEs, and analytical SQL became standard. Analysts could write complex transformations in SQL without needing a Java or Scala developer.</li>
      <li><strong>Fivetran/Airbyte:</strong> Extraction became commoditized. These tools handle the "E" and "L" automatically, leaving only the "T" — which dbt owns.</li>
    </ol>`,
    tip: 'The "Fivetran handles EL, dbt handles T" separation is the key mental model. Modern data teams don\'t build custom extractors anymore — they use connectors. This was impossible to say in 2010.',
  },
  {
    q: 'Who is the "analytics engineer" persona and why did they emerge with ELT?',
    a: `<strong>The analytics engineer</strong> is a role that sits between traditional data engineering and business intelligence:
    <br><br>
    <strong>What they are:</strong>
    <ul>
      <li>SQL-fluent, but also understands software engineering practices: version control, testing, modularity</li>
      <li>Understands the business domain well enough to define <code>fct_revenue</code> correctly</li>
      <li>Can own the transformation layer end-to-end: modeling, testing, documentation, deployment</li>
    </ul>
    <strong>Why they emerged:</strong>
    <ul>
      <li>ETL pipelines required Java/Scala engineers to modify. This created a bottleneck — analysts had to wait weeks for changes.</li>
      <li>ELT moved the transformation to SQL, which analysts already knew</li>
      <li>dbt gave SQL the software engineering scaffolding (tests, docs, dependencies) that analysts lacked</li>
      <li>Result: analysts could own their data pipeline end-to-end, without an ETL developer as a gatekeeper</li>
    </ul>
    <strong>The role didn't exist at most companies before 2016.</strong> It's now one of the fastest-growing roles in tech.`,
    tip: 'Tristan Handy (founder of dbt Labs) popularized the term "analytics engineer." Knowing the origin story signals you\'ve read the primary sources in the field.',
  },
  {
    q: 'What are the trade-offs of ELT vs ETL? When would you still choose ETL?',
    a: `<strong>ELT advantages:</strong>
    <ul>
      <li>Analysts can write and own transformations in SQL</li>
      <li>Raw data is preserved — you can re-transform it if the logic was wrong</li>
      <li>No separate transformation server to maintain</li>
      <li>Iteration is fast: change SQL, run dbt, see results in minutes</li>
    </ul>
    <strong>ELT disadvantages / where ETL still wins:</strong>
    <ul>
      <li><strong>PII/compliance:</strong> If regulations require masking PII before it enters the warehouse (e.g., HIPAA, PCI-DSS), ETL lets you scrub data before it lands. ELT means raw PII is in the warehouse, requiring stricter access controls.</li>
      <li><strong>Streaming:</strong> Real-time transformation on event streams requires tools like Kafka Streams or Apache Flink — SQL-in-warehouse ELT is inherently batch-oriented (typically hourly or daily).</li>
      <li><strong>Legacy systems:</strong> If the destination is an on-premise data mart that can't run complex SQL, you still need ETL to pre-aggregate.</li>
      <li><strong>Data volume limits:</strong> Warehouses charge for compute. If you're running petabyte-scale transformations multiple times per day, warehouse costs can exceed a dedicated ETL server.</li>
    </ul>`,
    tip: 'The PII/HIPAA trade-off is a sophisticated answer. Senior candidates know that "just use ELT" breaks down when data has compliance requirements that mandate scrubbing before it enters any queryable system.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M08 · ELT Revolution',
    title: 'Why ELT Won',
    subtitle: 'Cloud warehouses made transformation cheap and fast. The entire data architecture flipped — and dbt was born to own the new transformation layer.',
    tabs: [
      { id: 'visual', label: '🎬 Live Demo' },
      { id: 'detail', label: '📋 The Shift' },
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
  ctrl.innerHTML = `<button class="ctrl-btn" id="m08-reset">↺ Reset</button>
    <span class="ctrl-label">ETL vs ELT — two architectures, same goal, very different results</span>`;
  wrap.appendChild(ctrl);
  tab.appendChild(wrap);

  const ctx = cv.getContext('2d');
  const W = 820, H = 420;

  let state;
  function init() {
    state = {
      time: 0,
      etlPackets: [],
      eltPackets: [],
      etlTimer: 0,
      eltTimer: 0,
    };
  }
  init();
  ctrl.querySelector('#m08-reset').addEventListener('click', init);

  // ETL pipeline (left half): Extract → [Transform server] → Load → Warehouse
  // ELT pipeline (right half): Extract → Load → Warehouse → [Transform = dbt SQL]

  const MID = W / 2;
  const PY = H * 0.3;
  const STAGE_H = 56;

  // ETL stages (left)
  const ETL_STAGES = [
    { label: 'Source Data', x: 40, color: '#3B82F6' },
    { label: 'ETL Server\n(Transform)', x: 150, color: '#EF4444', slow: true },
    { label: 'Warehouse', x: 280, color: '#10B981' },
  ];

  // ELT stages (right)
  const ELT_STAGES = [
    { label: 'Source Data', x: MID + 30, color: '#3B82F6' },
    { label: 'Warehouse\n(Raw)', x: MID + 160, color: '#10B981' },
    { label: 'dbt Transform\n(SQL in WH)', x: MID + 290, color: '#FF694B', fast: true },
  ];

  function rr(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  function drawPipeline(stages, baseY, pktArr, label, labelColor) {
    const BW = 90, BH = STAGE_H;
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, stages[0].x, baseY - 18);

    stages.forEach((s, i) => {
      rr(ctx, s.x, baseY, BW, BH, 8,
        s.slow ? '#200A0A' : s.fast ? '#1A0F08' : '#131D2E',
        s.color + (s.slow || s.fast ? '' : '88')
      );
      ctx.fillStyle = s.color;
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      const lines = s.label.split('\n');
      lines.forEach((line, li) => ctx.fillText(line, s.x + BW/2, baseY + 18 + li * 12));

      if (s.slow) {
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillText('🐌 slow + costly', s.x + BW/2, baseY + BH - 8);
      }
      if (s.fast) {
        ctx.fillStyle = '#FF694B';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillText('⚡ fast SQL', s.x + BW/2, baseY + BH - 8);
      }

      if (i < stages.length - 1) {
        const ax = s.x + BW + 2, ay = baseY + BH/2;
        const bx = stages[i+1].x - 2;
        ctx.strokeStyle = '#1E2D43'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, ay); ctx.stroke();
        ctx.fillStyle = '#1E2D43';
        ctx.beginPath(); ctx.moveTo(bx, ay); ctx.lineTo(bx-6, ay-4); ctx.lineTo(bx-6, ay+4); ctx.closePath(); ctx.fill();
      }
    });

    // Draw packets
    pktArr.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, baseY + BH/2, 5, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
    });
  }

  let raf = null, lastT = 0;

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    state.time += dt;

    // ETL packets (slow through transform server)
    state.etlTimer += dt;
    if (state.etlTimer > 1.2) {
      state.etlPackets.push({ x: ETL_STAGES[0].x + 90, y: 0, speed: 40, color: '#3B82F6' });
      state.etlTimer = 0;
    }
    state.etlPackets = state.etlPackets.filter(p => p.x < ETL_STAGES[2].x + 100);
    state.etlPackets.forEach(p => {
      // Slow down in ETL server
      const inETL = p.x > ETL_STAGES[1].x && p.x < ETL_STAGES[1].x + 90;
      const speed = inETL ? 15 : p.speed;
      p.x += speed * dt;
      p.color = p.x > ETL_STAGES[2].x ? '#10B981' : p.x > ETL_STAGES[1].x ? '#EF4444' : '#3B82F6';
    });

    // ELT packets (fast to warehouse, then fast transform)
    state.eltTimer += dt;
    if (state.eltTimer > 0.5) {
      state.eltPackets.push({ x: ELT_STAGES[0].x + 90, y: 0, speed: 120, color: '#3B82F6' });
      state.eltTimer = 0;
    }
    state.eltPackets = state.eltPackets.filter(p => p.x < ELT_STAGES[2].x + 110);
    state.eltPackets.forEach(p => {
      p.x += p.speed * dt;
      p.color = p.x > ELT_STAGES[2].x ? '#FF694B' : p.x > ELT_STAGES[1].x ? '#10B981' : '#3B82F6';
    });

    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);

    // Divider
    ctx.strokeStyle = '#1E2D43';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(MID, 30); ctx.lineTo(MID, H - 20); ctx.stroke();
    ctx.setLineDash([]);

    // Headers
    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ETL (Before Cloud)', MID * 0.5, 30);
    ctx.fillStyle = '#10B981';
    ctx.fillText('ELT (dbt Era)', MID + MID * 0.5, 30);

    // Pipelines
    drawPipeline(ETL_STAGES, PY, state.etlPackets, 'Extract → Transform → Load', '#EF4444');
    drawPipeline(ELT_STAGES, PY, state.eltPackets, 'Extract → Load → Transform', '#10B981');

    // Speed comparison
    const compY = PY + STAGE_H + 50;
    const metrics = [
      { label: 'Iteration speed', etl: '2 weeks', elt: '2 minutes', winner: 'elt' },
      { label: 'Who writes logic', etl: 'ETL engineer', elt: 'Analyst (SQL)', winner: 'elt' },
      { label: 'Version control', etl: 'GUI export', elt: 'Git', winner: 'elt' },
      { label: 'Test coverage', etl: 'Manual', elt: 'Automated', winner: 'elt' },
      { label: 'Compute cost', etl: 'Always-on server', elt: 'Pay per query', winner: 'elt' },
    ];

    metrics.forEach((m, i) => {
      const ry = compY + i * 30;
      ctx.fillStyle = '#8895AA';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.label, W/2, ry + 12);

      ctx.fillStyle = '#EF4444';
      ctx.textAlign = 'right';
      ctx.fillText(m.etl, MID - 20, ry + 12);

      ctx.fillStyle = '#10B981';
      ctx.textAlign = 'left';
      ctx.fillText(m.elt, MID + 20, ry + 12);

      ctx.fillStyle = '#1E2D43';
      ctx.fillRect(MID - 14, ry + 4, 28, 1);
    });

    // Bottom label
    ctx.fillStyle = '#FF694B';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('dbt owns the "T" in ELT — transformations in SQL, versioned in Git, tested automatically.', W/2, H - 12);

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>The ELT revolution in three numbers</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#10B981">
          <div class="info-card-title">100× cheaper storage</div>
          <div class="info-card-tag" style="color:#10B981;background:#10B98122">Snowflake, 2012</div>
          <div class="info-card-body">Cloud object storage (S3, GCS) made storing raw data essentially free. The old reason to transform before loading — saving warehouse storage costs — disappeared overnight.</div>
        </div>
        <div class="info-card" style="border-left-color:#3B82F6">
          <div class="info-card-title">10× faster queries</div>
          <div class="info-card-tag" style="color:#3B82F6;background:#3B82F622">BigQuery, 2010</div>
          <div class="info-card-body">Column-oriented cloud warehouses could run analytical SQL on billions of rows in seconds. The "transform before load" performance argument no longer held — the warehouse was now fast enough to transform raw data on demand.</div>
        </div>
        <div class="info-card" style="border-left-color:#FF694B">
          <div class="info-card-title">$0 per iteration</div>
          <div class="info-card-tag" style="color:#FF694B;background:#FF694B22">dbt, 2016</div>
          <div class="info-card-body">dbt made SQL transformation free to iterate. An analyst can write a new model, test it, and deploy it in minutes — with no ETL developer, no server, no IT ticket. The bottleneck that defined data work for 20 years was gone.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>The modern data stack</h3>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Layer</th><th>ETL Era Tool</th><th>ELT Era Tool</th></tr></thead>
          <tbody>
            <tr><td>Extraction</td><td>Custom scripts / Informatica</td><td>Fivetran, Airbyte, Stitch</td></tr>
            <tr><td>Loading</td><td>Part of ETL tool</td><td>Fivetran / Airbyte</td></tr>
            <tr><td>Transformation</td><td>ETL server / Stored procs</td><td class="good">dbt</td></tr>
            <tr><td>Storage</td><td>Teradata / Netezza (on-prem)</td><td>Snowflake / BigQuery / Redshift</td></tr>
            <tr><td>Orchestration</td><td>Autosys / Tidal</td><td>Airflow, dbt Cloud, Dagster</td></tr>
            <tr><td>BI</td><td>BusinessObjects / Crystal Reports</td><td>Looker, Tableau, Metabase</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="detail-section">
      <h3>The analytics engineer role emerges</h3>
      <p>ELT created a new persona: the <strong>analytics engineer</strong>. They understand SQL deeply, apply software engineering practices (version control, testing, documentation), and own the transformation layer from raw data to business-facing marts. Before ELT, this role didn't exist — transformation was owned by ETL developers who didn't know the business, and analysts who knew the business couldn't change the pipeline.</p>
      <p>dbt is the analytics engineer's primary tool. It gave SQL the infrastructure that software engineers take for granted: Git, tests, documentation, CI/CD.</p>
    </div>
  `;
}
