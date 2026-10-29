export default {
  id: "banking-data-platform",
  title: "Design a banking data platform",
  icon: "🏦",
  chapter: 32,
  group: "End-to-end platforms",
  summary: "A banking platform inverts the usual priorities: correctness, auditability, and compliance come before raw scale. Every number must be exactly right and provable, every change traceable, and sensitive data tightly governed. The design centers on immutable history, reconciliation, lineage, and access control rather than throughput.",
  widget: "de-banking",
  widgetIntro: "Banking data is **correctness-first**. Money movements are recorded as **immutable, append-only** history (you never update a transaction — you post a compensating one), so the ledger is a provable audit trail. **Reconciliation** continuously checks the books balance (debits equal credits, platform totals match source), and everything is **lineage-tracked and access-controlled** for regulators. Throughput matters, but being exactly right and auditable matters more.\n\nWatch transactions append to an immutable ledger as balanced double-entry postings, with a reconciliation check confirming the books balance — and catching any that don't.",
  sections: [
    {
      title: "Requirements — correctness over scale",
      body: "The non-functional requirements lead. Numbers must be exactly correct (no approximate counts), every change auditable and immutable, sensitive data (PII, account data) tightly controlled, and the whole lineage explainable to regulators. Scale is real but secondary to being provably right.",
      bullets: [
        "Exactness: financial totals must be precise and reproducible.",
        "Auditability: every change traceable, nothing silently overwritten.",
        "Compliance: retention, access control, data residency, right-to-be-forgotten.",
        "Consistency over availability on the write path for money movements.",
      ],
    },
    {
      title: "Immutable, append-only history",
      body: "You never mutate a financial record. A correction is a new, compensating entry, so the full history is preserved and tamper-evident. Capture source transactions via CDC into an append-only store (a table-format table with full history, or an event-sourced ledger), giving a complete, replayable, auditable record you can reconstruct any point-in-time balance from.",
      flow: ["source transactions", "CDC (append-only)", "immutable ledger / event log", "derive balances & reports"],
      rules: ["Never update a financial record — append a compensating entry. Immutability is the audit guarantee."],
    },
    {
      title: "Reconciliation is continuous",
      body: "In banking, reconciliation isn't an occasional check — it's core. Double-entry accounting means debits must equal credits (every posting balances to zero); platform balances must match the source systems of record; and control totals are verified every cycle. A discrepancy is an incident, not a rounding note. This is reconciliation elevated to a first-class, always-on control.",
      rules: ["Debits = credits, platform = source, every cycle — a mismatch is an incident."],
    },
    {
      title: "Governance, lineage, and access",
      body: "Regulators ask 'where did this number come from and who can see this data'. So column-level lineage traces every figure back to source transactions, sensitive fields are classified and access is least-privilege (RBAC + row/column policy), everything is encrypted and audited, and retention/erasure policies are enforced. Governance isn't overhead here — it's a regulatory requirement.",
      bullets: [
        "Column-level lineage: trace every reported figure to source.",
        "Strict RBAC + row/column masking on sensitive account data.",
        "Encryption, full audit logs, and enforced retention/erasure.",
      ],
    },
    {
      title: "Consistency on the money path",
      body: "Where money moves, favor consistency over availability: use transactional/idempotent writes so a retry can't double-post, exactly-once-effective processing, and strong ordering of a account's events. It's acceptable for a report to be a little late; it's never acceptable for a balance to be wrong. That trade-off shapes the whole write path.",
      rules: ["On money movement, choose consistency and idempotency over availability and speed."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "A banking platform is the correctness-and-audit extreme of data engineering — immutability and reconciliation are the spine.",
  deepDive: [
    {
      title: "Immutability enables everything else",
      body: "An append-only, immutable history is what makes audit, point-in-time reconstruction, and reconciliation possible. Because nothing is overwritten, you can prove what the data was at any moment, replay to rebuild derived balances, and detect tampering. Mutable records would make the audit trail unprovable — which is why event-sourcing / append-only ledgers dominate here.",
      stats: [
        { value: "append-only", label: "immutable, tamper-evident", tone: "green" },
        { value: "debits = credits", label: "double-entry balances to zero", tone: "blue" },
        { value: "reconcile always", label: "platform = source, every cycle", tone: "amber" },
        { value: "column lineage", label: "every figure traceable to source", tone: "accent" },
      ],
    },
    {
      title: "Why the usual trade-offs flip",
      body: "Most data platforms optimize throughput and accept eventual consistency and approximate real-time counts. Banking flips this: exactness and auditability dominate, consistency beats availability on the money path, and governance is mandatory, not optional. The same building blocks (CDC, table formats, reconciliation, lineage, IAM) are used, but tuned for provable correctness instead of raw speed.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Immutable append-only history via CDC (never overwrite — post compensating entries), continuous reconciliation (debits = credits, platform = source), column-level lineage and strict RBAC for audit/compliance, and consistency + idempotency on the money path. Correctness and auditability first; scale second.\"" },
    },
  ],
  qa: [
    {
      q: "How does designing a banking data platform differ from a typical analytics platform?",
      a: "The priorities invert. A typical platform optimizes throughput and tolerates eventual consistency and approximate real-time numbers; a banking platform demands exactness (every figure precisely correct and reproducible), auditability (immutable, traceable history — nothing silently overwritten), strict governance and access control for compliance, and consistency over availability on the money path. You use the same building blocks — CDC, table formats, reconciliation, lineage, IAM — but tuned for provable correctness and audit rather than raw speed. A late report is fine; a wrong balance never is.",
      tip: "Correctness/auditability/compliance over throughput; consistency over availability on money movement.",
    },
    {
      q: "Why is immutable, append-only history central to a banking platform?",
      a: "Because it's what makes the data auditable and tamper-evident. You never update a financial record — a correction is a new compensating entry — so the complete history is preserved, you can reconstruct any point-in-time balance by replaying it, and any tampering is detectable. This is typically implemented by capturing transactions via CDC into an append-only store (a table-format table retaining full history, or an event-sourced ledger). Mutable records would make the audit trail unprovable, which regulators won't accept, so immutability is the foundation the rest of the controls rest on.",
      tip: "Immutable append-only = provable audit trail + point-in-time reconstruction; corrections are compensating entries.",
    },
    {
      q: "What role does reconciliation play, and why is it always-on?",
      a: "In banking, reconciliation is a first-class, continuous control, not an occasional check. It verifies that double-entry postings balance (debits equal credits, netting to zero), that the platform's balances match the source systems of record, and that control totals agree every cycle. Any discrepancy is treated as an incident and investigated, because an unreconciled difference means money is unaccounted for. Combined with immutable history (so you can trace and replay) and lineage (so you can explain a figure's origin), always-on reconciliation is how the platform proves, continuously, that its numbers are correct.",
      tip: "Continuous reconciliation: debits=credits + platform=source every cycle; a mismatch is an incident, not a note.",
    },
  ],
  related: [],
};
