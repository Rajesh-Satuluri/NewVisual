// Module 13 — Fault Tolerance & Restart Strategies
// Interactive failure simulator: pick a restart strategy, click "Inject Failure",
// watch the job fail and recover step-by-step with timeline visualization.

import { rideSpine, initRideSpine, rideCallout, scenarioList, pyCode } from '../components/story-ui.js';
import { casesByModule } from '../data/interview-cases.js';

const STRATEGIES = [
  {
    id: 'none',
    label: 'No Restart',
    icon: '🚫',
    color: '#ef4444',
    desc: 'Job fails immediately and is not restarted. Use only for batch jobs where you\'d rather know about failures immediately.',
    uber: 'Not used in Uber\'s streaming pipelines — any failure would drop GPS events. Only used in one-off batch analytics jobs where idempotent reruns are trivial.',
    config: `from pyflink.common import RestartStrategies
env.set_restart_strategy(
    RestartStrategies.no_restart())`,
    recovery: null,
    steps: [
      { t:0,   label:'TaskManager crash detected',    color:'#ef4444' },
      { t:800, label:'Job moves to FAILING state',     color:'#ef4444' },
      { t:1500,label:'Job moves to FAILED state ✗',   color:'#ef4444' },
    ],
  },
  {
    id: 'fixed',
    label: 'Fixed Delay',
    icon: '⏱️',
    color: '#f59e0b',
    desc: 'Restart up to N times, with a fixed delay between attempts. Simple and predictable. Default strategy in many Flink deployments.',
    uber: 'Used for non-critical aggregation jobs with a 10-attempt cap and 10s delay — enough to survive transient Kafka broker restarts without hammering the cluster.',
    config: `env.set_restart_strategy(
    RestartStrategies.fixed_delay_restart(
        10,       # max attempts
        10_000))  # delay between attempts (ms)`,
    recovery: { attempts:3, delay:10, window:null },
    steps: [
      { t:0,    label:'TaskManager crash detected',       color:'#ef4444' },
      { t:600,  label:'Job cancels all running tasks',    color:'#f59e0b' },
      { t:1200, label:'Wait 10s (fixed delay)',           color:'#6b7280' },
      { t:2000, label:'Restore state from checkpoint',   color:'#6366f1' },
      { t:2800, label:'Redeploy tasks on new slot',      color:'#3b82f6' },
      { t:3600, label:'Sources rewind to checkpoint',    color:'#8b5cf6' },
      { t:4200, label:'Job RUNNING — replaying events',  color:'#10b981' },
    ],
  },
  {
    id: 'exponential',
    label: 'Exponential Backoff',
    icon: '📈',
    color: '#6366f1',
    desc: 'Delay doubles on each attempt (with optional jitter), capping at a maximum. Prevents thundering herd when many jobs fail simultaneously.',
    uber: 'Uber\'s primary strategy for production fraud pipeline. Starts at 1s, doubles to 2s, 4s, 8s…, cap at 60s. Jitter ±20% avoids all jobs hammering ResourceManager simultaneously.',
    config: `env.set_restart_strategy(
    RestartStrategies.exponential_delay_restart(
        1_000,     # initial backoff (ms)
        60_000,    # max backoff (ms)
        2.0,       # multiplier
        300_000,   # reset threshold (ms)
        0.2))      # jitter factor`,
    recovery: { attempts:null, delay:'1s→2s→4s…→60s', window:null },
    steps: [
      { t:0,    label:'TaskManager crash detected',        color:'#ef4444' },
      { t:600,  label:'Job cancels tasks',                 color:'#f59e0b' },
      { t:1200, label:'Wait 1s (attempt 1)',               color:'#6b7280' },
      { t:1800, label:'Restore checkpoint + redeploy',     color:'#6366f1' },
      { t:2600, label:'Job RUNNING ✓',                    color:'#10b981' },
      { t:3200, label:'(If fail again → wait 2s, 4s…)',   color:'#6b7280' },
    ],
  },
  {
    id: 'failure-rate',
    label: 'Failure Rate',
    icon: '📉',
    color: '#10b981',
    desc: 'Restart as long as the failure rate stays below a threshold. If failures exceed N per time window, the job fails permanently.',
    uber: 'ETA prediction pipeline: allows up to 5 failures per 10 minutes. Occasional Kafka rebalances trigger restarts; sustained failures (bad deploy) are caught by the rate cap.',
    config: `env.set_restart_strategy(
    RestartStrategies.failure_rate_restart(
        5,          # max failures per window
        600_000,    # measurement window (ms)
        5_000))     # delay between attempts (ms)`,
    recovery: { attempts:null, delay:'5s fixed', window:'5 per 10min' },
    steps: [
      { t:0,    label:'Failure #1 in window',              color:'#ef4444' },
      { t:600,  label:'Failure rate: 1/5 — restart OK',   color:'#f59e0b' },
      { t:1200, label:'Wait 5s, restore, redeploy',       color:'#6366f1' },
      { t:2000, label:'Job RUNNING ✓',                   color:'#10b981' },
      { t:2800, label:'(If 5 failures in 10min → FAIL)', color:'#ef4444' },
    ],
  },
];

