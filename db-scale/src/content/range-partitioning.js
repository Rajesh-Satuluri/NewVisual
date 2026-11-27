/* content/range-partitioning.js — the "Range Partitioning" lesson, as DATA.
   Same shape as the other db-scale lessons: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a
   view-snapshot consumed by db/range-partitioning-scene.js. */

export const rangePartitioningLesson = {
  id: 'range-partitioning',
  title: 'Range Partitioning',
  group: 'Distributed Systems',
  summary: 'Split a table by contiguous key ranges so sorted neighbours stay together — range scans stay cheap, but sequential write keys create hotspots.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['partitions', 'skew', 'latency', 'nodes2'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why hashing scatters a range scan across every node', step: 0 },
    { text: 'Range partitioning keeps adjacent keys on one node', step: 1 },
    { text: 'A routing table maps key ranges to partitions', step: 2 },
    { text: 'Sequential keys pile writes into one hot range', step: 3 },
    { text: 'When ranges win, and how to split a hot one', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Scattered scan',
      title: 'Hashing shreds a range scan',
      body: [
        `Hash partitioning spreads keys evenly, which is great for point lookups — but it <b>destroys order</b>. Keys that are neighbours (<span class="term">2024-01-01</span> … <span class="term">2024-01-07</span>) hash to totally different nodes.`,
        `So a query like “give me last week’s events, sorted” has to fan out to <b>every</b> partition, gather fragments, and re-sort them. The one thing databases do best — walk a sorted range — turns into an all-nodes scatter-gather.`,
      ],
      callout: { kind: 'warn', text: 'Hashing places keys by a random-looking digest, so adjacent keys land on different nodes. Any range or ordered scan must touch every partition.' },
      metrics: { partitions: 4, skew: 4, latency: 180, nodes2: 4 },
      scene: { view: 'scatter', note: 'A one-week range — scattered across all four partitions by the hash.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Sorted ranges',
      title: 'Partition by contiguous key ranges',
      body: [
        `Range partitioning keeps keys in <span class="term">sorted order</span> and cuts the keyspace into contiguous slices: <code>A–F</code> on P1, <code>G–M</code> on P2, <code>N–S</code> on P3, <code>T–Z</code> on P4.`,
        `Now adjacent keys live on the <b>same</b> partition, and the partitions themselves are ordered. The sorted neighbourhood that hashing broke apart is preserved end to end.`,
      ],
      callout: { kind: 'insight', text: 'Assign each row to a partition by which contiguous key range it falls in. Order is preserved both inside a partition and across them.' },
      changes: ['+ keyspace cut into sorted ranges', '~ adjacent keys share a partition', '+ partitions kept in key order'],
      metrics: { partitions: 4, skew: 2, latency: 70, nodes2: 4 },
      scene: { view: 'ranges', note: 'The sorted key line cut into four contiguous buckets — order intact.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Routing table',
      title: 'A routing table maps ranges to partitions',
      body: [
        `The cluster keeps a small <span class="term">routing table</span>: a sorted list of range boundaries and the partition that owns each slice. To route a key, binary-search the boundaries — <code>P</code> is found in one step.`,
        `A range scan is where this shines: <code>WHERE k BETWEEN 'G' AND 'P'</code> overlaps only <b>P2 and P3</b>, so the query touches two partitions instead of four, and each returns its slice already sorted.`,
      ],
      callout: { kind: 'tip', text: 'A scan reads only the partitions its range overlaps. Results come back pre-sorted, so merging them is a cheap ordered merge, not a full re-sort.' },
      changes: ['+ routing table of range boundaries', '~ scan touches only overlapping ranges', '✓ results arrive pre-sorted'],
      metrics: { partitions: 4, skew: 2, latency: 45, nodes2: 4 },
      scene: { view: 'routing', note: 'The G–P scan overlaps only P2 and P3 — two partitions answer, in order.' },
    },
    { // 3 — TRADE-OFF
      chapter: 'tradeoff', short: 'Hotspot',
      title: 'Sequential keys burn one partition',
      body: [
        `Ordered placement has a sharp edge. If the partition key is <b>monotonically increasing</b> — a timestamp, an auto-increment id — then every new row falls into the <span class="term">last</span> range.`,
        `That one partition absorbs <em>all</em> the write traffic while the others sit idle. You picked range partitioning for cheap scans and accidentally built a single-node write bottleneck: a classic <span class="term">hotspot</span>.`,
      ],
      callout: { kind: 'warn', text: 'A monotonic key (time, sequence id) always targets the newest range, so one partition takes every write. Even placement by range does not mean even load.' },
      metrics: { partitions: 4, skew: 92, latency: 160, nodes2: 4 },
      scene: { view: 'hotspot', note: 'Every write is “now” — the newest range glows hot, the rest stay cold.' },
    },
    { // 4 — HOW IT WORKS
      chapter: 'technique', short: 'Split & merge',
      title: 'Split a hot range, merge cold ones',
      body: [
        `Because boundaries are just data, the cluster can <b>adapt</b>. When a range runs hot, split it at its midpoint into two and move one half to another node — load halves without reshuffling the whole table.`,
        `Cold, sparse ranges can be <span class="term">merged</span> to reclaim partitions. Choosing a key with natural spread (or prefixing a monotonic key) also tames the hotspot before it starts.`,
      ],
      callout: { kind: 'tip', text: 'Range boundaries are mutable: split a hot range and hand off half, merge cold ones. Pick a partition key with spread so writes do not pile onto “now”.' },
      changes: ['+ hot range split in two', '~ half handed to an idle node', '− cold ranges merged away'],
      metrics: { partitions: 5, skew: 18, latency: 60, nodes2: 4 },
      scene: { view: 'split', note: 'The hot range splits; half moves to an idle node and load evens out.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Great for scans, careful with keys',
      body: [
        `Range partitioning trades the perfect spread of hashing for <b>locality</b>: ordered keys stay together, so range and time-bucket scans touch only the partitions they need and return sorted.`,
        `The price is write skew on sequential keys — mitigated by key choice and by splitting hot ranges. That tension between <b>even load</b> and <b>cheap scans</b> is exactly what <span class="term">hot partitions</span> and <span class="term">rebalancing</span> tackle next.`,
      ],
      callout: { kind: 'insight', text: 'Range partitioning keeps order for cheap sorted scans; its risk is hotspots on monotonic keys, fixed by better keys and by splitting hot ranges.' },
      metrics: { partitions: 5, skew: 14, latency: 50, nodes2: 4 },
      scene: { view: 'recap', note: 'Sorted ranges give cheap scans — mind the hotspot on sequential keys.' },
    },
  ],
};
