/* content/partial-failure.js — the "Partial Failure" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/partial-failure-scene.js. */

export const partialFailureLesson = {
  id: 'partial-failure',
  title: 'Partial Failure',
  group: 'Distributed Systems',
  summary: 'The defining difficulty of distributed systems: some parts fail while others keep running — and you often cannot even tell which.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['nodes2', 'availability', 'suspected', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'A single machine fails all-or-nothing', step: 0 },
    { text: 'A cluster fails in pieces — no global on/off', step: 1 },
    { text: 'You often cannot tell crashed from slow from unreachable', step: 2 },
    { text: 'One stuck node can cascade across healthy ones', step: 3 },
    { text: 'Contain it: timeouts, retries, bulkheads, redundancy', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'All or nothing',
      title: 'One machine fails all at once',
      body: [
        `On a single machine, failure is <b>binary</b>. The process is up and serving, or it has crashed and everything stops together. Your code never has to reason about being <em>half</em> alive.`,
        `That simplicity is a luxury you lose the moment the system spans more than one box. There is no single switch that is either on or off any more.`,
      ],
      callout: { kind: 'insight', text: 'A single node has exactly two states your code sees: working, or crashed. Nothing in between.' },
      metrics: { nodes2: 1, availability: 100, suspected: 0, latency: 8 },
      scene: { view: 'single', note: 'One node: it works, or it stops — nothing in between.' },
    },
    { // 1 — PROBLEM
      chapter: 'problem', short: 'Half working',
      title: 'A cluster fails in pieces',
      body: [
        `Now spread the work across five nodes. One of them dies — but the other four keep serving. The system as a whole is neither up nor down; it is <span class="term">partly working</span>.`,
        `There is no global on/off switch to read. "Is the database up?" no longer has a yes-or-no answer — it depends which node, which shard, which replica, and when you asked.`,
      ],
      callout: { kind: 'warn', text: 'Across many nodes, "up" and "down" stop being global. The system is almost always partly broken somewhere.' },
      changes: ['~ node 3 down', '+ nodes 1,2,4,5 still serving', '~ no global state'],
      metrics: { nodes2: 5, availability: 80, suspected: 1, latency: 11 },
      scene: { view: 'partial', note: 'Four nodes serve while one is down — the system is partly up.' },
    },
    { // 2 — PROBLEM
      chapter: 'problem', short: 'Gray zone',
      title: 'You cannot tell why it went quiet',
      body: [
        `A node stops answering. Did it <b>crash</b>? Is it merely <b>slow</b> under load? Or did the <b>network</b> swallow your request and its reply? From where you stand, all three look identical: silence.`,
        `This ambiguity is the heart of the problem. You cannot directly observe another machine's state — you can only send a message and wait, and waiting forever is not an option.`,
      ],
      callout: { kind: 'warn', text: 'Crashed, slow, and unreachable are indistinguishable from the outside. All you ever see is the absence of a reply.' },
      metrics: { nodes2: 5, availability: 80, suspected: 1, latency: 500 },
      scene: { view: 'unknown', note: 'Crashed? Slow? Unreachable? From outside, they look the same.' },
    },
    { // 3 — HOW IT GOES WRONG
      chapter: 'technique', short: 'Blast radius',
      title: 'One slow node drags the rest down',
      body: [
        `Partial failure does not stay contained on its own. A single stuck node holds its callers' threads and connections open while they wait. Those callers run out of capacity, start queuing, and <span class="term">their</span> callers block in turn.`,
        `A failure that touched one node spreads outward until healthy machines fall over too — a cascading failure born from one slow dependency.`,
      ],
      callout: { kind: 'warn', text: 'Unbounded waiting turns a local failure into a global one: blocked callers pile up and the blast radius grows.' },
      changes: ['~ node 3 stuck', '- callers block on it', '- threads/connections exhausted'],
      metrics: { nodes2: 5, availability: 35, suspected: 1, latency: 900 },
      scene: { view: 'blast', note: 'Callers block on the stuck node; the failure cascades outward.' },
    },
    { // 4 — SOLUTION
      chapter: 'solution', short: 'Design for it',
      title: 'Contain the failure',
      body: [
        `You cannot prevent partial failure, so you <b>bound</b> it. Every call gets a <span class="term">timeout</span>, so no caller waits forever. Retries (made <b>idempotent</b>) ride out blips. <span class="term">Bulkheads</span> isolate resources so one dependency can't drain them all, and a <span class="term">circuit breaker</span> trips to stop hammering a node that is clearly down.`,
        `With the bad node walled off and traffic failed over to replicas, the healthy majority keeps serving.`,
      ],
      callout: { kind: 'tip', text: 'Timeouts + retries + bulkheads + circuit breakers + redundancy turn "a node is down" into a non-event for everyone else.' },
      changes: ['+ timeout on every call', '+ bulkhead isolates node 3', '+ circuit breaker trips', '+ failover to replicas'],
      metrics: { nodes2: 5, availability: 96, suspected: 1, latency: 14 },
      scene: { view: 'design', note: 'A circuit breaker walls off the bad node; the rest stay healthy.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Assume any piece can be gone',
      body: [
        `Partial failure is not an edge case in a distributed system — it is the normal condition. At any moment some subset of nodes is down, slow, or unreachable, and you usually can't tell which.`,
        `So design every remote call as if the thing on the other end might never answer: bound the wait, isolate the blast radius, and keep a redundant copy ready to take over.`,
      ],
      callout: { kind: 'insight', text: 'Single machine → fails totally. Distributed system → fails partially, ambiguously, always. Build for it on every call.' },
      metrics: { nodes2: 5, availability: 96, suspected: 0, latency: 12 },
      scene: { view: 'recap', note: 'Expect partial failure everywhere — and make it survivable.' },
    },
  ],
};
