/* ============================================================
   Ingestion failure, recovery & reconciliation cases (P0-D).
   18 production incidents, each with a specific root cause, a
   reproducible initial state, diagnostics, recovery options (with
   risks and traps), and a reconciliation funnel. Drives the on-call
   incident simulator and the reconciliation panel. Illustrative;
   nothing executes against a live account.

   Field shapes:
     diagnostics: [{ q, a }]            q = query/check, a = what it establishes
     causes:      [{ t, ok }]           one ok:true is the real root cause
     fixes:       [{ t, ok, risk }]     one ok:true is the safe recovery
     recon: { expected, discovered, parsed, loaded, rejected, duplicates,
              net, finalTarget, note }  counts along the pipeline
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.snowflake = viz.P.snowflake || {};

  function I(o) { return o; }
  const CASES = [
    I({ id: 'f1', cat: 'Parsing', sev: 'medium', title: 'Malformed CSV rows',
      impact: 'A nightly orders load reports fewer rows than expected; finance totals look low.',
      symptom: 'COPY finished but row_count < row_parsed for several files.',
      status: 'COPY succeeded (ON_ERROR=CONTINUE); error_count > 0.',
      meta: [['files', '120'], ['rows parsed', '1,000,000'], ['rows loaded', '998,500']],
      diagnostics: [
        { q: "copy_history(...) → error_count, first_error", a: 'How many rows failed and the first parse error per file.' },
        { q: "VALIDATION_MODE='RETURN_ERRORS'", a: 'Exactly which rows/columns would fail, without loading.' }],
      causes: [
        { t: 'A few rows have unquoted commas / bad values; good rows loaded, bad rows skipped.', ok: true },
        { t: 'The warehouse was too small.', ok: false },
        { t: 'Snowflake dropped data at random.', ok: false }],
      fixes: [
        { t: 'Capture rejects to a quarantine table (reason + file + row), fix the source, reload only the fixed rows.', ok: true, risk: 'Low — good rows already loaded; no duplicates.' },
        { t: 'Re-run with FORCE=TRUE to "get everything".', ok: false, risk: 'Duplicates every already-loaded row.' },
        { t: 'Switch ON_ERROR to ABORT_STATEMENT and rerun.', ok: false, risk: 'One bad row now fails the whole load.' }],
      recon: { expected: 1000000, discovered: 1000000, parsed: 1000000, loaded: 998500, rejected: 1500, duplicates: 0, net: 998500, finalTarget: 998500, note: 'loaded = parsed − rejected. The gap is the 1,500 quarantined rows, not lost data — reload them after fixing.' },
      lesson: 'Rejects are expected with messy sources; make them visible and reloadable, never silent.' }),

    I({ id: 'f2', cat: 'Parsing', sev: 'medium', title: 'Invalid timestamp / numeric conversion',
      impact: 'Daily partition is missing a chunk of rows; a dashboard shows a dip.',
      symptom: 'Rows with a non-default date format and one overflowing amount are rejected.',
      status: 'Partial load; first_error mentions date recognition + numeric out of range.',
      meta: [['bad dates', '900'], ['overflow rows', '12'], ['policy', 'CONTINUE']],
      diagnostics: [
        { q: "first_error / first_error_column_name", a: 'Which column and value broke parsing.' },
        { q: 'Inspect the file format DATE_FORMAT', a: 'Whether the format matches the source encoding.' }],
      causes: [
        { t: 'DATE_FORMAT does not match the source; separately, 12 rows truly overflow the target NUMBER.', ok: true },
        { t: 'The stage URL is wrong.', ok: false },
        { t: 'Time Travel corrupted the table.', ok: false }],
      fixes: [
        { t: "Set DATE_FORMAT correctly and reload the date-rejected rows; quarantine the 12 genuine overflows for data-owner review.", ok: true, risk: 'Low — format fix is safe; overflow is a real data error, not a format issue.' },
        { t: 'Widen the column to NUMBER(38,0) and reload everything with FORCE.', ok: false, risk: 'Masks a real data error and duplicates rows.' },
        { t: 'Cast the column to VARCHAR so nothing fails.', ok: false, risk: 'Destroys typing and downstream math.' }],
      recon: { expected: 500000, discovered: 500000, parsed: 500000, loaded: 499088, rejected: 912, duplicates: 0, net: 499088, finalTarget: 499088, note: '900 rejects are a fixable format issue; 12 are real overflows. A format fix recovers 900; the 12 need a data decision.' },
      lesson: 'Separate format problems (fixable) from genuine data errors (need a decision) — do not widen types to hide them.' }),

    I({ id: 'f3', cat: 'Schema', sev: 'high', title: 'Unexpected schema change',
      impact: 'Loads start failing after an upstream release added a column.',
      symptom: 'COPY errors with column count mismatch (or a new field is silently dropped).',
      status: 'Pipe/COPY failing since the upstream deploy.',
      meta: [['new column', 'promo_code'], ['error', 'column count mismatch'], ['since', 'last deploy']],
      diagnostics: [
        { q: 'INFER_SCHEMA on recent files', a: 'The current file structure vs the table definition.' },
        { q: 'Diff file columns against the table', a: 'Exactly which column appeared/moved.' }],
      causes: [
        { t: 'Upstream added a column; a rigid positional/strict load cannot absorb it.', ok: true },
        { t: 'Snowflake changed CSV parsing.', ok: false },
        { t: 'The warehouse auto-suspended.', ok: false }],
      fixes: [
        { t: 'Land into a flexible RAW (VARIANT or MATCH_BY_COLUMN_NAME), then promote the new column in STAGING when needed.', ok: true, risk: 'Low — tolerates future drift without data loss.' },
        { t: 'Hard-fail every load until upstream reverts.', ok: false, risk: 'Blocks all data for an additive, safe change.' },
        { t: 'Drop the new column at load time.', ok: false, risk: 'Silent data loss.' }],
      recon: { expected: 200000, discovered: 200000, parsed: 0, loaded: 0, rejected: 200000, duplicates: 0, net: 0, finalTarget: 0, note: 'Strict parsing rejected everything. A flexible RAW would parse all 200k and expose promo_code as a new field.' },
      lesson: 'Design RAW to absorb additive schema drift; promote typed columns deliberately downstream.' }),

    I({ id: 'f4', cat: 'Delivery', sev: 'high', title: 'Missing expected file',
      impact: 'A region is under-reported; daily totals are short by one file.',
      symptom: 'Expected N files, only N−1 discovered on the stage.',
      status: 'Load succeeded for everything present; nothing errored.',
      meta: [['expected files', '48'], ['discovered', '47'], ['missing', 'region=eu/hour=03']],
      diagnostics: [
        { q: 'LIST @stage pattern for the window', a: 'Which file is absent vs the expected manifest.' },
        { q: 'Upstream delivery / SLA logs', a: 'Whether the file was ever produced or just late.' }],
      causes: [
        { t: 'Upstream did not deliver one file (partial delivery), so its rows never arrived.', ok: true },
        { t: 'COPY skipped it as a duplicate.', ok: false },
        { t: 'The table ran out of storage.', ok: false }],
      fixes: [
        { t: 'Alert on manifest/count gaps; when the file lands, event-driven load picks it up — reprocess the affected window.', ok: true, risk: 'Low — late file loads cleanly; reconcile the window.' },
        { t: 'Fabricate the missing rows by interpolation.', ok: false, risk: 'Invents data.' },
        { t: 'Mark the day complete and move on.', ok: false, risk: 'Permanent under-count.' }],
      recon: { expected: 48000, discovered: 47000, parsed: 47000, loaded: 47000, rejected: 0, duplicates: 0, net: 47000, finalTarget: 47000, note: 'discovered < expected is the tell. The 1,000 missing rows are upstream, not a Snowflake load error.' },
      lesson: 'Completeness needs a manifest/expected-count check; you cannot prove completeness from inside the load alone.' }),

    I({ id: 'f5', cat: 'Idempotency', sev: 'high', title: 'Duplicate file arrival',
      impact: 'Revenue is overstated; a title appears to have double the plays.',
      symptom: 'Target row count is higher than source; a file was delivered twice.',
      status: 'Both files loaded successfully.',
      meta: [['source rows', '1,000,000'], ['target rows', '1,012,000'], ['dupe file', 'orders_09.csv.bak']],
      diagnostics: [
        { q: 'GROUP BY business key HAVING COUNT(*)>1', a: 'How many keys are duplicated and by how much.' },
        { q: 'copy_history file names', a: 'Whether two files carried the same rows.' }],
      causes: [
        { t: 'A re-upload created a second file; ingestion is at-least-once, dedup was not enforced.', ok: true },
        { t: 'A Snowflake bug duplicated rows.', ok: false },
        { t: 'The warehouse was too large.', ok: false }],
      fixes: [
        { t: 'Rebuild the affected keys via a keyed MERGE/dedup (QUALIFY latest) so results are exactly-once.', ok: true, risk: 'Low — converges to one row per key regardless of duplicate files.' },
        { t: 'TRUNCATE the table and reload from scratch.', ok: false, risk: 'Heavy, risky, and still duplicates if the bad file is reloaded.' },
        { t: 'Delete rows at random until counts match.', ok: false, risk: 'Non-deterministic data loss.' }],
      recon: { expected: 1000000, discovered: 1000000, parsed: 1012000, loaded: 1012000, rejected: 0, duplicates: 12000, net: 1012000, finalTarget: 1000000, note: 'finalTarget after dedup = expected. The 12,000 duplicates came from the re-delivered file, not from new data.' },
      lesson: 'Treat ingestion as at-least-once; business-key dedup/MERGE delivers exactly-once results.' }),

    I({ id: 'f6', cat: 'Permissions', sev: 'critical', title: 'Missing cloud permissions',
      impact: 'A new external stage loads nothing; a whole source is dark.',
      symptom: 'LIST @stage / COPY fails with access denied.',
      status: 'No files loaded since the stage was created.',
      meta: [['stage', 'new external S3'], ['error', 'Access Denied'], ['integration', 's3_int']],
      diagnostics: [
        { q: 'LIST @stage', a: 'Whether Snowflake can even see the files.' },
        { q: 'DESC INTEGRATION + cloud IAM trust', a: 'Whether the role/trust policy is wired correctly.' }],
      causes: [
        { t: 'The storage integration IAM role / trust policy is missing or wrong, so Snowflake cannot read the bucket.', ok: true },
        { t: 'The files are corrupt.', ok: false },
        { t: 'The pipe is paused.', ok: false }],
      fixes: [
        { t: 'Fix the IAM role / trust relationship for the integration, re-LIST to confirm, then load.', ok: true, risk: 'Low — configuration fix; no data risk.' },
        { t: 'Embed AWS keys directly in the stage definition.', ok: false, risk: 'Leaks credentials; against least-privilege.' },
        { t: 'Make the bucket public.', ok: false, risk: 'Severe security exposure.' }],
      recon: { expected: 300000, discovered: 0, parsed: 0, loaded: 0, rejected: 0, duplicates: 0, net: 0, finalTarget: 0, note: 'discovered = 0 points at access, not data. Once LIST works, the funnel fills normally.' },
      lesson: 'Access failures surface at discovery (LIST); fix the integration, never weaken security to "unblock".' }),

    I({ id: 'f7', cat: 'Snowpipe', sev: 'high', title: 'Delayed / missing event notifications',
      impact: 'Files sit in the bucket but never load; data is hours stale.',
      symptom: 'Files present on the stage, but Snowpipe pendingFileCount stays 0 and nothing loads.',
      status: 'Pipe shows RUNNING but no recent activity.',
      meta: [['files waiting', '220'], ['pendingFileCount', '0'], ['last message', '3h ago']],
      diagnostics: [
        { q: "SYSTEM$PIPE_STATUS('pipe')", a: 'executionState, pendingFileCount, lastReceivedMessageTimestamp.' },
        { q: 'Cloud event config (SQS/SNS/PubSub/EventGrid)', a: 'Whether notifications reach the pipe at all.' }],
      causes: [
        { t: 'Event notifications are mis-routed/missing, so the pipe is never told files arrived.', ok: true },
        { t: 'The warehouse is too small (Snowpipe is serverless).', ok: false },
        { t: 'The table is full.', ok: false }],
      fixes: [
        { t: 'Fix the notification channel; use ALTER PIPE ... REFRESH to pick up the already-landed files, then confirm lag drops.', ok: true, risk: 'Low — REFRESH enqueues existing files once.' },
        { t: 'Recreate the pipe with FORCE on every file.', ok: false, risk: 'Unnecessary; risks reloading.' },
        { t: 'Switch to hourly COPY and abandon Snowpipe.', ok: false, risk: 'Abandons low latency for a config bug.' }],
      recon: { expected: 220000, discovered: 0, parsed: 0, loaded: 0, rejected: 0, duplicates: 0, net: 0, finalTarget: 0, note: 'Files exist but were never discovered by the pipe (pendingFileCount=0) — a notification problem, not a data problem.' },
      lesson: 'lastReceivedMessageTimestamp going stale with pending files = notification plumbing; REFRESH recovers the gap.' }),

    I({ id: 'f8', cat: 'Snowpipe', sev: 'medium', title: 'Snowpipe backlog from tiny files',
      impact: 'Latency keeps climbing; data is minutes-to-hours behind.',
      symptom: 'pendingFileCount grows faster than files are consumed.',
      status: 'Pipe RUNNING; backlog rising.',
      meta: [['files/min', '4,000'], ['avg size', '15 KB'], ['pending', '38,000']],
      diagnostics: [
        { q: 'pendingFileCount trend', a: 'Whether arrival rate exceeds load rate.' },
        { q: 'Average file size', a: 'Whether per-file overhead dominates.' }],
      causes: [
        { t: 'Thousands of tiny files create per-file overhead the pipe cannot keep up with.', ok: true },
        { t: 'The pipe needs a bigger warehouse.', ok: false },
        { t: 'Too few pipes.', ok: false }],
      fixes: [
        { t: 'Batch the producer to ~100–250 MB files (or move to Snowpipe Streaming for true sub-minute needs).', ok: true, risk: 'Low — fixes the cause at the source.' },
        { t: 'Add more pipes on the same tiny files.', ok: false, risk: 'Does not remove per-file overhead.' },
        { t: 'Increase a warehouse size.', ok: false, risk: 'Irrelevant — Snowpipe is serverless.' }],
      recon: { expected: 240000, discovered: 180000, parsed: 180000, loaded: 180000, rejected: 0, duplicates: 0, net: 180000, finalTarget: 180000, note: 'discovered lags expected because the backlog has not drained — a throughput/shape issue, not loss. It catches up once files are right-sized.' },
      lesson: 'File shape, not warehouse size, drives Snowpipe throughput.' }),

    I({ id: 'f9', cat: 'Pipeline', sev: 'high', title: 'Failed / stalled downstream transformation',
      impact: 'RAW is current but curated tables are stale; dashboards lag.',
      symptom: 'A Task stopped running or its Stream went stale; MERGE no longer advances.',
      status: 'RAW fresh; curated behind; Task SUSPENDED or erroring.',
      meta: [['RAW lag', '0'], ['curated lag', '6h'], ['stream', 'stale?']],
      diagnostics: [
        { q: 'TASK_HISTORY()', a: 'Whether the Task ran, failed, or is suspended.' },
        { q: "SYSTEM$STREAM_HAS_DATA + stream staleness", a: 'Whether the stream offset aged past retention.' }],
      causes: [
        { t: 'The Task failed/was suspended; if the stream was not consumed within retention it also went stale.', ok: true },
        { t: 'RAW ingestion broke.', ok: false },
        { t: 'The BI tool cache is stale.', ok: false }],
      fixes: [
        { t: 'Fix the Task error and RESUME; if the stream is stale, re-initialise it and backfill the gap from RAW by timestamp/offset.', ok: true, risk: 'Medium — backfill carefully to avoid double-applying; MERGE keeps it idempotent.' },
        { t: 'Drop and recreate curated from scratch nightly.', ok: false, risk: 'Expensive; loses incremental benefits.' },
        { t: 'Ignore it; it will catch up.', ok: false, risk: 'A stale stream never self-heals past retention.' }],
      recon: { expected: 500000, discovered: 500000, parsed: 500000, loaded: 500000, rejected: 0, duplicates: 0, net: 500000, finalTarget: 440000, note: 'RAW has 500k; curated has 440k because the transform stalled. The 60k gap is unprocessed change, recovered by resuming + backfilling.' },
      lesson: 'Consume streams within retention; a suspended Task + stale stream needs re-init and a keyed backfill.' }),

    I({ id: 'f10', cat: 'Watermark', sev: 'high', title: 'Incorrect watermark boundary',
      impact: 'Some updates silently never reach curated.',
      symptom: 'Rows exist in RAW but not in curated; the incremental filter skipped them.',
      status: 'Pipeline green; data quietly missing.',
      meta: [['watermark', 'updated_at'], ['missed', 'late events < mark'], ['bound', 'exclusive >']],
      diagnostics: [
        { q: 'Anti-join RAW vs curated on key', a: 'Which rows are present upstream but missing downstream.' },
        { q: 'Compare event_time vs load_time', a: 'Whether missed rows arrived late relative to the mark.' }],
      causes: [
        { t: 'A timestamp-only watermark skipped late/equal-timestamp rows (clock skew / exclusive bound).', ok: true },
        { t: 'The MERGE key is wrong.', ok: false },
        { t: 'Storage filled up.', ok: false }],
      fixes: [
        { t: 'Recompute the watermark using a monotonic source sequence (lsn/offset) or an overlap window, and reprocess the missed range from RAW.', ok: true, risk: 'Low–medium — overlap re-reads some rows; a keyed MERGE dedups them.' },
        { t: 'Lower the watermark to the beginning of time each run.', ok: false, risk: 'Full re-scan every run; defeats incrementality.' },
        { t: 'Switch to blind append to be safe.', ok: false, risk: 'Introduces duplicates.' }],
      recon: { expected: 500000, discovered: 500000, parsed: 500000, loaded: 500000, rejected: 0, duplicates: 0, net: 500000, finalTarget: 496000, note: 'curated is short by the 4,000 late rows the timestamp watermark skipped — recovered by reprocessing with a sequence-based boundary.' },
      lesson: 'Prefer source sequence/offset watermarks; timestamps miss late and equal-time rows.' }),

    I({ id: 'f11', cat: 'CDC', sev: 'high', title: 'Duplicate CDC events',
      impact: 'A key is updated twice to the same value; audit counts look doubled.',
      symptom: 'The change log has repeated event_ids after a connector restart/replay.',
      status: 'Connector recovered by replaying from an earlier offset.',
      meta: [['dupe events', '8,400'], ['cause', 'offset replay'], ['key', 'event_id']],
      diagnostics: [
        { q: 'GROUP BY event_id HAVING COUNT(*)>1', a: 'How many events were delivered more than once.' },
        { q: 'Connector offset / restart logs', a: 'Whether a replay re-sent a window.' }],
      causes: [
        { t: 'At-least-once delivery re-sent events on restart; without an event-id guard they double-apply.', ok: true },
        { t: 'Postgres duplicated the rows.', ok: false },
        { t: 'The MERGE key is null.', ok: false }],
      fixes: [
        { t: 'Dedup by event_id (and latest lsn per key) before MERGE; keep an applied-events guard for replay safety.', ok: true, risk: 'Low — replay becomes a no-op.' },
        { t: 'Reset the connector offset to now and skip the gap.', ok: false, risk: 'Drops unreplayed changes.' },
        { t: 'TRUNCATE and re-snapshot every time.', ok: false, risk: 'Heavy; not a routine fix.' }],
      recon: { expected: 100000, discovered: 108400, parsed: 108400, loaded: 108400, rejected: 0, duplicates: 8400, net: 100000, finalTarget: 100000, note: 'Raw change log legitimately has duplicates; after event-id dedup the applied result matches expected.' },
      lesson: 'CDC is at-least-once — event-id dedup + latest-lsn makes replay safe.' }),

    I({ id: 'f12', cat: 'CDC', sev: 'high', title: 'Out-of-order CDC updates',
      impact: 'A row shows an older status than reality (stale overwrite).',
      symptom: 'Two updates to one key applied in arrival order, not commit order.',
      status: 'Pipeline green; one record is wrong.',
      meta: [['key', 'order_id=7'], ['arrival', 'new then old'], ['order col', 'lsn'] ],
      diagnostics: [
        { q: 'Compare current row vs max-lsn change', a: 'Whether the latest commit actually won.' },
        { q: 'Order the change log by lsn for the key', a: 'The true commit order.' }],
      causes: [
        { t: 'Updates were applied by arrival/position instead of by source commit order (lsn).', ok: true },
        { t: 'The source sent wrong data.', ok: false },
        { t: 'Time Travel reverted it.', ok: false }],
      fixes: [
        { t: 'Select one row per key by latest lsn (QUALIFY ROW_NUMBER() ORDER BY lsn DESC) before MERGE; re-apply the key.', ok: true, risk: 'Low — deterministic latest-wins.' },
        { t: 'Order by updated_at instead.', ok: false, risk: 'Ties/clock skew still mis-order.' },
        { t: 'Apply every event in sequence with separate UPDATEs.', ok: false, risk: 'Fragile and slow; still order-dependent.' }],
      recon: { expected: 100000, discovered: 100000, parsed: 100000, loaded: 100000, rejected: 0, duplicates: 0, net: 100000, finalTarget: 100000, note: 'Counts match — correctness, not count, is wrong. Reconcile by comparing the current value to the max-lsn change per key.' },
      lesson: 'Order CDC by source sequence (lsn), never by arrival or wall-clock time.' }),

    I({ id: 'f13', cat: 'CDC', sev: 'critical', title: 'Incorrectly handled CDC delete',
      impact: 'Deleted orders still appear; privacy/accuracy risk.',
      symptom: 'op=d events exist in RAW but the rows persist in curated.',
      status: 'MERGE is insert/update-only.',
      meta: [['delete events', '1,300'], ['rows still present', '1,300'], ['merge', 'no DELETE branch']],
      diagnostics: [
        { q: "Count op='d' in RAW vs rows still in curated", a: 'Whether tombstones were applied.' },
        { q: 'Inspect the MERGE clauses', a: 'Whether a DELETE branch exists.' }],
      causes: [
        { t: 'The MERGE has no WHEN MATCHED ... THEN DELETE, so tombstones are ignored.', ok: true },
        { t: 'Deletes never reached Kafka.', ok: false },
        { t: 'The table is read-only.', ok: false }],
      fixes: [
        { t: 'Add a delete branch (WHEN MATCHED AND op=\'d\' THEN DELETE), then reprocess the delete events to apply tombstones.', ok: true, risk: 'Low–medium — idempotent; verify key set shrinks correctly.' },
        { t: 'Manually delete rows ad hoc.', ok: false, risk: 'Unrepeatable; drifts from the log.' },
        { t: 'Soft-delete by ignoring deletes.', ok: false, risk: 'Keeps data that must be removed.' }],
      recon: { expected: 98700, discovered: 100000, parsed: 100000, loaded: 100000, rejected: 0, duplicates: 0, net: 98700, finalTarget: 98700, note: 'expected (after deletes) is 1,300 below the loaded change count; reconcile by KEY SET, not raw counts — deletes legitimately reduce the target.' },
      lesson: 'A delete is a real event; insert/update-only MERGE silently never removes rows.' }),

    I({ id: 'f14', cat: 'Backfill', sev: 'high', title: 'Backfill overlapping incremental',
      impact: 'A historical backfill double-counts against live data.',
      symptom: 'Target rows exceed source after a backfill ran alongside the live pipeline.',
      status: 'Backfill + incremental both wrote overlapping keys.',
      meta: [['overlap window', '2 days'], ['extra rows', '60,000'], ['dedup', 'none']],
      diagnostics: [
        { q: 'Count keys present in both backfill and live ranges', a: 'The overlap size.' },
        { q: 'Compare target vs distinct business keys', a: 'How many duplicates the overlap created.' }],
      causes: [
        { t: 'Backfill and incremental loaded the same keys without a shared dedup/MERGE.', ok: true },
        { t: 'The backfill warehouse was too large.', ok: false },
        { t: 'Snowflake merged partitions wrong.', ok: false }],
      fixes: [
        { t: 'Load backfill into the same keyed MERGE path (or a staging table) so overlap collapses to one row per key; bound the backfill range explicitly.', ok: true, risk: 'Low — MERGE makes overlap safe.' },
        { t: 'Pause the live pipeline for a week to backfill.', ok: false, risk: 'Creates a fresh gap and latency.' },
        { t: 'TRUNCATE and reload everything.', ok: false, risk: 'Expensive and risky.' }],
      recon: { expected: 1000000, discovered: 1060000, parsed: 1060000, loaded: 1060000, rejected: 0, duplicates: 60000, net: 1060000, finalTarget: 1000000, note: 'The 60k overlap duplicates collapse under a keyed MERGE; finalTarget returns to expected.' },
      lesson: 'Route backfills through the same keyed MERGE as live data so overlapping windows are idempotent.' }),

    I({ id: 'f15', cat: 'Reconciliation', sev: 'medium', title: 'Target row-count mismatch',
      impact: 'Source and target counts differ; a stakeholder flags "missing data".',
      symptom: 'target_count ≠ source_count, but no errors anywhere.',
      status: 'Pipeline healthy; counts simply differ.',
      meta: [['source rows', '1,000,000'], ['target rows', '940,000'], ['errors', '0']],
      diagnostics: [
        { q: 'Funnel: discovered→parsed→loaded→rejected→deduped', a: 'Where the count legitimately changes.' },
        { q: 'Count updates/deletes/dedups applied', a: 'Why target < source is expected.' }],
      causes: [
        { t: 'Differences are legitimate: updates collapse to one row, deletes remove rows, dedup removes duplicates.', ok: true },
        { t: 'Data was lost.', ok: false },
        { t: 'The warehouse undercounted.', ok: false }],
      fixes: [
        { t: 'Reconcile by business key and operation, not raw row counts: expected = inserts − deletes, updates do not add rows.', ok: true, risk: 'None — this is the correct mental model.' },
        { t: 'Reload until counts are equal.', ok: false, risk: 'Forces wrong equality; creates duplicates.' },
        { t: 'Disable dedup so counts match.', ok: false, risk: 'Re-introduces duplicates.' }],
      recon: { expected: 940000, discovered: 1000000, parsed: 1000000, loaded: 1000000, rejected: 0, duplicates: 0, net: 940000, finalTarget: 940000, note: '60k change events were updates/deletes that do not add rows. target = distinct keys after ops — equal counts would actually be the bug.' },
      lesson: 'Counts at different stages legitimately differ; reconcile by key and operation, not equality of totals.' }),

    I({ id: 'f16', cat: 'Idempotency', sev: 'high', title: 'Duplicate business keys in source',
      impact: 'A MERGE errors or non-deterministically picks a row.',
      symptom: 'MERGE fails with a multi-match error, or results flip between runs.',
      status: 'Source has >1 row per business key in a batch.',
      meta: [['dupe keys', '5,000'], ['merge', 'no QUALIFY'], ['result', 'non-deterministic']],
      diagnostics: [
        { q: 'GROUP BY key HAVING COUNT(*)>1 in the source', a: 'Which keys appear multiple times per batch.' },
        { q: 'Check for a tiebreaker column', a: 'Whether lsn/updated_at can pick a winner.' }],
      causes: [
        { t: 'The MERGE source has duplicate keys and no deterministic selection, so a match is ambiguous.', ok: true },
        { t: 'The target has no primary key.', ok: false },
        { t: 'The warehouse is multi-cluster.', ok: false }],
      fixes: [
        { t: 'Collapse the source to one row per key first (QUALIFY ROW_NUMBER() ORDER BY lsn DESC = 1), then MERGE.', ok: true, risk: 'Low — deterministic and idempotent.' },
        { t: 'Set ERROR_ON_NONDETERMINISTIC_MERGE off and hope.', ok: false, risk: 'Hides non-determinism; flaky data.' },
        { t: 'Pick any row with LIMIT 1.', ok: false, risk: 'Still non-deterministic.' }],
      recon: { expected: 100000, discovered: 105000, parsed: 105000, loaded: 105000, rejected: 0, duplicates: 5000, net: 100000, finalTarget: 100000, note: 'After one-row-per-key selection the 5,000 duplicate keys collapse; finalTarget matches expected.' },
      lesson: 'Always reduce a MERGE source to one deterministic row per business key.' }),

    I({ id: 'f17', cat: 'Delivery', sev: 'medium', title: 'Partial upstream delivery',
      impact: 'Only part of a batch arrived before the load ran.',
      symptom: 'Row counts are low; the rest of the files land minutes later.',
      status: 'Load ran mid-delivery.',
      meta: [['expected', '48 files'], ['present at load', '30'], ['late', '18']],
      diagnostics: [
        { q: 'Manifest vs LIST at load time', a: 'How much of the batch had arrived.' },
        { q: 'Arrival timestamps of the late files', a: 'Whether they came after the load.' }],
      causes: [
        { t: 'The load triggered before the upstream finished delivering the batch.', ok: true },
        { t: 'Snowflake lost files.', ok: false },
        { t: 'The stage was dropped.', ok: false }],
      fixes: [
        { t: 'Gate the load on a completeness signal (manifest / _SUCCESS marker), or use event-driven loading + rolling-window reprocessing so late files still count.', ok: true, risk: 'Low — late files load when they land.' },
        { t: 'Add a fixed sleep and hope delivery finishes.', ok: false, risk: 'Fragile; breaks when upstream is slow.' },
        { t: 'Load only once a day to be safe.', ok: false, risk: 'Adds latency without guaranteeing completeness.' }],
      recon: { expected: 48000, discovered: 30000, parsed: 30000, loaded: 30000, rejected: 0, duplicates: 0, net: 30000, finalTarget: 48000, note: 'finalTarget reaches expected once the 18 late files load; event-driven ingestion + window reprocessing closes the gap.' },
      lesson: 'Trigger on completeness, or embrace event-driven loading with rolling reprocessing for late files.' }),

    I({ id: 'f18', cat: 'Pipeline', sev: 'high', title: 'Failed load wrongly retried with FORCE',
      impact: 'An on-call "fix" duplicated a day of data.',
      symptom: 'After a retry, target rows jumped well above source.',
      status: 'Someone reran COPY with FORCE=TRUE to "be sure".',
      meta: [['before retry', '1,000,000'], ['after retry', '2,000,000'], ['flag', 'FORCE=TRUE']],
      diagnostics: [
        { q: 'copy_history before/after', a: 'Whether already-loaded files were reloaded.' },
        { q: 'Duplicate-key count', a: 'How many rows doubled.' }],
      causes: [
        { t: 'FORCE=TRUE bypassed file-load tracking and reloaded files already loaded.', ok: true },
        { t: 'The source doubled its data.', ok: false },
        { t: 'Auto-clustering duplicated rows.', ok: false }],
      fixes: [
        { t: 'Rebuild affected keys via a keyed MERGE/dedup from RAW; stop using FORCE as a retry — plain re-run skips loaded files.', ok: true, risk: 'Low — dedup converges; retries are safe without FORCE.' },
        { t: 'Leave FORCE on so retries always "work".', ok: false, risk: 'Guarantees duplicates on every retry.' },
        { t: 'TRUNCATE and reload with FORCE again.', ok: false, risk: 'Same duplication risk.' }],
      recon: { expected: 1000000, discovered: 1000000, parsed: 2000000, loaded: 2000000, rejected: 0, duplicates: 1000000, net: 2000000, finalTarget: 1000000, note: 'FORCE reloaded every file. Dedup/MERGE restores finalTarget to expected; a normal re-run would have skipped loaded files entirely.' },
      lesson: 'Retries are already safe (loaded files are skipped). FORCE=TRUE is not a fix — it is how you duplicate data.' }),
  ];

  viz.P.snowflake.failureCases = { cases: CASES, byId(id) { return CASES.find(c => c.id === id); } };
})();
