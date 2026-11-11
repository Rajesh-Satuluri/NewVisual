# Question data schema

Every question is one data-only ES module under `content/questions/<id>.js`
that default-exports an object matching the shape below. No DOM, no logic —
just data. A single generic renderer (Block B) turns this into the UI.

Adding a question = create one file here + add one line to `content/index.js`.

```js
export default {
  // ── identity ────────────────────────────────────────────────────────────
  id: "idempotency-write-apis",      // unique slug; matches filename & URL hash
  question: "How do I handle idempotency for write APIs?",
  icon: "🔁",                         // sidebar glyph

  // ── facets (drive filtering / badges) ───────────────────────────────────
  difficulty: "Advanced",            // "Fundamental" | "Intermediate" | "Advanced"
  category: "Core Distributed Systems & Scalability",  // must be in CATEGORY_ORDER
  tags: ["Databases", "Distributed Systems", "Reliability"],

  // ── body ────────────────────────────────────────────────────────────────
  tldr: "Same intent + same key = same outcome, no duplicate side effects.",

  steps: [                           // ordered; rendered as step-through cards (Block B6)
    {
      title: "Use an idempotency key from the client",
      body: "Markdown-ish prose. Plain paragraphs separated by blank lines.",
      bullets: ["optional", "list of points"],        // optional
      rules:   ["Same intent, same key", "New intent, new key"],  // optional, styled callout
      table:   {                                       // optional comparison table (Block B5)
        head: ["Approach", "Description", "When to use"],
        rows: [
          ["Big bang", "One long blocking migration", "Small data, low traffic"],
          ["Online phased", "Backfill + cut over", "Large tables, live prod"]
        ]
      },
      flow: ["Request w/ key K", "Insert row K", "unique? first time : retry"] // optional (Block E13)
    }
  ],

  // ── top-level flow (optional headline diagram) ──────────────────────────
  flow: ["Client", "API", "Store", "Response"],

  // ── closing self-check ──────────────────────────────────────────────────
  checklist: [
    "Can any writer still write the old shape by mistake?",
    "Do background jobs still depend on the old schema?"
  ],

  // ── optional flagship interactive (Block E); id of a widget module ──────
  widget: "idempotency-race",        // omit if none

  draft: false                       // true = answer body not yet written (shows badge)
};
```

## Field notes
- `id` is the single source of truth: filename `<id>.js`, URL `#<id>`, progress key.
- `category` **must** be one of the 11 strings in `CATEGORY_ORDER` (see `index.js`).
- Everything except `id`, `question`, `difficulty`, `category` is optional; the
  renderer degrades gracefully (a `draft` question may have only `tldr`).
- Keep these files free of HTML — the renderer escapes/formats. This keeps the
  content safe to generate in bulk and easy to proofread.
