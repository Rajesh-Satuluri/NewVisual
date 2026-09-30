import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Data ────────────────────────────────────────────────────────────────────*/
// Show how the planner cost model picks between seq scan vs index scan
// and how miscalibrated costs lead to wrong choices

const SCENARIOS = [
  {
    label: 'Overview',
    seqScan:  { cost: null, chosen: false },
    idxScan:  { cost: null, chosen: false },
    desc: 'The PostgreSQL cost model assigns a numeric cost to each candidate plan. The planner picks the minimum-cost plan. Costs are not wall-clock seconds — they are abstract units combining CPU and I/O cost estimates, calibrated by GUC parameters.',
    highlight: 'formula',
  },
  {
    label: 'Seq Scan',
    rows: 1000000, pages: 8000, selectivity: 0.001,
    seqScan:  { cost: 38400, chosen: true },
    idxScan:  { cost: 1600, chosen: false },
    desc: 'Table: 1M rows, 8000 pages, selectivity=0.1% (1000 matching rows). Seq Scan cost = seq_page_cost×8000 + cpu_tuple_cost×1M = 8000 + 15000 = 23000. Index Scan cost ≈ random_page_cost×1000 + cpu_index_tuple×1000 = 4000 + 100 = 4100. Planner correctly chooses Index Scan.',
  },
  {
    label: 'Seq Scan Wins',
    rows: 1000000, pages: 8000, selectivity: 0.4,
    seqScan:  { cost: 23000, chosen: true },
    idxScan:  { cost: 1640000, chosen: false },
    desc: 'Same table, selectivity=40% (400K matching rows). Seq Scan cost = 23000 (unchanged). Index Scan now costs random_page_cost×400000 + cpu×400000 ≈ 1.6M — each matching row requires a random page read via the index. Seq Scan wins — sequential I/O beats 400K random reads.',
  },
  {
    label: 'SSD vs HDD',
    rows: 1000000, pages: 8000, selectivity: 0.001,
    seqScan:  { cost: 23000, chosen: false },
    idxScan:  { cost: 1050, chosen: true },
    desc: 'Same as step 2 but random_page_cost=1.1 (SSD). Index Scan cost drops to ≈ 1100+100=1200 cost units. Seq Scan still 23000. On SSDs, random reads are much cheaper — correctly reflected by reducing random_page_cost from 4.0 to 1.1 to match actual hardware.',
  },
  {
    label: 'Stale Stats',
    rows: 1000000, pages: 8000, selectivity: 0.001,
    seqScan:  { cost: 23000, chosen: true, warning:'stale statistics: planner estimated 400K rows' },
    idxScan:  { cost: 1600, chosen: false },
    desc: 'STALE STATISTICS: table has grown from 100K to 1M rows since last ANALYZE. Planner still thinks the table has 100K rows and selectivity=40% (not 0.1%). It estimates 40K results → seq scan appears cheaper than index scan. Wrong plan chosen. Fix: run ANALYZE or increase autovacuum analyze frequency.',
  },
];

const PARAMS = [
  { name:'seq_page_cost',    default:'1.0',  ssd:'1.0',  desc:'Cost to fetch one sequential page from disk' },
  { name:'random_page_cost', default:'4.0',  ssd:'1.1',  desc:'Cost to fetch one random page (HDD: 4×, SSD: ~1×)' },
  { name:'cpu_tuple_cost',   default:'0.01', ssd:'0.01', desc:'Cost to process one tuple (CPU filter, copy)' },
  { name:'cpu_index_tuple_cost', default:'0.005', ssd:'0.005', desc:'Cost to process one index entry' },
  { name:'cpu_operator_cost', default:'0.0025', ssd:'0.0025', desc:'Cost per operator evaluation (=, <, LIKE)' },
  { name:'effective_cache_size', default:'4GB', ssd:'16GB', desc:'Planner\'s estimate of OS page cache — affects index choice' },
];

/* ── Canvas ──────────────────────────────────────────────────────────────────*/
const BAR_COLORS = { seqScan: '#4F46E5', idxScan: '#10B981' };

