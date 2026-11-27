/* content/failure-detection.js — the "Failure Detection" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/failure-detection-scene.js. Rendered through the shared course shell. */

export const failureDetectionLesson = {
  id: 'failure-detection',
  title: 'Failure Detection',
  group: 'Distributed Systems',
  summary: 'How one node decides another is dead — when a crash, a slow machine and a dropped network all look exactly the same from the outside. You can only ever suspect.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['nodes2', 'suspected', 'rtt', 'availability'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why crashed, slow and partitioned are indistinguishable', step: 0 },
    { text: 'The timeout detector — probe, wait T, suspect', step: 1 },
    { text: 'Accrual (φ) detectors output a suspicion level, not a verdict', step: 2 },
    { text: 'Too-tight timeouts evict healthy nodes and cause flapping', step: 3 },
    { text: 'The completeness-vs-accuracy trade you can never escape', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: "Can't be sure",
      title: 'Silence tells you nothing',
      body: [
        `Node A sends a request to node B and hears… nothing. What happened? Maybe B <b>crashed</b>. Maybe B is <b>alive but slow</b> — swamped, paging, mid-GC. Maybe B is fine and the <b>network dropped</b> the message. From A's side these are <em>identical</em>.`,
        `This is the defining problem of distributed systems: on an asynchronous network, <span class="term">you cannot tell a dead node from a slow one</span>. Every "failure detector" is really just a guess dressed up with a timer.`,
      ],
      callout: { kind: 'warn', text: 'A missing reply has at least three causes — crash, slowness, lost packet — and no amount of waiting can prove which. Detection is inference, never fact.' },
      metrics: { nodes2: 5, suspected: 0, rtt: 40, availability: 100 },
      scene: { view: 'problem', note: 'One silent node — three explanations, none provable.' },
    },
    { // 1 — TECHNIQUE
      chapter: 'technique', short: 'Timeout',
      title: 'The timeout detector',
      body: [
        `The simplest detector: probe node B and start a clock. If no reply arrives within a timeout <b>T</b>, mark B as <span class="term">suspected</span>. That's it — the whole mechanism is "waited too long, assume dead."`,
        `T is the only knob, and it is a bet about the network. Pick it too long and you're slow to react to real crashes; pick it too short and you'll accuse healthy nodes. Everything about failure detection flows from this one choice.`,
      ],
      callout: { kind: 'insight', text: 'A timeout converts "no response yet" into a binary verdict. The timeout value T is a wager on the slowest tolerable round-trip.' },
      changes: ['+ probe every node', '~ wait up to T', '+ no reply → SUSPECT'],
      metrics: { nodes2: 5, suspected: 1, rtt: 40, availability: 100 },
      scene: { view: 'timeout', note: 'Probe sent, clock runs to T, then B is suspected.' },
    },
    { // 2 — TECHNIQUE
      chapter: 'technique', short: 'Accrual (φ)',
      title: 'Suspicion, not a verdict',
      body: [
        `A hard yes/no throws away information. <span class="term">Accrual</span> detectors (the φ, or "phi", detector) instead track the <b>history</b> of reply times and output a continuously rising <b>suspicion level</b> — how surprising this silence is, given how B normally behaves.`,
        `Each component then picks its own threshold on φ: a cache might act at low suspicion, a leader election at high. One detector, many risk appetites — and the timeout adapts to the network instead of being hard-coded.`,
      ],
      callout: { kind: 'tip', text: 'φ accrual outputs a number that grows with silence, scaled by observed variance. Consumers choose a threshold instead of inheriting one fixed timeout.' },
      changes: ['+ record reply-time history', '~ output φ suspicion level', '+ per-consumer threshold'],
      metrics: { nodes2: 5, suspected: 1, rtt: 55, availability: 100 },
      scene: { view: 'phi', note: 'History feeds a suspicion gauge that climbs with silence.' },
    },
    { // 3 — PROBLEM
      chapter: 'problem', short: 'False positives',
      title: 'Too tight, and healthy nodes get evicted',
      body: [
        `Crank T down to react faster and the detector starts crying wolf. A node that is merely <b>slow for a moment</b> — a GC pause, a traffic spike — misses one probe and gets declared dead, its work reassigned.`,
        `Then it answers the next probe, rejoins, slows again, and gets evicted again: <span class="term">flapping</span>. The churn of failover and recovery can cost more than the original hiccup — a false positive is not free.`,
      ],
      callout: { kind: 'warn', text: 'An over-eager detector evicts live nodes, triggering needless failovers and flapping. The cure (short T) becomes worse than the disease.' },
      changes: ['- T set too low', '~ slow node wrongly evicted', '- flapping / rejoin thrash'],
      metrics: { nodes2: 5, suspected: 2, rtt: 120, availability: 82 },
      scene: { view: 'falsepos', note: 'A healthy-but-slow node is wrongly declared dead — then bounces.' },
    },
    { // 4 — TRADEOFF
      chapter: 'tradeoff', short: 'The trade',
      title: 'Completeness vs accuracy',
      body: [
        `Every detector lives on one axis. <b>Completeness</b>: does it eventually suspect <em>every</em> node that really failed? <b>Accuracy</b>: does it <em>never</em> suspect a node that is actually alive?`,
        `On an asynchronous network you cannot have both perfectly — fast, complete detection means occasional false accusations; perfect accuracy means waiting so long you miss real failures. You tune T (or the φ threshold) to sit where your system can tolerate the error.`,
      ],
      callout: { kind: 'insight', text: 'Completeness (catch every real failure) and accuracy (never accuse a live node) pull in opposite directions. The timeout is where you choose your mistake.' },
      metrics: { nodes2: 5, suspected: 1, rtt: 60, availability: 96 },
      scene: { view: 'tradeoff', note: 'Catch every failure fast, or never accuse the living — pick.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Detection is disciplined guessing',
      body: [
        `A failure detector never <em>knows</em> — it <b>suspects</b>, on the evidence of silence. A timeout turns waiting into a verdict; accrual turns it into a tunable suspicion level; and the threshold you choose trades fast detection against false alarms.`,
        `Perfect detection is impossible on an asynchronous network, so every real system picks a point on the completeness-accuracy curve and designs the rest — heartbeats, elections, failover — to tolerate being wrong sometimes.`,
      ],
      callout: { kind: 'insight', text: 'Suspect, never know · timeout → verdict · φ → tunable suspicion · completeness ⟷ accuracy. Build the system to survive a detector that is sometimes wrong.' },
      metrics: { nodes2: 5, suspected: 1, rtt: 50, availability: 99 },
      scene: { view: 'recap', note: 'A detector that only suspects — tuned, and tolerated.' },
    },
  ],
};