const IQS = [
  { q:'What is the role of checkpoints in Flink\'s fault tolerance?', a:'Checkpoints are the foundation. When a task fails, Flink cannot just restart from the beginning — data may be gone (Kafka TTL) or the job may have been running for days. Instead, Flink restores each operator\'s state from the latest completed checkpoint and rewinds sources (Kafka) to their checkpointed offsets. The job then replays the events between the checkpoint and the failure point. This guarantees that every event is processed (exactly-once or at-least-once depending on sink semantics).' },
  { q:'What happens to in-flight data between the checkpoint and the failure?', a:'It\'s replayed. When Flink restores from checkpoint at offset X, the Kafka source seeks back to offset X and re-reads all events from X to the current head. This replay is what gives exactly-once guarantees — the processing logic runs again on the same data. For Uber, this means ~30 seconds of GPS events (the checkpoint interval) are replayed. The sink must be idempotent or participate in 2PC (Kafka sink) to prevent duplicate output records.' },
  { q:'How does Flink know which TaskManager died and which tasks to restart?', a:'Each TaskManager sends periodic heartbeats to the JobManager (resourceManager.heartbeat.timeout). When heartbeats stop, the JM marks the TM as lost and all tasks running on it as FAILED. With the default FullJobRestartStrategy (full restart), all tasks in the job restart — even those on healthy TMs — to restore a consistent global state from the checkpoint. With RegionFailoverStrategy, only the "region" (set of connected operators) containing the failed task restarts, which is more efficient for large jobs.' },
  { q:'What is the difference between task-local recovery and full job restart?', a:'Full job restart (default): all tasks cancel and restart from checkpoint — simple but causes a full processing gap. Task-local recovery (Flink 1.10+): on TM death, only affected tasks restart; other tasks keep running. Works with RegionFailoverStrategy. The restarting tasks restore state from local RocksDB snapshots (downloaded from S3 only if local copy is missing), speeding up recovery. Uber uses task-local recovery with RocksDB to keep recovery time under 10 seconds even for 600MB state.' },
  { q:'How do you prevent a bad deploy from causing infinite restart loops?', a:'Two approaches: (1) Failure Rate strategy — cap restarts per time window; if a bad binary causes 5 crashes in 10 minutes, the job fails permanently and alerts fire. (2) Exponential backoff with a window reset — restarts slow down exponentially; if the job stays healthy for the reset threshold (e.g., 5 minutes), the backoff resets. Both approaches catch "hard" failures (bad code, schema mismatch) while tolerating transient failures (network blip, GC pause).' },
];

