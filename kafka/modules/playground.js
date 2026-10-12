import { createModuleShell, initTabs } from '../components/module-shell.js';
import { KafkaSim, partitionForKey } from '../sim/engine.js';

// ─────────────────────────────────────────────────────────────────────────────
// Kafka Playground — Iteration 1: the Partition Simulator.
// A deterministic, repeatable sandbox driven by the shared KafkaSim engine.
// Everything here is a SIMULATION (clearly labelled), but key→partition routing
// uses Kafka's real murmur2 partitioner, so the distributions are accurate.
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = ['#FF6900', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4',
                '#EC4899', '#84CC16', '#F97316', '#14B8A6', '#A855F7', '#EF4444'];

// Preset key strategies — each is an honest, named routing scenario.
const PRESETS = {
  order_id:    { label: 'order_id (UUID)',   card: 'high', gen: i => 'order-' + (1e6 + i) },
  customer_id: { label: 'customer_id',       card: 'high', gen: i => 'cust-' + ((i * 2654435761) % 300000000) },
  country:     { label: 'country (skewed)',  card: 'low',  gen: () => pickWeighted(COUNTRY_W) },
  payment:     { label: 'payment_type',      card: 'low',  gen: () => pickWeighted(PAY_W) },
  none:        { label: 'null (no key)',     card: 'none', gen: () => null },
};
const COUNTRY_W = [['US', 0.65], ['EU', 0.18], ['APAC', 0.1], ['LATAM', 0.05], ['MEA', 0.02]];
const PAY_W = [['credit_card', 0.7], ['prime_wallet', 0.2], ['gift_card', 0.07], ['other', 0.03]];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: '🎮 Playground · Deterministic Simulation',
    title: 'Partition Simulator',
    subtitle: 'Publish events, change the key strategy and partition count, and watch Kafka\'s real murmur2 partitioner route them — repeatable every time',
    tabs: [
      { id: 'sim', label: '🗂️ Partition Simulator' },
      { id: 'how', label: '📖 How it works' },
    ],
  });
  container.querySelector('#tab-how').innerHTML = HOW_HTML;
  initTabs(container);
  return buildSim(container);
}

