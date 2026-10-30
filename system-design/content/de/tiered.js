// ── DE Tiered answers ("Level Up Your Answer") ───────────────────────────────────
// The same data-engineering question answered Weak → Good → Senior, with a note on
// what moves each answer up a level. Rendered by components/tiered.js.

export const TIERED = [
  {
    id: 'slow-query',
    question: 'A dashboard query over a huge table is slow. How do you speed it up?',
    tiers: [
      { level: 'Weak', answer: 'Give the warehouse a bigger cluster / more compute.',
        note: 'Throws hardware at a full scan — cost scales linearly and the scan is still a scan. Treats symptom, not cause.' },
      { level: 'Good', answer: 'Partition the table by date so the query prunes to the range it filters on, and store it as Parquet so it only reads the columns it needs.',
        note: 'Right instincts — pruning + columnar — but no file sizing, no pre-aggregation, and no way to confirm it actually worked.' },
      { level: 'Senior', answer: 'First read the scanned-bytes metric to see what the query actually reads. Partition on the date column it filters by, compact to ~128MB–1GB files to kill small-file overhead, and cluster or Z-order the common secondary filter so min/max stats skip files. For repeated rollups I’d materialize a gold aggregate refreshed incrementally. Then re-check scanned-bytes dropped. Fix the layout before adding compute — layout cuts the work permanently, compute just brute-forces it.',
        note: 'Leads with measurement, attacks bytes-scanned via layout (partition + file size + clustering + materialization), and verifies — then treats compute as the last lever, not the first.' },
    ],
    takeaway: 'Seniority is cutting the data scanned through layout first, led by the scanned-bytes metric — compute is the last lever, not the reflex.',
    see: 'warehouse-tuning',
  },
  {
    id: 'idempotent-pipeline',
    question: 'Your nightly job sometimes runs twice and duplicates rows. How do you fix it?',
    tiers: [
      { level: 'Weak', answer: 'Add a cleanup step that deletes duplicates after the run.',
        note: 'Patches the symptom downstream; the dedup is itself racy and breaks the moment two runs overlap. The job is still not safe to re-run.' },
      { level: 'Good', answer: 'Make the job idempotent — overwrite the day’s partition instead of appending to it.',
        note: 'The right core idea (own and overwrite the partition), but misses atomic publish, keying by logical date, and overlapping-run concurrency.' },
      { level: 'Senior', answer: 'Key every task by its logical execution date, not now(), so a rerun or backfill processes exactly one partition deterministically. Write output to staging, then atomically swap the partition (INSERT OVERWRITE), or MERGE on the business key where it isn’t cleanly partitioned — so re-applying identical rows is a no-op. No random ids or now() in the logic, and bound concurrency so a slow run can’t overlap the next and fight over the same partition. Then running once or five times yields identical data.',
        note: 'Makes each run *define* its output (overwrite/MERGE), publishes atomically, removes non-determinism, and guards concurrency — so reruns and backfills are safe by construction, not by cleanup.' },
    ],
    takeaway: 'Idempotency means each run defines its output (overwrite-by-partition or MERGE + atomic publish), keyed by logical date — never append-then-dedup.',
    see: 'idempotent-pipelines',
  },
  {
    id: 'late-events',
    question: 'Events arrive late and out of order in your streaming aggregation. How do you handle it?',
    tiers: [
      { level: 'Weak', answer: 'Process each event by the time it arrives.',
        note: 'Processing-time windows put late events in the wrong bucket, so the aggregates are simply wrong whenever anything is delayed.' },
      { level: 'Good', answer: 'Window by event time and use a watermark to decide when a window is complete.',
        note: 'Correct mechanism, but doesn’t say how long to wait for stragglers or what to do with the ones that still arrive too late.' },
      { level: 'Senior', answer: 'Window on event time and track event-time progress with a watermark that closes windows. Allow a bounded grace period for late data before emitting, then route anything later than the grace to a side output for reconciliation rather than dropping it silently. The grace period is an explicit latency-vs-completeness trade-off — short for fast results, longer for correctness — and a periodic batch recompute can be the source of truth the stream reconciles against.',
        note: 'Adds the bounded grace period, a side output for true stragglers, the explicit latency/completeness trade-off, and a batch reconciliation backstop — the parts that make event-time windowing actually correct in production.' },
    ],
    takeaway: 'Event-time windows + a watermark + a bounded grace period, with a side output (and batch reconciliation) for stragglers — not processing-time, not silent drops.',
    see: 'watermarking',
  },
  {
    id: 'data-quality',
    question: 'How do you keep bad data from reaching dashboards?',
    tiers: [
      { level: 'Weak', answer: 'Check the output after the run and fix problems when someone notices.',
        note: 'Manual, reactive, and unscalable — bad data has already reached consumers by the time anyone looks.' },
      { level: 'Good', answer: 'Add data quality checks (not-null, unique, ranges, referential) in the pipeline and fail the run on violations.',
        note: 'Right to assert expectations in-pipeline, but failing the whole batch on one bad row is blunt, and pass/fail alone gives no trend or drift visibility.' },
      { level: 'Senior', answer: 'Assert expectations at each layer and quarantine failing rows to a dead-letter table so good data still flows while bad data is reviewed and replayed. Record quality results and column distributions as data so I can alert on drift and schema changes, not just hard failures. Publish freshness and completeness SLAs that consumers can see, and reconcile source-to-target counts so silent loss or duplication is caught. Unit-test transforms in CI and run data tests in prod — code tests and data tests together.',
        note: 'Quarantines instead of halting, treats quality as measured data (drift, SLAs), reconciles counts, and separates code tests from data tests — a system, not a gate.' },
    ],
    takeaway: 'Senior quality is a system: quarantine (don’t halt), measure quality as data (drift + SLAs), reconcile counts, and run data tests in prod — not a single pass/fail gate.',
    see: 'data-quality',
  },
  {
    id: 'lake-vs-warehouse',
    question: 'Would you build the platform on a data lake or a warehouse?',
    tiers: [
      { level: 'Weak', answer: 'A warehouse — it’s easier to query with SQL.',
        note: 'Picks on one dimension and ignores data shape, ML workloads, cost at scale, and openness/lock-in.' },
      { level: 'Good', answer: 'It depends — a warehouse for structured BI, a lake for cheap storage of raw and semi-structured data and for ML.',
        note: 'Right framing with the key trade-off, but doesn’t mention the lakehouse that unifies them or the lock-in/cost dimensions.' },
      { level: 'Senior', answer: 'I choose by workloads and data shape. Governed SQL/BI on structured data leans warehouse; a mix of BI, ML, and semi-structured data at scale leans a lakehouse — an open table format (Delta/Iceberg/Hudi) over object storage — so I get ACID and governance without copying data between systems, and storage separated from compute for elastic cost. I’d also weigh openness versus lock-in and the team’s operational maturity, since a lakehouse asks more of the platform team than a managed warehouse does.',
        note: 'Decides on workload + data shape, reaches for the lakehouse to resolve the BI-vs-ML split, and names the cost/openness/maturity trade-offs instead of a binary pick.' },
    ],
    takeaway: 'Choose by workload, data shape, and cost/openness — the lakehouse (open table format on object storage) often resolves the BI-versus-ML split a binary choice forces.',
    see: 'table-formats',
  },
];
