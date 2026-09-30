import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { IQ_BANK } from '../data/iq-bank.js';

// ── Timeline data ─────────────────────────────────────────────────────────
const TIMELINE = [
  {
    id: 'hadoop',
    year: '2006',
    name: 'Hadoop MapReduce',
    icon: '🐘',
    color: '#F59E0B',
    colorDim: 'rgba(245,158,11,0.15)',
    desc: "Google's MapReduce paper sparked Apache Hadoop. Data engineers ran batch jobs — read all data, process, write results. Revolutionary for big data analytics, but fundamentally designed for batch.",
    problems: [
      { label: 'Job latency',       value: '30–60 min', pct: 95, color: '#F87171' },
      { label: 'State management',  value: 'None',      pct: 100, color: '#F87171' },
      { label: 'Event time support',value: 'None',      pct: 100, color: '#F87171' },
      { label: 'Throughput',        value: 'Medium',    pct: 40, color: '#FCD34D' },
    ],
    uber: "Uber's fraud detection ran Hadoop jobs every <strong>45 minutes</strong>. A fraudulent driver could complete 6 trips before detection. GPS data was analyzed only <em>after</em> the trip ended — useless for real-time safety.",
    verdict: '❌ Too slow for Uber\'s real-time needs',
  },
  {
    id: 'storm',
    year: '2011',
    name: 'Apache Storm',
    icon: '⛈️',
    color: '#8B5CF6',
    colorDim: 'rgba(139,92,246,0.15)',
    desc: 'Twitter open-sourced Storm, a true low-latency streaming engine. Events processed one at a time, millisecond latency. The first real attempt at true stream processing at scale.',
    problems: [
      { label: 'State management',   value: 'None',       pct: 100, color: '#F87171' },
      { label: 'Exactly-once',       value: 'At-most-once', pct: 100, color: '#F87171' },
      { label: 'Windowing',          value: 'Manual only', pct: 80, color: '#F87171' },
      { label: 'Latency',            value: '< 100ms',    pct: 8,  color: '#34D399' },
    ],
    uber: 'Storm could process GPS events in real time, but had <strong>no built-in state</strong>. Tracking "how many trips has this driver completed today?" required an external Redis call on every event — adding latency and complexity. Failures caused <strong>duplicate events</strong> silently.',
    verdict: '⚠️ Fast but unreliable — no state, no guarantees',
  },
  {
    id: 'spark',
    year: '2013',
    name: 'Spark Streaming',
    icon: '✨',
    color: '#EC4899',
    colorDim: 'rgba(236,72,153,0.15)',
    desc: 'Databricks introduced Spark Streaming — micro-batch processing disguised as streaming. Break the stream into small batches (500ms–10s). Rich APIs, good SQL support, but fundamentally still batch.',
    problems: [
      { label: 'Min latency',      value: '500ms+',    pct: 45, color: '#FCD34D' },
      { label: 'True streaming',   value: 'Micro-batch', pct: 100, color: '#F87171' },
      { label: 'Event time',       value: 'Partial',   pct: 60, color: '#FCD34D' },
      { label: 'Throughput',       value: 'High',      pct: 15, color: '#34D399' },
    ],
    uber: 'Spark Streaming gave Uber better APIs, but ETAs were still <strong>500ms+ stale</strong> — a driver could move 15 meters in that time. Micro-batch jitter caused inconsistent latencies. Out-of-order GPS events (from tunnels/buildings) were processed in wrong time order.',
    verdict: '⚠️ Better APIs, but micro-batch isn\'t streaming',
  },
  {
    id: 'samza',
    year: '2013',
    name: 'Apache Samza',
    icon: '📨',
    color: '#14B8A6',
    colorDim: 'rgba(20,184,166,0.15)',
    desc: 'LinkedIn open-sourced Samza, tightly integrated with Kafka and YARN. First-class stateful streaming with RocksDB. Good for LinkedIn\'s use case but tightly coupled to their stack.',
    problems: [
      { label: 'Kafka dependency',  value: 'Required', pct: 100, color: '#F87171' },
      { label: 'Windowing',         value: 'Limited',  pct: 75, color: '#F87171' },
      { label: 'SQL / Table API',   value: 'None',     pct: 100, color: '#F87171' },
      { label: 'Stateful ops',      value: 'Good',     pct: 20, color: '#34D399' },
    ],
    uber: "Samza required Kafka for everything — Uber's data came from custom TCP streams and S3. <strong>Temporal joins</strong> (joining driver location with pricing zone) required workarounds. No built-in windowed aggregations meant engineers wrote boilerplate for every pipeline.",
    verdict: '⚠️ Good state, but Kafka-locked with weak windowing',
  },
  {
    id: 'kafka-streams',
    year: '2016',
    name: 'Kafka Streams',
    icon: '🔗',
    color: '#06B6D4',
    colorDim: 'rgba(6,182,212,0.15)',
    desc: 'Confluent released Kafka Streams as a library (not a cluster). No separate infrastructure — runs inside your application. Perfect for Kafka-native companies with simple streaming needs.',
    problems: [
      { label: 'Requires Kafka',    value: 'Always',   pct: 100, color: '#F87171' },
      { label: 'Complex analytics', value: 'Limited',  pct: 70, color: '#F87171' },
      { label: 'Multi-source joins',value: 'None',     pct: 90, color: '#F87171' },
      { label: 'Deployment',        value: 'Simple',   pct: 5, color: '#34D399' },
    ],
    uber: 'Kafka Streams couldn\'t join GPS streams with <strong>Iceberg trip history</strong> or Snowflake pricing data. Uber needed to join 8+ data sources per pipeline. The library model also couldn\'t scale operators independently — you scaled the whole app.',
    verdict: '⚠️ Great for Kafka-native, not for complex multi-source pipelines',
  },
  {
    id: 'flink',
    year: '2015',
    name: 'Apache Flink',
    icon: '⚡',
    color: '#FF6B35',
    colorDim: 'rgba(255,107,53,0.15)',
    desc: 'Born from the Stratosphere research project at TU Berlin. Flink is a <em>true</em> streaming engine with built-in state, event time, watermarks, exactly-once semantics, and rich windowing. Adopted at scale by Uber, Netflix, Alibaba, and Lyft.',
    problems: [
      { label: 'Latency',           value: '< 10ms',   pct: 5,  color: '#34D399' },
      { label: 'Exactly-once',      value: '✓ Native', pct: 5,  color: '#34D399' },
      { label: 'Event time',        value: '✓ First-class', pct: 5, color: '#34D399' },
      { label: 'Stateful ops',      value: '✓ RocksDB', pct: 5, color: '#34D399' },
    ],
    uber: '<strong>Uber adopted Flink in 2016.</strong> Real-time fraud detection now catches fraud within <strong>10ms</strong>. ETA updates every GPS ping. Driver location state stored in Flink\'s RocksDB. Checkpointing means zero data loss on worker failure. 100+ Flink jobs run at Uber today.',
    verdict: '✅ True streaming — the right tool for Uber\'s needs',
  },
];

