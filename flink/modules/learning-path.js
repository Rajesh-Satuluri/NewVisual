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
    scene: `It's 19:42 on a Thursday in Hyderabad. Somewhere in Hi-Tech City a rider opens the app, and a ride we'll follow for the rest of this course — R-4471 — is about to begin. But before we trace a single ping, we have to answer the question Uber had to answer first: why build any of this as a *stream* at all?`,
    problem: `Uber ingests roughly a million GPS pings every second. The old batch stack caught payment fraud about 45 minutes after a trip ended — long after the driver had been paid and had driven away. "We'll re-run the report tonight" is no answer when the money has already moved.`,
    batch: 'A nightly or hourly batch job can only ever tell you what happened hours ago. By the time it answers, the window to act has already closed.',
    need: 'A genuine shift in mindset: data as an unbounded stream processed continuously, with answers that update the instant events arrive — not tables recomputed on a cron schedule.',
    mods: ['m01', 'm02'],
    ride: ['RIDE_REQUESTED'],
    payoff: `By the end of this act you should feel the itch — batch simply cannot see "now", and "now" is where fraud, surge, and safety all live.`,
    milestone: 'You can explain, to a skeptic, why batch cannot catch sub-second fraud and what an "unbounded stream" actually is.',
    fast: false,
  },
  {
    n: 1, key: 'engine', icon: '🏛️', title: 'The engine — how one ping gets processed',
    time: '~50 min', tag: 'Architecture',
    scene: `R-4471's very first event lands on Kafka partition 7. Right now it's just one JSON blob among a million others this second. For it to become anything useful, an engine has to pick it up, carry it to the right worker, and run your logic on it — then do that a million more times before the second is out.`,
    problem: `Something has to pull that event off Kafka, route it to the correct worker, run your code in parallel across a whole cluster, and keep doing it a million times a second — all without you hand-provisioning a server for every event.`,
    batch: 'Trying to hand-shard events across machines yourself is exactly how you end up with hotspots, silently lost records, and a pipeline nobody can debug.',
    need: 'The cluster execution model: the JobManager and TaskManagers and their slots, how a job is scheduled onto them, how parallel subtasks split the load, and how records actually flow from one operator to the next.',
    mods: ['m03', 'm04', 'm05', 'm06', 'm07'],
    ride: ['DRIVER_SEARCHING'],
    payoff: `Once this clicks, R-4471 stops being "a record" and becomes a record with a *route* — you can point to the exact subtask that will handle it and say why.`,
    milestone: 'You can trace one record from Kafka source → keyBy → operator subtask, and explain why keyBy guarantees per-key correctness.',
    fast: false,
  },
  {
    n: 2, key: 'time', icon: '⏱️', title: 'Getting time right — the keystone',
    time: '~45 min · do not rush', tag: 'Time & Windows',
    scene: `Rahul, our driver, noses the white Dzire under the Durgam Cheruvu underpass on his way to the pickup. For thirteen seconds his phone has no signal. The GPS reading it took at +21 seconds sits trapped in the handset — and when the tunnel ends, it finally arrives at +34 seconds, long after the system had already moved on. This is the single most important act in the course.`,
    problem: `Which clock decides when something happened — the phone's clock, or Flink's? Get this wrong and the tunnel ping lands in the wrong window and quietly corrupts every distance and speed number for the whole trip.`,
    batch: 'Using arrival ("processing") time drops the tunnel ping into the wrong bucket and poisons the metrics downstream — and you may never notice.',
    need: 'Event time vs processing vs ingestion time; watermarks to reason about how "complete" the past is under out-of-order delivery; and windows to slice an endless stream into answerable questions. Everything downstream rests on this.',
    mods: ['m08', 'm09', 'm10'],
    ride: ['DRIVER_ARRIVING', 'DRIVER_ARRIVED'],
    incidents: ['DEFECT-1', 'DEFECT-2', 'DEFECT-3'],
    payoff: `When you finish here, late data stops being scary. You'll know exactly when a window fires, what happens to a straggler, and why a silent partition can freeze the entire job.`,
    milestone: 'You can explain watermarks, bounded-out-of-orderness, allowed lateness, side-outputs for late data, and why one idle partition can freeze every window.',
    fast: true,
  },
  {
    n: 3, key: 'state', icon: '🗄️', title: 'Remembering context — keyed state',
    time: '~35 min', tag: 'State',
    scene: `To know that Rahul accepted R-4471 eleven seconds after it was requested, Flink has to remember when it was requested — and hold that memory for one ride among millions, for the full twenty-two minutes of the trip. A function that only sees the event in front of it can't do that.`,
    problem: `To flag an impossibly fast trip, or compute accept-latency for R-4471, Flink must remember each driver's last position and each ride's requested-at time — across millions of concurrent keys, surviving for the whole trip.`,
    batch: 'A stateless function can compare two events it happens to hold at the same instant; it cannot *remember* one driver out of millions across twenty-two minutes.',
    need: 'Keyed vs operator state, ValueState and ListState, and heap vs RocksDB backends with TTL — this is Flink remembering R-4471 as events flow past.',
    mods: ['m11'],
    ride: ['DRIVER_ASSIGNED', 'DRIVER_ACCEPTED'],
    payoff: `State is where a stream processor earns its keep. After this you'll pick a backend and a TTL on purpose, not by guesswork.`,
    milestone: 'You can choose between heap and RocksDB, scope state correctly with keyBy, and justify a TTL.',
    fast: true,
  },
  {
    n: 4, key: 'recover', icon: '🛡️', title: 'Never losing money or state',
    time: '~55 min', tag: 'Fault tolerance',
    scene: `Nine minutes into the trip, the cloud reclaims a spot node — and with it, one TaskManager and everything it was holding in memory for R-4471. Then, as the ride ends, the billing database times out, the job restarts, and the payment event fires a second time. Two ways this trip could silently go wrong; a real rider's ₹523.50 on the line.`,
    problem: `A TaskManager vanishes mid-trip, taking live trip state with it. Later a sink failure makes the job replay and re-emit the payment for R-4471. The rider must never be charged ₹523.50 twice, and the trip's distance must survive the crash.`,
    batch: 'At-least-once delivery plus a non-idempotent sink double-charges a real customer. Lost state bills the wrong distance. Both are unacceptable.',
    need: 'Chandy–Lamport checkpoints for recoverable state, savepoints for planned upgrades and rescaling, restart strategies, and end-to-end exactly-once via two-phase commit or idempotent upsert sinks.',
    mods: ['m12', 'm13', 'm13b', 'm14'],
    ride: ['RIDE_STARTED', 'PAYMENT_COMPLETED', 'JOB_UPGRADE'],
    incidents: ['DEFECT-4', 'DEFECT-5'],
    payoff: `This is the act that lets you say "exactly-once" and mean it — you'll be able to walk a crash and a retry end to end and show the money stays correct.`,
    milestone: 'You can walk through a TaskManager-loss recovery and explain how exactly-once survives a sink retry.',
    fast: true,
  },
  {
    n: 5, key: 'scale', icon: '🌡️', title: 'Surviving scale — skew, backpressure, I/O',
    time: '~50 min', tag: 'Scale & I/O',
    scene: `A flight touches down at Rajiv Gandhi International. In seconds, the airport's map cell is carrying forty times the traffic of any other cell in the city — and every one of those events hashes to the same single subtask. It chokes; the rest of the cluster sits idle. Meanwhile a slow sink starts pushing back, and the pressure creeps upstream.`,
    problem: `One geo cell suddenly carries 40× the load, so a single subtask backpressures the entire job while its peers idle. At the same time a slowing sink makes pressure cascade upstream until the whole pipeline falls behind.`,
    batch: 'Ignore skew and your p99 latency is held hostage by one hot partition; ignore backpressure and the job quietly falls further behind forever.',
    need: 'Detecting and relieving backpressure, two-phase (salted) aggregation for hot keys, the connectors that feed and drain the job (Kafka, JDBC, filesystem), and the performance knobs that matter — serialization, network, and memory.',
    mods: ['m15', 'm16', 'm18'],
    ride: ['LOCATION_UPDATED', 'RIDE_COMPLETED'],
    incidents: ['DEFECT-6'],
    payoff: `After this you can open the Flink UI, find the one operator that's the bottleneck, and know the move — salt the key, tune the sink, or add parallelism.`,
    milestone: 'You can locate backpressure in the UI, salt a hot key, and name the tuning knobs that actually matter.',
    fast: true,
  },
  {
    n: 6, key: 'capstone', icon: '🗺️', title: 'Declarative power + the full platform',
    time: '~40 min', tag: 'APIs & End-to-end',
    scene: `R-4471 is complete and paid. But the analysts who write surge rules don't want to write Java — they want to write SQL. And you're now ready to step back and see the whole machine at once: source, time, state, recovery, scale, all wired into one pipeline you can narrate top to bottom.`,
    problem: `Analysts need to express surge and aggregation rules without touching DataStream code — and you need to assemble every piece you've learned into one coherent, end-to-end Uber pipeline.`,
    batch: null,
    need: 'Flink SQL and the Table API for declarative streaming, then the end-to-end capstone that wires the entire ride platform together.',
    mods: ['m17', 'm19'],
    ride: ['RIDE_COMPLETED'],
    payoff: `This is graduation: you can rebuild a windowed aggregation in SQL and then tell the whole story of R-4471 — from the first ping to the final receipt — without notes.`,
    milestone: 'You can rebuild a windowed aggregation in SQL and narrate the whole R-4471 pipeline end to end.',
    fast: false,
  },
];

