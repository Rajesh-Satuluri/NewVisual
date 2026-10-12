// Module 13b — Savepoints
// A dedicated module for savepoints: the user-triggered, portable, canonical
// snapshots Flink uses for PLANNED operations (upgrades, rescaling, migration,
// A/B, Flink version bumps) — as opposed to checkpoints, which are automatic
// and exist for unplanned failure recovery. Anchored to ride R-4471's planned
// fraud-model upgrade (JOB_UPGRADE stage).
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { rideSpine, initRideSpine, rideCallout } from '../components/story-ui.js';

const IQS = [
  {
    q: 'What is the difference between a savepoint and a checkpoint in Flink?',
    a: `Both are consistent snapshots of job state, but they serve opposite purposes and are owned differently.<br><br>
    <strong>Checkpoints</strong> are <em>automatic</em>, triggered by Flink on an interval, owned by Flink, and exist for <strong>unplanned failure recovery</strong>. They are optimized for frequent, low-overhead writes — they may be incremental (RocksDB) and use a Flink-internal format that is not guaranteed to be portable across versions. Flink deletes old checkpoints automatically.<br><br>
    <strong>Savepoints</strong> are <em>manually</em> triggered by the user (or a scheduler), owned by the user, and exist for <strong>planned operations</strong> — upgrading job code, changing parallelism, migrating state, or upgrading Flink itself. They are always written in a canonical, self-contained format and are never auto-deleted. A savepoint is a full snapshot, so it is heavier to take but safe to carry across job versions.`,
    tip: 'One-line summary that lands: "Checkpoints are for failures Flink didn\'t plan; savepoints are for changes you did plan."',
  },
  {
    q: 'How do you upgrade a running Flink job without losing state or data?',
    a: `Use <strong>stop-with-savepoint</strong>, then resume from that savepoint with the new code:<br><br>
    1. <code>flink stop --savepointPath s3://.../savepoints &lt;jobId&gt;</code> — this drains in-flight records, takes one final savepoint, and stops the job cleanly. Sources commit their offsets so no event is reprocessed or lost.<br>
    2. Deploy the new JAR / PyFlink job.<br>
    3. <code>flink run -s s3://.../savepoints/savepoint-abc &lt;new-job&gt;</code> — the new job restores every operator's state from the savepoint and continues exactly where the old one stopped.<br><br>
    Because the sources' Kafka offsets are part of the savepoint, the new job resumes from the exact committed offset — exactly-once is preserved across the upgrade. At Uber, this is how a new fraud-detection model is rolled out mid-stream without dropping a single GPS event.`,
    tip: 'Emphasize that stop-with-savepoint DRAINS first — it is the clean shutdown, not a crash. That is why there is no replay.',
  },
  {
    q: 'Why are operator UIDs critical for savepoint restore?',
    a: `When Flink restores a savepoint, it matches each chunk of saved state to an operator by that operator's <strong>UID</strong> (a stable, user-assigned identifier via <code>.uid("fraud-detector")</code>). If you do not set UIDs, Flink auto-generates them from the job topology — so <em>any</em> change to the graph (adding an operator, reordering, even some refactors) changes the auto-IDs, and the restore fails with "cannot map state" or silently drops state.<br><br>
    <strong>Rule:</strong> assign an explicit, stable <code>.uid()</code> to every stateful operator from day one. Then you can freely change surrounding code and still restore. If you need to remove an operator whose state no longer exists in the new job, restore with <code>--allowNonRestoredState</code> so Flink skips the orphaned state instead of failing.`,
    tip: 'Mentioning allowNonRestoredState unprompted signals you have actually done production upgrades.',
  },
  {
    q: 'How do you rescale a Flink job (change parallelism) using a savepoint?',
    a: `You cannot change the parallelism of a running job in place — you take a savepoint and restore at the new parallelism:<br><br>
    1. <code>flink stop --savepointPath ... &lt;jobId&gt;</code><br>
    2. <code>flink run -p 512 -s &lt;savepoint&gt; &lt;job&gt;</code> (was 256, now 512).<br><br>
    Flink redistributes keyed state across the new subtasks using <strong>key groups</strong> — state is pre-partitioned into a fixed number of key groups (<code>maxParallelism</code>, default 128) at job creation, and each subtask owns a contiguous range of key groups. Rescaling just reassigns key-group ranges to the new subtask count. <strong>Critical constraint:</strong> you can only rescale up to <code>maxParallelism</code>, and <code>maxParallelism</code> cannot be changed after the first run — so set it deliberately (e.g. 1024) up front. Uber sizes maxParallelism for the Friday-night peak so they can scale out without a state migration.`,
    tip: 'The phrase "key groups" is the keyword interviewers listen for here — it is the mechanism that makes rescaling possible at all.',
  },
  {
    q: 'Can you restore a savepoint after changing the state schema (e.g. adding a field)?',
    a: `Yes, via <strong>state schema evolution</strong>, with limits that depend on the serializer. If your state uses Avro or POJO serializers, Flink supports compatible changes: <strong>adding or removing fields</strong>, and some type widenings. On restore, Flink detects the schema change and migrates each record to the new schema lazily as it is read.<br><br>
    What is <em>not</em> supported: changing a field's type incompatibly (e.g. <code>String</code> → <code>int</code>), changing the key type, or changing the serializer family (Kryo state generally cannot evolve — avoid Kryo for long-lived state). If an incompatible change is unavoidable, the pattern is a <strong>state migration job</strong>: read the old savepoint with the State Processor API, transform the state, and write a new savepoint the upgraded job can restore.`,
    tip: 'Name the State Processor API as the escape hatch for incompatible migrations — it shows you know there is a path even when auto-evolution fails.',
  },
  {
    q: 'What happens if the new job\'s topology differs from the savepoint — will it still restore?',
    a: `It depends on what changed, and UIDs decide it:<br><br>
    • <strong>Stateless changes around stateful operators</strong> (adding a map/filter, changing business logic that does not touch state) — restore works fine as long as stateful operators keep their UIDs.<br>
    • <strong>Removing a stateful operator</strong> — its saved state has nowhere to go; restore fails unless you pass <code>--allowNonRestoredState</code> to discard it.<br>
    • <strong>Adding a new stateful operator</strong> — fine; it simply starts with empty state.<br>
    • <strong>Changing an operator's UID or its max parallelism</strong> — breaks the mapping; restore fails.<br><br>
    The mental model: a savepoint is a map from <code>UID → state</code>. Restore succeeds when every piece of saved state finds its operator, and every operator that needs state finds it (or starts empty).`,
    tip: 'Framing it as "a map from UID to state" gives a crisp, memorable answer to an open-ended question.',
  },
];

