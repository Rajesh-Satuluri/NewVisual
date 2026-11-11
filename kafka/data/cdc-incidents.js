// CDC / Debezium production incident library — drives the CDC Incident Lab
// (#cdc-incidents) via the shared investigation-flow component. Same shape as
// data/incidents.js:
//   { id, difficulty, icon, title, symptom,
//     steps: [ { prompt, checks: [
//        { label, correct:true,  evidence, reasoning } |
//        { label, correct:false, why } ] } ],
//     rootCause, resolution, prevention, interviewAnswer }
// Trusted in-repo HTML. These mirror the failure modes taught in m23–m31.

export const CDC_INCIDENTS = [
  {
    id: 'cdc-slot-wal-growth',
    difficulty: 'medium',
    icon: '🪵',
    title: 'Postgres disk is filling and WAL won\'t recycle',
    symptom: `PagerDuty fires: the primary Postgres is at <b>88% disk and climbing</b>. <code>pg_wal</code> has ballooned overnight even though write volume is normal. The database is otherwise healthy and serving queries.`,
    steps: [
      {
        prompt: `Disk is filling from WAL. What do you check first?`,
        checks: [
          {
            label: `Query pg_replication_slots for the slot's restart_lsn and retained bytes`,
            correct: true,
            evidence: `The <code>debezium</code> slot shows <code>active = false</code> and a <code>restart_lsn</code> hours behind the current WAL position — gigabytes of WAL are pinned by that one slot.`,
            reasoning: `Postgres cannot recycle WAL that any replication slot still needs. An inactive or lagging slot is the number-one cause of unbounded WAL growth, so the slot is the first thing to inspect — before touching disk or config.`,
          },
          {
            label: `Immediately run a CHECKPOINT and delete old files from pg_wal by hand`,
            correct: false,
            why: `Never delete from <code>pg_wal</code> manually — you can corrupt the database. A checkpoint won't free WAL that a slot still pins. You'd be treating a symptom and risking the primary.`,
          },
          {
            label: `Increase the disk and move on`,
            correct: false,
            why: `Growing the disk buys hours at best; if the slot stays stuck the new space fills too. Find why the slot isn't advancing first.`,
          },
        ],
      },
      {
        prompt: `A stuck slot is pinning WAL. Why is the slot not advancing?`,
        checks: [
          {
            label: `Check the Debezium connector status and its source-task logs`,
            correct: true,
            evidence: `The connector is in <b>FAILED</b> state — the task died hours ago on a downstream Kafka produce error and never restarted, so it stopped confirming the slot.`,
            reasoning: `The slot only advances when Debezium confirms a flushed LSN. If the connector is down, nothing confirms, the slot's <code>confirmed_flush_lsn</code> freezes, and retained WAL grows. The connector's health is the root, not Postgres.`,
          },
          {
            label: `Drop the replication slot to free the WAL`,
            correct: false,
            why: `Dropping the slot frees WAL but discards the connector's position — on restart it can't resume and needs a fresh snapshot (and you may miss changes). It's a last resort, not a diagnosis.`,
          },
        ],
      },
    ],
    rootCause: `A failed Debezium connector stopped confirming its replication slot. Postgres must retain all WAL newer than the slot's <code>confirmed_flush_lsn</code>, so a dead consumer silently pins WAL and fills the source disk.`,
    resolution: `Restart/repair the connector so it resumes and confirms the slot — retained WAL then recycles and disk drops. Fix the underlying produce error (e.g. the Kafka issue that killed the task). If the slot must be removed to save the primary, drop it and plan for a re-snapshot.`,
    prevention: `Alert on <code>slot lag bytes</code> as the #1 CDC metric and on connector state != RUNNING. Set <code>max_slot_wal_keep_size</code> so a dead slot can't take the primary down (accepting that the slot may then need a re-snapshot). Enable Debezium <strong>heartbeats</strong> so slots on low-traffic databases keep advancing.`,
    interviewAnswer: `WAL filling the disk almost always means a replication slot isn't advancing. I'd check <code>pg_replication_slots</code>, see the slot's restart_lsn stuck and inactive, then find the Debezium connector FAILED and no longer confirming it. Fix is to recover the connector so it resumes and the WAL recycles; prevention is alerting on slot-lag-bytes and connector state, bounding WAL with max_slot_wal_keep_size, and running heartbeats for quiet tables.`,
  },
  {
    id: 'cdc-stuck-after-outage',
    difficulty: 'hard',
    icon: '⛔',
    title: 'After a long outage, the connector won\'t resume streaming',
    symptom: `A connector was paused for two days during a migration. On restart it goes RUNNING but <b>no change events flow</b>, and the task log repeats a "requested WAL has already been removed" style error.`,
    steps: [
      {
        prompt: `It's RUNNING but emits nothing. What do you check?`,
        checks: [
          {
            label: `Check whether the WAL at the slot's restart_lsn still exists on the primary`,
            correct: true,
            evidence: `The slot is marked <b>invalidated</b> — the WAL it needed was recycled during the outage (it passed <code>max_slot_wal_keep_size</code>). The position the connector wants to resume from no longer exists.`,
            reasoning: `Streaming can only resume if the WAL from the confirmed position forward is still present. If it was recycled, there is nothing to read from that LSN — the connector is stuck even though it's "running."`,
          },
          {
            label: `Bump the connector's max.poll.interval and restart again`,
            correct: false,
            why: `This is a consumer/poll tuning knob — irrelevant when the problem is missing source WAL. Restarting repeatedly won't recreate WAL that Postgres already recycled.`,
          },
          {
            label: `Add partitions to the CDC topic`,
            correct: false,
            why: `Topic topology has nothing to do with a source that can't resume decoding. And repartitioning a keyed CDC topic breaks per-key ordering.`,
          },
        ],
      },
      {
        prompt: `The required WAL is gone. How do you recover without losing data?`,
        checks: [
          {
            label: `Trigger a new snapshot so the connector rebuilds its position from current table state`,
            correct: true,
            evidence: `After a fresh snapshot, Debezium re-reads current rows as READ (op:"r") events, re-establishes a valid slot position, and streaming resumes from there.`,
            reasoning: `A snapshot captures the current state of every captured row and gives the connector a new, valid starting LSN. It's the designed recovery when the WAL for incremental resume is gone. An incremental snapshot can do this without a full stop if supported.`,
          },
          {
            label: `Rewind the Kafka consumer offsets to earliest and replay`,
            correct: false,
            why: `The gap is on the <b>source</b> side (missing Postgres WAL), not in Kafka. Replaying Kafka only re-reads events that were already produced; it can't recover changes that never got decoded during the outage.`,
          },
        ],
      },
    ],
    rootCause: `During the long pause, Postgres recycled WAL past the slot's needed position (slot invalidated), so there's no WAL to resume incremental streaming from. "RUNNING" only means the task started, not that it can read.`,
    resolution: `Run a new (or incremental) snapshot so the connector rebuilds current state and a valid slot position, then streaming continues. Downstream MERGE-by-key is idempotent, so the re-read rows reconcile without duplicates.`,
    prevention: `Avoid very long pauses; if a slot must sit idle, size <code>max_slot_wal_keep_size</code>/retention to cover the window, and monitor slot validity. Prefer incremental snapshots for low-impact recovery. Design the sink to be idempotent so a re-snapshot is safe.`,
    interviewAnswer: `"Running but emitting nothing" after a long outage is the classic invalidated-slot case: the WAL it needed was recycled, so there's no position to resume from. You can't fix that with restarts or Kafka offset rewinds because the gap is on the source. The recovery is a fresh (ideally incremental) snapshot to rebuild state and a valid LSN; it's safe because the sink MERGE is idempotent. Prevent it by bounding slot WAL retention and monitoring slot validity.`,
  },
  {
    id: 'cdc-missing-deletes',
    difficulty: 'medium',
    icon: '👻',
    title: 'Deleted rows never disappear from the downstream table',
    symptom: `Finance reports that cancelled orders still show as active in the warehouse. Inserts and updates replicate fine, but <b>deletes don't take effect</b> downstream — the current-state table keeps "ghost" rows.`,
    steps: [
      {
        prompt: `Deletes aren't landing. What do you check first?`,
        checks: [
          {
            label: `Confirm delete change events are actually being produced to the topic`,
            correct: true,
            evidence: `Delete events <em>are</em> on the topic: each shows <code>op:"d"</code> with a populated <code>before</code> and <code>after:null</code>, followed by a <b>tombstone</b> (null-value) record. So Debezium is emitting deletes correctly.`,
            reasoning: `Split the problem: is the delete missing at the source side (not produced) or the sink side (not applied)? Inspecting the topic answers that in one step. Here deletes are present, so the bug is downstream.`,
          },
          {
            label: `Assume REPLICA IDENTITY is wrong and set it to FULL everywhere`,
            correct: false,
            why: `REPLICA IDENTITY affects the <em>before</em>-image, not whether a delete is emitted. Deletes still produce with DEFAULT (PK only). Changing it blindly adds WAL overhead and doesn't address a sink that ignores deletes.`,
          },
        ],
      },
      {
        prompt: `Deletes are on the topic but not applied. Why?`,
        checks: [
          {
            label: `Inspect how the sink consumer handles op:"d" / tombstone records`,
            correct: true,
            evidence: `The sink job only handles <code>c</code>/<code>u</code> (upserts) and <b>drops</b> <code>op:"d"</code> and tombstones instead of issuing a DELETE/equality-delete in its MERGE. So rows are never removed.`,
            reasoning: `A correct current-state materialization must apply deletes as removals (a <code>WHEN MATCHED ... DELETE</code> in MERGE, or Iceberg equality deletes). Ignoring deletes turns the sink into insert/update-only and leaves ghosts.`,
          },
          {
            label: `Enable log compaction on the topic to clean them up`,
            correct: false,
            why: `Compaction with tombstones garbage-collects keys in the <em>Kafka topic</em>; it does not delete rows in your downstream warehouse table. The fix is in the sink's write logic.`,
          },
        ],
      },
    ],
    rootCause: `The sink's materialization logic handles inserts and updates but silently drops delete (op:"d") and tombstone records, so it never removes rows — the downstream "current state" is actually insert/update-only.`,
    resolution: `Fix the MERGE to apply deletes (<code>WHEN MATCHED AND op='d' THEN DELETE</code>, or Iceberg equality deletes keyed on the id columns), handle tombstones, then backfill by re-materializing or reconciling against the source to purge existing ghosts.`,
    prevention: `Include delete cases in pipeline tests. Run periodic <strong>reconciliation</strong> (source vs sink counts/checksums) so missing deletes surface as drift. Decide tombstone handling deliberately and document the delete contract.`,
    interviewAnswer: `Ghost rows mean deletes aren't being applied. I'd first confirm the topic actually carries op:"d" plus tombstones — it did — which points the finger downstream. The sink was only doing upserts and dropping deletes, so I'd fix the MERGE to issue deletes (or equality deletes in Iceberg), then reconcile to purge existing ghosts. Prevention is testing deletes explicitly and running source-vs-sink reconciliation to catch drift.`,
  },
  {
    id: 'cdc-duplicate-stale',
    difficulty: 'hard',
    icon: '🔀',
    title: 'Downstream totals are wrong — values double-count or revert',
    symptom: `A daily revenue metric is <b>off and flickering</b>: some orders appear counted twice, and a few rows occasionally revert to an older status before correcting. The source data is correct.`,
    steps: [
      {
        prompt: `Values double-count and revert. Where do you look first?`,
        checks: [
          {
            label: `Examine whether the sink is idempotent and how it orders events per key`,
            correct: true,
            evidence: `The sink <b>appends</b> each event and takes "last write by arrival" per key. Kafka is at-least-once, so redelivered events get counted again, and events that arrive out of order overwrite newer values with older ones.`,
            reasoning: `Double-counting + reverting values is the signature of a non-idempotent, arrival-ordered sink. The fix lives in how the sink resolves conflicts, so that's the first thing to inspect.`,
          },
          {
            label: `Blame Kafka and switch the topic to exactly-once delivery`,
            correct: false,
            why: `Even with EOS between stages, a correct sink must still be idempotent and order by sequence — reprocessing and out-of-order across a MERGE are facts of life. Chasing broker config misses the real bug in the sink.`,
          },
          {
            label: `Reduce producer retries to avoid duplicates`,
            correct: false,
            why: `Lowering retries risks data loss and still can't guarantee no duplicates (at-least-once is the model). The durable fix is an idempotent, ordered materialization, not fewer retries.`,
          },
        ],
      },
      {
        prompt: `How do you make the current-state table correct regardless of delivery?`,
        checks: [
          {
            label: `MERGE by primary key and resolve conflicts by LSN/sequence, keeping the latest`,
            correct: true,
            evidence: `Switching to upsert-by-key with "keep the row whose <code>source.lsn</code> is highest" makes duplicates no-ops and makes stale events lose to newer ones. Totals stabilize.`,
            reasoning: `Idempotent upsert absorbs redelivery (same key → same row), and ordering by LSN rather than arrival time makes out-of-order events harmless. Dedupe within each micro-batch (one source row per key) so MERGE has a single winner.`,
          },
          {
            label: `Add a DISTINCT at query time to hide the duplicates`,
            correct: false,
            why: `DISTINCT papers over double-counts but can't fix reverted values and breaks on aggregates. Correctness belongs in the materialization, not in every downstream query.`,
          },
        ],
      },
    ],
    rootCause: `The sink is non-idempotent and orders by arrival: at-least-once redelivery double-counts, and out-of-order delivery lets older events overwrite newer state. Kafka's delivery model guarantees both will happen eventually.`,
    resolution: `Rewrite the sink as an upsert/MERGE by primary key that resolves conflicts by LSN/sequence (highest wins) and de-duplicates within each micro-batch; apply deletes too. Re-materialize the affected tables to correct historical totals.`,
    prevention: `Design every CDC sink to be idempotent and sequence-ordered from day one. Test with injected duplicates and reordered events. Reconcile source vs sink regularly so double-counts/reverts show up as drift immediately.`,
    interviewAnswer: `Double-counting plus reverting values is a non-idempotent, arrival-ordered sink colliding with Kafka's at-least-once and out-of-order reality. The fix isn't broker config — it's making the sink an upsert-by-key that keeps the highest LSN and dedupes per micro-batch, so duplicates are no-ops and stale events lose. Then re-materialize to fix the totals. I'd prevent it by testing with duplicate/reordered events and running source-vs-sink reconciliation.`,
  },
];
