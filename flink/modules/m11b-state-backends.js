// Module 11b — State Backends & RocksDB Internals
// Where keyed state actually lives: HashMapStateBackend (on-heap) vs
// EmbeddedRocksDBStateBackend (off-heap, on-disk LSM), the RocksDB write path
// (memtable → flush → L0 → leveled compaction), incremental checkpoints, and
// tuning. Centrepiece is a canvas LSM-tree simulation you drive: pump writes,
// watch the memtable flush to SSTs and compaction cascade down the levels, and
// take incremental vs full checkpoints to see what gets uploaded.
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { rideSpine, initRideSpine, rideCallout, scenarioList } from '../components/story-ui.js';
import { IQ_BANK } from '../data/iq-bank.js';
import { casesByModule } from '../data/interview-cases.js';

// ── Tab 1: the two backends ──────────────────────────────────────────────────
const BACKENDS = `
  <div class="sm-def card">
    <div class="sm-def-ic">🗄️</div>
    <div>
      <div class="sm-def-eyebrow">A state backend is where keyed state lives — and how it's snapshotted</div>
      <p class="sm-def-lead">Every <code>keyBy(...).process(...)</code> keeps per-key state. The <b>state backend</b> decides whether that state sits <b>on the JVM heap</b> (fast, but bounded by memory and GC) or in an <b>embedded RocksDB</b> instance <b>off-heap and on local disk</b> (near-unbounded, incremental checkpoints). For R-4471's per-driver fraud state across millions of drivers, the answer is RocksDB.</p>
    </div>
  </div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">HashMap vs EmbeddedRocksDB</div>
    <div class="section-desc">The single biggest state decision — and a very common interview question.</div>
  </div>
  <div class="code-block" style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:0.9rem">
      <thead><tr>
        <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border)"></th>
        <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);color:#3b82f6;font-weight:700">HashMapStateBackend</th>
        <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);color:#10b981;font-weight:700">EmbeddedRocksDBStateBackend</th>
      </tr></thead>
      <tbody>
        ${[
          ['Where state lives', 'JVM heap (Java objects)', 'Off-heap + local disk (RocksDB LSM)'],
          ['State size limit', 'Bounded by heap / RAM', 'Near-unbounded (spills to disk)'],
          ['Per-access cost', 'Fastest — direct object access', 'Serialize/deserialize + possible disk read'],
          ['GC pressure', 'High (state is on heap)', 'Low (state is off-heap)'],
          ['Incremental checkpoints', 'No — always full', 'Yes — upload only changed SSTs'],
          ['Best for', 'Small state, lowest latency', 'Large state, big windows, long TTL'],
        ].map(([k, a, b]) => `
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid var(--border);font-weight:600">${k}</td>
            <td style="padding:8px 10px;border-bottom:1px solid var(--border)">${a}</td>
            <td style="padding:8px 10px;border-bottom:1px solid var(--border)">${b}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="sm-why-grid" style="margin-top:20px">
    ${[
      ['⚡', 'Pick HashMap when…', 'State comfortably fits in memory and you need the absolute lowest latency — small keyed aggregates, short windows. No serialization on every access.'],
      ['🗃️', 'Pick RocksDB when…', 'State is large or unbounded — long TTL, big windows, millions of keys. It trades a serialization + occasional disk read for the ability to hold far more than RAM, with incremental checkpoints.'],
      ['🧠', 'Managed memory', 'RocksDB\'s block cache + write buffers come out of Flink\'s <em>managed memory</em> (<code>taskmanager.memory.managed.fraction</code>), not the JVM heap — so it does not fight your operators\' heap or cause GC.'],
      ['📸', 'Why incremental matters', 'RocksDB checkpoints upload only the SST files that changed since the last checkpoint. For 100s of GB of state, that is the difference between a 5s and a 5-minute checkpoint.'],
    ].map(([icon, title, body]) => `
      <div class="sm-why"><div class="sm-why-ic">${icon}</div><div class="sm-why-title">${title}</div><p>${body}</p></div>`).join('')}
  </div>

  <div class="sm-def card" style="margin:22px 0 6px;border-left:3px solid #FF6B35">
    <div class="sm-def-ic">🧭</div>
    <div>
      <div class="sm-def-eyebrow">Related modules</div>
      <p class="sm-def-lead" style="font-size:0.95rem">State semantics are in <a href="#m11" style="color:#FF6B35;font-weight:600">Module 11 — State Management</a>; snapshots in <a href="#m12" style="color:#FF6B35;font-weight:600">Checkpointing (12)</a>; rescaling keyed state uses key groups from <a href="#m05" style="color:#FF6B35;font-weight:600">Parallelism (05)</a>.</p>
    </div>
  </div>
