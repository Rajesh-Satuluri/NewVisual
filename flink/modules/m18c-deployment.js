// Module 18c — Deployment Modes & the Kubernetes Operator
// How a Flink job actually runs in production: Application vs Session vs (the
// deprecated) Per-Job mode, where main() executes, resource isolation and blast
// radius, then the Flink Kubernetes Operator (FlinkDeployment CRD, reconciliation
// loop, savepoint-on-upgrade, autoscaler, HA). Centrepiece is a canvas "cluster
// visualizer" that lets you submit and crash jobs under Session vs Application
// mode and watch the isolation boundary — and the blast radius — for real.
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { rideSpine, initRideSpine, rideCallout, scenarioList } from '../components/story-ui.js';
import { IQ_BANK } from '../data/iq-bank.js';
import { casesByModule } from '../data/interview-cases.js';

// ── Tab 1: deployment modes ──────────────────────────────────────────────────
const MODES = `
  <div class="sm-def card">
    <div class="sm-def-ic">🚢</div>
    <div>
      <div class="sm-def-eyebrow">Two questions decide your deployment mode</div>
      <p class="sm-def-lead"><b>(1) Where does <code>main()</code> run</b> — on the client or on the JobManager? <b>(2) Is the cluster dedicated to one job, or shared by many?</b> Those two answers give you Application, Per-Job (deprecated) or Session mode. For a fleet of long-running jobs like Uber's R-4471 pipeline, the answer is almost always <b>Application mode on Kubernetes</b>.</p>
    </div>
  </div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">Application vs Session vs Per-Job</div>
    <div class="section-desc">Same binaries, very different isolation and operational blast radius.</div>
  </div>
  <div class="code-block" style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:0.9rem">
      <thead><tr>
        <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border)"></th>
        <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);color:#10b981;font-weight:700">Application</th>
        <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border)">Session</th>
        <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);color:var(--text-secondary)">Per-Job (deprecated)</th>
      </tr></thead>
      <tbody>
        ${[
          ['Cluster lifetime', 'One per application; dies with the job', 'Long-running; outlives jobs', 'One per job'],
          ['main() runs on', 'JobManager', 'Client', 'Client'],
          ['Jobs per cluster', 'One (the app)', 'Many, shared', 'One'],
          ['Isolation', 'Full — own JM + TMs', 'None — shared JM + TMs', 'Full — own JM + TMs'],
          ['Blast radius', 'Just this app', 'Every job on the cluster', 'Just this job'],
          ['Submission cost', 'Spin up a cluster (slower)', 'Instant (cluster exists)', 'Spin up a cluster'],
          ['Best for', 'Production long-running jobs', 'Many short/ad-hoc jobs, notebooks', '— (removed; use Application)'],
        ].map(([k, a, s, p]) => `
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid var(--border);font-weight:600">${k}</td>
            <td style="padding:8px 10px;border-bottom:1px solid var(--border)">${a}</td>
            <td style="padding:8px 10px;border-bottom:1px solid var(--border)">${s}</td>
            <td style="padding:8px 10px;border-bottom:1px solid var(--border);color:var(--text-secondary)">${p}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">Why main()'s location matters</div>
    <div class="section-desc">It is the subtle detail interviewers probe.</div>
  </div>
  <div class="sm-why-grid">
    ${[
      ['🖥️', 'Session / Per-Job: main() on client', 'The client builds the JobGraph (runs your <code>main()</code>, downloads deps), then ships it. A heavy client, and if the client dies mid-submit the job may not start. Bad for CI/CD at scale.'],
      ['☁️', 'Application: main() on JobManager', 'The JAR is handed to the cluster and <code>main()</code> runs <em>there</em>. The client just fires and forgets — ideal for GitOps/operators. Each app is self-contained.'],
      ['🧨', 'Shared JobManager = shared fate', 'In Session mode the JM is a single point of failure for every job on it, and one job\'s classloader leak or OOM can take down neighbours. Application mode removes that coupling.'],
      ['📦', 'Dependency isolation', 'Application/Per-Job each get their own classpath. Session jobs share a classpath — version conflicts between jobs are a real hazard.'],
    ].map(([icon, title, body]) => `
      <div class="sm-why">
        <div class="sm-why-ic">${icon}</div>
        <div class="sm-why-title">${title}</div>
        <p>${body}</p>
      </div>`).join('')}
  </div>

  <div class="sm-def card" style="margin:22px 0 6px;border-left:3px solid #FF6B35">
    <div class="sm-def-ic">🧭</div>
    <div>
      <div class="sm-def-eyebrow">Related modules</div>
      <p class="sm-def-lead" style="font-size:0.95rem">Upgrades across deployments ride on <a href="#m13b" style="color:#FF6B35;font-weight:600">Savepoints (13b)</a>; HA restores from <a href="#m12" style="color:#FF6B35;font-weight:600">Checkpoints (12)</a>; rescaling uses the key groups from <a href="#m05" style="color:#FF6B35;font-weight:600">Parallelism (05)</a>.</p>
    </div>
  </div>
