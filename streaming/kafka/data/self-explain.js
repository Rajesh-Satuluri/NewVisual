// Self-explanation prompts — shown after a module's content, before moving on.
// The learner writes the idea in their own words, then reveals a model answer
// to compare. Generate-then-compare is one of the best-evidenced study methods.
//
// Keyed by module id; a card auto-appears on any module with an entry.
// Each prompt: { prompt, answer }.

export const SELF_EXPLAIN = {
  m01: [
    {
      prompt: `In your own words: why can several independent teams read the same Kafka topic without interfering with each other — something a traditional queue can't do?`,
      answer: `Kafka is a durable, append-only <strong>log</strong>, not a destructive queue. Messages are retained for a configured time rather than deleted on read, and each consumer group tracks its <em>own</em> offset. So every group reads the same partitions independently, from any position, at its own pace — fan-out with no copies and no risk of one team consuming another's messages.`,
    },
  ],
  m06: [
    {
      prompt: `Explain why routing all events for order #12345 to the same partition keeps them in order, while spreading them across partitions does not.`,
      answer: `Each partition is a single append-only log owned by one leader broker, so records <em>within</em> a partition have a total order. There is no global ordering across partitions — that would require a distributed coordinator on every write. Using <code>order_id</code> as the key hashes all of that order's events to the same partition, so a single consumer reads them back in the exact sequence they were produced. The cost is that ordering is scoped to the key, not the whole topic.`,
    },
  ],
  m07: [
    {
      prompt: `A broker holding a partition's leader was just killed. Explain why producers and consumers kept working within seconds — and what guaranteed no committed data was lost.`,
      answer: `Every partition is replicated to followers, and the <strong>in-sync replicas (ISR)</strong> are caught up to the leader's high-water mark. When the controller detects the dead broker, it elects a new leader <em>from the ISR</em> — so the new leader already has every record that was acknowledged to producers (with <code>acks=all</code>), guaranteeing no committed data loss. Clients refresh their metadata, discover the new leader, and reconnect; only requests that were in flight to the old leader are retried. Uncommitted, unreplicated writes beyond the high-water mark are the only thing that can be dropped.`,
    },
  ],
  m08: [
    {
      prompt: `One consumer in a 10-consumer group crashes. Explain why all 10 might briefly stop consuming — and how cooperative rebalancing reduces that.`,
      answer: `With the older <strong>eager</strong> protocol, any membership change triggers a stop-the-world rebalance: every consumer revokes <em>all</em> of its partitions, then the group reassigns from scratch. So a single crash pauses all 10 consumers until reassignment completes (1–30s). <strong>Cooperative (incremental)</strong> rebalancing — the default since Kafka 3.1 — only revokes the specific partitions that must move to rebalance load, letting the other consumers keep processing throughout. The crashed consumer's partitions are redistributed; everyone else barely notices.`,
    },
  ],
  m11: [
    {
      prompt: `Explain why at-least-once delivery can produce duplicates but never loses data, while at-most-once is the opposite.`,
      answer: `It comes down to <em>when</em> the offset is committed relative to processing. <strong>At-least-once</strong> commits the offset <em>after</em> processing: if the consumer crashes before committing, it reprocesses that record on restart → possible duplicate, but nothing is lost. <strong>At-most-once</strong> commits <em>before</em> processing: if it crashes mid-processing, the offset already moved on, so the record is never retried → no duplicate, but the record is lost. Neither is "better" — you pick the failure mode your domain tolerates (duplicates vs. loss), which is why payments use exactly-once and telemetry often uses at-most-once.`,
    },
  ],
};
