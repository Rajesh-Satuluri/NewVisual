export default {
  id: "data-quality",
  title: "Data quality & validation",
  icon: "✅",
  chapter: 23,
  group: "Performance & quality",
  summary: "Bad data silently corrupts every downstream metric, so pipelines gate incoming data against explicit rules — schema, null, range, uniqueness, referential — and quarantine failures instead of dropping them silently. Validation at the raw→clean boundary is what makes the rest of the warehouse trustworthy.",
  widget: "de-quality",
  widgetIntro: "Data quality is enforced with **validation gates**: each record is checked against rules — is the schema right, are required fields non-null, are values in range, is the key unique — and a failing record is **quarantined** (written to a reject table with the reason), not silently dropped. Silent drops hide problems; quarantine makes them measurable and fixable.\n\nWatch records stream through the gates: most pass to the clean table, some fail a check and are routed to quarantine. The pass rate and failure reasons are themselves a monitored signal.",
  sections: [
    {
      title: "Why validate at all",
      body: "Sources lie: nulls where you expect values, out-of-range numbers, duplicate keys from retries, schema drift from an upstream change. If bad rows flow straight into your tables, every downstream aggregate is quietly wrong — and you find out from a confused stakeholder, not an alert. Validation turns silent corruption into a visible, catchable event.",
      rules: ["Unvalidated bad data doesn't error — it silently skews results. Gate it at the boundary."],
    },
    {
      title: "The common checks",
      body: "Data-quality rules fall into a few recurring categories you apply at the raw→clean (Bronze→Silver) boundary.",
      table: {
        head: ["Check", "Catches"],
        rows: [
          ["Schema / type", "Wrong columns or types; upstream schema drift"],
          ["Not-null", "Missing required fields"],
          ["Range / domain", "Impossible values (negative age, bad enum)"],
          ["Uniqueness", "Duplicate primary keys"],
          ["Referential", "Foreign keys with no matching dimension row"],
          ["Freshness / volume", "Stale data or an unexpected row-count drop"],
        ],
      },
    },
    {
      title: "Quarantine, don't drop",
      body: "When a row fails, route it to a **reject/dead-letter table** with the failing rule and the raw payload — never silently discard it. That makes data quality measurable (how many failed, why) and recoverable (fix the rule or the source, then reprocess the quarantine). A pipeline that silently drops 5% of rows is worse than one that fails loudly, because nobody knows the 5% is gone.",
      flow: ["record", "validation gates", "pass → clean table", "fail → quarantine (with reason)"],
      rules: ["Quarantine failures with the reason; silent drops hide the very problem you're trying to catch."],
    },
    {
      title: "Where to fail vs warn",
      body: "Not every rule should halt the pipeline. Hard constraints (broken schema, duplicate PKs) should fail or quarantine; soft signals (a slightly low row count, a rising null rate) should alert but let data flow. Frameworks like Great Expectations / dbt tests / Deequ let you declare these expectations as code, version them, and run them as a pipeline stage — turning quality into a tested, enforced contract.",
      bullets: [
        "**Block/quarantine:** schema breaks, uniqueness, referential integrity.",
        "**Warn/monitor:** freshness, volume anomalies, drifting distributions.",
        "Declare expectations as versioned tests that run as a pipeline step.",
      ],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Data quality is a contract enforced at a boundary, with observability on the failures themselves.",
  deepDive: [
    {
      title: "Quality as a monitored signal",
      body: "The pass/fail rate and per-rule failure counts are metrics you track over time, not just a go/no-go. A sudden spike in a null check or a drop in volume is an early warning that an upstream system changed — often before any dashboard looks wrong. So validation output feeds monitoring: trends in quarantine are leading indicators of pipeline health.",
      stats: [
        { value: "gate at boundary", label: "raw → clean (Bronze → Silver)", tone: "green" },
        { value: "quarantine", label: "reject table + reason, not drop", tone: "amber" },
        { value: "expectations", label: "versioned tests as code", tone: "blue" },
        { value: "trend the failures", label: "quality is a monitored metric", tone: "accent" },
      ],
    },
    {
      title: "Garbage in, garbage out — contained",
      body: "You can't make a source stop sending bad data, but you can contain it: validate at ingestion so the clean layer is trustworthy by construction, quarantine the rest for repair, and alert on quality trends. Downstream consumers then build on Silver knowing it meets the contract, instead of each re-implementing defensive checks.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Validate at the raw→clean boundary with declared expectations (schema, null, range, uniqueness, referential), quarantine failures with their reason rather than dropping them, and trend the failure rates as a health signal. The clean layer is then trustworthy by contract.\"" },
    },
  ],
  qa: [
    {
      q: "What kinds of data-quality checks do you run, and where?",
      a: "At the raw→clean (Bronze→Silver) boundary, you run schema/type checks (catch drift and wrong types), not-null checks on required fields, range/domain checks for impossible values, uniqueness checks for duplicate primary keys, referential checks for orphan foreign keys, and freshness/volume checks for stale data or unexpected row-count changes. Validating at that boundary means the clean layer downstream is trustworthy by construction, so consumers don't each re-implement defensive logic.",
      tip: "List the check categories (schema/null/range/uniqueness/referential/freshness) and place them at the raw→clean gate.",
    },
    {
      q: "Why quarantine failing rows instead of dropping them?",
      a: "Because silently dropping bad rows hides the exact problem you're trying to catch — a pipeline that discards 5% of records produces quietly wrong aggregates and nobody knows the data is missing. Quarantining routes failures to a reject/dead-letter table with the failing rule and raw payload, which makes quality measurable (how many failed and why) and recoverable (fix the rule or source, then reprocess the quarantine). It turns a silent data loss into a visible, fixable event.",
      tip: "Silent drops hide corruption and loss; quarantine makes failures measurable and recoverable.",
    },
    {
      q: "Should every quality check fail the pipeline?",
      a: "No — distinguish hard constraints from soft signals. Hard violations like a broken schema, duplicate primary keys, or referential integrity failures should block or quarantine, because downstream correctness depends on them. Soft signals like a slightly low row count, a rising null rate, or a drifting distribution should alert and be monitored but usually let data flow, since halting on every anomaly causes more harm than the anomaly. Declaring these as versioned expectations (Great Expectations, dbt tests, Deequ) lets you set the severity per rule and trend the failures over time.",
      tip: "Block on hard constraints (schema/uniqueness/referential), warn+monitor on soft signals (volume/null-rate/drift).",
    },
  ],
  related: [],
};
