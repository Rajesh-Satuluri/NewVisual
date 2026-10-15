# Simulation Kernel Contract

Every **flagship** (⚡ Interactive Lab) simulator is split into two halves:

```
sims/kernels/<name>.mjs     ← pure logic. No DOM. Deterministic. Node-testable.
sims/modules/<name>.js      ← renderer. Draws the kernel's state onto a canvas / DOM.
```

The renderer **never** invents state. It reads `kernel.state`, draws it, and calls
`kernel.dispatch(...)` in response to user input. This is what makes the simulator
honest (the picture is the state) and testable (the logic runs headless in Node).

Guided-walkthrough sims (🎬) keep their existing scripted-frame form and do **not**
need a kernel. Only interactive labs do.

## The kernel object

`createKernel(config)` returns a plain object:

| Member | Type | Meaning |
|---|---|---|
| `config` | object | the frozen configuration it was built from |
| `state` | object | current state — plain, serialisable, no functions |
| `reset()` | () → void | rebuild `state` from `config` (and clear the trace) |
| `dispatch(op)` | (op) → void | apply one **valid** operation; throws on an invalid one; appends to `trace` |
| `ops()` | () → op[] | the operations that are legal in the current state (for UIs) |
| `invariants()` | () → Check[] | structural correctness checks — see below |
| `metrics()` | () → object | computed numbers (hit rate, tree height, amplification, …) |
| `snapshot()` | () → object | a deep clone of `state` (for replay / trace diffing) |
| `trace` | op[] | ordered event log of every dispatched op |

`op` is a plain object `{ type, ...args }`. `Check` is `{ name, ok, detail }`.

## The five guarantees (enforced by `tests/`)

1. **Deterministic** — the same `config` + same op sequence always yields the same
   `metrics()` and `snapshot()`.
2. **Reset/replay** — `reset()` then re-dispatching `trace` reproduces the state
   exactly (`replay(kernel)` helper asserts this).
3. **Invariants hold** — after *every* dispatched op, all `invariants()` return `ok:true`.
4. **Errors, not corruption** — an invalid op throws; state is unchanged.
5. **Metrics are real** — numbers are computed from `state`, never hand-written.

See `_example-fifo-cache.mjs` for the reference implementation and
`../../tests/kernels.test.mjs` for the tests that pin these guarantees. That example
is a *pattern demo only* — it is not wired to any lesson. The real Buffer Pool,
B+Tree, WAL, MVCC, Optimizer, LSM and Replication kernels are built in later phases.
