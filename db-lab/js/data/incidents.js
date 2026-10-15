/* ============================================================
   incidents.js — Production Incident Engine data (DBLab.incidents).

   Evidence-driven debugging scenarios for the fictional retailer
   ShopKart. Each incident gives context + symptoms, a set of diagnostic
   actions that reveal evidence (one smoking gun among relevant signals
   and red herrings), competing hypotheses, a root cause, and remediation
   options with trade-offs. The engine (js/modules/failure-lab.js) scores
   the investigation.

   These are HYPOTHETICAL / composite teaching scenarios — realistic
   mechanics, not transcripts of a specific real outage. Each links to the
   lessons and interactive labs that explain the mechanism.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});

  DL.incidents = [
    {
      id: "slow-checkout",
      title: "Checkout queries fell off a cliff",
      severity: "SEV-2",
      system: "ShopKart order service · PostgreSQL 15 primary",
      context: "A new 'order history' feature shipped Friday. Since then the checkout page p95 latency climbed from 40 ms to 3.2 s. Traffic is flat. No schema change was announced for the hot path.",
      workload: "~4k checkout reads/sec, point lookups by customer_id plus a new ORDER BY created_at scan.",
      baseline: "checkout p95 40 ms; CPU 35%; cache hit ratio 99.1%.",
      symptoms: [
        "Checkout p95 latency 3.2 s (was 40 ms).",
        "Primary CPU pinned at 95%, mostly in query execution.",
        "Disk read throughput up 20×; buffer cache hit ratio dropped to 94%.",
      ],
      actions: [
        { id: "explain", label: "EXPLAIN ANALYZE the checkout query", signal: "smoking-gun",
          reveals: "The new query `SELECT * FROM orders WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 20` shows **Seq Scan on orders (rows=48,000,000)** then a Top-N sort. No index is used for customer_id on this path." },
        { id: "pg_stat", label: "Check pg_stat_user_tables for seq scans", signal: "relevant",
          reveals: "orders.seq_scan jumped from ~0/min to 4,000/min on Friday; idx_scan flat. Something is scanning the whole table per request." },
        { id: "locks", label: "Inspect pg_locks for contention", signal: "red-herring",
          reveals: "No lock waits of note — a handful of normal row locks. This isn't a locking problem." },
        { id: "bloat", label: "Check table/index bloat & last VACUUM", signal: "red-herring",
          reveals: "orders is 6% bloated and was autovacuumed 20 min ago. Healthy — not the cause." },
        { id: "index_list", label: "List indexes on orders", signal: "relevant",
          reveals: "Indexes exist on (order_id) and (created_at) — but NOT on (customer_id). The old checkout path filtered by order_id; the new feature filters by customer_id." },
      ],
      hypotheses: [
        { id: "h1", text: "A missing index on customer_id forces a full table scan per checkout.", correct: true },
        { id: "h2", text: "Lock contention from the new feature is blocking checkout.", correct: false },
        { id: "h3", text: "Table bloat from missing VACUUM slowed the scans.", correct: false },
        { id: "h4", text: "The buffer pool is simply too small for the dataset.", correct: false },
      ],
      rootCause: "The order-history feature added a query filtering by customer_id, but there is no index on orders(customer_id). Each checkout now Seq Scans 48M rows, evicting hot pages from the buffer pool (hence the secondary cache-hit drop) and pinning CPU.",
      remediations: [
        { id: "r1", text: "CREATE INDEX CONCURRENTLY on orders(customer_id, created_at DESC).", effect: "fix",
          note: "A composite index serves both the filter and the ORDER BY…LIMIT, turning the Seq Scan + sort into a bounded index scan. CONCURRENTLY avoids blocking writes while it builds." },
        { id: "r2", text: "Scale the primary to a bigger instance (more CPU/RAM).", effect: "partial",
          note: "Throws hardware at an O(n) scan — buys headroom but the per-query cost still grows with the table. Treats the symptom, not the cause." },
        { id: "r3", text: "Add a read replica and send checkout reads there.", effect: "harmful",
          note: "The same unindexed Seq Scan now runs on the replica too — you've duplicated the problem and added replication lag." },
        { id: "r4", text: "Increase shared_buffers to cache the whole table.", effect: "partial",
          note: "Might raise the hit ratio, but you're still scanning 48M rows per request in memory — CPU stays pinned." },
      ],
      relatedConcepts: ["cost-based-optimization", "b-plus-tree", "index-scan", "buffer-pool"],
    },

    {
      id: "deadlock-storm",
      title: "Inventory updates deadlocking during a flash sale",
      severity: "SEV-1",
      system: "ShopKart inventory service · PostgreSQL primary",
      context: "During a flash sale, order confirmations started failing intermittently with 'deadlock detected'. Error rate 3%. The code updates two rows per order: the product's stock and a warehouse aggregate.",
      workload: "Spiky 12k order-confirms/sec; each transaction updates inventory(product_id) and warehouse_totals(wh_id).",
      baseline: "0 deadlocks/day normally; confirm p95 60 ms.",
      symptoms: [
        "`ERROR: deadlock detected` ~40/sec during peaks.",
        "Confirm p95 spiked to 900 ms (lock-wait timeouts then retries).",
        "CPU moderate (60%); no disk pressure.",
      ],
      actions: [
        { id: "deadlock_log", label: "Read the deadlock report in the server log", signal: "smoking-gun",
          reveals: "Process A holds a lock on inventory row 'SKU-9' waiting for warehouse 'WH-2'; Process B holds 'WH-2' waiting for 'SKU-9'. The two transactions **acquire the two locks in opposite orders**." },
        { id: "code_review", label: "Diff the order-confirm transaction code", signal: "relevant",
          reveals: "Two code paths update the same two tables: the 'reserve' path locks inventory then warehouse_totals; the 'fulfil' path locks warehouse_totals then inventory. Opposite ordering." },
        { id: "iso", label: "Check the transaction isolation level", signal: "red-herring",
          reveals: "READ COMMITTED (the default). Raising isolation wouldn't prevent this ordering deadlock — and SERIALIZABLE would just convert it to serialization failures." },
        { id: "mvcc_bloat", label: "Check dead-tuple accumulation", signal: "red-herring",
          reveals: "Dead tuples are elevated from the write burst but autovacuum is keeping up. Not the cause of the deadlocks." },
        { id: "indexes", label: "Check indexes on inventory", signal: "red-herring",
          reveals: "Primary-key lookups are used for both updates; indexing is fine. The waits are on row locks, not on finding rows." },
      ],
      hypotheses: [
        { id: "h1", text: "Two code paths lock the same two rows in opposite orders, forming a cycle.", correct: true },
        { id: "h2", text: "The isolation level is too weak and needs SERIALIZABLE.", correct: false },
        { id: "h3", text: "Dead-tuple bloat is causing lock escalation.", correct: false },
        { id: "h4", text: "A missing index is causing lock scans.", correct: false },
      ],
      rootCause: "Classic lock-ordering deadlock: two transactions acquire the inventory and warehouse_totals locks in opposite orders, so each holds what the other needs. The detector aborts one victim per cycle — safe, but costly under load.",
      remediations: [
        { id: "r1", text: "Make every transaction acquire the two locks in a consistent global order (e.g., always inventory before warehouse_totals).", effect: "fix",
          note: "A consistent lock ordering makes a wait cycle impossible — the textbook deadlock-prevention fix. No cycle, no detector aborts." },
        { id: "r2", text: "Add application-level retries on deadlock and move on.", effect: "partial",
          note: "Deadlock victims should be retried, but retries alone leave the storm — latency and wasted work persist. Correct ordering removes the cause." },
        { id: "r3", text: "Switch to SERIALIZABLE isolation.", effect: "harmful",
          note: "Doesn't fix lock ordering; adds serialization-failure aborts and overhead on top. Wrong tool." },
        { id: "r4", text: "Take a table lock on inventory for each confirm.", effect: "harmful",
          note: "Serializes all confirms — throughput collapses. Trades deadlocks for a global bottleneck." },
      ],
      relatedConcepts: ["locking", "isolation-levels", "mvcc"],
    },

    {
      id: "checkpoint-stall",
      title: "Write latency spikes every few minutes",
      severity: "SEV-2",
      system: "ShopKart events ingest · PostgreSQL primary",
      context: "A high-write events pipeline shows periodic latency spikes: every ~5 minutes, write p99 jumps from 15 ms to 1.5 s for about 20 seconds, then recovers. Perfectly periodic.",
      workload: "25k INSERTs/sec into an append-heavy events table.",
      baseline: "write p99 15 ms, steady.",
      symptoms: [
        "Write p99 spikes to 1.5 s every ~5 minutes, lasting ~20 s.",
        "Disk write throughput shows matching periodic bursts.",
        "The spikes line up exactly with a 5-minute cadence.",
      ],
      actions: [
        { id: "checkpoint_log", label: "Enable log_checkpoints and read the output", signal: "smoking-gun",
          reveals: "`checkpoint starting: time` every 5 minutes; each writes ~1.8 GB of dirty buffers in a burst and syncs — the sync phase lines up exactly with the latency spikes. checkpoint_completion_target is low, so the flush isn't spread out." },
        { id: "bgwriter", label: "Check bgwriter / dirty-buffer stats", signal: "relevant",
          reveals: "buffers_checkpoint vastly exceeds buffers_clean — most dirty pages are being written in the checkpoint burst rather than trickled by the background writer." },
        { id: "wal_rate", label: "Measure WAL generation rate", signal: "relevant",
          reveals: "High but steady WAL volume; checkpoints are triggered by time (every 5 min), not by filling max_wal_size. The burst is the checkpoint flushing accumulated dirty pages." },
        { id: "vacuum", label: "Check autovacuum activity", signal: "red-herring",
          reveals: "Autovacuum runs are small and not aligned with the spikes. Not the cause." },
        { id: "locks", label: "Check for lock waits during spikes", signal: "red-herring",
          reveals: "No lock contention; sessions are waiting on I/O, not locks." },
      ],
      hypotheses: [
        { id: "h1", text: "Checkpoints flush all dirty buffers in a short burst, saturating disk I/O.", correct: true },
        { id: "h2", text: "Autovacuum is periodically rewriting the table.", correct: false },
        { id: "h3", text: "Lock contention spikes every 5 minutes.", correct: false },
        { id: "h4", text: "The WAL is undersized and stalling writes.", correct: false },
      ],
      rootCause: "Time-triggered checkpoints flush a large batch of accumulated dirty buffers and fsync them in a short window. With a low completion target the writes aren't spread over the interval, so disk saturates and foreground writes stall during each checkpoint's sync phase.",
      remediations: [
        { id: "r1", text: "Raise checkpoint_completion_target (≈0.9) to spread the flush across the interval; tune max_wal_size.", effect: "fix",
          note: "Spreading dirty-page writes over most of the checkpoint interval flattens the I/O burst into a gentle trickle — the spikes disappear without losing durability." },
        { id: "r2", text: "Increase checkpoint_timeout so checkpoints happen less often.", effect: "partial",
          note: "Fewer spikes, but each is larger (more accumulated dirt) and recovery time grows. Helps frequency, not the burstiness." },
        { id: "r3", text: "Disable checkpoints to stop the spikes.", effect: "harmful",
          note: "You can't — and wouldn't want to. Without checkpoints, crash recovery must replay unbounded WAL, and durability bookkeeping breaks." },
        { id: "r4", text: "Add more application retries.", effect: "harmful",
          note: "Hides the latency from one layer while the I/O storm continues; doesn't address the flush pattern." },
      ],
      relatedConcepts: ["checkpoints", "wal", "buffer-pool"],
    },

    {
      id: "replica-lag",
      title: "Customers see their orders vanish after placing them",
      severity: "SEV-2",
      system: "ShopKart · primary + 3 read replicas behind a load balancer",
      context: "After checkout, customers are redirected to 'My Orders', which sometimes shows the order missing — then it appears on refresh. Writes go to the primary; 'My Orders' reads are load-balanced across replicas.",
      workload: "Read-heavy; reads fanned out to async streaming replicas.",
      baseline: "replica lag < 100 ms; no complaints.",
      symptoms: [
        "Order confirmed (write succeeded on primary) but missing on the immediate read.",
        "Appears correctly a second later / on refresh.",
        "Replica lag dashboards show 2–8 s lag on two replicas during peak.",
      ],
      actions: [
        { id: "lag", label: "Check replication lag per replica", signal: "smoking-gun",
          reveals: "Two replicas are 2–8 s behind the primary during peak write bursts. The 'read-your-writes' immediately after checkout lands on a lagging replica that hasn't received the new order yet." },
        { id: "routing", label: "Trace where the post-checkout read is routed", signal: "relevant",
          reveals: "The 'My Orders' read right after checkout goes through the same load balancer and can hit any replica — including a lagging one — rather than the primary." },
        { id: "errors", label: "Check for errors / data loss on the primary", signal: "red-herring",
          reveals: "The primary has the order, durably committed. No data loss — it's a visibility/timing issue, not corruption." },
        { id: "index", label: "Check the orders index on the replica", signal: "red-herring",
          reveals: "Indexes are identical to the primary (they're replicated). Not an indexing problem." },
        { id: "cache", label: "Check the app cache TTL", signal: "red-herring",
          reveals: "The read path isn't cached; it queries the database directly. Caching isn't involved." },
      ],
      hypotheses: [
        { id: "h1", text: "Asynchronous replication lag means a just-written order isn't on the replica the read hit (no read-your-writes).", correct: true },
        { id: "h2", text: "Orders are being lost on the primary.", correct: false },
        { id: "h3", text: "A stale application cache is serving old data.", correct: false },
        { id: "h4", text: "A missing index on the replica hides the row.", correct: false },
      ],
      rootCause: "Asynchronous replicas apply the primary's WAL with a delay. A read issued immediately after a write can be routed to a replica that hasn't yet applied that write — violating read-your-writes consistency. The data is safe; it's a consistency/timing problem.",
      remediations: [
        { id: "r1", text: "Route reads that must see a user's own recent write to the primary (or a synchronously-caught-up replica) for a short window after the write.", effect: "fix",
          note: "Read-your-writes: send the post-write read where the write is guaranteed visible. Keeps the replica fan-out for everything else." },
        { id: "r2", text: "Use causal/session consistency: track the write's WAL position and only read from a replica that has applied it.", effect: "fix",
          note: "A more scalable version of the same idea — pin the read to a replica caught up to the client's last write LSN. Keeps load off the primary." },
        { id: "r3", text: "Switch all replicas to synchronous replication.", effect: "partial",
          note: "Eliminates lag-visibility but makes every commit wait for replicas — primary write latency and failure coupling go up. Often too costly cluster-wide." },
        { id: "r4", text: "Add a longer client-side 'please wait' spinner.", effect: "harmful",
          note: "Papers over a correctness issue with UX and still races. Doesn't guarantee the order is visible." },
      ],
      relatedConcepts: ["replication", "eventual-consistency", "cap-theorem"],
    },
  ];
})();
