// Click-to-explain content for the m03 Kafka architecture diagram. Keyed by the
// data-node id on each clickable component. Each entry explains what the
// component is, its role in the Amazon order flow shown in the diagram, a few
// key points, and a deep link to the module that covers it in depth.
//
// Geometry (x,y,w,h) matches the SVG rects so the interaction layer can draw a
// selection ring without touching the original artwork.

export const ARCH_NODES = {
  'producer-order': {
    box: [10, 60, 120, 56],
    title: 'Producer — Order Service',
    role: 'Publishes an event to Kafka the instant you click "Buy Now".',
    detail: `A <b>producer</b> is any client that writes records to Kafka. The Order Service creates one JSON event and publishes it to the <code>orders</code> topic, then returns "Order confirmed!" in ~2ms — it never calls Fulfillment, Fraud, or Notifications directly. That decoupling is the whole point: the producer's job ends once the event is durably written.`,
    keyPoints: [
      'Chooses the partition via <code>hash(key) % partitions</code> — here the key is <code>orderId</code>.',
      'With <code>acks=all</code> it waits until every in-sync replica has the record before "confirmed".',
      'Batches records per partition (<code>linger.ms</code>) to trade a little latency for throughput.',
    ],
    link: 'm04', linkLabel: 'Producer Deep Dive',
  },
  'producer-payment': {
    box: [10, 135, 120, 56],
    title: 'Producer — Payment Service',
    role: 'Publishes a payment event to the <code>payments</code> topic on charge.',
    detail: `A second independent producer. It writes to a different topic (<code>payments</code>) but uses the same <code>orderId</code> key, so a downstream stream processor can join payments to orders. Producers don't coordinate with each other — each just appends to its topic's log.`,
    keyPoints: [
      'Same key (<code>orderId</code>) across topics enables downstream joins.',
      'Independent failure domain: a payment outage doesn\'t block order writes.',
    ],
    link: 'm04', linkLabel: 'Producer Deep Dive',
  },
  'cluster': {
    box: [200, 60, 400, 350],
    title: 'Kafka Cluster (RF = 3)',
    role: 'The group of brokers that collectively store every topic and partition.',
    detail: `A <b>cluster</b> is a set of brokers working together. Replication factor 3 means every partition has 3 copies spread across different brokers, so the cluster can lose brokers without losing data. One broker acts as the <b>controller</b>, managing metadata and leader elections.`,
    keyPoints: [
      'Each partition has one leader and RF−1 followers, spread across brokers.',
      'The controller (a broker) tracks membership and elects new leaders on failure.',
      'Modern Kafka uses KRaft (a built-in Raft quorum) instead of ZooKeeper for metadata.',
    ],
    link: 'm05', linkLabel: 'Broker Internals',
  },
  'broker1': {
    box: [220, 100, 110, 140],
    title: 'Broker 1 — Controller',
    role: 'A Kafka server that also holds the special controller role.',
    detail: `A <b>broker</b> stores partition data and serves produce/fetch requests. Broker 1 is additionally the <b>controller</b>: it maintains cluster metadata (topics, partitions, ISR lists, broker registrations) and, when a broker dies, picks new partition leaders from the in-sync replicas and broadcasts the updated metadata.`,
    keyPoints: [
      'Leader for some partitions, follower for others — load is spread, not centralized.',
      'As controller, detects dead brokers via heartbeat timeout and drives leader election (~1s).',
      'In KRaft mode the controller role is backed by a Raft quorum of controllers.',
    ],
    link: 'm05', linkLabel: 'Broker Internals',
  },
  'broker2': {
    box: [345, 100, 110, 140],
    title: 'Broker 2',
    role: 'A broker holding leader and follower replicas of several partitions.',
    detail: `Broker 2 is the leader for <code>orders-P1</code> and a follower (safe copy) for <code>orders-P0</code> and <code>payments-P0</code>. Followers continuously fetch from their leader to stay in the ISR. If the leader of a partition it follows dies, Broker 2 is eligible to be promoted.`,
    keyPoints: [
      'Followers replicate the leader\'s log to become eligible leaders (ISR).',
      'Reads and writes for a partition always go through that partition\'s current leader.',
    ],
    link: 'm07', linkLabel: 'Replication',
  },
  'broker3': {
    box: [470, 100, 110, 140],
    title: 'Broker 3',
    role: 'A broker; leader for <code>orders-P2</code> in the order-flow example.',
    detail: `When you buy the iPhone, <code>orders-P2</code> is hashed from the <code>orderId</code> and its leader happens to be Broker 3. Broker 3 takes the write first, then Brokers 1 and 2 replicate it. Only after all in-sync copies are written does the producer get its <code>acks=all</code> acknowledgement.`,
    keyPoints: [
      'The partition leader receives the write; followers pull it to stay in sync.',
      'A safe copy of every record lives on multiple brokers before "confirmed".',
    ],
    link: 'm07', linkLabel: 'Replication',
  },
  'topic-orders': {
    box: [220, 265, 360, 55],
    title: 'Topic: orders',
    role: 'A named, append-only log split into 3 partitions.',
    detail: `A <b>topic</b> is a logical stream; physically it's split into <b>partitions</b>, which are the unit of ordering and parallelism. <code>orders</code> has 3 partitions (RF=3, 7-day retention). Keying by <code>orderId</code> means all events for one order land in the same partition, preserving their order.`,
    keyPoints: [
      'Ordering is guaranteed within a partition, not across the whole topic.',
      'More partitions → more consumer parallelism, but harder to reorder later.',
      'Retention keeps data for a set time/size regardless of whether it was read.',
    ],
    link: 'm06', linkLabel: 'Partitions',
  },
  'topic-payments': {
    box: [220, 330, 360, 55],
    title: 'Topic: payments',
    role: 'A single-partition topic with 30-day retention.',
    detail: `The <code>payments</code> topic uses 1 partition (strict total order across all payments) and longer 30-day retention. Same <code>orderId</code> key as <code>orders</code>, so the two streams can be joined downstream (e.g. in Kafka Streams).`,
    keyPoints: [
      '1 partition = total ordering, but caps parallelism at one consumer.',
      'Retention is a per-topic policy — here 30 days vs orders\' 7.',
    ],
    link: 'm10', linkLabel: 'Retention & Compaction',
  },
  'cg-fulfillment': {
    box: [680, 68, 155, 76],
    title: 'Consumer Group — fulfillment',
    role: 'Reads the orders stream to pack and ship, 1 consumer per partition.',
    detail: `A <b>consumer group</b> is a set of consumers that share a <code>group.id</code> and divide a topic's partitions among themselves — each partition is read by exactly one member. With 3 partitions and 3 consumers, fulfillment gets full parallelism. It tracks its own offset, independent of other groups.`,
    keyPoints: [
      'Each partition is consumed by exactly one member of the group.',
      'Max useful consumers = partition count; extras sit idle.',
      'Its offset is separate — other groups read the same events independently.',
    ],
    link: 'm08', linkLabel: 'Consumer Groups',
  },
  'cg-fraud': {
    box: [680, 170, 155, 76],
    title: 'Consumer Group — fraud-detection',
    role: 'One consumer reading all partitions to score every order.',
    detail: `A separate consumer group reading the <i>same</i> <code>orders</code> events at its own pace — this is Kafka's fan-out. One consumer here reads all 3 partitions. If it crashes and restarts, it resumes from its last committed offset; the events are still in the log.`,
    keyPoints: [
      'Multiple groups read the same topic without interfering — non-destructive reads.',
      'Restart resumes from the committed offset, so a crash loses no events.',
    ],
    link: 'm08', linkLabel: 'Consumer Groups',
  },
  'cg-notifications': {
    box: [680, 272, 155, 76],
    title: 'Consumer Group — notifications',
    role: 'Sends the "Order Confirmed" email, reading all partitions.',
    detail: `A third independent consumer group. Three groups — fulfillment, fraud, notifications — all process the same order event in parallel, none aware of the others. Adding a new consumer (say, analytics) is just a new group subscribing; no producer change needed.`,
    keyPoints: [
      'New consumers = new groups; producers never change.',
      'Parallel, decoupled processing is what the log model unlocks.',
    ],
    link: 'm08', linkLabel: 'Consumer Groups',
  },
  'schema-registry': {
    box: [680, 370, 155, 52],
    title: 'Schema Registry',
    role: 'Stores and enforces the event schemas producers and consumers share.',
    detail: `The <b>Schema Registry</b> holds Avro/Protobuf/JSON schemas by subject and enforces compatibility rules, so a producer can't publish an event shape that would break existing consumers. It's not in the record path for storage — clients fetch and cache schemas by ID.`,
    keyPoints: [
      'Compatibility modes (backward/forward/full) govern safe schema evolution.',
      'Records carry a small schema ID; the payload stays compact.',
    ],
    link: 'm14', linkLabel: 'Schema Registry',
  },
};
