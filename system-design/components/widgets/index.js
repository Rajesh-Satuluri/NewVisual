// ── Widget registry (Block E) ───────────────────────────────────────────────
// Flagship interactive widgets. A question opts in via its `widget` field
// (see content/schema.md). The renderer lazy-loads the matching module here
// and mounts it. Each widget module exports: mount(container, opts) → cleanup.

export const WIDGETS = {
  "idempotency-race": () => import('./idempotency-race.js'),
  "cache-strategy":   () => import('./cache-strategy.js'),
  "consistent-hash":  () => import('./consistent-hash.js'),
  "estimator":        () => import('./estimator.js'),
  "backoff":          () => import('./backoff.js'),
  "cap":              () => import('./cap.js'),
};

// Short human label + one-line pitch, shown in the widget section header.
export const WIDGET_META = {
  "idempotency-race": { title: "Idempotency race simulator", hint: "Fire two concurrent requests with the same key and watch who wins." },
  "cache-strategy":   { title: "Cache-write strategy visualizer", hint: "Compare write-through, write-back, and write-around on a live write." },
  "consistent-hash":  { title: "Consistent-hash ring", hint: "Add and remove nodes; see how few keys actually move." },
  "estimator":        { title: "Back-of-envelope estimator", hint: "Turn DAU + request assumptions into QPS, storage, and bandwidth." },
  "backoff":          { title: "Retry-storm & backoff lab", hint: "Watch naive retries amplify an outage, then tame them with backoff + jitter." },
  "cap":              { title: "CAP trade-off picker", hint: "A partition hits — choose what you sacrifice and see the consequence." },
};
