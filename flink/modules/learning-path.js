// Start Here — Learning Path.
// A guided, business-problem-first journey through the whole tool. Purely
// additive: it links INTO the existing modules in pedagogical order (not the
// raw m01→m19 filename order) and reuses the canonical ride R-4471 + its six
// embedded defects as the connective thread. Reads the existing `flink_done`
// progress set so Acts check themselves off — no new storage mechanics.
import { MODULES } from '../components/nav.js';
import { STAGES, INCIDENTS, RIDE } from '../data/ride-story.js';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Quick lookups into the authoritative module list (title + icon by id).
const MOD = Object.fromEntries(MODULES.map(m => [m.id, m]));

// ---------------------------------------------------------------------------
// The journey. Seven Acts, each a real business problem on ride R-4471, the
// Flink capability it demands, and the modules that teach it IN ORDER.
//   mods  : ordered module ids this Act walks through
//   ride  : lifecycle stage key(s) or defect id(s) this Act maps to
//   fast  : included in the interview fast-path
// ---------------------------------------------------------------------------
const ACTS = [
  {
    n: 0, key: 'orient', icon: '🧭', title: 'Orientation — why streaming at all',
    time: '~25 min', tag: 'Foundation',
    problem: `Uber ingests ~1,000,000 GPS pings a second. The old batch stack caught payment fraud ~45 minutes after the trip — long after the driver was paid and gone. "Run it again tonight" is not an answer when money moves in milliseconds.`,
    batch: 'A nightly/periodic batch job can only ever tell you what happened hours ago. The window of action has already closed.',
    need: 'A mindset shift: unbounded streams processed continuously, with results that update as events arrive — not tables recomputed on a cron.',
    mods: ['m01', 'm02'],
    ride: ['RIDE_REQUESTED'],
    milestone: 'You can explain, to a skeptic, why batch cannot catch sub-second fraud and what "unbounded stream" actually means.',
    fast: false,
  },
  {
    n: 1, key: 'engine', icon: '🏛️', title: 'The engine — how one ping gets processed',
    time: '~50 min', tag: 'Architecture',
    problem: `R-4471's first ping lands on Kafka partition 7. Something has to pull it, route it to the right worker, run your logic in parallel across a cluster, and do that a million times a second — without you provisioning a server per event.`,
    batch: 'Hand-sharding events across machines yourself is how you get hotspots, lost records, and un-debuggable pipelines.',
    need: 'The cluster execution model: JobManager + TaskManagers + slots, how a job is scheduled, how parallel subtasks split the load, and how records flow between operators.',
    mods: ['m03', 'm04', 'm05', 'm06', 'm07'],
    ride: ['DRIVER_SEARCHING'],
    milestone: 'You can trace a single record from Kafka source → keyBy → operator subtask, and say why keyBy guarantees per-key correctness.',
    fast: false,
  },
  {
    n: 2, key: 'time', icon: '⏱️', title: 'Getting time right — the keystone',
    time: '~45 min · do not rush', tag: 'Time & Windows',
    problem: `The driver dips under the Durgam Cheruvu underpass. A GPS ping stamped +21s is buffered on the phone and arrives at +34s (DEFECT-1) — after the system already "moved past" +21s. Which clock decides when it happened: the phone's, or Flink's?`,
    batch: 'Using arrival ("processing") time puts the tunnel ping in the wrong window and corrupts every distance & speed metric for the trip.',
    need: 'Event time vs processing vs ingestion time; watermarks to reason about completeness under out-of-order delivery; windows to bucket the stream. This is the conceptual spine everything downstream rests on.',
    mods: ['m08', 'm09', 'm10'],
    ride: ['DRIVER_ARRIVING', 'DRIVER_ARRIVED'],
    incidents: ['DEFECT-1', 'DEFECT-2', 'DEFECT-3'],
    milestone: 'You can explain watermarks, bounded-out-of-orderness, allowed lateness, side-output for late data, and why an idle partition can freeze every window.',
    fast: true,
  },
  {
    n: 3, key: 'state', icon: '🗄️', title: 'Remembering context — keyed state',
    time: '~35 min', tag: 'State',
    problem: `To flag an impossibly fast trip, or compute accept-latency for R-4471, Flink must remember each driver's last position and each ride's requested_at — across millions of concurrent keys, surviving for the whole trip.`,
    batch: 'A stateless function can compare two events it holds at once; it cannot "remember" one driver among millions over 22 minutes.',
    need: 'Keyed vs operator state, ValueState/ListState, and heap vs RocksDB backends with TTL — Flink remembering R-4471 across events.',
    mods: ['m11'],
    ride: ['DRIVER_ASSIGNED', 'DRIVER_ACCEPTED'],
    milestone: 'You can choose between heap and RocksDB, scope state correctly with keyBy, and justify a TTL.',
    fast: true,
  },
  {
    n: 4, key: 'recover', icon: '🛡️', title: 'Never losing money or state',
    time: '~55 min', tag: 'Fault tolerance',
    problem: `Mid-trip, a spot node running one TaskManager is reclaimed (DEFECT-4) — its in-memory trip state vanishes. Later the billing DB times out, the job restarts, and PAYMENT_COMPLETED for R-4471 is re-emitted (DEFECT-5). The rider must not be charged ₹523.50 twice.`,
    batch: 'At-least-once + a non-idempotent sink double-charges a real customer. Lost state bills the wrong distance.',
    need: 'Chandy-Lamport checkpoints for recoverable state, savepoints for planned upgrades/rescaling, restart strategies, and end-to-end exactly-once via 2PC / idempotent upsert sinks.',
    mods: ['m12', 'm13', 'm14'],
    ride: ['RIDE_STARTED', 'PAYMENT_COMPLETED', 'JOB_UPGRADE'],
    incidents: ['DEFECT-4', 'DEFECT-5'],
    milestone: 'You can walk through a TaskManager-loss recovery and explain how exactly-once survives a sink retry.',
    fast: true,
  },
  {
    n: 5, key: 'scale', icon: '🌡️', title: 'Surviving scale — skew, backpressure, I/O',
    time: '~50 min', tag: 'Scale & I/O',
    problem: `A flight lands and the RGIA airport cell suddenly carries 40× the events of any other (DEFECT-6) — one subtask backpressures the whole job while others idle. Meanwhile a sink slows down and pressure cascades upstream.`,
    batch: 'Ignore skew and your p99 latency is hostage to one hot partition; ignore backpressure and the job silently falls behind forever.',
    need: 'Detecting & relieving backpressure, two-phase (salted) aggregation for hot keys, connectors (Kafka/JDBC/filesystem) and performance tuning (serialization, network, memory).',
    mods: ['m15', 'm16', 'm18'],
    ride: ['LOCATION_UPDATED', 'RIDE_COMPLETED'],
    incidents: ['DEFECT-6'],
    milestone: 'You can locate backpressure in the UI, salt a hot key, and name the tuning knobs that matter.',
    fast: true,
  },
  {
    n: 6, key: 'capstone', icon: '🗺️', title: 'Declarative power + the full platform',
    time: '~40 min', tag: 'APIs & End-to-end',
    problem: `Analysts want to express surge rules without writing Java/PyFlink DataStream code. And you need to see every piece — source, time, state, recovery, scale — assembled into one coherent Uber pipeline.`,
    batch: null,
    need: 'Flink SQL & the Table API for declarative streaming, then the end-to-end capstone that wires the whole ride platform together.',
    mods: ['m17', 'm19'],
    ride: ['RIDE_COMPLETED'],
    milestone: 'You can rebuild a windowed aggregation in SQL and narrate the whole R-4471 pipeline end to end.',
    fast: false,
  },
];

