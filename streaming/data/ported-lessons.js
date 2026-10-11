// Phase 1 — search index for the ported Kafka & Flink sub-apps.
//
// The ported apps live at streaming/kafka/ and streaming/flink/ as byte-identical
// self-contained SPAs; their lesson lists are mirrored here ONLY so the global
// search can index them and deep-link to the correct lesson. This file does not
// modify any preserved file — it is lab-owned metadata. `url` is relative to
// streaming/ and opens the ported app at its own hash route (kafka/#m09, …).
//
// `kw` carries concept keywords (incl. the interview terms learners actually type
// — "consumer lag", "rebalancing", "savepoints", "backpressure", …) so a search
// resolves to the right lesson, not just a title match.

export const KAFKA_LESSONS = [
  { id: 'm01', title: 'Why Kafka', kw: 'linkedin origins messaging history event streaming need log' },
  { id: 'm02', title: 'Messaging Fundamentals', kw: 'producers brokers topics consumers pub sub queue' },
  { id: 'm03', title: 'Kafka Architecture', kw: 'cluster controller broker zookeeper kraft components' },
  { id: 'm04', title: 'Producer Deep Dive', kw: 'serializer partitioner batch acks idempotent producer linger retries' },
  { id: 'm05', title: 'Broker Internals', kw: 'log segments page cache index files replication storage' },
  { id: 'm06', title: 'Partitions', kw: 'partitioning distribution ordering parallelism hot partition key' },
  { id: 'm07', title: 'Replication', kw: 'leader isr follower lag replica recovery broker failure' },
  { id: 'm08', title: 'Consumer Groups', kw: 'rebalancing rebalance assignment cooperative stop the world group coordinator' },
  { id: 'm09', title: 'Offsets', kw: 'consumer lag committed current offset replay seek auto commit' },
  { id: 'm10', title: 'Retention & Compaction', kw: 'time size retention log compaction tombstone cleanup policy' },
  { id: 'm11', title: 'Delivery Guarantees', kw: 'at most once at least once exactly once idempotency transactions delivery semantics' },
  { id: 'm12', title: 'Kafka Connect', kw: 'source sink connectors smt dead letter queue dlq' },
  { id: 'm13', title: 'Kafka Streams', kw: 'dsl map filter aggregate join state store ktable kstream' },
  { id: 'm14', title: 'Schema Registry', kw: 'avro protobuf json schema evolution backward forward full compatibility' },
  { id: 'm15', title: 'Security', kw: 'tls ssl sasl acl authentication authorization encryption' },
  { id: 'm16', title: 'Monitoring', kw: 'consumer lag throughput isr disk metrics grafana jmx dashboard' },
  { id: 'm17', title: 'Performance Tuning', kw: 'producer consumer broker config batch size throughput latency tuning' },
  { id: 'm18', title: 'Failure Simulation', kw: 'kill producer broker leader recovery cascade fault tolerance' },
  { id: 'm19', title: 'Amazon Pipeline', kw: 'end to end order pipeline snowflake bi e-commerce worked example' },
  { id: 'm20', title: 'Kafka vs Competitors', kw: 'kinesis pub sub pulsar rabbitmq comparison matrix' },
  { id: 'm21', title: 'MirrorMaker 2', kw: 'cross cluster replication active active disaster recovery offset translation' },
  { id: 'm22', title: 'Partition Reassignment', kw: 'add brokers rebalance leaders decommission nodes reassignment' },
  // high-value tools
  { id: 'playground', title: 'Partition Simulator', kw: 'interactive partition key routing playground' },
  { id: 'troubleshoot', title: 'Troubleshooting Lab', kw: 'debug diagnose incident consumer lag rebalance' },
  { id: 'incident-bank', title: 'Incident Bank', kw: 'production incidents failures playbook' },
  { id: 'decisions', title: 'Choose the Approach', kw: 'decision trade-offs design choices' },
];

export const FLINK_LESSONS = [
  { id: 'm01', title: 'Why Apache Flink', kw: 'stream processing true streaming low latency' },
  { id: 'm02', title: 'Streaming Fundamentals', kw: 'bounded unbounded dataflow streaming basics' },
  { id: 'm03', title: 'Flink Architecture', kw: 'jobmanager taskmanager slots dispatcher cluster' },
  { id: 'm04', title: 'Job Lifecycle', kw: 'submit schedule deploy job graph execution' },
  { id: 'm05', title: 'Parallelism', kw: 'source operator parallelism slots keyby task parallel' },
  { id: 'm06', title: 'Operators', kw: 'map filter flatmap keyby process function chaining' },
  { id: 'm07', title: 'Sources & Sinks', kw: 'source progress sink connectors kafka source offsets' },
  { id: 'm08', title: 'Time Concepts', kw: 'event time processing time ingestion time vs' },
  { id: 'm09', title: 'Watermarks', kw: 'watermark late data out of order allowed lateness idleness' },
  { id: 'm10', title: 'Windows', kw: 'tumbling sliding session windows trigger evictor windowing' },
  { id: 'm11', title: 'State Management', kw: 'state backends rocksdb keyed state value list map state ttl' },
  { id: 'm12', title: 'Checkpointing', kw: 'checkpoint barriers aligned unaligned recovery snapshot interval' },
  { id: 'm13', title: 'Fault Tolerance', kw: 'exactly once recovery restart strategy failover checkpoints' },
  { id: 'm13b', title: 'Savepoints', kw: 'savepoint upgrade migration state rescale stop with savepoint' },
  { id: 'm14', title: 'Backpressure', kw: 'backpressure buffers credit based flow control bottleneck' },
  { id: 'm15', title: 'Flink SQL & Table API', kw: 'table api sql relational dynamic tables' },
  { id: 'm16', title: 'Connectors', kw: 'kafka jdbc filesystem connectors formats' },
  { id: 'm17', title: 'Flink SQL', kw: 'sql queries match_recognize temporal joins' },
  { id: 'm18', title: 'Performance', kw: 'tuning throughput latency network memory performance' },
  { id: 'm19', title: 'Uber Pipeline', kw: 'uber ride end to end eta geospatial worked example r-4471' },
  // tools
  { id: 'comparison', title: 'Engine Comparison', kw: 'flink vs spark kafka streams comparison' },
  { id: 'study', title: 'Study Hub', kw: 'review quiz recap study' },
];
