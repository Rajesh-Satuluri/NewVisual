/* content/time-series-modeling.js — "Time-Series Modeling", the append-heavy,
   time-ordered pattern (metrics, IoT, logs, events), as DATA. Its scene lives on
   the NoSQL canvas: time-bucketed partitions holding a bounded window of readings
   sorted newest-first, with TTL expiry and rollups into coarser aggregates. */

export const timeSeriesModelingLesson = {
  id: 'time-series-modeling',
  title: 'Time-Series Modeling',
  group: 'NoSQL & Access-Pattern Modeling',
  summary: 'Time-series data is written constantly and read as recent ranges by entity and time, so it is modeled by partitioning on (entity + time bucket) with a timestamp-descending clustering key. Buckets bound partition size and spread load across time, while TTL expiry and rollups keep the dataset and its cost under control.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['partitions', 'items', 'scanRows', 'freshness'],
  legend: [],
  goals: [
    { text: 'The workload is append-heavy writes and recent-range reads per entity', step: 0 },
    { text: 'A partition-per-sensor key grows without bound and never ages out', step: 1 },
    { text: 'Partition by entity + a time bucket to bound each partition and spread load', step: 2 },
    { text: 'Cluster by timestamp DESC so recent reads and range scans are cheap', step: 3 },
    { text: 'TTL expires old raw points; rollups downsample into coarser tiers', step: 4 },
    { text: 'Bucket + sort + expire + roll up — the whole time-series recipe', step: 5 },
  ],

  steps: [
    { // 0 SETUP
      chapter: 'setup', short: 'The workload',
      title: 'Write constantly, read recent ranges',
      body: [
        `Time-series data — metrics, IoT sensor readings, application logs, event streams — has a shape all its own. Writes are <b>relentless and append-only</b>: every sensor, every few seconds, forever, each new point stamped with the time it arrived. The data is never updated in place, only ever added to the end.`,
        `The reads are just as distinctive. Almost every query is <span class="term">entity + recent time range</span>: "the last hour of <code>sensor_42</code>", "today's error rate for this service", "this week's events for that device". Old data is read rarely and in bulk, if at all. The model's one job is to serve <b>append-heavy writes</b> and <b>recent-range-by-entity reads</b> cheaply — everything else follows from that access pattern.`,
      ],
      callout: { kind: 'insight', text: 'The access pattern is fixed: constant append-only writes, and reads that are almost always "this entity, this recent window." Model for exactly that.' },
      metrics: { partitions: 1, items: 6, scanRows: 6, freshness: 2 },
      scene: { view: 'workload', note: 'The time-series workload: append-only writes on one side, recent-range-by-entity reads on the other.' },
    },
    { // 1 PROBLEM (unbounded partition)
      chapter: 'problem', short: 'Unbounded partition',
      title: 'One partition per sensor grows forever',
      body: [
        `The naive key is the obvious one: partition by the entity, <code>PK = sensor_42</code>, clustered by timestamp. For a day it is fine. But the partition <b>never stops growing</b> — a sensor writing every 10 seconds adds ~8,600 points a day, millions a year, into <em>one partition on one node</em>.`,
        `Unbounded partitions are a known failure mode. They blow past per-partition size limits, turn into a <b>hot partition</b> for writes (every new point lands on the same key), and make even a "recent" read sift a partition that holds <em>all history</em>. Nothing ever ages out, so storage and read cost climb forever. The entity alone is the wrong partition key for data that grows without bound.`,
      ],
      callout: { kind: 'warn', text: 'Partitioning on the entity alone gives one ever-growing partition per sensor: it exceeds size limits, goes hot on writes, and can never expire old data.' },
      changes: ['! PK=sensor_42 grows unbounded', '! one hot write partition per entity', '! old data never ages out'],
      metrics: { partitions: 1, items: 9, scanRows: 9, freshness: 2 },
      scene: { view: 'unbounded', note: 'A single sensor_42 partition growing without bound — all of history on one node, nothing ever expiring.' },
    },
    { // 2 TECHNIQUE (time bucket)
      chapter: 'technique', short: 'Bucket by time',
      title: 'Partition by entity + a time bucket',
      body: [
        `The fix is <span class="term">time bucketing</span>: fold a coarse time window into the partition key. Instead of <code>PK = sensor_42</code>, use <code>PK = sensor_42#2024-01</code> — the entity plus the month (or day, or hour, sized to the write rate). Each partition now holds a <b>bounded window</b> of readings and then closes; a new bucket opens for the next window.`,
        `This solves two problems at once. The partition is <b>bounded</b> — a month of points, not all of history — so it never exceeds limits. And because each window gets a new key, writes <b>spread across time buckets</b> instead of hammering one key forever, taming the write hot spot. The window size is the dial: pick it so one bucket holds a comfortable number of points for your write rate.`,
      ],
      callout: { kind: 'tip', text: 'PK = entity#time-window bounds every partition and moves the write target to a new bucket each window — bounded size AND spread load in one key.' },
      changes: ['+ PK=sensor_42#2024-01 (entity + month)', '~ bounded window per partition', '+ writes spread across buckets'],
      metrics: { partitions: 3, items: 9, scanRows: 3, freshness: 2 },
      scene: { view: 'bucket', note: 'The sensor split into monthly buckets — each partition bounded, with writes moving to a fresh bucket each window.' },
    },
    { // 3 TECHNIQUE (clustering DESC + range read)
      chapter: 'technique', short: 'Sort newest-first',
      title: 'Cluster by timestamp DESC for cheap ranges',
      body: [
        `Inside each bucket the <span class="term">clustering key</span> is the timestamp, sorted <b>descending</b>. Newest-first is deliberate: the common query is "the latest readings", and with DESC ordering the newest row is the <em>first</em> row — a <code>LIMIT 10</code> reads the 10 most recent points without scanning the partition.`,
        `Descending order also makes <b>range reads</b> cheap. "Readings between 10:00 and 11:00" is a single contiguous slice of an already-sorted partition — one sequential scan of exactly the rows asked for, no filtering of the rest. The access pattern (recent-range-by-entity) maps directly onto the physical layout: the rows you want are adjacent and already in the order you read them.`,
      ],
      callout: { kind: 'insight', text: 'Timestamp DESC puts the newest row first, so "latest N" and "this time range" are both one short contiguous scan — no sifting the whole partition.' },
      changes: ['+ clustering key = ts DESC', '~ "latest N" reads the first N rows', '~ range read = one contiguous slice'],
      metrics: { partitions: 3, items: 9, scanRows: 3, freshness: 1 },
      scene: { view: 'rangeread', note: 'Within a bucket the rows sort newest-first, so a recent-range query sweeps one contiguous, already-ordered slice.' },
    },
    { // 4 TECHNIQUE / TRADEOFF (TTL + rollups)
      chapter: 'technique', short: 'Expire + roll up',
      title: 'TTL expires raw points; rollups downsample',
      body: [
        `Raw high-resolution data is only valuable while it is fresh. Set a <span class="term">TTL</span> (time-to-live) on raw points so the store <b>expires them automatically</b> — a per-item clock that drops each reading after, say, 7 days, reclaiming storage with no delete job to run. Bucketing makes this clean: whole old partitions fall away as their window ages past the TTL.`,
        `But you rarely want to lose the <em>signal</em>, only the resolution. So <b>roll up</b> before you expire: a background job downsamples raw points into coarser aggregates — <code>raw → hourly → daily</code> — each tier its own table or bucket with its own longer TTL. Dashboards read the tier that matches their zoom level, so a year-long chart reads a few hundred daily rollups, not millions of raw points. The tradeoff is explicit: rollups cost write-time compute and give up the ability to drill below their grain.`,
      ],
      callout: { kind: 'tip', text: 'TTL reclaims raw points automatically; rollups (raw → hourly → daily) keep the long-term signal at lower resolution. Read the tier that fits the zoom.' },
      changes: ['+ TTL expires raw points automatically', '+ rollups: raw → hourly → daily tiers', '! rollups cost write compute; grain is lossy'],
      metrics: { partitions: 3, items: 3, scanRows: 3, freshness: 1 },
      scene: { view: 'rollup', note: 'Raw readings expire under TTL while a rollup job downsamples them into hourly and daily aggregate tiers.' },
    },
    { // 5 RECAP
      chapter: 'recap', short: 'The recipe',
      title: 'The time-series modeling recipe',
      body: [
        `Time-series modeling is the access pattern made physical. Partition by <b>entity + time bucket</b> so every partition is bounded and writes spread across buckets instead of piling onto one hot key. Cluster by <b>timestamp DESC</b> so the newest rows come first and recent-range reads are one contiguous scan.`,
        `Then manage the lifecycle: <b>TTL</b> expires raw points automatically, and <b>rollups</b> downsample raw → hourly → daily so long-range queries read coarse tiers cheaply. To avoid the hot "current time" partition, combine the bucket with a small <b>shard</b> suffix on very high write rates. Every choice traces back to the same workload — append constantly, read recent ranges — and that is what makes the model fast and bounded at any scale.`,
      ],
      callout: { kind: 'insight', text: 'Bucket by entity+time, sort by time DESC, expire with TTL, downsample with rollups: a bounded, append-fast, recent-range-cheap model.' },
      metrics: { partitions: 3, items: 9, scanRows: 3, freshness: 1 },
      scene: { view: 'recap', note: 'The full recipe: bucketed partitions, timestamp-DESC clustering, TTL expiry, and raw→hourly→daily rollups.' },
    },
  ],
};