// ── "What & Why" foundations (additive) ──────────────────────────
const WHY_REASONS = [
  { icon: '💥', title: 'Hardware will fail', body: 'Across thousands of machines running 24/7, a TaskManager dies every day — OOM, kernel panic, spot-instance reclaim. The job must survive it, not page an engineer.' },
  { icon: '🎯', title: 'Recover exactly-once', body: 'Recovery restores state <em>and</em> rewinds Kafka to matching offsets, then replays — so no GPS event is lost or double-counted, even mid-trip.' },
  { icon: '⏱️', title: 'Bound the downtime', body: 'Region failover + local RocksDB recovery bring a 600 MB job back in seconds, not minutes — the fraud model barely blinks.' },
  { icon: '🔁', title: 'Choose how to retry', body: 'Restart strategies (fixed, exponential, failure-rate) decide <em>how often</em> to retry so transient blips self-heal without hammering the cluster.' },
  { icon: '🛑', title: 'Stop bad deploys', body: 'A failure-rate cap turns an infinite crash-loop from a broken binary into a clean, permanent FAIL that alerts — instead of thrashing forever.' },
  { icon: '🧩', title: 'Restart only what broke', body: 'Region failover restarts just the pipeline region containing the dead task; healthy operators keep running and buffering.' },
];

const PROBLEMS = [
  { naive: 'Let the job die when a TaskManager crashes.', fail: 'A single node failure <b>takes down the whole pipeline</b> — GPS events pile up undelivered until a human intervenes.', fix: 'A restart strategy automatically recovers the job from the last checkpoint.' },
  { naive: 'Restart from the beginning of the stream.', fail: 'Kafka\'s retention has aged out old events, and days of reprocessing is <b>infeasible</b>.', fix: 'Restore state from the latest checkpoint and replay only events since it.' },
  { naive: 'Retry instantly, forever, on every failure.', fail: 'A bad deploy crash-loops at full speed — a <b>restart storm</b> that hammers the ResourceManager and hides the real error.', fix: 'Exponential backoff slows retries; failure-rate caps them and fails cleanly.' },
  { naive: 'Full-restart every operator on any single task failure.', fail: 'A 600 MB job re-downloads all state from S3 and <b>stalls for ~12s</b> even when one small operator died.', fix: 'Region failover + task-local recovery restart only the affected region from local disk (~2s).' },
];

const WHY_HTML = `
  <div class="sm-wrap">
    <div class="sm-def card">
      <div class="sm-def-ic">🛡️</div>
      <div>
        <div class="sm-def-eyebrow">What is fault tolerance?</div>
        <p class="sm-def-lead"><b>Fault tolerance</b> is a streaming job's ability to <em>survive failures</em> — a crashed machine, a network blip, a bad deploy — and resume correctly without losing state or producing duplicates. It builds on checkpoints: a <b>restart strategy</b> decides when to retry, and <b>recovery</b> restores state and rewinds sources. On ride <b>R-4471</b>, it's what keeps the fraud pipeline whole through a mid-trip TaskManager crash (DEFECT-4).</p>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">A crash, with and without it</div>
      <div class="section-desc">The same TaskManager failure, two very different outcomes.</div>
    </div>
    <div class="sm-vs">
      <div class="sm-vs-card stateless">
        <div class="sm-vs-head">❌ No fault tolerance</div>
        <p class="sm-vs-sub">One node dies, the job dies with it.</p>
        <ul>
          <li>Job moves to FAILED, stays down</li>
          <li>In-memory state lost</li>
          <li>GPS events pile up undelivered</li>
        </ul>
        <div class="sm-vs-note">Every failure is an incident and a page.</div>
      </div>
      <div class="sm-vs-card stateful">
        <div class="sm-vs-head">✅ With fault tolerance</div>
        <p class="sm-vs-sub">The job heals itself.</p>
        <ul>
          <li>Restart strategy retries automatically</li>
          <li>State restored from checkpoint</li>
          <li>Sources rewind, events replay exactly-once</li>
        </ul>
        <div class="sm-vs-note">A node death becomes a few seconds of replay.</div>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Why a streaming job needs it</div>
      <div class="section-desc">Six realities of running forever on commodity hardware.</div>
    </div>
    <div class="sm-why-grid">
      ${WHY_REASONS.map(r => `
        <div class="sm-why">
          <div class="sm-why-ic">${r.icon}</div>
          <div class="sm-why-title">${r.title}</div>
          <p>${r.body}</p>
        </div>
      `).join('')}
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">The problem fault tolerance solves</div>
      <div class="section-desc">Four ways naïve failure handling breaks production — and the fix.</div>
    </div>
    <div class="sm-prob-list">
      ${PROBLEMS.map((p, i) => `
        <div class="sm-prob">
          <div class="sm-prob-no">${i + 1}</div>
          <div class="sm-prob-body">
            <div class="sm-prob-naive"><span class="sm-tag naive">Naïve</span>${p.naive}</div>
            <div class="sm-prob-fail"><span class="sm-tag fail">Breaks</span>${p.fail}</div>
            <div class="sm-prob-fix"><span class="sm-tag fix">Flink</span>${p.fix}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">What recovery actually does</div>
    </div>
    <div class="sm-keyed card">
      <p>Recovery is checkpoints run in reverse — restore the last consistent snapshot, rewind the sources to match, then replay forward.</p>
      <ul>
        <li><b>Detect</b> — the JobManager notices a lost heartbeat or a task exception.</li>
        <li><b>Restore</b> — operators fetch their checkpointed state (from local disk when possible, else S3).</li>
        <li><b>Rewind + replay</b> — Kafka seeks to checkpointed offsets; events between the checkpoint and the crash reprocess exactly-once.</li>
      </ul>
      <div class="sm-keyed-flow">
        <code>crash</code> <span class="sm-arrow">→</span> <b>detect</b> <span class="sm-arrow">→</span> cancel + restart (per strategy) <span class="sm-arrow">→</span> <b>restore state</b> <span class="sm-arrow">→</span> seek Kafka offsets <span class="sm-arrow">→</span> <b>RUNNING</b> (replaying)
      </div>
    </div>

    <div class="sm-bridge" style="margin-top:26px">
      <div class="sm-bridge-txt">
        <div class="sm-bridge-k">Now inject a failure</div>
        <p>You know <b>why</b> fault tolerance matters — pick a restart strategy, inject a crash, and watch Flink recover the pipeline step by step.</p>
      </div>
      <button class="sm-bridge-btn" data-jump="sim">Open the Failure Simulator →</button>
    </div>
  </div>
