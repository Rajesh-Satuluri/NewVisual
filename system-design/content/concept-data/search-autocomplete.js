export default {
  id: "search-autocomplete",
  title: "Design search autocomplete",
  icon: "🔎",
  chapter: 13,
  group: "Classic designs",
  summary: "As a user types, suggest the top few completions in a few milliseconds. The core is a trie of popular queries, precomputed top-K per prefix, aggressive caching, and an offline pipeline that updates frequencies from logs.",
  sections: [
    {
      title: "Requirements",
      body: "Suggestions must be fast, relevant, and scale to huge query volumes.",
      bullets: [
        "**Fast:** return suggestions within ~100 ms as the user types each character.",
        "**Top-K:** return the 5–10 most popular completions of the typed prefix.",
        "**Read-heavy:** suggestion lookups vastly outnumber data updates.",
        "Updates to popularity can be near-real-time or batched (usually batched).",
      ],
    },
    {
      title: "The data structure: a trie",
      body: "A **trie** (prefix tree) stores query strings character by character; every node represents a prefix. To get completions for a prefix, walk to that prefix's node and collect the strings in its subtree. To rank them, each node (or terminal word) stores a frequency/popularity score.",
      flow: ["Type prefix", "Walk trie to prefix node", "Collect subtree completions", "Return top-K by score"],
    },
    {
      title: "Making it fast: precompute top-K per node",
      body: "Collecting and sorting the whole subtree on every keystroke is too slow. Instead, **cache the top-K completions at each trie node**. A lookup then becomes: walk to the prefix node (length of prefix steps) and return its stored top-K list directly — O(prefix length), no subtree scan.",
      rules: ["Store top-K at each node → lookup is a direct read, not a subtree search."],
      body2: "Trade-off: more storage and more work at update time, in exchange for very fast reads — the right call for a read-heavy system.",
    },
    {
      title: "Caching & serving",
      body: "Put a cache (Redis/CDN) in front: popular prefixes are requested constantly, so their top-K lists are served from cache. The trie itself can be sharded (e.g. by first letter or hash of prefix) across servers when it's too large for one machine. Client-side debouncing avoids a request on every single keystroke.",
    },
    {
      title: "Updating popularity (the offline pipeline)",
      body: "You don't update the trie on every search in real time — that would be a write storm and isn't necessary. Instead, aggregate query frequencies from **logs** periodically (hourly/daily) via a data pipeline, rebuild or update the trie with new top-K lists, and swap it in. This keeps the read path simple and fast.",
      flow: ["Search logs", "Aggregate frequencies (batch)", "Rebuild trie + top-K", "Swap into serving layer"],
    },
    {
      title: "Refinements",
      body: "Real systems add: personalization and location bias, typo tolerance (fuzzy matching), recency weighting (trending queries), filtering of offensive/unsafe suggestions, and sharding the trie for scale. Multi-language support means per-locale tries.",
    },
  ],
  qa: [
    {
      q: "What data structure powers autocomplete and how do you make it fast?",
      a: "A trie (prefix tree): each node is a prefix, and completions of a prefix live in that node's subtree. A naive lookup walks to the prefix node and searches/sorts the subtree — too slow per keystroke. The optimization is to precompute and cache the top-K completions at every node, so a lookup is just 'walk to the prefix node (O(prefix length)) and return its stored list.' Add a cache in front for hot prefixes.",
      tip: "The 'precompute top-K at each node' optimization is the whole answer — without it the trie is too slow for per-keystroke queries.",
    },
    {
      q: "Why not update the trie in real time on every search?",
      a: "Because reads massively outnumber writes and real-time updates would be a write storm on a structure optimized for reads. Popularity doesn't need to be instantaneous — aggregate query counts from logs in a batch pipeline (hourly/daily), rebuild or update the top-K lists offline, and swap the new trie into the serving layer. This keeps the read path lock-free and fast.",
      tip: "Separating a fast read path from a batched offline update path is the key design decision here.",
    },
    {
      q: "How do you scale autocomplete to a huge query corpus?",
      a: "Shard the trie across machines (e.g. by first character or by hashing the prefix) so no single machine holds it all, and replicate shards for read scale and availability. Cache hot prefixes in Redis/CDN since a small set of prefixes drives most traffic. Debounce on the client to cut request volume. The offline pipeline builds shards in parallel and swaps them in.",
      tip: "Sharding by prefix + caching hot prefixes + client debounce covers the three scaling levers.",
    },
    {
      q: "How would you support trending/recency and typo tolerance?",
      a: "For trending, weight frequency by recency (decay older counts, boost recent spikes) when the offline pipeline computes scores, so rising queries surface. For typos, add fuzzy matching — e.g. tolerate small edit distances, or index common misspellings — though this adds cost, so it's often limited. Both are refinements layered on the core trie + top-K design.",
      tip: "Framing these as scoring tweaks in the offline pipeline (not changes to the read path) shows you keep the hot path clean.",
    },
  ],
  related: [
    "where-should-i-cache-client-edge-service-db-layer",
    "how-do-i-decide-between-sql-nosql-and-search-engines",
    "how-should-i-index-for-read-heavy-vs-write-heavy-workloads",
    "how-do-i-design-a-service-that-can-handle-10x-more-traffic-w",
  ],
};
