// ── Track definitions (SWE · DE) ─────────────────────────────────────────────
// The app ships two learning tracks that share one engine: a Software-
// Engineering system-design track (the original) and a Data-Engineering
// system-design track. A track bundles its own concept + question registries,
// home copy, start path, and which reference/practice pages are available.
//
// The active track is chosen by the sidebar toggle, persisted in localStorage,
// and loaded into the shared registry (content/registry.js). Concept/question
// modules are lazy-imported so only the active track's data is fetched.

export const TRACK_IDS = ['swe', 'de'];

export const TRACKS = {
  swe: {
    id: 'swe',
    label: 'Software Eng',
    short: 'SWE',
    icon: '🧭',
    brandTitle: 'System Design',
    brandSub: 'SWE · SDE',
    home: {
      kicker: 'Visual Learning Lab',
      titleTop: 'System design,',
      titleGrad: 'from the inside out.',
      sub: 'Learn the concepts first, then drill with real-world questions, model answers, flashcards and interactive simulations.',
    },
    startPath: ['interview-framework', 'back-of-envelope-estimation', 'scaling-zero-to-millions', 'rate-limiter', 'url-shortener', 'news-feed-system'],
    refPages: ['dashboard', 'glossary', 'cheatsheet'],
    practicePages: ['decisions', 'answers'],
    concepts: () => import('./concepts.js'),
    questions: () => import('./index.js'),
    glossary: () => import('./glossary.js'),
    cheatsheet: () => import('./cheatsheet.js'),
  },

  de: {
    id: 'de',
    label: 'Data Eng',
    short: 'DE',
    icon: '🛢️',
    brandTitle: 'Data Engineering',
    brandSub: 'DE System Design',
    home: {
      kicker: 'Data Engineering Lab',
      titleTop: 'Data systems,',
      titleGrad: 'from ingest to insight.',
      sub: 'Learn the platform concepts first — lakes, warehouses, streaming, pipelines, CDC — then watch each one run as a live simulation.',
    },
    startPath: ['data-lake', 'medallion-architecture', 'batch-vs-streaming', 'cdc-pipeline', 'kafka-architecture', 'warehouse-design'],
    refPages: ['dashboard', 'glossary', 'cheatsheet'],
    practicePages: [],
    concepts: () => import('./de/concepts.js'),
    questions: () => import('./de/index.js'),
    glossary: () => import('./de/glossary.js'),
    cheatsheet: () => import('./de/cheatsheet.js'),
  },
};