`;

export function mount(container) {
  let selected = STRATEGIES[1];
  let animRunning = false;
  let animRaf = null;

  container.innerHTML = `
    ${rideSpine({ active: ['JOB_UPGRADE', 'RIDE_STARTED'], incidents: ['DEFECT-4'] })}
    <div class="module-hero">
      <div class="module-hero-content">
        <span class="module-badge">Module 13</span>
        <h1 class="module-title">Fault Tolerance</h1>
        <p class="module-subtitle">Pick a restart strategy, inject a failure, and watch Flink restore Uber's fraud pipeline from the latest checkpoint — step by step.</p>
      </div>
    </div>
    <div class="module-tabs">
      <button class="tab-btn active" data-tab="why">What &amp; Why</button>
      <button class="tab-btn" data-tab="sim">Failure Simulator</button>
      <button class="tab-btn" data-tab="concept">Recovery Deep-Dive</button>
      <button class="tab-btn" data-tab="iq">Interview Q&amp;A</button>
    </div>

    <div class="tab-content active" data-tab="why">
      ${WHY_HTML}
    </div>

    <div class="tab-content" data-tab="sim">
      <div class="ft-strategy-picker" id="ft-picker"></div>
      <div id="ft-strategy-detail"></div>
      <div class="card" style="padding:24px;margin-top:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px">
          <h3 style="margin:0">Recovery Timeline</h3>
          <button class="btn btn-primary" id="ft-inject">⚡ Inject Failure</button>
        </div>
        <div id="ft-timeline"></div>
      </div>
    </div>

    <div class="tab-content" data-tab="concept">
      ${rideCallout('RIDE_STARTED', { openEvent: false })}
      <div class="grid-2 gap-20">
        <div class="card p-24">
          <h3 class="mb-12">Recovery Steps (Full Restart)</h3>
          ${[
            ['1. Detect','JM detects heartbeat loss or task exception report'],
            ['2. Cancel','All tasks receive cancel() signal; operators flush buffers'],
            ['3. Release slots','TaskManagers release all slots back to ResourceManager'],
            ['4. Restore state','JM downloads checkpoint metadata; operators fetch state from S3'],
            ['5. Re-request slots','JM requests fresh slots from RM (may start new TMs)'],
            ['6. Redeploy','Tasks deployed with restored state; operator open() called'],
            ['7. Seek sources','Kafka sources seek to checkpointed partition offsets'],
            ['8. Running','Data flows again; watermarks catch up; output resumes'],
          ].map(([t,d]) => `
            <div style="display:flex;gap:12px;margin-bottom:10px">
              <span style="min-width:80px;font-size:12px;font-weight:700;color:var(--accent)">${t}</span>
              <span style="font-size:12.5px;color:var(--text-secondary)">${d}</span>
            </div>
          `).join('')}
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Region Failover (Partial Restart)</h3>
          <p style="color:var(--text-secondary);font-size:13px;line-height:1.7;margin-bottom:12px">With <code>RegionFailoverStrategy</code>, only the pipelined region containing the failed task restarts. Regions are sets of operators connected by pipelined (non-blocking) data exchanges.</p>
          <div class="code-block fs-11"><span class="lang-tag">flink-conf.yaml</span><pre># Enable region failover:
