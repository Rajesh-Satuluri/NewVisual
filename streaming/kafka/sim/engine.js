// ─────────────────────────────────────────────────────────────────────────────
// Kafka deterministic simulation engine
//
// Pure JS, no DOM — importable in the browser (Playground UI) and in Node
// (unit tests). Every run is REPEATABLE: construct with the same seed, issue
// the same operations, and you get byte-identical results. This is a teaching
// SIMULATION, not a live Kafka cluster — but the partitioner below is Kafka's
// actual algorithm (murmur2 + toPositive % numPartitions), so key→partition
// routing matches a real broker.
// ─────────────────────────────────────────────────────────────────────────────

// ── Deterministic PRNG (mulberry32) ─────────────────────────────────────────
// Seeded so that reset() reproduces the exact same sequence.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── UTF-8 bytes for a key ────────────────────────────────────────────────────
const _enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
export function utf8Bytes(str) {
  if (_enc) return _enc.encode(str);
  // Minimal fallback (Node always has TextEncoder, but keep it safe).
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); }
    else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); }
  }
  return Uint8Array.from(out);
}

// ── murmur2 — Kafka's exact hash (org.apache.kafka.common.utils.Utils) ───────
export function murmur2(bytes) {
  const m = 0x5bd1e995, r = 24;
  let h = (0x9747b28c ^ bytes.length) | 0;
  const len4 = bytes.length >> 2;
  for (let i = 0; i < len4; i++) {
    const i4 = i * 4;
    let k = (bytes[i4] & 0xff) | ((bytes[i4 + 1] & 0xff) << 8) |
            ((bytes[i4 + 2] & 0xff) << 16) | ((bytes[i4 + 3] & 0xff) << 24);
    k = Math.imul(k, m); k ^= k >>> r; k = Math.imul(k, m);
    h = Math.imul(h, m); h ^= k;
  }
  const rem = bytes.length & 3;
  const tail = bytes.length & ~3;
  if (rem === 3) h ^= (bytes[tail + 2] & 0xff) << 16;
  if (rem >= 2) h ^= (bytes[tail + 1] & 0xff) << 8;
  if (rem >= 1) { h ^= bytes[tail] & 0xff; h = Math.imul(h, m); }
  h ^= h >>> 13; h = Math.imul(h, m); h ^= h >>> 15;
  return h | 0;
}

// ── Partition for a key — matches Kafka's DefaultPartitioner for keyed records
// toPositive(murmur2(key)) % numPartitions
export function partitionForKey(key, numPartitions) {
  const h = murmur2(utf8Bytes(String(key)));
  return (h & 0x7fffffff) % numPartitions;
}

// ── The engine ───────────────────────────────────────────────────────────────
export class KafkaSim {
  constructor({ seed = 1, brokers = 3 } = {}) {
    this.seed = seed >>> 0;
    this.brokerCount = brokers;
    this.reset();
  }

  // Full deterministic reset: same seed + same ops ⇒ same state.
  reset() {
    this.rand = mulberry32(this.seed);
    this.brokers = Array.from({ length: this.brokerCount }, (_, i) => ({ id: i, alive: true }));
    this.topics = new Map();
    this.ops = 0;
    return this;
  }

  // ── Topics ────────────────────────────────────────────────────────────────
  createTopic(name, { partitions = 3, replicationFactor = 1 } = {}) {
    if (this.topics.has(name)) throw new Error(`Topic "${name}" already exists`);
    const liveBrokers = this.brokers.filter(b => b.alive).length;
    if (replicationFactor > liveBrokers) {
      throw new Error(
        `replicationFactor ${replicationFactor} exceeds available brokers ${liveBrokers}`);
    }
    if (partitions < 1) throw new Error('A topic needs at least 1 partition');

    const parts = [];
    for (let p = 0; p < partitions; p++) {
      // Spread replicas round-robin across brokers (deterministic).
      const replicas = [];
      for (let r = 0; r < replicationFactor; r++) replicas.push((p + r) % this.brokerCount);
      parts.push({
        id: p,
        leader: replicas[0],
        replicas,
        isr: [...replicas],
        log: [],          // [{ offset, key, value }]
        sticky: null,     // current sticky partition is tracked at topic level
      });
    }
    this.topics.set(name, {
      name, partitions: parts, replicationFactor,
      stickyPartition: this.pickSticky(partitions),
    });
    return this.topics.get(name);
  }

  getTopic(name) {
    const t = this.topics.get(name);
    if (!t) throw new Error(`No such topic "${name}"`);
    return t;
  }

  // Sticky partitioner picks one partition per batch (deterministic via RNG).
  pickSticky(numPartitions) {
    return Math.floor(this.rand() * numPartitions);
  }

  // ── Produce ─────────────────────────────────────────────────────────────────
  // Keyed record → murmur2 routing. Null key → current sticky partition.
  produce(topicName, { key = null, value = null } = {}) {
    const t = this.getTopic(topicName);
    const n = t.partitions.length;
    const p = key == null ? t.stickyPartition : partitionForKey(key, n);
    const part = t.partitions[p];
    const offset = part.log.length;
    part.log.push({ offset, key, value });
    this.ops++;
    return { topic: topicName, partition: p, offset, key };
  }

  // A batch of records. Null-key records all land on the current sticky
  // partition, then the sticky partition rotates — exactly how Kafka's sticky
  // partitioner fills one batch before moving on.
  produceBatch(topicName, records) {
    const t = this.getTopic(topicName);
    const results = records.map(rec => this.produce(topicName, rec));
    // Rotate sticky partition for the next batch of null-key records.
    t.stickyPartition = this.pickSticky(t.partitions.length);
    return results;
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  partitionStats(topicName) {
    const t = this.getTopic(topicName);
    const total = t.partitions.reduce((s, p) => s + p.log.length, 0) || 1;
    return t.partitions.map(p => ({
      partition: p.id,
      leader: p.leader,
      replicas: [...p.replicas],
      isr: [...p.isr],
      count: p.log.length,
      pct: p.log.length / total,
    }));
  }

  // The most-loaded partition, and whether it's "hot" (well above even share).
  hotPartition(topicName, thresholdMult = 2) {
    const stats = this.partitionStats(topicName);
    const even = 1 / stats.length;
    let top = stats[0];
    for (const s of stats) if (s.pct > top.pct) top = s;
    return {
      partition: top.partition,
      pct: top.pct,
      isHot: top.pct >= even * thresholdMult && stats.length > 1,
      evenShare: even,
    };
  }

  totalRecords(topicName) {
    return this.getTopic(topicName).partitions.reduce((s, p) => s + p.log.length, 0);
  }

  // Serializable snapshot (for debugging / future save-state).
  snapshot() {
    return {
      seed: this.seed,
      brokers: this.brokers.map(b => ({ ...b })),
      topics: [...this.topics.values()].map(t => ({
        name: t.name,
        replicationFactor: t.replicationFactor,
        partitions: t.partitions.map(p => ({
          id: p.id, leader: p.leader, replicas: [...p.replicas],
          isr: [...p.isr], count: p.log.length,
        })),
      })),
    };
  }
}

export default KafkaSim;
