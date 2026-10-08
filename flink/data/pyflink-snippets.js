// AUTO-GENERATED from data/pyflink-snippets.py by scratchpad/build_snippets.py
// Do NOT edit by hand. Edit the .py (single verified source) and re-run.
// Snippets: 19  |  deep API check: syntax-only (pyflink not installed)

export const PYFLINK_TIERS = {
  "datastream": "PyFlink \u00b7 DataStream",
  "table-sql": "PyFlink \u00b7 Table API / SQL",
  "java-workaround": "Java-only \u2192 PyFlink path"
};

export const PYFLINK = {
  bootstrap_env: { tier: "datastream", code: `from pyflink.datastream import StreamExecutionEnvironment, RuntimeExecutionMode
from pyflink.common import Configuration

config = Configuration()
# Pipeline-wide knobs that also show up in flink-conf.yaml.
config.set_string("pipeline.max-parallelism", "720")   # fixes key-group count; see rescaling
config.set_string("taskmanager.memory.managed.fraction", "0.4")

env = StreamExecutionEnvironment.get_execution_environment(config)
env.set_runtime_mode(RuntimeExecutionMode.STREAMING)
env.set_parallelism(16)                                 # matches Kafka partition count` },
  kafka_source: { tier: "datastream", code: `from pyflink.datastream.connectors.kafka import (
    KafkaSource, KafkaOffsetsInitializer)
from pyflink.common.serialization import SimpleStringSchema

# Unified Source API: a SplitEnumerator divides the topic's partitions into
# splits and hands them to parallel SourceReaders. Offsets are committed back
# to Kafka only on a successful checkpoint -> the basis for exactly-once.
ride_source = (
    KafkaSource.builder()
    .set_bootstrap_servers("kafka-0:9092,kafka-1:9092,kafka-2:9092")
    .set_topics("ride-events")
    .set_group_id("flink-ride-pipeline")
    # Resume from the group's committed offsets; cold-start from earliest.
    .set_starting_offsets(KafkaOffsetsInitializer.committed_offsets())
    .set_value_only_deserializer(SimpleStringSchema())
    .build()
)` },
  watermark_strategy: { tier: "datastream", code: `import json
from pyflink.common.watermark_strategy import WatermarkStrategy, TimestampAssigner
from pyflink.common import Duration


class RideEventTimestamp(TimestampAssigner):
    # event_time = when the phone emitted the event (epoch millis), NOT when
    # Flink received it. This is what makes billing & SLA math correct.
    def extract_timestamp(self, value, record_timestamp):
        return value["event_time"]


ride_watermarks = (
    WatermarkStrategy
    .for_bounded_out_of_orderness(Duration.of_seconds(10))   # tolerate 10s of reordering
    .with_timestamp_assigner(RideEventTimestamp())
    # Without this, ONE city partition with no traffic (3am lull) would freeze
    # the global watermark and every window would stop firing.
    .with_idleness(Duration.of_seconds(15))
)` },
  parse_and_filter: { tier: "datastream", code: `from pyflink.common.typeinfo import Types

raw = env.from_source(ride_source, ride_watermarks, "ride-events")

parsed = raw.map(lambda s: json.loads(s),
                 output_type=Types.MAP(Types.STRING(), Types.STRING()))

# Drop corrupt / test / zero-fare events before they poison aggregates.
clean = parsed.filter(
    lambda e: e.get("ride_id") is not None
    and e.get("event_type") in VALID_EVENT_TYPES
    and e.get("app_version", "0") >= "4.280.0"          # drop ancient clients
)` },
  keyby_window_agg: { tier: "datastream", code: `from pyflink.datastream.window import TumblingEventTimeWindows
from pyflink.common import Time
from pyflink.datastream.functions import AggregateFunction


class DemandCount(AggregateFunction):
    def create_accumulator(self):           return 0
    def add(self, value, acc):              return acc + 1
    def get_result(self, acc):              return acc
    def merge(self, a, b):                  return a + b


# Rides-per-cell-per-minute: the signal surge pricing watches.
demand = (
    clean
    .key_by(lambda e: e["s2_cell_id"])                         # geo partition
    .window(TumblingEventTimeWindows.of(Time.minutes(1)))      # fixed 60s buckets
    .aggregate(DemandCount())
)` },
  late_data_side_output: { tier: "datastream", code: `from pyflink.datastream import OutputTag

# Events later than the watermark but inside allowed_lateness still update the
# window (it re-fires). Events later than THAT are diverted, never silently lost.
late_rides = OutputTag("late-rides", Types.MAP(Types.STRING(), Types.STRING()))

windowed = (
    clean
    .key_by(lambda e: e["s2_cell_id"])
    .window(TumblingEventTimeWindows.of(Time.minutes(1)))
    .allowed_lateness(Time.minutes(2))        # tunnel pings up to 2 min late re-fire
    .side_output_late_data(late_rides)        # beyond 2 min -> side stream
    .aggregate(DemandCount())
)

# Reconcile dropped stragglers offline instead of losing fare/demand data.
dropped = windowed.get_side_output(late_rides)` },
  keyed_state_wait_time: { tier: "datastream", code: `from pyflink.datastream.functions import KeyedProcessFunction, RuntimeContext
from pyflink.datastream.state import ValueStateDescriptor


class PickupWaitTime(KeyedProcessFunction):
    # Keyed by ride_id: remember when the ride was requested, then emit the
    # rider's wait the instant the driver accepts. Pure stateful streaming.
    def open(self, ctx: RuntimeContext):
        self.requested_at = ctx.get_state(
            ValueStateDescriptor("requested_at", Types.LONG()))

    def process_element(self, event, ctx):
        et = event["event_type"]
        if et == "RIDE_REQUESTED":
            self.requested_at.update(event["event_time"])
        elif et == "DRIVER_ACCEPTED":
            t0 = self.requested_at.value()
            if t0 is not None:
                yield {"ride_id": event["ride_id"],
                       "wait_ms": event["event_time"] - t0}` },
  state_ttl: { tier: "datastream", code: `from pyflink.datastream.state import ValueStateDescriptor, StateTtlConfig
from pyflink.common import Time

# Driver state that hasn't seen an event in 24h is auto-expired, so RocksDB
# doesn't grow to TBs for drivers who logged off weeks ago.
ttl = (
    StateTtlConfig
    .new_builder(Time.hours(24))
    .set_update_type(StateTtlConfig.UpdateType.OnCreateAndWrite)
    .set_state_visibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
    .cleanup_in_rocksdb_compact_filter(1000)     # purge during LSM compaction
    .build()
)
descriptor = ValueStateDescriptor("last_trip_ts", Types.LONG())
descriptor.enable_time_to_live(ttl)` },
  rocksdb_backend: { tier: "datastream", code: `from pyflink.datastream import EmbeddedRocksDBStateBackend
from pyflink.datastream import CheckpointStorage

# Off-heap, disk-backed state -> no GC pauses, TB-scale keyed state, and
# incremental checkpoints (only changed SSTables upload to S3).
env.set_state_backend(EmbeddedRocksDBStateBackend(enable_incremental_checkpointing=True))
env.get_checkpoint_config().set_checkpoint_storage(
    CheckpointStorage("s3://uber-flink-checkpoints/ride-pipeline"))` },
  checkpoint_config: { tier: "datastream", code: `from pyflink.datastream import CheckpointingMode

cp = env.get_checkpoint_config()
env.enable_checkpointing(60_000)                       # every 60s
cp.set_checkpointing_mode(CheckpointingMode.EXACTLY_ONCE)
cp.set_min_pause_between_checkpoints(30_000)           # breathing room between snapshots
cp.set_checkpoint_timeout(600_000)                     # fail the checkpoint after 10 min
cp.set_max_concurrent_checkpoints(1)
# Under backpressure, let barriers overtake buffered data instead of stalling.
cp.enable_unaligned_checkpoints()
# Keep the last snapshot for manual restart after a crash.
cp.set_externalized_checkpoint_cleanup(
    cp.ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION)` },
  kafka_sink_eos: { tier: "datastream", code: `from pyflink.datastream.connectors.kafka import (
    KafkaSink, KafkaRecordSerializationSchema, DeliveryGuarantee)

# Exactly-once sink via Kafka transactions (Flink's 2-phase commit under the
# hood). transaction.timeout.ms MUST exceed the max expected checkpoint
# interval, or a slow checkpoint lets Kafka abort an open txn -> duplicate or
# lost surge events on restart. It must also be <= broker
# transaction.max.timeout.ms (default 15 min) or the sink is rejected.
surge_sink = (
    KafkaSink.builder()
    .set_bootstrap_servers("kafka-0:9092,kafka-1:9092,kafka-2:9092")
    .set_record_serializer(
        KafkaRecordSerializationSchema.builder()
        .set_topic("surge-pricing")
        .set_value_serialization_schema(SimpleStringSchema())
        .build())
    .set_delivery_guarantee(DeliveryGuarantee.EXACTLY_ONCE)
    .set_transactional_id_prefix("surge-eos")
    .set_property("transaction.timeout.ms", "900000")   # 15 min, == broker cap
    .build()
)` },
  hot_key_two_phase: { tier: "datastream", code: `import random
from pyflink.datastream.window import TumblingEventTimeWindows
from pyflink.common import Time

# The airport s2 cell is a HOT KEY: one subtask gets 40x the traffic and
# backpressures the job. Fix = two-phase (local/global) aggregation.
# Phase 1: split the hot key with a random salt so load spreads across subtasks.
N_SALT = 32
local = (
    clean
    .map(lambda e: (f"{e['s2_cell_id']}#{random.randint(0, N_SALT - 1)}", 1),
         output_type=Types.TUPLE([Types.STRING(), Types.INT()]))
    .key_by(lambda kv: kv[0])
    .window(TumblingEventTimeWindows.of(Time.minutes(1)))
    .reduce(lambda a, b: (a[0], a[1] + b[1]))
)
# Phase 2: strip the salt and re-aggregate the partial counts per real cell.
global_demand = (
    local
    .map(lambda kv: (kv[0].split("#")[0], kv[1]),
         output_type=Types.TUPLE([Types.STRING(), Types.INT()]))
    .key_by(lambda kv: kv[0])
    .window(TumblingEventTimeWindows.of(Time.minutes(1)))
    .reduce(lambda a, b: (a[0], a[1] + b[1]))
)` },
  broadcast_surge_rules: { tier: "datastream", code: `from pyflink.datastream.state import MapStateDescriptor
from pyflink.datastream.functions import KeyedBroadcastProcessFunction

# Surge multipliers change by ops throughout the day. Broadcast them to EVERY
# subtask so each keyed ride stream prices against the latest rule set without
# a per-event external lookup.
rules_desc = MapStateDescriptor("surge-rules", Types.STRING(), Types.FLOAT())
rules_bcast = rule_updates.broadcast(rules_desc)          # rule_updates: DataStream

priced = (
    demand_per_cell.connect(rules_bcast)
    .process(ApplySurgeRules())                           # KeyedBroadcastProcessFunction
)
# NOTE: broadcast state in PyFlink needs Flink >= 1.16. On older clusters this
# is a Java-only path.` },
  savepoint_uid: { tier: "datastream", code: `# Operator UIDs map saved state back to operators across code changes. WITHOUT
# explicit uid(), Flink auto-generates one from the job graph; any topology edit
# shifts it and the savepoint restore fails ("cannot map state"). Always set uid.
demand = (
    clean
    .key_by(lambda e: e["s2_cell_id"]).name("key-by-cell")
    .window(TumblingEventTimeWindows.of(Time.minutes(1)))
    .aggregate(DemandCount())
    .uid("demand-per-cell-v1")        # <- stable across deploys
    .name("demand-per-cell")
)
# Rescale from a savepoint:
#   flink stop  --savepointPath s3://.../sp  <job-id>
#   flink run -s s3://.../sp -p 48 ride_pipeline.py
# New parallelism (48) must stay <= pipeline.max-parallelism (720 key groups).` },
  table_kafka_ddl: { tier: "table-sql", code: `from pyflink.table import StreamTableEnvironment

t_env = StreamTableEnvironment.create(env)

# The idiomatic Python path for connectors: declarative DDL. Watermark and
# event-time column are part of the schema, not imperative code.
t_env.execute_sql("""
    CREATE TABLE ride_events (
        ride_id     STRING,
        s2_cell_id  STRING,
        event_type  STRING,
        fare_inr    DECIMAL(10, 2),
        event_time  TIMESTAMP_LTZ(3),
        WATERMARK FOR event_time AS event_time - INTERVAL '10' SECOND
    ) WITH (
        'connector'               = 'kafka',
        'topic'                   = 'ride-events',
        'properties.bootstrap.servers' = 'kafka-0:9092',
        'properties.group.id'     = 'flink-sql-pipeline',
        'scan.startup.mode'       = 'group-offsets',
        'format'                  = 'json'
    )
""")` },
  sql_surge_match_recognize: { tier: "table-sql", code: `# CEP in Python = SQL MATCH_RECOGNIZE (the DataStream CEP library is JVM-only).
# Detect a surge onset: 3 consecutive rising 1-min demand counts in one cell.
surge = t_env.sql_query("""
    SELECT * FROM demand_per_minute
    MATCH_RECOGNIZE (
        PARTITION BY s2_cell_id
        ORDER BY window_end
        MEASURES
            FIRST(RISE.window_end) AS surge_start,
            LAST(RISE.demand)      AS peak_demand
        ONE ROW PER MATCH
        AFTER MATCH SKIP TO LAST RISE
        PATTERN (RISE{3})
        DEFINE RISE AS RISE.demand > PREV(RISE.demand)
    )
""")` },
  sql_temporal_join: { tier: "table-sql", code: `# Price each ride against the surge multiplier that was in effect AT the ride's
# event time -> temporal (versioned) join. Replaces per-event async lookups.
priced = t_env.sql_query("""
    SELECT  r.ride_id,
            r.fare_inr,
            r.fare_inr * s.multiplier AS surged_fare
    FROM ride_events AS r
    JOIN surge_rules FOR SYSTEM_TIME AS OF r.event_time AS s
      ON r.s2_cell_id = s.s2_cell_id
""")` },
  async_io_workaround: { tier: "java-workaround", code: `# Async I/O (AsyncDataStream / RichAsyncFunction) is JAVA-ONLY. In PyFlink the
# idiomatic enrichment is a Table API lookup join against the driver-profile
# table, which the planner batches and caches for you:
driver_enriched = t_env.sql_query("""
    SELECT  r.ride_id, r.driver_id, d.rating, d.vehicle_class
    FROM ride_events AS r
    JOIN driver_profiles FOR SYSTEM_TIME AS OF r.proc_time AS d
      ON r.driver_id = d.driver_id
""")
# Lookup cache tuning in the driver_profiles DDL:
#   'lookup.cache' = 'PARTIAL', 'lookup.partial-cache.max-rows' = '100000',
#   'lookup.partial-cache.expire-after-write' = '10 min'` },
  two_phase_commit_workaround: { tier: "java-workaround", code: `# A custom TwoPhaseCommitSinkFunction is JAVA-ONLY. In PyFlink you get the same
# end-to-end exactly-once by composing BUILT-IN transactional/idempotent sinks:
#   - KafkaSink with DeliveryGuarantee.EXACTLY_ONCE   (shown in kafka_sink_eos)
#   - JDBC upsert sink keyed by a primary key (idempotent replay):
t_env.execute_sql("""
    CREATE TABLE payments_sink (
        ride_id   STRING,
        charged   DECIMAL(10,2),
        charged_at TIMESTAMP_LTZ(3),
        PRIMARY KEY (ride_id) NOT ENFORCED        -- upsert => no double charge
    ) WITH (
        'connector' = 'jdbc',
        'url'       = 'jdbc:postgresql://pg:5432/billing',
        'table-name'= 'ride_payments',
        'sink.buffer-flush.interval' = '1s'
    )
""")
# PK upsert makes a replayed PAYMENT_COMPLETED overwrite, not duplicate.` },
};