const WINS = [
  { icon: '⏱️', title: 'True Low Latency',       desc: 'Sub-10ms event-to-output. Process each GPS ping the moment it arrives, not in batches.' },
  { icon: '🔄', title: 'Exactly-Once Semantics', desc: 'Checkpoint barriers guarantee no duplicates, no data loss — even on worker failure.' },
  { icon: '⏰', title: 'Event Time Processing',   desc: 'GPS events from tunnels arrive late? Flink handles out-of-order events with watermarks.' },
  { icon: '🗄️', title: 'Rich Stateful Ops',       desc: 'Track driver trips, running averages, and fraud patterns across millions of keys.' },
  { icon: '🔀', title: 'Unified Batch + Stream',  desc: 'Same API for both batch and streaming — one codebase for all pipeline types.' },
  { icon: '📈', title: 'Massive Scalability',     desc: 'Horizontally scalable to thousands of parallel tasks. Uber runs 1M+ events/sec.' },
];

// Interview Q&A now lives in data/iq-bank.js (content/rendering split) so the
// Study Hub can aggregate it. Rendered below via IQ_BANK.m01.

// ── Render ────────────────────────────────────────────────────────────────
export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: '01 · Foundation · Uber Edition',
    title: 'Why Apache Flink?',
    subtitle: "The evolution of stream processing — from Hadoop's 45-minute batch jobs to Flink's sub-10ms real-time pipelines powering Uber at 1M+ events per second.",
    tabs: [
      { id: 'story',      label: '🚗 Uber Story' },
      { id: 'evolution',  label: '📅 Evolution Timeline' },
      { id: 'comparison', label: '📊 System Comparison' },
      { id: 'interview',  label: '🎤 Interview Q&A' },
    ],
  });

  initTabs(container);
  initTabs(container);

  // ── Tab: Uber Story ──
  document.getElementById('tab-story').innerHTML = buildStoryTab();

  // ── Tab: Evolution Timeline ──
  document.getElementById('tab-evolution').innerHTML = buildTimelineTab();
  initTimeline(container);

  // ── Tab: Comparison ──
  document.getElementById('tab-comparison').innerHTML = buildComparisonTab();

  // ── Tab: Interview ──
  document.getElementById('tab-interview').innerHTML = createIQSection(IQ_BANK.m01);
  initIQ(container);

  // Animate stats counter when story tab visible
  animateStats();

  return () => {};
}