// The single-ping journey thread — one GPS ping from R-4471, hop by hop.
const PING_HOPS = [
  { ic: '📲', label: 'Produced', note: 'Phone emits the event to Kafka topic ride-events, partition 7.', mod: 'm16' },
  { ic: '📥', label: 'Sourced', note: 'KafkaSource reads it at a checkpointed offset (replayable).', mod: 'm06' },
  { ic: '⏱️', label: 'Timestamped', note: 'Event-time extracted; watermark decides completeness.', mod: 'm09' },
  { ic: '🔑', label: 'Keyed', note: 'keyBy(driver_id) routes it to exactly one subtask.', mod: 'm07' },
  { ic: '🪟', label: 'Windowed', note: 'Bucketed into its event-time window.', mod: 'm10' },
  { ic: '🗄️', label: 'State', note: 'Updates that driver/ride keyed state.', mod: 'm11' },
  { ic: '✅', label: 'Checkpointed', note: 'Its effect is made recoverable.', mod: 'm12' },
  { ic: '💳', label: 'Sunk once', note: 'Written exactly-once to the billing/DB sink.', mod: 'm14' },
];

// Fast-path order (interview prep): the high-signal modules first.
const FAST_ORDER = ['m09', 'm11', 'm14', 'm16', 'm10', 'm08', 'm12', 'm15'];