function buildSim(container) {
  const tab = container.querySelector('#tab-sim');
  tab.innerHTML = `
    <div class="sim-note">⚙️ <b>Deterministic simulation.</b> Routing uses Kafka's actual
      <code>murmur2(key) &amp; 0x7fffffff % partitions</code> algorithm. Same seed + same actions ⇒ identical result every run — press <b>Reset</b> to replay.</div>

    <div class="sim-grid">
      <div class="sim-controls" id="sim-controls">
        <div class="sim-ctl-row">
          <label for="sim-key">Partition key</label>
          <select id="sim-key" class="sim-select">
            ${Object.entries(PRESETS).map(([k, v], i) =>
              `<option value="${k}" ${i === 0 ? 'selected' : ''}>${v.label}</option>`).join('')}
          </select>
        </div>
        <div class="sim-ctl-row">
          <label for="sim-parts">Partitions <span id="sim-parts-val" class="sim-badge">6</span></label>
          <input type="range" id="sim-parts" min="1" max="12" value="6" class="sim-range" />
        </div>
        <div class="sim-actions">
          <button class="ctrl-btn active" id="sim-pub1">▶ Publish 1</button>
          <button class="ctrl-btn" id="sim-pub100">⏩ Publish 100</button>
          <button class="ctrl-btn" id="sim-reset">↺ Reset</button>
        </div>
        <div class="sim-stats" id="sim-stats"></div>
      </div>

      <div class="sim-stage">
        <canvas id="sim-canvas" width="640" height="440" style="width:100%;max-width:640px"></canvas>
      </div>
    </div>

    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Each bar is one partition of the <code>orders</code> topic. When you publish a record, the engine computes its partition exactly as a Kafka broker would: for a <strong>keyed</strong> record it takes <code>murmur2(key) &amp; 0x7fffffff % numPartitions</code>; for a <strong>null-key</strong> record it uses the <strong>sticky partitioner</strong>, filling one partition per batch before rotating. The newest record flashes on the bar it landed in.</p>
      <p>Switch the key to <code>country</code> or <code>payment_type</code> and publish 100 — a <strong>hot partition</strong> appears because a handful of key values carry most of the traffic (65% of orders are <code>US</code>). The engine flags it in red. High-cardinality keys like <code>order_id</code> or <code>customer_id</code> spread evenly across every partition; <code>null</code> keys spread evenly too, but give up per-key ordering.</p>
      <p><strong>Why it's repeatable:</strong> the simulator is a pure state machine seeded with a fixed value, so <em>Reset</em> replays the identical sequence. That is deliberate — a learning sandbox you can reason about, not a black box. It is a simulation, not a live cluster, but the routing math is the production algorithm.</p>
      <p><strong>Interview angle:</strong> partition count is a one-way door — increasing it re-hashes keys and breaks existing per-key ordering, and you can never decrease it. The key <em>is</em> the ordering boundary: all records sharing a key are totally ordered on one partition, so pick a key with enough cardinality to spread load but coarse enough to keep related events together. Drag the <b>Partitions</b> slider after publishing and watch the whole distribution re-hash — that's exactly why you don't resize topics casually in production.</p>
    </div>`;

  const canvas = tab.querySelector('#sim-canvas');
  const ctx = canvas.getContext('2d');
  const sim = new KafkaSim({ seed: 1337, brokers: 3 });

  let numParts = 6;
  let keyMode = 'order_id';
  let lastLanded = -1;
  let flash = 0;
  let raf = null;

  function rebuild() {
    sim.reset();
    sim.createTopic('orders', { partitions: numParts, replicationFactor: Math.min(3, 3) });
    lastLanded = -1;
  }
  rebuild();

  // Deterministic weighted picker driven by the engine's own seeded RNG so
  // "country"/"payment" presets are reproducible across resets.
  function genKey(i) {
    const preset = PRESETS[keyMode];
    if (preset.card === 'none') return null;
    if (preset.gen.length === 0 && (keyMode === 'country' || keyMode === 'payment')) {
      const table = keyMode === 'country' ? COUNTRY_W : PAY_W;
      return pickWeightedRng(table, sim.rand);
    }
    return preset.gen(i);
  }

  function publish(n) {
    const start = sim.totalRecords('orders');
    const recs = Array.from({ length: n }, (_, j) => ({ key: genKey(start + j), value: start + j }));
    const results = sim.produceBatch('orders', recs);
    lastLanded = results.length ? results[results.length - 1].partition : lastLanded;
    flash = 1;
    renderStats();
  }

  function renderStats() {
    const stats = sim.partitionStats('orders');
    const total = sim.totalRecords('orders');
    const hot = sim.hotPartition('orders');
    const distinctKeys = keyMode === 'none' ? '—'
      : new Set(stats.flatMap(() => [])).size || keyCardinalityLabel(keyMode);
    const el = tab.querySelector('#sim-stats');
    el.innerHTML = `
      <div class="sim-stat"><span>Records published</span><b>${total.toLocaleString()}</b></div>
      <div class="sim-stat"><span>Partitions</span><b>${numParts}</b></div>
      <div class="sim-stat"><span>Key cardinality</span><b>${keyCardinalityLabel(keyMode)}</b></div>
      <div class="sim-stat ${hot.isHot ? 'sim-stat-hot' : 'sim-stat-ok'}">
        <span>${hot.isHot ? '🔥 Hot partition' : '✓ Balance'}</span>
        <b>${total ? (hot.isHot
            ? `P${hot.partition} @ ${Math.round(hot.pct * 100)}%`
            : `max ${Math.round(hot.pct * 100)}% (even ${Math.round(hot.evenShare * 100)}%)`) : '—'}</b>
      </div>`;
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, W, H);

    const stats = sim.partitionStats('orders');
    const total = sim.totalRecords('orders') || 1;
    const maxCount = Math.max(1, ...stats.map(s => s.count));
    const hot = sim.hotPartition('orders');

    const padL = 54, padR = 18, padT = 40, padB = 54;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const gap = 10;
    const bw = (plotW - gap * (numParts - 1)) / numParts;

    // Title
    ctx.font = 'bold 13px system-ui';
    ctx.fillStyle = '#E2E8F0';
    ctx.textAlign = 'left';
    ctx.fillText(`orders · ${numParts} partitions · key = ${PRESETS[keyMode].label}`, padL, 22);

    // Even-share reference line
    const evenY = padT + plotH - (total / numParts / maxCount) * plotH;
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(padL, evenY); ctx.lineTo(W - padR, evenY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('even share', W - padR, evenY - 5);

    // Bars
    for (let i = 0; i < numParts; i++) {
      const s = stats[i];
      const x = padL + i * (bw + gap);
      const h = (s.count / maxCount) * plotH;
      const y = padT + plotH - h;
      const isHot = hot.isHot && hot.partition === i;
      const base = isHot ? '#EF4444' : COLORS[i % COLORS.length];

      ctx.fillStyle = isHot ? 'rgba(239,68,68,0.18)' : 'rgba(148,163,184,0.08)';
      ctx.fillRect(x, padT, bw, plotH);

      ctx.fillStyle = base;
      if (i === lastLanded && flash > 0) {
        ctx.save();
        ctx.shadowColor = base; ctx.shadowBlur = 18 * flash;
        ctx.fillRect(x, y, bw, h); ctx.restore();
      } else {
        ctx.fillRect(x, y, bw, h);
      }

      // Count on top
      ctx.fillStyle = isHot ? '#EF4444' : '#E2E8F0';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(String(s.count), x + bw / 2, y - 6 < padT ? padT + 12 : y - 6);

      // % + label
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px system-ui';
      ctx.fillText(`${Math.round(s.pct * 100)}%`, x + bw / 2, H - padB + 16);
      ctx.fillStyle = isHot ? '#EF4444' : '#CBD5E1';
      ctx.font = 'bold 11px system-ui';
      ctx.fillText(`P${i}`, x + bw / 2, H - padB + 32);
      if (isHot) {
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 9px system-ui';
        ctx.fillText('HOT', x + bw / 2, H - padB + 44);
      }
    }

    // y-axis label
    ctx.save();
    ctx.translate(16, padT + plotH / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#8A98AE'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('records', 0, 0);
    ctx.restore();

    if (flash > 0) flash = Math.max(0, flash - 0.04);
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  // ── Wiring ──
  const partsVal = tab.querySelector('#sim-parts-val');
  tab.querySelector('#sim-parts').addEventListener('input', e => {
    numParts = +e.target.value;
    partsVal.textContent = numParts;
    rebuild(); renderStats();   // changing partition count re-hashes everything
  });
  tab.querySelector('#sim-key').addEventListener('change', e => {
    keyMode = e.target.value;
    rebuild(); renderStats();
  });
  const setActive = id => tab.querySelectorAll('.sim-actions .ctrl-btn')
    .forEach(b => b.classList.toggle('active', b.id === id));
  tab.querySelector('#sim-pub1').addEventListener('click', () => { setActive('sim-pub1'); publish(1); });
  tab.querySelector('#sim-pub100').addEventListener('click', () => { setActive('sim-pub100'); publish(100); });
  tab.querySelector('#sim-reset').addEventListener('click', () => { setActive('sim-reset'); rebuild(); renderStats(); });

  renderStats();
  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function keyCardinalityLabel(mode) {
  return ({ high: 'High', low: 'Low', none: 'None (null)' })[PRESETS[mode].card];
}
function pickWeighted(table) { return pickWeightedRng(table, Math.random); }
function pickWeightedRng(table, rng) {
  let r = rng();
  for (const [v, w] of table) { if (r < w) return v; r -= w; }
  return table[table.length - 1][0];
}

const HOW_HTML = `
  <div class="scroll-content" style="max-width:820px;margin:0 auto">
    <div class="canvas-explainer" style="margin-top:0">
      <h3>The engine behind this sandbox</h3>
      <p>Every Playground surface is driven by one shared, deterministic simulation engine (<code>kafka/sim/engine.js</code>). It defines explicit state models — cluster, broker, topic, partition, replica, record — and advances them with pure, testable transitions. No randomness leaks in: it is seeded, so pressing <strong>Reset</strong> replays the exact same run. The engine ships with a unit-test suite (<code>node --test</code>) covering the partitioner, offset math and hot-partition detection.</p>
      <h3>The partitioner is Kafka's real one</h3>
      <p>For a keyed record Kafka computes <code>toPositive(murmur2(keyBytes)) % numPartitions</code>. This simulator implements the identical <code>murmur2</code> hash (verified against Apache Kafka's own published test vectors) and the same modulo, so a given key routes to the same partition here as it would on a real broker. Null-key records use the <strong>sticky partitioner</strong>: one partition is filled per batch, then it rotates — which is why unkeyed traffic spreads evenly over time without any ordering guarantee.</p>
      <h3>Simulation, stated honestly</h3>
      <p>This is a learning model, not a connection to a live Kafka cluster. It reproduces routing, distribution and skew faithfully; it does not move real bytes over a network. Where later Playground surfaces model broker failure, replication or consumer lag, they will do so with the same explicit, labelled state transitions.</p>
    </div>
  </div>`;
