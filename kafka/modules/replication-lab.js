// Replication & Failure Lab — build a topic with a replication factor across a
// set of brokers, then kill brokers and watch the controller re-elect leaders
// from the ISR, mark partitions under-replicated, or take them offline when no
// in-sync replica survives. Deterministic; uses the shared KafkaSim engine.
// #replication-lab PAGE.
import { createModuleShell, initTabs } from '../components/module-shell.js';
import { KafkaSim } from '../sim/engine.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: '🔁 Playground · Deterministic Simulation',
    title: 'Replication & Failure Lab',
    subtitle: 'Set a replication factor, then kill brokers and watch leaders re-elect from the ISR — see exactly when a partition is under-replicated versus truly offline.',
    tabs: [
      { id: 'lab', label: '🔁 Replication' },
      { id: 'how', label: '📖 How it works' },
    ],
  });
  container.querySelector('#tab-how').innerHTML = HOW_HTML;
  initTabs(container);
  return build(container);
}

function build(container) {
  const tab = container.querySelector('#tab-lab');
  let sim, brokers = 3, parts = 4, rf = 3;

  const rebuild = () => {
    sim = new KafkaSim({ seed: 42, brokers });
    rf = Math.min(rf, brokers);
    sim.createTopic('orders', { partitions: parts, replicationFactor: rf });
  };
  rebuild();

  tab.innerHTML = `
    <div class="sim-note">⚙️ <b>Deterministic simulation.</b> Leader election follows Kafka's rule — only an in-sync replica can be promoted. With unclean election off, a partition with no in-sync replica goes <b>offline</b> rather than lose data.</div>
    <div class="sim-grid">
      <div class="sim-controls">
        <div class="sim-ctl-row">
          <label for="rl-brokers">Brokers <span id="rl-brokers-val" class="sim-badge">3</span></label>
          <input type="range" id="rl-brokers" min="1" max="5" value="3" class="sim-range" />
        </div>
        <div class="sim-ctl-row">
          <label for="rl-parts">Partitions <span id="rl-parts-val" class="sim-badge">4</span></label>
          <input type="range" id="rl-parts" min="1" max="8" value="4" class="sim-range" />
        </div>
        <div class="sim-ctl-row">
          <label for="rl-rf">Replication factor <span id="rl-rf-val" class="sim-badge">3</span></label>
          <input type="range" id="rl-rf" min="1" max="5" value="3" class="sim-range" />
        </div>
        <div class="sim-ctl-row">
          <label>Brokers — click to kill / revive</label>
          <div class="rl-brokers" id="rl-broker-btns"></div>
        </div>
        <div class="sim-stats" id="rl-stats"></div>
      </div>
      <div class="sim-stage" style="align-items:flex-start">
        <div class="rl-view" id="rl-view"></div>
      </div>
    </div>`;

  const brokersEl = tab.querySelector('#rl-brokers');
  const partsEl = tab.querySelector('#rl-parts');
  const rfEl = tab.querySelector('#rl-rf');
  const brokerBtns = tab.querySelector('#rl-broker-btns');
  const view = tab.querySelector('#rl-view');
  const stats = tab.querySelector('#rl-stats');

  const render = () => {
    tab.querySelector('#rl-brokers-val').textContent = brokers;
    tab.querySelector('#rl-parts-val').textContent = parts;
    rfEl.max = brokers;
    if (rf > brokers) rf = brokers;
    rfEl.value = rf;
    tab.querySelector('#rl-rf-val').textContent = rf;

    // Broker kill/revive buttons
    brokerBtns.innerHTML = sim.brokers.map(b => `
      <button class="rl-broker ${b.alive ? '' : 'rl-broker-dead'}" data-broker="${b.id}" title="${b.alive ? 'Click to kill' : 'Click to revive'}">
        ${b.alive ? '🖥️' : '💥'} B${b.id}
      </button>`).join('');
    brokerBtns.querySelectorAll('.rl-broker').forEach(btn => btn.addEventListener('click', () => {
      const id = +btn.dataset.broker;
      const b = sim.brokers.find(x => x.id === id);
      sim.setBrokerAlive(id, !b.alive);
      render();
    }));

    // Replication grid
    const rview = sim.replicationView('orders');
    const rows = rview.map(p => {
      const cells = sim.brokers.map(b => {
        const rep = p.replicas.find(r => r.broker === b.id);
        if (!rep) return `<td class="rl-cell rl-none">·</td>`;
        if (!rep.alive) return `<td class="rl-cell rl-dead" title="broker down">✕</td>`;
        if (rep.role === 'leader') return `<td class="rl-cell rl-leader" title="leader">L</td>`;
        if (rep.inSync) return `<td class="rl-cell rl-insync" title="in-sync follower">R</td>`;
        return `<td class="rl-cell rl-out" title="out of sync">r</td>`;
      }).join('');
      const tag = p.offline ? `<span class="rl-tag rl-tag-off">OFFLINE</span>`
                : p.underReplicated ? `<span class="rl-tag rl-tag-ur">under-replicated</span>`
                : `<span class="rl-tag rl-tag-ok">healthy</span>`;
      return `<tr><th class="rl-pname">P${p.partition}</th>${cells}<td class="rl-status">${tag}</td></tr>`;
    }).join('');

    view.innerHTML = `
      <table class="rl-table">
        <thead><tr><th></th>${sim.brokers.map(b => `<th class="rl-bhead ${b.alive ? '' : 'rl-bhead-dead'}">B${b.id}</th>`).join('')}<th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="rl-legend">
        <span><b class="rl-k rl-leader">L</b> leader</span>
        <span><b class="rl-k rl-insync">R</b> in-sync</span>
        <span><b class="rl-k rl-out">r</b> out of sync</span>
        <span><b class="rl-k rl-dead">✕</b> broker down</span>
        <span><b class="rl-k rl-none">·</b> no replica</span>
      </div>`;

    const h = sim.replicationHealth('orders');
    const cls = h.offline ? 'sim-stat-hot' : h.underReplicated ? 'sim-stat-hot' : 'sim-stat-ok';
    stats.innerHTML = `
      <div class="sim-stat ${cls}">
        <b>Live brokers:</b> ${h.liveBrokers}/${brokers} &nbsp; · &nbsp;
        <b>Under-replicated:</b> ${h.underReplicated} &nbsp; · &nbsp;
        <b>Offline:</b> ${h.offline}
        ${h.offline ? `<div class="cl-warn">${h.offline} partition${h.offline > 1 ? 's have' : ' has'} no in-sync replica — offline to avoid data loss. Revive a broker or raise RF.</div>`
          : h.underReplicated ? `<div class="cl-warn">Still available, but durability margin is reduced — followers must re-sync.</div>`
          : `<div class="cl-ok">All partitions fully replicated and in-sync.</div>`}
      </div>`;
  };

  brokersEl.addEventListener('input', () => { brokers = +brokersEl.value; rebuild(); render(); });
  partsEl.addEventListener('input', () => { parts = +partsEl.value; rebuild(); render(); });
  rfEl.addEventListener('input', () => { rf = +rfEl.value; rebuild(); render(); });
  render();
  return () => {};
}

