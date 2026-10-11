// Shared streaming simulation engine (I28) — pure JS, no DOM.
// Deterministic (seeded) models of the core streaming mechanics taught in
// Foundations: event-time vs processing-time, watermarks, windowing, keyed
// state, checkpoint/restore, and a simple backpressure/lag model.
//
// "Honesty" rule: these are deterministic SIMULATIONS of the semantics, not a
// real cluster. The algorithms (watermark rule, window assignment, lateness
// decision) mirror how real engines behave, and are unit-tested.

// ── Seeded PRNG (mulberry32) — same family used by the Kafka sim ──────────
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Event generation ─────────────────────────────────────────────────────
// Produces events with an event-time (when it happened) and a processing-time
// (when it arrives), where arrival can lag behind event-time by a random delay
// — this is exactly what creates "out-of-order" and "late" data.
export function generateEvents({ seed = 42, count = 20, maxDelay = 4, keys = ['A', 'B'] } = {}) {
  const rnd = mulberry32(seed);
  const events = [];
  for (let i = 0; i < count; i++) {
    const eventTime = i + 1;                          // tidy 1..count timeline
    const delay = Math.floor(rnd() * (maxDelay + 1)); // 0..maxDelay
    const procTime = eventTime + delay;               // arrives later if delayed
    const key = keys[Math.floor(rnd() * keys.length)];
    events.push({ id: i + 1, key, eventTime, procTime, delay, value: 1 });
  }
  // Streams are ordered by ARRIVAL (processing time), ties by id.
  return events.sort((a, b) => a.procTime - b.procTime || a.id - b.id);
}

// ── Watermarks ───────────────────────────────────────────────────────────
// Bounded-out-of-orderness watermark: W = maxEventTimeSeen - allowedLateness.
// A window closes (fires) once the watermark passes its end. Events with
// eventTime <= watermark that arrive afterward are "late".
export function computeWatermarks(events, allowedLateness = 2) {
  let maxEt = -Infinity;
  return events.map(e => {
    maxEt = Math.max(maxEt, e.eventTime);
    const watermark = maxEt - allowedLateness;
    return { ...e, watermark };
  });
}

// ── Windowing ────────────────────────────────────────────────────────────
// Assign an event to a tumbling window of the given size (event-time based).
export function tumblingWindowOf(eventTime, size) {
  const start = Math.floor((eventTime - 1) / size) * size + 1;
  return { start, end: start + size - 1 };
}

// Assign to all sliding windows that contain the event time.
export function slidingWindowsOf(eventTime, size, slide) {
  const windows = [];
  // last window start <= eventTime, stepping by slide
  let start = Math.floor((eventTime - 1) / slide) * slide + 1;
  while (start + size - 1 >= eventTime) {
    if (start <= eventTime) windows.push({ start, end: start + size - 1 });
    start -= slide;
    if (start < eventTime - size) break;
  }
  return windows.filter(w => eventTime >= w.start && eventTime <= w.end)
                .sort((a, b) => a.start - b.start);
}

// Run a tumbling-window aggregation over a stream with watermark-driven firing
// and lateness detection. Returns per-window results + a classification of each
// event as on-time / late / dropped.
export function runTumblingAggregation({ events, windowSize = 3, allowedLateness = 2, keyed = true }) {
  const withWm = computeWatermarks(events, allowedLateness);
  const windows = new Map(); // key: `${k}|${start}` -> { key, start, end, count, fired }
  const classified = [];

  for (const e of withWm) {
    const w = tumblingWindowOf(e.eventTime, windowSize);
    const k = keyed ? e.key : '*';
    const wkey = `${k}|${w.start}`;
    // A window is considered "closed" once the current watermark passed its end.
    const closed = e.watermark > w.end;
    let status;
    if (!closed) status = 'on-time';
    else status = 'late'; // arrived after watermark passed the window end

    if (!windows.has(wkey)) windows.set(wkey, { key: k, start: w.start, end: w.end, count: 0, lateUpdates: 0 });
    const rec = windows.get(wkey);
    if (status === 'on-time') rec.count += e.value;
    else rec.lateUpdates += 1; // counted separately (would be dropped without allowed lateness)

    classified.push({ ...e, window: w, status });
  }

  const results = [...windows.values()].sort((a, b) => a.start - b.start || String(a.key).localeCompare(String(b.key)));
  return { results, classified };
}

// ── Keyed state + checkpoint / restore ───────────────────────────────────
// Minimal keyed counter with snapshot + restore to demonstrate exactly the
// checkpoint recovery story: process, snapshot, "crash", restore, reprocess.
export class KeyedCounter {
  constructor() { this.state = new Map(); this.offset = 0; }
  process(e) { this.state.set(e.key, (this.state.get(e.key) || 0) + e.value); this.offset = e.id; }
  snapshot() { return { offset: this.offset, state: Object.fromEntries(this.state) }; }
  restore(cp) { this.offset = cp.offset; this.state = new Map(Object.entries(cp.state)); }
  totals() { return Object.fromEntries(this.state); }
}

// ── Backpressure / lag model ─────────────────────────────────────────────
// If inputRate > processRate, a queue builds and consumer lag grows; otherwise
// it drains. Deterministic, discrete-time.
export function simulateBackpressure({ steps = 20, inputRate = 100, processRate = 80, startQueue = 0 } = {}) {
  const series = [];
  let queue = startQueue;
  for (let t = 1; t <= steps; t++) {
    queue = Math.max(0, queue + inputRate - processRate);
    const lag = queue; // records waiting == lag
    const backpressured = inputRate > processRate && queue > 0;
    series.push({ t, queue, lag, backpressured });
  }
  return series;
}
