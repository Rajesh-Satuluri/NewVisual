// Foundations curriculum content (I30–I36) — 15 modules.
// Vendor-neutral streaming first principles, written for depth: each module goes
// past definitions into mechanics, distributed-systems reasoning, failure modes,
// design trade-offs, and the nuance a principal engineer is expected to hold.
// Modules with `sim` mount a real deterministic simulator from sim/stream-engine.js.
// Scenario-aware prose uses {ENTITY}/{KEY}/{ID} tokens filled from the active scenario.
//
// Technical-accuracy guardrails honored throughout:
//  - "exactly-once" is always framed as effectively-once / conditional, never absolute.
//  - No invented vendor throughput numbers; sizing is taught as a reasoning method,
//    with concrete limits deferred to the provider-specific cloud sections.

// Small inline helper so content stays readable. Mirrors lesson-shell's iqSection
// output (native <details>, no JS) but usable directly inside a tab body string.
const iq = (items) => `
  <div class="lx-iq">
    <div class="lx-kp-h" style="margin-bottom:10px">Interview questions — click to reveal a model answer</div>
    ${items.map((it, i) => `
      <details class="lx-qa">
        <summary><span class="lx-qa-n">Q${i + 1}</span>${it.q}</summary>
        <div class="lx-qa-a">${it.a}</div>
      </details>`).join('')}
  </div>`;

