import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'The CEO asks "How many active users?" and gets three different answers from three teams. How do you build a system that prevents this?',
    a: `<strong>The fix has three parts:</strong>
    <ol>
      <li><strong>Canonical definition in dbt:</strong> Create <code>dim_active_user</code> with the agreed definition (active in last 30 days, verified email, at least 1 transaction). Document every assumption in <code>schema.yml</code>. All teams reference this model.</li>
      <li><strong>Semantic layer:</strong> Expose <code>active_users</code> as a dbt Metric. BI tools query the metric, not raw SQL. Even if an analyst opens Tableau and types "active users," they get the canonical number — not a custom definition.</li>
      <li><strong>Automated reconciliation test:</strong> A nightly singular test that compares the three dashboards. If they diverge by more than 0.5%, it alerts the data team before the CEO's Monday review.</li>
    </ol>
    <strong>The cultural component:</strong> None of the technical solutions work unless you align stakeholders on the definition first. Schedule a 90-minute "metric definition workshop" with Finance, Marketing, and Product. Document the agreed definition in Confluence. The dbt model is an implementation of that agreement, not a replacement for it.`,
    tip: 'Interviewers love the "metric definition workshop" addition because it shows you understand that data problems are 50% technical and 50% organizational. Pure technical solutions fail when the humans don\'t agree.',
  },
  {
    q: 'What is "data trust" and how do you measure it for a data platform?',
    a: `<strong>Data trust</strong> is stakeholders' confidence that the numbers in a dashboard reflect business reality. It degrades invisibly and collapses visibly.
    <br><br>
    <strong>Measurable signals of data trust:</strong>
    <ul>
      <li><strong>Challenge rate:</strong> How often do business users reject a number and go verify it themselves? High challenge rate = low trust.</li>
      <li><strong>Dashboard usage rate:</strong> If people stop looking at dashboards, they've given up. Track active users per dashboard in your BI tool's audit log.</li>
      <li><strong>Shadow reporting rate:</strong> How many Excel spreadsheets exist that "correct" or override official dashboards? Count them in Confluence/email searches.</li>
      <li><strong>Time-to-trust for new hires:</strong> How long before a new employee trusts the data enough to make a decision from a dashboard without manually verifying?</li>
      <li><strong>dbt test pass rate:</strong> % of dbt tests passing over time. A declining test pass rate predicts a future trust collapse.</li>
    </ul>`,
    tip: '"Shadow reporting rate" — counting Excel spreadsheets that correct official dashboards — is a metric most candidates have never heard of. Mentioning it shows you\'ve worked in a real data organization that had a trust problem.',
  },
  {
    q: 'Amazon\'s Prime team reports 180M active subscribers. The Advertising team reports 210M. Both are correct by their own definition. Is this a problem, and how do you resolve it?',
    a: `<strong>Is it a problem?</strong> Yes, when a number cross-segment analysis or a board presentation needs a single "Amazon active users" figure. Two teams using different definitions creates inconsistency at the highest level.
    <br><br>
    <strong>Resolution strategy:</strong>
    <ol>
      <li><strong>Accept multiple official definitions:</strong> Prime Active (paid, within grace period) vs Advertising Active (any ad impression in last 90d) are both legitimate. Name them explicitly: <code>active_prime_subscriber</code> and <code>active_advertising_user</code>.</li>
      <li><strong>Create a clear hierarchy:</strong> For board-level reporting, designate one as the canonical "Amazon customer" definition (usually the most conservative: active in last 30d, at least 1 Prime interaction). Document this in a company-wide data dictionary.</li>
      <li><strong>Build overlap analysis:</strong> A model that shows how many users are in Prime-Active but not Advertising-Active (and vice versa). This is often more valuable than a single number — it shows the measurement gap.</li>
      <li><strong>Prevent future drift:</strong> Tag metrics with their scope in schema.yml (<code>meta.scope: prime</code>, <code>meta.scope: advertising</code>). Whenever someone queries "active users" without a scope, a linting rule or semantic layer forces them to specify one.</li>
    </ol>`,
    tip: 'The "accept multiple official definitions with explicit names" approach is more mature than "find the one true definition." Real businesses have multiple legitimate ways to count the same thing — the goal is naming them clearly, not collapsing them.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M06 · Foundation',
    title: 'The Trust Crisis',
    subtitle: 'The CEO asks one question. Three teams give three answers. The board loses confidence in the data — and the team that built it.',
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
  ctrl.innerHTML = `<button class="ctrl-btn" id="m06-reset">↺ Restart</button>
    <span class="ctrl-label">Watch trust collapse as conflicting answers surface</span>`;
  wrap.appendChild(ctrl);
  tab.appendChild(wrap);

  const ctx = cv.getContext('2d');
  const W = 820, H = 420;

  const TEAMS = [
    {
      name: 'Analytics', x: 180, color: '#3B82F6',
      answer: '1.8M', definition: 'Active in last 30 days',
      sql: 'WHERE last_event_at > NOW() - 30d',
    },
    {
      name: 'Marketing', x: 410, color: '#FF6B35',
      answer: '2.1M', definition: 'Ever signed up + clicked email',
      sql: 'WHERE signup_date IS NOT NULL',
    },
    {
      name: 'Finance', x: 640, color: '#4ECDC4',
      answer: '1.6M', definition: 'Paid subscriber, active plan',
      sql: 'WHERE plan_status = \'active\'',
    },
  ];

  const CEO_X = W/2, CEO_Y = 55;

  let state;
  function init() {
    state = {
      time: 0,
      questionOp: 0,
      bubbles: TEAMS.map(() => ({ progress: 0, opacity: 0 })),
      conflictOp: 0,
    };
  }
  init();
  ctrl.querySelector('#m06-reset').addEventListener('click', init);

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
    const t = state.time;

    state.questionOp = Math.min(1, t / 0.8);
    TEAMS.forEach((_, i) => {
      const delay = 1.2 + i * 0.6;
      state.bubbles[i].opacity = Math.min(1, Math.max(0, (t - delay) * 3));
      state.bubbles[i].progress = Math.min(1, Math.max(0, (t - delay) * 0.8));
    });
    state.conflictOp = Math.min(1, Math.max(0, (t - 4.0) * 1.5));

    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);

    // CEO bubble
    ctx.globalAlpha = state.questionOp;
    rr(ctx, CEO_X - 150, 16, 300, 54, 10, '#1E2D43', '#F59E0B');
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👔  CEO', CEO_X - 80, 36);
    ctx.fillStyle = '#CBD4E6';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('"How many active users do we have?"', CEO_X + 20, 48);
    ctx.globalAlpha = 1;

    // Teams + rising answer bubbles
    TEAMS.forEach((team, i) => {
      const b = state.bubbles[i];
      if (b.opacity < 0.01) return;

      const TEAM_Y = H - 90;
      const BUB_TOP = 90;
      const bubY = TEAM_Y - b.progress * (TEAM_Y - BUB_TOP - 80);

      // Team box
      ctx.save();
      ctx.globalAlpha = b.opacity;
      rr(ctx, team.x - 80, TEAM_Y, 160, 50, 8, '#131D2E', team.color + '88');
      ctx.fillStyle = team.color;
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(team.name, team.x, TEAM_Y + 22);
      ctx.fillStyle = '#4B5E78';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(team.sql, team.x, TEAM_Y + 38);

      // Rising answer bubble
      const bx = team.x, by = bubY;
      rr(ctx, bx - 64, by, 128, 66, 10, '#131D2E', team.color);
      ctx.fillStyle = team.color;
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(team.answer, bx, by + 30);
      ctx.fillStyle = '#8895AA';
      ctx.font = '9px Inter, sans-serif';
      ctx.fillText(team.definition, bx, by + 46);
      // Bubble tail
      ctx.beginPath();
      ctx.moveTo(bx - 8, by + 66);
      ctx.lineTo(bx + 8, by + 66);
      ctx.lineTo(bx, by + 80);
      ctx.closePath();
      ctx.fillStyle = team.color + '66'; ctx.fill();
      ctx.strokeStyle = team.color; ctx.lineWidth = 1; ctx.stroke();

      // Connector line to CEO
      if (b.progress > 0.3) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, (b.progress - 0.3) * 3) * 0.25;
        ctx.strokeStyle = team.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(team.x, by);
        ctx.lineTo(CEO_X, 70);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    });

    // Conflict zone
    if (state.conflictOp > 0) {
      ctx.save();
      ctx.globalAlpha = state.conflictOp;

      // Three different numbers, highlighted
      TEAMS.forEach((team, i) => {
        const ix = [220, 410, 600][i];
        ctx.fillStyle = team.color + '22';
        ctx.fillRect(ix - 42, 88, 84, 80);
        ctx.strokeStyle = team.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ix - 42, 88, 84, 80);
        ctx.fillStyle = team.color;
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(team.answer, ix, 132);
      });

      // Conflict lines between answers
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(262, 128); ctx.lineTo(368, 128); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(452, 128); ctx.lineTo(558, 128); ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('≠', 315, 134);
      ctx.fillText('≠', 505, 134);

      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText('Which number do we put in the board deck?', W/2, H - 30);
      ctx.fillStyle = '#8895AA';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText('All three teams are using "correct" SQL. None agree. Trust is broken.', W/2, H - 12);
      ctx.restore();
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>Why trust collapses silently and breaks loudly</h3>
      <p>Data trust erodes slowly over months — one slightly wrong number here, one mismatched dashboard there. But it collapses in a single moment: the board presentation where two executives cite different revenue figures from the same quarter. Or the CEO meeting where three teams give three answers to one question.</p>
      <p>Once that moment happens, stakeholders don't just distrust the specific number — they distrust <em>all</em> the data. The data team gets labeled "unreliable," and the business goes back to spreadsheets and gut instinct.</p>
    </div>
    <div class="detail-section">
      <h3>The "active user" definition problem</h3>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Team</th><th>Definition</th><th>Count</th><th>Use case</th></tr></thead>
          <tbody>
            <tr><td>Analytics</td><td>Event in last 30 days</td><td>1.8M</td><td>Engagement metrics</td></tr>
            <tr><td>Marketing</td><td>Signed up + clicked any email</td><td>2.1M</td><td>Reachable audience</td></tr>
            <tr><td>Finance</td><td>Active paid subscription</td><td>1.6M</td><td>Revenue forecasting</td></tr>
          </tbody>
        </table>
      </div>
      <p>All three definitions are internally consistent. All three are "correct" for their use case. But when the CEO asks one question, they create organizational confusion — and make the data team look like they don't know what they're doing.</p>
    </div>
    <div class="detail-section">
      <h3>Examples from major companies</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#FF6B35">
          <div class="info-card-title">Netflix</div>
          <div class="info-card-tag" style="color:#FF6B35;background:#FF6B3522">Subscriber Count</div>
          <div class="info-card-body">Multiple subscriber definitions existed internally: paid subscribers, trial users, household profiles. Different teams cited different numbers. Netflix solved this with a central metrics layer.</div>
        </div>
        <div class="info-card" style="border-left-color:#4ECDC4">
          <div class="info-card-title">Healthcare</div>
          <div class="info-card-tag" style="color:#4ECDC4;background:#4ECDC422">Patient Count</div>
          <div class="info-card-body">"How many patients does this hospital serve?" had 4 answers depending on whether you counted discharges, visits, unique individuals, or individuals with active care plans. A compliance audit caught the inconsistency.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>What problem did this module show?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Without a shared definition layer, every team optimizes for their own metrics — creating a crisis of trust when leadership tries to make a single decision from multiple data sources.</p>
    </div>
  `;
}