function drawCostModel(ctx, stepIdx, w, h) {
  const sc = SCENARIOS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  if (sc.highlight === 'formula') {
    // Overview — show formula
    ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(16, 20, w - 32, h - 40, 8); ctx.fill(); ctx.stroke();

    const items = [
      { label:'Seq Scan cost', formula:'= seq_page_cost × pages + cpu_tuple_cost × rows', color:'#4F46E5' },
      { label:'Index Scan cost', formula:'= (random_page_cost × matching_rows) + (cpu_index_tuple_cost × index_entries)', color:'#10B981' },
      { label:'Hash Join cost', formula:'= outer_cost + inner_cost + cpu_operator_cost × outer_rows × inner_rows / hash_buckets', color:'#F59E0B' },
      { label:'Sort cost', formula:'= 2 × cpu_operator_cost × N × log(N) (in-memory) or disk-based if > work_mem', color:'#06B6D4' },
    ];
    ctx.fillStyle = '#64748B'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Cost Formula Reference', w / 2, 40);

    items.forEach((item, i) => {
      const iy = 60 + i * 50;
      ctx.fillStyle = item.color + '22'; ctx.strokeStyle = item.color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(26, iy, w - 52, 40, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = item.color; ctx.font = '700 9px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(item.label, 36, iy + 15);
      ctx.fillStyle = '#94A3B8'; ctx.font = '9px monospace';
      ctx.fillText(item.formula, 36, iy + 30);
    });
    ctx.textAlign = 'left'; return;
  }

  // Bar chart comparison
  const maxCost = Math.max(sc.seqScan.cost || 0, sc.idxScan.cost || 0);
  const barAreaH = h - 120;
  const barW = (w - 80) / 2 - 20;
  const barBaseY = h - 60;

  const plans = [
    { label:'Seq Scan', key:'seqScan', data: sc.seqScan },
    { label:'Index Scan', key:'idxScan', data: sc.idxScan },
  ];

  plans.forEach((p, i) => {
    const bx = 40 + i * ((w - 80) / 2);
    const col = BAR_COLORS[p.key];
    const barH = (p.data.cost / maxCost) * barAreaH;
    const by = barBaseY - barH;

    // Bar
    ctx.fillStyle = p.data.chosen ? col + '66' : col + '22';
    ctx.strokeStyle = p.data.chosen ? col : col + '66';
    ctx.lineWidth = p.data.chosen ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(bx, by, barW, barH, 4); ctx.fill(); ctx.stroke();

    // Winner badge
    if (p.data.chosen) {
      ctx.fillStyle = col; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('✓ CHOSEN', bx + barW / 2, by - 8);
    }

    // Cost label
    ctx.fillStyle = p.data.chosen ? col : '#64748B';
    ctx.font = `700 ${p.data.chosen ? '10' : '9'}px system-ui`; ctx.textAlign = 'center';
    ctx.fillText(p.data.cost ? p.data.cost.toLocaleString() : '—', bx + barW / 2, by - (p.data.chosen ? 22 : 8));

    // Label below
    ctx.fillStyle = '#94A3B8'; ctx.font = '8px system-ui';
    ctx.fillText(p.label, bx + barW / 2, barBaseY + 14);

    // Warning
    if (p.data.warning) {
      ctx.fillStyle = '#EF4444'; ctx.font = '700 7.5px system-ui';
      const words = p.data.warning.split(' ');
      ctx.fillText('⚠ ' + words.slice(0,3).join(' '), bx + barW / 2, barBaseY + 28);
      ctx.fillText(words.slice(3).join(' '), bx + barW / 2, barBaseY + 40);
    }
  });

  // Baseline
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(20, barBaseY); ctx.lineTo(w - 20, barBaseY); ctx.stroke();

  // Stats
  if (sc.selectivity !== undefined) {
    ctx.fillStyle = '#475569'; ctx.font = '8px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`rows: ${sc.rows.toLocaleString()}  pages: ${sc.pages}  selectivity: ${(sc.selectivity * 100).toFixed(1)}%  matching: ${Math.round(sc.rows * sc.selectivity).toLocaleString()}`, 20, 16);
  }
  ctx.textAlign = 'left';
}

/* ── Params tab ──────────────────────────────────────────────────────────────*/
function renderParamsTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">Cost Model Parameters</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
    <thead><tr style="background:#0F172A">
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Parameter</th>
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">HDD default</th>
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">SSD setting</th>
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Purpose</th>
    </tr></thead>
    <tbody>
      ${PARAMS.map(p => `<tr style="border-bottom:1px solid #0F172A">
        <td style="padding:7px 10px;color:#F59E0B;font-family:monospace;font-size:11px">${p.name}</td>
        <td style="padding:7px 10px;color:#94A3B8;font-family:monospace;font-size:11px">${p.default}</td>
        <td style="padding:7px 10px;color:#10B981;font-family:monospace;font-size:11px">${p.ssd}</td>
        <td style="padding:7px 10px;font-size:11px">${p.desc}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">Table Statistics (pg_statistic)</h3>
  <p style="font-size:12px;margin:0 0 12px">The planner uses statistics collected by ANALYZE: row count, page count, column histograms, MCV (most common values) lists, and correlation. Without accurate statistics, selectivity estimates are wrong and the planner picks bad plans.</p>
  <pre style="background:#0F172A;border:1px solid #1E293B;border-radius:6px;padding:12px;font-size:10.5px;color:#94A3B8;overflow-x:auto">
-- Check table statistics age
SELECT relname, n_live_tup, n_dead_tup, last_analyze, last_autoanalyze
FROM pg_stat_user_tables ORDER BY last_analyze ASC NULLS FIRST;

-- Increase statistics target for a skewed column (default 100 buckets)
ALTER TABLE orders ALTER COLUMN region SET STATISTICS 500;
ANALYZE orders;

-- See the histogram PostgreSQL built
SELECT histogram_bounds FROM pg_stats
WHERE tablename='orders' AND attname='region';</pre>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'How does the PostgreSQL planner estimate the cost of a sequential scan vs an index scan, and when does it get it wrong?',
      a: `Sequential scan cost = <code>seq_page_cost × n_pages + cpu_tuple_cost × n_rows</code>. With defaults (seq_page_cost=1.0), a 8000-page table costs 8000 + 15000 = 23000 cost units regardless of selectivity — you always read the whole table.<br><br>
Index scan cost = <code>random_page_cost × estimated_rows + cpu_index_tuple_cost × index_entries</code>. With random_page_cost=4.0 (HDD) and 1000 matching rows: 4000 + 100 = 4100. Much cheaper than seq scan for 0.1% selectivity.<br><br>
When it goes wrong: (1) <strong>Stale statistics</strong> — if ANALYZE hasn't run since a bulk load, n_rows is wrong, selectivity estimate is wrong, and the planner may pick seq scan when index would be faster (or vice versa). (2) <strong>Miscalibrated random_page_cost</strong> — on SSD, random_page_cost=4.0 overestimates random I/O cost by 4×, making the planner prefer seq scans when index would be better. Set random_page_cost=1.1 for SSD. (3) <strong>Correlated data</strong> — if rows with matching values are clustered on disk, an index scan is cheaper than the planner estimates (fewer random reads). pg_stats.correlation captures this.`,
    },
    {
      q: 'What is the statistics target in PostgreSQL, and when should you increase it?',
      a: `The statistics target controls how much information ANALYZE collects per column: (1) the size of the histogram (number of buckets capturing value distribution), (2) the Most Common Values (MCV) list size, and (3) the number of null fractions computed. The default is 100 for all columns.<br><br>
Increase it when: a column has a highly non-uniform distribution (most values in 3–4 categories but a long tail) and queries on that column consistently pick bad plans. A statistics target of 500 gives the planner a more detailed histogram — selectivity estimates for predicates on that column are more accurate.<br><br>
The downside: higher targets make ANALYZE slower and pg_statistic larger. Only increase for columns where plan quality is demonstrably wrong. Per-column targets are set with <code>ALTER TABLE t ALTER COLUMN c SET STATISTICS 500</code>. After changing, run <code>ANALYZE t</code> to rebuild statistics with the new target.`,
    },
    {
      q: 'What is effective_cache_size and how does it influence plan choice without changing actual memory allocation?',
      a: `<code>effective_cache_size</code> is a <strong>planner hint</strong>, not an allocation — PostgreSQL does not allocate this much memory. It tells the planner how much data it can expect to be in the OS page cache (shared_buffers + OS cache combined). The planner uses this to estimate the probability that a random page read hits the cache vs goes to disk.<br><br>
How it influences plan choice: a higher effective_cache_size makes random reads appear cheaper (the planner assumes more data is cached → lower effective random I/O cost). This makes index scans more attractive relative to sequential scans, because the planner believes the index's random pages are likely already in memory.<br><br>
Setting guidelines: set to total available RAM × 0.75 on a dedicated DB server. For example, 32GB RAM → effective_cache_size='24GB'. A misconfigured low value (e.g., the default 4GB on a 32GB server) causes the planner to pessimistically overestimate random I/O cost → prefers seq scans over index scans even when the index data is hot in memory.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Performance',
    title: 'Query Cost Model',
    subtitle: 'How the planner estimates seq scan vs index scan costs, why it gets it wrong, and how to calibrate cost parameters for SSDs',
    tabs: [
      { id:'anim',   label:'Cost Comparison' },
      { id:'params', label:'Cost Parameters' },
      { id:'iq',     label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = SCENARIOS.map((s, i) => ({ label: s.label, duration: 2800, mutate: st => { st.stepIdx = i; } }));
      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 }, steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; ctx.scale(pr, pr);
          drawCostModel(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = SCENARIOS[i].desc; });
      desc.textContent = SCENARIOS[0].desc;
      return () => engine.destroy();
    },
    params: renderParamsTab,
    iq:     renderIQ,
  });
  return null;
}