export const FOUNDATIONS = [
  {
    id: 'f01', num: '01', icon: '💡', title: 'Why streaming?',
    idea: 'Batch answers "what happened"; streaming answers "what is happening" — and the choice is an economic and correctness decision, not a fashion one.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>The core shift: bounded vs unbounded</h3>
        <p><b>Batch processing</b> takes a <i>bounded</i> dataset — a file, a day's partition, a table
        snapshot — and runs a job to completion over it. There is a defined start and end, so the job
        can see all the data before it produces an answer. <b>Stream processing</b> operates on an
        <i>unbounded</i> dataset: a sequence that has a beginning but, for practical purposes, no end.
        The job never "finishes"; it produces a continuously-updated answer as each new {ENTITY} arrives.</p>
        <p>The deep point is that <b>batch is a special case of streaming</b>, not the other way round.
        A bounded dataset is just an unbounded stream you've decided to stop reading. This is why
        modern engines (Flink, Spark Structured Streaming, Beam) model both with one API: the runtime
        is the same; "batch" simply means the input is known to be finite.</p>
        <h3>Why the world is actually a stream</h3>
        <p>Data is <i>born</i> as events — a {ENTITY} happens, a sensor fires, a row changes. Batching
        is an artifact we impose: we <i>collect</i> the naturally-streaming events into chunks because,
        historically, that was the only way to process them cheaply. Streaming removes that artifact and
        processes data in the shape it arrives. Everything downstream — a dashboard, a feature store, a
        fraud score — is a <b>view</b> derived from that flow.</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Hold these mental models</div><ul class="clean">
          <li><b>Unbounded by default:</b> streaming assumes the data never ends, so every operation
          (aggregation, join, dedup) must work without ever seeing "all" the data.</li>
          <li><b>Batch ⊂ streaming:</b> a finite input is a stream with a known end — same engine.</li>
          <li><b>Views over a log:</b> the stream is the source of truth; outputs are recomputable views.</li>
        </ul></div>` },
      { id: 'tradeoffs', label: '⚖️ When it earns its cost', body: `
        <h3>Streaming is not free — it earns its keep or it doesn't</h3>
        <p>A streaming pipeline runs 24/7. It needs always-on compute, state storage, checkpointing,
        on-call ownership, and careful handling of time and failure. A principal engineer frames the
        decision as: <i>does the business value of freshness exceed that standing cost?</i></p>
        <div class="grid cols-2">
          <div class="card"><b>Batch wins when…</b>
            <ul class="clean">
              <li>Answers are only consumed periodically (a daily report, a weekly model retrain).</li>
              <li>The logic genuinely needs the whole dataset at once (large shuffles, global sorts,
              full-history training).</li>
              <li>Reprocessing simplicity matters — rerun yesterday's job and get identical output.</li>
              <li>Cost efficiency dominates and spiky, scheduled compute is acceptable.</li>
            </ul></div>
          <div class="card"><b>Streaming wins when…</b>
            <ul class="clean">
              <li>The latency budget is seconds or sub-second (fraud, alerting, live personalization).</li>
              <li>Value <b>decays fast</b> — a fraud alert 10 minutes late is worthless; a stale "driver
              is 2 min away" ETA is a lie.</li>
              <li>The input never finishes and batching would mean giant, bursty, ever-growing jobs.</li>
              <li>You need continuous, incremental results instead of one big answer.</li>
            </ul></div>
        </div>
        <h3>The honest failure mode</h3>
        <p>The most expensive mistake is reaching for streaming when the requirement is actually
        "fresh-ish within an hour". You pay the full operational cost of a streaming system to beat a
        latency target a cheap, boring micro-batch would have hit. <b>Always pin down the real latency
        SLO first</b> — then pick the cheapest architecture that meets it.</p>` },
      { id: 'lens', label: '🧠 Principal\'s lens', body: `
        <h3>Lambda vs Kappa — the architecture debate behind "why streaming"</h3>
        <p>Once you accept streaming, you still owe an answer for historical correctness and
        reprocessing. Two patterns dominate:</p>
        <div class="lx-table-wrap"><table class="lx-table"><thead><tr>
          <th>Pattern</th><th>Shape</th><th>Strength</th><th>Pain</th></tr></thead><tbody>
          <tr><td><b>Lambda</b></td><td>A streaming "speed layer" for fresh answers + a batch layer for
          accurate historical reprocessing; a serving layer merges them.</td>
          <td>Each layer is simple; batch guarantees correctness.</td>
          <td>You maintain the <i>same logic twice</i> in two codebases — the classic source of
          "the two layers disagree" bugs.</td></tr>
          <tr><td><b>Kappa</b></td><td>One streaming codebase. To reprocess, you <i>replay</i> the log
          from the start through the same job.</td>
          <td>Single codebase; replay = reprocessing; no logic duplication.</td>
          <td>Requires long/infinite retention (or tiered storage) and an engine that can replay fast
          enough to catch up.</td></tr>
        </tbody></table></div>
        <div class="lx-callout lx-info"><b>Where the industry landed.</b><div>Replay-based (Kappa-style)
        architectures won for most new systems because retention got cheap (tiered storage to object
        stores) and engines got good at fast replay. Lambda persists where a heavyweight batch system
        already exists and the duplication is tolerable. Knowing <i>why</i> each exists is the
        interview signal, not reciting the names.</div></div>
        <h3>The cost conversation you will actually have</h3>
        <p>At scale the question is rarely "can we stream it?" — it's "what does always-on state +
        checkpointing + 3× replication + on-call cost us per month, and is the freshness worth it?"
        Being able to reason about that trade-off — not just the technology — is what separates a
        senior from a principal.</p>` },
      { id: 'iq', label: '🎤 Interview', body: iq([
        { q: 'Is streaming always "better" than batch?', a: `No — and claiming so is a red flag. Streaming
          buys freshness at a real, standing operational cost (always-on compute, state, checkpointing,
          on-call). It wins when value decays fast or the input is truly unbounded and the latency SLO is
          tight. For periodic reporting or whole-dataset logic, batch is simpler, cheaper, and easier to
          reprocess. The right answer always starts with "what's the latency SLO and what does being late
          actually cost?"` },
        { q: 'In what sense is batch a special case of streaming?', a: `A bounded dataset is just a stream
          with a known end. Modern engines model both with one runtime — "batch" means the input is finite,
          so the engine can, for example, hold output until the end or skip watermark bookkeeping. This is
          why Flink/Beam/Spark Structured Streaming expose one API for both. The inverse ("streaming is
          repeated small batches") is only literally true for micro-batch engines; it's a useful model but
          not the fundamental one.` },
        { q: 'What is the difference between Lambda and Kappa architectures, and which would you choose today?',
          a: `Lambda runs a streaming speed layer plus a batch accuracy layer and merges them at serving
          time — simple layers but the same logic maintained twice, which drifts. Kappa keeps one streaming
          codebase and reprocesses by replaying the log. For greenfield systems I default to Kappa because
          cheap tiered retention makes replay practical and it eliminates the dual-codebase bug class. I'd
          keep Lambda only when a mature batch estate already exists and rewriting it isn't justified.` },
      ]) },
    ],
  },
  {
    id: 'f02', num: '02', icon: '📦', title: 'Events & streams',
    idea: 'An event is an immutable fact; a stream is the ordered log of those facts — and that log, not your database, is the real source of truth.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>An event is a fact, stated in the past tense</h3>
        <p>An <b>event</b> records that something <i>happened</i>: a {ENTITY} occurred, at a point in
        time, and that is now unchangeably true. The grammar matters — events are named in the past
        tense (<code>OrderPlaced</code>, <code>RideRequested</code>, <code>PaymentCaptured</code>),
        because you are recording history, not issuing a command. Structurally an event carries:</p>
        <ul class="clean">
          <li><b>Key</b> — what the event is <i>about</i> (e.g. <code>{KEY}</code>). The key is the unit
          of ordering and the unit of partitioning. Choosing it is a design decision, not a formality.</li>
          <li><b>Value / payload</b> — the facts of what happened, ideally self-describing via a schema.</li>
          <li><b>Event timestamp</b> — <i>when it happened</i> (stamped at the source), distinct from
          when it arrived. Module 06 is built entirely on this distinction.</li>
          <li><b>Headers / metadata</b> — trace ids, schema version, producer id, partition/offset once
          stored. Invaluable for debugging and lineage.</li>
        </ul>
        <h3>Immutability is the property everything else rests on</h3>
        <p>You never edit an event. A correction is <i>another event</i> (<code>OrderCancelled</code>,
        a reversal, a new version). This append-only discipline is what makes replay, auditing, and
        time-travel possible: because history is never rewritten, you can always recompute any past
        state by re-reading the log. Mutable state throws its own history away; a log keeps it.</p>
        <h3>A stream is the ordered, append-only log of those facts</h3>
        <p>A <b>stream</b> is the durable, append-only sequence of events. New events go on the end;
        existing events are never changed or moved. Crucially, <b>ordering is only guaranteed per key /
        per partition</b>, never globally — there is no single clock across a distributed log, so "the
        global order of all events" is not a thing you get or should rely on.</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">
          <li>Event = immutable past-tense fact: (key, value, event-time, metadata).</li>
          <li>Correct by appending, never by mutating — a fix is a new event.</li>
          <li>Stream = ordered, append-only log; order holds <i>per key</i>, not globally.</li>
          <li>The log is the source of truth; every table and view is derived from it.</li>
        </ul></div>` },
      { id: 'shape', label: '🧾 Event shape', body: `
        <h3>A concrete event in the active scenario</h3>
        <p>Abstract definitions only stick once you see a real record. Here is a representative event for
        the scenario you've selected — note the key, the payload, and the two timestamps:</p>
        <div id="f02-event"></div>
        <p>Those two times — when it <b>happened</b> (event time) and when it <b>arrived</b> (ingestion/
        processing time) — are the single most important pair of fields in streaming. Treat them as
        different columns forever; collapsing them is the number-one source of silent correctness bugs
        (Module 06 makes this concrete).</p>
        <h3>Give events a schema, and evolve it carefully</h3>
        <p>A payload without a contract is a future outage. Production streams use a <b>schema</b> (Avro,
        Protobuf, JSON Schema) registered centrally so producers and consumers agree on shape. Evolution
        is the hard part: prefer <b>backward/forward-compatible</b> changes — add optional fields with
        defaults; never repurpose or delete a field's meaning. A consumer written last year must still
        read an event produced today, and vice-versa, because in a streaming world old and new versions
        of your code run <i>at the same time</i> during every deploy.</p>
        <div class="lx-callout lx-warn"><b>The event is a public API.</b><div>Once another team consumes
        your stream, your event schema is a contract you can't silently break — harder to change than a
        REST response, because historical events in the log must stay readable too. Design event
        payloads with the same care as an external API.</div></div>` },
      { id: 'log', label: '🗄️ The log is the database', body: `
        <h3>Stream–table duality</h3>
        <p>The deepest idea in this entire course: <b>a stream and a table are two views of the same
        information.</b></p>
        <ul class="clean">
          <li>A <b>table</b> is the current state — the result of applying every event up to now. It
          answers "what is true right now?"</li>
          <li>A <b>stream</b> is the changelog — the sequence of every change that produced that state.
          It answers "how did we get here?"</li>
        </ul>
        <p>You can turn one into the other, losslessly. <b>Replay the stream</b> and you rebuild the
        table (this is what checkpoint recovery and CDC bootstrapping do). <b>Capture a table's changes</b>
        and you get a stream (this is exactly what Change Data Capture is). Databases have always worked
        this way internally: the <b>write-ahead log</b> is the source of truth and the tables/indexes are
        materialized views over it. Streaming simply makes that log a first-class, shared asset.</p>
        <div class="lx-flow">
          <span class="lx-flow-node">Stream of events</span><span class="lx-flow-arrow">→ aggregate →</span>
          <span class="lx-flow-node">Table (current state)</span><span class="lx-flow-arrow">→ CDC →</span>
          <span class="lx-flow-node">Stream of changes</span>
        </div>
        <h3>Log compaction: keeping a table <i>inside</i> a stream</h3>
        <p>If you only care about the latest value per key (e.g. "current status of each {ENTITY}"),
        infinite retention is wasteful. <b>Log compaction</b> keeps the most recent event per key and
        garbage-collects older ones, so the compacted log <i>is</i> a durable table. A special
        <b>tombstone</b> (a null-valued event for a key) marks a deletion. This is how Kafka stores
        consumer offsets and how many systems ship a "current state" topic without a separate database.</p>
        <div class="lx-callout lx-info"><b>Why principals love this framing.</b><div>"The log is the
        source of truth and databases are just cached, queryable views of it" reframes integration:
        instead of N services syncing N databases point-to-point (an N² mess), everyone derives their
        own view from one shared log. This is the backbone of event-driven architecture.</div></div>` },
      { id: 'pitfalls', label: '⚠️ Design pitfalls', body: `
        <h3>Events vs commands — don't confuse them</h3>
        <p>A <b>command</b> ("CancelOrder") is a request that may be rejected; an <b>event</b>
        ("OrderCancelled") is a fact that already happened. Putting commands on an event log and
        treating them as facts leads to systems that act on things that never actually occurred. Log
        facts; send commands separately.</p>
        <h3>Fat events vs thin events</h3>
        <p>A <b>thin event</b> carries just ids ("order 9001 changed — go look it up"); a <b>fat event</b>
        carries the full state. Thin events couple every consumer to your database and create a thundering
        herd of lookups; fat events are self-contained and replayable but bigger and can leak internal
        structure. The seasoned default is <b>"event-carried state transfer"</b>: include the data
        consumers actually need so they don't call back, while keeping the payload a deliberate contract.</p>
        <h3>Other classics</h3>
        <ul class="clean">
          <li><b>Mutable thinking:</b> trying to "update" an event instead of appending a correcting one.</li>
          <li><b>Assuming global order:</b> relying on cross-key ordering the log never promised.</li>
          <li><b>No schema / no registry:</b> JSON blobs that drift until a consumer silently breaks.</li>
          <li><b>Key chosen for convenience, not correctness:</b> picking a key that doesn't match the
          ordering or co-location you actually need (Module 04).</li>
        </ul>` },
      { id: 'iq', label: '🎤 Interview', body: iq([
        { q: 'Why must events be immutable?', a: `Immutability is what makes replay, auditing, and
          recovery possible. Because history is never rewritten, you can rebuild any past state by
          re-reading the log, reprocess with fixed logic, and prove what the system knew and when. A
          correction is modeled as a new event, not an edit. Mutable records discard their own history and
          make deterministic reprocessing impossible.` },
        { q: 'Explain stream–table duality.', a: `A table is the current state — the fold of all events so
          far; a stream is the changelog that produced it. They're interconvertible: aggregate a stream to
          materialize a table; capture a table's changes (CDC) to produce a stream. Databases already work
          this way internally — the write-ahead log is the truth and tables are views over it. Streaming
          promotes that log to a shared, first-class asset so many consumers build their own views from
          one source of truth.` },
        { q: 'What is log compaction and when would you use it?', a: `Compaction retains only the latest
          event per key and garbage-collects older ones, so the log becomes a durable "current state per
          key" table; a null-valued tombstone marks deletion. Use it for state-like topics — current
          account status, latest config, consumer offsets — where you don't need full history, only the
          most recent value. You would NOT compact an audit or analytics stream where every event matters.` },
        { q: 'Is ordering guaranteed in a stream?', a: `Only per key / per partition, never globally. A
          partitioned log has no single clock, so there is no total order across partitions. Design for
          this: put everything that must be ordered together under the same key (so it lands on the same
          partition), and never rely on the relative order of events with different keys.` },
        { q: 'Fat events or thin events?', a: `Thin events carry only ids and force every consumer back to
          your database — tight coupling and lookup storms, and they aren't self-contained on replay. Fat
          events (event-carried state transfer) include the data consumers need, so they're decoupled and
          replayable, at the cost of size and the discipline of treating the payload as a real contract. I
          default to carrying the state consumers need, with a schema registry governing evolution.` },
      ]) },
    ],
  },
  {
    id: 'f03', num: '03', icon: '🔀', title: 'Producers, brokers & consumers',
    idea: 'Producers write, brokers durably store & order, consumers read at their own pace — decoupled in time, space, and rate.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>The three roles</h3>
        <ul class="clean">
          <li><b>Producer</b> — writes events into the log. It does not know or care who reads them, how
          many consumers there are, or whether any exist yet.</li>
          <li><b>Broker</b> (the streaming platform) — durably stores events in order, replicates them
          for fault tolerance, and serves reads. The broker is the contract between the two sides.</li>
          <li><b>Consumer</b> — reads events at <i>its own</i> pace and position, and does work with them.
          Multiple independent consumers can read the same stream without affecting each other.</li>
        </ul>
        <h3>Three kinds of decoupling — the whole point</h3>
        <p>Producers and consumers never talk directly; the durable log sits between them. That buys:</p>
        <ul class="clean">
          <li><b>Temporal decoupling:</b> a consumer can be offline for an hour and catch up later; a slow
          consumer never slows the producer. The buffer absorbs the mismatch.</li>
          <li><b>Rate decoupling:</b> bursts from the producer don't overwhelm consumers — the log absorbs
          the spike and consumers drain it at a sustainable rate (back to Module 12's backpressure).</li>
          <li><b>Logical decoupling:</b> you can add a brand-new consumer that re-reads all of history
          without the producer knowing or changing. New use cases attach to existing data for free.</li>
        </ul>
        <div class="lx-callout lx-info"><b>Log, not queue.</b><div>A traditional message <i>queue</i>
        deletes a message once it's consumed, so a message has exactly one reader and no replay. A
        streaming <i>log</i> keeps events after they're read (until retention expires), so many
        independent consumer groups each read the same stream from their own position, and any of them
        can rewind. That single difference is why logs power data integration and queues power task
        dispatch.</div></div>` },
      { id: 'groups', label: '👥 Consumer groups & scaling', body: `
        <h3>Groups give you both fan-out and load-sharing</h3>
        <p>Consumers organize into <b>consumer groups</b>. The rule:</p>
        <ul class="clean">
          <li><b>Within a group</b>, each partition is read by exactly one member — so the group
          <i>shares the load</i> and processes each event once. Add members to parallelize, up to one
          member per partition.</li>
          <li><b>Across groups</b>, every group gets its <i>own</i> copy of the stream at its own position
          — so you <i>fan out</i> the same data to the fraud team, the analytics team, and the archive,
          each independent.</li>
        </ul>
        <h3>Partition count is your parallelism ceiling</h3>
        <p>Because a partition is read by at most one member of a group, <b>the partition count caps a
        group's parallelism</b>. 12 partitions → at most 12 useful consumers in a group; a 13th sits idle.
        This makes partition count a capacity-planning decision you must get roughly right up front
        (Module 04), since increasing it later reshuffles key→partition mapping.</p>
        <h3>Rebalancing: the cost of elasticity</h3>
        <p>When a member joins, leaves, or dies, the group <b>rebalances</b> — partitions are reassigned
        across the surviving members. During a naive (stop-the-world) rebalance, processing <i>pauses</i>.
        Frequent rebalances — from flapping consumers, long GC pauses, or processing that exceeds the
        poll interval so the broker thinks the member died — are a classic production pathology. Mitigations
        include cooperative/incremental rebalancing and static group membership so brief restarts don't
        trigger a full reshuffle.</p>
        <div class="lx-callout lx-warn"><b>The silent lag-spike cause.</b><div>If your handler occasionally
        takes longer than the max poll interval, the broker evicts the consumer, triggers a rebalance,
        and lag jumps — even though nothing "crashed". Diagnose by correlating lag spikes with rebalance
        events. (This exact pattern appears in the Incident Lab.)</div></div>` },
      { id: 'push', label: '🔁 Push vs pull & delivery', body: `
        <h3>Why streaming logs are pull-based</h3>
        <p>A broker could <b>push</b> events to consumers or let consumers <b>pull</b>. Streaming logs
        are overwhelmingly pull: the consumer asks for the next batch at its own pace. Pull makes
        <b>backpressure natural</b> — a slow consumer simply asks for more less often, and the broker
        never overruns it — and it lets each consumer control its own position (replay, skip, pause).
        The cost is a little latency (polling) and the need to tune fetch sizes. Push systems can be
        lower-latency but must implement flow control to avoid drowning slow consumers.</p>
        <h3>Where delivery guarantees begin</h3>
        <p>The producer→broker and broker→consumer hops each have their own failure semantics, and the
        <b>end-to-end</b> guarantee is the weakest link across them (Module 11). On the producer side,
        idempotent/transactional producers prevent duplicates from retries; on the consumer side, <i>when
        you commit your position</i> relative to doing the work decides at-most-once vs at-least-once.</p>
        <div class="lx-flow">
          <span class="lx-flow-node">Producer</span><span class="lx-flow-arrow">→ ack? →</span>
          <span class="lx-flow-node">Broker (durable, replicated log)</span><span class="lx-flow-arrow">→ pull →</span>
          <span class="lx-flow-node">Consumer group</span>
        </div>` },
      { id: 'sizing', label: '📐 Sizing in production', body: `
        <h3>Sizing a consumer group like a principal</h3>
        <p>"How many consumer instances?" is answered the same way as partitions — from throughput, bounded
        by a hard ceiling — plus two group-specific dials interviewers love: the <b>rebalance budget</b>
        and the <b>poll-interval headroom</b>. Numbers first, then the operational caveats.</p>
        <div class="lx-callout lx-info"><b>The brief.</b><div>Topic has <b>120 partitions</b>. Peak
        <b>200,000 events/s</b>; one consumer instance sustains <b>10,000 events/s</b> end-to-end
        (including the downstream write). Each record takes up to <b>40 ms</b> to process. Recovery SLA:
        tolerate the loss of one instance without falling behind.</div></div>

        <h3>Step 1 — Instance count = throughput need, capped by partitions</h3>
        <div class="lx-code"><div class="lx-code-lang">calc</div><pre><code>need (throughput) = 200,000 / 10,000 = 20 instances
ceiling (parallelism) = 120 partitions → at most 120 useful instances
+1 for fault tolerance (lose one, 19 still ≥ 20? no) → run 22–24
</code></pre></div>
        <p>Start from throughput (20), check it against the <b>hard ceiling</b> — a group can never use
        more instances than partitions, so a 121st consumer sits idle — then add fault-tolerance headroom
        so losing an instance doesn't drop you below the required 20. You want partitions to divide
        <i>evenly</i> across instances too: 120 / 24 = 5 partitions each; 120 / 22 ≈ uneven, so some
        instances carry 6 partitions and become the lagging tail. Pick an instance count that divides the
        partition count cleanly.</p>

        <h3>Step 2 — Budget the poll interval against your worst-case batch</h3>
        <p>The broker evicts a consumer that doesn't poll within <code>max.poll.interval.ms</code>, which
        triggers a rebalance and a lag spike. So that interval must exceed your <i>worst-case</i> time to
        process one fetched batch:</p>
        <div class="lx-code"><div class="lx-code-lang">calc</div><pre><code>batch time ≈ max.poll.records × per-record time
           = 500 records × 40 ms = 20 s   ← must be < max.poll.interval.ms
</code></pre></div>
        <p>If <code>max.poll.records</code> × worst-case per-record latency approaches the poll interval,
        a slow batch (a GC pause, a sluggish downstream) blows the deadline, the member is evicted, and the
        group stop-the-world rebalances — the "silent lag spike" from the previous tab. The fix is to
        <b>shrink the batch</b>, <b>raise the interval</b>, or move slow I/O off the poll thread, not to
        add instances.</p>

        <h3>Step 3 — Budget rebalances, not just steady state</h3>
        <ul class="clean">
          <li><b>Rebalance cost scales with instance count and state.</b> A stateful group reassigning
          partitions must reload keyed state for moved partitions; more instances = more churn per deploy.
          Favor <b>cooperative/incremental rebalancing</b> (only moved partitions pause) and <b>static
          membership</b> so a rolling restart doesn't trigger a full reshuffle.</li>
          <li><b>Deploy strategy is a sizing input.</b> With 24 instances and stop-the-world rebalancing,
          a rolling deploy can trigger many pauses; sizing the group larger makes this <i>worse</i>, not
          better. The group's size trades throughput and fault tolerance against rebalance pain.</li>
          <li><b>Offset-commit load:</b> every instance commits offsets to the group coordinator; very
          frequent commits across many instances add broker load. Commit on a sensible cadence, not per
          record, unless correctness demands it.</li>
        </ul>

        <div class="lx-callout lx-ok"><b>Interview-ready summary.</b><div>"I size instances as peak events/s
        over per-instance throughput — 20 here — capped at the partition count (120) because a group can't
        use more consumers than partitions, plus headroom so losing one instance doesn't drop me below the
        need, and I pick a count that divides the partitions evenly to avoid a lagging tail. Then I check
        that max.poll.records × worst-case per-record time stays under the poll interval so a slow batch
        doesn't get me evicted and rebalanced, and I budget rebalances explicitly — cooperative rebalancing,
        static membership, a deploy strategy that doesn't stop-the-world — because past a point adding
        instances buys rebalance pain, not throughput."</div></div>` },
      { id: 'iq', label: '🎤 Interview', body: iq([
        { q: 'How do you size the number of consumer instances in a group?', a: `Peak events/s divided by
          one instance's end-to-end throughput gives the need; that's capped by the partition count because
          a group can never use more consumers than partitions (extras idle). Add headroom so losing an
          instance doesn't drop you below the need, and choose a count that divides the partitions evenly so
          no instance carries an extra partition and becomes the lagging tail. Then sanity-check the poll
          interval and rebalance cost — past a point more instances buys rebalance pain, not throughput.` },
        { q: 'How does max.poll.records interact with the poll interval, and why does it matter for sizing?',
          a: `The broker evicts a consumer that doesn't poll within max.poll.interval.ms. Your worst-case
          batch time is roughly max.poll.records × worst-case per-record latency, and it must stay under
          that interval — otherwise a slow batch (GC, sluggish sink) misses the deadline, the member is
          evicted, and the group rebalances, spiking lag even though nothing crashed. So I size the batch
          and interval against worst-case processing time, and move slow I/O off the poll thread, rather
          than adding instances to a group that's really rebalance-bound.` },
        { q: 'What is the difference between a log and a queue, and why does it matter?', a: `A queue
          deletes a message when it's consumed — one reader, no replay, good for task dispatch. A log
          retains events until retention expires, so many independent consumer groups each read from their
          own position and any of them can rewind and replay. That retention is what makes a log the
          backbone of data integration: new consumers and reprocessing come for free, which a queue can't
          offer.` },
        { q: 'How do consumer groups give both load-sharing and fan-out?', a: `Within a group, each
          partition is assigned to exactly one member, so the group splits the work and processes each
          event once — add members to scale up to one per partition. Across groups, every group gets its
          own independent copy of the stream at its own offsets, so different teams/use cases fan out from
          the same data without interfering.` },
        { q: 'Why does partition count cap consumer parallelism?', a: `Because within a group a partition
          is consumed by at most one member. With N partitions, at most N members do useful work; extras
          idle. So partition count is a parallelism ceiling you set up front, and it's awkward to raise
          later because it changes the key→partition hash mapping and can disrupt per-key ordering and
          keyed state.` },
        { q: 'What causes consumer rebalancing and why is it a problem?', a: `A rebalance fires whenever
          group membership changes — a consumer joins, leaves, crashes, or is evicted for missing the poll
          interval (often due to slow processing or long GC). A stop-the-world rebalance pauses processing,
          so frequent ones cause lag spikes. Fixes: make handlers fast or raise the poll interval,
          use cooperative/incremental rebalancing, and static membership so brief restarts don't reshuffle
          everything.` },
        { q: 'Why are streaming consumers pull-based rather than push-based?', a: `Pull makes backpressure
          natural — the consumer requests the next batch at its own sustainable rate, so the broker never
          overruns it — and it lets each consumer own its position for replay and pause. The trade-off is
          slightly higher latency from polling and the need to tune fetch sizes. Push can be lower-latency
          but must add explicit flow control to avoid drowning slow consumers.` },
      ]) },
    ],
  },
  {
    id: 'f04', num: '04', icon: '🧩', title: 'Partitions & shards',
    idea: 'Partitioning turns one bottlenecked log into many parallel sub-logs while preserving order per key — and the key you choose decides your scaling, your hotspots, and your joins.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>One log can't scale — so split it</h3>
        <p>A single totally-ordered log is a bottleneck: one writer, one reader, one disk, one machine's
        throughput. The fix is to split the stream into <b>partitions</b> (Kafka) / <b>shards</b>
        (Kinesis) / <b>partitions</b> (Event Hubs) — independent sub-logs, each totally ordered within
        itself, that live on different machines and can be written and read in parallel. You trade a
        single global order (which you rarely need) for horizontal scale (which you always need).</p>
        <h3>The key decides the partition — and therefore decides order</h3>
        <p>An event's <b>key</b> is hashed to pick its partition. <b>Same key → same partition → order
        preserved for that key.</b> Different keys spread across partitions for parallelism. In the active
        scenario we key on <code>{KEY}</code>, so all events for one {ENTITY} stay strictly ordered
        together, while unrelated {ENTITY}s process fully in parallel. This is the central bargain of
        partitioning: <i>you get ordering exactly where you asked for it (per key) and parallelism
        everywhere else.</i></p>
        <h3>What a null key means</h3>
        <p>If you produce without a key, events are spread across partitions (round-robin, or a "sticky"
        batch-friendly assignment) for maximum balance — but you give up per-key ordering entirely.
        Only do this when ordering genuinely doesn't matter (e.g. independent log lines).</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">
          <li>Partition = an independent, totally-ordered sub-log; parallelism = partition count.</li>
          <li>The key is simultaneously the <b>ordering unit</b>, the <b>co-location unit</b>, and the
          <b>unit of keyed state</b> — three jobs, one choice.</li>
          <li>No key → maximum spread, zero ordering. Choose deliberately.</li>
        </ul></div>` },
      { id: 'math', label: '🔢 The routing rule', body: `
        <h3>How a key becomes a partition</h3>
        <p>The platform computes a deterministic function of the key:</p>
        <div class="lx-code"><div class="lx-code-lang">concept</div><pre><code>partition = toPositive(hash(serialize(key))) % numPartitions</code></pre></div>
        <p>Determinism is the whole point: the same key always lands on the same partition — <i>as long
        as the partition count doesn't change.</i> Kafka's default partitioner uses <b>murmur2</b> over
        the serialized key bytes. You can watch real keys route live, running the genuine algorithm, in
        <b>Kafka → Partition Simulator</b>.</p>
        <h3>Why repartitioning hurts</h3>
        <p>Because partition is <code>hash(key) % N</code>, changing <code>N</code> remaps almost every
        key to a different partition. That breaks per-key ordering across the change boundary and, worse,
        scatters your <b>keyed state</b> (Module 09) so it no longer lines up with incoming events. This
        is why you can usually <i>add</i> partitions but it's disruptive, and why you size partition count
        with headroom up front. Some systems (e.g. consistent hashing / Kinesis shard splitting) reduce
        the blast radius, but none make it free.</p>
        <div class="lx-callout lx-info"><b>Sizing method, not a magic number.</b><div>Estimate target
        throughput (events/s × bytes/event), divide by the per-partition ceiling your platform documents,
        then add headroom for growth and for consumer parallelism (you need ≥ one partition per consumer
        thread you'll ever want). Treat concrete per-partition limits as platform-specific — look them up
        in the provider section rather than assuming a universal number.</div></div>` },
      { id: 'hot', label: '🔥 Hot partitions & skew', body: `
        <h3>The failure mode that ignores your average</h3>
        <p>Partitioning balances <i>keys</i>, not <i>load</i>. If one key is far busier than the rest — a
        celebrity account, a mega-seller on a sale day, a single misbehaving device — its partition
        becomes a <b>hot partition</b>: it saturates while its siblings idle. Your cluster's average
        utilization looks fine; one partition is on fire. Symptoms: lag concentrated on one
        partition/consumer, tail latency spikes, one over-worked task.</p>
        <h3>Why you can't just add consumers</h3>
        <p>A single partition is consumed by a single member of a group, so <b>a hot partition cannot be
        parallelized by adding consumers</b> — the hot key's events are serialized by design (that's the
        ordering guarantee you asked for). The bottleneck is structural, not a provisioning problem.</p>
        <h3>Remedies (each with a trade-off)</h3>
        <ul class="clean">
          <li><b>Better key:</b> pick a key with higher natural cardinality and flatter distribution.</li>
          <li><b>Salting / compound key:</b> append a bucket to the hot key
          (<code>{KEY}#0..{KEY}#9</code>) to spread it — but you lose strict ordering for that key and must
          re-aggregate downstream. Use only when per-key order isn't required.</li>
          <li><b>Two-stage aggregation:</b> pre-aggregate per salted sub-key, then combine — classic skew
          fix borrowed from batch.</li>
          <li><b>Isolate the whale:</b> route known hot keys to dedicated capacity.</li>
        </ul>
        <div class="lx-callout lx-warn"><b>Principal instinct.</b><div>When someone says "just add more
        partitions/consumers and the lag will clear", check for skew first. If the lag lives on one
        partition, more consumers do nothing — the hot key is serialized by the very guarantee you rely
        on. The fix is in the <i>key</i>, not the capacity.</div></div>` },
      { id: 'sizing', label: '📐 Sizing in production', body: `
        <h3>How a principal actually sizes partitions</h3>
        <p>In a design interview "how many partitions?" is never answered with a number — it's answered
        with a <b>method</b>: start from throughput, bound it by three independent ceilings, take the max,
        then add headroom. Here is the full walk-through on a concrete brief.</p>
        <div class="lx-callout lx-info"><b>The brief.</b><div>Order-events topic for {ENTITY}s. Peak
        <b>200,000 events/s</b>, average event <b>1 KB</b> serialized. Processing is moderately heavy
        (enrichment + a keyed aggregation): a single consumer task sustains about <b>8,000 events/s</b>.
        Retention 7 days. Expected 3× growth over two years.</div></div>

        <h3>Step 1 — Size three independent ceilings</h3>
        <p>Partition count must satisfy <i>every</i> constraint, so compute each one and take the largest.</p>
        <div class="lx-table-wrap"><table class="lx-table">
          <thead><tr><th>Ceiling</th><th>Formula</th><th>This brief</th></tr></thead>
          <tbody>
            <tr><td><b>Ingest throughput</b></td>
              <td>peak bytes/s ÷ safe per-partition write rate</td>
              <td>200k × 1 KB = 200 MB/s. At a conservative ~10 MB/s per partition → <b>≥ 20</b></td></tr>
            <tr><td><b>Consumer parallelism</b></td>
              <td>peak events/s ÷ per-task throughput</td>
              <td>200,000 ÷ 8,000 = <b>≥ 25</b> (one partition per task you'll ever run concurrently)</td></tr>
            <tr><td><b>Catch-up / replay</b></td>
              <td>must drain a backlog within an SLA, not just keep up</td>
              <td>To recover a 1-hour outage in 15 min you need ~4× live consume → <b>≥ 100</b></td></tr>
          </tbody>
        </table></div>
        <p>The binding constraint here is <b>catch-up</b>, not steady-state — a classic principal catch.
        A topic sized only for "keep up" can never recover from an incident, because at 1× you clear a
        1-hour backlog in exactly 1 hour while new data keeps arriving. Size for the <i>recovery</i> rate
        you promised, then the steady-state numbers fall out for free.</p>

        <h3>Step 2 — Take the max, then add headroom</h3>
        <p>max(20, 25, 100) = 100. Now layer growth and operability:</p>
        <ul class="clean">
          <li><b>Growth (3×):</b> because raising partition count later breaks key→partition mapping and
          scatters keyed state (see <i>The routing rule</i> tab), bake in the two-year number now:
          100 × 3 = 300.</li>
          <li><b>Round for rebalance math:</b> pick a count that divides evenly across your likely
          consumer counts and brokers so partitions spread uniformly — e.g. round 300 → a clean number
          your team standardizes on. Avoid primes.</li>
          <li><b>Sanity-check the ceiling:</b> more partitions isn't free — each adds open file handles,
          replication connections, controller metadata, and rebalance time, and it raises end-to-end
          latency (more, smaller batches) and the cost of an exactly-once commit across more
          transactional partitions. Thousands of partitions per topic is a smell; revisit the key or
          split the topic first.</li>
        </ul>

        <h3>Step 3 — State the assumptions out loud</h3>
        <p>The number is only as good as its inputs, so a strong answer names them: the <b>per-partition
        write ceiling</b> is platform- and hardware-specific (look it up for your broker/instance, don't
        assume a universal value); <b>per-task throughput</b> comes from a load test of your real
        processing, not a guess; and the whole calculation assumes <b>no skew</b> — a single hot
        {ENTITY} can saturate one partition while the other 299 idle, so pair sizing with the skew
        analysis in the next tab. Sizing gets you the floor; key design keeps you off the ceiling.</p>

        <div class="lx-callout lx-ok"><b>Interview-ready summary.</b><div>"I size partitions as the max of
        three ceilings — ingest bytes/s over the per-partition write limit, peak events/s over
        per-task throughput, and the catch-up rate my recovery SLA demands — then multiply for growth
        because repartitioning is disruptive, round for even rebalancing, and cap it so I don't drown the
        cluster in metadata. For this brief that's ~100 driven by catch-up, ~300 with 3× growth headroom.
        And I'd flag that none of it survives a hot key, so I'd validate the key's distribution
        separately."</div></div>` },
      { id: 'iq', label: '🎤 Interview', body: iq([
        { q: 'What does the partition key control?', a: `Three things at once: ordering (same key → same
          partition → ordered), co-location (events that must be processed together share a partition), and
          keyed-state placement (the state for a key lives with its partition). Because one choice drives
          all three, picking the key is a real design decision — you choose it to match the ordering and
          aggregation you actually need, then check its cardinality and distribution for skew.` },
        { q: 'Why is increasing partition count disruptive?', a: `Partition = hash(key) % N, so changing N
          remaps almost every key to a new partition. That breaks per-key ordering across the change and
          scatters keyed state so it no longer aligns with incoming events — stateful jobs may need
          rebuilding. So you size with headroom up front; you can usually add partitions but it's a
          deliberate, disruptive operation, not a routine scale knob.` },
        { q: 'A consumer group is lagging. You added consumers and nothing improved. Why?', a: `Almost
          certainly a hot partition. A single partition is consumed by one member, so if the backlog lives
          on one partition (a hot key — celebrity user, mega-seller), adding consumers can't help; the hot
          key's events are serialized by the ordering guarantee itself. Confirm by checking per-partition
          lag. The fix is in the key: raise cardinality, salt the hot key (trading ordering), or isolate
          the whale — not more consumers.` },
        { q: 'How do you decide how many partitions a topic needs?', a: `Not with a number — with a method.
          I take the max of three independent ceilings: ingest bytes/s divided by the platform's safe
          per-partition write rate; peak events/s divided by one task's measured throughput (one partition
          per concurrent task); and the catch-up rate my recovery SLA demands — which is usually the
          binding constraint, because a topic sized only to "keep up" can never drain a backlog. Then I
          multiply for expected growth since repartitioning is disruptive, round to a count that divides
          evenly for clean rebalancing, and cap it so I don't bury the cluster in metadata. Finally I say
          the inputs out loud — per-partition limit is platform-specific, per-task throughput comes from a
          load test — and flag that the whole estimate assumes no skew, so a hot key still has to be
          designed out separately.` },
        { q: 'When would you produce with a null key?', a: `When per-key ordering genuinely doesn't matter
          and you want maximum balance — e.g. independent log/telemetry lines. A null key spreads events
          across all partitions (round-robin / sticky batching) for even load, but you forfeit ordering
          entirely, so never use it for anything where sequence matters.` },
      ]) },
    ],
  },
  {
    id: 'f05', num: '05', icon: '📍', title: 'Offsets, positions & replay',
    idea: 'Reading never deletes; each consumer just tracks its own position — and that one design choice gives you replay, lag, and independent consumers for free.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>Position, not deletion</h3>
        <p>Every event in a partition has a monotonically increasing <b>offset</b> (Kafka) / <b>sequence
        number</b> (Kinesis). A consumer remembers "I've processed up to offset N" — its <b>committed
        position</b> — and reading does <i>not</i> delete anything. Data lives until <b>retention</b>
        (time- or size-based) expires, independent of who has read it.</p>
        <p>This inverts the queue model. In a queue the <i>server</i> tracks what's been delivered and
        throws it away; in a log the <i>consumer</i> tracks its own position over data that stays put.
        Moving that responsibility to the consumer is what unlocks the next three superpowers.</p>
        <h3>What you get for free</h3>
        <ul class="clean">
          <li><b>Replay / reprocessing:</b> rewind the committed position and re-read history — to backfill
          a new consumer, rerun fixed logic, or retrain a model on real past data.</li>
          <li><b>Lag as a first-class metric:</b> <code>lag = latest offset − committed offset</code> — the
          single clearest health signal in all of streaming (Module 14).</li>
          <li><b>Independent consumers:</b> each consumer group keeps its own positions over the same data,
          so teams progress, pause, and rewind without touching each other.</li>
        </ul>
        <div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">
          <li>Offsets are per-partition, monotonic, and owned by the consumer group.</li>
          <li>Retention — not consumption — decides when data disappears.</li>
          <li>Rewinding a position = time travel over immutable history.</li>
        </ul></div>` },
      { id: 'commit', label: '✅ Commit semantics', body: `
        <h3>When you commit decides whether you lose or duplicate</h3>
        <p>The ordering of two actions — <i>commit the position</i> and <i>do the work / produce the
        output</i> — is the entire basis of delivery guarantees (Module 11):</p>
        <div class="lx-table-wrap"><table class="lx-table"><thead><tr>
          <th>Order</th><th>On crash between the two…</th><th>Guarantee</th></tr></thead><tbody>
          <tr><td><b>Commit, then process</b></td><td>…the event is marked done but never processed → it's
          lost.</td><td>At-most-once</td></tr>
          <tr><td><b>Process, then commit</b></td><td>…the work happened but the commit didn't → on restart
          it's reprocessed → duplicate.</td><td>At-least-once</td></tr>
          <tr><td><b>Atomic: process + commit together</b></td><td>…either both or neither happen (via
          transactions or checkpoint-coupled offsets).</td><td>Effectively-once (conditional)</td></tr>
        </tbody></table></div>
        <p>Auto-commit on a timer is convenient but makes the window fuzzy: it can commit offsets for events
        you haven't finished processing. For correctness-sensitive work, commit <b>manually, after</b> the
        output is safely durable.</p>
        <h3>Where to start when there's no committed offset</h3>
        <p>A brand-new consumer has no position. The <b>auto-offset-reset</b> policy decides: start at the
        <b>earliest</b> retained offset (replay everything — good for backfills, risky if retention is huge)
        or the <b>latest</b> (only new events — good for live-only consumers, but you skip the backlog).
        Getting this wrong is a classic "my new consumer processed six months of history and melted
        downstream" (or the opposite, "it silently skipped the backlog") incident.</p>` },
      { id: 'replay', label: '⏪ Replay in practice', body: `
        <h3>Replay is a capability, not a happy accident</h3>
        <p>Because history is immutable and positions are seekable, you can deliberately replay. Common
        operational uses:</p>
        <ul class="clean">
          <li><b>Backfill a new view:</b> stand up a new consumer with reset=earliest and let it build its
          state from the whole log.</li>
          <li><b>Fix-and-reprocess:</b> you shipped a bug that miscomputed results for a week → deploy the
          fix, rewind to just before the bug, reprocess.</li>
          <li><b>Model retrain / experiment:</b> replay real production events through a new pipeline
          offline.</li>
          <li><b>Disaster recovery:</b> rebuild a corrupted downstream store from the log.</li>
        </ul>
        <h3>The two things that make replay safe (or not)</h3>
        <ul class="clean">
          <li><b>Retention must cover the window you want to replay.</b> You can't rewind past what's been
          deleted. Tiered storage (offloading old segments to object storage) makes long/infinite retention
          affordable — the enabler behind Kappa-style reprocessing.</li>
          <li><b>Downstream writes must be idempotent or transactional</b> (Module 11/13), or replay will
          double-apply side effects. Replaying into a non-idempotent sink turns "reprocess" into "corrupt".</li>
        </ul>
        <div class="lx-callout lx-danger"><b>Replay is not free of side effects.</b><div>Rewinding
        re-emits every output in that range. If your pipeline sends emails, charges cards, or appends
        (not upserts) to a store, naive replay repeats those actions. Design sinks for replay <i>before</i>
        you need to replay in an incident.</div></div>` },
      { id: 'retention', label: '🗄️ Retention sizing', body: `
        <h3>Retention is a policy decision with a price tag</h3>
        <p>Retention answers one question — "how far back can anyone rewind?" — and every answer is a
        trade between <b>capability</b> (replay window, audit, backfill) and <b>cost</b> (disk × replication).
        A principal doesn't pick a round number like "7 days" by habit; they derive it from requirements,
        price it, and then decide <i>where</i> the bytes live. This tab is the dedicated walk-through.</p>

        <h3>Step 1 — Two kinds of retention, picked by data shape</h3>
        <p>Before sizing anything, choose the <i>mechanism</i>, because it changes what "retention" even
        means:</p>
        <div class="lx-table-wrap"><table class="lx-table">
          <thead><tr><th>Mode</th><th>Keeps</th><th>Use when</th><th>Sizing driver</th></tr></thead>
          <tbody>
            <tr><td><b>Delete (time/size)</b></td><td>Every event until it ages out</td>
              <td>Event streams, facts, audit — you care about <i>history</i></td>
              <td>throughput × window × replication</td></tr>
            <tr><td><b>Compact (log compaction)</b></td><td>The latest value per key, forever (+ tombstones for deletes)</td>
              <td>Changelogs, current-state topics, CDC, config — you care about <i>latest state</i></td>
              <td>distinct key count × avg record size × replication</td></tr>
          </tbody>
        </table></div>
        <p>This is the single biggest retention lever and the one juniors miss: a current-state topic
        (e.g. "{ENTITY} → latest status") sized with <i>delete</i> retention grows without bound, but under
        <b>compaction</b> it's bounded by the number of distinct {KEY}s, not by traffic. You can also run
        <b>compact + delete</b> together (keep latest-per-key, but still age out keys untouched for N days).</p>

        <h3>Step 2 — Derive the window from requirements, then price it</h3>
        <p>Pick the window from the <i>longest</i> real need, not a guess:</p>
        <ul class="clean">
          <li><b>Reprocess SLA:</b> "we must be able to rebuild from a bug found up to 30 days late" → ≥ 30 days.</li>
          <li><b>Backfill:</b> "a new consumer rebuilds its view from scratch" → as far back as the view needs.</li>
          <li><b>Compliance/audit:</b> a regulatory "keep N years" → long, and usually a tiered/archive concern.</li>
          <li><b>Disaster recovery:</b> rebuild a downstream store → cover your worst realistic outage + margin.</li>
        </ul>
        <p>Then price it — retention is literally a storage bill:</p>
        <div class="lx-code"><div class="lx-code-lang">calc</div><pre><code>stored bytes = throughput(bytes/s) × window(s) × replication factor
e.g. 50,000 ev/s × 1 KB × 30 days × RF3 ≈ 390 TB on broker disk</code></pre></div>
        <p>390 TB of hot broker disk to hold a 30-day rewind window is exactly the number that forces the
        next decision.</p>

        <h3>Step 3 — Decide WHERE the bytes live: hot disk vs tiered storage</h3>
        <p>You rarely need 30 days at hot-disk latency. The principal pattern is a <b>short hot window</b>
        on broker disk for live consumers plus <b>tiered storage</b> — older log segments offloaded to
        object storage — for the long tail:</p>
        <div class="lx-table-wrap"><table class="lx-table">
          <thead><tr><th>Tier</th><th>Holds</th><th>Latency</th><th>Cost/GB</th><th>Serves</th></tr></thead>
          <tbody>
            <tr><td><b>Hot (broker disk)</b></td><td>Hours–days</td><td>Low</td><td>High</td><td>Live consumers, normal catch-up</td></tr>
            <tr><td><b>Tiered (object store)</b></td><td>Weeks–∞</td><td>Higher per byte</td><td>Low</td><td>Replay, backfill, DR, audit</td></tr>
          </tbody>
        </table></div>
        <p>Tiered storage is what makes long — even effectively infinite — retention affordable, and it's
        the enabler behind <b>Kappa</b> architecture, where "the log <i>is</i> the source of truth" and you
        rebuild any downstream by replaying from the beginning. Without tiering, "retention = source of
        truth" is a ruinous disk bill; with it, it's a design choice.</p>

        <h3>Step 4 — Operational guards a principal states</h3>
        <ul class="clean">
          <li><b>Retention ≥ replay window, always.</b> You can't rewind past deleted data — a retention
          shorter than your reprocess SLA silently makes recovery impossible exactly when you need it.</li>
          <li><b>Per-topic overrides, not one global setting.</b> A high-volume clickstream and a
          low-volume config changelog have opposite retention needs; set them per topic.</li>
          <li><b>Retention ≠ consumer lag budget.</b> If a consumer can lag by hours, retention must exceed
          the max tolerated lag or a slow consumer loses data off the tail.</li>
          <li><b>Compaction isn't instant.</b> It runs in the background, so a compacted topic still holds
          some superseded versions transiently — size with a little headroom, don't assume exactly one
          record per key on disk.</li>
        </ul>

        <div class="lx-callout lx-ok"><b>Interview-ready summary.</b><div>"First I pick the mechanism:
        delete retention for event history, compaction for current-state/changelog topics — because a
        state topic under compaction is bounded by distinct key count, not traffic. Then I derive the
        window from the longest real need (reprocess SLA, backfill, compliance, DR) and price it:
        throughput × window × replication, which here is ~390 TB for 30 days at RF3. That cost pushes me to
        tiered storage — a short hot window on disk, long tail in object storage — which is what makes long
        retention and Kappa-style 'log as source of truth' affordable. And I'd set it per topic, keep it
        ≥ the replay window and ≥ the max consumer lag, and leave headroom for background
        compaction."</div></div>` },
      { id: 'sizing', label: '📐 Consumer/replay sizing', body: `
        <h3>Sizing retention and replay like a principal</h3>
        <p>Offsets are free; what you actually size around them is <b>retention</b> (how far back you can
        rewind) and <b>replay throughput</b> (how fast you can). The interview question is rarely "what's
        the offset?" — it's "how long do you keep data, how much storage is that, and how long does a
        full replay take?" Answer it the same way: throughput → storage → time, with the drivers named.</p>
        <div class="lx-callout lx-info"><b>The brief.</b><div>Order-events topic, sustained
        <b>50,000 events/s</b>, average <b>1 KB</b> serialized, replication factor <b>3</b>. Business wants
        to be able to reprocess the last <b>30 days</b> after a logic bug. A backfill consumer sustains
        <b>80,000 events/s</b>.</div></div>

        <h3>Step 1 — Retention is a storage bill, so size it</h3>
        <p>Retention isn't a free "keep everything" dial — every day of retention is disk you pay for,
        multiplied by replication.</p>
        <div class="lx-code"><div class="lx-code-lang">calc</div><pre><code>raw/day   = 50,000 ev/s × 1 KB × 86,400 s  ≈ 4.32 TB/day
30 days   = 4.32 TB × 30                   ≈ 130 TB (one replica)
on disk   = 130 TB × replication factor 3  ≈ 390 TB stored</code></pre></div>
        <p>390 TB on hot broker disk for a 30-day rewind window is the number that ends the "just keep it
        forever" conversation. The principal move is <b>tiered storage</b>: keep a short hot window
        (hours–days) on broker disk for live consumers, and offload older segments to object storage for
        cheap long/▸infinite retention. Replay then reads mostly from object storage — slower per byte,
        but a fraction of the cost, and it's what makes Kappa-style "retention = source of truth" affordable.</p>

        <h3>Step 2 — Replay time is throughput ÷ rate, and it bounds your recovery</h3>
        <p>"We can reprocess 30 days" is meaningless without <i>how long</i>. Compute it:</p>
        <div class="lx-code"><div class="lx-code-lang">calc</div><pre><code>backlog   = 50,000 ev/s × 86,400 × 30 ≈ 130 billion events
at 1× consume (80k/s) → 130e9 / 80,000 ≈ 18.8 days to replay (!)
to replay 30 days of data in 24 h you need ≈ 1.5 million ev/s drain
→ ≈ 19× the steady consume rate → size partitions + consumer instances for it</code></pre></div>
        <p>This is the catch most people miss: a replay rate equal to the <i>produce</i> rate takes as
        long as the history is old, and meanwhile new data keeps arriving. Your <b>recovery SLA</b> (how
        fast you must reprocess after a bug) is what sets the required consumer parallelism — which loops
        straight back to partition count (Module 04). Replay capacity and partition count are the same
        decision viewed from two directions.</p>

        <h3>Step 3 — The offset-store and commit-frequency trade-off</h3>
        <p>Two smaller sizing dials worth naming in an interview:</p>
        <ul class="clean">
          <li><b>Commit frequency:</b> committing every record is safe but adds load and latency;
          committing rarely shrinks overhead but widens the reprocess window on a crash (at-least-once
          means more duplicates to absorb). Size it to your duplicate-tolerance and idempotency, typically
          commit every N records or every few seconds.</li>
          <li><b>auto-offset-reset for a backfill:</b> <code>earliest</code> on a 30-day topic means a new
          group replays 130 B events on first start — throttle it, scale the sink, or run it out-of-band,
          or it melts downstream (the incident in <i>Commit semantics</i>).</li>
        </ul>

        <div class="lx-callout lx-ok"><b>Interview-ready summary.</b><div>"Retention is a storage decision:
        throughput × bytes × days × replication — here ~390 TB for 30 days at RF3, which is why I'd use
        tiered storage, hot window on disk and cold segments in object storage. Replay <i>time</i> is
        backlog ÷ drain rate: at 1× consume a 30-day replay takes ~30 days, so my recovery SLA sets the
        consumer parallelism and partition count, not the steady-state load. And I'd size commit frequency
        to my duplicate tolerance and guard auto-offset-reset=earliest so a backfill doesn't flood the
        sink."</div></div>` },
      { id: 'iq', label: '🎤 Interview', body: iq([
        { q: 'Delete retention vs log compaction — how do you choose, and why does it change sizing?', a:
          `Choose by what the topic represents. Delete (time/size) retention keeps every event until it
          ages out — right for event history, facts, and audit, and sized as throughput × window ×
          replication. Compaction keeps only the latest value per key (plus tombstones for deletes) — right
          for changelogs, current-state, CDC, and config topics, and sized by distinct key count × record
          size × replication, independent of traffic. That's the key insight: a current-state topic under
          delete retention grows without bound, but under compaction it's bounded by cardinality. You can
          also combine compact+delete to still age out keys untouched for N days.` },
        { q: 'How do you size retention, and what does 30-day retention actually cost?', a: `Retention is a
          storage bill: throughput × avg bytes × seconds × replication factor. At 50k ev/s × 1 KB that's
          ~4.3 TB/day raw, ×30 days ×RF3 ≈ 390 TB on broker disk — which is why "keep everything" doesn't
          survive contact with the storage cost. The principal answer is tiered storage: a short hot window
          on disk for live consumers, older segments offloaded to object storage for cheap long retention.
          That's what makes long replay windows (and Kappa-style reprocessing) affordable.` },
        { q: 'You say you can replay 30 days of history. How long does that take?', a: `backlog ÷ drain
          rate. 30 days at 50k ev/s is ~130 billion events; at a 1× consume rate (~80k/s) that's ~18 days
          to replay — and new data keeps arriving meanwhile. So "we retain 30 days" is not "we recover in
          30 days"; the recovery SLA sets the required drain rate (here ~19× steady to replay in a day),
          which sets consumer parallelism and therefore partition count. Replay capacity and partition
          sizing are the same decision.` },
        { q: 'How is a consumer offset different from a queue acknowledgement?', a: `An ack tells the
          server "delete this message, I've got it" — the server owns delivery state and the data is gone.
          An offset is the consumer's own bookmark over data that stays in the log until retention expires.
          Moving that state to the consumer is what enables replay, lag measurement, and multiple
          independent consumer groups over the same stream — none of which a queue's acks allow.` },
        { q: 'How does commit ordering determine delivery semantics?', a: `Commit-before-process risks
          losing events if you crash in between (at-most-once). Process-before-commit risks reprocessing on
          restart (at-least-once, the common safe default paired with idempotency). Making the process and
          the commit atomic — via transactions or checkpoint-coupled offsets — gives effectively-once, but
          only if the sink cooperates. So "when do you commit relative to the side effect?" is the real
          question behind guarantees.` },
        { q: 'A new consumer group melted a downstream service on deploy. What probably happened?', a: `Its
          auto-offset-reset was "earliest" with long retention, so on first start it replayed the entire
          backlog at full speed into a downstream sized for live traffic. Fixes: start at "latest" if
          history isn't needed; if it is, throttle the backfill, scale the sink for it, or run the backfill
          out-of-band. The mirror-image incident is reset=latest silently skipping a backlog you needed.` },
        { q: 'What must be true for replay to be safe?', a: `Two things. First, retention (possibly via
          tiered storage) must still cover the window you want — you can't rewind past deleted data. Second,
          downstream effects must be idempotent or transactional, because replay re-emits every output in
          the range; replaying into a non-idempotent sink double-applies side effects (duplicate charges,
          repeated emails). Replay-safety is a sink design decision you make before the incident.` },
      ]) },
    ],
  },
  {
    id: 'f06', num: '06', icon: '⏱️', title: 'Event time vs processing time',
    idea: 'When it happened ≠ when you saw it. Correct, reproducible results use event time — and paying for that correctness is the defining tax of real streaming.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>Two clocks, and they never agree</h3>
        <ul class="clean">
          <li><b>Event time</b> — when the event actually happened, stamped at the source (the phone, the
          sensor, the service). This is the truth about the world.</li>
          <li><b>Processing time</b> — when your pipeline happened to handle it (plus <b>ingestion time</b>,
          when it hit the broker — a third, intermediate clock).</li>
        </ul>
        <p>They diverge because of network delays, retries, mobile devices going offline, backlogs, and
        rebalances. A phone in a tunnel buffers {ENTITY} events and sends them 30 seconds later: same event
        time, much later processing time. Under load, your own backlog adds skew — exactly when you can
        least afford confusion.</p>
        <h3>Why event time is non-negotiable for correctness</h3>
        <p>Bucket data by <b>processing time</b> and your results depend on how fast your system happened to
        run. Reprocess yesterday's data on a faster cluster and you get <i>different numbers</i> — the
        aggregates are a property of your infrastructure, not the world. That's not a report; it's a
        measurement of your own latency. Bucket by <b>event time</b> and you get <b>correct, reproducible,
        replay-stable</b> results regardless of delays or how fast you reprocess. The price: you must now
        handle out-of-order and late data — which is precisely what watermarks (Module 07) exist for.</p>
        <div class="lx-callout lx-info"><b>When processing time is actually fine.</b><div>Not everything
        needs event-time rigor. "How many requests is my service handling right now?" is legitimately a
        processing-time question. Use processing time when you're measuring the <i>system</i>; use event
        time when you're measuring the <i>world</i> and need the answer to be stable across reruns.</div></div>` },
      { id: 'sim', label: '🔬 See the skew', body: `
        <h3>Out-of-order arrivals, visualized</h3>
        <p>Below, events are generated with random network delay. The <b>top row</b> is event time (truth —
        the order things happened); the <b>bottom row</b> is arrival order (what your pipeline actually
        sees). Watch them disagree — that gap is the entire reason watermarks and windows need care.</p>
        <div id="f06-sim" class="sim-wrap"></div>
        <p>Every red/late case you see here is an event whose window might already have fired. Internalize
        this picture: <i>arrival order is not event order, ever, in a distributed system.</i></p>` },
      { id: 'lens', label: '🧠 Principal\'s lens', body: `
        <h3>Where does the timestamp come from? (trust boundary)</h3>
        <p>Event time is only as trustworthy as the clock that stamped it. Source clocks can be <b>wrong</b>
        (unsynced devices), <b>skewed</b> (no NTP), or <b>adversarial</b> (a client lying about when
        something happened). A principal always asks: who stamps event time, can we trust it, and what do we
        do with timestamps far in the future or past? Common guardrails: clamp absurd timestamps, fall back
        to ingestion time when source time is missing/implausible, and monitor the distribution of
        (ingestion − event) time to catch clock problems early.</p>
        <h3>The three timestamps, and picking one per use case</h3>
        <div class="lx-table-wrap"><table class="lx-table"><thead><tr>
          <th>Clock</th><th>Set by</th><th>Use it for</th></tr></thead><tbody>
          <tr><td>Event time</td><td>Source</td><td>Correct business aggregates; anything that must be
          reproducible on replay.</td></tr>
          <tr><td>Ingestion time</td><td>Broker on receipt</td><td>A stable, trustworthy approximation when
          source clocks can't be trusted; SLA timers.</td></tr>
          <tr><td>Processing time</td><td>The operator</td><td>System-health metrics; lowest-latency,
          lowest-correctness.</td></tr>
        </tbody></table></div>
        <div class="lx-callout lx-warn"><b>The #1 streaming bug, restated.</b><div>Mixing the clocks —
        windowing on event time but joining on arrival, or comparing an event-time field against
        <code>now()</code> — produces results that look plausible and are quietly wrong, and only diverge
        under load or on replay. Name your time semantics explicitly in every stateful operator.</div></div>` },
      { id: 'iq', label: '🎤 Interview', body: iq([
        { q: 'Why prefer event time over processing time?', a: `Because event-time results are correct and
          reproducible: they describe what happened in the world and come out identical no matter how fast
          you process or reprocess. Processing-time results depend on your infrastructure's speed, so they
          change on replay or a faster cluster — you're measuring your own latency, not the data. The cost of
          event time is handling out-of-order and late events, which is what watermarks are for.` },
        { q: 'When is processing time the right choice?', a: `When you're measuring the system rather than
          the world, and reproducibility doesn't matter — e.g. "requests per second right now", live
          operational dashboards, or low-latency triggers where approximate timing is fine. It's cheaper (no
          watermark bookkeeping, no late-data handling) and lower latency; you just accept that reruns can
          differ.` },
        { q: 'The source timestamp can\'t be trusted. What do you do?', a: `Treat event time as data from a
          trust boundary. Monitor the (ingestion − event) distribution to detect skew, clamp or reject
          implausible timestamps (far future/past), and fall back to ingestion time when source time is
          missing or absurd. For adversarial clients, don't let client-supplied event time drive anything
          security- or billing-sensitive without a sanity check against a trusted clock.` },
      ]) },
    ],
    sim: 'skew',
  },
  {
    id: 'f07', num: '07', icon: '🌊', title: 'Watermarks',
    idea: 'A watermark is the engine\'s promise — "I\'ve probably seen everything up to time T" — and it is the single knob that trades correctness against latency.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>The out-of-order dilemma</h3>
        <p>If data can arrive late (Module 06), when is it safe to declare a time window "done" and emit its
        result? Wait forever and you never produce output; fire the instant the clock passes the window's
        end and you miss every straggler. You need a principled answer to "how long do I wait for
        latecomers?" — and that answer must be in <i>event time</i>, not wall-clock time.</p>
        <h3>The watermark: event-time progress with a promise</h3>
        <p>A <b>watermark</b> is a marker that flows <i>inside</i> the stream, carrying the meaning: <i>"I
        believe all events with event time ≤ T have now arrived."</i> It is the engine's best estimate of
        how far event time has progressed. When a watermark passes a window's end, the engine concludes
        that window is complete and fires it.</p>
        <p>A common generation rule is <b>bounded out-of-orderness</b>:</p>
        <div class="lx-code"><div class="lx-code-lang">concept</div><pre><code>watermark = maxEventTimeSeen − allowedLateness</code></pre></div>
        <p>You're telling the engine "assume events can be up to <code>allowedLateness</code> out of order;
        hold windows open that much longer before trusting them." The watermark is thus a <b>heuristic
        promise</b>, not a guarantee — anything arriving after it is, by definition, <b>late</b>.</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">
          <li>Watermark = progress of <i>event time</i>, not wall-clock time.</li>
          <li>It's a heuristic: larger <code>allowedLateness</code> → more correct, higher latency. A dial,
          not a free lunch.</li>
          <li>Events after the watermark passed their window are <b>late</b> and need an explicit policy.</li>
        </ul></div>` },
      { id: 'sim', label: '🔬 Watermark simulator', body: `
        <h3>Tune the lateness dial</h3>
        <p>Events arrive out of order; the amber line is the watermark. Raise <b>allowed lateness</b> to let
        the watermark lag further behind the newest event — catching more stragglers on time, at the cost of
        waiting longer before windows fire. Red events arrived after the watermark passed their window —
        those are the ones your late-data policy has to deal with.</p>
        <div id="f07-sim" class="sim-wrap"></div>
        <p>Drag the dial to both extremes to feel the trade-off in your hands: tiny lateness = snappy but
        lossy; huge lateness = correct but sluggish. There is no setting that gives both.</p>` },
      { id: 'late', label: '⏳ Late data & the trade-off', body: `
        <h3>What happens to events that miss the watermark</h3>
        <p>Late events need an explicit policy — silence here means silent data loss:</p>
        <ul class="clean">
          <li><b>Drop them</b> — simplest; acceptable when a tiny tail doesn't change decisions. Always
          <i>count</i> dropped-late events as a metric so "a little late" doesn't quietly become "a lot".</li>
          <li><b>Allowed lateness + update</b> — keep window state around past firing for an extra grace
          period and emit an <i>updated</i> result when a straggler arrives (requires downstream that can
          handle retractions/updates).</li>
          <li><b>Side output</b> — route late events to a separate stream for reconciliation or a slow batch
          correction (a very Lambda-flavored safety net).</li>
        </ul>
        <h3>The correctness ↔ latency ↔ cost triangle</h3>
        <div class="lx-table-wrap"><table class="lx-table"><thead><tr>
          <th>Bigger allowed lateness…</th><th>Effect</th></tr></thead><tbody>
          <tr><td>Correctness</td><td>↑ — catches more stragglers before firing.</td></tr>
          <tr><td>Latency</td><td>↑ (worse) — windows fire later; results are fresher-but-wronger vs
          later-but-righter.</td></tr>
          <tr><td>State / cost</td><td>↑ — window state lives longer, so you hold more in memory/RocksDB.</td></tr>
        </tbody></table></div>
        <div class="lx-callout lx-warn"><b>Idle-source trap.</b><div>Watermarks advance off incoming event
        times. If a partition goes quiet, its watermark <i>stalls</i>, which can hold back the whole job's
        progress (the overall watermark is the min across inputs). Production systems emit <b>idle/periodic
        watermarks</b> so a silent partition doesn't freeze everyone. This is a very common "my windows
        stopped firing and nothing's wrong with the data" incident.</div></div>` },
      { id: 'iq', label: '🎤 Interview', body: iq([
        { q: 'What is a watermark, in one sentence?', a: `A watermark is a marker flowing through the stream
          that asserts "all events with event time ≤ T have probably arrived", so the engine knows when it's
          safe to fire event-time windows. It tracks the progress of event time (not wall-clock), is a
          heuristic promise rather than a guarantee, and anything arriving after it is late.` },
        { q: 'How does allowed lateness trade off correctness and latency?', a: `A larger allowed lateness
          holds the watermark further behind the newest event, so windows wait longer and catch more
          out-of-order stragglers — more correct but higher latency, and more state held for longer. Smaller
          lateness fires sooner (lower latency) but drops more late events (less correct). It's a single dial
          along a correctness–latency–cost triangle; there's no setting that optimizes all three.` },
        { q: 'What are your options for late events?', a: `Drop them (and always count the drops as a
          metric), keep window state for a grace period and emit an updated/retracted result when a
          straggler arrives, or send late events to a side output for separate reconciliation or a batch
          correction. The choice depends on whether a small tail changes the decision and whether downstream
          can handle updates.` },
        { q: 'A job\'s windows stopped firing but the data looks fine. What\'s a likely cause?', a: `A stalled
          watermark from an idle partition/source. The overall watermark is the minimum across inputs, so if
          one partition goes quiet its watermark stops advancing and holds back the whole job. The fix is
          idle-source detection / periodic watermarks so a silent input doesn't freeze progress. Other
          suspects: a source with no watermark strategy at all, or allowed lateness set so high that windows
          legitimately haven't reached firing yet.` },
      ]) },
    ],
    sim: 'watermarks',
  },
  {
    id: 'f08', num: '08', icon: '🪟', title: 'Windows',
    idea: 'Windows chop an endless stream into finite chunks you can aggregate — and the window type you pick changes both the meaning of your answer and its cost.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>You can't aggregate an infinite stream</h3>
        <p>"Count {ENTITY}s" over an unbounded stream never completes — the sum grows forever and never
        produces a final answer. <b>Windows</b> bound the problem: group events into finite buckets (by
        time, or sometimes by count), then aggregate each bucket and emit a result. A window is how you turn
        "forever" into "a series of finite answers".</p>
        <h3>The three shapes — and what each actually measures</h3>
        <ul class="clean">
          <li><b>Tumbling</b> — fixed size, non-overlapping, back-to-back (every 5 min). Each event belongs
          to exactly one window. Use for clean periodic reporting: "{ENTITY}s per 5-minute bucket".</li>
          <li><b>Sliding / hopping</b> — fixed size, overlapping by a smaller step (5-min window advancing
          every 1 min). An event belongs to <i>several</i> windows. Use for smooth moving aggregates:
          "{ENTITY}s in the last 5 minutes, updated every minute".</li>
          <li><b>Session</b> — dynamic, data-driven; a window extends as events keep coming and closes after
          a <b>gap</b> of inactivity. Size isn't fixed — it fits the burst. Use for "a user's activity
          session", "a login streak", anything bounded by quiet rather than by the clock.</li>
        </ul>
        <div class="lx-callout lx-info"><b>Windows live on event time.</b><div>They rely on watermarks
        (Module 07) to know when a window is complete and may fire. "Window type" and "when it fires" are
        two different questions: the type defines membership; the watermark defines completeness.</div></div>` },
      { id: 'sim', label: '🔬 Window animator', body: `
        <h3>Compare tumbling vs sliding</h3>
        <p>Switch window type and size and watch which events fall into which windows and how the counts
        differ. Notice that with sliding windows the <i>same</i> event contributes to multiple results — so
        the counts across overlapping windows deliberately double-count, which is correct for a moving
        average but wrong if you meant a partition of the data.</p>
        <div id="f08-sim" class="sim-wrap"></div>` },
      { id: 'cost', label: '💸 Cost & gotchas', body: `
        <h3>Sliding windows multiply your state and output</h3>
        <p>A sliding window of size <code>S</code> advancing by step <code>H</code> places each event in
        roughly <code>S/H</code> windows. A 1-hour window advancing every minute → each event lives in ~60
        windows at once. That multiplies <b>state</b> (up to ~60× the open windows) and <b>output</b> (a
        result per step). Small steps feel "smoother" but can be dramatically more expensive — a very common
        reason a job's state blows up. If you only need periodic answers, a tumbling window is far cheaper.</p>
        <h3>Session windows are the trickiest to operate</h3>
        <ul class="clean">
          <li>Their size is unbounded in principle — one relentlessly active key can keep a session open for
          a very long time, growing state. Guard with a max session duration if the domain allows.</li>
          <li>A late event in the gap can <b>merge</b> two sessions that had been treated as separate,
          forcing the engine to retract and re-emit — correct but operationally subtle.</li>
        </ul>
        <h3>Firing nuance: early and late results</h3>
        <p>Beyond the default "fire once when the watermark passes the end", mature engines support
        <b>triggers</b> that emit <i>early</i> speculative results (for freshness) and <i>late</i> updates
        when stragglers arrive (for correctness). Downstream must then treat results as updatable, not
        final. This is how systems offer "fast now, correct soon" without choosing one.</p>
        <div class="lx-callout lx-warn"><b>Watch the boundaries.</b><div>Define window alignment and
        timezone explicitly. "Daily" windows that silently align to UTC midnight will baffle anyone
        expecting local-day boundaries, and off-by-one boundary bugs (is the end inclusive or exclusive?)
        quietly misattribute events at the edges.</div></div>` },
      { id: 'iq', label: '🎤 Interview', body: iq([
        { q: 'Tumbling vs sliding vs session — when do you use each?', a: `Tumbling: fixed, non-overlapping
          buckets where each event counts once — clean periodic reporting. Sliding/hopping: fixed size with
          a smaller advance so windows overlap and events count in several — smooth moving aggregates like
          "last 5 min, updated each minute". Session: dynamic, closes after an inactivity gap — anything
          bounded by quiet rather than the clock, like a user's activity session.` },
        { q: 'Why can sliding windows be expensive?', a: `Each event belongs to roughly size/step windows at
          once, so a 1-hour window advancing every minute puts each event in ~60 open windows — up to ~60×
          the state and an output per step. Small steps feel smoother but multiply state and emission cost
          and are a frequent cause of state blow-up. If periodic answers suffice, tumbling is far cheaper.` },
        { q: 'What makes session windows operationally tricky?', a: `Their size is data-driven and
          unbounded — a continuously active key can keep a session open indefinitely, growing state, so you
          often cap max duration. And a late event landing in the gap can merge two previously separate
          sessions, forcing a retract-and-re-emit. They're the most dynamic window type and the easiest to
          get surprised by under late data.` },
        { q: 'What are early and late firings / triggers for?', a: `They let a window emit before and after
          its nominal completion: early (speculative) firings give fresh partial results before the
          watermark passes the end; late firings emit updates when stragglers arrive after it. Together they
          offer "fast now, correct soon", but they require downstream consumers to treat results as
          updatable rather than final.` },
      ]) },
    ],
    sim: 'windows',
  },
  {
    id: 'f09', num: '09', icon: '🧠', title: 'State & stateful processing',
    idea: 'Remembering across events — counts, joins, dedup, windows — is what makes streaming powerful, and managing that state correctly at scale is what makes it hard.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>Stateless vs stateful</h3>
        <p><b>Stateless</b> operations handle each event in isolation — filter, map, reformat, route. They're
        trivially parallel and need no memory of the past. <b>Stateful</b> operations remember things across
        events: running counts, window aggregates, joins between streams, deduplication, "have I seen this
        {KEY} before?", "what was this {ENTITY}'s last status?". Essentially every interesting streaming
        computation is stateful — which is why most of streaming's hard problems (recovery, scaling,
        correctness) are really state problems.</p>
        <h3>Keyed state: state is partitioned exactly like the stream</h3>
        <p>State is partitioned <b>by key</b>, mirroring the stream. The counter for <code>{KEY}=X</code>
        lives wherever X's partition is processed, co-located with the events that update it — no cross-
        machine lookup on the hot path. This co-location is why keyed state is fast, and why <b>changing
        the key forces a shuffle/repartition</b>: the state must physically move to follow its new
        partition. It's also why a hot key (Module 04) is also a hot <i>state</i> problem.</p>
        <h3>Where state actually lives</h3>
        <p>Small state can sit in memory (fast, but bounded by heap and lost on crash). Large state uses an
        embedded on-disk store — commonly <b>RocksDB</b> — so state can exceed memory and spill to local
        disk, with the engine checkpointing it to durable storage (Module 10). This is how a single job can
        hold terabytes of keyed state across its tasks.</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">
          <li>Stateful = remembers across events; nearly all real streaming is stateful.</li>
          <li>State is keyed and co-located with its partition — fast locally, costly to move.</li>
          <li>Big state lives on an embedded store (e.g. RocksDB), checkpointed to durable storage.</li>
        </ul></div>` },
      { id: 'joins', label: '🔗 Joins & the state they cost', body: `
        <h3>Streaming joins are state machines</h3>
        <p>Joining two unbounded streams means: when an event arrives on side A, you need matching events
        from side B — which may arrive <i>before, at the same time, or after</i>. So the engine must
        <b>buffer one or both sides as state</b> and match as events flow. The flavors:</p>
        <ul class="clean">
          <li><b>Stream–stream (windowed) join:</b> match A and B within a time bound (e.g. "a click within
          5 min of an impression"). State = all un-matured events in the window; the time bound is what keeps
          state finite. An unbounded join would accumulate state forever.</li>
          <li><b>Stream–table (enrichment) join:</b> enrich a stream with a slowly-changing lookup (e.g.
          add {ENTITY} details from a reference table). The table is kept as state (often a compacted topic),
          updated by its own changelog. The subtlety is <b>temporal correctness</b>: do you want the table's
          value <i>as of the event's time</i> or <i>as of now</i>? "As-of" (temporal) joins are the correct
          but harder choice.</li>
        </ul>
        <div class="lx-callout lx-warn"><b>Joins are where state quietly explodes.</b><div>A join with too
        wide a time bound, or an enrichment table that grows without compaction, is a classic unbounded-state
        incident: checkpoints get slower, memory/disk climb, recovery takes longer. Always ask "what bounds
        this join's state?"</div></div>` },
      { id: 'manage', label: '🧹 Managing state at scale', body: `
        <h3>Unbounded state is the enemy</h3>
        <p>State that only grows will eventually kill a job — slow checkpoints, OOMs, hours-long recovery.
        Mature pipelines bound state deliberately:</p>
        <ul class="clean">
          <li><b>TTL / expiry:</b> expire state that's no longer needed (e.g. a dedup cache only needs to
          remember recent ids). Nearly all "have I seen this?" state should have a TTL.</li>
          <li><b>Windowing:</b> window-scoped state is naturally released when the window closes + lateness
          grace passes — a built-in bound.</li>
          <li><b>Compaction:</b> for "latest value per key" state, keep only the current value.</li>
        </ul>
        <h3>State is a schema you have to migrate</h3>
        <p>Because state persists across deploys, changing your state's structure is a <b>migration</b>
        problem, not a redeploy. Rename a field, change a type, or split an operator and old checkpoints may
        no longer restore. This is why engines use stable operator ids and state schemas, and why
        <b>savepoints</b> (Module 10) exist — to upgrade a running stateful job without losing its memory.
        Treat state evolution with the same care as a database migration.</p>
        <div class="lx-callout lx-info"><b>Rescaling and state.</b><div>To change a job's parallelism you
        must redistribute keyed state across the new task count. Engines do this via <b>key groups</b> (a
        fixed number of hash buckets assigned to tasks), so rescaling moves whole groups rather than
        rehashing every key. The max parallelism is effectively fixed by the key-group count chosen up
        front — another "size it early" decision.</div></div>` },
      { id: 'iq', label: '🎤 Interview', body: iq([
        { q: 'Why is state partitioned by key?', a: `So the state for a key is co-located with the events
          that update it — the running count for {KEY}=X lives on the task processing X's partition, with no
          cross-machine lookup on the hot path. That co-location is what makes keyed state fast; the flip
          side is that changing the key forces a shuffle to move state to its new partition, and a hot key is
          simultaneously a hot-state problem.` },
        { q: 'What bounds the state of a streaming join?', a: `For stream–stream joins, a time window:
          you only buffer un-matured events within the join's time bound, which keeps state finite — an
          unbounded join accumulates state forever. For stream–table enrichment, the table is bounded by
          compaction (latest value per key). If neither bound is present — too-wide a window, an
          ever-growing lookup — state grows without limit and eventually kills the job via slow checkpoints
          and OOM.` },
        { q: 'How do you keep state from growing unbounded?', a: `Give it a bound by design: TTL/expiry for
          caches and dedup sets, window scoping so state releases when windows close, and compaction for
          latest-value-per-key state. The principle is that every piece of state should have an answer to
          "what makes this go away?" — if the answer is "nothing", it's a future incident.` },
        { q: 'Why is changing a stateful job risky?', a: `Because state persists across deploys, so altering
          its structure is a migration, not a restart — rename a field or change an operator and old
          checkpoints may fail to restore. Engines mitigate with stable operator ids and state schemas, and
          you use savepoints to carry a running job's state across an upgrade. Likewise, rescaling must
          redistribute keyed state (via key groups), and max parallelism is bounded by a key-group count set
          up front. Treat state changes like database migrations.` },
      ]) },
    ],
  },
  {
    id: 'f10', num: '10', icon: '💾', title: 'Checkpointing & recovery',
    idea: 'Periodic consistent snapshots of state + input positions let a job recover exactly where it was — the mechanism that makes long-running stateful streaming survivable.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>The problem checkpoints solve</h3>
        <p>Stateful jobs run for weeks or months and hold enormous in-memory/on-disk state (every running
        count, every open window, every join buffer). Machines <i>will</i> fail — hardware, deploys,
        pre-emptions, OOMs are normal at scale. Without a recovery plan, a single crash loses all that state;
        restarting from zero is catastrophic and, for event-time results, incorrect.</p>
        <h3>The checkpoint: a consistent snapshot of state + offsets</h3>
        <p>The engine periodically takes a <b>consistent snapshot</b>: the keyed state <i>together with</i>
        the exact input positions (offsets) that produced it, written to durable storage. On failure it
        restores the latest snapshot and resumes reading from exactly those offsets. The coupling is the
        whole trick: <b>state and the offsets that produced it are captured atomically</b>, so after
        recovery the restored state and the replayed input line up perfectly — no data lost, no state reset,
        no double-counting at the seam.</p>
        <h3>Why "consistent" is the hard word</h3>
        <p>A streaming job is a distributed graph of operators on many machines. A naive "pause everything
        and snapshot" would stall the whole job. Modern engines instead inject <b>barriers</b> into the
        stream (Flink's Chandy–Lamport-style <b>asynchronous barrier snapshotting</b>): a barrier flows
        through the dataflow, and each operator snapshots its state as the barrier passes, so a globally
        consistent cut is captured <i>without</i> stopping processing. That's how you get consistent
        snapshots of a running, distributed, stateful computation.</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">
          <li>A checkpoint couples <b>state + offsets</b> atomically — that coupling is what makes recovery
          correct, not just durable.</li>
          <li>Snapshots are taken <i>without stopping the job</i>, via barriers / async snapshotting.</li>
          <li>More frequent checkpoints → faster recovery, more overhead. It's a tuning dial.</li>
        </ul></div>` },
      { id: 'sim', label: '🔬 Crash & recover', body: `
        <h3>Watch a recovery</h3>
        <p>Process some events, take a checkpoint, then "crash". Restoring the checkpoint reproduces the
        exact state <i>and</i> resumes from the saved offset — not from zero, and not from the latest.
        Everything between the checkpoint and the crash is re-read from the source and reprocessed, which is
        why that input must still be retained (Module 05) and why sinks must tolerate the replay (Module 11).</p>
        <div id="f10-sim" class="sim-wrap"></div>` },
      { id: 'tuning', label: '🎛️ Checkpoint vs savepoint & tuning', body: `
        <h3>Checkpoint vs savepoint — same mechanism, different jobs</h3>
        <div class="lx-table-wrap"><table class="lx-table"><thead><tr>
          <th></th><th>Checkpoint</th><th>Savepoint</th></tr></thead><tbody>
          <tr><td>Purpose</td><td>Automatic fault recovery</td><td>Manual, planned operations</td></tr>
          <tr><td>Triggered by</td><td>The engine, on a timer</td><td>You, before an upgrade</td></tr>
          <tr><td>Lifecycle</td><td>Owned by the engine; old ones cleaned up</td><td>Owned by you; kept
          deliberately</td></tr>
          <tr><td>Use for</td><td>Surviving crashes</td><td>Version upgrades, code changes, rescaling,
          migrations, A/B restarts</td></tr>
        </tbody></table></div>
        <p>Savepoints are how you upgrade a <i>stateful</i> job without losing its memory: take a savepoint,
        deploy new code, restore from the savepoint. They're portable and stable across versions in a way
        recovery checkpoints aren't required to be.</p>
        <h3>The real tuning trade-offs</h3>
        <ul class="clean">
          <li><b>Interval:</b> shorter interval → less re-processing after a crash (smaller replay gap) but
          more steady-state overhead. Longer → cheaper normally, more to redo on failure.</li>
          <li><b>Alignment / backpressure interaction:</b> under heavy backpressure, barrier alignment can
          stall and checkpoints slow or time out — <i>failing checkpoints are often a symptom of
          backpressure</i>, not a storage problem (unaligned checkpoints exist to mitigate this).</li>
          <li><b>Incremental checkpoints:</b> snapshot only changed state (deltas) instead of everything —
          essential once state is large, or each checkpoint re-uploads terabytes.</li>
          <li><b>Local recovery:</b> keep a local copy so recovery doesn't always re-download full state
          from object storage.</li>
        </ul>
        <div class="lx-callout lx-warn"><b>Failing/slow checkpoints = leading indicator.</b><div>Checkpoint
        duration and success rate predict your recovery time and often reveal backpressure or growing
        unbounded state <i>before</i> users feel it. Alert on them (Module 14). A job that can't checkpoint
        can't safely recover.</div></div>` },
      { id: 'iq', label: '🎤 Interview', body: iq([
        { q: 'Why must a checkpoint capture state and offsets together?', a: `Because recovery correctness
          depends on the restored state matching the input that produced it. If you saved state and offsets
          separately, after a crash the state could reflect more or fewer events than the offsets imply,
          causing lost or double-counted data at the seam. Capturing them atomically means that on restore,
          replaying from the saved offsets exactly reproduces the saved state — no gap, no overlap.` },
        { q: 'How do engines snapshot a distributed job without stopping it?', a: `By injecting barriers into
          the stream (Chandy–Lamport-style asynchronous barrier snapshotting). A barrier flows through the
          dataflow graph; as it passes each operator, that operator snapshots its state, producing a
          globally consistent cut across all machines without pausing processing. Flink's checkpointing works
          this way, which is what makes consistent snapshots of a live, stateful, distributed computation
          feasible.` },
        { q: 'Checkpoint vs savepoint?', a: `Same snapshot mechanism, different lifecycle and purpose.
          Checkpoints are automatic, engine-triggered, and for fault recovery — the engine manages and
          cleans them up. Savepoints are manual, user-triggered, portable, and kept deliberately for planned
          operations: version upgrades, code changes, rescaling, migrations. You take a savepoint, deploy new
          code, and restore — that's how you upgrade a stateful job without losing its state.` },
        { q: 'Checkpoints keep timing out. What do you investigate first?', a: `Backpressure. Under heavy
          backpressure, barrier alignment stalls and checkpoints slow or time out, so failing checkpoints are
          frequently a symptom of a downstream bottleneck rather than a storage issue — investigate the slow
          operator/sink. Also check for unbounded/ballooning state (enable incremental checkpoints), and
          consider unaligned checkpoints to decouple from backpressure. A job that can't checkpoint can't
          recover, so this is urgent.` },
      ]) },
    ],
    sim: 'checkpoint',
  },
  {
    id: 'f11', num: '11', icon: '🛡️', title: 'Delivery guarantees',
    idea: 'At-most-once, at-least-once, and effectively-once — and why "exactly-once" is a careful, conditional claim about the whole pipeline, not a checkbox.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>Three levels, defined by how you handle failure</h3>
        <ul class="clean">
          <li><b>At-most-once</b> — may lose events, never duplicates. You commit position <i>before</i>
          processing, so a crash in between drops the event. Rarely what you want, but cheapest and lowest
          latency.</li>
          <li><b>At-least-once</b> — never loses, may duplicate. You process, <i>then</i> commit; a crash in
          between replays the event. The common, pragmatic default — paired with idempotency (Module 13) it
          behaves correctly for many workloads.</li>
          <li><b>Effectively-once</b> ("exactly-once processing") — each event affects the result once, even
          across failures, achieved via checkpoint-coupled offsets + idempotent/transactional writes. Not
          magic: it's at-least-once delivery made to <i>look</i> like once at the point where it matters.</li>
        </ul>
        <h3>The honest truth about "exactly-once"</h3>
        <p>There is no way to deliver a message <i>on the wire</i> exactly once in a system that can fail —
        you must either risk loss or risk duplication. What engines actually provide is <b>effectively-once
        processing</b>: duplicates still happen under the hood (retries, replays after recovery), but the
        engine ensures each event is <i>reflected in the result</i> exactly once, by coupling state with
        offsets (Module 10) and writing to the sink idempotently or transactionally. It holds <b>within a
        system under specific conditions</b> — not as an unconditional promise.</p>
        <div class="lx-callout lx-danger"><b>Never overstate it.</b><div>A pipeline is only end-to-end
        exactly-once if <i>every</i> hop — source, processing, <b>and sink</b> — cooperates. Marketing says
        "exactly-once"; engineering checks the sink. If a hop can't participate (a non-transactional,
        non-idempotent sink), the correct description is "at-least-once with downstream dedup", and saying
        otherwise is a correctness lie.</div></div>` },
      { id: 'e2e', label: '🔗 End-to-end: it\'s the weakest link', body: `
        <h3>The guarantee is a chain</h3>
        <p>End-to-end semantics are only as strong as the weakest hop. Three links must each participate:</p>
        <div class="lx-flow">
          <span class="lx-flow-node">Source (replayable)</span><span class="lx-flow-arrow">→</span>
          <span class="lx-flow-node">Processing (checkpointed state+offsets)</span><span class="lx-flow-arrow">→</span>
          <span class="lx-flow-node">Sink (transactional or idempotent)</span>
        </div>
        <ul class="clean">
          <li><b>Source</b> must be <b>replayable</b> (seekable offsets) so recovery can re-read exactly from
          the checkpoint. A non-replayable source (fire-and-forget) caps you at at-most-once on failure.</li>
          <li><b>Processing</b> must couple state with offsets (Module 10), so recovery doesn't double-count
          internally.</li>
          <li><b>Sink</b> is where most people's "exactly-once" quietly breaks. It must be either
          <b>transactional</b> (commit output and offsets atomically — e.g. Kafka transactions, a Delta/
          ACID table) or <b>idempotent</b> (writing the same result twice = writing it once — upsert by a
          deterministic key).</li>
        </ul>
        <h3>The two routes to a correct sink</h3>
        <div class="lx-table-wrap"><table class="lx-table"><thead><tr>
          <th>Approach</th><th>How it works</th><th>Needs</th></tr></thead><tbody>
          <tr><td><b>Transactional</b></td><td>Output + offset commit in one atomic transaction (two-phase
          commit); on recovery, uncommitted output is rolled back.</td><td>A sink that supports
          transactions; adds latency.</td></tr>
          <tr><td><b>Idempotent</b></td><td>Deterministic key + upsert, so replays overwrite rather than
          duplicate.</td><td>A stable natural key and an upsert-capable sink; simpler, no XA.</td></tr>
        </tbody></table></div>
        <div class="lx-callout lx-info"><b>Idempotency is the pragmatic hero.</b><div>Full distributed
        transactions are expensive and not always available. A deterministic key + upsert gives you
        effectively-once at the sink with far less machinery — which is why "at-least-once + idempotent
        writes" is the most common real-world recipe for correct results.</div></div>` },
      { id: 'lens', label: '🧠 Choosing a guarantee', body: `
        <h3>Match the guarantee to the cost of being wrong</h3>
        <p>Stronger guarantees cost latency, throughput, and complexity. A principal picks the weakest
        guarantee that's actually correct for the use case:</p>
        <ul class="clean">
          <li><b>At-most-once:</b> acceptable only when a dropped event is cheap and freshness/throughput
          dominate — some high-volume metrics/telemetry where a lost sample doesn't change decisions.</li>
          <li><b>At-least-once + idempotent sink:</b> the workhorse. Correct results, modest cost, no XA.
          Reach for this by default and make the sink idempotent.</li>
          <li><b>Transactional exactly-once:</b> when duplicates are genuinely unacceptable <i>and</i> the
          sink can't be made idempotent — financial postings, billing, inventory decrements. Pay the latency.</li>
        </ul>
        <h3>The question that separates seniors from principals</h3>
        <p>Not "does the engine support exactly-once?" but "<i>what does a duplicate or a lost event actually
        cost this business, and what's the cheapest guarantee that makes that cost acceptable?</i>" A
        duplicate "like" is nothing; a duplicate $1,000 payout is an incident. The guarantee is a business
        decision expressed in engineering.</p>
        <div class="lx-callout lx-warn"><b>Watch the sink, always.</b><div>When someone claims a pipeline is
        exactly-once, your first question is "what's the sink, and is it transactional or idempotent?" If the
        answer is "it's a plain REST call / an append to a non-transactional store", it's at-least-once —
        full stop.</div></div>` },
      { id: 'iq', label: '🎤 Interview', body: iq([
        { q: 'Is true exactly-once delivery possible?', a: `Not on the wire: in a system that can fail you
          must either risk loss (at-most-once) or risk duplication (at-least-once). What engines provide is
          effectively-once processing — duplicates still occur underneath (retries, recovery replays), but
          each event is reflected in the result exactly once by coupling state with offsets and writing to
          the sink idempotently or transactionally. It's a conditional, within-pipeline property, not an
          absolute delivery guarantee.` },
        { q: 'What does end-to-end exactly-once actually require?', a: `All three hops cooperating: a
          replayable source (seekable offsets) so recovery re-reads exactly; processing that checkpoints
          state and offsets together; and a sink that is transactional (atomic output+offset commit) or
          idempotent (deterministic key + upsert). It's a weakest-link chain — if any hop can't participate,
          especially the sink, the honest description is at-least-once with downstream dedup.` },
        { q: 'Transactional vs idempotent sinks?', a: `Transactional sinks commit the output and the offset
          in one atomic transaction (two-phase commit), rolling back uncommitted output on recovery — strong
          but adds latency and needs transaction support. Idempotent sinks use a deterministic key and upsert
          so replaying overwrites instead of duplicating — simpler, no distributed transaction, but needs a
          stable natural key and an upsert-capable store. "At-least-once + idempotent writes" is the most
          common real-world recipe.` },
        { q: 'How do you choose a delivery guarantee?', a: `By the cost of being wrong, then pick the
          weakest guarantee that's still correct. At-most-once only when a lost event is cheap and
          throughput/latency dominate. At-least-once with an idempotent sink as the default for correct
          results at modest cost. Transactional exactly-once only when duplicates are truly unacceptable and
          the sink can't be made idempotent — billing, payouts, inventory. The real question is what a
          duplicate or loss costs the business.` },
      ]) },
    ],
  },
  {
    id: 'f12', num: '12', icon: '📈', title: 'Throughput, latency, lag & backpressure',
    idea: 'These four numbers are how you reason about a pipeline\'s health — and backpressure is the self-defense mechanism that keeps a overloaded pipeline alive instead of exploding.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>The four numbers you live by</h3>
        <ul class="clean">
          <li><b>Throughput</b> — events/sec the pipeline sustains end to end. A capacity measure.</li>
          <li><b>Latency</b> — time from an event happening to its result being produced. Usually reported as
          a distribution (p50/p95/p99), because the <i>tail</i> is what users feel. "Average latency" hides
          the pain.</li>
          <li><b>Lag</b> — how far behind the consumer is (unread events piling up: latest offset −
          committed offset). The clearest single health signal.</li>
          <li><b>Backpressure</b> — the signal a slow stage pushes <i>upstream</i> to say "slow down, I
          can't keep up". A mechanism, not a metric.</li>
        </ul>
        <h3>How they interact — Little's Law in disguise</h3>
        <p>If input rate &gt; processing rate, a queue builds and <b>lag grows</b> — and because items sit in
        that queue longer, <b>latency grows too</b> (more items in flight × the rate = longer wait; that's
        Little's Law). Rising lag is therefore your earliest warning that a pipeline is under-provisioned or
        stuck. The relationship is the key intuition: <i>lag and latency are two views of the same
        backlog.</i></p>
        <div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">
          <li>Report latency as a distribution (p95/p99), never just an average.</li>
          <li>Lag growing = input &gt; throughput. Lag is the backlog; latency is how long that backlog makes
          each event wait.</li>
          <li>Backpressure is the system defending itself, not the problem itself.</li>
        </ul></div>` },
      { id: 'sim', label: '🔬 Backpressure simulator', body: `
        <h3>Push the input past the limit</h3>
        <p>Raise the input rate above the processing rate and watch lag climb and backpressure engage. Drop
        it back below and the queue drains. Notice the asymmetry: lag builds fast under overload but drains
        only as fast as your <i>spare</i> capacity, so a short spike can take a long time to recover from —
        which is why headroom matters.</p>
        <div id="f12-sim" class="sim-wrap"></div>` },
      { id: 'lens', label: '🧠 Diagnosing & designing', body: `
        <h3>Backpressure is good — it's the alternative to crashing</h3>
        <p>When a stage can't keep up, a well-designed engine <b>propagates backpressure</b> upstream:
        operators slow their input, and ultimately the source is read more slowly, so the backlog lands in
        the durable log (which is built to hold it) rather than in your job's memory. The bad alternative —
        a system with no backpressure — buffers unboundedly in memory and OOMs. So backpressure isn't a
        failure; it's the pipeline refusing to fall over. The real question is <i>where</i> it originates.</p>
        <h3>Finding the bottleneck</h3>
        <p>Backpressure propagates <i>backwards</i>, so the operator <b>showing</b> backpressure is usually
        <i>not</i> the culprit — it's being held up by the stage <i>after</i> it. Walk <b>downstream</b>
        until you find the first operator that's busy but <i>not</i> itself backpressured: that's your
        bottleneck. Common root causes:</p>
        <ul class="clean">
          <li><b>A slow sink</b> (an overloaded database, a rate-limited API) — the most frequent cause.</li>
          <li><b>Data skew</b> — one hot partition/key doing all the work (Module 04) while others idle.</li>
          <li><b>An expensive operator</b> — a heavy per-event call, a blocking lookup, GC pressure.</li>
          <li><b>Under-provisioning</b> — genuinely not enough parallelism/CPU for the load.</li>
        </ul>
        <h3>Lag triage</h3>
        <div class="lx-table-wrap"><table class="lx-table"><thead><tr>
          <th>Lag pattern</th><th>Likely meaning</th></tr></thead><tbody>
          <tr><td>Rising steadily on all partitions</td><td>Under-provisioned, or a uniformly slow
          stage/sink.</td></tr>
          <tr><td>Rising on one partition only</td><td>Hot key / skew — adding consumers won't help.</td></tr>
          <tr><td>Sawtooth (spikes then recovers)</td><td>Rebalances, GC pauses, or periodic heavy work.</td></tr>
          <tr><td>Flat-high but stable</td><td>Keeping up but with a constant backlog — maybe fine, maybe a
          latency-SLO breach.</td></tr>
        </tbody></table></div>
        <div class="lx-callout lx-warn"><b>Don't just scale consumers.</b><div>If backpressure comes from a
        slow sink or a hot key, adding consumers does nothing (or makes the sink worse). Diagnose the
        downstream bottleneck first — the fix is usually there, not in the consumer count. This mirrors the
        hot-partition lesson in Module 04.</div></div>` },
      { id: 'iq', label: '🎤 Interview', body: iq([
        { q: 'Why report latency as a distribution instead of an average?', a: `Because users feel the tail,
          not the mean. An average can look healthy while p99 is terrible — a few very slow events (GC
          pauses, a hot key, a struggling sink) ruin the experience for a meaningful fraction of traffic.
          p95/p99 (and max) expose that tail; the average hides it. SLOs should be written against
          percentiles for the same reason.` },
        { q: 'How are lag and latency related?', a: `They're two views of the same backlog. When input
          exceeds throughput, a queue builds — that's lag — and because each event now waits behind that
          queue, latency rises too (Little's Law: items-in-flight = rate × wait time). So rising lag is the
          early signal and rising latency is its downstream consequence; fix the backlog and both recover,
          though draining is limited by spare capacity.` },
        { q: 'Is backpressure a problem?', a: `No — it's the system defending itself. When a stage can't
          keep up, backpressure propagates upstream so the source is read more slowly and the backlog sits in
          the durable log (built to hold it) instead of ballooning in job memory and OOMing. A system with no
          backpressure is the dangerous one. The real task is locating where the backpressure originates.` },
        { q: 'An operator shows high backpressure. Is it the bottleneck?', a: `Usually not — backpressure
          propagates backwards, so the operator showing it is being held up by the stage after it. Walk
          downstream to the first operator that's busy but not itself backpressured; that's the real
          bottleneck. The usual culprits are a slow sink, data skew (a hot key), an expensive per-event
          operation, or genuine under-provisioning — and if it's a slow sink or hot key, adding consumers
          won't help.` },
      ]) },
    ],
    sim: 'backpressure',
  },
  {
    id: 'f13', num: '13', icon: '🔁', title: 'Reliability patterns',
    idea: 'Replication, idempotency, dead-letter queues, retries with backoff, and poison-pill handling are the patterns that keep pipelines correct and alive when (not if) things fail.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>Failure is normal — design for it</h3>
        <p>At scale, brokers die, networks partition, dependencies rate-limit you, and a malformed event
        slips through. Reliability is not avoiding failure; it's <i>continuing to be correct through it.</i>
        The core patterns:</p>
        <ul class="clean">
          <li><b>Replication:</b> each partition is copied to several brokers; if the leader dies, an
          in-sync follower takes over. Durability is a function of how many copies must acknowledge a write
          (e.g. <code>acks=all</code> + a minimum in-sync replica count) — you trade latency for the
          guarantee that an acknowledged write survives a broker loss.</li>
          <li><b>Idempotency:</b> make reprocessing safe — "set balance to X", not "add X"; upsert by a
          deterministic key, not blind append — so at-least-once duplicates (Module 11) don't corrupt
          results. This is the quiet workhorse of streaming correctness.</li>
          <li><b>Dead-letter queue (DLQ):</b> route un-processable events aside instead of blocking the
          stream or crash-looping, so one bad event doesn't halt the pipeline.</li>
          <li><b>Retries with backoff (+ jitter):</b> transient failures recover on retry; exponential
          backoff with jitter avoids hammering a struggling dependency and avoids synchronized retry
          storms.</li>
        </ul>
        <div class="lx-callout lx-info"><b>Idempotency is the cheapest correctness you'll ever buy.</b><div>
        It turns easy, cheap at-least-once delivery into effectively-once <i>results</i> for many real
        workloads — no distributed transactions required. Designing operations to be idempotent from the
        start saves you from most duplicate-related incidents.</div></div>` },
      { id: 'poison', label: '☠️ Poison pills & DLQs', body: `
        <h3>The poison pill: one event that stops everything</h3>
        <p>A <b>poison pill</b> is an event your code cannot process — malformed payload, unparseable schema,
        a value that throws. In an ordered, at-least-once pipeline this is uniquely dangerous: the consumer
        fails on it, restarts, re-reads the <i>same</i> event, fails again — a <b>crash loop</b> that halts
        the partition and grows lag indefinitely. The partition is stuck behind one bad message.</p>
        <h3>The DLQ pattern, done properly</h3>
        <ul class="clean">
          <li>Wrap processing: on a <i>non-retryable</i> error (bad data, not a transient outage), publish
          the event — <b>with full context</b> (original payload, error, stack, offset, timestamp) — to a
          dead-letter stream, commit past it, and continue.</li>
          <li><b>Distinguish retryable from non-retryable</b>: a timeout to a downstream deserves a retry; a
          JSON parse error never will — DLQ it immediately. Blindly DLQ-ing transient errors drops good
          data; blindly retrying bad data crash-loops. Classifying the error is the real skill.</li>
          <li><b>The DLQ is not a trash can</b> — it needs an owner, alerting on its rate, and a
          reprocessing path (fix the bug, replay the DLQ). An unmonitored DLQ is just silent data loss with
          extra steps.</li>
        </ul>
        <div class="lx-callout lx-warn"><b>Ordering caveat.</b><div>Routing a bad event to a DLQ and
        continuing means you've processed later events <i>before</i> resolving the earlier one — you traded
        strict per-key ordering for liveness. Usually the right trade, but name it: if downstream assumes
        strict order, DLQ-and-skip can violate an invariant.</div></div>` },
      { id: 'lens', label: '🧠 Patterns in combination', body: `
        <h3>Retry storms and the thundering herd</h3>
        <p>Naive retries make outages worse. When a dependency wobbles, <i>everyone</i> retries at once,
        amplifying load exactly when the dependency is weakest — a self-inflicted DDoS that turns a blip into
        an outage. Defenses: <b>exponential backoff with jitter</b> (spread retries out), <b>retry budgets/
        caps</b> (bounded attempts), and a <b>circuit breaker</b> (stop calling a dead dependency, fail fast,
        probe periodically). These are the difference between "a dependency hiccupped" and "a dependency
        hiccup took us down for an hour".</p>
        <h3>The patterns reinforce each other</h3>
        <div class="lx-table-wrap"><table class="lx-table"><thead><tr>
          <th>Failure</th><th>Pattern that handles it</th></tr></thead><tbody>
          <tr><td>Broker dies</td><td>Replication + in-sync replicas failover</td></tr>
          <tr><td>Duplicate from replay/retry</td><td>Idempotent writes</td></tr>
          <tr><td>Malformed / poison event</td><td>DLQ with context + error classification</td></tr>
          <tr><td>Transient dependency outage</td><td>Retry with backoff + jitter, circuit breaker</td></tr>
          <tr><td>Overload</td><td>Backpressure (Module 12) + retry budgets</td></tr>
        </tbody></table></div>
        <div class="lx-callout lx-ok"><b>Composability is the point.</b><div>No single pattern makes a
        pipeline reliable; reliability emerges from layering them. A principal reflex when designing any hop:
        "how does this fail, which pattern covers it, and what's the blast radius if that pattern also
        fails?"</div></div>` },
      { id: 'iq', label: '🎤 Interview', body: iq([
        { q: 'Why is idempotency so central to streaming reliability?', a: `Because the pragmatic default is
          at-least-once delivery, which means duplicates will happen on retries and recovery replays.
          Idempotent operations — set-to-value, upsert by deterministic key — make applying the same event
          twice equivalent to once, so duplicates don't corrupt results. That converts cheap at-least-once
          delivery into effectively-once results without distributed transactions, which is why it's the most
          cost-effective correctness tool you have.` },
        { q: 'What is a poison pill and how do you handle it?', a: `An event your code can't process (bad
          payload, parse error) that, in an at-least-once ordered pipeline, causes a crash loop: fail,
          restart, re-read the same event, fail again — halting the partition and growing lag. Handle it by
          classifying errors: retry transient failures, but route non-retryable bad data to a dead-letter
          queue with full context, commit past it, and continue. Accept that this trades strict ordering for
          liveness, and make sure the DLQ is owned, alerted, and reprocessable.` },
        { q: 'How do you keep retries from making an outage worse?', a: `Avoid synchronized retry storms with
          exponential backoff plus jitter so clients don't all retry in lockstep; cap attempts with a retry
          budget; and use a circuit breaker to stop calling a clearly-dead dependency, fail fast, and probe
          for recovery. Without these, every client retrying at once amplifies load on an already-struggling
          dependency and turns a brief blip into a full outage.` },
        { q: 'When would you NOT use a DLQ-and-skip approach?', a: `When strict per-key ordering is an
          invariant downstream — skipping a bad event means later events for that key are processed before
          the earlier one is resolved, which can violate ordering assumptions (e.g. a state machine that must
          see transitions in order). There you might halt and alert instead, or park the whole key. The DLQ
          pattern trades ordering for liveness, and that trade isn't always acceptable.` },
      ]) },
    ],
  },
  {
    id: 'f14', num: '14', icon: '🔭', title: 'Observability',
    idea: 'You cannot operate what you cannot see — lag trend, throughput, checkpoint health, watermark lag, and error/DLQ rate are the vital signs, and knowing which to alert on is the craft.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>The signals that matter, and what each tells you</h3>
        <ul class="clean">
          <li><b>Consumer lag (and its trend):</b> the single most important health metric. The <i>trend</i>
          beats the absolute value — steadily rising lag means you're falling behind <i>now</i>, regardless
          of the current number. A flat high lag may be fine; a rising low lag is an incident forming.</li>
          <li><b>Throughput in vs out:</b> are you keeping up with the source? A persistent gap between input
          and output rate is lag in the making.</li>
          <li><b>Checkpoint duration & success rate:</b> leading indicators of recovery time and of hidden
          backpressure / unbounded state (Module 10). Failing checkpoints predict bad recoveries before
          users notice.</li>
          <li><b>Watermark lag:</b> how far event-time progress trails wall-clock. A stalled watermark
          (Module 07) explains "windows stopped firing" even when raw throughput looks fine.</li>
          <li><b>Error / DLQ rate:</b> how many events can't be processed — rising DLQ rate is often the
          first sign of an upstream schema change or data-quality regression.</li>
        </ul>
        <h3>Instrument per-partition, not just aggregate</h3>
        <p>Averages hide skew. A pipeline with one hot partition (Module 04) looks healthy in aggregate while
        one partition drowns. Dashboard lag, throughput, and latency <b>per partition/shard/key-group</b> so
        the skew is visible — most real incidents are concentrated, not uniform.</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">
          <li>Alert on lag <i>trend</i> and checkpoint failures first — they catch most incidents early.</li>
          <li>Per-partition views reveal skew that aggregates hide.</li>
          <li>Metrics, logs, and traces answer different questions — you need all three.</li>
        </ul></div>` },
      { id: 'lens', label: '🧠 Alerting without the noise', body: `
        <h3>Symptom alerts, not cause alerts</h3>
        <p>Alert on <b>symptoms the user feels</b> (lag breaching the latency SLO, output stalled, error rate
        up), not on every internal cause (a single CPU spike, one slow checkpoint). Cause-based alerts create
        fatigue — the pager fires constantly and people stop looking, so the one real alert gets missed.
        Burn-rate / SLO alerting (page when you're consuming your error budget too fast) is the mature
        pattern: it ties the alert to actual user impact and to urgency.</p>
        <h3>The three pillars answer different questions</h3>
        <div class="lx-table-wrap"><table class="lx-table"><thead><tr>
          <th>Pillar</th><th>Answers</th><th>In streaming</th></tr></thead><tbody>
          <tr><td><b>Metrics</b></td><td>"Is something wrong, and how bad?"</td><td>Lag, throughput,
          checkpoint stats, watermark lag — cheap, aggregated, alertable.</td></tr>
          <tr><td><b>Logs</b></td><td>"What exactly happened to this event?"</td><td>Errors, DLQ reasons,
          rebalance events — detailed, searchable.</td></tr>
          <tr><td><b>Traces</b></td><td>"Where did the time/latency go across hops?"</td><td>Follow one event
          source→sink to find the slow stage.</td></tr>
        </tbody></table></div>
        <h3>Make lag actionable</h3>
        <p>Raw lag ("2 million events") is hard to reason about; <b>time-lag</b> ("~4 minutes behind") maps
        directly to the latency SLO and is what you alert on. And always pair "lag is high" with "is it
        rising, flat, or falling?" — the derivative is what tells you whether to page someone now.</p>
        <div class="lx-callout lx-info"><b>Golden rule.</b><div>If you add one alert to a new streaming
        pipeline, make it "consumer time-lag rising past the SLO". If you add two, add "checkpoints failing".
        Those two catch the large majority of incidents before users do.</div></div>` },
      { id: 'iq', label: '🎤 Interview', body: iq([
        { q: 'What\'s the single most important streaming metric and why?', a: `Consumer lag — specifically
          its trend. Rising lag means the pipeline is falling behind the source right now, which directly
          threatens the latency SLO and is the earliest, clearest signal of trouble (under-provisioning, a
          slow sink, skew, a stuck consumer). It's best expressed as time-lag ("minutes behind") so it maps
          onto the SLO, and paired with its derivative so you know whether it's an incident forming or a
          stable backlog.` },
        { q: 'Why alert on symptoms rather than causes?', a: `Because cause-based alerts (one CPU spike, one
          slow checkpoint) create noise and fatigue, so people stop reacting and miss the real one.
          Symptom/SLO-based alerts fire on what users actually feel — lag past the SLO, output stalled, error
          rate up — and burn-rate alerting ties urgency to how fast you're spending your error budget. You
          page on impact, then use metrics/logs/traces to find the cause.` },
        { q: 'Why instrument per-partition instead of just aggregate?', a: `Because most streaming incidents
          are concentrated, not uniform — a single hot key or partition can drown while the aggregate looks
          healthy (averages hide skew). Per-partition lag, throughput, and latency make the hotspot visible
          so you diagnose "it's one partition" quickly, which also tells you that adding consumers won't help.` },
        { q: 'How do metrics, logs, and traces differ in a streaming context?', a: `Metrics answer "is
          something wrong and how bad" — cheap, aggregated, alertable signals like lag, throughput, and
          checkpoint stats. Logs answer "what happened to this specific event" — errors, DLQ reasons,
          rebalance events. Traces answer "where did the latency go across hops" — following one event from
          source to sink to find the slow stage. You need all three; they answer different questions.` },
      ]) },
    ],
  },
  {
    id: 'f15', num: '15', icon: '🏗️', title: 'End-to-end reference architecture',
    idea: 'Put it together: sources → streaming log → stateful processing → sinks, observable throughout — and recognize that every engine and cloud ahead is a concrete instance of this one backbone.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>The canonical shape</h3>
        <p>Nearly every streaming platform is the same backbone — internalize it once and every specific
        technology slots into place:</p>
        <ol class="clean">
          <li><b>Sources</b> — apps, devices, and change-data-capture emit events (the {ENTITY} stream).
          The source must be <b>replayable</b> if you want strong recovery (Module 11).</li>
          <li><b>Ingest / log</b> — Kafka / Kinesis / Event Hubs / Pub/Sub durably stores, partitions, and
          replicates events. This is the decoupling buffer and the source of truth (Modules 02–04).</li>
          <li><b>Stream processing</b> — Flink / Kafka Streams / Spark Structured Streaming does windowing,
          joins, and stateful logic, with checkpointed state+offsets for recovery (Modules 06–10).</li>
          <li><b>Sinks</b> — results land in a warehouse/lakehouse, a serving store, dashboards, or another
          topic. Transactional or idempotent sinks are what make end-to-end correctness real (Module 11).</li>
          <li><b>Observability</b> — lag, throughput, checkpoint health, and watermark lag wrap the whole
          thing (Module 14).</li>
        </ol>
        <div id="f15-pipeline"></div>
        <div class="lx-callout lx-ok"><b>You now have the map.</b><div>Every engine and cloud section ahead
        is a concrete implementation of this same backbone. Kafka/Kinesis/Event Hubs are the log; Flink/
        Kafka Streams/Spark are the processing; a warehouse or serving store is the sink. Keep the shape in
        mind and the specifics slot in.</div></div>` },
      { id: 'lens', label: '🧠 Design decisions across the backbone', body: `
        <h3>The decisions you make at each layer (and the module that taught them)</h3>
        <div class="lx-table-wrap"><table class="lx-table"><thead><tr>
          <th>Layer</th><th>Key decision</th><th>Grounded in</th></tr></thead><tbody>
          <tr><td>Source</td><td>Replayable? Who stamps event time, and can we trust it?</td><td>M05, M06</td></tr>
          <tr><td>Log</td><td>Partition key & count; retention (and tiered storage for replay)</td><td>M04, M05</td></tr>
          <tr><td>Processing</td><td>Event-time semantics; window types; what bounds state; checkpoint
          interval</td><td>M06–M10</td></tr>
          <tr><td>Sink</td><td>Transactional or idempotent? What does a duplicate cost?</td><td>M11, M13</td></tr>
          <tr><td>Cross-cutting</td><td>Delivery guarantee; lag/latency SLO; what to alert on</td><td>M11, M12, M14</td></tr>
        </tbody></table></div>
        <h3>Connecting the whole course in one chain of reasoning</h3>
        <p>Freshness is worth the cost (M01) → so we model the world as immutable events on a log that's the
        source of truth (M02) and decouple producers from consumers (M03) → we partition by a well-chosen
        key for scale and ordering (M04) and track position for replay (M05) → we process on event time
        (M06) using watermarks (M07) and windows (M08) over keyed state (M09) → we survive failure with
        checkpoints (M10) and pick a delivery guarantee the sink can actually honor (M11) → we keep up under
        load via backpressure (M12), stay correct through failures with reliability patterns (M13), and
        <i>see</i> all of it through observability (M14). <b>That chain is the mental model of a principal
        streaming engineer.</b></p>
        <div class="lx-callout lx-info"><b>The one question that ties it together.</b><div>For any streaming
        design, walk the backbone and ask at each hop: "how does this fail, how do we recover, and what does
        being wrong here cost?" If you can answer that at every layer, you understand the system — not just
        the buzzwords.</div></div>` },
      { id: 'iq', label: '🎤 Interview', body: iq([
        { q: 'Walk me through a generic streaming architecture.', a: `Sources emit events (apps, devices,
          CDC) into a durable, partitioned, replicated log (Kafka/Kinesis/Event Hubs) that decouples
          producers from consumers and is the source of truth. A stream processor (Flink/Kafka Streams/Spark)
          consumes it, doing windowing, joins, and stateful logic on event time with checkpointed
          state+offsets for recovery. Results go to sinks — a warehouse/lakehouse, a serving store, or
          another topic — made transactional or idempotent for correctness. Observability (lag, throughput,
          checkpoint and watermark health) wraps the whole thing. Every concrete stack is an instance of this
          backbone.` },
        { q: 'For a new streaming system, what do you decide at each layer?', a: `Source: is it replayable,
          and can we trust its event-time stamps? Log: partition key and count, and retention (with tiered
          storage if we need long replay). Processing: event-time semantics, window types, what bounds the
          state, and checkpoint interval. Sink: transactional or idempotent, driven by what a duplicate
          costs. Cross-cutting: the delivery guarantee, the lag/latency SLO, and what we alert on. The theme
          is: at every hop, how does it fail, how do we recover, and what does being wrong cost?` },
        { q: 'What\'s the most important question to ask about any hop in the pipeline?', a: `"How does this
          fail, how do we recover, and what does being wrong here cost?" It forces you to think about
          replayability at the source, durability and ordering in the log, state recovery in processing, and
          duplicate/loss semantics at the sink — and to size the guarantee to the business cost rather than
          reflexively reaching for the strongest, most expensive option. Answering it at every layer is what
          turns a collection of components into a system you actually understand.` },
      ]) },
    ],
  },
];

export const foundationById = (id) => FOUNDATIONS.find(m => m.id === id);