const SP_VS_CP = [
  ['Trigger', 'Automatic, on an interval', 'Manual (user / scheduler)'],
  ['Purpose', 'Unplanned failure recovery', 'Planned ops: upgrade, rescale, migrate'],
  ['Owned by', 'Flink (auto-deleted)', 'User (retained until deleted)'],
  ['Format', 'Internal; may be incremental', 'Canonical, self-contained, portable'],
  ['Cost', 'Cheap, frequent', 'Heavier, infrequent'],
  ['Portable across job versions?', 'Not guaranteed', 'Yes — that is the point'],
];

const WHY = `
  <div class="sm-def card">
    <div class="sm-def-ic">💾</div>
    <div>
      <div class="sm-def-eyebrow">What is a savepoint?</div>
      <p class="sm-def-lead">A <b>savepoint</b> is a <b>manually-triggered, durable, self-contained snapshot</b> of a job's entire state, written in a canonical format so it can be carried across <em>code changes, parallelism changes, and even Flink version upgrades</em>. Where a <b>checkpoint</b> is Flink's automatic safety net for crashes, a savepoint is <b>your</b> tool for planned change. On ride <b>R-4471</b>, it's how the fraud model is upgraded mid-stream without dropping a single GPS event.</p>
    </div>
  </div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">Savepoint vs. Checkpoint</div>
    <div class="section-desc">Same mechanism (a consistent snapshot), opposite jobs.</div>
  </div>
  <div class="code-block" style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:0.92rem">
      <thead><tr>
        <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border)"></th>
        <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);color:var(--text-secondary)">Checkpoint</th>
        <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);color:#10b981;font-weight:700">Savepoint</th>
      </tr></thead>
      <tbody>
        ${SP_VS_CP.map(([k, cp, sp]) => `
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid var(--border);font-weight:600">${k}</td>
            <td style="padding:8px 10px;border-bottom:1px solid var(--border);color:var(--text-secondary)">${cp}</td>
            <td style="padding:8px 10px;border-bottom:1px solid var(--border)">${sp}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">What savepoints let you do</div>
    <div class="section-desc">Every planned change to a long-running job routes through one.</div>
  </div>
  <div class="sm-why-grid">
    ${[
      ['🚀', 'Upgrade code', 'Deploy a new fraud model / bugfix without losing per-driver state — stop-with-savepoint, then resume on the new JAR.'],
      ['📈', 'Rescale', 'Change parallelism (256 → 512 for peak) by restoring at a new -p; key groups redistribute the state.'],
      ['🧬', 'Evolve schema', 'Add or remove state fields (Avro/POJO) and Flink migrates records lazily on restore.'],
      ['⬆️', 'Upgrade Flink', 'The canonical format lets a savepoint taken on one Flink version restore on the next.'],
      ['🔬', 'A/B & rollback', 'Fork two jobs from one savepoint, or roll back to a known-good snapshot if a release misbehaves.'],
      ['🧪', 'Debug / clone', 'Spin up a copy of production state in staging from a retained savepoint.'],
    ].map(([icon, title, body]) => `
      <div class="sm-why">
        <div class="sm-why-ic">${icon}</div>
        <div class="sm-why-title">${title}</div>
        <p>${body}</p>
      </div>`).join('')}
  </div>

  <div class="sm-def card" style="margin:22px 0 6px;border-left:3px solid #FF6B35">
    <div class="sm-def-ic">🧭</div>
    <div>
      <div class="sm-def-eyebrow">Related modules</div>
      <p class="sm-def-lead" style="font-size:0.95rem">Savepoints build on the snapshot machinery of <a href="#m12" style="color:#FF6B35;font-weight:600">Module 12 — Checkpointing</a> and are the planned-change counterpart to <a href="#m13" style="color:#FF6B35;font-weight:600">Module 13 — Fault Tolerance</a>. State internals live in <a href="#m11" style="color:#FF6B35;font-weight:600">Module 11 — State Management</a>.</p>
    </div>
  </div>
