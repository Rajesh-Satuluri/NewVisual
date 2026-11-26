// E3 · Stream-stream join engine — a pure, deterministic model of Structured
// Streaming's stateful stream-stream join: both sides buffered in state, matched
// on an equality key within a symmetric event-time window |Lt - Rt| <= timeWindow,
// a per-side watermark (global = min of the two), time-bounded state eviction, and
// outer-join null emission at eviction time. No Spark — semantics follow the
// programming guide and are unit-tested against hand-computed vectors.
//
// Row shape: { id, key, eventTime, value? }. Batch shape: { left:[rows], right:[rows] }.
// Match rule (teaching-simplified, symmetric): same key AND |Lt - Rt| <= timeWindow.

export const JOIN_TYPES = ['inner', 'leftOuter', 'rightOuter'];

export class StreamJoin {
  // config: { joinType:'inner'|'leftOuter'|'rightOuter', watermarkDelay, timeWindow }
  constructor(config = {}) {
    this.joinType = config.joinType || 'inner';
    if (!JOIN_TYPES.includes(this.joinType)) throw new Error(`bad joinType "${this.joinType}"`);
    this.delay = config.watermarkDelay || 0;
    this.timeWindow = config.timeWindow == null ? 0 : config.timeWindow;
    if (!(this.timeWindow >= 0)) throw new Error('timeWindow must be >= 0');
    this.reset();
  }

  reset() {
    this.leftBuf = [];   // [{ id, key, eventTime, matched }]
    this.rightBuf = [];
    this.wmL = Number.NEGATIVE_INFINITY;
    this.wmR = Number.NEGATIVE_INFINITY;
    this.maxEtL = Number.NEGATIVE_INFINITY;
    this.maxEtR = Number.NEGATIVE_INFINITY;
    this.emittedPairs = new Set(); // "leftId|rightId" already emitted (no dup inner)
    this.batchIndex = 0;
    return this;
  }

  get globalWatermark() {
    return Math.min(this.wmL, this.wmR);
  }

  _matches(l, r) {
    return l.key === r.key && Math.abs(l.eventTime - r.eventTime) <= this.timeWindow;
  }

  // Process one batch of { left, right }. Returns the full trace entry.
  processBatch(batch = {}) {
    const left = batch.left || [];
    const right = batch.right || [];
    const gwmBefore = this.globalWatermark;

    // 1) advance observed max event times
    for (const r of left) if (r.eventTime > this.maxEtL) this.maxEtL = r.eventTime;
    for (const r of right) if (r.eventTime > this.maxEtR) this.maxEtR = r.eventTime;

    // 2) late-drop rows below the current global watermark; buffer the rest
    const dropped = [];
    const addLeft = [], addRight = [];
    for (const r of left) (r.eventTime < gwmBefore ? dropped : addLeft).push(r);
    for (const r of right) (r.eventTime < gwmBefore ? dropped : addRight).push(r);
    for (const r of addLeft) this.leftBuf.push({ id: r.id, key: r.key, eventTime: r.eventTime, value: r.value, matched: false });
    for (const r of addRight) this.rightBuf.push({ id: r.id, key: r.key, eventTime: r.eventTime, value: r.value, matched: false });

    // 3) inner matches across all buffered pairs not yet emitted (deterministic order)
    const matched = [];
    const lb = [...this.leftBuf].sort((a, b) => a.eventTime - b.eventTime || String(a.id).localeCompare(b.id));
    const rb = [...this.rightBuf].sort((a, b) => a.eventTime - b.eventTime || String(a.id).localeCompare(b.id));
    for (const l of lb) {
      for (const r of rb) {
        if (!this._matches(l, r)) continue;
        const pk = l.id + '|' + r.id;
        if (this.emittedPairs.has(pk)) continue;
        this.emittedPairs.add(pk);
        l.matched = true; r.matched = true;
        matched.push({ type: 'inner', left: { id: l.id, eventTime: l.eventTime }, right: { id: r.id, eventTime: r.eventTime }, key: l.key });
      }
    }

    // 4) advance per-side watermarks (monotonic), recompute global
    if (this.maxEtL > Number.NEGATIVE_INFINITY) this.wmL = Math.max(this.wmL, this.maxEtL - this.delay);
    if (this.maxEtR > Number.NEGATIVE_INFINITY) this.wmR = Math.max(this.wmR, this.maxEtR - this.delay);
    const gwmAfter = this.globalWatermark;

    // 5) evict state that can no longer match; emit outer nulls for unmatched evictees.
    //    A left row at e can be evicted once the RIGHT watermark passes e + timeWindow
    //    (no future right row can fall within [e-T, e+T]). Symmetric for right rows.
    const emittedOuter = [];
    const keepLeft = [];
    for (const l of this.leftBuf) {
      const evict = this.wmR > l.eventTime + this.timeWindow;
      if (!evict) { keepLeft.push(l); continue; }
      if (!l.matched && (this.joinType === 'leftOuter')) {
        emittedOuter.push({ type: 'leftOuter', left: { id: l.id, eventTime: l.eventTime }, right: null, key: l.key });
      }
    }
    const keepRight = [];
    for (const r of this.rightBuf) {
      const evict = this.wmL > r.eventTime + this.timeWindow;
      if (!evict) { keepRight.push(r); continue; }
      if (!r.matched && (this.joinType === 'rightOuter')) {
        emittedOuter.push({ type: 'rightOuter', left: null, right: { id: r.id, eventTime: r.eventTime }, key: r.key });
      }
    }
    this.leftBuf = keepLeft;
    this.rightBuf = keepRight;

    const emitted = [...matched, ...emittedOuter].sort(sortEmit);
    const entry = {
      index: this.batchIndex,
      inputLeft: left.length, inputRight: right.length,
      droppedCount: dropped.length, dropped: dropped.map((r) => ({ ...r })),
      watermarkBefore: gwmBefore, watermarkAfter: gwmAfter, wmL: this.wmL, wmR: this.wmR,
      emitted,
      leftState: this.leftBuf.map((r) => ({ id: r.id, key: r.key, eventTime: r.eventTime, matched: r.matched })),
      rightState: this.rightBuf.map((r) => ({ id: r.id, key: r.key, eventTime: r.eventTime, matched: r.matched })),
    };
    this.batchIndex++;
    return entry;
  }

  run(batches) {
    this.reset();
    const trace = batches.map((b) => this.processBatch(b));
    return { trace, finalWatermark: this.globalWatermark, leftState: this.leftBuf, rightState: this.rightBuf };
  }
}

function sortEmit(a, b) {
  const al = a.left ? a.left.id : '~', bl = b.left ? b.left.id : '~';
  const ar = a.right ? a.right.id : '~', br = b.right ? b.right.id : '~';
  return String(al).localeCompare(bl) || String(ar).localeCompare(br);
}

export function runJoin(batches, config) {
  return new StreamJoin(config).run(batches);
}