`;

// ── Tab 3: Kubernetes operator ───────────────────────────────────────────────
const K8S = `
  <div class="sm-def card">
    <div class="sm-def-ic">☸️</div>
    <div>
      <div class="sm-def-eyebrow">The Flink Kubernetes Operator</div>
      <p class="sm-def-lead">You do not run <code>flink run</code> by hand for 1000 jobs. You declare a <b>FlinkDeployment</b> custom resource and the <b>operator</b> makes reality match it — deploying, upgrading (via savepoint), recovering and autoscaling. It turns Flink into a first-class Kubernetes citizen managed by GitOps.</p>
    </div>
  </div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">The reconciliation loop</div>
    <div class="section-desc">The operator continuously drives actual state → desired state.</div>
  </div>
  <div class="sm-keyed card">
    <div class="sm-keyed-flow">
      <b>observe</b> <span class="sm-arrow">→</span> read FlinkDeployment + job status <span class="sm-arrow">→</span> <b>validate</b> spec <span class="sm-arrow">→</span> <b>reconcile</b> (deploy / upgrade / rollback / scale) <span class="sm-arrow">→</span> update status <span class="sm-arrow">→</span> repeat
    </div>
    <ul style="margin-top:14px">
      <li><b>CRDs</b> — <code>FlinkDeployment</code> (an Application/Session cluster) and <code>FlinkSessionJob</code> (a job on a session cluster).</li>
      <li><b>Upgrade modes</b> — <code>stateless</code>, <code>savepoint</code> (stop-with-savepoint then redeploy), or <code>last-state</code> (use the latest checkpoint via HA metadata — faster, no clean savepoint needed).</li>
      <li><b>HA</b> — Kubernetes-native leader election stores JobManager metadata in ConfigMaps; <strong>no ZooKeeper required</strong>. A JM pod dies → a standby takes over and restores from the last checkpoint.</li>
      <li><b>Autoscaler</b> — observes backpressure/throughput metrics and rewrites the per-vertex parallelism, then triggers a savepoint-based rescale. Pairs with the Adaptive Scheduler.</li>
    </ul>
  </div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">Standalone-on-K8s vs Native Kubernetes</div>
    <div class="section-desc">Who asks Kubernetes for TaskManager pods?</div>
  </div>
  <div class="sm-why-grid">
    ${[
      ['🧱', 'Standalone on K8s', 'You (or Helm) create JM/TM Deployments; Flink does not know it is on K8s. Simple, but TM count is fixed unless you wire up the Reactive mode.'],
      ['⚡', 'Native Kubernetes', 'Flink\'s ResourceManager talks to the K8s API directly and requests TaskManager pods on demand. Elastic — the basis the operator builds on.'],
    ].map(([icon, title, body]) => `
      <div class="sm-why">
        <div class="sm-why-ic">${icon}</div>
        <div class="sm-why-title">${title}</div>
        <p>${body}</p>
      </div>`).join('')}
  </div>
`;

// ── Tab 4: setup / YAML / PyFlink ────────────────────────────────────────────
const SETUP = `
  <div class="section-header" style="margin:4px 0 12px">
    <div class="section-title">Submit in Application mode (native Kubernetes)</div>
    <div class="section-desc">main() runs on the JobManager; the cluster is dedicated to this app.</div>
  </div>
  <div class="code-block fs-11"><span class="lang-tag">CLI — PyFlink application mode on K8s</span><pre>flink run-application \\
  --target kubernetes-application \\
  -Dkubernetes.cluster-id=fraud-r4471 \\
  -Dkubernetes.container.image=registry/uber-flink:py-1.19 \\
  -Dkubernetes.namespace=streaming \\
  -Dstate.savepoints.dir=s3://uber-flink/savepoints \\
  -Dhigh-availability.type=kubernetes \\
  -pyfs /opt/jobs/fraud_job.py \\
  -pym fraud_job</pre></div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">...or declare it to the operator (GitOps)</div>
    <div class="section-desc">Commit this YAML; the operator reconciles the rest.</div>
  </div>
  <div class="code-block fs-11"><span class="lang-tag">FlinkDeployment — PyFlink app with HA, savepoint upgrades & autoscaler</span><pre>apiVersion: flink.apache.org/v1beta1