// Human-friendly headlines for each embedded incident, so a scene reads as a
// story beat ("The tunnel swallows a ping") rather than an opaque code. The
// narrative body itself comes straight from INCIDENTS in ride-story.js.
const SCENE_HEADLINE = {
  'DEFECT-1': 'The tunnel swallows a GPS ping',
  'DEFECT-2': 'A ping arrives too late to count',
  'DEFECT-3': 'A silent partition freezes the clock',
  'DEFECT-4': 'A worker dies mid-trip',
  'DEFECT-5': 'The payment fires twice',
  'DEFECT-6': 'The airport becomes a hot key',
};

// Turn an incident's `numbers` object into a compact, readable fact strip.
function numbersStrip(nums) {
  if (!nums) return '';
  const pretty = (k) => k.replace(/_/g, ' ').replace(/\bsec\b/, 's');
  return Object.entries(nums)
    .map(([k, v]) => `<span class="lp-scene-num"><b>${esc(String(v))}</b> ${esc(pretty(k))}</span>`)
    .join('');
}

// The single-ping journey thread — one GPS ping from R-4471, hop by hop.
const PING_HOPS = [
  { ic: '📲', label: 'Produced', note: 'Phone emits the event to Kafka topic ride-events, partition 7.', mod: 'm16' },
  { ic: '📥', label: 'Sourced', note: 'KafkaSource reads it at a checkpointed offset (replayable).', mod: 'm07' },
  { ic: '⏱️', label: 'Timestamped', note: 'Event-time extracted; watermark decides completeness.', mod: 'm09' },
  { ic: '🔑', label: 'Keyed', note: 'keyBy(driver_id) routes it to exactly one subtask.', mod: 'm06' },
  { ic: '🪟', label: 'Windowed', note: 'Bucketed into its event-time window.', mod: 'm10' },
  { ic: '🗄️', label: 'State', note: 'Updates that driver/ride keyed state.', mod: 'm11' },
  { ic: '✅', label: 'Checkpointed', note: 'Its effect is made recoverable.', mod: 'm12' },
  { ic: '💳', label: 'Sunk once', note: 'Written exactly-once to the billing/DB sink.', mod: 'm07' },
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
    const sceneCards = (a.incidents || [])
      .map(id => incidentById[id])
      .filter(Boolean)
      .map((i, idx) => `
        <div class="lp-scene">
          <div class="lp-scene-head">
            <span class="lp-scene-no">Scene ${idx + 1}</span>
            <span class="lp-scene-title">${esc(SCENE_HEADLINE[i.id] || i.title)}</span>
            <span class="lp-scene-id">${esc(i.id)}</span>
          </div>
          <div class="lp-scene-beat"><span class="lp-scene-k">📖 What happens</span><p>${esc(i.story)}</p></div>
          <div class="lp-scene-beat break"><span class="lp-scene-k">💥 Why it breaks</span><p>${esc(i.breaks)}</p></div>
          <div class="lp-scene-beat fix"><span class="lp-scene-k">✅ How Flink saves it</span><p>${esc(i.flink)}</p></div>
          ${i.numbers ? `<div class="lp-scene-nums">${numbersStrip(i.numbers)}</div>` : ''}
          ${i.modules && i.modules[0] && MOD[i.modules[0]] ? `<button class="lp-scene-go" data-goto="${i.modules[0]}">Learn the fix → ${MOD[i.modules[0]].num} · ${esc(MOD[i.modules[0]].title)}</button>` : ''}
        </div>`)
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

          ${a.scene ? `<p class="lp-scene-set">${esc(a.scene)}</p>` : ''}

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

          ${stageLabels.length ? `
          <div class="lp-anchors">
            <span class="lp-anchor-k">In R-4471:</span>${stageLabels.map(l => `<span class="lp-stage">${l}</span>`).join('')}
          </div>` : ''}

          ${sceneCards ? `
          <div class="lp-scenes">
            <div class="lp-scenes-k">⚠️ What goes wrong in this act — and how Flink handles it</div>
            ${sceneCards}
          </div>` : ''}

          <div class="lp-steps-k">Walk these modules, in order:</div>
          <div class="lp-steps">${modSteps}</div>

          <div class="lp-milestone">
            <span class="lp-ms-ic">🎯</span>
            <div><strong>Milestone —</strong> ${esc(a.milestone)}</div>
          </div>

          ${a.payoff ? `<p class="lp-payoff"><span class="lp-payoff-ic">🎬</span> ${esc(a.payoff)}</p>` : ''}
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

      <div class="lp-cast">
        <span class="lp-cast-k">Meet the cast:</span>
        <span class="lp-cast-item">🚕 <b>R-4471</b> the ride we follow end to end</span>
        <span class="lp-cast-item">🧑‍✈️ <b>Rahul</b> the driver <code>${esc(RIDE.driver_id)}</code></span>
        <span class="lp-cast-item">🧍 the rider <code>${esc(RIDE.rider_id)}</code></span>
        <span class="lp-cast-item">📍 ${esc(RIDE.city_id)} · Hyderabad</span>
        <span class="lp-cast-item">🔢 Kafka topic <code>${esc(RIDE.topic)}</code>, partition ${esc(String(RIDE.partition))}</span>
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
