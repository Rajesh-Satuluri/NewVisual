/* ============================================================
   _example-fifo-cache.mjs — REFERENCE KERNEL (pattern demo only).

   This is NOT wired to any lesson. It exists to demonstrate the kernel
   contract end-to-end (init / apply / legal / invariants / metrics) and
   to give the test harness something real and deterministic to pin.

   The genuine Buffer Pool flagship (Phase 3) is a separate, richer
   kernel with multiple replacement policies, dirty pages and eviction
   visualisation. This toy models only a fixed-capacity FIFO page cache.
   ============================================================ */

import { createKernel } from "./kernel-contract.mjs";

/** Build the spec object (shared by the kernel and by replay() in tests). */
export function fifoCacheSpec(config) {
  return {
    config: Object.assign({ capacity: 3 }, config || {}),

    init(cfg) {
      return {
        capacity: cfg.capacity,
        slots: [],      // page ids currently resident, oldest first (FIFO)
        accesses: 0,
        hits: 0,
        misses: 0,
        lastEvicted: null,
        lastResult: null, // 'hit' | 'miss'
      };
    },

    apply(state, op) {
      if (op.type !== "access") {
        throw new Error("fifo-cache: unknown op `" + op.type + "`");
      }
      if (op.page == null) throw new Error("fifo-cache: access needs a `page`");

      state.accesses++;
      const idx = state.slots.indexOf(op.page);
      if (idx !== -1) {
        state.hits++;
        state.lastResult = "hit";
        state.lastEvicted = null;
        return; // FIFO does NOT reorder on hit (that would be LRU)
      }
      state.misses++;
      state.lastResult = "miss";
      if (state.slots.length >= state.capacity) {
        state.lastEvicted = state.slots.shift(); // evict oldest
      } else {
        state.lastEvicted = null;
      }
      state.slots.push(op.page);
    },

    legal(state) {
      // Any page is a legal access; surface the resident set as example ops.
      return state.slots.map((p) => ({ type: "access", page: p }));
    },

    invariants(state) {
      const noDupes = new Set(state.slots).size === state.slots.length;
      return [
        {
          name: "capacity",
          ok: state.slots.length <= state.capacity,
          detail: state.slots.length + " / " + state.capacity + " slots used",
        },
        {
          name: "no-duplicates",
          ok: noDupes,
          detail: noDupes ? "each page resident at most once" : "duplicate page in cache",
        },
        {
          name: "accounting",
          ok: state.hits + state.misses === state.accesses,
          detail: state.hits + " hits + " + state.misses + " misses = " + state.accesses,
        },
      ];
    },

    metrics(state) {
      return {
        accesses: state.accesses,
        hits: state.hits,
        misses: state.misses,
        hitRate: state.accesses ? state.hits / state.accesses : 0,
        size: state.slots.length,
      };
    },
  };
}

export function createFifoCache(config) {
  return createKernel(fifoCacheSpec(config));
}
