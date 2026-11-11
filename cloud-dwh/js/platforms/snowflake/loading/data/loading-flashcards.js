/* ============================================================
   Loading Flashcards — active-recall deck for Snowflake data
   ingestion. Each card: { id, front, back, tag }.
   The id is stable (used as the SRS scheduling key), so don't
   renumber existing cards when adding new ones.
   ============================================================ */
(function () {
  'use strict';

  const DECK = [
    // ── Patterns ──────────────────────────────────────────────
    { id: 'lf01', tag: 'Patterns', front: 'COPY INTO vs Snowpipe — the one-line difference?', back: 'COPY INTO is pull-based batch you run (manually or via a Task) on your warehouse. Snowpipe is event-driven and serverless: storage notifications auto-run the COPY as files arrive.' },
    { id: 'lf02', tag: 'Patterns', front: 'Which ingestion pattern uses no files and no stage?', back: 'Snowpipe Streaming — rows are written directly through a channel with the SDK/connector, with sub-second latency and an offset token for exactly-once per channel.' },
    { id: 'lf03', tag: 'Patterns', front: 'When do you reach for CDC (Debezium) over the other patterns?', back: 'When you must mirror a source database’s row-level inserts, UPDATES and DELETES. CDC reads the DB transaction log and emits I/U/D change events you apply with a MERGE.' },
    { id: 'lf04', tag: 'Patterns', front: 'How does the Kafka connector preserve order?', back: 'Per-partition: it consumes each topic partition in offset order and tracks committed offsets. There is no global cross-partition ordering guarantee.' },
    { id: 'lf05', tag: 'Patterns', front: 'Snowpipe latency vs COPY latency?', back: 'Snowpipe: seconds-to-minutes, event-driven. COPY: minutes-to-hours, on your schedule. Snowpipe Streaming beats both at sub-second but costs streaming credits.' },

    // ── Stages & file formats ─────────────────────────────────
    { id: 'lf06', tag: 'Stages & Formats', front: 'Where do an external stage’s cloud credentials belong?', back: 'In a STORAGE INTEGRATION (a role-based object), never inline in CREATE STAGE. The stage references the integration by name.' },
    { id: 'lf07', tag: 'Stages & Formats', front: 'Internal vs external stage?', back: 'External points at files in YOUR bucket (read in place, not stored by Snowflake). Internal is Snowflake-managed storage (user @~, table @%tbl, or named) that you PUT files into first.' },
    { id: 'lf08', tag: 'Stages & Formats', front: 'What does STRIP_OUTER_ARRAY = TRUE do?', back: 'Unwraps a top-level JSON array so each element loads as its own VARIANT row, instead of one giant row holding the whole array.' },
    { id: 'lf09', tag: 'Stages & Formats', front: 'Three objects you need to bulk-load from S3?', back: 'A STORAGE INTEGRATION (credentials), a STAGE (bucket path), and a FILE FORMAT (how to parse). Then COPY INTO uses them.' },

    // ── COPY mechanics ────────────────────────────────────────
    { id: 'lf10', tag: 'COPY', front: 'What are the three ON_ERROR options and what do they do?', back: 'CONTINUE (load good rows, skip bad), SKIP_FILE (skip the whole file on any error), ABORT_STATEMENT (fail the entire load — the default).' },
    { id: 'lf11', tag: 'COPY', front: 'How do you dry-run a load without inserting anything?', back: 'COPY INTO … VALIDATION_MODE = \'RETURN_ERRORS\' (or RETURN_n_ROWS). It reports what would fail and loads nothing.' },
    { id: 'lf12', tag: 'COPY', front: 'Why isn’t the same file loaded twice?', back: 'COPY records each loaded file’s name + ETag in load metadata (~64 days) and skips it. FORCE = TRUE bypasses that and re-loads.' },
    { id: 'lf13', tag: 'COPY', front: 'Best file size for parallel bulk loading?', back: 'Roughly 100–250 MB compressed, many files loaded in parallel. Tiny files add per-file overhead; one huge file can’t parallelize.' },

    // ── Incremental / MERGE / CDC ─────────────────────────────
    { id: 'lf14', tag: 'Incremental', front: 'Why is blind-appending change events dangerous?', back: 'At-least-once delivery + retries re-deliver events, so an append with no key/dedup creates duplicates and can’t reflect updates/deletes. Upsert with MERGE instead.' },
    { id: 'lf15', tag: 'Incremental', front: 'Why de-dup the source by key before a MERGE?', back: 'MERGE is non-deterministic (or errors) if one target row matches several source rows. Keep the latest per key (e.g. ROW_NUMBER by lsn/updated_at DESC = 1).' },
    { id: 'lf16', tag: 'Incremental', front: 'What is a watermark and what makes a good one?', back: 'The high-water value already processed (MAX updated_at / lsn / offset) so the next run pulls only newer rows. Good watermarks never go backwards — commit LSN/offset is safest.' },
    { id: 'lf17', tag: 'Incremental', front: 'Define idempotent loading.', back: 'Re-running the same batch converges to the same final state — no duplicates, no double-applied updates. Achieved via file dedup or dedup-by-key + MERGE.' },
    { id: 'lf18', tag: 'Incremental', front: 'How do you apply CDC deletes in a MERGE?', back: 'Carry the op flag: WHEN MATCHED AND op = \'D\' THEN DELETE (hard delete), or set is_deleted = TRUE for a soft delete that preserves history.' },
    { id: 'lf19', tag: 'Incremental', front: 'What do a Stream and a Task do together?', back: 'A Stream is a change cursor over a table (rows changed since last read). A Task runs SQL on a schedule WHEN SYSTEM$STREAM_HAS_DATA — the common engine for incremental MERGE pipelines.' },

    // ── Failure / recovery / reconciliation ───────────────────
    { id: 'lf20', tag: 'Recovery', front: 'A COPY says a file loaded but 0 rows inserted. First suspicion?', back: 'A file-format mismatch (delimiter, header, type casts) rejected every row. Re-run with VALIDATION_MODE, inspect COPY_HISTORY error_count and rejected records, fix the format.' },
    { id: 'lf21', tag: 'Recovery', front: 'Safest way to recover a half-finished batch load?', back: 'Read load metadata / COPY_HISTORY to see which files already loaded, then re-run — COPY skips loaded files, so it reprocesses only the gap. Reconcile afterwards. Don’t blindly FORCE.' },
    { id: 'lf22', tag: 'Recovery', front: 'How do you reconcile a load?', back: 'Compare control totals source vs target: row counts (per day/partition), a SUM/checksum on key numeric columns, and distinct key counts. Any mismatch → investigate before calling it done.' },
    { id: 'lf23', tag: 'Recovery', front: 'Duplicates appear after a retry. Likely cause + fix?', back: 'FORCE=TRUE re-load, or an append with no dedup, or a MERGE whose source wasn’t de-duplicated by key. Fix: de-dup the target, then make the pipeline upsert idempotently.' },
    { id: 'lf24', tag: 'Recovery', front: 'Format error vs data error — how do you tell them apart?', back: 'Format errors fail parsing and usually hit many/all rows in a file → fix the FILE FORMAT. Data errors are genuine bad values in valid files → quarantine those rows (ON_ERROR=CONTINUE + rejects).' },

    // ── Cost & performance ────────────────────────────────────
    { id: 'lf25', tag: 'Cost', front: 'COPY vs Snowpipe — who pays, and when is each cheaper?', back: 'COPY runs on your warehouse (warehouse credits, auto-suspend reclaims idle). Snowpipe is serverless per-second + a per-file charge, so very tiny frequent files can cost more than a batched COPY.' },
    { id: 'lf26', tag: 'Cost', front: 'Does a bigger warehouse speed up loading one huge file?', back: 'No. Loading scales with file COUNT (parallel threads), not file size. Split the huge file first; size up / multi-cluster only when there are many files.' },
  ];

  window.CDWH = window.CDWH || {};
  window.CDWH.P = window.CDWH.P || {};
  window.CDWH.P.snowflake = window.CDWH.P.snowflake || {};
  window.CDWH.P.snowflake.loadingFlashcards = DECK;
})();