kind: FlinkDeployment
metadata:
  name: fraud-r4471
spec:
  image: registry/uber-flink:py-1.19
  flinkVersion: v1_19
  flinkConfiguration:
    state.savepoints.dir: s3://uber-flink/savepoints
    state.checkpoints.dir: s3://uber-flink/checkpoints
    high-availability.type: kubernetes
    job.autoscaler.enabled: "true"
    job.autoscaler.target.utilization: "0.6"
  jobManager:
    resource: { memory: "2048m", cpu: 1 }
  taskManager:
    resource: { memory: "4096m", cpu: 2 }
  job:
    jarURI: local:///opt/flink/opt/flink-python.jar
    entryClass: org.apache.flink.client.python.PythonDriver
    args: ["-pyfs", "/opt/jobs/fraud_job.py", "-pym", "fraud_job"]
    parallelism: 256
    upgradeMode: savepoint      # savepoint | last-state | stateless</pre></div>

  <div class="code-block pyflink fs-11"><span class="py-tier">upgrade = edit + apply; the operator does stop-with-savepoint</span><pre># Change the image tag or parallelism in the YAML, then:
kubectl apply -f fraud-r4471.yaml
# operator: takes a savepoint → redeploys new image → restores state → resumes.
# Roll back = git revert the YAML and re-apply.</pre></div>
`;

// ── Canvas cluster visualizer ────────────────────────────────────────────────
// Labelled SIMULATION of deployment topology (not a real scheduler), but it
// models the thing that matters: in Session mode jobs SHARE one JobManager + a
// TaskManager pool (so a JM failure is total and a job can starve its neighbours
// of slots); in Application mode each job is its OWN cluster (isolated).
const JOB_COLORS = ['#FF6B35', '#3b82f6', '#10b981', '#a855f7', '#f59e0b'];
const POOL_SLOTS = 12;         // session-mode shared TM pool
const SLOTS_PER_JOB = 3;

function themePalette() {
  const dark = (document.documentElement.getAttribute('data-theme') || 'dark') !== 'light';
  return dark
    ? { bg: '#0b1220', line: 'rgba(148,163,184,0.25)', text: '#e2e8f0', mut: '#94a3b8', box: '#131c2e', slot: '#1b2740' }
    : { bg: '#ffffff', line: 'rgba(100,116,139,0.28)', text: '#1e293b', mut: '#64748b', box: '#f1f5f9', slot: '#e2e8f0' };
}
const RED = '#ef4444', GREEN = '#10b981';

function buildVisualizer(container) {
  const host = container.querySelector('#tab-cluster');
  host.innerHTML = `
    <div class="sim-note">⚙️ <b>Topology simulation.</b> Not a live scheduler — but it models the one thing that matters:
      in <b>Session</b> mode jobs share one JobManager and a TaskManager pool (shared fate, slot contention); in
      <b>Application</b> mode each job is its own isolated cluster. Submit jobs, then crash one — watch the blast radius.</div>
    <div class="sim-grid">
      <div class="sim-controls">
        <div class="sim-ctl-row"><label>Deployment mode</label></div>
        <div class="sim-actions" id="cl-mode">
          <button class="ctrl-btn active" data-mode="session">🖧 Session (shared)</button>
          <button class="ctrl-btn" data-mode="application">📦 Application (isolated)</button>
        </div>
        <div class="sim-actions" style="margin-top:10px">
          <button class="ctrl-btn" id="cl-submit">➕ Submit job</button>
          <button class="ctrl-btn" id="cl-crash">💥 Crash a job</button>
        </div>
        <div class="sim-actions" style="margin-top:8px">
          <button class="ctrl-btn" id="cl-jm" title="Session mode only">☠️ Crash JobManager</button>
          <button class="ctrl-btn" id="cl-reset">↺ Reset</button>
        </div>
        <div class="sim-stats" id="cl-stats"></div>
      </div>
      <div class="sim-stage">
        <canvas id="cl-canvas" width="700" height="500" style="width:100%;max-width:720px"></canvas>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Each job is a coloured application (R-4471 fraud, surge, ETA, …). In <b>Session</b> mode there is <em>one</em> JobManager and a shared pool of ${POOL_SLOTS} TaskManager slots; every job you submit takes ${SLOTS_PER_JOB} slots from that pool. Submit enough and later jobs <b>can't be scheduled</b> — slot contention. <b>Crash the JobManager</b> and <em>every</em> job dies: one shared point of failure.</p>
      <p>Switch to <b>Application</b> mode and each job becomes its own self-contained cluster — its own JobManager and TaskManagers, drawn inside an isolation boundary. <b>Crash a job</b> and its neighbours are untouched; there is no shared JobManager to crash. That isolation is exactly why production long-running jobs use Application mode.</p>
      <p><b>Interview angle:</b> Session mode trades isolation for fast, cheap submission (the cluster already exists) — great for many short or ad-hoc jobs. Application mode trades submission speed for full isolation and independent lifecycle/upgrade — the right default for production. Per-Job mode offered the same isolation but ran main() on the client and is now removed.</p>
    </div>`;

  const canvas = host.querySelector('#cl-canvas');
  const ctx = canvas.getContext('2d');
  const statsEl = host.querySelector('#cl-stats');
  const jmBtn = host.querySelector('#cl-jm');
  let mode = 'session';
  let jobs = [];                // {id, color, state:'running'|'failed'|'pending', flash}
  let jmFailed = false;
  let seq = 0;
  let raf = null;

  const names = ['fraud', 'surge', 'eta', 'matching', 'payments'];
  function submit() {
    if (jobs.length >= 5) return;
    const i = jobs.length;
    let state = 'running';
    if (mode === 'session') {
      const used = jobs.filter(j => j.state !== 'failed').length * SLOTS_PER_JOB;
      if (used + SLOTS_PER_JOB > POOL_SLOTS) state = 'pending';   // no free slots
      if (jmFailed) state = 'pending';
    }
    jobs.push({ id: ++seq, color: JOB_COLORS[i], name: names[i], state, flash: 0 });
  }
  function crashJob() {
    const running = jobs.filter(j => j.state === 'running');
    if (!running.length) return;
    const victim = running[running.length - 1];
    victim.state = 'failed'; victim.flash = 1;
    if (mode === 'session') {   // a freed slot may let a pending job schedule
      const pending = jobs.find(j => j.state === 'pending');
      if (pending && !jmFailed) pending.state = 'running';
    }
  }
  function crashJM() {
    if (mode !== 'session') return;
    jmFailed = true;
    jobs.forEach(j => { if (j.state === 'running') { j.state = 'failed'; j.flash = 1; } });
  }
  function reset() { jobs = []; jmFailed = false; seq = 0; }
  function setMode(m) {
    mode = m; reset();
    host.querySelectorAll('#cl-mode .ctrl-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    jmBtn.disabled = (m !== 'session');
    jmBtn.style.opacity = (m === 'session') ? '1' : '0.4';
  }

  function stat(label, val, tone) {
    return `<div class="sim-stat ${tone || ''}"><span>${label}</span><b>${val}</b></div>`;
  }
  function renderStats() {
    const running = jobs.filter(j => j.state === 'running').length;
    const failed = jobs.filter(j => j.state === 'failed').length;
    const pending = jobs.filter(j => j.state === 'pending').length;
    const usedSlots = running * SLOTS_PER_JOB;
    statsEl.innerHTML =
      stat('Mode', mode === 'session' ? 'Session' : 'Application') +
      stat('Jobs', `${jobs.length}`) +
      stat('Running', running, running ? 'sim-stat-ok' : '') +
      (failed ? stat('Failed', failed, 'sim-stat-hot') : '') +
      (mode === 'session'
        ? stat('Pool slots', `${usedSlots}/${POOL_SLOTS}`, usedSlots >= POOL_SLOTS ? 'sim-stat-hot' : 'sim-stat-ok') +
          (pending ? stat('Unschedulable', pending, 'sim-stat-hot') : '') +
          stat('Blast radius', jmFailed ? 'JM DOWN → all' : 'shared JM', jmFailed ? 'sim-stat-hot' : '')
        : stat('Isolation', 'per-job ✓', 'sim-stat-ok') + stat('Blast radius', 'one job', 'sim-stat-ok'));
  }

  function slotRect(ctx, x, y, w, h, fill, stroke, pal) {
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1.5;
    ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
  }

  function drawSession(pal) {
    const W = canvas.width;
    // JobManager (shared)
    const jmW = 240, jmX = (W - jmW) / 2, jmY = 16, jmH = 48;
    ctx.fillStyle = jmFailed ? 'rgba(239,68,68,0.18)' : pal.box;
    ctx.strokeStyle = jmFailed ? RED : '#3b82f6'; ctx.lineWidth = 2.5;
    ctx.fillRect(jmX, jmY, jmW, jmH); ctx.strokeRect(jmX, jmY, jmW, jmH);
    ctx.fillStyle = jmFailed ? RED : pal.text; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(jmFailed ? '☠ JobManager (CRASHED)' : '🖧 JobManager (shared)', W / 2, jmY + 22);
    ctx.fillStyle = pal.mut; ctx.font = '10px system-ui';
    ctx.fillText(jmFailed ? 'every job on this cluster is down' : 'single point of failure for all jobs', W / 2, jmY + 38);

    // connector
    ctx.strokeStyle = pal.line; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(W / 2, jmY + jmH); ctx.lineTo(W / 2, 92); ctx.stroke();

    // shared TM slot pool
    const poolX = 40, poolY = 104, poolW = W - 80, poolH = 150;
    ctx.strokeStyle = pal.line; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    ctx.strokeRect(poolX, poolY, poolW, poolH); ctx.setLineDash([]);
    ctx.fillStyle = pal.mut; ctx.font = '11px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`TaskManager pool — ${POOL_SLOTS} shared slots`, poolX + 6, poolY - 6);

    // slots filled by running jobs in order
    const cols = 6, rows = 2, gap = 12;
    const sw = (poolW - 24 - gap * (cols - 1)) / cols, sh = (poolH - 24 - gap * (rows - 1)) / rows;
    const occ = [];
    jobs.filter(j => j.state === 'running').forEach(j => { for (let k = 0; k < SLOTS_PER_JOB; k++) occ.push(j); });
    for (let i = 0; i < POOL_SLOTS; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const x = poolX + 12 + c * (sw + gap), y = poolY + 12 + r * (sh + gap);
      const j = occ[i];
      if (j) slotRect(ctx, x, y, sw, sh, j.color + 'cc', j.color, pal);
      else slotRect(ctx, x, y, sw, sh, pal.slot, pal.line, pal);
      if (j) { ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(j.name, x + sw / 2, y + sh / 2 + 3); }
    }

    // job chips below (status)
    drawJobChips(pal, 274);
  }

  function drawApplication(pal) {
    const W = canvas.width;
    ctx.fillStyle = pal.mut; ctx.font = '11px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('Each job = its own isolated cluster (own JobManager + TaskManagers)', 20, 18);
    const running = jobs;
    if (!running.length) {
      ctx.fillStyle = pal.mut; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('No jobs yet — press “Submit job”.', W / 2, 120);
      return;
    }
    const n = Math.min(running.length, 5);
    const gap = 12, cw = (W - 40 - gap * (n - 1)) / n, cy = 36, ch = 300, cx0 = 20;
    running.forEach((j, i) => {
      const x = cx0 + i * (cw + gap);
      const failed = j.state === 'failed';
      // isolation boundary
      ctx.strokeStyle = failed ? RED : j.color; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, cy, cw, ch); ctx.setLineDash([]);
      ctx.fillStyle = pal.mut; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('isolated cluster', x + cw / 2, cy - 5);
      // own JobManager
      ctx.fillStyle = failed ? 'rgba(239,68,68,0.15)' : pal.box; ctx.strokeStyle = failed ? RED : j.color; ctx.lineWidth = 2;
      ctx.fillRect(x + 10, cy + 12, cw - 20, 40); ctx.strokeRect(x + 10, cy + 12, cw - 20, 40);
      ctx.fillStyle = failed ? RED : pal.text; ctx.font = 'bold 11px system-ui';
      ctx.fillText(failed ? '☠ JM' : 'JM', x + cw / 2, cy + 30);
      ctx.fillStyle = pal.mut; ctx.font = '9px system-ui'; ctx.fillText(j.name, x + cw / 2, cy + 44);
      // own TM slots
      for (let k = 0; k < SLOTS_PER_JOB; k++) {
        const sy = cy + 66 + k * 44;
        const fill = failed ? 'rgba(239,68,68,0.12)' : j.color + 'cc';
        slotRect(ctx, x + 14, sy, cw - 28, 34, fill, failed ? RED : j.color, pal);
        ctx.fillStyle = failed ? RED : '#fff'; ctx.font = 'bold 9px system-ui';
        ctx.fillText(failed ? 'down' : 'TM slot', x + cw / 2, sy + 21);
      }
      // flash
      if (j.flash > 0) {
        ctx.strokeStyle = `rgba(239,68,68,${j.flash})`; ctx.lineWidth = 4;
        ctx.strokeRect(x - 2, cy - 2, cw + 4, ch + 4);
      }
    });
  }

  function drawJobChips(pal, y) {
    const W = canvas.width;
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = pal.text;
    ctx.fillText('Jobs', 20, y + 18);
    const chipW = 128, gap = 10; let x = 20, yy = y + 30;
    jobs.forEach(j => {
      if (x + chipW > W - 20) { x = 20; yy += 42; }
      const failed = j.state === 'failed', pending = j.state === 'pending';
      ctx.fillStyle = failed ? 'rgba(239,68,68,0.15)' : pending ? pal.slot : j.color + '22';
      ctx.strokeStyle = failed ? RED : pending ? pal.mut : j.color; ctx.lineWidth = 2;
      ctx.fillRect(x, yy, chipW, 32); ctx.strokeRect(x, yy, chipW, 32);
      ctx.fillStyle = pal.text; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(j.name, x + 10, yy + 14);
      ctx.fillStyle = failed ? RED : pending ? pal.mut : GREEN; ctx.font = '9px system-ui';
      ctx.fillText(failed ? '✗ failed' : pending ? '⧗ unschedulable' : '● running', x + 10, yy + 26);
      if (j.flash > 0) { ctx.strokeStyle = `rgba(239,68,68,${j.flash})`; ctx.lineWidth = 3; ctx.strokeRect(x - 1, yy - 1, chipW + 2, 34); }
      x += chipW + gap;
    });
  }

  function draw() {
    const pal = themePalette();
    ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (mode === 'session') drawSession(pal); else drawApplication(pal);
    jobs.forEach(j => { if (j.flash > 0) j.flash = Math.max(0, j.flash - 0.02); });
    renderStats();
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  host.querySelector('#cl-mode').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });
  host.querySelector('#cl-submit').addEventListener('click', submit);
  host.querySelector('#cl-crash').addEventListener('click', crashJob);
  jmBtn.addEventListener('click', crashJM);
  host.querySelector('#cl-reset').addEventListener('click', reset);
  // seed a couple of jobs so the first paint is meaningful
  submit(); submit();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

export function mount(container) {
  container.innerHTML = rideSpine({ active: ['JOB_UPGRADE'] }) + createModuleShell({
    tag: '18c · Operations · Uber Edition',
    title: 'Deployment Modes & Kubernetes',
    subtitle: 'How a Flink job actually runs in production: Application vs Session vs the deprecated Per-Job mode, where main() executes and what the blast radius is — then the Flink Kubernetes Operator, reconciliation, savepoint upgrades, HA and autoscaling.',
    tabs: [
      { id: 'modes', label: '🚢 Deployment Modes', content: MODES },
      { id: 'cluster', label: '🧩 Cluster Visualizer', content: '' },
      { id: 'k8s', label: '☸️ K8s Operator', content: K8S },
      { id: 'setup', label: '💻 Setup & YAML', content: SETUP },
      { id: 'iq', label: '🎤 Interview Q&A', content: createIQSection(IQ_BANK.m18c || []) },
    ],
  });

  initTabs(container);
  initRideSpine(container);
  const cases = casesByModule('m18c');
  if (cases && cases.length) {
    container.querySelector('#tab-modes').insertAdjacentHTML('beforeend',
      `<div class="section-header" style="margin:22px 0 12px"><div class="section-title">Corner cases — R-4471</div><div class="section-desc">Deployment questions a senior interview actually asks.</div></div>${scenarioList(cases)}`);
  }
  const cleanup = buildVisualizer(container);
  initIQ(container);
  return cleanup;
}