// ── Story Tab ─────────────────────────────────────────────────────────────
function buildStoryTab() {
  return `
    <div class="uber-story-banner anim-fade-up">
      <div class="story-label">🚗 The Uber Problem · August 2016</div>
      <h3>14 Million Trips Per Day.<br>Zero Tolerance for Latency.</h3>
      <p>
        Uber's engineering team faced a critical challenge: they needed to detect fraudulent trips,
        calculate real-time ETAs, track 3M+ drivers simultaneously, and process payment events —
        all within <strong>milliseconds</strong>, not minutes. Hadoop was running fraud detection jobs
        every 45 minutes. By the time fraud was detected, the driver had already completed 6 more trips.
      </p>
      <div class="uber-stats stagger">
        <div class="uber-stat">
          <span class="stat-val" data-target="14">0</span>
          <span class="stat-label">Million trips/day</span>
        </div>
        <div class="uber-stat">
          <span class="stat-val" data-target="3">0</span>
          <span class="stat-label">Million active drivers</span>
        </div>
        <div class="uber-stat">
          <span class="stat-val" data-target="1">0</span>
          <span class="stat-label">Million events/sec</span>
        </div>
        <div class="uber-stat">
          <span class="stat-val" data-suffix="ms" data-target="10">45min</span>
          <span class="stat-label">Target fraud detection latency</span>
        </div>
      </div>
    </div>

    <div class="section-header">
      <div class="section-title">What Flink Gave Uber</div>
      <div class="section-desc">Six capabilities that solved the real-time data engineering problem</div>
    </div>
    <div class="win-grid stagger">
      ${WINS.map(w => `
        <div class="win-card">
          <div class="win-icon">${w.icon}</div>
          <div class="win-title">${w.title}</div>
          <div class="win-desc">${w.desc}</div>
        </div>
      `).join('')}
    </div>

    <div style="margin-top:32px">
      <div class="section-header">
        <div class="section-title">The Before & After</div>
        <div class="section-desc">How Flink transformed Uber's data engineering stack</div>
      </div>
      <div class="grid-2" style="gap:20px;margin-top:16px">
        <div class="card accent-red">
          <div style="font-size:13px;font-weight:700;color:var(--red);margin-bottom:14px;letter-spacing:0.5px">BEFORE FLINK (Hadoop)</div>
          <div class="before-after-list">
            ${[
              'Fraud detection: 45-minute lag',
              'ETA updated every 5 minutes',
              'GPS analysis only after trip ends',
              'No real-time driver state tracking',
              'Batch jobs failed silently — no replay',
              'Separate codebase for batch vs streaming',
            ].map(i => `<div style="display:flex;gap:10px;margin-bottom:10px;font-size:13.5px;color:var(--text-secondary)">
              <span style="color:var(--red);font-size:12px;flex-shrink:0;margin-top:2px">✕</span>
              <span>${i}</span>
            </div>`).join('')}
          </div>
        </div>
        <div class="card accent-green">
          <div style="font-size:13px;font-weight:700;color:var(--green);margin-bottom:14px;letter-spacing:0.5px">AFTER FLINK (2016+)</div>
          <div class="after-list">
            ${[
              'Fraud detection: < 10ms per event',
              'ETA recalculated every GPS ping',
              'Live driver location in Flink state',
              'Driver trip history in RocksDB state',
              'Exactly-once via checkpoint recovery',
              'Same Flink job handles batch history + live stream',
            ].map(i => `<div style="display:flex;gap:10px;margin-bottom:10px;font-size:13.5px;color:var(--text-secondary)">
              <span style="color:var(--green);font-size:12px;flex-shrink:0;margin-top:2px">✓</span>
              <span>${i}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Timeline Tab ──────────────────────────────────────────────────────────
function buildTimelineTab() {
  return `
    <div class="section-header">
      <div class="section-title">The Evolution of Stream Processing</div>
      <div class="section-desc">Click each system to explore its architecture, problems, and impact on Uber</div>
    </div>

    <div class="timeline-wrap">
      <div class="timeline-track">
        <div class="timeline-line"></div>
        <div class="timeline-line-glow" id="timeline-glow"></div>
        <div class="timeline-nodes" id="timeline-nodes">
          ${TIMELINE.map((t, i) => `
            <div class="t-node ${t.id === 'flink' ? 'flink' : ''}" data-idx="${i}" style="--node-color:${t.color}">
              <div class="t-dot" style="border-color:${t.color};--node-color:${t.color}">${t.icon}</div>
              <div class="t-year">${t.year}</div>
              <div class="t-name">${t.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="timeline-detail" id="timeline-detail">
      <div style="text-align:center;color:var(--text-muted);font-size:14px;padding:40px 0">
        ↑ Click any system above to explore its architecture and problems
      </div>
    </div>
  `;
}

function initTimeline(container) {
  const nodes = container.querySelectorAll('.t-node');
  const detail = container.querySelector('#timeline-detail');
  const glow   = container.querySelector('#timeline-glow');

  // Auto-select Flink after 800ms
  setTimeout(() => {
    const flinkNode = container.querySelector('.t-node.flink');
    if (flinkNode) flinkNode.click();
  }, 800);

  nodes.forEach((node, i) => {
    node.addEventListener('click', () => {
      nodes.forEach(n => n.classList.remove('active'));
      node.classList.add('active');

      const t = TIMELINE[i];
      const pct = ((i) / (TIMELINE.length - 1)) * 100;
      if (glow) glow.style.width = pct + '%';

      detail.classList.remove('visible');
      setTimeout(() => {
        detail.innerHTML = buildDetailPanel(t);
        detail.classList.add('visible');

        // Animate problem bars
        setTimeout(() => {
          detail.querySelectorAll('.problem-bar').forEach(bar => {
            const target = bar.dataset.pct;
            bar.style.width = target + '%';
          });
        }, 100);
      }, 150);
    });
  });
}

function buildDetailPanel(t) {
  const isFlink = t.id === 'flink';
  return `
    <div class="td-header">
      <div class="td-icon">${t.icon}</div>
      <div class="td-info">
        <div class="td-name" style="color:${t.color}">${t.name}</div>
        <div class="td-year-badge">📅 ${t.year} &nbsp;·&nbsp; <span style="color:${isFlink ? 'var(--green)' : 'var(--text-muted)'}">${t.verdict}</span></div>
      </div>
    </div>
    <p class="td-desc">${t.desc}</p>

    <div class="problems-header">${isFlink ? 'PERFORMANCE PROFILE' : 'PROBLEM PROFILE'}</div>
    ${t.problems.map(p => `
      <div class="problem-row">
        <div class="problem-label">${p.label}</div>
        <div class="problem-bar-wrap">
          <div class="problem-bar" data-pct="${p.pct}" style="--bar-color:${p.color};background:${p.color}"></div>
        </div>
        <div class="problem-value" style="color:${p.color}">${p.value}</div>
      </div>
    `).join('')}

    <div class="td-uber">
      <span class="uber-tag">🚗 UBER IMPACT</span>
      ${t.uber}
    </div>
  `;
}

// ── Comparison Tab ────────────────────────────────────────────────────────
function buildComparisonTab() {
  const rows = [
    { feature: 'Processing model',  hadoop: 'Batch',         storm: 'True stream',  spark: 'Micro-batch',    samza: 'True stream',  kafka: 'True stream',  flink: 'True stream' },
    { feature: 'Latency',           hadoop: '30–60 min',     storm: '< 100ms',      spark: '500ms+',         samza: '< 100ms',      kafka: '< 100ms',      flink: '< 10ms' },
    { feature: 'Stateful ops',      hadoop: '✗',             storm: '✗',            spark: '~',              samza: '✓',            kafka: '✓',            flink: '✓' },
    { feature: 'Exactly-once',      hadoop: '~',             storm: '✗',            spark: '~',              samza: '✓',            kafka: '✓',            flink: '✓' },
    { feature: 'Event time',        hadoop: '✗',             storm: '✗',            spark: '~',              samza: '✗',            kafka: '~',            flink: '✓' },
    { feature: 'Watermarks',        hadoop: '✗',             storm: '✗',            spark: '~',              samza: '✗',            kafka: '✗',            flink: '✓' },
    { feature: 'SQL / Table API',   hadoop: 'Hive (batch)',   storm: '✗',            spark: '✓',              samza: '✗',            kafka: 'KSQL',         flink: '✓' },
    { feature: 'Windowing',         hadoop: 'Manual',        storm: 'Manual',       spark: '✓',              samza: 'Limited',      kafka: '~',            flink: '✓ (4 types)' },
    { feature: 'Source flexibility',hadoop: 'Any',           storm: 'Any',          spark: 'Any',            samza: 'Kafka only',   kafka: 'Kafka only',   flink: 'Any' },
    { feature: 'Fault tolerance',   hadoop: 'Restart job',   storm: 'Replay',       spark: 'WAL/RDD',        samza: 'Kafka replay', kafka: 'Kafka offset', flink: 'Checkpoints' },
    { feature: 'Uber adoption',     hadoop: '2010–2015',     storm: 'Evaluated',    spark: '2014–2016',      samza: 'Evaluated',    kafka: 'Partial',      flink: '2016–present' },
  ];

  const check = v => {
    if (v === '✓') return `<span class="cell-check">✓</span>`;
    if (v === '✗') return `<span class="cell-cross">✗</span>`;
    if (v === '~') return `<span class="cell-partial">~</span>`;
    return v;
  };

  return `
    <div class="section-header">
      <div class="section-title">System Comparison</div>
      <div class="section-desc">How each streaming system handles the core requirements of Uber's platform</div>
    </div>
    <div style="overflow-x:auto;border-radius:var(--radius-lg);border:1px solid var(--border)">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th>🐘 Hadoop</th>
            <th>⛈️ Storm</th>
            <th>✨ Spark</th>
            <th>📨 Samza</th>
            <th>🔗 Kafka Str.</th>
            <th style="color:var(--accent-text)">⚡ Flink</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr ${r.feature === 'Uber adoption' ? 'class="highlight"' : ''}>
              <td>${r.feature}</td>
              <td>${check(r.hadoop)}</td>
              <td>${check(r.storm)}</td>
              <td>${check(r.spark)}</td>
              <td>${check(r.samza)}</td>
              <td>${check(r.kafka)}</td>
              <td><strong style="color:var(--accent-text)">${check(r.flink)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div style="margin-top:16px;font-size:12px;color:var(--text-muted);display:flex;gap:16px">
      <span><span class="cell-check">✓</span> Fully supported</span>
      <span><span class="cell-partial">~</span> Partial / workaround needed</span>
      <span><span class="cell-cross">✗</span> Not supported</span>
    </div>
  `;
}

// ── Animate counters ──────────────────────────────────────────────────────
function animateStats() {
  setTimeout(() => {
    document.querySelectorAll('.stat-val[data-target]').forEach(el => {
      const target = parseInt(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      let current = 0;
      const step = target / 30;
      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = Math.floor(current) + (suffix ? suffix : '+');
        if (current >= target) {
          el.textContent = target + (suffix ? suffix : 'M+');
          clearInterval(timer);
        }
      }, 40);
    });
  }, 600);
}