`;

// ── Tab 3: tuning + incremental checkpoints ──────────────────────────────────
const TUNING = `
  <div class="section-header" style="margin:4px 0 12px">
    <div class="section-title">The RocksDB read path — why tuning matters</div>
    <div class="section-desc">A GET walks memtable → block cache → bloom filter → SST on disk.</div>
  </div>
  <div class="sm-keyed card">
    <div class="sm-keyed-flow">
      <b>GET key</b> <span class="sm-arrow">→</span> active memtable <span class="sm-arrow">→</span> immutable memtables <span class="sm-arrow">→</span> <b>block cache</b> (hit = done) <span class="sm-arrow">→</span> <b>bloom filter</b> per SST <span class="sm-arrow">→</span> read SST block from disk
    </div>
    <ul style="margin-top:14px">
      <li><b>Block cache</b> — caches uncompressed SST blocks in managed memory. A bigger cache = more read hits, fewer disk reads. The #1 read-latency lever.</li>
      <li><b>Bloom filters</b> — let a GET skip an SST that cannot contain the key, so a point lookup touches far fewer files. On by default; keep them.</li>
      <li><b>Write buffer (memtable) size</b> — bigger memtables = fewer, larger flushes = less write amplification, at the cost of memory and longer recovery.</li>
      <li><b>Write amplification</b> — leveled compaction rewrites data as it moves down levels, so 1 logical byte can become several bytes written to disk. The core RocksDB tradeoff: compaction keeps reads fast but costs write I/O.</li>
    </ul>
  </div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">Incremental checkpoints &amp; state TTL</div>
    <div class="section-desc">The two features that make large RocksDB state operable.</div>
  </div>
  <div class="sm-why-grid">
    ${[
      ['📸', 'Incremental checkpoints', 'Each checkpoint uploads only the <em>new</em> SST files since the last one (RocksDB SSTs are immutable once written). Full state is reconstructed from the chain. Only RocksDB supports this.'],
      ['⏳', 'State TTL', 'Expire state you no longer need (<code>StateTtlConfig</code>) so it doesn\'t grow forever. Cleanup can run in the background during compaction — the natural place to drop expired entries.'],
      ['🧮', 'Serializers', 'Every RocksDB access serializes the value. Use efficient, evolvable serializers (Avro/POJO) — never Kryo for long-lived state (it can\'t evolve and is slow).'],
      ['💽', 'Local disk', 'Point <code>state.backend.rocksdb.localdir</code> at fast local NVMe, not the network/root volume — compaction and reads are disk-bound.'],
    ].map(([icon, title, body]) => `
      <div class="sm-why"><div class="sm-why-ic">${icon}</div><div class="sm-why-title">${title}</div><p>${body}</p></div>`).join('')}
  </div>
`;

// ── Tab 4: PyFlink / config ──────────────────────────────────────────────────
const SETUP = `
  <div class="section-header" style="margin:4px 0 12px">
    <div class="section-title">Choose the backend in PyFlink</div>
    <div class="section-desc">RocksDB + incremental checkpoints is the standard for large keyed state.</div>
  </div>
  <div class="code-block pyflink fs-11"><span class="py-tier">PyFlink · DataStream</span><pre>from pyflink.datastream import StreamExecutionEnvironment, EmbeddedRocksDBStateBackend
