/* ============================================================
   kernel-contract.mjs — shared helpers for interactive-lab kernels.

   A kernel is a pure, DOM-free, deterministic state machine. See
   CONTRACT.md for the full specification. These helpers are used by
   both the canvas renderers (sims/modules/*) and the tests (tests/*),
   in the browser and in Node alike — so this file imports nothing.
   ============================================================ */

/** Deep clone a plain, serialisable value (state is always JSON-safe). */
export function clone(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

/**
 * Wrap a raw spec into a conforming kernel and validate its shape.
 *
 *   createKernel({
 *     config,                       // frozen & exposed as kernel.config
 *     init(config)       -> state,  // build fresh state
 *     apply(state, op)   -> void,   // mutate state for a VALID op (throw if invalid)
 *     legal(state)       -> op[],   // ops legal right now (optional; defaults to [])
 *     invariants(state)  -> Check[],// structural checks (optional)
 *     metrics(state)     -> object, // computed numbers (optional)
 *   })
 *
 * Returns the kernel object described in CONTRACT.md.
 */
export function createKernel(spec) {
  if (!spec || typeof spec.init !== "function" || typeof spec.apply !== "function") {
    throw new Error("createKernel: spec needs init(config) and apply(state, op)");
  }
  const config = spec.config == null ? {} : spec.config;

  const kernel = {
    config: Object.freeze(clone(config)),
    state: null,
    trace: [],

    reset() {
      this.state = spec.init(this.config);
      this.trace = [];
      return this;
    },

    dispatch(op) {
      if (!op || typeof op.type !== "string") {
        throw new Error("dispatch: op must be an object with a string `type`");
      }
      // apply() is responsible for throwing on a semantically invalid op
      // BEFORE mutating; we snapshot so a thrown op leaves state untouched.
      const before = clone(this.state);
      try {
        spec.apply(this.state, op);
      } catch (e) {
        this.state = before; // guarantee #4: errors, not corruption
        throw e;
      }
      this.trace.push(clone(op));
      return this;
    },

    ops() {
      return spec.legal ? spec.legal(this.state) : [];
    },

    invariants() {
      return spec.invariants ? spec.invariants(this.state) : [];
    },

    metrics() {
      return spec.metrics ? spec.metrics(this.state) : {};
    },

    snapshot() {
      return clone(this.state);
    },
  };

  return kernel.reset();
}

/**
 * Replay helper (guarantee #2): reset a kernel and re-dispatch its own
 * recorded trace into a fresh twin, then assert the twins match.
 * Returns { ok, reason }.
 */
export function replay(kernel, spec) {
  const twin = createKernel(spec);
  kernel.trace.forEach((op) => twin.dispatch(op));
  const a = JSON.stringify(kernel.snapshot());
  const b = JSON.stringify(twin.snapshot());
  return a === b
    ? { ok: true, reason: "replay reproduced state exactly" }
    : { ok: false, reason: "replay diverged from original state" };
}

/** True iff every invariant currently holds. */
export function invariantsHold(kernel) {
  return kernel.invariants().every((c) => c.ok);
}
