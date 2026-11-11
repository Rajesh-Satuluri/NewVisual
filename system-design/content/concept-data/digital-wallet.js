export default {
  id: "digital-wallet",
  title: "Design a digital wallet",
  icon: "👛",
  chapter: 27,
  group: "Money & real-time",
  summary: "Hold balances and move money between users (PayPal/Venmo style) with correctness under concurrency. The crux is atomic balance transfers — debit one wallet and credit another with no partial state — built on a double-entry ledger, often across shards.",
  widget: "cap",
  widgetIntro: "A wallet is the textbook case where the **CAP** trade-off is already decided for you. When a network partition splits your replicas, you must choose: keep serving and risk two conflicting balances (**AP**), or refuse writes you can't confirm and stay correct (**CP**). For money, a double-spend is unacceptable — wallets choose **CP**: reject the transfer rather than let a balance diverge.\n\nTrigger a partition and pick what to sacrifice. Choosing availability shows the anomaly a wallet can never tolerate; choosing consistency shows the (correct) cost — some requests fail until the partition heals.",
  sections: [
    {
      title: "Requirements",
      body: "Store user balances and transfer funds between wallets reliably, with an auditable history and no money created or destroyed.",
      bullets: [
        "Check balance; transfer money A → B.",
        "A transfer is atomic: debit A and credit B both happen, or neither.",
        "Correct under concurrency (no overspending the same balance twice).",
        "Auditable, with high throughput.",
      ],
    },
    {
      title: "Ledger-based balances",
      body: "As with payments, use a **double-entry ledger**: a transfer is a debit on A and a matching credit on B (summing to zero), recorded as immutable, append-only entries. A wallet's balance is the sum of its ledger entries (often cached/materialized for speed). This guarantees money is conserved and every movement is auditable.",
      rules: ["Transfer = debit A + credit B (balanced). Balance = sum of immutable ledger entries."],
    },
    {
      title: "The atomicity problem",
      body: "A transfer touches two accounts. It must be **all-or-nothing**: you can never debit A without crediting B (money vanishes) or credit B without debiting A (money created). If both wallets live in one database, a single **ACID transaction** does this cleanly — debit, credit, and ledger entries commit together.",
      flow: ["BEGIN", "Debit A (check sufficient funds)", "Credit B", "Write ledger entries", "COMMIT (all or nothing)"],
    },
    {
      title: "Concurrency: don't let one balance be spent twice",
      body: "Two concurrent transfers from A could both read the same balance and both succeed, overdrawing it. Prevent it with row-level locking (`SELECT … FOR UPDATE` on A's balance) or an optimistic version check, so the debits serialize and the second sees the updated balance. A conditional update (`UPDATE … SET balance = balance - amt WHERE balance >= amt`) is a clean atomic guard against overdraft.",
      rules: ["Lock or conditionally update the balance so concurrent debits can't both overdraw it."],
    },
    {
      title: "When wallets are on different shards",
      body: "At scale, A and B may live in different database shards, so a single local transaction isn't possible. Options: two-phase commit (2PC) — correct but slow and fragile — or, more commonly, a **Saga** with an outbox: perform the debit locally and emit an event; a second step performs the credit; failures trigger compensating transactions (refund the debit). Make each step **idempotent** so retries are safe.",
      bullets: [
        "2PC: strong but blocking, a coordinator SPOF — usually avoided.",
        "Saga + outbox: debit → event → credit, with compensation on failure.",
        "Every step idempotent; the ledger makes partial states visible and reversible.",
      ],
      flow: ["Debit A (local txn) + outbox event", "Deliver event", "Credit B (idempotent)", "Failure → compensate (reverse debit)"],
    },
    {
      title: "Reliability patterns",
      body: "Use the **outbox pattern** so the debit and its event are committed atomically (no lost events). Make transfers idempotent via a transfer ID so retries don't double-move funds. Reconcile balances against the ledger periodically. Accept that cross-shard transfers are eventually consistent for a brief window while the saga completes.",
    },
  ],
  qa: [
    {
      q: "How do you make a transfer atomic — debit and credit together?",
      a: "If both wallets are in the same database, wrap the debit, the credit, and the ledger entries in one ACID transaction so they commit all-or-nothing — money can never be debited without being credited. Represent it in a double-entry ledger (balanced debit + credit, immutable entries) so the books always sum to zero and every transfer is auditable and reversible. The single transaction is the simplest correct answer when sharding doesn't force your hand.",
      tip: "Lead with 'one ACID transaction + double-entry ledger' for the single-DB case before complicating with shards.",
    },
    {
      q: "How do you prevent someone from spending the same balance twice concurrently?",
      a: "Serialize the debits on that account. Either take a row lock (`SELECT … FOR UPDATE` on the wallet) so a second concurrent transfer waits and then sees the reduced balance, or use a conditional atomic update (`UPDATE wallet SET balance = balance - amt WHERE balance >= amt`) that succeeds for only one of the racers and fails (zero rows) for the overdrawing one. Optimistic locking with a version column and retry is another valid approach. The database enforces the invariant.",
      tip: "Conditional `balance >= amt` update or `SELECT FOR UPDATE` — same family as the hotel 'last room' answer.",
    },
    {
      q: "What if the two wallets are on different shards/databases?",
      a: "A single local transaction isn't possible, so you coordinate. Two-phase commit is correct but blocking and introduces a coordinator single point of failure, so it's usually avoided at scale. The common pattern is a Saga with the outbox pattern: debit A in a local transaction and atomically emit an event, then credit B in its own idempotent step; if a step fails, run a compensating transaction (reverse the debit). Idempotency (keyed by transfer ID) makes retries safe, and the ledger makes any intermediate state visible and reversible. The trade-off is brief eventual consistency during the saga.",
      tip: "Saga + outbox + compensation + idempotency is the modern answer; mention 2PC only to explain why you avoid it.",
    },
    {
      q: "How does the outbox pattern help here?",
      a: "It solves the 'dual write' problem: you need to both update the database (the debit) and publish an event (to trigger the credit), but doing them as two separate operations risks one succeeding and the other failing. With the outbox, you write the debit and an event row into the same local transaction, so they commit together atomically; a separate process then reliably publishes events from the outbox table. That guarantees no lost or phantom events driving the second leg of the transfer.",
      tip: "Outbox = atomic 'state change + event' in one local transaction, solving dual-write — essential for reliable sagas.",
    },
  ],
  related: [
    "how-do-i-implement-distributed-transactions-without-2pc-pain",
    "how-do-i-design-an-outbox-inbox-pattern-for-reliable-events",
    "idempotency-write-apis",
    "when-do-i-accept-eventual-consistency-vs-strict-consistency",
    "how-do-i-reconcile-divergent-data-across-systems",
  ],
};