const HOW_HTML = `
  <div class="canvas-explainer" style="border-radius:10px">
    <p>Every partition has a <strong>replication factor</strong> worth of copies spread across brokers. One copy is the <strong>leader</strong> (handles all reads and writes); the rest are <strong>followers</strong> that replicate from it. The caught-up copies form the <strong>ISR (in-sync replicas)</strong>.</p>
    <ul>
      <li><strong>Kill a broker</strong> and the controller drops it from every ISR. If it led a partition, an in-sync replica is promoted — fast failover with no acknowledged-data loss.</li>
      <li>A partition that loses a replica but keeps an in-sync one is <strong>under-replicated</strong>: still available, but its durability margin is reduced until followers catch up.</li>
      <li>If a partition loses <em>all</em> in-sync replicas, it goes <strong>offline</strong> rather than promote an out-of-sync copy — because unclean leader election is off, trading availability for no data loss.</li>
    </ul>
    <p>Try <strong>RF=3</strong> and kill one broker (everything stays healthy/under-replicated), then kill a second — watch some partitions go offline. Compare with <strong>RF=1</strong>, where a single failure takes partitions down immediately.</p>
    <p class="sim-note" style="margin-top:12px">Deterministic teaching simulation of leader election and ISR — not a live cluster with real replication lag.</p>
  </div>`;
