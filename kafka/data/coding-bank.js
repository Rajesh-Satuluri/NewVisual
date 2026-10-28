// Coding Dojo — the Kafka/data-engineering coding practice bank.
//
// This platform has no code execution (that's a backend concern, out of
// scope — see the honesty ledger). So each problem here is study-grade: a
// prompt, a worked example, progressive hints, an idiomatic reference
// solution with a walkthrough, its complexity, and — the part interviews
// actually probe — how the pure-Python answer becomes a real Kafka pipeline
// (partitioning, offsets, retries, restart recovery). The learner thinks,
// writes in a scratchpad (notes only, never run), then self-rates.
//
// Each entry:
//   { id, title, level (1–4), category, difficulty, tags[],
//     prompt, example:{input,output}, starter,
//     hints[], solution:{code,walkthrough}, complexity, kafkaFollowup }
//
// Content is trusted in-repo HTML. Solutions are Python (the interview target).

export const CODING_BANK = [
  // ── Level 1 — Python + event processing ──────────────────────────────────
  {
    id: 'c01',
    title: 'Deduplicate Kafka events by event_id',
    level: 1,
    category: 'Dedup',
    difficulty: 'easy',
    tags: ['set', 'idempotency', 'ordering'],
    prompt: `Given a list of events, remove duplicates by <code>event_id</code>, <strong>preserving the first occurrence</strong> and the original order.`,
    example: {
      input: `events = [
    {"event_id": "E1", "amount": 100},
    {"event_id": "E2", "amount": 200},
    {"event_id": "E1", "amount": 100},
    {"event_id": "E3", "amount": 300},
]`,
      output: `# E1, E2, E3  (in that order)
[{"event_id": "E1", ...}, {"event_id": "E2", ...}, {"event_id": "E3", ...}]`,
    },
    starter: `def dedup(events):
    # return events with duplicate event_ids removed, first occurrence kept
    ...`,
    hints: [
      'Order matters, so you can\'t just build a dict and return its values in an arbitrary way — though in modern Python dict insertion order is preserved, which is a clean trick here.',
      'Track the ids you\'ve already emitted in a set; append an event only when its id is new.',
      'One pass, O(n): `seen = set()`, iterate, `if eid not in seen: seen.add(eid); out.append(e)`.',
    ],
    solution: {
      code: `def dedup(events):
    seen = set()
    out = []
    for e in events:
        eid = e["event_id"]
        if eid not in seen:
            seen.add(eid)
            out.append(e)
    return out

# Pythonic one-liner using dict insertion order (3.7+):
def dedup_fast(events):
    return list({e["event_id"]: e for e in events}.values())
# Note: the dict version keeps the LAST occurrence's value per id,
# not the first — fine when duplicates are identical, wrong if they differ.`,
      walkthrough: `A <code>set</code> gives O(1) membership checks, so one pass is enough. The explicit loop keeps the <strong>first</strong> occurrence; the dict-comprehension keeps the last — a subtle but real distinction interviewers love to poke at. State the trade-off out loud.`,
    },
    complexity: 'O(n) time, O(n) space (one entry per distinct id).',
    kafkaFollowup: `<strong>"Now deduplicate millions of events across consumer restarts."</strong> An in-memory Python <code>set</code> is lost on restart and can't fit unbounded ids. In production you dedupe with <em>durable, bounded</em> state: (1) a DB table with a <strong>unique constraint</strong> on <code>event_id</code> and an idempotent <code>INSERT … ON CONFLICT DO NOTHING</code> / upsert; or (2) a Kafka Streams / Flink keyed state store (RocksDB) with a <strong>retention window</strong> so old ids expire. Key the topic by <code>event_id</code> so all copies of an event land on the same partition and are seen by the same consumer — that's what makes local dedup state correct.`,
  },

  {
    id: 'c02',
    title: 'Aggregate transaction amounts by merchant',
    level: 1,
    category: 'Aggregation',
    difficulty: 'easy',
    tags: ['dict', 'groupby', 'reduce'],
    prompt: `Calculate the <strong>total transaction amount per merchant</strong>.`,
    example: {
      input: `events = [
    {"merchant": "M1", "amount": 100},
    {"merchant": "M2", "amount": 200},
    {"merchant": "M1", "amount": 50},
    {"merchant": "M2", "amount": 75},
]`,
      output: `{"M1": 150, "M2": 275}`,
    },
    starter: `def totals_by_merchant(events):
    ...`,
    hints: [
      'A running dict keyed by merchant, accumulating amount.',
      '`collections.defaultdict(int)` saves you the "key exists?" check.',
      'Or `Counter` — it adds numeric weights when you pass a mapping.',
    ],
    solution: {
      code: `from collections import defaultdict

def totals_by_merchant(events):
    totals = defaultdict(float)
    for e in events:
        totals[e["merchant"]] += e["amount"]
    return dict(totals)

# With Counter:
from collections import Counter
def totals_counter(events):
    c = Counter()
    for e in events:
        c[e["merchant"]] += e["amount"]
    return dict(c)`,
      walkthrough: `<code>defaultdict(float)</code> initializes a missing merchant to <code>0.0</code> on first touch, so the <code>+=</code> always works. One linear pass. Prefer <code>float</code>/<code>Decimal</code> for money — never trust binary floats for currency in a real system; use <code>decimal.Decimal</code> or integer cents.`,
    },
    complexity: 'O(n) time, O(k) space (k = distinct merchants).',
    kafkaFollowup: `<strong>"Now compute this continuously from a Kafka topic."</strong> This is a stateful streaming aggregation. In Kafka Streams it's <code>stream.groupBy(merchant).aggregate(...)</code> backed by a state store + <strong>changelog topic</strong> for fault tolerance; the running totals live in a <strong>KTable</strong>. Partition the input by <code>merchant</code> so each merchant's events all reach one task — that's what lets the aggregate be local and correct. For exact money you'd emit on a time/count trigger and handle updates as a compacted "latest total per merchant" topic.`,
  },

  {
    id: 'c03',
    title: 'Find the latest event per user',
    level: 1,
    category: 'Aggregation',
    difficulty: 'easy',
    tags: ['dict', 'max', 'event-time'],
    prompt: `Given events with <code>user_id</code> and a <code>timestamp</code>, return only the <strong>latest</strong> event for each user.`,
    example: {
      input: `events = [
    {"user_id": "U1", "timestamp": 100, "status": "created"},
    {"user_id": "U1", "timestamp": 300, "status": "paid"},
    {"user_id": "U2", "timestamp": 200, "status": "created"},
]`,
      output: `# U1 -> paid (ts 300), U2 -> created (ts 200)
{"U1": {...status: "paid"}, "U2": {...status: "created"}}`,
    },
    starter: `def latest_per_user(events):
    ...`,
    hints: [
      'Keep a dict user_id -> best-so-far event.',
      'Replace the stored event only when the incoming timestamp is greater.',
      'Guard the comparison so out-of-order arrivals don\'t overwrite a newer event with an older one.',
    ],
    solution: {
      code: `def latest_per_user(events):
    latest = {}
    for e in events:
        uid = e["user_id"]
        if uid not in latest or e["timestamp"] > latest[uid]["timestamp"]:
            latest[uid] = e
    return latest`,
      walkthrough: `The <code>&gt;</code> comparison is the whole point: it makes the result <strong>independent of arrival order</strong>. Whether the <code>paid</code> event shows up before or after <code>created</code>, the one with the larger timestamp wins. That single guard is the difference between a toy and something that survives real streams.`,
    },
    complexity: 'O(n) time, O(u) space (u = distinct users).',
    kafkaFollowup: `<strong>"What if events arrive out of order?"</strong> Your <code>&gt;</code> guard already handles reordering <em>within what you've seen</em>. But in a stream "latest" is open-ended — a later event can always arrive. Real systems use <strong>event-time</strong> (the embedded <code>timestamp</code>, not arrival time) plus a <strong>watermark</strong> to decide when a user's "latest" is safe to emit, and treat updates as a compacted KTable keyed by <code>user_id</code>. Ties on equal timestamps need a tiebreaker (a source sequence number or offset).`,
  },

  {
    id: 'c04',
    title: 'Count events by type',
    level: 1,
    category: 'Aggregation',
    difficulty: 'easy',
    tags: ['counter', 'dict'],
    prompt: `Count how many events belong to each <code>type</code>.`,
    example: {
      input: `events = [
    {"type": "PAYMENT"}, {"type": "REFUND"},
    {"type": "PAYMENT"}, {"type": "LOGIN"}, {"type": "PAYMENT"},
]`,
      output: `{"PAYMENT": 3, "REFUND": 1, "LOGIN": 1}`,
    },
    starter: `def count_by_type(events):
    ...`,
    hints: [
      '`collections.Counter` is purpose-built for this.',
      'Feed it a generator of the type values.',
    ],
    solution: {
      code: `from collections import Counter

def count_by_type(events):
    return dict(Counter(e["type"] for e in events))`,
      walkthrough: `<code>Counter</code> over a generator is the idiomatic answer — no intermediate list, one pass. If an interviewer bans <code>Counter</code>, fall back to a <code>defaultdict(int)</code> with <code>counts[e["type"]] += 1</code>.`,
    },
    complexity: 'O(n) time, O(t) space (t = distinct types).',
    kafkaFollowup: `<strong>"Make it a live count per type."</strong> That's a windowed count in a streaming engine: <code>groupBy(type).count()</code> over a tumbling or hopping window. To parallelize, partition by <code>type</code> (or re-key) so each type's events aggregate on one task; the per-window counts land in a KTable and are emitted on window close. Unbounded "all-time" counts need a compacted output topic so the latest count per type is always recoverable.`,
  },

  {
    id: 'c05',
    title: 'Find missing sequence numbers',
    level: 1,
    category: 'Ordering',
    difficulty: 'easy',
    tags: ['set', 'gaps', 'range'],
    prompt: `A consumer received these event sequence numbers. Return the <strong>missing</strong> ones (the gaps), in order.`,
    example: {
      input: `sequence_numbers = [1, 2, 3, 6, 7, 10]`,
      output: `[4, 5, 8, 9]`,
    },
    starter: `def missing_sequences(seq):
    ...`,
    hints: [
      'The full expected range runs from min to max.',
      'Set difference between the expected range and what you received.',
      'Sort the result so gaps come back in order.',
    ],
    solution: {
      code: `def missing_sequences(seq):
    if not seq:
        return []
    present = set(seq)
    lo, hi = min(seq), max(seq)
    return [n for n in range(lo, hi + 1) if n not in present]`,
      walkthrough: `Build the <strong>expected</strong> contiguous range <code>[min..max]</code>, then keep only the numbers not actually present. Using a <code>set</code> makes each membership test O(1), so the whole thing is linear in the range. Handle the empty-input edge case first.`,
    },
    complexity: 'O(n + r) time (r = max − min), O(n) space.',
    kafkaFollowup: `<strong>"Detect gaps per account/partition in a stream."</strong> Within a single Kafka <strong>partition</strong>, offsets are strictly ordered and monotonic — a gap in a per-record sequence number signals a lost or skipped producer message. Track the <strong>expected-next</strong> number per key (account) in keyed state: when an arrival jumps ahead, the span between last-seen and current is the gap. Key the topic by <code>account_id</code> so one account's sequence is wholly owned by one consumer; across partitions, sequences interleave and global ordering isn't guaranteed — so per-key gap detection is the only sound approach.`,
  },
];

// Convenience lookups.
export const CODING_LEVELS = [1, 2, 3, 4];
export const CODING_LEVEL_LABEL = {
  1: 'Python + event processing',
  2: 'Producer / consumer coding',
  3: 'Streaming algorithms',
  4: 'Production challenges',
};
export const CODING_CATEGORIES = [...new Set(CODING_BANK.map(p => p.category))];