from pyflink.datastream.checkpoint_storage import FileSystemCheckpointStorage

env = StreamExecutionEnvironment.get_execution_environment()

# RocksDB, with incremental checkpoints (2nd arg = enableIncrementalCheckpointing)
env.set_state_backend(EmbeddedRocksDBStateBackend(True))
env.get_checkpoint_config().set_checkpoint_storage(
    FileSystemCheckpointStorage("s3://uber-flink/checkpoints"))

env.enable_checkpointing(30_000)   # every 30s</pre></div>

  <div class="code-block fs-11"><span class="lang-tag">flink-conf.yaml — the knobs that matter</span><pre>state.backend.type: rocksdb
state.backend.incremental: true
state.backend.rocksdb.memory.managed: true          # cache+buffers from managed memory
taskmanager.memory.managed.fraction: 0.4            # give RocksDB room
state.backend.rocksdb.localdir: /mnt/nvme/flink     # fast local disk, not network
state.backend.rocksdb.predefined-options: SPINNING_DISK_OPTIMIZED_HIGH_MEM  # or FLASH_SSD_OPTIMIZED</pre></div>

  <div class="code-block pyflink fs-11"><span class="py-tier">PyFlink · state TTL (keep state from growing forever)</span><pre>from pyflink.datastream.state import ValueStateDescriptor, StateTtlConfig
from pyflink.common.time import Time

ttl = (StateTtlConfig.new_builder(Time.hours(24))
       .set_update_type(StateTtlConfig.UpdateType.OnCreateAndWrite)
       .cleanup_in_rocksdb_compact_filter(1000)   # drop expired during compaction
       .build())

