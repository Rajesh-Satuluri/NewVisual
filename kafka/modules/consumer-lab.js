// Consumer Group Lab — a deterministic visual of how a group's consumers share
// a topic's partitions, why parallelism is capped by partition count, and how
// the assignment changes with the strategy. Uses the engine's assignPartitions.
// #consumer-lab PAGE.
import { createModuleShell, initTabs } from '../components/module-shell.js';
import { assignPartitions } from '../sim/engine.js';

const COLORS = ['#FF6900', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16'];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: '👥 Playground · Deterministic Simulation',
    title: 'Consumer Group Lab',
    subtitle: 'Change partitions, consumers, and the assignment strategy — watch how a group divides the work, and see exactly why you can never have more active consumers than partitions.',
    tabs: [
      { id: 'lab', label: '👥 Consumer Group' },
      { id: 'how', label: '📖 How it works' },
    ],
  });
  container.querySelector('#tab-how').innerHTML = HOW_HTML;
  initTabs(container);
  return build(container);
}

function build(container) {
  const tab = container.querySelector('#tab-lab');
  tab.innerHTML = `
    <div class="sim-note">⚙️ <b>Deterministic simulation.</b> Partition assignment uses the same rule Kafka's assignors follow — each partition goes to exactly one consumer in the group.</div>
    <div class="sim-grid">
      <div class="sim-controls">
        <div class="sim-ctl-row">
          <label for="cl-parts">Partitions <span id="cl-parts-val" class="sim-badge">6</span></label>
          <input type="range" id="cl-parts" min="1" max="12" value="6" class="sim-range" />
        </div>
        <div class="sim-ctl-row">
          <label for="cl-cons">Consumers in group <span id="cl-cons-val" class="sim-badge">3</span></label>
          <input type="range" id="cl-cons" min="1" max="8" value="3" class="sim-range" />
        </div>
        <div class="sim-ctl-row">
          <label for="cl-strategy">Assignment strategy</label>
          <select id="cl-strategy" class="sim-select">
            <option value="range">Range (contiguous blocks)</option>
            <option value="roundrobin">Round-robin (interleaved)</option>
          </select>
        </div>
        <div class="sim-stats" id="cl-stats"></div>
      </div>
      <div class="sim-stage" style="align-items:flex-start">
        <div class="cl-view" id="cl-view"></div>
      </div>
    </div>`;

  const partsEl = tab.querySelector('#cl-parts');
  const consEl = tab.querySelector('#cl-cons');
  const stratEl = tab.querySelector('#cl-strategy');
  const view = tab.querySelector('#cl-view');
  const stats = tab.querySelector('#cl-stats');

  const render = () => {
    const P = +partsEl.value, C = +consEl.value, strat = stratEl.value;
    tab.querySelector('#cl-parts-val').textContent = P;
    tab.querySelector('#cl-cons-val').textContent = C;
    const assign = assignPartitions(P, C, strat);
    const owner = {};
    assign.forEach((parts, c) => parts.forEach(p => { owner[p] = c; }));
    const active = assign.filter(a => a.length > 0).length;
    const idle = C - active;
    const maxParallel = Math.min(P, C);

    // Partition strip
    const partStrip = `
      <div class="cl-block">
        <div class="cl-block-label">Topic — ${P} partition${P > 1 ? 's' : ''}</div>
        <div class="cl-parts">
          ${Array.from({ length: P }, (_, p) => `
            <div class="cl-part" style="--c:${COLORS[owner[p] % COLORS.length]}">
              <span class="cl-part-id">P${p}</span>
              <span class="cl-part-owner">→ C${owner[p]}</span>
            </div>`).join('')}
        </div>
      </div>`;

    // Consumers
    const consumers = `
      <div class="cl-block">
        <div class="cl-block-label">Consumer group — ${C} consumer${C > 1 ? 's' : ''}</div>
        <div class="cl-cons">
          ${assign.map((parts, c) => `
            <div class="cl-con ${parts.length === 0 ? 'cl-con-idle' : ''}" style="--c:${COLORS[c % COLORS.length]}">
              <div class="cl-con-head"><span class="cl-con-dot"></span>Consumer C${c}</div>
              <div class="cl-con-parts">${parts.length ? parts.map(p => `<span class="cl-chip">P${p}</span>`).join('') : '<span class="cl-idle-tag">idle — no partition</span>'}</div>
            </div>`).join('')}
        </div>
      </div>`;

    view.innerHTML = partStrip + consumers;

    stats.innerHTML = `
      <div class="sim-stat ${idle > 0 ? 'sim-stat-hot' : 'sim-stat-ok'}">
        <b>Active parallelism:</b> ${maxParallel} of ${C} consumers
        ${idle > 0 ? `<div class="cl-warn">${idle} consumer${idle > 1 ? 's' : ''} idle — a group can't exceed ${P} active (one per partition). Add partitions to use them.</div>`
                   : `<div class="cl-ok">Every consumer owns at least one partition.</div>`}
      </div>
      <div class="sim-stat">
        <b>Load per consumer:</b> ${assign.map((a, c) => `C${c}:${a.length}`).join(' · ')}
      </div>`;
  };

  [partsEl, consEl, stratEl].forEach(el => el.addEventListener('input', render));
  render();
  return () => {};
}

const HOW_HTML = `
  <div class="canvas-explainer" style="border-radius:10px">
    <p>A <strong>consumer group</strong> is how Kafka shares a topic's work. The rule is simple and strict: <strong>each partition is consumed by exactly one consumer in the group</strong>. So the number of partitions is a hard ceiling on how many consumers can do useful work at once.</p>
    <ul>
      <li><strong>Consumers &lt; partitions</strong> — some consumers own several partitions. Fine, but each does more work.</li>
      <li><strong>Consumers = partitions</strong> — perfect one-to-one; maximum parallelism for this topic.</li>
      <li><strong>Consumers &gt; partitions</strong> — the extra consumers get <em>nothing</em> and sit idle. Adding them doesn't help; you must add partitions first.</li>
    </ul>
    <p>The <strong>assignment strategy</strong> decides which partitions go where. <strong>Range</strong> gives contiguous blocks (and can skew when a consumer subscribes to multiple topics); <strong>round-robin</strong> interleaves for a more even spread. Production clusters favor the <strong>cooperative-sticky</strong> assignor, which keeps consumers on their current partitions across rebalances to minimize disruption.</p>
    <p class="sim-note" style="margin-top:12px">This is a deterministic teaching simulation of the assignment math — not a live group with heartbeats and rebalancing.</p>
  </div>`;
