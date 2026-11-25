// M11 · Arbitrary State — State & Output
// NOTE: the cart state machine here is a small SELF-CONTAINED deterministic
// simulation of [flat]MapGroupsWithState (not part of the E1 engine). Labeled as
// simulated in the UI and in sim/PRESERVATION.md.
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock, esc } from './_mod-ui.js';

const IQ = [
  { q: 'What is arbitrary stateful processing and when do you need it?', a: '<p>When the built-in windowed aggregations aren\'t enough and you need <b>custom per-key state and logic</b> — e.g. a <b>state machine</b> (cart → checkout → paid), sessionization with custom rules, running computations with bespoke timeouts, or pattern detection across events. Spark exposes it via <b><code>mapGroupsWithState</code></b> (one output row per key) and <b><code>flatMapGroupsWithState</code></b> (zero-or-more output rows per key), where you control the state object, updates, and timeouts yourself.</p>', tip: 'Custom per-key state + logic (state machines, custom sessions, pattern detection). mapGroupsWithState / flatMapGroupsWithState.' },
  { q: 'mapGroupsWithState vs flatMapGroupsWithState?', a: '<p><b>mapGroupsWithState</b> — emit <b>exactly one</b> row per key per batch it\'s invoked for; supports only <b>update</b> output mode. <b>flatMapGroupsWithState</b> — emit <b>zero or more</b> rows per key; supports <b>append</b> (emit when a session/entity finalizes) and <b>update</b>. Use flatMap when a key might produce no output some batches and multiple at others (the general case); map when it\'s strictly one-per-key.</p>', tip: 'map = 1 row/key, update mode. flatMap = 0..N rows/key, append or update. flatMap is the general one.' },
  { q: 'How do timeouts work in [flat]mapGroupsWithState?', a: '<p>You register a timeout per key: <b>processing-time</b> timeout (fire after N of wall-clock since last seen) or <b>event-time</b> timeout (fire when the <b>watermark</b> passes a timestamp you set). When a key times out, your function is <b>called with no new data</b> and <code>state.hasTimedOut()==true</code>, so you can finalize/emit and <b>remove</b> the state (e.g. close an idle cart). Event-time timeouts require a watermark.</p>', tip: 'Processing-time (wall clock) or event-time (watermark-driven) timeouts. On timeout, function fires with hasTimedOut → finalize + remove state.' },
  { q: 'Who manages state removal, and why does it matter?', a: '<p><b>You do</b> — call <code>state.remove()</code> when a key is done (entity finalized or timed out). Unlike windowed aggregations where the watermark auto-evicts, arbitrary state is <b>manually managed</b>, so <b>forgetting to remove</b> state (or set timeouts) means it grows <b>unbounded</b> → OOM. This is the #1 risk of arbitrary stateful ops: you own the lifecycle, including cleanup.</p>', tip: 'YOU remove state (state.remove()) — no auto-eviction. Forgetting = unbounded state. Always set timeouts + remove.' },
  { q: 'What does the state function receive and return?', a: '<p>Per key, per trigger (when there\'s new data or a timeout): the <b>key</b>, an <b>iterator of new events</b> for that key this batch, and the <b>GroupState</b> object (get/update/remove/exists, setTimeout*, hasTimedOut). You read current state, fold in the new events, optionally update/remove it, set a timeout, and <b>return the output row(s)</b>. It must be <b>deterministic</b> for exactly-once to hold on replay.</p>', tip: '(key, newEventsIterator, GroupState) → output rows. Read/update/remove state, set timeout, return output. Must be deterministic.' },
  { q: 'Give a concrete state-machine example.', a: '<p>Order lifecycle: state = <code>{status, items, lastSeen}</code>. Events move it <b>cart → checkout → paid</b>. On a <code>paid</code> event you emit a "completed order" row and <code>remove()</code> the state. If no event arrives for 30 min (timeout), you emit an "abandoned" row and remove the state. This is a classic <b>flatMapGroupsWithState</b> use: variable output, custom transitions, explicit timeout-driven finalization.</p>', tip: 'cart→checkout→paid state machine; emit+remove on paid, emit abandoned+remove on timeout. The canonical flatMap example.' },
  { q: 'How does arbitrary state interact with output modes?', a: '<p><b>mapGroupsWithState</b> → <b>update</b> only. <b>flatMapGroupsWithState</b> → <b>append</b> (you emit a key\'s final row once, when it finalizes — like a closed session) or <b>update</b> (emit current state each batch). In append mode you typically pair an <b>event-time timeout + watermark</b> so finalization is well-defined. The mode constrains how/when your emitted rows reach the sink (M12).</p>', tip: 'map→update. flatMap→append (emit-on-finalize) or update. Append flatMap pairs with event-time timeout + watermark.' },
  { q: 'Why must the state-update function be deterministic?', a: '<p>Because on failure Spark <b>replays</b> the batch over the same (pinned) offsets and reloads the last state version; if your function used <code>now()</code>, randomness, or external mutable lookups, the replay could produce <b>different state/output</b> than the original, breaking exactly-once. Keep it a pure function of (key, events, prior state). Side effects (API calls) belong in an idempotent sink step, not the state function (M16).</p>', tip: 'Replay must reproduce identical state/output → pure function, no now()/rand/side effects. Side effects go in the sink.' },
  { q: 'What is the state encoder / schema evolution concern?', a: '<p>The state object is <b>serialized</b> into the state store with a fixed encoder. If you <b>change the state class\'s shape</b> between deploys, the old checkpointed state may not deserialize → you may need a <b>new checkpoint</b> or a migration. So evolving arbitrary-state schemas is a deliberate, versioned operation, not a transparent change (contrast with adding a column to a plain aggregation).</p>', tip: 'State is serialized with a fixed encoder; changing its shape can break deserialization → new checkpoint/migration.' },
  { q: 'When should you NOT use arbitrary state?', a: '<p>When a <b>built-in windowed aggregation, dedup, or stream-join</b> already expresses the logic — those are optimized and auto-manage state/eviction. Reach for <code>[flat]mapGroupsWithState</code> only for genuinely <b>custom</b> per-key logic the built-ins can\'t express. Overusing it means hand-managing state lifecycles you could have gotten for free, with more OOM risk and more code.</p>', tip: 'Prefer built-ins (windows/dedup/joins) when they fit — they auto-manage state. Use arbitrary state only for truly custom logic.' },
];

