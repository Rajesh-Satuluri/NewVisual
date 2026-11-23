# DB Internals — to scale

A "Designed to Scale"-style interactive course for **database internals**, built on the
content from `db-lab`. Vanilla JS, native ES modules, no build step — deploys as static
files under GitHub Pages like the other tools in this repo.

**Live slice:** the **LSM-Tree** lesson — a 9-step problem→solution→technique→tradeoff→
recap narrative with animated isometric SVG scenes, a metrics HUD, and a **live
interactive lab** driven by the real, unit-tested LSM kernel from db-lab. Guided scenes
and the live lab render through the *same* renderer (the "superset" design).

## Run locally
```bash
cd db-scale
python3 -m http.server 8080
# open http://localhost:8080/#/lsm-tree/0
```

## Structure
```
index.html              shell + pre-paint (theme/layout)
styles/tokens.css       design tokens (light/dark)
styles/app.css          layout, scene, HUD, rail
src/engine/             h() hyperscript · store · router · iso · flows · icons
src/db/                 lsm-scene (DB visual language) · hud
src/content/lsm.js      the LSM lesson, as data (steps + scenes)
src/kernels/            lsm.mjs + kernel-contract.mjs (copied verbatim from db-lab)
src/app.js              boot, panels, step nav, live-lab host
```

## Adding a lesson
A lesson is pure data: `{ id, title, group, summary, metrics, legend, goals, steps[] }`.
Each step is `{ chapter, short, title, body[], callout, changes[], metrics, scene }`,
where `scene` is a snapshot-shaped object the scene renderer draws, or `{ lab: true }`
to mount a live kernel. See `src/content/lsm.js`.

## Next (per the build plan)
Phase 1 — the other kernel-backed labs (B+Tree, WAL+Recovery, Buffer Pool, MVCC,
Optimizer, Raft). Phase 2 — the 34 authored concepts as guided lessons. Phase 3 — the
remaining ~99 + catalog/roadmap. Each reuses this engine; most add a scene vocabulary
for their structure (B+Tree nodes, buffer-pool frames, replica sets, …).
