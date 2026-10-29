// ── Cache-write strategy visualizer (E15) ───────────────────────────────────
// Pick write-through / write-back / write-around, issue a write, and watch the
// path through cache and DB — plus the consistency / latency / durability
// trade-off each one makes.
//
// mount(container) → cleanup()

const STRATEGIES = {
  'write-through': {
    label: 'Write-through',
    path: ['App writes', 'Cache updated', 'DB updated (same call)', 'ACK to app'],
    sync: [true, true],
    note: 'Cache and DB are written together, synchronously. Reads after a write are always fresh.',
    scores: { Consistency: 3, 'Write latency': 1, Durability: 3 },
  },
  'write-back': {
    label: 'Write-back',
    path: ['App writes', 'Cache updated', 'ACK to app', '…later: flush to DB'],
    sync: [true, false],
    note: 'Write hits the cache and returns immediately; the DB is updated asynchronously. Fast writes, but a cache crash before flush loses data.',
    scores: { Consistency: 2, 'Write latency': 3, Durability: 1 },
  },
  'write-around': {
    label: 'Write-around',
    path: ['App writes', 'DB updated', 'ACK to app', 'cache NOT written'],
    sync: [false, true],
    note: 'Writes skip the cache and go straight to the DB. Great when written data is rarely re-read soon — but the first read after a write is a cache miss.',
    scores: { Consistency: 2, 'Write latency': 2, Durability: 3 },
  },
};

function bars(scores) {
  return Object.entries(scores).map(([k, v]) =>
    `<div class="wg-bar-row"><span class="wg-bar-label">${k}</span>
      <span class="wg-bar"><span class="wg-bar-fill lvl-${v}" style="width:${v/3*100}%"></span></span>
      <span class="wg-bar-val">${['', 'low', 'med', 'high'][v]}</span></div>`
  ).join('');
}

export function mount(container) {
  let key = 'write-through';
  let animTimers = [];

  const root = document.createElement('div');
  root.className = 'wg wg-cache';
  root.innerHTML = `
    <div class="wg-seg" id="cache-seg">
      ${Object.entries(STRATEGIES).map(([k, s]) =>
        `<button class="wg-seg-btn${k==='write-through'?' active':''}" data-k="${k}">${s.label}</button>`).join('')}
    </div>
    <div class="wg-cache-stage">
      <div class="wg-node wg-node-app" id="n-app">📱 App</div>
      <div class="wg-node wg-node-cache" id="n-cache">⚡ Cache</div>
      <div class="wg-node wg-node-db" id="n-db">💾 DB</div>
    </div>
    <div class="wg-steps" id="cache-steps"></div>
    <div class="wg-note" id="cache-note"></div>
    <div class="wg-bars" id="cache-bars"></div>
    <div class="wg-btnrow">
      <button class="sd-btn sd-btn-primary" id="cache-run">▶ Issue a write</button>
    </div>`;
  container.appendChild(root);

  const seg = root.querySelector('#cache-seg');
  const stepsEl = root.querySelector('#cache-steps');
  const noteEl = root.querySelector('#cache-note');
  const barsEl = root.querySelector('#cache-bars');
  const runBtn = root.querySelector('#cache-run');
  const nCache = root.querySelector('#n-cache');
  const nDb = root.querySelector('#n-db');

  function clearTimers() { animTimers.forEach(clearTimeout); animTimers = []; }

  function render() {
    const s = STRATEGIES[key];
    stepsEl.innerHTML = s.path.map((p, i) => `<span class="wg-step-chip" data-i="${i}">${p}</span>`).join('<span class="wg-step-arr">→</span>');
    noteEl.textContent = s.note;
    barsEl.innerHTML = bars(s.scores);
    nCache.classList.remove('hit'); nDb.classList.remove('hit', 'async');
  }

  function run() {
    clearTimers();
    render();
    const chips = [...stepsEl.querySelectorAll('.wg-step-chip')];
    chips.forEach((c, i) => animTimers.push(setTimeout(() => {
      chips.forEach(x => x.classList.remove('live'));
      c.classList.add('live', 'seen');
      if (/cache/i.test(c.textContent)) nCache.classList.add('hit');
      if (/DB/.test(c.textContent)) nDb.classList.add(key === 'write-back' ? 'async' : 'hit');
    }, 520 * (i + 1))));
  }

  seg.addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    key = b.dataset.k;
    seg.querySelectorAll('.wg-seg-btn').forEach(x => x.classList.toggle('active', x === b));
    render();
  });
  runBtn.addEventListener('click', run);

  render();
  return () => { clearTimers(); root.remove(); };
}
