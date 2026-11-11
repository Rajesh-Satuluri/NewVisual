// Decision drills for the Flink "Uber Edition" learning SPA.
// Each card poses a design/ops scenario on ride R-4471 (1M GPS pings/sec,
// fraud scoring <100ms, surge pricing) and judges candidate choices.
// Exactly one option per card is the 'best'.

export const DECISIONS = {
  // ------------------------------------------------------------------ m05
  m05: [
    {
      scenario:
        'You are about to launch the R-4471 GPS-ingestion job at parallelism 8, but traffic is growing ~3x per quarter. You must decide what to do about <code>maxParallelism</code> (the number of key groups) <em>before</em> the first checkpoint is taken.',
      options: [
        {
          label: 'Explicitly set maxParallelism now to a comfortable future value (e.g. 1024)',
          verdict: 'best',
          why: 'Key groups are the atomic unit of keyed-state redistribution, and <code>maxParallelism</code> is fixed at the first run and <strong>baked into every checkpoint/savepoint</strong>. Setting it high now (but not absurdly high) lets you rescale from 8 up toward ~1024 later via savepoint restore without a state rebuild. 1024 key groups over 8 slots is a clean 128 groups/slot.'
        },
        {
          label: 'Leave it unset and let Flink derive it from parallelism 8',
          verdict: 'bad',
          why: 'Flink derives <code>maxParallelism</code> from the initial parallelism (roughly <code>min(max(round(p*1.5), 128), 32768)</code>), so at p=8 you get 128. You can then never rescale beyond 128 slots without discarding keyed state. For a 3x/quarter workload that ceiling arrives fast.'
        },
        {
          label: 'Set maxParallelism to 32768 (the maximum) to be safe',
          verdict: 'ok',
          why: 'It preserves scalability, but a very large key-group count adds metadata overhead per checkpoint and more, smaller state files. It works, yet it is over-provisioned; a value a few multiples above your realistic peak parallelism is the cleaner choice.'
        }
      ],
      takeaway:
        'Decide <code>maxParallelism</code> <strong>before the first run</strong> and set it deliberately. It is immutable for the life of the state and caps how far you can ever rescale. Treat it as a capacity-planning decision, not a default.'
    }
  ],

  // ------------------------------------------------------------------ m07
  m07: [
    {
      scenario:
        'The R-4471 surge-pricing job writes per-zone price updates to a downstream store. The business requires end-to-end exactly-once: no duplicate or dropped price records even across job restarts. How should the sink deliver results?',
      options: [
        {
          label: 'Idempotent upsert sink keyed by (zone_id, window_end) into a KV/JDBC store',
          verdict: 'best',
          why: 'For surge prices, the natural primary key is (zone, window) and the value is the latest price. An idempotent upsert makes replay after a checkpoint-restore safe: re-emitting the same key overwrites rather than duplicates. It avoids transaction-coordinator complexity and has no risk of lingering open transactions blocking consumers.'
        },
        {
          label: 'Two-phase-commit (2PC) transactional Kafka sink',
          verdict: 'ok',
          why: 'A valid exactly-once path: it commits Kafka transactions on checkpoint completion. But it couples visibility latency to the checkpoint interval (readers must use <code>read_committed</code>), needs <code>transaction.max.timeout.ms</code> set above your checkpoint interval, and a stuck transaction can block downstream consumers. Correct, but heavier than needed when a natural idempotent key exists.'
        },
        {
          label: 'Plain at-least-once sink and dedupe downstream later',
          verdict: 'bad',
          why: 'This pushes correctness onto every consumer and leaves a window where duplicate prices are visible. For surge pricing that can mean charging riders on a stale/duplicated price. Not exactly-once by any reasonable definition.'
        }
      ],
      takeaway:
        'Exactly-once at the sink has two recipes: <strong>transactional (2PC)</strong> or <strong>idempotent upsert</strong>. Prefer idempotent upserts when the data has a natural primary key (zone+window) — they are simpler, lower-latency, and have no transaction-timeout footguns.'
    }
  ],

  // ------------------------------------------------------------------ m09
  m09: [
    {
      scenario:
        'A 1-minute tumbling window counting pings for ride R-4471 has stopped firing. GPS events still arrive, but one of the 8 source partitions went quiet (a driver app in a tunnel). The watermark is the minimum across partitions, so it is frozen. What do you change?',
      options: [
        {
          label: 'Apply withIdleness(Duration.ofSeconds(30)) to the watermark strategy',
          verdict: 'best',
          why: 'The exact symptom of an idle partition: the global watermark is the <em>minimum</em> across all partitions, so one silent source stalls everything. <code>WatermarkStrategy.withIdleness(...)</code> marks a quiet partition idle so it is excluded from the watermark min, letting time — and the window — advance again.'
        },
        {
          label: 'Raise the out-of-orderness bound from 5s to 60s',
          verdict: 'bad',
          why: 'This treats the wrong cause. The window is not failing because events are late — it is failing because one partition emits nothing, so its watermark never moves. A larger OOO bound only <em>delays</em> firing further and adds latency; it does nothing for an idle partition.'
        },
        {
          label: 'Add allowedLateness(Duration.ofMinutes(1))',
          verdict: 'bad',
          why: '<code>allowedLateness</code> controls how long window state is retained to accept late events <em>after</em> the watermark passes the window end — it never advances the watermark. With a frozen watermark the window still never fires, so this changes nothing about the symptom.'
        }
      ],
      takeaway:
        'A window that stops firing while data still flows is almost always an <strong>idle-partition / stuck-watermark</strong> problem, not a lateness problem. <code>withIdleness</code> fixes the watermark; OOO bound and <code>allowedLateness</code> tune lateness and do not move event time.'
    }
  ],

  // ------------------------------------------------------------------ m10
  m10: [
    {
      scenario:
        'Product wants "completed trips per driver per minute" for the R-4471 fleet — one count covering each clock minute, emitted once that minute closes. Which window type?',
      options: [
        {
          label: 'Tumbling window of 1 minute, keyed by driver',
          verdict: 'best',
          why: 'Tumbling windows are fixed-size, non-overlapping, and partition time into exactly the per-minute buckets the requirement describes. Each event lands in one window, and each minute emits exactly one count per driver — a direct match.'
        },
        {
          label: 'Sliding window of size 1 minute with 10-second slide',
          verdict: 'ok',
          why: 'It produces per-minute counts too, but overlapping windows assign each event to 6 panes, so you get an updated count every 10s and 6x the window state/output. Useful for a smooth moving count, but it is overkill (and wrong cardinality) for "one count per clock minute."'
        },
        {
          label: 'Session window with a 1-minute gap',
          verdict: 'bad',
          why: 'Session windows are defined by gaps of inactivity, so their boundaries depend on data, not the clock. You cannot get aligned per-minute buckets from them. Wrong tool for a fixed calendar-minute metric.'
        }
      ],
      takeaway:
        'Match the window to the metric shape: <strong>tumbling</strong> for fixed, non-overlapping periodic buckets; <strong>sliding</strong> for a moving aggregate that updates more often than its length; <strong>session</strong> for activity bursts separated by inactivity gaps.'
    }
  ],

  // ------------------------------------------------------------------ m11
  m11: [
    {
      scenario:
        'Your fraud job keeps a rolling 24h feature vector per driver across ~5M active drivers — tens of GB of keyed state that will not fit comfortably in JVM heap. Which state backend?',
      options: [
        {
          label: 'EmbeddedRocksDB state backend',
          verdict: 'best',
          why: 'RocksDB stores keyed state off-heap on local disk (spilling beyond memory), so it scales to state far larger than RAM and supports incremental checkpoints — exactly what tens of GB across 5M keys needs. It also sidesteps GC pressure from huge heaps.'
        },
        {
          label: 'HashMap (heap) state backend with a bigger JVM heap',
          verdict: 'bad',
          why: 'The heap backend keeps all state as live Java objects on the JVM heap. Tens of GB there means punishing GC pauses and OOM risk, and checkpoints are always full (no incremental). It is the fast choice only for small state that fits comfortably in memory.'
        },
        {
          label: 'RocksDB but keep full (non-incremental) checkpoints',
          verdict: 'ok',
          why: 'RocksDB is the right backend, but turning off incremental checkpoints means every checkpoint re-uploads the full multi-GB state, lengthening checkpoint duration and amplifying backpressure. Enable incremental checkpointing to only ship changed SST files.'
        }
      ],
      takeaway:
        'State larger than memory ⇒ <strong>RocksDB</strong> (off-heap, disk-spilling, incremental checkpoints). Reserve the heap backend for small state where object access speed matters and GC is not a concern.'
    }
  ],

  // ------------------------------------------------------------------ m12
  m12: [
    {
      scenario:
        'Under a surge-pricing spike the R-4471 pipeline hits heavy backpressure, and checkpoints start timing out because the checkpoint barriers cannot overtake the queued in-flight data. What is the right fix?',
      options: [
        {
          label: 'Enable unaligned checkpoints',
          verdict: 'best',
          why: 'Checkpoint timeouts under backpressure are the textbook case for unaligned checkpoints. Instead of waiting for barriers to flow past buffered records, unaligned checkpoints snapshot the in-flight buffers and let barriers overtake the data, so checkpoint duration decouples from backpressure. Trade-off: larger checkpoints (buffers are stored).'
        },
        {
          label: 'Increase the checkpoint interval and timeout',
          verdict: 'ok',
          why: 'A reasonable stopgap that reduces how often you fight the barrier backlog and gives each checkpoint more time. But it does not address <em>why</em> barriers are stuck and increases data-loss replay on restart. Treats the symptom, not the cause.'
        },
        {
          label: 'Disable checkpointing until the spike passes',
          verdict: 'bad',
          why: 'Disabling checkpoints abandons fault tolerance exactly when load (and failure risk) is highest. A crash now means replaying from the last successful checkpoint — possibly far back — or losing exactly-once guarantees. Never the answer.'
        }
      ],
      takeaway:
        'Checkpoints timing out <em>under backpressure</em> ⇒ reach for <strong>unaligned checkpoints</strong> first (barriers overtake in-flight data). Lengthening the interval is a stopgap; disabling checkpointing sacrifices the guarantee you are trying to protect.'
    }
  ],

  // ------------------------------------------------------------------ m13
  m13: [
    {
      scenario:
        'The R-4471 fraud job is flapping: a downstream dependency is briefly unavailable, so the job fails, restarts, fails again, in a tight loop that hammers the cluster and the failing dependency. Which restart strategy?',
      options: [
        {
          label: 'Exponential-delay restart strategy',
          verdict: 'best',
          why: 'For a transient dependency outage, exponential backoff increases the delay between successive restarts (up to a max), giving the dependency room to recover instead of hammering it. It self-throttles a flapping loop while still retrying automatically — the modern default for this failure shape.'
        },
        {
          label: 'Failure-rate restart strategy',
          verdict: 'ok',
          why: 'Reasonable: it lets the job fail up to N times per interval, then gives up and goes terminal, which stops an endless loop and surfaces the problem. But with a fixed delay it still retries at a constant cadence during the interval, and a true transient blip just trips the terminal threshold rather than riding it out.'
        },
        {
          label: 'Fixed-delay restart with a small delay and large number of attempts',
          verdict: 'bad',
          why: 'A constant short delay is exactly what produces the tight flapping loop — it pounds the recovering dependency at a steady rate and never backs off. The large attempt count just prolongs the storm.'
        }
      ],
      takeaway:
        'For transient, self-healing failures prefer <strong>exponential-delay</strong> restarts so retries back off as trouble persists. Use <strong>failure-rate</strong> to cap total failures before going terminal; avoid tight <strong>fixed-delay</strong> loops that hammer a recovering dependency.'
    }
  ],

  // ------------------------------------------------------------------ m13b
  m13b: [
    {
      scenario:
        'You need to deploy a new fraud-scoring model into the running R-4471 job. The new operator graph is state-compatible, but you must not lose the in-flight 24h feature state and must be able to roll back cleanly if the new model misbehaves. How do you ship it?',
      options: [
        {
          label: 'stop-with-savepoint, then restore the new job from that savepoint',
          verdict: 'best',
          why: '<code>stop-with-savepoint</code> drains the job to a consistent point, commits pending sink transactions, and produces a portable savepoint. You restart the new model version from it, preserving the 24h feature state; if the new model is bad, you redeploy the old version from the <em>same</em> savepoint. Clean, atomic, and the canonical Flink upgrade path.'
        },
        {
          label: 'Blue/green: run the new job in parallel, then cut traffic over',
          verdict: 'ok',
          why: 'Viable for zero-downtime and A/B validation, but it needs the new job to rebuild (or be seeded with) the 24h feature state — you cannot share live keyed state between two running jobs — plus dual-write/offset coordination to avoid duplicate or dropped output during cutover. More infrastructure; justified when you truly cannot tolerate a drain, otherwise savepoint restore is simpler.'
        },
        {
          label: 'Just cancel the job and resubmit the new version',
          verdict: 'bad',
          why: 'A plain cancel discards keyed state (unless you fall back to the last checkpoint, which is not meant for manual upgrades and may not be retained), so you lose the 24h feature window and may replay or drop records. No clean rollback point either.'
        }
      ],
      takeaway:
        'Upgrade a stateful job with <strong>stop-with-savepoint → restore</strong>: it is atomic, preserves state, and the same savepoint is your rollback. Reserve <strong>blue/green</strong> for zero-downtime cutovers where you can afford to rebuild/seed state.'
    }
  ],

  // ------------------------------------------------------------------ m14
  m14: [
    {
      scenario:
        'Backpressure on the R-4471 pipeline traces to the sink: it enriches each price event by calling an external pricing API, and the synchronous call (~40ms each) throttles throughput well below the source rate. What fixes the bottleneck?',
      options: [
        {
          label: 'Use Async I/O for the external API enrichment',
          verdict: 'best',
          why: 'The stall is per-record latency on a <em>synchronous external call</em> — the canonical Async I/O case. <code>AsyncDataStream</code> fires many in-flight requests concurrently per subtask instead of blocking on each one, so throughput is bounded by the API\'s concurrency rather than single-request latency. It even preserves ordering with <code>orderedWait</code> if needed.'
        },
        {
          label: 'Increase the sink operator parallelism',
          verdict: 'ok',
          why: 'More subtasks means more concurrent synchronous calls, so throughput does rise — but linearly with slots, and each subtask still blocks per request. You burn cluster resources to paper over per-record latency; Async I/O gets the concurrency without multiplying tasks.'
        },
        {
          label: 'Increase network buffer sizes / buffer timeout to absorb the pressure',
          verdict: 'bad',
          why: 'Bigger buffers only delay when backpressure becomes visible; they add no throughput to a sink whose ceiling is synchronous call latency. You hide the signal and add latency without raising the bottleneck.'
        }
      ],
      takeaway:
        'When the bottleneck is a <strong>blocking external call</strong>, the right lever is <strong>Async I/O</strong> (concurrent in-flight requests), not throwing parallelism or buffers at it. Buffer tuning never raises a throughput ceiling set by per-record latency.'
    }
  ],

  // ------------------------------------------------------------------ m15
  m15: [
    {
      scenario:
        'A Flink SQL job maintains a continuously updating aggregate — <code>SELECT zone, COUNT(*) FROM rides GROUP BY zone</code> — for the R-4471 dashboard. The per-zone count changes over time as new rides arrive. What kind of sink does this query need?',
      options: [
        {
          label: 'An upsert (updating) sink with a primary key on zone',
          verdict: 'best',
          why: 'A non-windowed <code>GROUP BY</code> produces a <em>changelog</em> (retractions + updates) — each new ride revises a zone\'s running count. The sink must accept updates keyed by the grouping key, i.e. an upsert sink (e.g. upsert-kafka or a JDBC/KV table with a PRIMARY KEY). It materializes the latest count per zone.'
        },
        {
          label: 'An append-only sink',
          verdict: 'bad',
          why: 'Append-only sinks cannot represent updates or retractions. Flink will reject the plan with an error like "does not support consuming update/delete changes" because the aggregate emits revisions, not new independent rows.'
        },
        {
          label: 'Make it append-only by adding a tumbling window (TUMBLE) to the GROUP BY',
          verdict: 'ok',
          why: 'A valid way to get append-only output — a windowed aggregate emits one final row per window and never retracts — but it <em>changes the semantics</em> to per-window counts, not a continuously updated running total. Correct only if windowed counts are actually what you want.'
        }
      ],
      takeaway:
        'An unbounded <code>GROUP BY</code> emits a changelog, so it needs an <strong>upsert/updating sink</strong> with a primary key. Only a <strong>windowed</strong> aggregate produces append-only output — and that is a different metric, not a free conversion.'
    }
  ],

  // ------------------------------------------------------------------ m16
  m16: [
    {
      scenario:
        'The R-4471 ride stream must be enriched with per-driver attributes (rating, vehicle class) that live in an operational database and change slowly but continuously. You want each ride joined to the driver attributes <em>as they were at the ride\'s event time</em>, without reloading a huge table into memory. Which join?',
      options: [
        {
          label: 'Temporal (versioned-table) join against a driver changelog',
          verdict: 'best',
          why: 'A temporal join matches each ride to the driver row <em>valid at the ride\'s event time</em>, using a versioned table backed by the driver changelog (e.g. upsert-kafka or a CDC source) plus watermarks. It gives point-in-time-correct enrichment and keeps only the current versions in state, not the full history.'
        },
        {
          label: 'Lookup join (JDBC) against the live driver table',
          verdict: 'ok',
          why: 'Simple and avoids holding the table in Flink state — it queries the DB per ride (with caching). But it joins against the <em>current</em> DB row, not the value at the ride\'s event time, so a late/replayed ride gets today\'s attributes. Fine for "latest wins" enrichment; wrong when point-in-time correctness matters, and it can hammer the DB at 1M pings/sec.'
        },
        {
          label: 'Broadcast the entire driver table as broadcast state',
          verdict: 'bad',
          why: 'Broadcast state replicates the full dimension to <em>every</em> subtask. For a large, continuously changing driver table that is a lot of duplicated, growing state and no event-time versioning — practical only for small, slow-changing config-like data.'
        }
      ],
      takeaway:
        'Enrichment that must be correct <em>as of event time</em> ⇒ <strong>temporal/versioned-table join</strong>. Use a <strong>JDBC lookup join</strong> for simple latest-value enrichment, and <strong>broadcast state</strong> only for small, slowly-changing reference data.'
    }
  ],

  // ------------------------------------------------------------------ m17
  m17: [
    {
      scenario:
        'The R-4471 CDC stream delivers multiple records per ride_id (corrections, re-emits) and you need, for each ride_id, only the single latest row by update_ts — as a proper deduplication in Flink SQL. Which construct?',
      options: [
        {
          label: 'Deduplication via ROW_NUMBER() OVER (PARTITION BY ride_id ORDER BY update_ts DESC) = 1',
          verdict: 'best',
          why: 'This is Flink SQL\'s recognized <em>deduplication</em> pattern: <code>ROW_NUMBER()</code> partitioned by the key, ordered by time, filtered to rank 1. The planner optimizes it into a dedicated Deduplicate operator that keeps one row per key — it retains whole rows and emits the correct latest record, including proper retractions when a newer row arrives.'
        },
        {
          label: 'GROUP BY ride_id with LAST_VALUE() on each column',
          verdict: 'ok',
          why: 'It can approximate "latest per key," but <code>LAST_VALUE</code> is evaluated per column without a guaranteed ordering unless you are careful, so columns can be stitched from <em>different</em> source rows — producing a row that never actually existed. It also runs as a general aggregate, not the optimized dedup operator. Fragile for row-level dedup.'
        },
        {
          label: 'Regular Top-N with ROW_NUMBER() <= 1 but ORDER BY a non-time column',
          verdict: 'bad',
          why: 'Ordering by a non-temporal/non-monotonic column makes it a general Top-N, not deduplication; results are unstable and it will not collapse re-emits of the same key to a single latest version. Wrong ordering key defeats the purpose.'
        }
      ],
      takeaway:
        'For "latest row per key," use the <strong>ROW_NUMBER() ... ORDER BY time DESC, filter = 1</strong> deduplication idiom — the planner turns it into an efficient Deduplicate operator and keeps whole, consistent rows. <code>LAST_VALUE</code> aggregation risks mixing columns across source rows.'
    }
  ],

  // ------------------------------------------------------------------ m18
  m18: [
    {
      scenario:
        'A surge-pricing aggregation on R-4471 is skewed: one downtown zone generates 60% of all events, so the single subtask owning that key is pinned at 100% CPU while the others idle — classic hot-key data skew. How do you fix the skew?',
      options: [
        {
          label: 'Two-phase (local/pre-)aggregation: salt the hot key, aggregate partials, then combine',
          verdict: 'best',
          why: 'Skew on a keyed aggregation is solved by splitting the hot key: add a random salt (e.g. 0..N) to the grouping key for a first local aggregation, then strip the salt and do a second global aggregation over the partials. This spreads the hot key across N subtasks and only the small set of partial results converges at the end. (Flink SQL exposes this as <code>table.optimizer.distinct-agg.split.enabled</code> / mini-batch two-phase agg.)'
        },
        {
          label: 'Insert a rebalance() before the aggregation',
          verdict: 'bad',
          why: '<code>rebalance()</code> round-robins records across subtasks, but a <em>keyed</em> aggregation must re-partition by key afterward (keyBy), which sends all hot-key records right back to the same subtask. Rebalancing cannot fix skew that is intrinsic to the key distribution.'
        },
        {
          label: 'Rescale the job to higher parallelism',
          verdict: 'bad',
          why: 'More subtasks does not help when one key dominates: that key still hashes to exactly one subtask regardless of parallelism, so the hot subtask stays saturated while the new ones sit idle. You add capacity that the skewed key cannot use.'
        }
      ],
      takeaway:
        'Hot-key skew on a keyed aggregation is beaten by <strong>two-phase aggregation</strong> (salt → local aggregate → combine), which distributes a single dominant key across subtasks. Rebalancing and rescaling do not help, because the skew is in the key itself.'
    }
  ]
};
