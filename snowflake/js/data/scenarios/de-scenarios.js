/* Snowflake + Data Engineering Scenarios — seed bank (investigation renderer) */
(function () {
  'use strict';
  const S = [
    {
      id: 'de-airflow-dupes', area: 'de-scenarios', category: 'Airflow → Snowflake', difficulty: 'intermediate',
      title: 'Airflow retry creates duplicate rows',
      symptom: 'An Airflow task loads a daily file into Snowflake. A transient failure triggered Airflow\'s retry, and now the table has duplicates for that day.',
      steps: [
        {
          prompt: 'Why did the retry duplicate data?',
          choices: [
            { text: 'The load step was not idempotent — a plain INSERT/COPY-with-FORCE ran twice', correct: true, why: 'Airflow retries re-run the whole task. If the load appends unconditionally (or FORCEs), the second run re-inserts the same rows.' },
            { text: 'Airflow corrupts data on retry', correct: false, why: 'Airflow just re-executes the task; the non-idempotent load is the cause.' },
            { text: 'Snowflake auto-duplicates on failure', correct: false, why: 'Snowflake does not duplicate; the pipeline design does.' },
          ],
          evidence: 'The task ran COPY with FORCE, or an INSERT ... SELECT with no dedup key.',
          insight: 'Any retrying orchestrator (Airflow, dbt, CI) needs idempotent load steps.',
          wrongAssumption: 'That a retry is safe just because the first run "failed".',
        },
        {
          prompt: 'How do you make the load idempotent?',
          choices: [
            { text: 'MERGE on a natural/business key (or COPY relying on load history)', correct: true, why: 'MERGE converges to the same final state regardless of how many times it runs; load history skips already-loaded files.' },
            { text: 'Add more retries', correct: false, why: 'More retries multiply duplicates, not fix them.' },
            { text: 'Disable retries entirely', correct: false, why: 'Removes resilience; the real fix is idempotency.' },
          ],
          evidence: 'Switching the append to a MERGE keyed on order_id stops duplication on re-run.',
          insight: 'Idempotency is a pipeline property, not something the orchestrator provides for free.',
        },
      ],
      rootCause: 'A non-idempotent load step re-inserted rows when Airflow retried the task.',
      resolution: 'Replace the append with a MERGE on the business key (or rely on COPY load history without FORCE), then dedup the already-affected day.',
      prevention: 'Make every load idempotent by design and add a grain/uniqueness test so retries are always safe.',
      interviewAnswer: 'Airflow retries re-run the whole task, so the duplicates came from a non-idempotent load, not Airflow itself. I would make it idempotent with a MERGE on the business key (or COPY load history without FORCE), clean up the affected day, and add a uniqueness test so retries stay safe.',
    },
    {
      id: 'de-databricks-partial', area: 'de-scenarios', category: 'Databricks → Snowflake', difficulty: 'advanced',
      title: 'Databricks reports success but Snowflake data is incomplete',
      symptom: 'A Spark/Databricks job writes to Snowflake and logs success, but downstream counts show missing rows.',
      steps: [
        {
          prompt: 'What is the most likely cause of "success but incomplete"?',
          choices: [
            { text: 'Non-atomic multi-partition write committed partially before an error, or reads before the write committed', correct: true, why: 'If the write is split across tasks and not wrapped in a single transaction, a partial commit or an early downstream read sees incomplete data.' },
            { text: 'Snowflake silently drops rows', correct: false, why: 'Snowflake commits are atomic per statement; the gap is in the write/commit boundary.' },
            { text: 'Time Travel hid the rows', correct: false, why: 'Time Travel does not remove committed rows.' },
          ],
          evidence: 'The connector wrote in several batches; downstream ran before the final batch committed.',
          insight: 'Cross-system "success" must mean "committed and complete", enforced with transaction boundaries and a completion signal.',
          wrongAssumption: 'That a job\'s success log implies the target is complete and visible.',
        },
        {
          prompt: 'How do you guarantee downstream sees complete data?',
          choices: [
            { text: 'Load to a staging table, then atomically swap/MERGE, and gate downstream on a completion marker', correct: true, why: 'Staging + atomic swap makes the full dataset appear at once; a completion marker/task dependency prevents early reads.' },
            { text: 'Add a fixed sleep downstream', correct: false, why: 'Timing hacks are fragile and still race.' },
            { text: 'Read with NOLOCK equivalent', correct: false, why: 'Not the issue; the issue is atomic completeness.' },
          ],
          evidence: 'Loading to STAGING then swapping into PROD makes the switch atomic.',
          insight: 'Publish-by-swap plus explicit dependencies removes cross-system races.',
        },
      ],
      rootCause: 'A non-atomic multi-batch write plus downstream reading before the write fully committed produced partial visibility.',
      resolution: 'Write to a staging table, atomically swap or MERGE into the target, and gate downstream on a completion marker or task dependency.',
      prevention: 'Define "done" as committed-and-complete across systems: transactional/staged writes plus explicit downstream dependencies.',
      interviewAnswer: 'The job logged success before the target was complete and visible. I would write to a staging table and atomically swap into production, then gate downstream on a completion marker or dependency, so consumers only ever see the full dataset — never trusting a job\'s success log alone.',
    },
    {
      id: 'de-s3-twice', area: 'de-scenarios', category: 'S3 → Snowflake', difficulty: 'intermediate',
      title: 'The same file arrives twice',
      symptom: 'An upstream producer occasionally re-uploads the same file to S3, and Snowpipe ingests it again.',
      steps: [
        {
          prompt: 'Why does Snowpipe re-ingest the re-uploaded file?',
          choices: [
            { text: 'A new object notification fired and load history keys on file name/path — a changed path or re-notify defeats it', correct: true, why: 'Snowpipe dedups by file within its load history; a re-upload under a new key/path (or after history window) is treated as new.' },
            { text: 'Snowpipe ignores load history entirely', correct: false, why: 'It does track loaded files; the issue is the file identity changing.' },
            { text: 'Snowflake randomly reloads', correct: false, why: 'Ingestion is driven by notifications, not randomness.' },
          ],
          evidence: 'The re-upload landed under a slightly different key/path.',
          insight: 'File-name dedup only works when file identity is stable.',
          wrongAssumption: 'That at-least-once file delivery is automatically exactly-once in the table.',
        },
        {
          prompt: 'How do you achieve exactly-once at the row level?',
          choices: [
            { text: 'MERGE/dedup on a business key in the target, treating ingestion as at-least-once', correct: true, why: 'Row-level dedup on a stable key guarantees exactly-once results regardless of file-level duplicates.' },
            { text: 'Tell the producer to never re-upload', correct: false, why: 'You cannot rely on upstream discipline for correctness.' },
            { text: 'Delete duplicate files from S3 after the fact', correct: false, why: 'Reactive and misses already-ingested rows.' },
          ],
        },
      ],
      rootCause: 'File-level dedup failed because file identity changed (or history window passed); at-least-once delivery surfaced as duplicate rows.',
      resolution: 'Dedup at the row level with MERGE on a business key, and standardize stable file paths at the producer.',
      prevention: 'Design for at-least-once delivery: exactly-once is enforced in the table via keyed MERGE, not assumed from the source.',
      interviewAnswer: 'File-name dedup breaks when the same content re-arrives under a new key, so I treat ingestion as at-least-once and enforce exactly-once at the row level with a keyed MERGE. I would also stabilize file paths upstream, but correctness must live in the pipeline, not in upstream discipline.',
    },
    {
      id: 'de-kafka-order', area: 'de-scenarios', category: 'Kafka → Snowflake', difficulty: 'advanced',
      title: 'Events arrive out of order',
      symptom: 'Kafka events land in Snowflake, but updates sometimes apply in the wrong order, leaving stale values in the current-state table.',
      steps: [
        {
          prompt: 'Why do stale values appear?',
          choices: [
            { text: 'Out-of-order/late events overwrite newer state because the merge lacks an event-time guard', correct: true, why: 'Without ordering by event timestamp/version, a later-arriving older event can overwrite a newer one.' },
            { text: 'Snowflake reorders rows on load', correct: false, why: 'Storage order does not change logical correctness; the merge logic does.' },
            { text: 'Streams cannot handle updates', correct: false, why: 'Streams handle updates; the issue is ordering in the apply step.' },
          ],
          evidence: 'The MERGE updates unconditionally on key match, ignoring event_time.',
          insight: 'Streaming correctness needs event-time ordering, not arrival order.',
          wrongAssumption: 'That arrival order equals event order.',
        },
        {
          prompt: 'How do you apply only the latest state?',
          choices: [
            { text: 'Dedup to the latest per key by event_time (QUALIFY ROW_NUMBER) and MERGE with a "only if newer" condition', correct: true, why: 'Selecting the max-event-time row per key and guarding the update ensures newer state always wins.' },
            { text: 'Process events strictly single-threaded', correct: false, why: 'Serializing throughput does not fix late arrivals and kills scalability.' },
            { text: 'Ignore late events', correct: false, why: 'Late events may still be the latest for their window; dropping them loses data.' },
          ],
          evidence: 'MERGE ... WHEN MATCHED AND source.event_time > target.event_time THEN UPDATE.',
          insight: 'Guard updates by event-time/version to make the pipeline order-insensitive.',
        },
      ],
      rootCause: 'The apply step used arrival order and updated unconditionally, so out-of-order/late events overwrote newer state.',
      resolution: 'Deduplicate to the latest row per key by event_time (QUALIFY ROW_NUMBER) and MERGE with an "update only if newer" condition.',
      prevention: 'Always order by event-time/version in CDC/current-state merges; design for late and out-of-order delivery.',
      interviewAnswer: 'Arrival order is not event order, so an unconditional MERGE let older late events overwrite newer state. I would pick the latest row per key by event_time with QUALIFY ROW_NUMBER and guard the MERGE to update only when the incoming event is newer, making the pipeline order-insensitive.',
    },
    {
      id: 'de-bi-degrade', area: 'de-scenarios', category: 'Snowflake → BI', difficulty: 'intermediate',
      title: 'Dashboard performance suddenly degrades',
      symptom: 'A BI dashboard that was snappy now loads slowly for everyone during business hours.',
      steps: [
        {
          prompt: 'Where do you look first?',
          choices: [
            { text: 'Query history: separate queued time (concurrency) from execution time (per-query)', correct: true, why: 'BI slowness is usually concurrency (queuing) or a data-growth pruning regression; the split tells you which.' },
            { text: 'Rebuild all dashboards', correct: false, why: 'Premature; diagnose the cause first.' },
            { text: 'Assume Snowflake is down', correct: false, why: 'Almost never; check evidence.' },
          ],
          evidence: 'High queued time during business hours as more analysts log in.',
          insight: 'BI degradation is often concurrency-driven, not a single slow query.',
          wrongAssumption: 'That a slow dashboard means the queries themselves got slower.',
        },
        {
          prompt: 'Queued time is high during peak. Fix?',
          choices: [
            { text: 'Multi-cluster the BI warehouse (scale out) with a bounded max', correct: true, why: 'Concurrency queuing is solved by scaling out; clusters add at peak and retire after.' },
            { text: 'Scale the BI warehouse up', correct: false, why: 'Makes fast queries faster while they still queue.' },
            { text: 'Ask analysts to stagger logins', correct: false, why: 'Not a real fix.' },
          ],
        },
      ],
      rootCause: 'A business-hours concurrency spike on a single-cluster BI warehouse causes queuing.',
      resolution: 'Convert the BI warehouse to multi-cluster (auto-scale) with a max, and isolate BI from ETL. If instead pruning regressed on a grown table, cluster the hot filter column.',
      prevention: 'Isolate BI on its own multi-cluster warehouse and monitor queued vs execution time.',
      interviewAnswer: 'I split queued from execution time in query history. High queued time at peak is concurrency, so I scale out the BI warehouse with multi-cluster and isolate it from ETL. If instead execution time grew on a bigger table, that is a pruning regression I would fix with clustering.',
    },
    {
      id: 'de-credits-spike', area: 'de-scenarios', category: 'Cost', difficulty: 'advanced',
      title: 'Warehouse credits suddenly increase',
      symptom: 'A pipeline warehouse\'s credit usage doubled week-over-week with no obvious change.',
      steps: [
        {
          prompt: 'How do you attribute the increase?',
          choices: [
            { text: 'Query ACCOUNT_USAGE metering + query history to find which jobs/queries grew', correct: true, why: 'Attribution first: find the specific warehouse, jobs, and queries driving the jump before acting.' },
            { text: 'Immediately downsize the warehouse', correct: false, why: 'Guessing; may break legitimate work without addressing the cause.' },
            { text: 'Turn the warehouse off', correct: false, why: 'Breaks the pipeline; not a diagnosis.' },
          ],
          evidence: 'Metering shows a new backfill job and a query whose bytes-scanned tripled.',
          insight: 'Cost work is measure-then-optimize; attribution beats guessing.',
          wrongAssumption: 'That a cost spike must mean the warehouse is mis-sized.',
        },
        {
          prompt: 'A query\'s bytes-scanned tripled after a table grew. Fix?',
          choices: [
            { text: 'Restore pruning (clustering/sorted load) and fix the query\'s filters/projection', correct: true, why: 'Scan growth from lost pruning is fixed at the data/query level, cutting credits per run.' },
            { text: 'Just run it on a bigger warehouse', correct: false, why: 'Scans the same data faster for more money.' },
            { text: 'Increase auto-suspend', correct: false, why: 'Idle setting; unrelated to per-run scan cost.' },
          ],
        },
      ],
      rootCause: 'A new backfill plus a pruning regression (scan growth as the table grew) drove the credit increase.',
      resolution: 'Bound/schedule the backfill off-peak, restore pruning with clustering/sorted load, and tighten the query filters/projection.',
      prevention: 'Resource monitors with alerts, top-cost query reviews, and pruning monitoring on hot tables.',
      interviewAnswer: 'I attribute first with ACCOUNT_USAGE metering and query history, which here shows a new backfill and a query whose scan tripled as the table grew. I fix the pruning regression with clustering and tighter filters, and schedule/bound the backfill — rather than upsizing, which just pays more to scan the same data.',
    },
    {
      id: 'de-dbt-fullrefresh', area: 'de-scenarios', category: 'dbt → Snowflake', difficulty: 'intermediate',
      title: 'A dbt model quietly does a full refresh nightly',
      symptom: 'A dbt incremental model\'s runtime and cost keep climbing; it seems to reprocess all history each night.',
      steps: [
        {
          prompt: 'Why would an "incremental" model reprocess everything?',
          choices: [
            { text: 'The incremental predicate/is_incremental logic is wrong, so it rebuilds full each run', correct: true, why: 'If the incremental filter never restricts to new rows (or a full-refresh flag is set), dbt rebuilds the whole table.' },
            { text: 'Snowflake ignores dbt incremental models', correct: false, why: 'Snowflake runs whatever SQL dbt generates; the model logic is the issue.' },
            { text: 'Incremental models always full-refresh', correct: false, why: 'They do not — only when configured/filtered incorrectly.' },
          ],
          evidence: 'The model lacks a working is_incremental() filter on an updated-at watermark.',
          insight: 'Incremental correctness depends on a valid watermark/predicate, not the label.',
          wrongAssumption: 'That marking a model "incremental" makes it incremental.',
        },
        {
          prompt: 'How do you make it truly incremental?',
          choices: [
            { text: 'Filter new/changed rows by a reliable watermark and MERGE on the unique key', correct: true, why: 'Process only rows past the last watermark and upsert by key — cost tracks change volume.' },
            { text: 'Run it less often', correct: false, why: 'Reduces frequency, not per-run waste.' },
            { text: 'Move it to a bigger warehouse', correct: false, why: 'Full-rebuilds it faster; still reprocesses everything.' },
          ],
        },
      ],
      rootCause: 'A broken incremental predicate caused the model to full-rebuild every run.',
      resolution: 'Add a correct is_incremental() watermark filter and a unique_key so dbt MERGEs only new/changed rows.',
      prevention: 'Test incremental models process a bounded row count; alert on runtime growth.',
      interviewAnswer: 'The model was incremental in name only — its predicate did not restrict to new rows, so it full-rebuilt nightly. I would add a reliable watermark filter and a unique key so it MERGEs only changed rows, making cost proportional to change rather than history.',
    },
    {
      id: 'de-late-data', area: 'de-scenarios', category: 'Pipelines', difficulty: 'advanced',
      title: 'Late-arriving data corrupts daily aggregates',
      symptom: 'Yesterday\'s "final" daily revenue changes after late events arrive, but the published aggregate table is already wrong.',
      steps: [
        {
          prompt: 'Why are the aggregates wrong?',
          choices: [
            { text: 'The pipeline treats a day as closed too early, ignoring a late-arrival window', correct: true, why: 'Aggregating and freezing a day before its late-arrival window closes misses events that belong to it.' },
            { text: 'Snowflake miscomputes SUM()', correct: false, why: 'The aggregation is correct for the data it saw; the window policy is wrong.' },
            { text: 'Time Travel altered the totals', correct: false, why: 'Time Travel does not change live aggregates.' },
          ],
          evidence: 'Events with yesterday\'s event_time arrived after the daily job ran.',
          insight: 'Event-time pipelines need a late-arrival/reprocessing window, not just processing-time cutoffs.',
          wrongAssumption: 'That all of a day\'s data has arrived by the time the day ends in processing time.',
        },
        {
          prompt: 'How do you make aggregates correct with late data?',
          choices: [
            { text: 'Reprocess an open window (e.g. last N days) idempotently via MERGE keyed on the day', correct: true, why: 'Recomputing recent days and upserting keeps published aggregates converging to correct as late data lands.' },
            { text: 'Never publish until "all" data is in', correct: false, why: 'You can never prove completeness; this stalls forever.' },
            { text: 'Manually patch numbers when someone complains', correct: false, why: 'Reactive and error-prone.' },
          ],
        },
      ],
      rootCause: 'The pipeline froze daily aggregates using a processing-time cutoff, ignoring late-arriving event-time data.',
      resolution: 'Keep a rolling reprocessing window (e.g. last 3–7 days), recompute those days from source, and MERGE the results so published totals self-correct.',
      prevention: 'Design event-time pipelines with an explicit late-arrival window and idempotent reprocessing.',
      interviewAnswer: 'The day was closed on processing time before its late-arrival window ended. I would keep a rolling reprocessing window over the last several days, recompute those days from source, and idempotently MERGE the results by day so published aggregates converge to correct as late events land.',
    },
    {
      id: 'de-schema-drift', area: 'de-scenarios', category: 'Ingestion', difficulty: 'intermediate',
      title: 'Upstream adds a column and the load breaks',
      symptom: 'The source system added a field; the COPY/transform now errors or silently drops the new data.',
      steps: [
        {
          prompt: 'How should RAW absorb schema drift?',
          choices: [
            { text: 'Land into VARIANT (or use schema-evolution-friendly loading) so new fields are captured', correct: true, why: 'A flexible RAW captures unexpected fields without breaking, deferring typing to a controlled step.' },
            { text: 'Hard-code the column list and fail on drift', correct: false, why: 'Brittle; every source change breaks ingestion.' },
            { text: 'Drop unrecognized fields at load', correct: false, why: 'Silent data loss of the new field.' },
          ],
          evidence: 'The new field appears in RAW\'s VARIANT payload immediately.',
          insight: 'Absorb drift in RAW; evolve typed columns deliberately in STAGING.',
          wrongAssumption: 'That upstream schemas are stable.',
        },
        {
          prompt: 'How do you promote the new field safely?',
          choices: [
            { text: 'Add a typed column in STAGING and backfill from the VARIANT path', correct: true, why: 'Controlled promotion gives typed performance/pruning while preserving history in RAW.' },
            { text: 'Rebuild every downstream table by hand', correct: false, why: 'Unnecessary and risky; promote incrementally.' },
            { text: 'Ignore the field until someone asks', correct: false, why: 'Delays value and risks gaps when it is finally needed.' },
          ],
        },
      ],
      rootCause: 'A rigid load contract could not tolerate an added upstream column.',
      resolution: 'Land into a flexible RAW (VARIANT / schema-evolution loading), then add and backfill a typed STAGING column for the new field.',
      prevention: 'Adopt a RAW-absorbs-drift, STAGING-types-deliberately pattern and alert on unexpected new fields.',
      interviewAnswer: 'Upstream schemas drift, so a rigid load will always break. I land into a flexible RAW that captures new fields in VARIANT, then promote a typed column in STAGING and backfill it — getting typed performance without losing data or breaking ingestion when the source changes.',
    },
    {
      id: 'de-cdc-deletes', area: 'de-scenarios', category: 'CDC', difficulty: 'advanced',
      title: 'CDC pipeline never reflects deletes',
      symptom: 'A change-data-capture pipeline from an OLTP source keeps rows in Snowflake that were deleted upstream.',
      steps: [
        {
          prompt: 'Why are deletes missing?',
          choices: [
            { text: 'The MERGE handles inserts/updates but has no WHEN MATCHED ... DELETE (or soft-delete) branch', correct: true, why: 'CDC deletes must be explicitly applied; an upsert-only MERGE never removes rows.' },
            { text: 'Snowflake cannot delete rows', correct: false, why: 'Snowflake supports DELETE/MERGE deletes; the logic omits them.' },
            { text: 'Streams drop delete records', correct: false, why: 'Standard streams capture deletes; the apply step ignores them.' },
          ],
          evidence: 'The CDC feed includes delete markers the MERGE ignores.',
          insight: 'CDC apply must map all operations: insert, update, and delete.',
          wrongAssumption: 'That an upsert alone fully synchronizes state.',
        },
        {
          prompt: 'How do you correctly apply deletes?',
          choices: [
            { text: 'Handle delete markers in the MERGE (hard delete or soft-delete flag) keyed on the business key', correct: true, why: 'Mapping delete operations keeps Snowflake in sync; soft deletes preserve audit history if required.' },
            { text: 'Periodically truncate and full-reload', correct: false, why: 'Expensive and loses incremental benefits.' },
            { text: 'Manually delete rows when noticed', correct: false, why: 'Not scalable or reliable.' },
          ],
        },
      ],
      rootCause: 'The CDC apply step was upsert-only and never processed delete operations from the change feed.',
      resolution: 'Extend the MERGE to handle delete markers (hard delete, or a soft-delete flag with effective dates) keyed on the business key.',
      prevention: 'Map every CDC operation type in the apply logic and test that upstream deletes propagate.',
      interviewAnswer: 'The apply logic upserted but never handled delete markers, so deletes never propagated. I would extend the MERGE to process delete operations — hard delete, or a soft-delete flag if we need history — keyed on the business key, and add a test that upstream deletes reflect downstream.',
    },
  ];
  window.SnowflakeViz.ScenarioEngine.register('de-scenarios', S);
})();
