// ── Tiered answers ("Level Up Your Answer") ──────────────────────────────────────
// The same interview question answered Weak → Good → Senior, with a note on what
// moves each answer up a level. Rendered by components/tiered.js.

export const TIERED = [
  {
    id: 'scale-reads',
    question: 'Your read-heavy service is getting slow under load. How do you scale it?',
    tiers: [
      { level: 'Weak', answer: 'Add a bigger server with more CPU and RAM.',
        note: 'Vertical scaling only — hits a ceiling, leaves a single point of failure, and ignores that the problem is reads.' },
      { level: 'Good', answer: 'Add read replicas behind a load balancer and put a cache in front of the database so most reads never hit it.',
        note: 'Correct instincts (replicas + cache), but no numbers, no mention of staleness, and no sizing of the hot set.' },
      { level: 'Senior', answer: 'First quantify: what is the read:write ratio and the hot-key distribution? For a read-heavy, skewed workload I’d add a cache-aside layer sized to the ~20% of data serving ~80% of reads, with a TTL that bounds staleness to what the product tolerates, and read replicas for the long tail. I’d watch cache hit ratio and replica lag, and call out read-your-own-writes: route a user’s reads to the primary (or a session cache) briefly after they write.',
        note: 'Leads with measurement, sizes the cache, names the consistency pitfall (read-your-writes), and says what to monitor. That is the senior signal.' },
    ],
    takeaway: 'Seniority shows up as: quantify first, size deliberately, and name the failure mode (here, stale/own-write reads) before the interviewer does.',
    see: 'scaling-zero-to-millions',
  },
  {
    id: 'idempotency',
    question: 'How do you make sure a payment API never double-charges on a retry?',
    tiers: [
      { level: 'Weak', answer: 'Check if the payment already exists before charging.',
        note: 'A read-then-write check is itself racy — two concurrent retries can both pass the check and both charge.' },
      { level: 'Good', answer: 'Use an idempotency key: the client sends a unique key, and we store it so a repeated request returns the stored result instead of charging again.',
        note: 'The right mechanism, but doesn’t mention atomicity, the provider’s own idempotency, or crash-in-the-middle.' },
      { level: 'Senior', answer: 'The network is at-least-once, so I make the effect exactly-once. The client sends an idempotency key; I persist it with the operation outcome in the same transaction that records the charge, so a retry returns the stored result atomically — no race. I pass an idempotency key to the PSP too, since it dedupes on its side. I persist the payment in a PENDING state before calling the PSP, so if we crash mid-call, recovery queries the PSP for the real outcome rather than guessing. And the ledger is append-only so every attempt is auditable.',
        note: 'Frames it as "at-least-once network → exactly-once effect", handles the crash window, pushes idempotency to the PSP, and ties in the ledger. Complete.' },
    ],
    takeaway: 'The jump to senior is handling the ugly middle: concurrency (atomic store), partial failure (crash after calling the provider), and auditability — not just naming "idempotency key".',
    see: 'payment-system',
  },
  {
    id: 'consistency',
    question: 'Would you use strong or eventual consistency for this feature?',
    tiers: [
      { level: 'Weak', answer: 'Strong consistency, so the data is always correct.',
        note: 'Treats consistency as free. Strong consistency costs latency and availability — it is not a default to reach for everywhere.' },
      { level: 'Good', answer: 'It depends on the feature — use eventual consistency for things like view counts and strong consistency for things like account balances.',
        note: 'Right framing with examples, but doesn’t tie the choice to a concrete requirement or the CAP trade-off.' },
      { level: 'Senior', answer: 'I choose the weakest model the product can tolerate, because stronger consistency trades away latency and availability under partition (CAP). For a like count or feed, eventual consistency is fine and buys scale. For a wallet balance or inventory, I need strong consistency (or at least a conditional atomic update) because a stale read means lost money or overselling. I’d also consider middle grounds — read-your-own-writes for a user’s own edits — rather than making the whole system strongly consistent.',
        note: 'Defaults to the weakest acceptable model, justifies via CAP, and knows the middle options (read-your-writes) instead of a binary choice.' },
    ],
    takeaway: 'Senior answers treat consistency as a per-feature cost/benefit tied to CAP — and know the spectrum between "strong" and "eventual", not just the two ends.',
    see: 'key-value-store',
  },
  {
    id: 'ratelimit',
    question: 'How would you add rate limiting to a public API?',
    tiers: [
      { level: 'Weak', answer: 'Count requests per user and block them when they go over the limit.',
        note: 'No algorithm, no placement, no cross-server story, and no idea what to return to the client.' },
      { level: 'Good', answer: 'Use a token-bucket limiter at the API gateway, keyed per user, and return HTTP 429 when the bucket is empty.',
        note: 'Solid: names an algorithm, the right placement, and the status code. Missing the distributed-correctness and client-contract details.' },
      { level: 'Senior', answer: 'Token bucket at the gateway (capacity = burst, refill = sustained rate), keyed per tenant so bad traffic dies before it reaches app servers. Across a fleet I keep the counter in Redis with an atomic check-and-decrement (a Lua script), because a naive read-modify-write under-counts when two servers race. I return 429 with Retry-After plus rate-limit headers so well-behaved clients self-throttle, and I pair that with an expectation of client-side exponential backoff + jitter — otherwise a 429 just becomes a retry storm.',
        note: 'Adds the distributed race (atomic op), the client contract (Retry-After + backoff), and placement rationale. That completeness is the senior tell.' },
    ],
    takeaway: 'Beyond naming the algorithm, senior answers cover the distributed race condition and the client-side half of the contract (backoff) — the parts that actually break in production.',
    see: 'rate-limiter',
  },
  {
    id: 'failure',
    question: 'What happens to your system when a database node fails?',
    tiers: [
      { level: 'Weak', answer: 'We restart it and restore from a backup.',
        note: 'Implies downtime and data loss up to the last backup. No redundancy, no automatic recovery.' },
      { level: 'Good', answer: 'We run replicas, so if the primary fails a replica is promoted and the service keeps running.',
        note: 'Redundancy and failover — good. Doesn’t address the failover window, data loss, or how clients cope during it.' },
      { level: 'Senior', answer: 'With leader-follower replication and RF≥3, a controller detects the dead node via missed heartbeats and promotes an in-sync replica; clients retry with backoff during the few-second failover window. The real question is durability vs availability: with synchronous replication to a quorum I lose no acknowledged writes but pay latency; with async I’m faster but can lose the last unreplicated writes. For money I choose durability (never promote a lagging replica — stay unavailable instead); for metrics I’d accept the loss to stay available. I’d monitor under-replicated partitions as the early-warning signal.',
        note: 'Names the failover mechanism and window, frames the durability-vs-availability trade-off per data type, and gives the metric to watch. Senior.' },
    ],
    takeaway: 'The senior leap is treating node failure as a durability-vs-availability decision that differs by data type — and knowing the signal (under-replication) that warns you before the next failure.',
    see: 'key-value-store',
  },
];