`;

const LIFECYCLE = `
  <div class="section-header" style="margin:4px 0 12px">
    <div class="section-title">The upgrade timeline — ride R-4471</div>
    <div class="section-desc">Rolling out a new fraud model without dropping an event.</div>
  </div>
  <div class="sm-keyed card">
    <ul>
      <li><b>1 · Trigger</b> — <code>flink stop --savepointPath s3://uber-flink/savepoints &lt;jobId&gt;</code> drains in-flight records and takes one final savepoint.</li>
      <li><b>2 · Commit</b> — sources commit Kafka offsets into the savepoint; sinks finalize open transactions. The job stops <em>clean</em>, not crashed.</li>
      <li><b>3 · Deploy</b> — ship the new JAR / PyFlink job with the updated fraud model (stateful operators keep their <code>.uid()</code>s).</li>
      <li><b>4 · Resume</b> — <code>flink run -s s3://.../savepoint-abc123 &lt;new-job&gt;</code> restores every operator's keyed state and continues from the committed offset.</li>
      <li><b>5 · Verify</b> — the new model scores events using the <em>same</em> per-driver history that existed a moment before the upgrade.</li>
    </ul>
    <div class="sm-keyed-flow">
      <b>running</b> <span class="sm-arrow">→</span> stop-with-savepoint <span class="sm-arrow">→</span> <code>drain + snapshot + commit offsets</code> <span class="sm-arrow">→</span> deploy new code <span class="sm-arrow">→</span> <b>run -s</b> <span class="sm-arrow">→</span> running (state intact)
    </div>
  </div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">The three things that break a restore</div>
    <div class="section-desc">And the flag or practice that fixes each.</div>
  </div>
  <div class="sm-why-grid">
    ${[
      ['🆔', 'Missing / changed UID', 'Without a stable <code>.uid()</code>, auto-generated IDs shift when the graph changes and state cannot be mapped. Assign explicit UIDs to every stateful operator.'],
      ['🗑️', 'Removed stateful operator', 'Its saved state has no home → restore fails. Pass <code>--allowNonRestoredState</code> to discard the orphaned state intentionally.'],
      ['📐', 'maxParallelism changed', 'Key groups are fixed at first run; you can rescale only up to maxParallelism and never change it afterward. Set it high (e.g. 1024) up front.'],
    ].map(([icon, title, body]) => `
      <div class="sm-why">
        <div class="sm-why-ic">${icon}</div>
        <div class="sm-why-title">${title}</div>
        <p>${body}</p>
      </div>`).join('')}
  </div>
