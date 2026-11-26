// M18 · Stream-Stream Joins — Joins  (engine-driven: E3)
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock, esc } from './_mod-ui.js';
import { StreamJoin } from '../sim/stream-join-engine.js';

export const IQ = [
  { q: 'How does a stream-stream join work internally?', a: '<p>Both streams are <b>buffered in state</b>, keyed by the join key. When a row arrives on one side, it\'s matched against the <b>buffered rows of the other side</b> that satisfy the join condition (equality key + a time constraint); matches emit immediately. Because a matching row can arrive on <b>either side at any time</b>, Spark must retain both sides\' state until it\'s certain no future match can occur — which the <b>watermark + time constraint</b> determine.</p>', tip: 'Both sides buffered/keyed; new row matches other side\'s buffer; state held until watermark+time-bound says no future match.' },
  { q: 'Why is a time constraint (and watermark) mandatory for stream-stream joins?', a: '<p>Without bounding <i>how far apart in time</i> matching rows can be, Spark would have to buffer <b>both streams forever</b> (any future row might match any past row) → unbounded state. A <b>time range condition</b> (e.g. right within [left.time, left.time + 1 hour]) plus a <b>watermark</b> on both sides lets Spark <b>evict</b> state once a row can no longer find a partner. So the time bound is what makes the join\'s state finite.</p>', tip: 'Time range + watermark bound the buffering window → finite state. Without them, both sides buffer forever.' },
  { q: 'What is the global watermark for a stream-stream join?', a: '<p>The <b>minimum</b> of the two input streams\' watermarks. Spark can only safely evict/finalize once <b>both</b> sides have advanced past a point — a slow side holds the join\'s watermark back. This is why a lagging stream on one side stalls outer-join emission and delays eviction for the whole join (M08).</p>', tip: 'Join watermark = MIN of the two side watermarks. One slow side stalls the whole join.' },
  { q: 'How do outer (left/right/full) stream-stream joins emit unmatched rows?', a: '<p>An unmatched row can only emit its <b>null-padded</b> result once Spark is <b>certain no match will arrive</b> — i.e. when the <b>watermark passes the end of its join window</b>. So outer results are <b>delayed until eviction time</b>, not emitted immediately. This is a key gotcha: outer-join nulls appear later than you might expect, gated by the watermark + time constraint, and <b>require</b> a watermark + time bound to be defined at all.</p>', tip: 'Outer nulls emit at eviction (watermark past the window), delayed — not immediately. Require watermark + time bound.' },
  { q: 'What state does a stream-stream join hold, and what drives its size?', a: '<p><b>Both</b> sides\' rows within the current time-bound window, keyed by join key — so state ≈ (rows per side within the window) for both streams. Size grows with <b>input rate</b>, the <b>width of the time constraint</b>, and the <b>watermark delay</b>. Wide time ranges or large delays mean big buffers on both sides → a major tuning concern (RocksDB, tighter bounds) (M10, M20).</p>', tip: 'Both sides buffered within the time window. Size ∝ rate × window width × delay. Tighten bounds / use RocksDB.' },
  { q: 'Stream-stream vs stream-static join — key differences?', a: '<p><b>Stream-static</b>: the static side is a (re-read) table, <b>no state</b> buffered for it, no watermark needed, and only the stream side drives output — great for enrichment/dimension lookups. <b>Stream-stream</b>: <b>both</b> sides are unbounded streams, <b>both buffered in state</b>, requires a <b>time constraint + watermark</b>, and matches can arrive on either side later. Stream-stream is far more stateful and is the one that needs careful bounding (M17).</p>', tip: 'Static side = no state/watermark, enrichment. Stream-stream = both buffered, needs time bound + watermark.' },
  { q: 'Give a real use case for a stream-stream join.', a: '<p>Correlating <b>two event streams</b> within a time window: ad <b>impressions ⋈ clicks</b> (did a click follow an impression within 10 min?), <b>orders ⋈ shipments</b>, <b>login ⋈ transaction</b> for fraud, or ShopStream <b>add-to-cart ⋈ purchase</b> within a session window. The defining trait: both sides are live streams and you care about matches <b>within a bounded time gap</b>.</p>', tip: 'Impressions⋈clicks, orders⋈shipments, cart⋈purchase — two live streams correlated within a time gap.' },
  { q: 'Can the matching row arrive on either side first? How is that handled?', a: '<p>Yes — a click can arrive before or after its impression. That\'s exactly why <b>both</b> sides are buffered: each new row probes the other side\'s state, so order doesn\'t matter for correctness. The symmetric buffering + time constraint ensures a match is found whenever the two rows are within the allowed time gap, regardless of arrival order.</p>', tip: 'Either side can arrive first → both sides buffered symmetrically → order-independent matching within the time gap.' },
  { q: 'What are the limitations of stream-stream joins?', a: '<p>They <b>require</b> equality on the join key plus a <b>time range</b> (pure non-equi joins aren\'t supported for stream-stream), a <b>watermark on both sides</b> for outer joins and eviction, and they\'re <b>stateful and memory-heavy</b>. <b>Full-outer</b> and some chained multi-join topologies have extra constraints. And results (especially outer nulls) are <b>delayed</b> by the watermark. Keep the time bound tight and watch state.</p>', tip: 'Need equality key + time range; watermark both sides for outer; heavy state; delayed outer results. Keep bounds tight.' },
  { q: 'How do you keep stream-stream join state under control in production?', a: '<p><b>Tighten the time constraint</b> to the real correlation window (don\'t over-provision), set the <b>watermark delay</b> just large enough for real skew, use the <b>RocksDB state store</b> for the large dual-side buffers, pre-filter/aggregate to reduce row volume, and monitor <code>stateOperators</code> memory in <code>StreamingQueryProgress</code>. The width of the join window is the biggest lever — halving it roughly halves the buffered state (M20, M21).</p>', tip: 'Tighten time window (biggest lever), right-size delay, RocksDB, pre-filter, monitor state memory.' },
];