desc = ValueStateDescriptor("driver_profile", Types.PICKLED_BYTE_ARRAY())
desc.enable_time_to_live(ttl)</pre></div>
`;

// ── Canvas LSM-tree simulation ───────────────────────────────────────────────
// Labelled SIMULATION of the RocksDB write path. Faithful to the mechanism:
// writes land in the active memtable; when full it flushes to an immutable SST
// in L0; when a level has too many files, leveled compaction merges them into
// larger SSTs one level down (rewriting data = write amplification). Incremental
// checkpoints upload only SSTs created since the last checkpoint.
function themePalette() {
  const dark = (document.documentElement.getAttribute('data-theme') || 'dark') !== 'light';
  return dark
    ? { bg: '#0b1220', line: 'rgba(148,163,184,0.22)', text: '#e2e8f0', mut: '#94a3b8', track: '#1b2740' }
    : { bg: '#ffffff', line: 'rgba(100,116,139,0.26)', text: '#1e293b', mut: '#64748b', track: '#e2e8f0' };
}
const BLUE = '#3b82f6', GREEN = '#10b981', ORANGE = '#FF6B35', PURPLE = '#a855f7', AMBER = '#f59e0b';
const LEVEL_COLORS = [BLUE, GREEN, PURPLE];        // L0, L1, L2
const LEVEL_TRIGGER = [4, 4, 6];                   // files that trigger compaction
const MEM_CAP = 16;

function buildLSM(container) {
  const host = container.querySelector('#tab-lsm');
  host.innerHTML = `
    <div class="sim-note">⚙️ <b>LSM write-path simulation.</b> Faithful to the mechanism: writes fill the active memtable; a full memtable
      <b>flushes</b> to an immutable SST in L0; when a level has too many files, <b>compaction</b> merges them into larger SSTs one level
      down — rewriting data, which is <b>write amplification</b>. Take a checkpoint to see incremental vs full upload.</div>
    <div class="sim-grid">
      <div class="sim-controls">
        <div class="sim-ctl-row">
          <label for="lsm-rate">Write rate <span id="lsm-rate-val" class="sim-badge">3</span></label>
          <input type="range" id="lsm-rate" min="1" max="7" value="3" class="sim-range" />
        </div>
        <div class="sim-ctl-row" style="margin-top:6px">
          <label><input type="checkbox" id="lsm-inc" checked> Incremental checkpoints</label>
        </div>
        <div class="sim-actions" style="margin-top:8px">
          <button class="ctrl-btn active" id="lsm-write">▶ Writing</button>
          <button class="ctrl-btn" id="lsm-ckpt">📸 Checkpoint</button>
          <button class="ctrl-btn" id="lsm-reset">↺ Reset</button>
        </div>
        <div class="sim-stats" id="lsm-stats"></div>
      </div>
      <div class="sim-stage">
        <canvas id="lsm-canvas" width="700" height="470" style="width:100%;max-width:720px"></canvas>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>This is one key group's RocksDB instance for R-4471's per-driver fraud state. New writes (driver updates) land in the <b>active memtable</b> (top bar). When it fills, it is <b>flushed</b> as an immutable <b>SST file</b> into <b>L0</b>. Once a level accumulates too many files, <b>leveled compaction</b> merges them into fewer, larger, sorted SSTs in the level below (<b>L1</b>, then <b>L2</b>). That merging is why <b>write amplification</b> climbs above 1× — each logical byte is rewritten several times as it sinks down the tree.</p>
      <p>Toggle <b>Incremental checkpoints</b> and press <b>Checkpoint</b>: with it on, only the SSTs created <em>since the last checkpoint</em> are uploaded (RocksDB SSTs are immutable, so unchanged files are reused); with it off, the <em>entire</em> state is uploaded every time. On hundreds of GB that is the difference between a few seconds and several minutes.</p>
      <p><b>Interview angle:</b> RocksDB trades per-access serialization + occasional disk reads for near-unbounded, off-heap state with incremental checkpoints. Bigger memtables mean fewer, larger flushes (less write amplification); a bigger block cache means more read hits. Leveled compaction keeps reads fast (fewer files to check, aided by bloom filters) at the cost of background write I/O.</p>
    </div>`;

  const canvas = host.querySelector('#lsm-canvas');
  const ctx = canvas.getContext('2d');
  const statsEl = host.querySelector('#lsm-stats');
  let S, raf = null, acc = 0, last = performance.now();
  let writing = true, incremental = true, rate = 3;
  const TICK_MS = 260;
  let sstSeq = 0;
  let lastCkpt = null;      // {uploaded, total, mode}

  function reset() {
    S = { mem: 0, levels: [[], [], []], logical: 0, disk: 0, flushes: 0, compactions: 0, flash: {}, ckptMarkSeq: 0 };
    sstSeq = 0; lastCkpt = null;
  }
  reset();

  function newSST(size, level) { return { id: ++sstSeq, size, level, born: performance.now() }; }

  function step() {
    S.mem += rate; S.logical += rate; S.disk += rate;       // WAL write
    if (S.mem >= MEM_CAP) {
      // flush active memtable → L0 SST
      S.levels[0].push(newSST(MEM_CAP, 0));
      S.disk += MEM_CAP; S.flushes += 1; S.mem = 0;
      S.flash.L0 = 1;
    }
    // leveled compaction, top-down
    for (let L = 0; L < 2; L++) {
      if (S.levels[L].length >= LEVEL_TRIGGER[L]) {
        const merged = S.levels[L].reduce((n, s) => n + s.size, 0);
        // merge with any existing overlap in L+1 (simplified: append one big SST)
        const carry = S.levels[L + 1].length ? S.levels[L + 1].pop().size : 0;
        const total = merged + carry;
        S.levels[L + 1].push(newSST(total, L + 1));
        S.levels[L] = [];
        S.disk += total;                 // compaction rewrites data = write amp
        S.compactions += 1;
        S.flash['L' + (L + 1)] = 1;
      }
    }
  }

  function checkpoint() {
    const all = S.levels.flat();
    const totalBytes = all.reduce((n, s) => n + s.size, 0) + S.mem;
    let uploaded;
    if (incremental) {
      const fresh = all.filter(s => s.id > S.ckptMarkSeq);
      uploaded = fresh.reduce((n, s) => n + s.size, 0);
      S.ckptMarkSeq = sstSeq;
    } else {
      uploaded = totalBytes;
    }
    lastCkpt = { uploaded, total: totalBytes, mode: incremental ? 'incremental' : 'full' };
    S.flash.ckpt = 1;
  }

  function renderStats() {
    const amp = S.logical ? (S.disk / S.logical) : 1;
    const sstCount = S.levels.flat().length;
    statsEl.innerHTML =
      `<div class="sim-stat"><span>Memtable</span><b>${S.mem}/${MEM_CAP}</b></div>` +
      `<div class="sim-stat"><span>SST files</span><b>${sstCount}</b></div>` +
      `<div class="sim-stat"><span>Flushes</span><b>${S.flushes}</b></div>` +
      `<div class="sim-stat"><span>Compactions</span><b>${S.compactions}</b></div>` +
      `<div class="sim-stat ${amp > 2 ? 'sim-stat-hot' : 'sim-stat-ok'}"><span>Write amplification</span><b>${amp.toFixed(2)}×</b></div>` +
      (lastCkpt
        ? `<div class="sim-stat ${lastCkpt.mode === 'full' ? 'sim-stat-hot' : 'sim-stat-ok'}"><span>Checkpoint (${lastCkpt.mode})</span><b>↑ ${lastCkpt.uploaded} / ${lastCkpt.total}</b></div>`
        : `<div class="sim-stat"><span>Checkpoint</span><b>—</b></div>`);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function draw() {
    const pal = themePalette();
    const W = canvas.width;
    ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, canvas.height);

    // memtable row
    ctx.fillStyle = pal.text; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('Active memtable (RAM)', 20, 26);
    const mX = 20, mY = 34, mW = W - 40, mH = 34;
    ctx.fillStyle = pal.track; roundRect(mX, mY, mW, mH, 6); ctx.fill();
    ctx.fillStyle = S.flash.L0 ? AMBER : ORANGE;
    roundRect(mX, mY, mW * (S.mem / MEM_CAP), mH, 6); ctx.fill();
    ctx.fillStyle = pal.mut; ctx.font = '10px system-ui'; ctx.textAlign = 'right';
    ctx.fillText('full → flush to L0 SST', mX + mW - 6, mY + 22);

    // WAL note
    ctx.textAlign = 'left'; ctx.fillStyle = pal.mut; ctx.font = '10px system-ui';
    ctx.fillText('every write also appends to the WAL (durability)', 20, mY + mH + 16);

    // levels
    const levelNames = ['L0 (flushed SSTs, may overlap)', 'L1 (sorted, non-overlapping)', 'L2 (larger, older)'];
    const rowY0 = 104, rowH = 96;
    S.levels.forEach((lvl, L) => {
      const y = rowY0 + L * rowH;
      const fk = 'L' + L;
      ctx.fillStyle = pal.text; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(levelNames[L], 20, y - 6);
      // trigger hint
      ctx.fillStyle = pal.mut; ctx.font = '9px system-ui'; ctx.textAlign = 'right';
      ctx.fillText(`compacts at ${LEVEL_TRIGGER[L]} files`, W - 20, y - 6);
      // track
      ctx.strokeStyle = pal.line; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      ctx.strokeRect(20, y, W - 40, 60); ctx.setLineDash([]);
      // SST blocks
      let x = 30;
      lvl.forEach(sst => {
        const bw = Math.max(26, Math.min(120, 20 + sst.size * 2.2));
        const flashing = S.flash[fk] > 0;
        ctx.fillStyle = LEVEL_COLORS[L] + (flashing ? 'ff' : 'cc');
        ctx.strokeStyle = LEVEL_COLORS[L]; ctx.lineWidth = flashing ? 3 : 1.5;
        roundRect(x, y + 12, bw, 36, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('SST', x + bw / 2, y + 28);
        ctx.font = '8px system-ui'; ctx.fillText(sst.size + 'u', x + bw / 2, y + 40);
        // "new since last checkpoint" marker for incremental
        if (incremental && sst.id > S.ckptMarkSeq) {
          ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(x + bw - 5, y + 16, 3.5, 0, 7); ctx.fill();
        }
        x += bw + 8;
        if (x > W - 60) { x = 30; }   // wrap guard (rare)
      });
      if (!lvl.length) { ctx.fillStyle = pal.mut; ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.fillText('empty', W / 2, y + 34); }
    });

    // checkpoint flash banner
    if (S.flash.ckpt > 0 && lastCkpt) {
      ctx.fillStyle = `rgba(16,185,129,${0.18 * S.flash.ckpt})`;
      ctx.fillRect(0, 0, W, canvas.height);
    }
    // legend for incremental marker
    if (incremental) {
      ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(28, canvas.height - 12, 4, 0, 7); ctx.fill();
      ctx.fillStyle = pal.mut; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('= new SST since last checkpoint (incremental upload)', 40, canvas.height - 8);
    }

    // decay flashes
    Object.keys(S.flash).forEach(k => { if (S.flash[k] > 0) S.flash[k] = Math.max(0, S.flash[k] - 0.05); });
    renderStats();
  }

  function loop(now) {
    const dt = now - last; last = now;
    if (writing) { acc += dt; while (acc >= TICK_MS) { step(); acc -= TICK_MS; } }
    draw();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  const rateVal = host.querySelector('#lsm-rate-val');
  host.querySelector('#lsm-rate').addEventListener('input', e => { rate = +e.target.value; rateVal.textContent = rate; });
  host.querySelector('#lsm-inc').addEventListener('change', e => { incremental = e.target.checked; });
  const writeBtn = host.querySelector('#lsm-write');
  writeBtn.addEventListener('click', () => {
    writing = !writing;
    writeBtn.textContent = writing ? '▶ Writing' : '⏸ Paused';
    writeBtn.classList.toggle('active', writing);
  });
  host.querySelector('#lsm-ckpt').addEventListener('click', checkpoint);
  host.querySelector('#lsm-reset').addEventListener('click', reset);

  return () => { if (raf) cancelAnimationFrame(raf); };
}

export function mount(container) {
  container.innerHTML = rideSpine({ active: ['LOCATION_UPDATED'] }) + createModuleShell({
    tag: '11b · State & Fault · Uber Edition',
    title: 'State Backends & RocksDB',
    subtitle: 'Where keyed state actually lives: on-heap HashMap vs off-heap, on-disk EmbeddedRocksDB — the LSM write path, leveled compaction, write amplification, incremental checkpoints and the tuning that makes hundreds of GB of state operable.',
    tabs: [
      { id: 'backends', label: '🗄️ State Backends', content: BACKENDS },
      { id: 'lsm', label: '🌲 RocksDB LSM Sim', content: '' },
      { id: 'tuning', label: '🎛️ Tuning & Checkpoints', content: TUNING },
      { id: 'setup', label: '💻 PyFlink & Config', content: SETUP },
      { id: 'iq', label: '🎤 Interview Q&A', content: createIQSection(IQ_BANK.m11b || []) },
    ],
  });

  initTabs(container);
  initRideSpine(container);
  const cases = casesByModule('m11b');
  if (cases && cases.length) {
    container.querySelector('#tab-backends').insertAdjacentHTML('beforeend',
      `<div class="section-header" style="margin:22px 0 12px"><div class="section-title">Corner cases — R-4471</div><div class="section-desc">The state-backend questions a senior interview actually asks.</div></div>${scenarioList(cases)}`);
  }
  const cleanup = buildLSM(container);
  initIQ(container);
  return cleanup;
}