export function mount(container) {
  const done = new Set(JSON.parse(localStorage.getItem('flink_done') || '[]'));
  const incidentById = Object.fromEntries(INCIDENTS.map(i => [i.id, i]));

  const totalMods = MODULES.length;
  const doneCount = [...done].filter(id => MOD[id]).length;
  const pct = Math.round((doneCount / totalMods) * 100);

  // next uncompleted module following the Act order
  const actOrder = ACTS.flatMap(a => a.mods);
  const nextId = actOrder.find(id => !done.has(id)) || 'm01';

  const actDone = (a) => a.mods.every(id => done.has(id));

  function actCard(a) {
    const complete = actDone(a);
    const stageLabels = (a.ride || [])
      .map(k => STAGES.find(s => s.key === k))
      .filter(Boolean)
      .map(s => `${s.icon} ${esc(s.label)}`);
    const defectChips = (a.incidents || [])
      .map(id => incidentById[id])
      .filter(Boolean)
      .map(i => `<span class="lp-defect" title="${esc(i.title)}">⚠ ${esc(i.id)}</span>`)
      .join('');
    const modSteps = a.mods.map((id, i) => {
      const m = MOD[id];
      if (!m) return '';
      const d = done.has(id);
      return `
        <button class="lp-step${d ? ' done' : ''}" data-goto="${id}">
          <span class="lp-step-n">${i + 1}</span>
          <span class="lp-step-ic">${m.icon}</span>
          <span class="lp-step-body">
            <span class="lp-step-title">${m.num} · ${esc(m.title)}</span>
          </span>
          <span class="lp-step-go">${d ? '✓' : '→'}</span>
        </button>`;
    }).join('');

    return `
      <section class="lp-act${complete ? ' complete' : ''}" id="act-${a.key}">
        <div class="lp-act-rail">
          <div class="lp-act-num">${a.icon}</div>
          ${complete ? '<div class="lp-act-check">✓</div>' : ''}
        </div>
        <div class="lp-act-main">
          <div class="lp-act-head">
            <span class="lp-act-kicker">ACT ${a.n} · ${esc(a.tag)} · ${esc(a.time)}</span>
            <h3 class="lp-act-title">${esc(a.title)}</h3>
          </div>

          <div class="lp-prob">
            <div class="lp-prob-k">🧩 The business problem</div>
            <p>${esc(a.problem)}</p>
          </div>

          ${a.batch ? `
          <div class="lp-why-fail">
            <span class="lp-chip-k">Why batch fails</span>
            <span>${esc(a.batch)}</span>
          </div>` : ''}

          <div class="lp-need">
            <div class="lp-need-k">🛠 What Flink needs to solve it</div>
            <p>${esc(a.need)}</p>
          </div>

          ${stageLabels.length || defectChips ? `
          <div class="lp-anchors">
            ${stageLabels.length ? `<span class="lp-anchor-k">In R-4471:</span>${stageLabels.map(l => `<span class="lp-stage">${l}</span>`).join('')}` : ''}
            ${defectChips}
          </div>` : ''}

          <div class="lp-steps-k">Walk these modules, in order:</div>
          <div class="lp-steps">${modSteps}</div>

          <div class="lp-milestone">
            <span class="lp-ms-ic">🎯</span>
            <div><strong>Milestone —</strong> ${esc(a.milestone)}</div>
          </div>
        </div>
      </section>`;
  }

  const pingThread = PING_HOPS.map((h, i) => `
    <button class="lp-hop" data-goto="${h.mod}" title="${esc(h.note)}">
      <span class="lp-hop-ic">${h.ic}</span>
      <span class="lp-hop-lbl">${esc(h.label)}</span>
    </button>${i < PING_HOPS.length - 1 ? '<span class="lp-hop-arrow">→</span>' : ''}`).join('');

  container.innerHTML = `
    <div class="module-page lp">
      <div class="module-hero">
        <div class="module-tag">🧭 Start Here · Guided Path · Uber Edition</div>
        <h1 class="module-title">The Learning Path</h1>
        <p class="module-subtitle">
          Don't read Flink concept-by-concept in the abstract. Follow one real ride —
          <strong>${esc(RIDE.ride_id)}</strong> in ${esc(RIDE.city_id)} — and learn each capability
          at the exact moment the business needs it. Seven Acts, each a real problem, each
          pointing you to the right modules in the right order.
        </p>
      </div>

      <div class="lp-progress-bar">
        <div class="lp-pb-text">${doneCount} / ${totalMods} modules complete</div>
        <div class="lp-pb-track"><div class="lp-pb-fill" style="width:${pct}%"></div></div>
        <button class="btn btn-primary lp-resume" data-goto="${nextId}">
          ${doneCount ? 'Resume' : 'Begin'} — ${MOD[nextId] ? MOD[nextId].icon + ' ' + esc(MOD[nextId].title) : 'Start'} <span>→</span>
        </button>
        ${doneCount ? '<button class="lp-reset" type="button" title="Clear all completed-module progress">↺ Reset progress</button>' : ''}
      </div>

      <div class="lp-mode">
        <span class="lp-mode-k">Pick your track:</span>
        <button class="lp-mode-btn active" data-mode="full">🧗 Full guided path</button>
        <button class="lp-mode-btn" data-mode="fast">⚡ Interview fast-path</button>
      </div>

      <div class="lp-ping">
        <div class="lp-ping-head">
          <span class="lp-ping-title">The thread that ties it all together</span>
          <span class="lp-ping-sub">Follow <strong>one GPS ping</strong> from ${esc(RIDE.ride_id)} through every hop. Each Act below teaches one of these.</span>
        </div>
        <div class="lp-ping-track">${pingThread}</div>
      </div>

      <div class="lp-acts" id="lp-acts">
        ${ACTS.map(actCard).join('')}
      </div>

      <div class="lp-fast" id="lp-fast" hidden>
        <div class="lp-fast-head">
          <h3>⚡ Interview fast-path</h3>
          <p>Short on time before an interview? Hit the highest-signal modules first, then drill the corner cases. Each still anchors to ${esc(RIDE.ride_id)}.</p>
        </div>
        <div class="lp-fast-steps">
          ${FAST_ORDER.map((id, i) => {
            const m = MOD[id];
            if (!m) return '';
            return `<button class="lp-step${done.has(id) ? ' done' : ''}" data-goto="${id}">
              <span class="lp-step-n">${i + 1}</span>
              <span class="lp-step-ic">${m.icon}</span>
              <span class="lp-step-body"><span class="lp-step-title">${m.num} · ${esc(m.title)}</span></span>
              <span class="lp-step-go">${done.has(id) ? '✓' : '→'}</span>
            </button>`;
          }).join('')}
        </div>
        <div class="lp-fast-finish">
          <button class="lp-step highlight" data-goto="study">
            <span class="lp-step-ic">📚</span>
            <span class="lp-step-body"><span class="lp-step-title">Finish in Study Hub → 🎬 Scenario drill (R-4471)</span></span>
            <span class="lp-step-go">→</span>
          </button>
          <button class="lp-step highlight" data-goto="cheatsheet">
            <span class="lp-step-ic">📋</span>
            <span class="lp-step-body"><span class="lp-step-title">Last-minute recall → Cheat Sheet</span></span>
            <span class="lp-step-go">→</span>
          </button>
        </div>
      </div>

      <div class="lp-finisher">
        <div class="lp-fin-head">🏁 When you've finished the Acts</div>
        <p>Prove it under interview pressure: run every corner case in the scenario drill, then keep the cheat sheet for recall.</p>
        <div class="lp-fin-cards">
          <button class="home-mod-card" data-goto="study"><span class="home-mod-ic">📚</span><span class="home-mod-body"><div class="home-mod-title">Study Hub — Scenario drill</div><div class="home-mod-desc">All 26 R-4471 corner cases, filterable by difficulty & module.</div></span></button>
          <button class="home-mod-card" data-goto="master-map"><span class="home-mod-ic">🗺️</span><span class="home-mod-body"><div class="home-mod-title">Master Map</div><div class="home-mod-desc">Every concept on one page, wired into the pipeline.</div></span></button>
          <button class="home-mod-card" data-goto="cheatsheet"><span class="home-mod-ic">📋</span><span class="home-mod-body"><div class="home-mod-title">Cheat Sheet</div><div class="home-mod-desc">APIs, configs & CLI for last-minute recall.</div></span></button>
        </div>
      </div>
    </div>
  `;

  // Navigation (delegated).
  const onClick = (e) => {
    const btn = e.target.closest('[data-goto]');
    if (btn) { window.location.hash = btn.dataset.goto; return; }
    if (e.target.closest('.lp-reset')) {
      if (window.confirm('Reset your learning progress? This clears every module you’ve marked complete across the whole tool. This cannot be undone.')) {
        try { localStorage.removeItem('flink_done'); } catch (err) {}
        window.location.reload();
      }
      return;
    }
    const mode = e.target.closest('.lp-mode-btn');
    if (mode) {
      container.querySelectorAll('.lp-mode-btn').forEach(b => b.classList.toggle('active', b === mode));
      const fast = mode.dataset.mode === 'fast';
      container.querySelector('#lp-acts').hidden = fast;
      container.querySelector('#lp-fast').hidden = !fast;
    }
  };
  container.addEventListener('click', onClick);
  return () => container.removeEventListener('click', onClick);
}
