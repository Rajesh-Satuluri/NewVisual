import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'Explain ETL architecture and the specific bottlenecks that made it unsuitable for modern analytics teams.',
    a: `<strong>ETL (Extract, Transform, Load):</strong>
    <ol>
      <li><strong>Extract:</strong> Pull data from source systems (databases, APIs, files) into the ETL tool's memory or staging area.</li>
      <li><strong>Transform:</strong> Apply business logic, joins, aggregations <em>in the ETL tool</em> — Informatica, Talend, SSIS, DataStage.</li>
      <li><strong>Load:</strong> Write the transformed result to the data warehouse.</li>
    </ol>
    <strong>Bottlenecks:</strong>
    <ul>
      <li><strong>Tool dependency:</strong> Business logic lives inside the ETL tool's proprietary GUI. Analysts can't write SQL — they must go through ETL developers. Every change requires an ETL developer, creating a bottleneck.</li>
      <li><strong>Slow iteration:</strong> Deploying an ETL change takes days: requirements → IT ticket → ETL developer → testing environment → production. Analysts can't iterate in real time.</li>
      <li><strong>Scaling costs:</strong> ETL tools transform data on dedicated servers. As data volumes grew from GBs to TBs, ETL server costs grew proportionally.</li>
      <li><strong>Version control nightmare:</strong> ETL job configurations are stored in proprietary binary formats. Diffing, branching, and code review are nearly impossible.</li>
      <li><strong>Testing gap:</strong> ETL tools have no built-in data quality testing framework. Testing was manual or non-existent.</li>
    </ul>`,
    tip: 'The "IT ticket bottleneck" is what most practitioners remember most vividly — waiting 2 weeks for a simple metric change is what drove analytics engineers to embrace ELT.',
  },
  {
    q: 'What is Stored Procedure-based transformation, and why was it abandoned in favor of dbt models?',
    a: `<strong>Stored Procedures:</strong> SQL code stored and executed inside the database. Common in the ETL era: data is loaded into tables, then stored procedures run to transform it.
    <br><br>
    <strong>Why they were abandoned:</strong>
    <ul>
      <li><strong>No version control:</strong> Stored procedures live in the database, not in Git. Tracking changes requires manual documentation. "Who changed this procedure and when?" is unanswerable.</li>
      <li><strong>No dependency management:</strong> Procedure A calls procedure B calls procedure C. The execution order is implicit and fragile. Nobody has a graph of what depends on what.</li>
      <li><strong>No testing framework:</strong> Procedures have no built-in testing. You either write custom test procedures (rarely done) or trust them manually.</li>
      <li><strong>Environment management:</strong> "Works in dev, broken in prod" is endemic because dev and prod procedures diverge over time without a deployment process.</li>
      <li><strong>dbt improvement:</strong> dbt models are SQL files in Git with explicit <code>ref()</code> dependencies, built-in testing, environment management via profiles, and full lineage tracking. Every stored procedure pain point is addressed.</li>
    </ul>`,
    tip: '"Works in dev, broken in prod" is a concrete failure mode that resonates with anyone who\'s maintained stored procedures. Specific failure modes beat abstract descriptions.',
  },
  {
    q: 'A legacy ETL pipeline takes 8 hours to run. A new ELT approach using dbt on Snowflake would take 45 minutes. How do you make the migration case to leadership?',
    a: `<strong>Business case framework:</strong>
    <ol>
      <li><strong>Cost of current state:</strong> 8h pipeline × 365 days = 2,920 compute hours/year on the ETL server. At $0.10/hr cloud compute equivalent, that's $292/year just for the ETL server. Add engineering hours: 1 dedicated ETL developer at $150k/yr spending 60% time on maintenance = $90k/yr people cost.</li>
      <li><strong>Business impact of latency:</strong> If dashboards are 8 hours stale, what decisions are delayed? E.g., a fraud detection team that runs manual checks could automate if data were 45 min fresh. Quantify in dollars if possible.</li>
      <li><strong>Migration risk:</strong> Propose a parallel run: run old ETL and new dbt pipeline simultaneously for 30 days. Reconcile outputs. Prove correctness before cutover.</li>
      <li><strong>Maintenance reduction:</strong> Post-migration, ETL developer shifts from maintenance to building new capabilities. Quantify as "3 new data products per quarter" that weren't possible before.</li>
      <li><strong>Future-proofing:</strong> dbt is the industry standard. New hires can onboard in days, not months. Vendor lock-in risk from the old ETL tool disappears.</li>
    </ol>`,
    tip: 'Always anchor the migration to business outcomes, not technical elegance. "Faster and cheaper" is not as compelling as "this unlocks real-time fraud detection that reduces chargebacks by $2M/year."',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M07 · ELT Revolution',
    title: 'The ETL Era',
    subtitle: 'Before cloud warehouses, data transformation happened in heavyweight tools. A single schema change could take two weeks to deploy.',
    tabs: [
      { id: 'visual', label: '🎬 Live Demo' },
      { id: 'detail', label: '📋 The History' },
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
  ctrl.innerHTML = `<button class="ctrl-btn" id="m07-schema">💥 Change a Schema</button>
    <button class="ctrl-btn" id="m07-reset">↺ Reset</button>
    <span class="ctrl-label">See how a source schema change propagates through the ETL pipeline</span>`;
  wrap.appendChild(ctrl);
  tab.appendChild(wrap);

  const ctx = cv.getContext('2d');
  const W = 820, H = 420;

  const STAGES = [
    { label: 'Raw Data\nSources', sub: 'DB, APIs,\nFiles', color: '#3B82F6', x: 50 },
    { label: 'ETL Tool', sub: 'Informatica\nTalend / SSIS', color: '#8B5CF6', x: 210 },
    { label: 'Transform\nLayer', sub: 'Stored Procs\nServer Logic', color: '#F59E0B', x: 370 },
    { label: 'Load to\nWarehouse', sub: 'Teradata\nNetezza', color: '#10B981', x: 530 },
    { label: 'BI & Dash\nboards', sub: 'Tableau\nBusinessObjects', color: '#FF694B', x: 690 },
  ];

  const BOX_W = 110, BOX_H = 90, BOX_Y = H / 2 - BOX_H / 2;

  let state;
  function init() {
    state = {
      time: 0,
      packets: [],
      packetTimer: 0,
      broken: false,
      breakAnim: 0,
      breakStage: -1,
      ticketTimer: 0,
      showTicket: false,
    };
  }
  init();

  ctrl.querySelector('#m07-schema').addEventListener('click', () => {
    if (!state.broken) {
      state.broken = true;
      state.breakStage = 1; // ETL tool breaks
    }
  });
  ctrl.querySelector('#m07-reset').addEventListener('click', init);

  function rr(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  let raf = null, lastT = 0;

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    state.time += dt;

    // Spawn packets
    if (!state.broken) {
      state.packetTimer += dt;
      if (state.packetTimer > 0.8) {
        state.packets.push({ x: STAGES[0].x + BOX_W, y: BOX_Y + BOX_H/2, speed: 90, stageIdx: 0, color: '#3B82F6' });
        state.packetTimer = 0;
      }
      state.packets = state.packets.filter(p => p.x < STAGES[STAGES.length-1].x + BOX_W + 10);
      state.packets.forEach(p => {
        p.x += p.speed * dt;
        const nextStage = STAGES.findIndex(s => p.x < s.x + BOX_W / 2 && p.x > s.x);
        if (nextStage >= 0 && nextStage !== p.stageIdx) {
          p.stageIdx = nextStage;
          p.color = STAGES[nextStage].color;
        }
      });
    }

    if (state.broken) {
      state.breakAnim += dt;
      if (state.showTicket) state.ticketTimer += dt;
      if (state.breakAnim > 1.0 && !state.showTicket) state.showTicket = true;
    }

    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);

    // Pipeline title
    ctx.fillStyle = '#4B5E78';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Classic ETL Pipeline  ·  2005–2015', W/2, 22);

    // Arrows between stages
    STAGES.forEach((s, i) => {
      if (i < STAGES.length - 1) {
        const ax = s.x + BOX_W + 4;
        const ay = BOX_Y + BOX_H / 2;
        const bx = STAGES[i+1].x - 4;
        const isBroken = state.broken && i >= 1;
        ctx.strokeStyle = isBroken ? '#EF444466' : '#1E2D43';
        ctx.lineWidth = isBroken ? 1 : 1.5;
        ctx.setLineDash(isBroken ? [4, 3] : []);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, ay); ctx.stroke();
        ctx.setLineDash([]);
        // Arrow head
        const aColor = isBroken ? '#EF444466' : '#1E2D43';
        ctx.fillStyle = aColor;
        ctx.beginPath();
        ctx.moveTo(bx, ay);
        ctx.lineTo(bx - 8, ay - 5);
        ctx.lineTo(bx - 8, ay + 5);
        ctx.closePath(); ctx.fill();
      }
    });

    // Stage boxes
    STAGES.forEach((s, i) => {
      const isBroken = state.broken && i >= 1 && state.breakAnim > (i-1) * 0.4;
      const color = isBroken ? '#EF4444' : s.color;
      rr(ctx, s.x, BOX_Y, BOX_W, BOX_H, 8,
        isBroken ? '#1A0808' : '#131D2E',
        isBroken ? '#EF4444' : s.color + '88'
      );
      ctx.fillStyle = color;
      ctx.font = `bold 11px Inter, sans-serif`;
      ctx.textAlign = 'center';
      const lines = s.label.split('\n');
      lines.forEach((line, li) => ctx.fillText(line, s.x + BOX_W/2, BOX_Y + 20 + li * 15));
      ctx.fillStyle = isBroken ? '#EF4444' : '#4B5E78';
      ctx.font = '9px Inter, sans-serif';
      const subs = s.sub.split('\n');
      subs.forEach((sub, si) => ctx.fillText(sub, s.x + BOX_W/2, BOX_Y + 54 + si * 11));

      if (isBroken) {
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 18px serif';
        ctx.fillText('✗', s.x + BOX_W/2, BOX_Y + BOX_H - 12);
      }
    });

    // Data packets
    if (!state.broken) {
      state.packets.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.fill();
      });
    }

    // Time labels under stages
    const TIMES = ['Always on', '2–4 hrs\nprocessing', '1–3 hrs\ntransform', '30 min\nload', 'Stale\n8+ hrs'];
    STAGES.forEach((s, i) => {
      ctx.fillStyle = '#4B5E78';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      const tlines = TIMES[i].split('\n');
      tlines.forEach((tl, li) => ctx.fillText(tl, s.x + BOX_W/2, BOX_Y + BOX_H + 18 + li * 12));
    });

    // IT Ticket overlay
    if (state.showTicket) {
      const tx = W/2 - 140, ty = H * 0.1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.ticketTimer * 2);
      rr(ctx, tx, ty, 280, 120, 10, '#131D2E', '#F59E0B');
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎫  IT TICKET #4821', tx + 140, ty + 24);
      ctx.fillStyle = '#CBD4E6';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText('Request: Update ETL mapping for', tx + 140, ty + 46);
      ctx.fillText('schema change in raw_orders', tx + 140, ty + 62);
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('⏱  Estimated time: 2 weeks', tx + 140, ty + 84);
      ctx.fillStyle = '#4B5E78';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('Assigned to: ETL Team  ·  Priority: Normal', tx + 140, ty + 102);
      ctx.restore();
    }

    if (state.broken) {
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Schema change broke the ETL mapping. All downstream data stopped. IT ticket created.', W/2, H - 12);
    } else {
      ctx.fillStyle = '#4B5E78';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Data flows through the ETL pipeline — taking 8+ hours end-to-end. Try changing a schema.', W/2, H - 12);
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>The ETL era: 1990s–2015</h3>
      <p>For two decades, ETL was the standard architecture for data warehousing. The logic was sound for its time: data warehouses were expensive, compute was scarce, so it made sense to transform data <em>before</em> loading it — pay only for the storage of clean data, not raw data.</p>
      <p>This worked when data volumes were small (GBs), sources were few (2–3 databases), and analytical needs were predictable (monthly finance reports). None of those conditions survived contact with the modern internet.</p>
    </div>
    <div class="detail-section">
      <h3>The ETL stack of the era</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#8B5CF6">
          <div class="info-card-title">ETL Tools</div>
          <div class="info-card-tag" style="color:#8B5CF6;background:#8B5CF622">GUI-based</div>
          <div class="info-card-body">Informatica PowerCenter, IBM DataStage, Talend, SSIS, Pentaho. Business logic was configured in drag-and-drop GUI workflows. Not version-controllable. Vendor-locked.</div>
        </div>
        <div class="info-card" style="border-left-color:#F59E0B">
          <div class="info-card-title">Stored Procedures</div>
          <div class="info-card-tag" style="color:#F59E0B;background:#F59E0B22">Database-native</div>
          <div class="info-card-body">Complex transformations written as database stored procedures. Logic lived in the database, not in Git. Unversioned, untested, undocumented. The "last person to touch it" was often unknown.</div>
        </div>
        <div class="info-card" style="border-left-color:#10B981">
          <div class="info-card-title">Warehouses</div>
          <div class="info-card-tag" style="color:#10B981;background:#10B98122">On-premise</div>
          <div class="info-card-body">Teradata, Netezza, Oracle. Column-oriented, optimized for reads. Very expensive — a Teradata license could cost $500k+. Compute was rationed, not elastic.</div>
        </div>
        <div class="info-card" style="border-left-color:#3B82F6">
          <div class="info-card-title">Release Cycles</div>
          <div class="info-card-tag" style="color:#3B82F6;background:#3B82F622">Slow</div>
          <div class="info-card-body">Changing business logic in an ETL pipeline required: requirements doc → IT ticket → ETL developer → test environment → production deploy. 2–6 week cycle per change.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>Why the cloud changed everything</h3>
      <p>When Snowflake launched in 2012 and Redshift in 2012, compute became elastic and cheap. Suddenly the economics inverted:</p>
      <ul style="font-size:13px;color:var(--text-2);line-height:2;padding-left:20px">
        <li>Load raw data first (cheap storage), transform on demand (elastic compute)</li>
        <li>SQL became powerful enough to handle complex transformations at scale</li>
        <li>Analysts could write the transformations themselves — no ETL developer needed</li>
        <li>The bottleneck disappeared</li>
      </ul>
    </div>
  `;
}