const JOIN_COLOR = { inner: 'var(--cyan,#06B6D4)', leftOuter: 'var(--yellow,#F59E0B)', rightOuter: 'var(--purple,#8B5CF6)' };

// ShopStream: add-to-cart (left) ⋈ purchase (right) on user key, within a time window.
const BATCHES = [
  { left: [{ id: 'cart-u1', key: 'u1', eventTime: 1 }, { id: 'cart-u2', key: 'u2', eventTime: 2 }], right: [] },
  { left: [{ id: 'cart-u3', key: 'u3', eventTime: 4 }], right: [{ id: 'buy-u1', key: 'u1', eventTime: 3 }] },
  { left: [], right: [{ id: 'buy-u2', key: 'u2', eventTime: 9 }] },     // u2 purchase arrives late (gap 7)
  { left: [{ id: 'cart-u4', key: 'u4', eventTime: 12 }], right: [{ id: 'buy-u3', key: 'u3', eventTime: 6 }] },
  { left: [], right: [{ id: 'buy-u5', key: 'u5', eventTime: 18 }] },    // no matching cart
];

function drawJoin(canvas, entry) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);
  const pad = 60, leftY = 56, rightY = H - 70;
  const allEt = BATCHES.flatMap((b) => [...(b.left || []), ...(b.right || [])]).map((r) => r.eventTime);
  const tMax = Math.max(...allEt) + 2;
  const X = (t) => pad + (t / tMax) * (W - pad * 2);

  // lane labels + baselines
  ctx.font = '11px ui-monospace,monospace';
  [['add-to-cart (L)', leftY, '#06B6D4'], ['purchase (R)', rightY, '#F59E0B']].forEach(([lbl, y, c]) => {
    ctx.strokeStyle = 'rgba(148,163,184,0.25)'; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    ctx.fillStyle = c; ctx.textAlign = 'right'; ctx.font = 'bold 11px ui-monospace,monospace'; ctx.fillText(lbl, pad - 10, y + 4);
  });
  // time ticks
  ctx.fillStyle = 'rgba(148,163,184,0.6)'; ctx.font = '10px ui-monospace,monospace'; ctx.textAlign = 'center';
  for (let t = 0; t <= tMax; t += 2) ctx.fillText('t' + t, X(t), (leftY + rightY) / 2 + 4);

  if (!entry) { ctx.textAlign = 'left'; return; }

  // watermark
  const wm = entry.watermarkAfter;
  if (wm > Number.NEGATIVE_INFINITY) {
    ctx.strokeStyle = '#EF4444'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X(wm), 30); ctx.lineTo(X(wm), H - 30); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#EF4444'; ctx.textAlign = 'center'; ctx.font = 'bold 10px ui-monospace,monospace';
    ctx.fillText('join wm=' + wm, X(wm), 24);
  }

  // buffered state rows as dots
  const dot = (r, y, c) => {
    ctx.beginPath(); ctx.arc(X(r.eventTime), y, 8, 0, Math.PI * 2);
    ctx.fillStyle = r.matched ? c : 'rgba(100,116,139,0.85)'; ctx.fill();
    ctx.strokeStyle = r.matched ? '#0A0E1A' : c; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#E2E8F0'; ctx.font = '8px ui-monospace,monospace'; ctx.textAlign = 'center';
    ctx.fillText(r.key, X(r.eventTime), y - 13);
  };
  entry.leftState.forEach((r) => dot(r, leftY, '#06B6D4'));
  entry.rightState.forEach((r) => dot(r, rightY, '#F59E0B'));

  // emitted match links (for inner pairs present this batch)
  entry.emitted.filter((e) => e.type === 'inner').forEach((m) => {
    ctx.strokeStyle = '#10B981'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(m.left.eventTime), leftY + 8); ctx.lineTo(X(m.right.eventTime), rightY - 8); ctx.stroke();
  });
  ctx.textAlign = 'left';
}

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>A <b>stream-stream join</b> correlates <b>two live streams</b> — a click with its impression, a purchase with its add-to-cart — where the matching row can arrive on <b>either side, at any time</b>. Both sides are <b>buffered in state</b>.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>🪣 Both sides buffered</h4><p>Each stream's rows are kept in state, keyed by the join key. A new row probes the <b>other side's buffer</b> for matches — so arrival order doesn't matter.</p></div>
      <div class="ss-card"><h4>⏱️ Time constraint required</h4><p>A range like "right within [left.t, left.t + 1h]" <b>bounds</b> how far apart matches can be — without it, both streams buffer <b>forever</b> (unbounded state).</p></div>
      <div class="ss-card"><h4>💧 Watermark = min of both</h4><p>The join watermark is the <b>minimum</b> of the two sides' watermarks. A slow side holds eviction (and outer emission) back for the whole join.</p></div>
      <div class="ss-card"><h4>⬅️ Outer nulls are delayed</h4><p>An unmatched row's null-padded result emits <b>only at eviction</b> (watermark past its window), not immediately — a key gotcha.</p></div>
    </div>
    <h3>The time bound is what makes state finite</h3>
    <p>Because a partner could theoretically arrive arbitrarily far in the future, Spark <b>requires</b> a <b>time range + watermark</b> so it can prove "no future row can match this one" and evict it. State ≈ both sides' rows within the window — so the <b>width of the time constraint</b> is your biggest lever on memory (M20).</p>
    <div class="ss-callout"><b>vs stream-static (M17):</b> a static/dimension side buffers <b>no state</b> and needs no watermark — only the stream drives output. Stream-stream is the heavy, fully-stateful join that needs careful bounding.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>The <b>real E3 engine</b> joins ShopStream <b style="color:#06B6D4">add-to-cart</b> ⋈ <b style="color:#F59E0B">purchase</b> on user, within a time window. Step the batches: dots are buffered state (grey = waiting, colored = matched), green links are emitted inner matches, and the red line is the join watermark that evicts old state and releases outer nulls.</p></div>
  <div class="ss-controls">
    <button class="ss-btn primary" id="m18-step">Next batch ▶</button>
    <button class="ss-btn" id="m18-back">◀ Back</button>
    <button class="ss-btn" id="m18-reset">⟲ Reset</button>
    <label style="font-size:12.5px;color:var(--text-secondary);margin-left:8px">Join:
      <select id="m18-type" class="ss-btn" style="margin-left:4px">
        <option value="inner">inner</option><option value="leftOuter">left outer</option><option value="rightOuter">right outer</option>
      </select></label>
    <label style="font-size:12.5px;color:var(--text-secondary)">Time window:
      <input type="range" id="m18-tw" min="1" max="8" step="1" value="3" style="vertical-align:middle">
      <span id="m18-tw-v" style="font-family:var(--font-mono)">3</span></label>
    <label style="font-size:12.5px;color:var(--text-secondary)">WM delay:
      <input type="range" id="m18-delay" min="0" max="4" step="1" value="1" style="vertical-align:middle">
      <span id="m18-delay-v" style="font-family:var(--font-mono)">1</span></label>
  </div>
  <div class="ss-canvas-wrap"><canvas id="m18-canvas" width="720" height="220"></canvas></div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k">Batch</div><div class="v" id="m18-bi">—</div></div>
    <div class="ss-metric"><div class="k">Join watermark</div><div class="v" id="m18-wm">—</div></div>
    <div class="ss-metric"><div class="k">State (L+R)</div><div class="v" id="m18-state">—</div></div>
    <div class="ss-metric"><div class="k">Emitted this batch</div><div class="v" id="m18-emit">—</div></div>
  </div>
  <div class="ss-callout" id="m18-expl">—</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream: cart → purchase conversion</h3>
    <p>ShopStream joins the <b>add-to-cart</b> stream with the <b>purchase</b> stream on <code>user_id</code>, with the condition that the purchase happens <b>within 30 minutes</b> of the add-to-cart. An <b>inner</b> join yields "converted carts"; a <b>left outer</b> join surfaces <b>abandoned carts</b> (cart with no purchase within 30 min) — the null-padded rows that emit once the watermark passes the window.</p>
    <p>Early on they used a <b>24-hour</b> time window "to be safe," and the dual-side state buffers grew enormous — executors ran hot. Measuring real behavior showed 98% of conversions happen within <b>30 minutes</b>, so they tightened the window, which <b>cut buffered state by ~50×</b>, and moved to the RocksDB state store for the remainder.</p>
    <div class="ss-callout">The abandoned-cart signal (left-outer nulls) is deliberately <b>delayed</b> by the 30-min watermark — ShopStream's re-engagement email fires exactly when the engine confirms "no purchase arrived in the window," which is correct, not late.</div>
  </div>`;

  const code = `
  ${codeBlock('PySpark', `carts = cart_stream.withWatermark("cart_time", "30 minutes")
buys  = buy_stream.withWatermark("buy_time", "30 minutes")

# INNER: converted carts (purchase within 30 min of add-to-cart)
converted = carts.join(buys,
    expr("""
      cart_user = buy_user AND
      buy_time >= cart_time AND buy_time <= cart_time + interval 30 minutes
    """))            # equality key + TIME RANGE (mandatory) -> bounded state

# LEFT OUTER: abandoned carts (null buy side), emitted at watermark eviction
abandoned = carts.join(buys, join_expr, "leftOuter") \\
    .where("buy_user IS NULL")`)}
  ${codeBlock('Scala', `val converted = carts.join(buys,
  expr("""cart_user = buy_user AND
          buy_time >= cart_time AND buy_time <= cart_time + interval 30 minutes"""))

val abandoned = carts.join(buys, joinExpr, "left_outer").where($"buy_user".isNull)`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M18 · Joins',
    title: 'Stream–Stream Joins',
    subtitle: 'Correlating two live streams with buffered state, a time bound, and watermarks',
    definition: {
      formal: 'A stream-stream join buffers both input streams in keyed state and matches rows satisfying an equality key plus a time-range constraint; matches emit when found on either side. A watermark on both inputs (the join watermark being their minimum) together with the time range bounds state by permitting eviction once no future match is possible. Outer joins emit null-padded rows for unmatched inputs only at eviction time, and therefore require both a watermark and a time constraint.',
      easy: 'This joins two live streams — say add-to-cart and purchase — matching rows that share a key and happen within a time window of each other. Since the matching event can show up on either side later, Spark keeps both streams\' recent rows in memory and links them up when a partner appears. A time limit plus a watermark let it eventually forget old rows, and that same watermark is when "no match ever came" (abandoned carts) gets reported.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '🔗 Join Engine', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const canvas = container.querySelector('#m18-canvas');
  const typeSel = container.querySelector('#m18-type');
  const tw = container.querySelector('#m18-tw'), twV = container.querySelector('#m18-tw-v');
  const delay = container.querySelector('#m18-delay'), delayV = container.querySelector('#m18-delay-v');
  const biEl = container.querySelector('#m18-bi'), wmEl = container.querySelector('#m18-wm');
  const stateEl = container.querySelector('#m18-state'), emitEl = container.querySelector('#m18-emit');
  const explEl = container.querySelector('#m18-expl');
  let trace = [], cursor = -1;

  function recompute(keep) {
    const j = new StreamJoin({ joinType: typeSel.value, watermarkDelay: +delay.value, timeWindow: +tw.value });
    trace = j.run(BATCHES).trace;
    cursor = keep ? Math.min(cursor, trace.length - 1) : -1;
    render();
  }
  const fmtWm = (v) => (v === Number.NEGATIVE_INFINITY ? '−∞' : String(v));

  function render() {
    twV.textContent = tw.value; delayV.textContent = delay.value;
    drawJoin(canvas, cursor < 0 ? null : trace[cursor]);
    if (cursor < 0) {
      biEl.textContent = '—'; wmEl.textContent = '−∞'; stateEl.textContent = '—'; emitEl.textContent = '—';
      explEl.innerHTML = 'Press <b>Next batch ▶</b> to feed cart/purchase events into the join engine.';
      return;
    }
    const e = trace[cursor];
    biEl.textContent = cursor;
    wmEl.textContent = fmtWm(e.watermarkAfter);
    stateEl.textContent = `${e.leftState.length}+${e.rightState.length}`;
    emitEl.textContent = e.emitted.length;
    const inner = e.emitted.filter((x) => x.type === 'inner');
    const outer = e.emitted.filter((x) => x.type !== 'inner');
    let msg = `<b>Batch ${cursor} (${typeSel.value}, window=${tw.value}, delay=${delay.value}):</b> join watermark = <b>${fmtWm(e.watermarkAfter)}</b> (min of both sides), buffering <b>${e.leftState.length}</b> cart + <b>${e.rightState.length}</b> purchase rows.`;
    if (inner.length) msg += `<br>✅ <b>Matched:</b> ${inner.map((m) => `${esc(m.left.id)} ⋈ ${esc(m.right.id)}`).join(', ')}.`;
    if (outer.length) msg += `<br>⬅️ <b>Outer null (evicted, no partner in window):</b> ${outer.map((m) => esc((m.left || m.right).id)).join(', ')}.`;
    if (!inner.length && !outer.length) msg += `<br>No emissions this batch — rows wait in state for a partner (or for the watermark to evict them).`;
    explEl.innerHTML = msg;
  }

  container.querySelector('#m18-step').addEventListener('click', () => { if (cursor < trace.length - 1) { cursor++; render(); } });
  container.querySelector('#m18-back').addEventListener('click', () => { if (cursor >= 0) { cursor--; render(); } });
  container.querySelector('#m18-reset').addEventListener('click', () => { cursor = -1; render(); });
  [typeSel, tw, delay].forEach((el) => el.addEventListener('input', () => recompute(true)));
  recompute(false);
}

export default { mount };
