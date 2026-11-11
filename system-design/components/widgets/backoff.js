// ── Retry-storm & backoff lab (E18) ─────────────────────────────────────────
// A downstream service fails for a few seconds. Compare how the offered load
// behaves when clients retry immediately vs. exponential backoff + jitter.
// Naive retries stack on top of new traffic and keep the service down long
// after it would otherwise recover.
//
// mount(container) → cleanup()

const TICKS = 16;          // time steps
const OUTAGE = [3, 7];     // service is down during ticks [3,7)
const BASE = 100;          // new requests per tick
const CAPACITY = 150;      // service can serve this many per tick when healthy

function simulate(mode) {
  // returns array of { offered, served, failed } per tick
  const out = [];
  let backlog = 0;          // retries queued from prior failures
  for (let t = 0; t < TICKS; t++) {
    const down = t >= OUTAGE[0] && t < OUTAGE[1];
    const offered = BASE + backlog;
    let served = 0, failed = 0;
    if (down) { failed = offered; served = 0; }
    else { served = Math.min(CAPACITY, offered); failed = offered - served; }
    // how much of the failed load comes back as retries next tick?
    let retryFraction;
    if (mode === 'naive') retryFraction = 1.0;          // everyone retries immediately, every tick
    else if (mode === 'backoff') retryFraction = 0.5;   // exp backoff spreads retries out
    else retryFraction = 0.3;                            // backoff + jitter spreads them further
    backlog = Math.round(failed * retryFraction);
    out.push({ offered, served, failed, down });
  }
  return out;
}

export function mount(container) {
  let mode = 'naive';

  const root = document.createElement('div');
  root.className = 'wg wg-backoff';
  root.innerHTML = `
    <div class="wg-seg" id="bo-seg">
      <button class="wg-seg-btn active" data-m="naive">Immediate retry</button>
      <button class="wg-seg-btn" data-m="backoff">Exp. backoff</button>
      <button class="wg-seg-btn" data-m="jitter">Backoff + jitter</button>
    </div>
    <div class="wg-chart" id="bo-chart"></div>
    <div class="wg-chart-legend">
      <span><span class="wg-leg-dot" style="background:var(--accent)"></span>offered load</span>
      <span><span class="wg-leg-dot" style="background:var(--green)"></span>served</span>
      <span><span class="wg-leg-dot" style="background:var(--red)"></span>failed</span>
      <span class="wg-cap-key">— capacity (${CAPACITY}/tick)</span>
    </div>
    <div class="wg-note" id="bo-note"></div>`;
  container.appendChild(root);

  const chart = root.querySelector('#bo-chart');
  const note = root.querySelector('#bo-note');
  const seg = root.querySelector('#bo-seg');

  const NOTES = {
    naive: '❌ Every failed request retries immediately, so the backlog snowballs. Offered load keeps climbing and the service stays overwhelmed well past the original outage — a retry storm.',
    backoff: '⚠️ Exponential backoff spaces retries out, so the pile-up is smaller and the service drains the backlog faster once it recovers.',
    jitter: '✅ Backoff + jitter spreads retries across time so they don’t resynchronize into waves. Load settles back to baseline quickly after the outage.',
  };

  function render() {
    const data = simulate(mode);
    const max = Math.max(CAPACITY, ...data.map(d => d.offered));
    const capY = 100 - (CAPACITY / max * 100);
    chart.innerHTML = `
      <div class="wg-cap-line" style="bottom:${CAPACITY / max * 100}%"></div>
      ${data.map((d, t) => `
        <div class="wg-bar-col${d.down ? ' down' : ''}" title="tick ${t}: offered ${d.offered}, served ${d.served}, failed ${d.failed}">
          <span class="wg-stack">
            <span class="wg-seg-fail" style="height:${d.failed / max * 100}%"></span>
            <span class="wg-seg-ok" style="height:${d.served / max * 100}%"></span>
          </span>
          <span class="wg-bar-t">${t}</span>
        </div>`).join('')}`;
    note.innerHTML = NOTES[mode];
  }

  seg.addEventListener('click', e => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    mode = b.dataset.m;
    seg.querySelectorAll('.wg-seg-btn').forEach(x => x.classList.toggle('active', x === b));
    render();
  });

  render();
  return () => { root.remove(); };
}
