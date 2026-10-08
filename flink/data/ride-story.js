// =====================================================================
// Canonical ride R-4471 — the single source of truth every module tells
// its story against.  One ride, traced end-to-end, carrying six DELIBERATE
// real-world defects so each Flink corner case has a concrete anchor.
//
// Realism charter:
//  - event_time / ingest_time are epoch millis (not "20:00:01" toy strings).
//  - schema fields are what a real ride-hailing stream actually carries.
//  - GPS pings at a realistic ~4s cadence.
//  - magnitudes are a TEACHING MODEL, not any company's published numbers.
// =====================================================================

// 2024-03-14 19:42:05 IST  (Hyderabad, UTC+5:30) == 14:12:05 UTC
export const BASE_MS = Date.UTC(2024, 2, 14, 14, 12, 5);
const IST_OFFSET = 5.5 * 3600 * 1000;

// t: seconds after BASE -> epoch millis
const t = (sec) => BASE_MS + Math.round(sec * 1000);

// epoch millis -> "HH:MM:SS.mmm IST" for display
export function istTime(ms) {
  const d = new Date(ms + IST_OFFSET);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}` +
    `.${p(d.getUTCMilliseconds(), 3)} IST`;
}

export const RIDE = {
  ride_id: 'R-4471',
  rider_id: 'u_9c21a7',
  driver_id: 'd_4f8810',
  city_id: 'HYD',
  product: 'UberGo',
  vehicle_class: 'sedan',
  // S2 geo cells (level 13 ~ 1.2 km²). The airport cell is the hot key.
  cells: {
    hitech_city: '3fb9c04c',   // pickup area
    airport_rgia: '3fb98e10',  // HOT KEY cell — 40x normal demand
    gachibowli: '3fb9c0b4',
  },
  topic: 'ride-events',
  partition: 7,                // this ride hashes to Kafka partition 7 of 16
};

// A representative raw event exactly as it lands off Kafka (value is JSON text).
// Every stage below carries one of these; fields never change shape mid-story.
function evt(stage, sec, extra = {}) {
  return {
    ride_id: RIDE.ride_id,
    rider_id: RIDE.rider_id,
    driver_id: extra.driver_id ?? null,
    city_id: RIDE.city_id,
    s2_cell_id: extra.s2_cell_id ?? RIDE.cells.hitech_city,
    event_type: stage,
    event_time: t(sec),               // phone clock (epoch ms)
    ingest_time: t(sec + (extra.lagSec ?? 0.4)), // when Kafka received it
    app_version: '4.283.1',
    producer_partition: RIDE.partition,
    ...extra.payload,
  };
}

// ---------------------------------------------------------------------
// The ride lifecycle.  `concepts` lists the Flink ideas that FIRE at this
// stage; `why` is the one-line "why this concept and not another".
// ---------------------------------------------------------------------
export const STAGES = [
  {
    key: 'RIDE_REQUESTED', label: 'Ride Requested', icon: '📲', atSec: 0,
    rider: 'Rider taps "Confirm UberGo" in Hi-Tech City.',
    driver: '—',
    flink: 'Event is produced to Kafka topic ride-events (partition 7) and read by the Flink KafkaSource; parsed and filtered.',
    event: evt('RIDE_REQUESTED', 0, { payload: { fare_estimate_inr: 248.0 } }),
    concepts: ['kafka', 'source', 'map', 'filter'],
    modules: ['m16', 'm06', 'm07'],
    why: 'Entry point — the Source + offsets are what make replay (and thus exactly-once) possible later.',
  },
  {
    key: 'DRIVER_SEARCHING', label: 'Driver Searching', icon: '🔎', atSec: 2.1,
    rider: '"Connecting you to a nearby driver…"',
    driver: 'Match engine scans drivers within the pickup cell.',
    flink: 'keyBy(s2_cell_id) partitions the stream by geo cell; a per-cell count of open requests is maintained in keyed state.',
    event: evt('DRIVER_SEARCHING', 2.1),
    concepts: ['keyby', 'keyed-state', 'parallelism'],
    modules: ['m05', 'm11', 'm07'],
    why: 'keyBy guarantees all events for one cell land on one subtask — the precondition for correct per-cell state.',
  },
  {
    key: 'DRIVER_ASSIGNED', label: 'Driver Assigned', icon: '🧭', atSec: 6.4,
    rider: '"Driver found — Rahul in a white Dzire."',
    driver: 'Push: "New trip offer, 3 min away."',
    flink: 'ValueState<Long> keyed by ride_id stores assigned_time + driver_id so later stages can compute durations.',
    event: evt('DRIVER_ASSIGNED', 6.4, { driver_id: RIDE.driver_id }),
    concepts: ['keyed-state', 'value-state'],
    modules: ['m11'],
    why: 'State is Flink remembering R-4471 across events — without it the accept-latency calc below is impossible.',
  },
  {
    key: 'DRIVER_ACCEPTED', label: 'Driver Accepted', icon: '✅', atSec: 11.2,
    rider: '"Rahul is on the way."',
    driver: 'Taps Accept.',
    flink: 'KeyedProcessFunction reads requested_at from state and emits wait = accepted − requested (event-time arithmetic).',
    event: evt('DRIVER_ACCEPTED', 11.2, { driver_id: RIDE.driver_id }),
    concepts: ['keyed-state', 'event-time', 'process-function'],
    modules: ['m08', 'm11'],
    why: 'Uses EVENT time, not processing time — the wait a rider felt is defined by phone clocks, not Flink’s clock.',
  },
  {
    key: 'DRIVER_ARRIVING', label: 'Driver Arriving', icon: '🚗', atSec: 15,
    rider: 'Live car marker moving on the map.',
    driver: 'Navigating to pickup; phone emits GPS every ~4s.',
    flink: 'GPS pings buffered per driver in ListState; event-time timestamps + watermarks order them despite network jitter.',
    event: evt('DRIVER_ARRIVING', 15, { s2_cell_id: RIDE.cells.hitech_city, payload: { lat: 17.4459, lng: 78.3772, speed_kmph: 34 } }),
    concepts: ['list-state', 'event-time', 'watermark', 'out-of-order'],
    modules: ['m08', 'm09', 'm11'],
    why: 'This is where DEFECT-1 (tunnel late ping) lives — the canonical late-event teaching moment.',
  },
  {
    key: 'DRIVER_ARRIVED', label: 'Driver Arrived', icon: '📍', atSec: 182,
    rider: '"Rahul has arrived."',
    driver: 'Taps Arrived; geofence confirms pickup cell.',
    flink: 'Session-window gap on the pre-trip phase closes; pickup wait metric finalized and emitted.',
    event: evt('DRIVER_ARRIVED', 182, { driver_id: RIDE.driver_id }),
    concepts: ['session-window', 'watermark'],
    modules: ['m10', 'm09'],
    why: 'A session window (gap-based) fits an irregular pre-trip phase better than a fixed tumbling window.',
  },
  {
    key: 'RIDE_STARTED', label: 'Ride Started', icon: '🟢', atSec: 240,
    rider: 'Trip begins; fare meter starts.',
    driver: 'Taps Start Trip.',
    flink: 'Opens the per-trip aggregation; checkpointing is active so trip state survives a crash.',
    event: evt('RIDE_STARTED', 240, { driver_id: RIDE.driver_id }),
    concepts: ['window', 'checkpoint', 'state'],
    modules: ['m10', 'm12'],
    why: 'From here state is costly to lose — DEFECT-4 (TaskManager crash) is injected mid-trip to prove recovery.',
  },
  {
    key: 'LOCATION_UPDATED', label: 'Location Updates', icon: '🛰️', atSec: 244,
    rider: 'ETA + route refine on each ping.',
    driver: 'GPS every ~4s for ~22 min (~330 pings).',
    flink: 'Tumbling/sliding windows aggregate distance & avg speed; backpressure appears if the sink slows.',
    event: evt('LOCATION_UPDATED', 244, { s2_cell_id: RIDE.cells.gachibowli, driver_id: RIDE.driver_id, payload: { lat: 17.4401, lng: 78.3489, speed_kmph: 41 } }),
    concepts: ['window', 'aggregate', 'backpressure', 'watermark'],
    modules: ['m10', 'm15', 'm09'],
    why: 'High-volume continuous phase — where DEFECT-3 (idle partition) and DEFECT-6 (hot-key surge) surface.',
  },
  {
    key: 'RIDE_COMPLETED', label: 'Ride Completed', icon: '🏁', atSec: 1562,
    rider: '"You’ve arrived. Fare ₹523.50."',
    driver: 'Taps End Trip.',
    flink: 'Trip window closes; final fare computed and written to the DB/cache sink (end of the event-time window).',
    event: evt('RIDE_COMPLETED', 1562, { s2_cell_id: RIDE.cells.airport_rgia, driver_id: RIDE.driver_id, payload: { distance_km: 19.6, fare_inr: 523.5 } }),
    concepts: ['window-close', 'sink', 'event-time'],
    modules: ['m10', 'm16'],
    why: 'Window firing is driven by the watermark crossing window-end, not by wall-clock — the core event-time payoff.',
  },
  {
    key: 'PAYMENT_COMPLETED', label: 'Payment Completed', icon: '💳', atSec: 1567,
    rider: 'Card charged ₹523.50; receipt emailed.',
    driver: 'Earnings credited.',
    flink: 'Exactly-once sink (Kafka txn / upsert PK) guarantees the charge is written once even if the job replays.',
    event: evt('PAYMENT_COMPLETED', 1567, { driver_id: RIDE.driver_id, payload: { charged_inr: 523.5, payment_id: 'pay_7731ac' } }),
    concepts: ['exactly-once', 'sink', '2pc'],
    modules: ['m14', 'm16'],
    why: 'DEFECT-5 (payment retry) lives here — the canonical duplicate-side-effect / exactly-once moment.',
  },
];

// Ops-plane stages that aren't part of the rider's timeline but act on the job.
export const OPS_STAGES = [
  {
    key: 'JOB_UPGRADE', label: 'Planned Upgrade', icon: '🛠️',
    flink: 'Take a savepoint, stop the job, redeploy new code, restore — trips in flight resume without losing state.',
    concepts: ['savepoint', 'uid', 'rescaling'], modules: ['m13', 'm04'],
    why: 'Savepoint (user-triggered) vs checkpoint (automatic recovery) — DEFECT handling for planned, not failure, events.',
  },
];

// ---------------------------------------------------------------------
// The six embedded real-world defects. Each is anchored to a stage and a
// module and is the concrete fixture a corner-case question is asked about.
// ---------------------------------------------------------------------
export const INCIDENTS = [
  {
    id: 'DEFECT-1', title: 'Tunnel GPS ping arrives late',
    stage: 'DRIVER_ARRIVING', modules: ['m09'], concept: 'late-event',
    story: 'Driver passes under the Durgam Cheruvu cable-bridge underpass. A ping with event_time=+21s is buffered on the phone and is delivered at +34s — after the watermark for +21s has already passed.',
    numbers: { event_time_sec: 21, arrived_sec: 34, watermark_lag_sec: 10 },
    breaks: 'A naive processing-time pipeline would place this ping in the wrong window or drop it, corrupting distance/speed.',
    flink: 'bounded-out-of-orderness (10s) tolerates normal jitter; this 13s-late ping is still caught by allowedLateness (2 min), which re-fires the window.',
  },
  {
    id: 'DEFECT-2', title: 'Ping later than allowed lateness',
    stage: 'DRIVER_ARRIVING', modules: ['m09', 'm10'], concept: 'side-output',
    story: 'A second ping is stuck 3m10s (longer than the 2-min allowedLateness). It can no longer update its window.',
    numbers: { lateness_sec: 190, allowed_lateness_sec: 120 },
    breaks: 'If silently dropped, fare/telemetry is understated with no audit trail.',
    flink: 'sideOutputLateData routes it to a side stream for offline reconciliation — late, but never lost.',
  },
  {
    id: 'DEFECT-3', title: 'Idle Kafka partition stalls the watermark',
    stage: 'LOCATION_UPDATED', modules: ['m09'], concept: 'idleness',
    story: 'At 03:10 a low-traffic city shares the topic; partition 11 emits nothing for 40s while partition 7 (our ride) flows.',
    numbers: { idle_sec: 40, idleness_timeout_sec: 15 },
    breaks: 'The job-wide watermark = min across partitions, so one silent partition freezes ALL windows — nothing fires.',
    flink: 'WatermarkStrategy.withIdleness(15s) marks the quiet partition idle so it stops holding back the global watermark.',
  },
  {
    id: 'DEFECT-4', title: 'TaskManager lost mid-trip',
    stage: 'RIDE_STARTED', modules: ['m12', 'm14'], concept: 'recovery',
    story: 'A spot node running one TaskManager is reclaimed at trip minute 9, taking its subtasks (and in-memory state) with it.',
    numbers: { checkpoint_interval_sec: 60, replayed_sec: 37 },
    breaks: 'Without checkpoints the trip’s accumulated distance/state is gone and billing is wrong.',
    flink: 'Restore from the last completed checkpoint; Kafka source rewinds to checkpointed offsets and replays ~37s of events — exactly-once preserved.',
  },
  {
    id: 'DEFECT-5', title: 'Payment retry after sink failure',
    stage: 'PAYMENT_COMPLETED', modules: ['m14', 'm16'], concept: 'exactly-once',
    story: 'The billing DB times out on the first write; the job restarts from checkpoint and re-emits PAYMENT_COMPLETED for R-4471.',
    numbers: { retries: 1, duplicate_charge_risk_inr: 523.5 },
    breaks: 'At-least-once + a non-idempotent sink = the rider is charged ₹523.50 twice.',
    flink: 'Kafka transactional sink (2-phase commit) OR an upsert sink keyed by ride_id makes the replay overwrite, not duplicate.',
  },
  {
    id: 'DEFECT-6', title: 'Airport cell is a hot key',
    stage: 'LOCATION_UPDATED', modules: ['m05', 'm15'], concept: 'skew',
    story: 'A flight lands; the RGIA airport s2 cell (3fb98e10) suddenly carries 40x the events of any other cell.',
    numbers: { skew_factor: 40, salt_buckets: 32 },
    breaks: 'All airport events hash to one subtask — it backpressures the whole job while others idle.',
    flink: 'Two-phase (local/global) aggregation: salt the hot key across 32 buckets, pre-aggregate, then strip the salt and combine.',
  },
];

// concept id -> which stages/incidents demonstrate it (for the spine + cross-links)
export const CONCEPT_INDEX = {
  'kafka': { stages: ['RIDE_REQUESTED'], module: 'm16' },
  'source': { stages: ['RIDE_REQUESTED'], module: 'm06' },
  'keyby': { stages: ['DRIVER_SEARCHING'], module: 'm07' },
  'keyed-state': { stages: ['DRIVER_ASSIGNED', 'DRIVER_ACCEPTED'], module: 'm11' },
  'event-time': { stages: ['DRIVER_ACCEPTED', 'RIDE_COMPLETED'], module: 'm08' },
  'watermark': { stages: ['DRIVER_ARRIVING', 'LOCATION_UPDATED'], module: 'm09', incidents: ['DEFECT-1', 'DEFECT-3'] },
  'window': { stages: ['RIDE_STARTED', 'LOCATION_UPDATED'], module: 'm10' },
  'session-window': { stages: ['DRIVER_ARRIVED'], module: 'm10' },
  'checkpoint': { stages: ['RIDE_STARTED'], module: 'm12', incidents: ['DEFECT-4'] },
  'savepoint': { stages: ['JOB_UPGRADE'], module: 'm13' },
  'backpressure': { stages: ['LOCATION_UPDATED'], module: 'm15', incidents: ['DEFECT-6'] },
  'parallelism': { stages: ['DRIVER_SEARCHING'], module: 'm05', incidents: ['DEFECT-6'] },
  'exactly-once': { stages: ['PAYMENT_COMPLETED'], module: 'm14', incidents: ['DEFECT-5'] },
  'sink': { stages: ['RIDE_COMPLETED', 'PAYMENT_COMPLETED'], module: 'm16' },
};

export const RIDE_STORY = { RIDE, STAGES, OPS_STAGES, INCIDENTS, CONCEPT_INDEX, BASE_MS };
export default RIDE_STORY;