jobmanager.execution.failover-strategy: region

# The failover strategy is cluster config, not
# per-job. Region failover + exponential backoff
# (env.set_restart_strategy in PyFlink) = Uber's
# production setup.</pre></div>
          <div class="lc-uber-box mt-12">
            <div class="lc-uber-label">🚗 Uber Impact</div>
            <p class="fs-12">If sink TM fails, only the sink region restarts — source and FraudDetector keep running, buffering output. Recovery time: 3s vs 12s for full restart.</p>
          </div>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Task-Local State Recovery</h3>
          <p style="color:var(--text-secondary);font-size:13px;line-height:1.7;margin-bottom:12px">RocksDB keeps a local copy of checkpoint SSTables on the TM disk. On same-TM restart (OOM, thread crash), state is restored from local disk — no S3 download needed.</p>
          <div class="code-block fs-11"><pre># flink-conf.yaml
state.backend.local-recovery: true
# Fallback to S3 if local files missing
# (e.g., TM physically died and rescheduled)
# Local recovery: ~1–2s
# S3 recovery (600MB): ~8–12s</pre></div>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Exactly-Once Through Recovery</h3>
          ${[
            ['Source rewinds to','Checkpointed Kafka offset'],
            ['State restores to','Snapshot at checkpoint time'],
            ['Output (Kafka sink)','Open transaction aborted → re-committed after replay'],
            ['Net effect','Every event processed exactly once end-to-end'],
            ['Uber GPS events lost','Zero (with exactly-once config)'],
          ].map(([k,v]) => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12.5px">
              <span class="t-sec">${k}</span>
              <span style="color:var(--text);font-weight:600">${v}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="tab-content" data-tab="iq">
      <div class="section-header" style="margin-bottom:8px">
        <div class="section-title">Interview corner cases — on ride R-4471</div>
        <div class="section-desc">Savepoint &amp; recovery questions, anchored to the planned upgrade and the mid-trip crash.</div>
      </div>
      <div id="sp-scenarios"></div>
      <div class="section-header" style="margin:22px 0 8px"><div class="section-title">More recovery Q&amp;A</div></div>
      <div class="iq-section" id="iq13-section"></div>
    </div>
  `;

  initRideSpine(container);
  const spScen = container.querySelector('#sp-scenarios');
  if (spScen) spScen.innerHTML = scenarioList(casesByModule('m13'));

  // Tabs
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`.tab-content[data-tab="${btn.dataset.tab}"]`).classList.add('active');
    });
  });

  // Bridge button: jump from "What & Why" into the Failure Simulator tab.
  const jumpBtn = container.querySelector('[data-jump]');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      const target = jumpBtn.dataset.jump;
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === target));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === target));
      container.querySelector('.module-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // IQ
  const iqSection = container.querySelector('#iq13-section');
  iqSection.innerHTML = IQS.map((item, i) => `
    <div class="iq-item" id="iq13-${i}">
      <div class="iq-question" data-idx="${i}"><span>${item.q}</span><span class="iq-chevron">›</span></div>
      <div class="iq-answer">${item.a}</div>
    </div>
  `).join('');
  iqSection.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = iqSection.querySelector(`#iq13-${q.dataset.idx}`);
      const open = item.classList.contains('open');
      iqSection.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });

  // Strategy picker
  const picker = container.querySelector('#ft-picker');
  picker.innerHTML = STRATEGIES.map(s => `
    <button class="op-pill${s.id === selected.id ? ' active' : ''}" data-sid="${s.id}"
      style="${s.id === selected.id ? `background:${s.color};border-color:${s.color}` : ''}">
      ${s.icon} ${s.label}
    </button>
  `).join('');

  function renderDetail(s) {
    const detail = container.querySelector('#ft-strategy-detail');
    detail.innerHTML = `
      <div class="card" style="padding:24px;border-left:4px solid ${s.color}">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
          <span class="fs-28">${s.icon}</span>
          <div>
            <div style="font-size:18px;font-weight:700;color:${s.color}">${s.label} Strategy</div>
            <p style="color:var(--text-secondary);font-size:13px;margin:4px 0 0">${s.desc}</p>
          </div>
        </div>
        <div class="grid-2" style="gap:16px;margin-top:16px">
          <div class="lc-uber-box">
            <div class="lc-uber-label">🚗 Uber Use Case</div>
            <p class="fs-125">${s.uber}</p>
          </div>
          <div class="code-block fs-11"><span class="lang-tag">PyFlink</span><pre>${s.config}</pre></div>
        </div>
        ${s.recovery ? `
        <div style="display:flex;gap:20px;margin-top:14px;flex-wrap:wrap">
          ${s.recovery.attempts != null ? `<div class="pill-box"><span class="t-sec">Max attempts: </span><strong>${s.recovery.attempts}</strong></div>` : ''}
          <div class="pill-box"><span class="t-sec">Delay: </span><strong>${s.recovery.delay}</strong></div>
          ${s.recovery.window ? `<div class="pill-box"><span class="t-sec">Rate limit: </span><strong>${s.recovery.window}</strong></div>` : ''}
        </div>` : ''}
      </div>
    `;
    renderTimeline([]);
  }

  picker.querySelectorAll('.op-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      selected = STRATEGIES.find(s => s.id === btn.dataset.sid);
      picker.querySelectorAll('.op-pill').forEach(b => {
        b.classList.remove('active');
        b.style.background = ''; b.style.borderColor = ''; b.style.color = '';
      });
      btn.classList.add('active');
      btn.style.background = selected.color;
      btn.style.borderColor = selected.color;
      btn.style.color = '#fff';
      renderDetail(selected);
    });
  });

  function renderTimeline(activeSteps) {
    const el = container.querySelector('#ft-timeline');
    el.innerHTML = selected.steps.map((step, i) => {
      const active = activeSteps.includes(i);
      const done = activeSteps.some(a => a > i);
      return `
        <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:12px;opacity:${active||done?1:0.3};transition:opacity .3s">
          <div style="width:28px;height:28px;border-radius:50%;background:${active||done?step.color:'var(--surface2)'};border:2px solid ${step.color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${active||done?'#fff':step.color};flex-shrink:0;transition:all .3s">${done&&!active?'✓':i+1}</div>
          <div style="padding-top:4px">
            <div style="font-size:13px;font-weight:${active?'700':'500'};color:${active?step.color:'var(--text)'};">${step.label}</div>
            ${i < selected.steps.length-1 ? `<div style="width:2px;height:16px;background:var(--border);margin:4px 0 0 12px"></div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  container.querySelector('#ft-inject').addEventListener('click', () => {
    if (animRunning) return;
    animRunning = true;
    const btn = container.querySelector('#ft-inject');
    btn.disabled = true;
    btn.textContent = '⚡ Running...';

    let shown = [];
    selected.steps.forEach((step, i) => {
      setTimeout(() => {
        shown = [...shown.filter(x => x !== i), i];
        renderTimeline(shown);
        if (i === selected.steps.length - 1) {
          setTimeout(() => {
            animRunning = false;
            btn.disabled = false;
            btn.textContent = '⚡ Inject Failure';
          }, 800);
        }
      }, step.t);
    });
  });

  renderDetail(selected);
}
