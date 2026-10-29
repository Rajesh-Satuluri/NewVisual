export default {
  id: "payment-system",
  title: "Design a payment system",
  icon: "💳",
  chapter: 26,
  group: "Money & real-time",
  summary: "Move money correctly: charge a buyer, pay a seller, and never lose, duplicate, or mis-record a cent. Correctness and auditability dominate — idempotency, a double-entry ledger, reconciliation with external providers, and handling partial failures are the whole game.",
  sections: [
    {
      title: "Requirements",
      body: "Accept payments, track their state, settle funds, and keep an auditable record — with absolute correctness.",
      bullets: [
        "Process a payment (buyer → platform → seller).",
        "Exactly-once effect: never double-charge or double-pay.",
        "Durable, auditable record of every money movement.",
        "Handle failures, retries, refunds, and reconciliation with banks/PSPs.",
      ],
    },
    {
      title: "The flow & the PSP",
      body: "You don't touch raw card data yourself — you integrate a **Payment Service Provider** (Stripe, Adyen, PayPal) that handles card networks and compliance (PCI). Your system orchestrates: create a payment intent, call the PSP, record the result, and update order/seller state. The PSP's response may be async (webhooks) for methods that settle later.",
      flow: ["Checkout", "Create payment (your DB)", "Call PSP", "PSP → card network", "Record result + webhook", "Update order / payout"],
    },
    {
      title: "Idempotency — the #1 rule",
      body: "Networks retry; users double-click; webhooks redeliver. Every payment operation must be **idempotent**: the client sends an idempotency key, you store it with the outcome, and a repeat request returns the stored result instead of charging again. PSPs themselves accept idempotency keys for exactly this reason — pass one through.",
      rules: ["Idempotency key on every charge → retries and redeliveries never double-charge."],
    },
    {
      title: "The double-entry ledger",
      body: "Money is tracked in a **double-entry ledger**: every transaction is recorded as balanced debits and credits across accounts, and entries are **append-only and immutable** (corrections are new reversing entries, never edits). This makes the system auditable and makes it impossible to 'lose' money — the books must always balance.",
      bullets: [
        "Every movement = a debit on one account + a credit on another (sum to zero).",
        "Append-only: never mutate an entry; reverse with a new one.",
        "Account balances are derived from (or reconciled against) the ledger.",
      ],
      rules: ["Debits = credits, always. Immutable entries → a provable audit trail."],
    },
    {
      title: "State machine & partial failures",
      body: "A payment moves through explicit states — PENDING → AUTHORIZED → CAPTURED → SETTLED (or FAILED/REFUNDED). Persist the state before calling the PSP so a crash mid-call is recoverable: on restart you query the PSP for the actual outcome rather than guessing. This avoids the classic 'charged the customer but lost our record' failure.",
      flow: ["PENDING (persist first)", "Call PSP", "AUTHORIZED / CAPTURED", "Crash? → query PSP for truth", "SETTLED / FAILED"],
    },
    {
      title: "Reconciliation",
      body: "Even with care, your records and the PSP's/bank's can drift (missed webhook, timeout). Run a scheduled **reconciliation** job that compares your ledger against the provider's settlement reports and flags/fixes discrepancies. Reconciliation is the safety net that guarantees the books match reality — non-negotiable in payments.",
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Payments are where \"it usually works\" isn't good enough. Here are the three failure moments that define the design — a double-click, a crash mid-charge, and a lost webhook — and exactly how idempotency, state, and reconciliation handle each.",
  deepDive: [
    {
      title: "The network is at-least-once; the effect must be exactly-once",
      body: "Every hard part of a payment system comes from one fact: requests, retries and webhooks can all happen **more than once**. The whole design is about making duplicates harmless.",
      stats: [
        { value: "≥1", label: "times any request may arrive", tone: "amber" },
        { value: "=1", label: "times money may actually move", tone: "green" },
        { value: "0", label: "acceptable lost or duplicated charges", tone: "red" },
      ],
    },
    {
      title: "Three failure moments, three mechanisms",
      timeline: [
        { t: "double-click", icon: "🖱️", tone: "warn", title: "User submits twice", detail: "Both requests carry the same idempotency key. The first charges; the second finds the stored outcome and returns it — no second charge. The PSP is also sent the key as a second line of defense." },
        { t: "crash", icon: "💥", tone: "bad", title: "Service dies right after calling the PSP", detail: "The payment was persisted as PENDING before the call, so on restart we know a call was in flight. We query the PSP for the authoritative result instead of guessing — avoiding the 'charged them but lost our record' disaster." },
        { t: "webhook lost", icon: "📭", tone: "warn", title: "A settlement webhook never arrives", detail: "Our record and the PSP's drift. The scheduled reconciliation job compares our ledger to the PSP's settlement report, spots the gap, and posts the correcting entry." },
        { t: "settled", icon: "✅", tone: "good", title: "Books balance", detail: "Idempotency stopped duplicates, state recovery handled the crash, reconciliation caught the drift. Every cent is accounted for and auditable." },
      ],
    },
    {
      title: "On crash recovery: never guess",
      compare: {
        title: "Service crashed after calling the PSP — now what?",
        cols: [
          { title: "Guess (re-charge or assume failure)", tone: "bad", body: "Act on an assumption about what the PSP did.", points: [
            "Re-charge → you double-charge the customer.",
            "Assume failure → you ship goods you were never paid for.",
            "Either way the books are wrong.",
          ] },
          { title: "Persist PENDING, then query the PSP", tone: "good", body: "The PSP is the source of truth for what actually happened.", points: [
            "PENDING written before the call tells you a charge was in flight.",
            "On restart, ask the PSP (by idempotency key) for the real outcome.",
            "Reconcile your record to it — no double charge, no phantom.",
          ] },
        ],
      },
    },
    {
      title: "Why a ledger, not a balance column",
      body: "Money is tracked as **append-only, double-entry** ledger lines — balanced debits and credits that always sum to zero. You never edit an entry; you post a reversing one. That gives a provable audit trail and makes it structurally impossible to silently 'lose' money.",
      callouts: [
        { tone: "key", label: "State machine:", body: "PENDING → AUTHORIZED → CAPTURED → SETTLED (or FAILED / REFUNDED). Persisting state before each external call is what makes recovery deterministic." },
        { tone: "tip", label: "The one-liner:", body: "\"Idempotency keys for duplicates, persisted state + query-the-PSP for partial failures, and reconciliation for drift — on top of an immutable double-entry ledger.\" That's the senior answer in a sentence." },
      ],
    },
  ],
  qa: [
    {
      q: "How do you guarantee a customer is never double-charged?",
      a: "Idempotency end to end. The client includes an idempotency key on the payment request; you record that key with the operation's outcome, so any retry (user double-click, network retry, webhook redelivery) returns the stored result instead of charging again. Pass an idempotency key to the PSP too, since it dedupes on its side. Combined with persisting the payment's state before calling the PSP, this makes charges effectively exactly-once even though the network is at-least-once.",
      tip: "Idempotency key (yours + the PSP's) is the headline; 'the network is at-least-once, so make the effect exactly-once' is the framing.",
    },
    {
      q: "Why a double-entry ledger instead of just updating account balances?",
      a: "Because money must be auditable and conserved. In double-entry, every transaction is balanced debits and credits across accounts, and entries are append-only and immutable — you never edit or delete, you post reversing entries. That gives a provable audit trail, makes it structurally impossible to 'lose' money (debits must equal credits), and lets you reconstruct any balance at any point in time. A single mutable balance column has no history and silently hides errors.",
      tip: "Append-only, balanced, immutable = auditability + conservation of money. That's why every real payment system uses a ledger.",
    },
    {
      q: "What happens if your service crashes right after calling the PSP?",
      a: "You must not guess. Persist the payment in a PENDING state before calling the PSP, so after a crash you know a call was in flight. On recovery, query the PSP (by your idempotency key / payment ID) for the authoritative outcome and reconcile your record to it, rather than re-charging or assuming failure. The explicit state machine (PENDING→AUTHORIZED→CAPTURED→SETTLED/FAILED) plus 'the PSP is the source of truth for what actually happened' prevents the 'charged them but lost our record' disaster.",
      tip: "'Persist intent first, then query the PSP for truth on recovery' is the exact answer to the partial-failure trap.",
    },
    {
      q: "Why is reconciliation necessary if you already have idempotency and a ledger?",
      a: "Because external systems are imperfect: webhooks get missed, requests time out after the PSP succeeded, settlement amounts include fees or currency adjustments. Reconciliation is a scheduled job that compares your ledger against the provider's/bank's settlement reports, flags discrepancies, and triggers corrections (reversing entries, retried captures). It's the independent check that catches anything the happy path missed — in payments you assume drift will happen and build the safety net to detect it.",
      tip: "Framing reconciliation as 'assume drift happens; detect and correct it' shows real payments maturity.",
    },
  ],
  related: [
    "idempotency-write-apis",
    "how-do-i-implement-distributed-transactions-without-2pc-pain",
    "how-do-i-design-an-outbox-inbox-pattern-for-reliable-events",
    "how-do-i-reconcile-divergent-data-across-systems",
    "how-do-i-handle-partial-failures-in-multi-service-calls",
  ],
};