`;

const CODE = `
  <div class="section-header" style="margin:4px 0 12px">
    <div class="section-title">Savepoint operations — CLI</div>
    <div class="section-desc">The commands you actually run in production.</div>
  </div>

  <div class="code-block fs-11"><span class="lang-tag">take a savepoint (job keeps running)</span><pre>flink savepoint &lt;jobId&gt; s3://uber-flink/savepoints</pre></div>

  <div class="code-block fs-11"><span class="lang-tag">stop-with-savepoint (clean shutdown + final snapshot)</span><pre>flink stop \\
  --savepointPath s3://uber-flink/savepoints \\
  &lt;jobId&gt;</pre></div>

  <div class="code-block fs-11"><span class="lang-tag">resume a new job from a savepoint</span><pre>flink run \\
  -s s3://uber-flink/savepoints/savepoint-abc123-7f0e2a \\
  -p 512 \\
  fraud-job-v2.jar</pre></div>

  <div class="code-block fs-11"><span class="lang-tag">resume, discarding state of removed operators</span><pre>flink run \\
  -s s3://uber-flink/savepoints/savepoint-abc123-7f0e2a \\
  --allowNonRestoredState \\
  fraud-job-v2.jar</pre></div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">Make your job savepoint-safe</div>
    <div class="section-desc">Stable UIDs are the single most important habit.</div>
  </div>
  <div class="code-block fs-11"><span class="lang-tag">PyFlink — assign stable UIDs to stateful operators</span><pre>events = env.from_source(kafka_source, wm, "gps-source") \\
    .uid("gps-source")

alerts = (events
    .key_by(lambda e: e.driver_id)
    .process(FraudDetector())
    .uid("fraud-detector")        # survives code changes
    .name("fraud-detector"))

alerts.sink_to(kafka_sink).uid("alerts-sink")

# Set maxParallelism deliberately so you can rescale later:
env.set_max_parallelism(1024)</pre></div>
`;

export function mount(container) {
  container.innerHTML = rideSpine({ active: ['JOB_UPGRADE'] }) + createModuleShell({
    tag: '13b · State & Fault · Uber Edition',
    title: 'Savepoints',
    subtitle: 'The user-triggered, portable snapshots behind every planned change — upgrading code, rescaling, migrating state, and bumping Flink versions without losing a single event.',
    tabs: [
      { id: 'why',       label: '📖 What & Why',   content: WHY },
      { id: 'lifecycle', label: '🛠️ Upgrade Flow', content: '' },
      { id: 'code',      label: '💻 CLI & Code',   content: CODE },
      { id: 'iq',        label: '🎤 Interview Q&A', content: createIQSection(IQS) },
    ],
  });

  initTabs(container);
  initRideSpine(container);
  container.querySelector('#tab-lifecycle').innerHTML =
    rideCallout('JOB_UPGRADE', { openEvent: false }) + LIFECYCLE;
  initIQ(container);
  return () => {};
}
