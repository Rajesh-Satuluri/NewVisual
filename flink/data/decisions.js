// Decision drills for the Flink "Uber Edition" learning SPA.
// Each card poses a design/ops scenario on ride R-4471 (1M GPS pings/sec,
// fraud scoring <100ms, surge pricing) and judges candidate choices.
// Exactly one option per card is the 'best'.

export const DECISIONS = {
  // ------------------------------------------------------------------ m11b
  m11b: [
    {
      scenario:
        'R-4471\'s fraud job keeps per-driver history for millions of drivers — easily hundreds of GB of keyed state. The job is on HashMapStateBackend and now suffers multi-second GC pauses and occasional TaskManager OOMs. You must fix the state layer.',
      options: [
        {
          label: 'Switch to EmbeddedRocksDBStateBackend with incremental checkpoints and managed memory',
          verdict: 'best',
          why: 'RocksDB keeps state off-heap on local disk, so hundreds of GB no longer sit on the JVM heap — the GC pauses and OOMs disappear. Incremental checkpoints keep snapshot time bounded at that scale, and its block cache/write buffers come from managed memory, sized to not OOM the container.'
        },
        {
          label: 'Keep HashMapStateBackend but add more heap and tune the garbage collector',
          verdict: 'bad',
          why: 'This only delays the wall. Hundreds of GB of on-heap objects cannot be GC-tuned into health, and every full checkpoint still serializes the entire heap. You are scaling the wrong axis.'
        },
        {
          label: 'Keep HashMap but shrink state aggressively with a very short TTL',
          verdict: 'ok',
          why: 'Bounding state with TTL is good hygiene and may help, but if the business genuinely needs long per-driver history you will fight it forever. TTL complements RocksDB; it is not a substitute for moving large state off-heap.'
        }
      ],
      takeaway:
        'Large keyed state belongs in RocksDB (off-heap, on-disk, incremental checkpoints). You cannot GC-tune hundreds of GB of on-heap state into health — change the backend, then apply TTL.'
    },
    {
      scenario:
        'With RocksDB enabled, full checkpoints of R-4471\'s 300 GB state take ~4 minutes and sometimes overrun the interval. You need checkpoints to finish in seconds without shrinking the state.',
      options: [
        {
          label: 'Enable incremental checkpoints so only SSTs created since the last checkpoint are uploaded',
          verdict: 'best',
          why: 'RocksDB SSTs are immutable, so an incremental checkpoint uploads just the new SSTs and references the already-uploaded ones. For 300 GB where only a slice changes per interval, upload volume (and time) drops by orders of magnitude.'
        },
        {
          label: 'Increase the checkpoint interval to 10 minutes so the 4-minute checkpoint fits',
          verdict: 'bad',
          why: 'This hides the symptom and increases recovery cost: on failure you reprocess up to 10 minutes of data. It does nothing about the real problem — re-uploading the entire state every time.'
        },
        {
          label: 'Switch to unaligned checkpoints',
          verdict: 'ok',
          why: 'Unaligned checkpoints help when the delay is barrier alignment under backpressure, not when it is the sheer volume of state being uploaded. Here the bottleneck is upload size, so incremental checkpoints are the direct fix.'
        }
      ],
      takeaway:
        'For large RocksDB state, incremental checkpoints are the direct lever on checkpoint duration. Unaligned checkpoints fix alignment stalls, not upload volume; a longer interval just trades duration for recovery pain.'
    }
  ],
  // ------------------------------------------------------------------ m18c
  m18c: [
    {
      scenario:
        'You are productionizing R-4471\'s fraud pipeline — a critical, long-running job that will be upgraded every sprint. You must pick a deployment mode for it (not for ad-hoc analytics).',
      options: [
        {
          label: 'Application mode (one dedicated cluster for this job), ideally via the Kubernetes Operator',
          verdict: 'best',
          why: 'A critical long-running job wants <strong>isolation and an independent lifecycle</strong>: its own JobManager + TaskManagers, its own classpath, and savepoint-based upgrades that don\'t touch other jobs. Application mode is exactly this and is the production default.'
        },
        {
          label: 'Session mode, sharing one cluster with the surge and ETA jobs to save resources',
          verdict: 'bad',
          why: 'Session mode shares one JobManager (a single point of failure for all jobs) and a slot pool. A crash, OOM, classloader leak, or slot-hungry neighbour in any job hits fraud too. Fine for short/ad-hoc jobs; wrong for a critical pipeline.'
        },
        {
          label: 'Per-Job mode for isolation',
          verdict: 'ok',
          why: 'Per-Job also isolates, but it ran main() on the client and is <strong>deprecated/removed</strong>. Application mode supersedes it (main() on the JobManager, better for operators/CI) — so choosing Per-Job today is choosing a dead end.'
        }
      ],
      takeaway:
        'Critical long-running jobs → Application mode (isolation + independent upgrades). Session mode is for many short/ad-hoc jobs. Per-Job is removed; don\'t reach for it.'
    },
    {
      scenario:
        'R-4471\'s fraud job is crash-looping after a bad config push. You have a fix, but the job is too unhealthy to take a savepoint. The operator must redeploy the fix without discarding per-driver state.',
      options: [
        {
          label: 'Set upgradeMode: last-state so the operator restores from the latest completed checkpoint via HA metadata',
          verdict: 'best',
          why: 'last-state does not need a clean savepoint — it restarts from the most recent checkpoint recorded in the HA ConfigMap. That is precisely the mode designed for a job too broken to savepoint, and it preserves state.'
        },
        {
          label: 'Keep upgradeMode: savepoint and wait for the job to stabilize enough to drain',
          verdict: 'bad',
          why: 'A crash-looping job may never reach a healthy point to stop-with-savepoint, so you could wait indefinitely while the incident continues. savepoint mode assumes a healthy job.'
        },
        {
          label: 'Use upgradeMode: stateless to force a clean restart',
          verdict: 'ok',
          why: 'It will deploy the fix, but it <strong>discards all keyed state</strong> — the fraud model loses its per-driver history and must warm up again. Acceptable only if the state is truly disposable; here it is not.'
        }
      ],
      takeaway:
        'last-state upgrade exists for exactly this: recover a job that is too unhealthy to savepoint by restoring from its latest checkpoint. Reserve stateless for genuinely disposable state.'
    }
  ],
  // ------------------------------------------------------------------ m18b
  m18b: [
    {
      scenario:
        'The R-4471 fraud job\'s checkpoint duration has been climbing all evening and is now at 8s against a 10s timeout. The backpressure tab shows the Alerts Sink at ~90%. You must act before checkpoints start failing.',
      options: [
        {
          label: 'Find and fix the sink backpressure (scale the sink / downstream), treating it as the root cause',
          verdict: 'best',
          why: 'Rising checkpoint duration here is a <em>symptom</em> of barrier alignment stalling under backpressure. The sink is busy/backpressured, so the real fix is downstream throughput — scale the sink or its target. Relieve that and alignment time (and checkpoint duration) drops back on its own.'
        },
        {
          label: 'Immediately raise the checkpoint timeout to 60s so checkpoints stop failing',
          verdict: 'bad',
          why: 'This hides the warning light. Longer timeouts mean a failure recovers from an even older checkpoint (more reprocessing), and the underlying backpressure keeps growing. You have treated the alarm, not the fire.'
        },
        {
          label: 'Enable unaligned checkpoints to let barriers overtake buffered data',
          verdict: 'ok',
          why: 'A legitimate mitigation — unaligned checkpoints decouple checkpoint duration from alignment time and are the right tool when backpressure is unavoidable/bursty. But it increases checkpoint size (in-flight data is stored) and does not fix the clamped throughput, so pair it with addressing the sink.'
        }
      ],
      takeaway:
        'Checkpoint duration climbing under backpressure is an <strong>alignment</strong> problem. Fix the backpressure (root cause) first; use unaligned checkpoints as a mitigation — never just raise the timeout and look away.'
    },
    {
      scenario:
        'You are defining the pager (not dashboard) alerts for the R-4471 location pipeline. The team wants to "be alerted about everything" — CPU, GC, buffer pools, watermark lag, job state, checkpoint failures.',
      options: [
        {
          label: 'Page only on user-visible symptoms (job down, watermark lag > SLO, rising source lag, sustained backpressure, checkpoint failures); keep CPU/GC/buffers as dashboards',
          verdict: 'best',
          why: 'Alerts must map to "the product is now wrong or late." Symptom-based paging catches real incidents and stays quiet otherwise; diagnostics like CPU/GC are what you open <em>after</em> a page to find the cause.'
        },
        {
          label: 'Page on all of them to be safe — more coverage is better',
          verdict: 'bad',
          why: 'This is how you get alert fatigue. A GC blip or a 71% CPU reading that harms nothing will page at 3am; people learn to ignore alerts, and the one that matters gets missed. Noise reduces real coverage.'
        },
        {
          label: 'Page only on job state != RUNNING and nothing else',
          verdict: 'ok',
          why: 'It is the single most important check and a fine minimum, but it misses the "quietly broken" class — a RUNNING job with 5-minute watermark lag or a crash-looping restart that still reports RUNNING between restarts. Add the freshness/lag/backpressure symptoms.'
        }
      ],
      takeaway:
        'Page on symptoms the user feels; dashboard the diagnostics. "Alert on everything" is the same as alerting on nothing once fatigue sets in.'
    }
  ],

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
