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

  // ── Level 2 — Kafka producer / consumer coding ───────────────────────────
  {
    id: 'c06',
    title: 'Write a Kafka producer with keys and delivery callbacks',
    level: 2,
    category: 'Producer/Consumer',
    difficulty: 'medium',
    tags: ['producer', 'confluent-kafka', 'partitioning', 'acks'],
    prompt: `Implement a producer (<code>confluent-kafka</code>) that publishes payment events to the <code>payments</code> topic. Serialize as JSON, use <code>payment_id</code> as the message <strong>key</strong>, handle delivery success/failure callbacks, and flush before exiting.`,
    example: {
      input: `payments = [
    {"payment_id": "P1", "amount": 100, "merchant": "M1"},
    {"payment_id": "P2", "amount": 250, "merchant": "M2"},
]`,
      output: `# Each record acked via the delivery callback:
# Delivered P1 to payments[2]@57
# Delivered P2 to payments[0]@43`,
    },
    starter: `from confluent_kafka import Producer
import json

def publish_payments(payments, bootstrap="localhost:9092"):
    ...`,
    hints: [
      'Producer sends are asynchronous — you register a per-message delivery callback and must poll() to serve it.',
      'The key must be bytes; encode both key and JSON value.',
      'Call flush() at the end so buffered messages are actually delivered before the process exits.',
    ],
    solution: {
      code: `from confluent_kafka import Producer
import json

def publish_payments(payments, bootstrap="localhost:9092"):
    p = Producer({
        "bootstrap.servers": bootstrap,
        "acks": "all",          # wait for all in-sync replicas
        "enable.idempotence": True,  # no duplicates on producer retries
        "linger.ms": 5,         # small batching window for throughput
    })

    def on_delivery(err, msg):
        if err is not None:
            print(f"FAILED {msg.key()}: {err}")
        else:
            print(f"Delivered {msg.key().decode()} to "
                  f"{msg.topic()}[{msg.partition()}]@{msg.offset()}")

    for ev in payments:
        p.produce(
            topic="payments",
            key=str(ev["payment_id"]).encode(),
            value=json.dumps(ev).encode(),
            callback=on_delivery,
        )
        p.poll(0)   # serve delivery callbacks without blocking

    p.flush()       # block until every message is delivered or fails`,
      walkthrough: `The three things interviewers check: (1) a <strong>key</strong> so related events co-locate on a partition and stay ordered; (2) <code>acks=all</code> + <code>enable.idempotence</code> for durability without duplicates; (3) <code>poll()</code> during the loop and <code>flush()</code> at the end — forgetting these is the classic "my messages disappeared" bug, because produce() only enqueues.`,
    },
    complexity: 'O(n) produce calls; delivery is async and batched.',
    kafkaFollowup: `<strong>"Why a key, and what picks the partition?"</strong> With a key, Kafka's default partitioner computes <code>murmur2(key) % numPartitions</code>, so every event for a given <code>payment_id</code> lands on the same partition and keeps its relative order — essential for per-entity ordering. With no key, records are spread (sticky-batched) across partitions for throughput but lose per-entity ordering. Changing the partition count later re-maps keys, which is why partition count is a decision you make up front.`,
  },

  {
    id: 'c07',
    title: 'Consumer that commits offsets only after success',
    level: 2,
    category: 'Producer/Consumer',
    difficulty: 'medium',
    tags: ['consumer', 'offsets', 'at-least-once', 'commit'],
    prompt: `Implement a consumer that reads from <code>payments</code>, parses JSON, validates the payload, and processes valid records — committing offsets <strong>only after</strong> successful processing. Handle malformed JSON and close cleanly.`,
    example: {
      input: `# topic 'payments' has a mix of valid records and one
# malformed (non-JSON) message`,
      output: `# valid records processed; bad message logged & skipped;
# offset advanced only past successfully handled records`,
    },
    starter: `from confluent_kafka import Consumer
import json

def consume_payments(bootstrap="localhost:9092"):
    ...`,
    hints: [
      'Disable auto-commit (enable.auto.commit=False) so you control exactly when the offset advances.',
      'Wrap json.loads in try/except — a poison message must not crash the loop.',
      'Commit after the record is durably processed; on failure, do not commit so it is re-delivered.',
    ],
    solution: {
      code: `from confluent_kafka import Consumer, KafkaError
import json

def consume_payments(bootstrap="localhost:9092"):
    c = Consumer({
        "bootstrap.servers": bootstrap,
        "group.id": "payments-processor",
        "enable.auto.commit": False,     # we commit manually
        "auto.offset.reset": "earliest",
    })
    c.subscribe(["payments"])
    try:
        while True:
            msg = c.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                raise Exception(msg.error())

            try:
                record = json.loads(msg.value())
            except (ValueError, TypeError):
                print(f"skip malformed @ offset {msg.offset()}")
                c.commit(msg)        # skip poison: advance past it
                continue

            if not valid(record):
                print(f"invalid payload @ {msg.offset()}")
                c.commit(msg)
                continue

            process(record)          # side effect (DB write, etc.)
            c.commit(msg)            # commit ONLY after success
    finally:
        c.close()                    # leave the group cleanly -> fast rebalance

def valid(r):
    return isinstance(r, dict) and "payment_id" in r and "amount" in r

def process(r):
    ...`,
      walkthrough: `Manual commit after processing gives <strong>at-least-once</strong>: if the process crashes between <code>process()</code> and <code>commit()</code>, the record is redelivered and reprocessed (so <code>process()</code> must be idempotent). Committing the poison/invalid message is a deliberate choice — otherwise it blocks the partition forever. <code>c.close()</code> in <code>finally</code> triggers a prompt, clean rebalance.`,
    },
    complexity: 'O(1) work per message; throughput bounded by process().',
    kafkaFollowup: `<strong>"Processing succeeds but the commit fails — then what?"</strong> The offset doesn't advance, so after a rebalance/restart the record is <strong>redelivered and processed again</strong>. That's the core at-least-once reality: duplicates are possible, so downstream writes must be idempotent (unique key / upsert) or you need the transactional (exactly-once) producer-consumer path. Committing before processing would instead risk <em>losing</em> a record on a crash — the opposite, worse failure.`,
  },

  {
    id: 'c08',
    title: 'Retry transient failures with a dead-letter queue',
    level: 2,
    category: 'Producer/Consumer',
    difficulty: 'medium',
    tags: ['retry', 'dlq', 'poison-message', 'backoff'],
    prompt: `Write a function that processes a message and retries <strong>transient</strong> failures up to 3 times. Don't retry invalid input. Route permanently failed records to a dead-letter topic, preserving the original event id and the error.`,
    example: {
      input: `# transient: DB timeout -> retry
# permanent: schema invalid -> straight to DLQ
# success after 2 retries -> processed`,
      output: `# processed, or published to payments.DLQ with
# {original, error, attempts} metadata`,
    },
    starter: `def process_with_retry(record, produce_dlq, max_retries=3):
    ...`,
    hints: [
      'Separate exception types: transient (timeouts, connection) retry; validation errors do not.',
      'Exponential backoff between retries (and in a real consumer, beware blocking the partition).',
      'After exhausting retries, publish to the DLQ with enough context to debug/replay.',
    ],
    solution: {
      code: `import time, json

class TransientError(Exception): ...
class PermanentError(Exception): ...

def process_with_retry(record, produce_dlq, max_retries=3):
    attempt = 0
    while True:
        try:
            handle(record)                 # may raise
            return "ok"
        except PermanentError as e:        # invalid input -> no retry
            to_dlq(record, produce_dlq, str(e), attempt)
            return "dlq"
        except TransientError as e:
            attempt += 1
            if attempt > max_retries:
                to_dlq(record, produce_dlq, str(e), attempt)
                return "dlq"
            time.sleep(min(2 ** attempt, 30))   # exp. backoff, capped

def to_dlq(record, produce_dlq, error, attempts):
    produce_dlq(json.dumps({
        "original": record,
        "error": error,
        "attempts": attempts,
        "event_id": record.get("event_id") or record.get("payment_id"),
    }).encode())

def handle(record):
    ...`,
      walkthrough: `The key design move is <strong>classifying the error</strong>: retrying a validation failure just wastes 3 attempts and still fails, while retrying a DB timeout usually succeeds. Capped exponential backoff avoids hammering a struggling dependency. The DLQ record keeps the original payload + error + attempt count so it's debuggable and replayable.`,
    },
    complexity: 'O(max_retries) worst case per record; backoff dominates wall-clock.',
    kafkaFollowup: `<strong>"How do you avoid blocking a partition behind one poison message?"</strong> In-line <code>sleep</code> retries stall every later message on that partition (head-of-line blocking). Production patterns: (1) <strong>retry topics</strong> — on transient failure, republish to <code>payments.retry.5s</code> / <code>.30s</code> with a delay and move on, so the main partition keeps flowing; (2) a dead-letter topic for terminal failures; (3) bound total attempts to prevent infinite loops. Confluent's "retry topic + DLQ" pattern is the standard answer.`,
  },

  {
    id: 'c09',
    title: 'Idempotent database writes from a consumer',
    level: 2,
    category: 'Dedup',
    difficulty: 'medium',
    tags: ['idempotency', 'upsert', 'exactly-once', 'at-least-once'],
    prompt: `A consumer writes payment events to a database. The same event can be <strong>delivered more than once</strong> (at-least-once). Write the processing logic so an event whose <code>event_id</code> already exists does not create a second row.`,
    example: {
      input: `# E1 delivered twice (consumer restart replayed it)`,
      output: `# exactly one row for E1 in the payments table`,
    },
    starter: `def write_payment(conn, event):
    ...`,
    hints: [
      'A Python set of seen ids works in one process but is lost on restart and not shared across consumers.',
      'Push idempotency into the database: a unique constraint on event_id.',
      'INSERT ... ON CONFLICT DO NOTHING (Postgres) / INSERT IGNORE / MERGE makes the write a no-op on a duplicate.',
    ],
    solution: {
      code: `# Schema:  UNIQUE constraint on event_id
#   CREATE TABLE payments (
#     event_id TEXT PRIMARY KEY,
#     amount   NUMERIC,
#     merchant TEXT,
#     ts       TIMESTAMPTZ
#   );

def write_payment(conn, event):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO payments (event_id, amount, merchant, ts)
            VALUES (%(event_id)s, %(amount)s, %(merchant)s, now())
            ON CONFLICT (event_id) DO NOTHING
            """,
            event,
        )
    conn.commit()
    # Duplicate deliveries hit ON CONFLICT and change nothing -> idempotent.`,
      walkthrough: `The database is the single source of truth, so the dedup guarantee belongs <strong>there</strong>, not in process memory. A primary-key/unique constraint on <code>event_id</code> plus <code>ON CONFLICT DO NOTHING</code> makes re-delivery a safe no-op across restarts, rebalances, and multiple consumer instances — none of which a local <code>set</code> survives.`,
    },
    complexity: 'O(1) per write (index lookup on the unique key).',
    kafkaFollowup: `<strong>"Why isn't a Python set enough in production?"</strong> It's per-process and in-memory: it vanishes on restart, isn't shared when the consumer group scales to N instances, and grows unbounded. The DB unique constraint is durable, shared, and bounded by the data itself. This turns at-least-once delivery into <strong>effectively exactly-once processing</strong> at the sink — the pragmatic pattern most teams use instead of full Kafka transactions.`,
  },

  {
    id: 'c10',
    title: 'Process a batch, then commit safely',
    level: 2,
    category: 'Producer/Consumer',
    difficulty: 'hard',
    tags: ['batching', 'offsets', 'transactions', 'atomicity'],
    prompt: `Write consumer logic that reads a <strong>batch</strong> of events, validates each, writes the valid ones to the target, handles the failures, and commits offsets only when the batch's required processing is complete.`,
    example: {
      input: `# poll up to 500 records, process as one batch`,
      output: `# batch written atomically; offset committed once,
# past the last successfully handled record`,
    },
    starter: `def consume_in_batches(consumer, sink, batch_size=500, timeout=1.0):
    ...`,
    hints: [
      'consume(num_messages=N, timeout=…) returns a list — accumulate a batch.',
      'Validate and split into good/bad before the write; route bad ones to a DLQ.',
      'Commit once after the batch is durable; a bulk DB write + single commit amortizes overhead.',
    ],
    solution: {
      code: `def consume_in_batches(consumer, sink, dlq, batch_size=500, timeout=1.0):
    while True:
        msgs = consumer.consume(num_messages=batch_size, timeout=timeout)
        if not msgs:
            continue

        good, bad = [], []
        for m in msgs:
            if m.error():
                continue
            try:
                rec = parse(m.value())
                (good if valid(rec) else bad).append((m, rec))
            except Exception:
                bad.append((m, None))

        # Write all valid records as ONE unit of work.
        if good:
            sink.write_batch([r for _, r in good])   # bulk insert / upsert
        for m, _ in bad:
            dlq.produce(m.value())

        # Everything handled -> commit once, past the whole batch.
        consumer.commit(asynchronous=False)`,
      walkthrough: `Batching amortizes the per-record cost of both the DB write and the offset commit. The invariant: <strong>commit only after the batch is durable</strong>. The write should be atomic (a single transaction / bulk upsert) so a mid-batch crash can't leave the sink half-written while the offset implies "done".`,
    },
    complexity: 'O(batch) per cycle; one bulk write + one commit amortizes cost.',
    kafkaFollowup: `<strong>"What if the DB partially commits a batch, then fails?"</strong> With a non-atomic write + a single offset commit you get a gap: some rows written, offset not advanced → on restart the whole batch replays, duplicating the already-written rows (fine only if the sink is idempotent). The robust options: (1) make the batch write a <strong>single transaction</strong> so it's all-or-nothing; (2) idempotent upserts keyed by <code>event_id</code> so replays are safe; or (3) Kafka <strong>transactions</strong> (<code>read-process-write</code> with <code>sendOffsetsToTransaction</code>) to commit the writes and the offsets atomically for true exactly-once.`,
  },

  // ── Level 3 — Streaming algorithms & data engineering ────────────────────
  {
    id: 'c11',
    title: 'Rolling 5-minute transaction total',
    level: 3,
    category: 'Windowing',
    difficulty: 'medium',
    tags: ['sliding-window', 'deque', 'event-time'],
    prompt: `Given timestamped payment events (seconds), for each event compute the <strong>total amount in the preceding 5 minutes</strong> (300s), inclusive. Explain your window boundary and how you expire old events efficiently.`,
    example: {
      input: `events = [
    {"timestamp": 100, "amount": 100},
    {"timestamp": 180, "amount": 200},
    {"timestamp": 250, "amount": 50},
    {"timestamp": 500, "amount": 300},
]`,
      output: `# at ts=500, window is (200, 500]: 50 + 300 = 350
# (ts 100 and 180 have aged out of the 300s window)
[100, 300, 350, 350]`,
    },
    starter: `from collections import deque

def rolling_window_totals(events, window=300):
    ...`,
    hints: [
      'Keep a deque of (timestamp, amount) and a running sum.',
      'When a new event arrives, pop from the left while the oldest is older than now - window.',
      'Each event is added once and removed once → amortized O(1) per event.',
    ],
    solution: {
      code: `from collections import deque

def rolling_window_totals(events, window=300):
    q = deque()        # (timestamp, amount), oldest on the left
    running = 0.0
    out = []
    for e in events:   # assumes non-decreasing timestamps (ordered stream)
        ts, amt = e["timestamp"], e["amount"]
        q.append((ts, amt)); running += amt
        # Expire everything strictly older than the window's left edge.
        while q and q[0][0] <= ts - window:
            running -= q.popleft()[1]
        out.append(running)
    return out`,
      walkthrough: `A monotonic deque + running sum is the canonical sliding-window trick: define the window as <code>(ts - 300, ts]</code>, and because each element is appended once and popped once, the whole pass is <strong>amortized O(1) per event</strong> rather than O(n) rescans. Be explicit about boundary inclusivity — it's a common off-by-one.`,
    },
    complexity: 'O(n) total (amortized O(1) per event), O(w) space for the window.',
    kafkaFollowup: `<strong>"Event-time windows and late events in a streaming engine?"</strong> This hand-rolled version assumes ordered timestamps. Real engines (Kafka Streams, Flink, Spark Structured Streaming) window on <strong>event time</strong> with a <strong>watermark</strong> that estimates "we've probably seen everything up to T". A late event behind the watermark either updates its window (if within the allowed lateness / grace period) or is dropped to a side output. Sliding windows are expressed declaratively (<code>hopping</code>/<code>sliding</code> windows) and backed by fault-tolerant state.`,
  },

  {
    id: 'c12',
    title: 'Top-K merchants by transaction volume',
    level: 3,
    category: 'Aggregation',
    difficulty: 'medium',
    tags: ['heap', 'top-k', 'tie-break'],
    prompt: `Given payment events, return the <strong>top 3 merchants</strong> by total amount, with a defined tie-breaking rule (e.g. merchant id ascending on a tie).`,
    example: {
      input: `events = [
    {"merchant": "M1", "amount": 100}, {"merchant": "M2", "amount": 500},
    {"merchant": "M1", "amount": 400}, {"merchant": "M3", "amount": 300},
    {"merchant": "M4", "amount": 200},
]`,
      output: `# totals: M1=500, M2=500, M3=300, M4=200
# tie M1/M2 broken by id asc -> [("M1",500),("M2",500),("M3",300)]`,
    },
    starter: `def top_k_merchants(events, k=3):
    ...`,
    hints: [
      'First aggregate totals per merchant (dict).',
      'heapq.nlargest with a key handles selection in O(m log k).',
      'Encode the tie-break in the sort key: (−total, merchant_id) sorts by total desc then id asc.',
    ],
    solution: {
      code: `from collections import defaultdict
import heapq

def top_k_merchants(events, k=3):
    totals = defaultdict(float)
    for e in events:
        totals[e["merchant"]] += e["amount"]

    # Sort key: highest total first; ties -> merchant id ascending.
    # nlargest with a key gives O(m log k) instead of a full O(m log m) sort.
    top = heapq.nsmallest(k, totals.items(), key=lambda kv: (-kv[1], kv[0]))
    return [(m, t) for m, t in top]`,
      walkthrough: `Two stages: aggregate (O(n)), then select top-k. Using a heap keyed by <code>(-total, merchant)</code> picks the k largest by total while breaking ties deterministically by id — spelling out the tie-break is exactly what separates a complete answer from a hand-wave. For k ≪ m, <code>nsmallest/nlargest</code> beats a full sort.`,
    },
    complexity: 'O(n) to aggregate + O(m log k) to select (m = distinct merchants).',
    kafkaFollowup: `<strong>"Maintain top-K continuously without re-sorting on every event?"</strong> Keep the running totals in a <strong>KTable</strong> (stateful aggregate, partitioned by merchant), then maintain a bounded top-K structure updated incrementally: on each total change, update a size-K min-heap / sorted structure keyed on the running total. Because merchant totals only grow within a window, you re-rank in O(log K) per update instead of re-sorting all merchants. Emit the leaderboard on a timer or on change to a compacted output topic.`,
  },

  {
    id: 'c13',
    title: 'Correct final state from out-of-order events',
    level: 3,
    category: 'Ordering',
    difficulty: 'medium',
    tags: ['event-time', 'out-of-order', 'last-write-wins'],
    prompt: `Account balance updates carry timestamps but <strong>arrive out of order</strong>. Compute the correct final balance per account — the value from each account's latest-timestamped event.`,
    example: {
      input: `events = [
    {"account": "A1", "timestamp": 30, "balance": 300},
    {"account": "A1", "timestamp": 10, "balance": 100},
    {"account": "A1", "timestamp": 20, "balance": 200},
]`,
      output: `{"A1": 300}   # ts=30 is newest, regardless of arrival order`,
    },
    starter: `def final_balances(events):
    ...`,
    hints: [
      'Track per account the max timestamp seen and its balance.',
      'Only overwrite when the incoming timestamp is strictly greater.',
      'Think about what to do on equal timestamps — you need a tiebreaker.',
    ],
    solution: {
      code: `def final_balances(events):
    latest_ts = {}
    balance = {}
    for e in events:
        a, ts = e["account"], e["timestamp"]
        if a not in latest_ts or ts > latest_ts[a]:
            latest_ts[a] = ts
            balance[a] = e["balance"]
    return balance`,
      walkthrough: `This is <strong>last-write-wins by event time</strong>: arrival order is irrelevant because the <code>ts &gt; latest</code> guard always keeps the newest. It's the same shape as "latest per user," applied to a mutable value. The subtle gap is equal timestamps — see the follow-up.`,
    },
    complexity: 'O(n) time, O(a) space (a = distinct accounts).',
    kafkaFollowup: `<strong>"What if two events share a timestamp?"</strong> Timestamp alone can't order them, so you need a <strong>deterministic tiebreaker</strong>: a monotonic source sequence number, the producer's record offset, or a version field. In Kafka, records in one partition have a total order (offset), so keying the topic by <code>account_id</code> gives you a canonical last-write-wins by offset even when event-time ties. Without a tiebreaker, "final" is ambiguous and two replays can disagree.`,
  },

  {
    id: 'c14',
    title: 'Per-key ordering with cross-key concurrency',
    level: 3,
    category: 'Ordering',
    difficulty: 'hard',
    tags: ['partitioning', 'ordering', 'concurrency', 'keyed-state'],
    prompt: `Design a processing strategy so events for the same <code>account_id</code> are applied <strong>strictly in order</strong>, while <strong>different</strong> accounts are processed concurrently. Sketch it in code.`,
    example: {
      input: `# interleaved events for A1, A2, A3 on one stream`,
      output: `# A1's events applied in order on one worker;
# A2 and A3 handled in parallel on other workers`,
    },
    starter: `# Partition by account_id so ordering is per-key, parallelism is per-partition.
def route(event, num_workers):
    ...`,
    hints: [
      'Ordering in Kafka is guaranteed only within a partition — so same key must map to the same partition.',
      'Hash the key to a worker/queue; each worker processes its queue sequentially.',
      'Never fan a single key across workers, or you lose its order.',
    ],
    solution: {
      code: `import hashlib, queue, threading

def partition_for(key, n):
    # Stable hash -> same account always maps to the same worker.
    h = int(hashlib.md5(key.encode()).hexdigest(), 16)
    return h % n

def run(events, num_workers=4):
    queues = [queue.Queue() for _ in range(num_workers)]

    def worker(q):
        while True:
            ev = q.get()
            if ev is None:
                return
            apply(ev)          # sequential within this worker -> per-key order
            q.task_done()

    threads = [threading.Thread(target=worker, args=(q,), daemon=True)
               for q in queues]
    for t in threads: t.start()

    for ev in events:                     # single ordered source
        queues[partition_for(ev["account_id"], num_workers)].put(ev)

    for q in queues: q.join()
    for q in queues: q.put(None)

def apply(ev):
    ...`,
      walkthrough: `The whole guarantee rests on one rule: <strong>a key is owned by exactly one worker</strong>. Hashing <code>account_id</code> to a worker queue means one account's events are always handled by the same thread in arrival order, while distinct accounts spread across workers for parallelism. The moment you let a key be handled by two workers, its order is gone.`,
    },
    complexity: 'O(n) dispatch; throughput scales with worker/partition count.',
    kafkaFollowup: `<strong>"Map this onto Kafka."</strong> It's exactly how Kafka already works: produce with <code>key=account_id</code> so the partitioner sends an account's events to one <strong>partition</strong> (ordered), and a consumer group assigns each partition to one <strong>consumer</strong> (one owner). Parallelism = partition count; ordering = per key within a partition. Ordered DB updates per key keep the sink consistent. The catch: max parallelism is capped by partitions, and a single hot key is a serial bottleneck you can't parallelize without breaking its order.`,
  },

  {
    id: 'c15',
    title: 'Deduplication window with expiry',
    level: 3,
    category: 'Dedup',
    difficulty: 'hard',
    tags: ['windowed-dedup', 'ttl', 'state', 'memory'],
    prompt: `Deduplicate events by <code>event_id</code> within a <strong>10-minute window</strong>: an id seen within the last 10 minutes is a duplicate, but the same id is allowed again once it expires from the window.`,
    example: {
      input: `# E1 @ t=0 (new), E1 @ t=120 (dup), E1 @ t=700 (new again)
# window = 600s`,
      output: `# emit E1@0, drop E1@120, emit E1@700`,
    },
    starter: `def windowed_dedup(events, window=600):
    ...`,
    hints: [
      'Store last-seen time per id, and expire entries older than the window.',
      'On each event, first evict expired ids, then check membership.',
      'Unbounded ids = unbounded memory; expiry is what bounds it.',
    ],
    solution: {
      code: `from collections import OrderedDict

def windowed_dedup(events, window=600):
    seen = OrderedDict()     # event_id -> last_seen_ts, in insertion order
    out = []
    for e in events:         # assumes non-decreasing timestamps
        eid, ts = e["event_id"], e["timestamp"]
        # Evict ids whose last-seen has aged out of the window.
        while seen and next(iter(seen.values())) <= ts - window:
            seen.popitem(last=False)
        if eid in seen:
            continue                 # duplicate within window -> drop
        seen[eid] = ts               # first time (or re-allowed) -> emit
        out.append(e)
    return out`,
      walkthrough: `The window is what makes dedup <strong>bounded</strong>: without expiry the id set grows forever. An <code>OrderedDict</code> keeps ids in time order so the oldest expire from the front in amortized O(1). A re-seen id past the window counts as new again — matching the spec. Eviction before the membership check is the ordering that keeps it correct.`,
    },
    complexity: 'O(n) amortized; O(w) space bounded by ids within the window.',
    kafkaFollowup: `<strong>"Manage memory, event-time vs processing-time expiry, and restart recovery?"</strong> Use a windowed state store (Kafka Streams <code>Windowed</code> / Flink keyed state) with a <strong>retention = window</strong> so old keys are compacted/evicted automatically and memory stays bounded. Expire on <strong>event time</strong> (the embedded timestamp) so results are reproducible on replay, not wall-clock. Fault tolerance comes from the store's changelog topic: on restart, state is restored from it, so the dedup window survives crashes rather than resetting.`,
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
