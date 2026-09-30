/* Data Loading Decision Lab — seed bank (design renderer, progressive constraints) */
(function () {
  'use strict';
  const S = [
    {
      id: 'ld-daily-csv', area: 'loading-lab', category: 'Batch', difficulty: 'intermediate',
      tag: '📥 Requirement',
      title: '10,000 CSVs/day, evolving into harder constraints',
      requirements: '10,000 CSV files arrive daily in cloud storage. Design ingestion — then adapt as constraints tighten.',
      steps: [
        {
          prompt: 'Base case: which ingestion mechanism?',
          choices: [
            { text: 'Snowpipe auto-ingest (continuous, serverless)', correct: true, why: 'Continuous file arrival is Snowpipe\'s sweet spot: serverless, near-real-time, load history for idempotency.' },
            { text: 'Snowpipe Streaming', correct: false, why: 'Streaming is for row sources, not files.' },
            { text: 'Manual COPY once a day', correct: false, why: 'Brittle at 10k files/day and adds latency.' },
          ],
          insight: 'Files → Snowpipe/COPY; rows/Kafka → Snowpipe Streaming.',
        },
        {
          prompt: 'New constraint: files may arrive late. How do you cope?',
          choices: [
            { text: 'Event-driven ingestion handles late files as they land; make downstream reprocess a rolling window', correct: true, why: 'Snowpipe loads whenever a file lands; downstream aggregates reprocess a recent window so late files still count.' },
            { text: 'Refuse files after the daily cutoff', correct: false, why: 'Drops legitimate late data.' },
            { text: 'Wait until "all" files arrive before loading', correct: false, why: 'You can never prove completeness.' },
          ],
        },
        {
          prompt: 'New constraint: the same file may arrive twice. Now what?',
          choices: [
            { text: 'MERGE/dedup on a business key downstream (at-least-once ingestion, exactly-once results)', correct: true, why: 'Row-level dedup guarantees exactly-once regardless of duplicate files.' },
            { text: 'COPY with FORCE=TRUE', correct: false, why: 'FORCE re-ingests and creates duplicates.' },
            { text: 'Trust the producer not to duplicate', correct: false, why: 'Correctness cannot rely on upstream discipline.' },
          ],
        },
        {
          prompt: 'New constraint: the source changes schema. How do you absorb it?',
          choices: [
            { text: 'Land into flexible RAW (VARIANT/schema-evolution), promote typed columns in STAGING', correct: true, why: 'Flexible RAW absorbs new fields; controlled promotion keeps typing/pruning where needed.' },
            { text: 'Hard-fail on any schema change', correct: false, why: 'Too brittle for evolving sources.' },
            { text: 'Silently drop new columns', correct: false, why: 'Loses data.' },
          ],
        },
      ],
      architecture: 'Storage → Snowpipe → flexible RAW → STAGING (typed + MERGE dedup on business key) → ANALYTICS with rolling-window reprocessing for late data.',
      tradeoffs: 'Flexible RAW + MERGE add transform cost but deliver idempotent, late-tolerant, evolution-safe loading.',
      failureModes: 'Tiny-file backlog in Snowpipe; duplicate/late/malformed files — quarantine bad records.',
      cost: 'Serverless per-file cost; target reasonable file sizes; incremental transforms keep compute proportional.',
      interviewAnswer: 'I start with Snowpipe auto-ingest for continuous files, handle late arrivals with event-driven loading plus rolling-window reprocessing, enforce exactly-once with a keyed MERGE treating ingestion as at-least-once, and absorb schema drift by landing in a flexible RAW and promoting typed columns in STAGING.',
    },
    {
      id: 'ld-realtime', area: 'loading-lab', category: 'Streaming', difficulty: 'advanced',
      tag: '📥 Requirement',
      title: 'Sub-second latency from an application',
      requirements: 'An application must land events in Snowflake with sub-second latency for near-real-time analytics.',
      steps: [
        {
          prompt: 'Which ingestion path?',
          choices: [
            { text: 'Snowpipe Streaming (row-level, no files)', correct: true, why: 'Streaming writes rows directly into tables with sub-second latency — no file staging overhead.' },
            { text: 'Snowpipe auto-ingest on micro-batched files', correct: false, why: 'Per-file overhead makes true sub-second latency hard.' },
            { text: 'Scheduled COPY every minute', correct: false, why: 'Minute-level batch, not sub-second.' },
          ],
          insight: 'Sub-second, row-level needs → Snowpipe Streaming; file-based → Snowpipe.',
        },
        {
          prompt: 'How do you transform the streamed rows for analytics?',
          choices: [
            { text: 'Dynamic Tables with short target lag on the streaming RAW', correct: true, why: 'Declarative incremental refresh keeps the analytics layer close to real time.' },
            { text: 'Full rebuilds every minute', correct: false, why: 'Too expensive and slow for real time.' },
            { text: 'Transform in the app before load', correct: false, why: 'Couples app to warehouse modeling; less flexible.' },
          ],
        },
      ],
      architecture: 'App → Snowpipe Streaming → RAW → Dynamic Tables (short lag) → analytics/BI.',
      tradeoffs: 'Continuous refresh compute for low latency; watch DT incremental eligibility.',
      failureModes: 'Backpressure and DT full-refresh fallback; monitor lag and refresh_mode.',
      cost: 'Streaming + continuous DT refresh cost; right-size and keep DTs incremental.',
      interviewAnswer: 'For sub-second latency from an app I use Snowpipe Streaming to write rows directly, then chain Dynamic Tables with a short target lag to keep analytics near real time — avoiding file-based ingestion\'s per-file latency and full rebuilds.',
    },
    {
      id: 'ld-backfill', area: 'loading-lab', category: 'Batch', difficulty: 'intermediate',
      tag: '📥 Requirement',
      title: 'One-time historical backfill of terabytes',
      requirements: 'Load years of historical files once, quickly, without standing up streaming.',
      steps: [
        {
          prompt: 'Best mechanism for a big one-time load?',
          choices: [
            { text: 'Bulk COPY INTO on an appropriately sized warehouse', correct: true, why: 'COPY parallelizes bulk file loads efficiently; size the warehouse for the one-time job, then downsize.' },
            { text: 'Snowpipe file-by-file', correct: false, why: 'Per-file serverless overhead is worse than bulk COPY for a massive one-time load.' },
            { text: 'Snowpipe Streaming', correct: false, why: 'Row streaming is wrong for bulk historical files.' },
          ],
          insight: 'Bulk one-time file loads → COPY; continuous arrivals → Snowpipe.',
        },
        {
          prompt: 'How do you keep the backfill efficient?',
          choices: [
            { text: 'Right-size the warehouse up for the job, use well-sized files, then scale down', correct: true, why: 'Larger compute + good file sizes maximize parallel throughput for the burst, then release it.' },
            { text: 'Load thousands of tiny files on an XS', correct: false, why: 'Tiny files + small compute throttle throughput.' },
            { text: 'Run on the BI warehouse', correct: false, why: 'Contends with interactive users.' },
          ],
        },
      ],
      architecture: 'Historical files → bulk COPY on a temporarily larger, isolated warehouse → RAW; downsize/suspend after; then hand off to Snowpipe for ongoing arrivals.',
      tradeoffs: 'Temporary larger warehouse costs more briefly but finishes far faster.',
      failureModes: 'Tiny files and undersized compute throttling throughput; consolidate files.',
      cost: 'Short burst of larger compute; release immediately after.',
      interviewAnswer: 'For a big one-time backfill I use bulk COPY on a temporarily larger, isolated warehouse with well-sized files to maximize parallel throughput, then scale down and hand ongoing arrivals to Snowpipe — bulk COPY beats file-by-file Snowpipe for massive historical loads.',
    },
    {
      id: 'ld-semi', area: 'loading-lab', category: 'Semi-structured', difficulty: 'intermediate',
      tag: '📥 Requirement',
      title: 'Nested JSON with a few hot fields',
      requirements: 'Ingest nested JSON events; most fields are rarely queried but a handful are filtered constantly.',
      steps: [
        {
          prompt: 'How do you store it?',
          choices: [
            { text: 'Load into VARIANT, promote hot fields to typed columns', correct: true, why: 'Hybrid model: VARIANT keeps flexibility, typed hot fields get pruning/performance.' },
            { text: 'Flatten everything into typed columns up front', correct: false, why: 'Rigid; new fields break the schema.' },
            { text: 'Store as raw text', correct: false, why: 'Loses semi-structured querying entirely.' },
          ],
          insight: 'Promote the hot, stable fields; leave the long tail in VARIANT.',
        },
        {
          prompt: 'How do you query nested arrays?',
          choices: [
            { text: 'LATERAL FLATTEN to explode arrays into rows', correct: true, why: 'FLATTEN is the idiomatic way to unnest arrays for querying.' },
            { text: 'String-parse the JSON manually', correct: false, why: 'Error-prone and slow.' },
            { text: 'Export and process externally', correct: false, why: 'Unnecessary data movement.' },
          ],
        },
      ],
      architecture: 'JSON → RAW VARIANT; typed columns for hot filter fields (clustered if large); LATERAL FLATTEN for array access in transforms.',
      tradeoffs: 'Promoting fields adds modeling effort but big pruning/perf wins on hot filters.',
      failureModes: 'Filtering only on VARIANT paths defeats pruning; promote those fields.',
      cost: 'Typed hot columns improve scan efficiency and reduce credits.',
      interviewAnswer: 'I load nested JSON into VARIANT for flexibility, promote the handful of constantly filtered fields to typed columns (clustered if large) for pruning, and use LATERAL FLATTEN to unnest arrays — a hybrid that balances flexibility and performance.',
    },
    {
      id: 'ld-errors', area: 'loading-lab', category: 'Reliability', difficulty: 'intermediate',
      tag: '📥 Requirement',
      title: 'Malformed rows must not fail the whole load',
      requirements: 'Some incoming files contain a few malformed rows; one bad row should not abort ingestion, and bad rows must be triaged.',
      steps: [
        {
          prompt: 'How do you handle bad rows during load?',
          choices: [
            { text: 'ON_ERROR = CONTINUE (or SKIP_FILE thresholds) + capture rejects', correct: true, why: 'Error-handling options let good rows load while bad ones are skipped and recorded for triage.' },
            { text: 'ON_ERROR = ABORT_STATEMENT always', correct: false, why: 'One bad row aborts the whole load — too fragile for messy sources.' },
            { text: 'Pre-clean every file by hand', correct: false, why: 'Not scalable.' },
          ],
          insight: 'Match ON_ERROR to data-quality reality; always capture rejects.',
        },
        {
          prompt: 'Where do rejected rows go?',
          choices: [
            { text: 'A quarantine/rejects table for monitoring and reprocessing', correct: true, why: 'Quarantining rejects makes data-quality visible and lets you fix and reload.' },
            { text: 'Discard them silently', correct: false, why: 'Silent data loss.' },
            { text: 'Log to a file no one reads', correct: false, why: 'Not actionable.' },
          ],
        },
      ],
      architecture: 'COPY/Snowpipe with ON_ERROR = CONTINUE and validation → good rows to RAW, rejects to a quarantine table with reason → monitor + reprocess.',
      tradeoffs: 'Continuing on error accepts partial loads; the quarantine table makes it safe and visible.',
      failureModes: 'Silent reject growth; alert on quarantine volume.',
      cost: 'Negligible; validation at load time.',
      interviewAnswer: 'I set ON_ERROR to continue (with sensible thresholds) so a few malformed rows don\'t abort the load, and route rejects to a quarantine table with a reason for monitoring and reprocessing — messy sources need visible, reloadable error handling, not all-or-nothing loads.',
    },
    {
      id: 'ld-transform-place', area: 'loading-lab', category: 'ELT vs ETL', difficulty: 'intermediate',
      tag: '📥 Requirement',
      title: 'Transform before or after loading?',
      requirements: 'Decide whether to transform data before loading (ETL) or load raw then transform in Snowflake (ELT).',
      steps: [
        {
          prompt: 'What is the Snowflake-native pattern?',
          choices: [
            { text: 'ELT: load raw into Snowflake, transform with SQL/Dynamic Tables using its compute', correct: true, why: 'Snowflake\'s elastic compute makes in-warehouse transformation cheap and scalable; keep RAW for reprocessing.' },
            { text: 'ETL: transform in an external engine first', correct: false, why: 'Adds an external system and loses the RAW safety net; only needed for specialized pre-processing.' },
            { text: 'Transform in the BI tool', correct: false, why: 'Recomputes per dashboard; not a pipeline.' },
          ],
          insight: 'ELT keeps immutable RAW so you can always reprocess when logic changes.',
        },
        {
          prompt: 'Why keep an immutable RAW layer?',
          choices: [
            { text: 'To reprocess history when transform logic changes, without re-ingesting', correct: true, why: 'RAW is the source of truth; new logic re-derives downstream layers from it.' },
            { text: 'To save storage', correct: false, why: 'RAW adds storage; the value is reprocessability.' },
            { text: 'No reason; drop RAW after load', correct: false, why: 'Then a logic change forces full re-ingestion.' },
          ],
        },
      ],
      architecture: 'Load raw (ELT) → immutable RAW → SQL/Dynamic Table transforms → curated layers. Reprocess from RAW on logic changes.',
      tradeoffs: 'RAW storage cost vs the ability to reprocess and audit; usually well worth it.',
      failureModes: 'Transforming on ingest with no RAW; keep RAW immutable.',
      cost: 'Extra RAW storage; elastic compute for transforms on demand.',
      interviewAnswer: 'I default to ELT: load raw into Snowflake and transform with SQL and Dynamic Tables using its elastic compute, keeping an immutable RAW layer so I can reprocess history when logic changes without re-ingesting. External ETL is reserved for specialized pre-processing.',
    },
    {
      id: 'ld-stream-task', area: 'loading-lab', category: 'Incremental', difficulty: 'advanced',
      tag: '📥 Requirement',
      title: 'Incrementally process only new rows',
      requirements: 'After loading into RAW, downstream must process only newly arrived rows, not rescan everything.',
      steps: [
        {
          prompt: 'How do you capture new rows for processing?',
          choices: [
            { text: 'A Stream on RAW to expose the change set', correct: true, why: 'Streams provide row-level CDC so consumers process only inserts/updates/deletes since the last offset.' },
            { text: 'Full scan RAW every run and diff', correct: false, why: 'Expensive and defeats incrementality.' },
            { text: 'Guess a time filter', correct: false, why: 'Fragile against late/clock-skewed data.' },
          ],
          insight: 'Streams are the CDC primitive; consuming advances the offset.',
        },
        {
          prompt: 'How do you consume and stay incremental safely?',
          choices: [
            { text: 'A Task that MERGEs the stream\'s changes on a schedule (or a Dynamic Table)', correct: true, why: 'A Task consumes the stream and MERGEs changes; consuming advances the offset. A Dynamic Table can replace much of this declaratively.' },
            { text: 'Read the stream but never consume it', correct: false, why: 'Offset never advances; stream can go stale.' },
            { text: 'Let it lag for weeks', correct: false, why: 'Risks the offset aging past retention → stale stream.' },
          ],
        },
      ],
      architecture: 'RAW → Stream (CDC) → Task MERGE (or Dynamic Table) → curated. Monitor stream staleness and consume within retention.',
      tradeoffs: 'Stream+Task gives control; Dynamic Tables trade control for less code.',
      failureModes: 'Stale stream if the consumer stops advancing the offset past retention.',
      cost: 'Incremental processing keeps compute proportional to change volume.',
      interviewAnswer: 'I put a Stream on RAW to capture the change set and consume it with a scheduled Task MERGE — or a Dynamic Table for a declarative version — so downstream processes only new rows. I monitor stream staleness to ensure it\'s consumed within the retention window.',
    },
    {
      id: 'ld-file-size', area: 'loading-lab', category: 'Performance', difficulty: 'intermediate',
      tag: '📥 Requirement',
      title: 'Snowpipe latency growing from tiny files',
      requirements: 'A producer writes thousands of tiny files; Snowpipe latency and cost are climbing.',
      steps: [
        {
          prompt: 'What is the fix at the source?',
          choices: [
            { text: 'Batch the producer to write fewer, larger files (~100–250 MB compressed)', correct: true, why: 'Snowpipe has per-file overhead; well-sized files cut backlog, latency, and cost.' },
            { text: 'Increase your warehouse size', correct: false, why: 'Snowpipe is serverless; your warehouse is irrelevant to it.' },
            { text: 'Add more pipes', correct: false, why: 'Does not fix per-file overhead of tiny files.' },
          ],
          insight: 'File shape drives Snowpipe throughput more than any warehouse setting.',
        },
        {
          prompt: 'If sub-minute latency is truly required, then?',
          choices: [
            { text: 'Move to Snowpipe Streaming (row-level, no files)', correct: true, why: 'Streaming avoids the file-overhead problem entirely for genuine low-latency needs.' },
            { text: 'Write even more, smaller files', correct: false, why: 'Worsens per-file overhead.' },
            { text: 'Poll storage in a loop', correct: false, why: 'Not how Snowpipe works; wasteful.' },
          ],
        },
      ],
      architecture: 'Producer batches to well-sized files → Snowpipe; or, for sub-minute needs, Snowpipe Streaming rows directly into RAW.',
      tradeoffs: 'Batching adds slight producer-side latency; Streaming adds continuous cost but removes file overhead.',
      failureModes: 'Tiny-file backlog; monitor pipe backlog and file sizes.',
      cost: 'Fewer, larger files reduce per-file credits; Streaming has its own pricing.',
      interviewAnswer: 'Snowpipe has per-file overhead, so I fix it at the source by batching to ~100–250 MB files, which cuts backlog, latency, and cost. My warehouse size is irrelevant since Snowpipe is serverless. If we genuinely need sub-minute latency, I move to Snowpipe Streaming.',
    },
    {
      id: 'ld-external-table', area: 'loading-lab', category: 'Lake', difficulty: 'advanced',
      tag: '📥 Requirement',
      title: 'Query data in the lake without loading it',
      requirements: 'Some data must stay in cloud storage (governance/cost), but analysts occasionally need to query it from Snowflake.',
      steps: [
        {
          prompt: 'How do you query without ingesting?',
          choices: [
            { text: 'External tables over the storage location (or Iceberg for open format)', correct: true, why: 'External/Iceberg tables let Snowflake query files in place without loading them.' },
            { text: 'Always COPY it in first', correct: false, why: 'Contradicts the requirement to leave data in the lake.' },
            { text: 'Export from Snowflake instead', correct: false, why: 'Wrong direction.' },
          ],
          insight: 'Query-in-place via external/Iceberg tables; load only when performance demands it.',
        },
        {
          prompt: 'The external queries are slow and frequent. What next?',
          choices: [
            { text: 'Materialize the hot subset into a native/Iceberg table (or a materialized view over the external table)', correct: true, why: 'Frequent, latency-sensitive access justifies materializing the hot data for performance.' },
            { text: 'Keep scanning files in place forever', correct: false, why: 'External scans are slower than native; frequent access warrants materialization.' },
            { text: 'Give up on those queries', correct: false, why: 'Unnecessary; materialize the hot subset.' },
          ],
        },
      ],
      architecture: 'Lake files → external/Iceberg tables for occasional access → materialize hot subsets into native/Iceberg tables when access becomes frequent.',
      tradeoffs: 'Query-in-place saves ingestion/storage but is slower; materialization trades storage for speed.',
      failureModes: 'Treating external tables as a substitute for native performance on hot paths.',
      cost: 'No ingestion cost for cold data; materialize only the hot subset.',
      interviewAnswer: 'For data that must stay in the lake, I expose external or Iceberg tables so analysts can query it in place without loading. When some of that data becomes hot and latency-sensitive, I materialize just that subset into a native or Iceberg table rather than accept slow external scans everywhere.',
    },
    {
      id: 'ld-validate', area: 'loading-lab', category: 'Reliability', difficulty: 'beginner',
      tag: '📥 Requirement',
      title: 'Validate files before committing to the target',
      requirements: 'You want to check row counts/format before loading into the real table.',
      steps: [
        {
          prompt: 'How do you validate a load safely?',
          choices: [
            { text: 'Use COPY VALIDATION_MODE / load into staging first, verify, then promote', correct: true, why: 'Validation mode or a staging table lets you inspect results before touching the target.' },
            { text: 'Load straight to production and hope', correct: false, why: 'No safety net for bad loads.' },
            { text: 'Skip validation to save time', correct: false, why: 'Trades reliability for speed.' },
          ],
          insight: 'Stage-then-promote (or VALIDATION_MODE) makes loads verifiable.',
        },
      ],
      architecture: 'Files → COPY VALIDATION_MODE or STAGING table → row-count/format checks → atomic promote/swap into target.',
      tradeoffs: 'A validation step adds a little time for much safer loads.',
      failureModes: 'Promoting unvalidated data; gate promotion on checks.',
      cost: 'Minor extra compute for validation.',
      interviewAnswer: 'I validate before committing — either COPY VALIDATION_MODE or loading to a staging table, running row-count and format checks, then atomically promoting into the target — so a bad file never lands directly in production.',
    },
    {
      id: 'ld-unload', area: 'loading-lab', category: 'Unload', difficulty: 'beginner',
      tag: '📥 Requirement',
      title: 'Export query results to cloud storage',
      requirements: 'A downstream partner needs a periodic file extract of a query result in cloud storage.',
      steps: [
        {
          prompt: 'How do you produce the extract?',
          choices: [
            { text: 'COPY INTO <stage> (unload) with a chosen file format and partitioning', correct: true, why: 'COPY INTO a stage unloads query results to files in the format/partitioning the partner needs.' },
            { text: 'Screen-scrape the UI', correct: false, why: 'Not automatable or reliable.' },
            { text: 'Share the whole database', correct: false, why: 'Wrong tool if they specifically need files.' },
          ],
          insight: 'COPY INTO table = load; COPY INTO stage = unload.',
        },
        {
          prompt: 'Better option if the partner uses Snowflake and wants it live?',
          choices: [
            { text: 'Secure Data Sharing instead of file extracts', correct: true, why: 'If they are on Snowflake, live no-copy sharing beats periodic file exports.' },
            { text: 'Email larger files', correct: false, why: 'Fragile and stale.' },
            { text: 'Unload more frequently', correct: false, why: 'Still stale vs live sharing.' },
          ],
        },
      ],
      architecture: 'Query → COPY INTO external stage (partitioned files) for file consumers; or Secure Data Sharing for Snowflake consumers wanting live access.',
      tradeoffs: 'File unload suits non-Snowflake partners; sharing is better for Snowflake ones.',
      failureModes: 'Defaulting to file extracts when live sharing would be simpler.',
      cost: 'Compute to unload; sharing avoids repeated extract cost.',
      interviewAnswer: 'For a file extract I use COPY INTO a stage with the partner\'s format and partitioning. But if the partner is on Snowflake and wants current data, I would propose Secure Data Sharing instead — live, no-copy access beats periodic file exports.',
    },
    {
      id: 'ld-format', area: 'loading-lab', category: 'Reliability', difficulty: 'beginner',
      tag: '📥 Requirement',
      title: 'Messy CSVs: quotes, nulls, and bad dates',
      requirements: 'Incoming CSVs have quoted fields containing commas, empty strings that should be NULL, and dates in a non-default format.',
      steps: [
        {
          prompt: 'How do you parse them correctly?',
          choices: [
            { text: 'Define a named FILE FORMAT (FIELD_OPTIONALLY_ENCLOSED_BY, NULL_IF, DATE_FORMAT)', correct: true, why: 'A reusable file format declares quoting, null handling, and date parsing so COPY interprets the data correctly and consistently.' },
            { text: 'Post-process with string functions after a raw load', correct: false, why: 'Fragile and repeated everywhere; the file format handles it once at load.' },
            { text: 'Ask upstream to only send perfect CSVs', correct: false, why: 'You cannot depend on upstream cleanliness.' },
          ],
          insight: 'Named file formats centralize parsing rules and keep loads consistent.',
        },
        {
          prompt: 'How do you reuse this across many loads reliably?',
          choices: [
            { text: 'Reference the named FILE FORMAT object in COPY/Snowpipe/stage definitions', correct: true, why: 'A shared file-format object keeps every load consistent and easy to update in one place.' },
            { text: 'Copy-paste format options into each COPY', correct: false, why: 'Drifts out of sync across pipelines.' },
            { text: 'Rely on defaults', correct: false, why: 'Defaults will mis-parse quotes, nulls, and dates here.' },
          ],
        },
      ],
      architecture: 'Named FILE FORMAT (quoting, NULL_IF, DATE_FORMAT, error handling) referenced by the stage and COPY/Snowpipe; validation + quarantine for stragglers.',
      tradeoffs: 'A little upfront format modeling for consistent, correct parsing everywhere.',
      failureModes: 'Silent mis-parsing (commas splitting fields, empty vs NULL); the file format prevents it.',
      cost: 'Negligible; parse-time only.',
      interviewAnswer: 'I define a named FILE FORMAT with FIELD_OPTIONALLY_ENCLOSED_BY, NULL_IF, and DATE_FORMAT so quotes, empty-as-null, and custom dates parse correctly, and reference that one object across all loads for consistency — rather than post-processing or trusting upstream to send clean files.',
    },
  ];
  window.SnowflakeViz.ScenarioEngine.register('loading-lab', S);
})();