// Simulated flatMapGroupsWithState: cart state machine per user.
// States: cart -> checkout -> paid (emit+remove); timeout -> abandoned (emit+remove).
const TIMELINE = [
  { t: 1, user: 'u1', event: 'add_to_cart' },
  { t: 2, user: 'u2', event: 'add_to_cart' },
  { t: 3, user: 'u1', event: 'checkout' },
  { t: 5, user: 'u1', event: 'paid' },          // u1 completes
  { t: 6, user: 'u3', event: 'add_to_cart' },
  { t: 9, user: 'u2', event: 'checkout' },       // u2 slow
  { t: 14, user: 'u2', event: 'paid' },          // u2 completes late
  { t: 20, user: 'u3', event: 'tick' },          // u3 idle -> timeout fires (gap > 10 from t6)
];
const TIMEOUT = 10; // event-time idle timeout

const STATE_COLOR = { cart: 'var(--blue,#3B82F6)', checkout: 'var(--yellow,#F59E0B)', paid: 'var(--green,#10B981)', abandoned: 'var(--red,#EF4444)', none: 'var(--text-muted)' };

// Build the full deterministic trace step by step.
function buildTrace() {
  const state = new Map(); // user -> { status, lastSeen }
  const steps = [];
  let watermark = Number.NEGATIVE_INFINITY;
  for (const ev of TIMELINE) {
    watermark = Math.max(watermark, ev.t); // simplified: wm = max event time (delay 0)
    const emitted = [];
    // timeout sweep: any key idle longer than TIMEOUT relative to watermark
    for (const [u, s] of [...state]) {
      if (s.status !== 'paid' && watermark - s.lastSeen > TIMEOUT) {
        emitted.push({ user: u, result: 'abandoned', from: s.status });
        state.delete(u);
      }
    }
    // apply the event
    if (ev.event === 'add_to_cart') { state.set(ev.user, { status: 'cart', lastSeen: ev.t }); }
    else if (ev.event === 'checkout') { const s = state.get(ev.user); if (s) { s.status = 'checkout'; s.lastSeen = ev.t; } }
    else if (ev.event === 'paid') { const s = state.get(ev.user); if (s) { s.status = 'paid'; s.lastSeen = ev.t; emitted.push({ user: ev.user, result: 'completed', from: 'checkout' }); state.delete(ev.user); } }
    // 'tick' = no-op event that just advances the watermark (triggers timeout sweep)
    steps.push({
      ev, watermark, emitted,
      state: [...state.entries()].map(([u, s]) => ({ user: u, status: s.status, lastSeen: s.lastSeen })),
    });
  }
  return steps;
}

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>When windowed aggregations can't express your logic, <b>arbitrary stateful processing</b> lets you keep a <b>custom state object per key</b> and run your own update function — the tool for <b>state machines</b>, custom sessions, and pattern detection.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>🗺️ mapGroupsWithState</h4><p><b>One</b> output row per key; <b>update</b> mode only. For strictly one-value-per-key logic.</p></div>
      <div class="ss-card"><h4>🧩 flatMapGroupsWithState</h4><p><b>Zero or more</b> rows per key; <b>append</b> (emit on finalize) or <b>update</b>. The general case — a key may output nothing some batches, several at others.</p></div>
      <div class="ss-card"><h4>⏲️ Timeouts you set</h4><p><b>Processing-time</b> (wall clock) or <b>event-time</b> (watermark-driven). On timeout your function fires with <code>hasTimedOut()</code> so you can finalize + remove.</p></div>
      <div class="ss-card"><h4>🧹 You manage removal</h4><p><b>No auto-eviction</b> — you call <code>state.remove()</code>. Forget it (or timeouts) and state grows <b>unbounded</b> → OOM. You own the lifecycle.</p></div>
    </div>
    <h3>Your function: (key, new events, GroupState) → rows</h3>
    <p>Per key, per trigger with new data or a timeout, Spark calls your function with the <b>key</b>, an <b>iterator of this batch's events</b>, and the <b>GroupState</b> (get/update/remove, setTimeout, hasTimedOut). You fold events into state, optionally update/remove, set a timeout, and return output row(s). It must be a <b>pure, deterministic</b> function of (key, events, prior state) so replay reproduces identical results (M16).</p>
    <div class="ss-callout"><b>Use it sparingly:</b> if a built-in windowed aggregation, dedup, or stream-join already fits, prefer it — those auto-manage state and eviction. Reach for arbitrary state only for genuinely custom per-key logic.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p><i>Simulated flatMapGroupsWithState</i> (illustrative — not the E1 engine): a per-user cart <b>state machine</b> <b style="color:#3B82F6">cart</b> → <b style="color:#F59E0B">checkout</b> → <b style="color:#10B981">paid</b>. On <code>paid</code> it emits "completed" and removes state; if a user is idle past the ${TIMEOUT}-unit timeout it emits "abandoned" and removes state. Step the event timeline.</p></div>
  <div class="ss-controls">
    <button class="ss-btn primary" id="m11-step">Next event ▶</button>
    <button class="ss-btn" id="m11-back">◀ Back</button>
    <button class="ss-btn" id="m11-reset">⟲ Reset</button>
    <span style="font-size:12.5px;color:var(--text-secondary)">event-time idle timeout = ${TIMEOUT}</span>
  </div>
  <div class="ss-callout" id="m11-ev" style="border-left-color:var(--accent)">—</div>
  <div class="ss-grid" style="grid-template-columns:1fr 1fr">
    <div class="ss-card"><h4>🧩 Per-user state (GroupState)</h4><div id="m11-state"></div></div>
    <div class="ss-card"><h4>📤 Emitted rows</h4><div id="m11-emit"></div></div>
  </div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream's order lifecycle machine</h3>
    <p>ShopStream tracks each order through <b>cart → checkout → paid</b> with <code>flatMapGroupsWithState</code>, keyed by <code>user_id</code>. The state holds the cart contents and the last-seen time. On a <b>paid</b> event it emits a <b>completed-order</b> row and removes the state; if a user is idle for <b>30 minutes</b> (event-time timeout on the watermark), it emits an <b>abandoned-cart</b> row and removes the state — feeding the re-engagement pipeline.</p>
    <p>An early bug: they set transitions but <b>forgot the timeout + remove</b> for carts that never checked out. State accumulated every browsing user forever and the job OOM'd in three days. Adding the event-time timeout (which both <b>finalizes</b> abandoned carts <i>and</i> <b>removes</b> their state) fixed the leak and produced the abandoned-cart signal for free.</p>
    <div class="ss-callout">The state class is versioned deliberately: when they added a <code>coupon</code> field to the cart state, they planned a <b>new checkpoint</b> + backfill, because changing the serialized state shape can break deserialization of old checkpointed state.</div>
  </div>`;

  const code = `
  ${codeBlock('PySpark (applyInPandasWithState)', `from pyspark.sql.streaming.state import GroupStateTimeout

def cart_machine(key, events_iter, state):
    import pandas as pd
    cur = state.get if state.exists else {"status": "cart", "items": 0}
    out = []
    for pdf in events_iter:
        for _, e in pdf.iterrows():
            if e["event"] == "checkout": cur["status"] = "checkout"
            elif e["event"] == "paid":
                out.append((key[0], "completed")); state.remove(); return iter([...])
            else: cur["status"] = "cart"
    if state.hasTimedOut:
        out.append((key[0], "abandoned")); state.remove(); return iter([...])
    state.update(cur)
    state.setTimeoutTimestamp(state.getCurrentWatermarkMs() + 30*60*1000)  # 30-min event-time timeout
    return iter(out)

orders.withWatermark("event_time", "30 minutes") \\
    .groupBy("user_id") \\
    .applyInPandasWithState(cart_machine, outSchema, stateSchema,
                            "append", GroupStateTimeout.EventTimeTimeout)`)}
  ${codeBlock('Scala (flatMapGroupsWithState)', `orders.withWatermark("event_time", "30 minutes")
  .groupByKey(_.userId)
  .flatMapGroupsWithState(OutputMode.Append, GroupStateTimeout.EventTimeTimeout) {
    (userId, events, state: GroupState[Cart]) =>
      if (state.hasTimedOut) { val r = Iterator(Done(userId, "abandoned")); state.remove(); r }
      else { /* fold events, update state, set event-time timeout, emit on 'paid' */ }
  }`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M11 · State & Output',
    title: 'Arbitrary State',
    subtitle: 'Custom per-key state machines with [flat]mapGroupsWithState and timeouts',
    definition: {
      formal: 'Arbitrary stateful processing (mapGroupsWithState / flatMapGroupsWithState) lets a user-defined function maintain a custom per-key state object across batches, receiving the key, the batch\'s new events, and a GroupState handle to read, update, or remove state and register processing-time or event-time timeouts. mapGroupsWithState emits one row per key (update mode); flatMapGroupsWithState emits zero or more (append or update). State removal is manual, so timeouts and explicit remove() are required to bound state.',
      easy: 'Sometimes the built-in groupings can\'t express your logic — like tracking each order through cart → checkout → paid. Arbitrary state lets you keep a little custom record per key and write your own rules for updating it, plus timeouts for "if nothing happens in 30 minutes, call it abandoned." The catch: you must delete finished records yourself, or memory grows forever.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '🧩 Cart State Machine', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const steps = buildTrace();
  let cursor = -1;
  const evEl = container.querySelector('#m11-ev');
  const stateEl = container.querySelector('#m11-state');
  const emitEl = container.querySelector('#m11-emit');

  function chip(label, color) {
    return `<span style="display:inline-block;padding:2px 8px;border-radius:6px;font-family:var(--font-mono);font-size:12px;background:color-mix(in srgb,${color} 16%,transparent);color:${color}">${label}</span>`;
  }

  function render() {
    if (cursor < 0) {
      evEl.innerHTML = 'Press <b>Next event ▶</b> to feed the cart/checkout/paid timeline through the state machine.';
      stateEl.innerHTML = '<div style="color:var(--text-muted);font-size:12px">(empty)</div>';
      emitEl.innerHTML = '<div style="color:var(--text-muted);font-size:12px">(none yet)</div>';
      return;
    }
    const s = steps[cursor];
    evEl.innerHTML = `<b>t${s.ev.t} · ${esc(s.ev.user)} → ${esc(s.ev.event)}</b> &nbsp;(watermark = ${s.watermark})`;
    stateEl.innerHTML = s.state.length
      ? `<table class="ss-tbl"><thead><tr><th>user</th><th>status</th><th>lastSeen</th><th>idle</th></tr></thead><tbody>${
          s.state.map((r) => `<tr><td>${esc(r.user)}</td><td>${chip(r.status, STATE_COLOR[r.status])}</td><td>t${r.lastSeen}</td><td>${s.watermark - r.lastSeen}</td></tr>`).join('')
        }</tbody></table>`
      : '<div style="color:var(--text-muted);font-size:12px">(empty — all keys finalized/removed)</div>';
    const allEmit = [];
    for (let i = 0; i <= cursor; i++) for (const e of steps[i].emitted) allEmit.push({ ...e, t: steps[i].ev.t });
    emitEl.innerHTML = allEmit.length
      ? `<table class="ss-tbl"><thead><tr><th>t</th><th>user</th><th>result</th></tr></thead><tbody>${
          allEmit.map((e, i) => `<tr${i === allEmit.length - 1 && steps[cursor].emitted.length ? ' class="new"' : ''}><td>t${e.t}</td><td>${esc(e.user)}</td><td>${chip(e.result, e.result === 'completed' ? STATE_COLOR.paid : STATE_COLOR.abandoned)}</td></tr>`).join('')
        }</tbody></table>`
      : '<div style="color:var(--text-muted);font-size:12px">(none yet)</div>';
  }

  container.querySelector('#m11-step').addEventListener('click', () => { if (cursor < steps.length - 1) { cursor++; render(); } });
  container.querySelector('#m11-back').addEventListener('click', () => { if (cursor >= 0) { cursor--; render(); } });
  container.querySelector('#m11-reset').addEventListener('click', () => { cursor = -1; render(); });
  render();
}

export default { mount };
