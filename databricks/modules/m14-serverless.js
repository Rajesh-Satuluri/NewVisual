import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M14 · Compute',
    title: 'Serverless Compute',
    subtitle: 'Instant-start, fully-managed compute — SQL, Jobs, Notebooks, DLT & Model Serving with no clusters to size',
    tabs: [
      { id: 'what',    label: '☁️ What It Is' },
      { id: 'flavors', label: '🧩 The Flavors' },
      { id: 'tradeoff',label: '⚖️ Classic vs Serverless' },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-what').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Compute you don't provision</div>
        <div class="section-desc">With classic compute, a cluster of VMs is launched <em>in your cloud account</em> and you wait minutes for it to start, size it yourself, and pay while it idles. Serverless compute runs in <strong>Databricks' own account</strong> from a pre-warmed pool — it starts in seconds, autoscales instantly, and you never see a VM.</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">~5s</div><div class="stat-label">Start-up vs minutes for classic</div></div>
        <div class="stat-box"><div class="stat-val">1</div><div class="stat-label">Blended DBU rate (VM baked in)</div></div>
        <div class="stat-box"><div class="stat-val">0</div><div class="stat-label">Cluster configs to manage</div></div>
        <div class="stat-box"><div class="stat-val">auto</div><div class="stat-label">Scale up & down, scale-to-zero</div></div>
      </div>

      <div style="margin-top:24px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px">Where the compute lives</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.8">
          <p style="margin-bottom:8px"><strong style="color:var(--text)">Classic (customer-managed):</strong> the data plane runs in <em>your</em> VPC/VNet. You pick instance types, worker counts, and auto-termination; you pay the cloud VM bill <em>plus</em> the DBU bill. Great control, slow starts, idle waste.</p>
          <p style="margin-bottom:0"><strong style="color:var(--text)">Serverless (Databricks-managed):</strong> the compute runs in Databricks' account from a warm pool. You pay a single, higher DBU rate with the VM cost folded in — but you pay <em>nothing</em> when idle and wait seconds, not minutes.</p>
        </div>
      </div>

      <div class="info-grid" style="margin-top:20px">
        <div class="info-card">
          <div class="info-card-icon">⚡</div>
          <div class="info-card-title">Instant, elastic</div>
          <div class="info-card-body">A warm pool means queries and jobs begin in seconds. Autoscaling reacts far faster than classic autoscaling, so bursty and spiky workloads get capacity without a cold-start penalty and release it the moment they're done.</div>
          <div class="info-card-tag">warm pool</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🛡️</div>
          <div class="info-card-title">Photon-only & governed</div>
          <div class="info-card-body">Serverless always runs Photon and requires Unity Catalog — so every workload gets vectorized execution and identity-based governance by default. There's no legacy no-isolation mode to fall out of.</div>
          <div class="info-card-tag">UC required</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🔌</div>
          <div class="info-card-title">Networking: NCC</div>
          <div class="info-card-body">Because the compute isn't in your VPC, reaching your private resources uses <strong>Network Connectivity Configs</strong> (NCC) — stable egress IPs and private endpoints you attach to the serverless workspace, instead of VPC peering you'd use for classic.</div>
          <div class="info-card-tag">no VPC peering</div>
        </div>
      </div>
    </div>`;

  container.querySelector('#tab-flavors').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Serverless shows up across the platform</div>
        <div class="section-desc">"Serverless" isn't one product — it's a delivery model applied to most compute surfaces</div>
      </div>
      <div class="compare-table-wrap" style="padding:0">
        <table class="compare-table">
          <thead><tr><th>Surface</th><th>What it replaces</th><th>Why it wins</th></tr></thead>
          <tbody>
            <tr><td><strong style="color:var(--text)">Serverless SQL Warehouse</strong></td><td>Classic/Pro SQL warehouse (VMs you keep warm)</td><td>Sub-second resume, aggressive auto-stop (~1 min) so dashboards cost nothing between queries; best concurrency scaling for BI.</td></tr>
            <tr><td><strong style="color:var(--text)">Serverless Jobs</strong></td><td>Ephemeral job clusters</td><td>No 2–5 min cold start per run, no node sizing; ideal for short, frequent, or spiky scheduled jobs.</td></tr>
            <tr><td><strong style="color:var(--text)">Serverless Notebooks</strong></td><td>All-purpose interactive clusters</td><td>Attach and run instantly; no idle interactive cluster billing overnight.</td></tr>
            <tr><td><strong style="color:var(--text)">Serverless DLT pipelines</strong></td><td>Classic DLT compute</td><td>Managed, autoscaling pipeline compute with features like stream-pipelining and vertical autoscaling.</td></tr>
            <tr><td><strong style="color:var(--text)">Model Serving (serverless)</strong></td><td>Self-managed inference clusters</td><td>Autoscaling REST endpoints that scale to zero when idle — pay per request, not for a warm box.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="tip" style="max-width:760px;margin-top:20px">
        <strong style="color:var(--text)">Mental model:</strong> serverless trades <em>control</em> (instance types, init scripts, VPC placement) for <em>speed and zero idle</em>. The more bursty and latency-sensitive the workload, the better serverless fits; the more it's a long, steady, heavily-customized batch, the more classic can win.
      </div>
    </div>`;

  container.querySelector('#tab-tradeoff').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">When serverless wins — and when it doesn't</div>
        <div class="section-desc">The decision is startup latency + idle time vs steady utilization, plus how much low-level control you need</div>
      </div>
      <div class="compare-table-wrap" style="padding:0">
        <table class="compare-table">
          <thead><tr><th>Dimension</th><th>Classic compute</th><th>Serverless compute</th></tr></thead>
          <tbody>
            <tr><td>Start-up</td><td class="tag-bad">Minutes (cold VM boot)</td><td class="tag-good">Seconds (warm pool)</td></tr>
            <tr><td>Idle cost</td><td class="tag-bad">Billed until auto-terminate fires</td><td class="tag-good">None — scales to zero</td></tr>
            <tr><td>Billing</td><td>DBU + separate cloud VM bill</td><td class="tag-warn">Single higher blended DBU rate</td></tr>
            <tr><td>Control</td><td class="tag-good">Instance types, init scripts, VPC, spot</td><td class="tag-bad">Managed — limited knobs, no arbitrary init scripts</td></tr>
            <tr><td>Networking</td><td>VPC peering / PrivateLink in your account</td><td>NCC (stable egress IPs, private endpoints)</td></tr>
            <tr><td>Best for</td><td>Long steady batch, custom runtimes, spot savings</td><td>Bursty BI, short/frequent jobs, interactive, scale-to-zero serving</td></tr>
          </tbody>
        </table>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;max-width:760px;margin-top:20px">
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px;border-left:4px solid var(--green)">
          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px">Serverless usually wins when…</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.7">Startup latency and idle time dominate the bill: a BI warehouse that's queried in bursts, dozens of small jobs an hour, interactive notebooks used intermittently, or a serving endpoint with spiky traffic. You're paying for <em>readiness</em> you don't use — serverless deletes that cost.</div>
        </div>
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px;border-left:4px solid var(--amber)">
          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px">Classic can still win when…</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.7">A cluster runs <em>hot and steady</em> for hours (the higher serverless per-DBU rate adds up with no idle to offset), or you need <strong>spot discounts</strong>, a <strong>custom runtime / init scripts</strong>, GPUs serverless doesn't offer, or strict placement inside your own VPC. Measure both: serverless is simpler, not unconditionally cheaper.</div>
        </div>
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What actually makes "serverless" compute different from a small auto-terminating classic cluster?',
      a: 'Location and pooling. Classic compute launches VMs in YOUR cloud account, so it cold-boots (minutes) and bills idle until auto-termination fires; you also pay two bills (DBU + cloud VM). Serverless runs in DATABRICKS\' account from a pre-warmed pool, so it starts in seconds, autoscales far faster, scales to zero (no idle cost), and bills a single blended DBU rate with the VM cost folded in. It\'s always Photon and requires Unity Catalog. The trade-off is control: you can\'t pick instance types, run arbitrary init scripts, use spot, or place it in your VPC — networking to private resources goes through Network Connectivity Configs instead of VPC peering.'
    },
    {
      q: 'A BI team runs a SQL Warehouse that\'s queried in bursts during business hours and idle otherwise. Serverless or classic?',
      a: 'Serverless SQL Warehouse. The cost here is dominated by startup latency and idle time, not steady utilization — exactly what serverless eliminates. It resumes sub-second, auto-stops after ~1 minute so it costs nothing between query bursts, and its concurrency scaling handles many simultaneous dashboard users better than keeping a classic warehouse warm all day. A classic warehouse would either cold-start on each burst (bad UX) or stay warm and bill idle. The only reason to reconsider is if the warehouse is actually hammered steadily all day, where the higher serverless per-DBU rate with no idle to offset could cost more.'
    },
    {
      q: 'When would you deliberately NOT use serverless?',
      a: 'Four cases: (1) Long, steady batch that runs hot for hours — the higher serverless per-DBU rate adds up with no idle period to offset, so classic with spot workers is often cheaper. (2) You need spot/preemptible discounts (60–80% off VMs) — serverless has no spot. (3) You need a custom runtime, specific instance families/GPUs, or init scripts — serverless is managed and restricts these. (4) Strict networking/compliance that requires compute inside your own VPC. Serverless optimizes for speed and zero idle, not for maximum control or the lowest rate on fully-utilized compute — so measure, don\'t assume it\'s always cheaper.'
    },
  ]);
}
