/* ============================================================
   buffer-pool.mjs — buffer pool / page cache kernel.

   A pure, deterministic model of a fixed-capacity buffer pool with
   pluggable replacement policies. The renderer draws this real state;
   the tests pin the eviction decisions and the hit/miss accounting.

   Policies:
     LRU   — evict the least-recently-used frame (recency updated on hit).
     FIFO  — evict the oldest-loaded frame (a hit does NOT change order).
     CLOCK — second-chance approximation of LRU: a reference bit per frame,
             a sweeping hand clears bits and evicts the first 0 it finds.

   Dirty frames evicted cause a write-back (a real I/O cost), tracked
   separately from clean evictions.
   ============================================================ */

import { createKernel } from "./kernel-contract.mjs";

const POLICIES = ["LRU", "FIFO", "CLOCK"];

export function bufferPoolSpec(config) {
  const cfg = Object.assign({ capacity: 3, policy: "LRU" }, config || {});
  if (POLICIES.indexOf(cfg.policy) === -1) throw new Error("buffer-pool: unknown policy " + cfg.policy);
  if (!(cfg.capacity >= 1)) throw new Error("buffer-pool: capacity must be ≥ 1");

  return {
    config: cfg,

    init(c) {
      return {
        capacity: c.capacity,
        policy: c.policy,
        frames: [],          // { page, dirty, ref, loadedAt, usedAt }
        hand: 0,             // CLOCK sweep position
        tick: 0,             // logical clock for recency / load order
        accesses: 0, hits: 0, misses: 0, evictions: 0, writeBacks: 0,
        last: null,          // { page, result:'hit'|'miss', evicted, wroteBack } for the renderer
      };
    },

    apply(s, op) {
      if (op.type !== "access") throw new Error("buffer-pool: unknown op `" + op.type + "`");
      if (op.page == null) throw new Error("access: needs a `page`");
      accessPage(s, op.page, !!op.write);
    },

    legal(s) {
      return s.frames.map((f) => ({ type: "access", page: f.page }));
    },

    invariants(s) {
      const pages = s.frames.map((f) => f.page);
      const unique = new Set(pages).size === pages.length;
      return [
        { name: "capacity", ok: s.frames.length <= s.capacity,
          detail: s.frames.length + " / " + s.capacity + " frames" },
        { name: "no-duplicates", ok: unique,
          detail: unique ? "each page resident at most once" : "duplicate resident page" },
        { name: "accounting", ok: s.hits + s.misses === s.accesses,
          detail: s.hits + " hits + " + s.misses + " misses = " + s.accesses },
        { name: "hand-in-range", ok: s.frames.length === 0 || (s.hand >= 0 && s.hand < s.capacity),
          detail: "clock hand = " + s.hand },
      ];
    },

    metrics(s) {
      return {
        accesses: s.accesses, hits: s.hits, misses: s.misses,
        hitRate: s.accesses ? s.hits / s.accesses : 0,
        evictions: s.evictions, writeBacks: s.writeBacks,
        resident: s.frames.length, capacity: s.capacity,
      };
    },
  };
}

export function createBufferPool(config) {
  return createKernel(bufferPoolSpec(config));
}

/* ── core ───────────────────────────────────────────────────────────────── */
function accessPage(s, page, write) {
  s.tick++;
  s.accesses++;
  const f = s.frames.find((fr) => fr.page === page);

  if (f) {
    s.hits++;
    f.usedAt = s.tick;
    f.ref = 1;                          // CLOCK: reference bit set on use
    if (write) f.dirty = true;
    s.last = { page: page, result: "hit", evicted: null, wroteBack: false, write: write };
    return;
  }

  s.misses++;
  let evicted = null, wroteBack = false;

  if (s.frames.length >= s.capacity) {
    const victimIdx = pickVictim(s);
    const v = s.frames[victimIdx];
    evicted = v.page;
    if (v.dirty) { wroteBack = true; s.writeBacks++; }
    s.evictions++;
    s.frames.splice(victimIdx, 1);
    if (s.policy === "CLOCK") {
      // keep hand pointing at the slot after the victim (now occupied by shift)
      s.hand = victimIdx % Math.max(1, s.capacity);
    }
  }

  const frame = { page: page, dirty: write, ref: 1, loadedAt: s.tick, usedAt: s.tick };
  if (s.policy === "CLOCK") {
    s.frames.splice(Math.min(s.hand, s.frames.length), 0, frame);
    s.hand = (s.frames.indexOf(frame) + 1) % Math.max(1, s.capacity);
  } else {
    s.frames.push(frame);
  }
  s.last = { page: page, result: "miss", evicted: evicted, wroteBack: wroteBack, write: write };
}

function pickVictim(s) {
  if (s.policy === "LRU") {
    let idx = 0, min = Infinity;
    s.frames.forEach((f, i) => { if (f.usedAt < min) { min = f.usedAt; idx = i; } });
    return idx;
  }
  if (s.policy === "FIFO") {
    let idx = 0, min = Infinity;
    s.frames.forEach((f, i) => { if (f.loadedAt < min) { min = f.loadedAt; idx = i; } });
    return idx;
  }
  // CLOCK: advance the hand, giving a second chance to referenced frames.
  let guard = 0;
  while (guard++ < s.frames.length * 4) {
    const i = s.hand % s.frames.length;
    const f = s.frames[i];
    if (f.ref === 0) return i;
    f.ref = 0;                           // clear the bit, give a second chance
    s.hand = (i + 1) % s.frames.length;
  }
  return s.hand % s.frames.length;        // fallback (all referenced): evict at hand
}
