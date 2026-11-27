/* content/anti-entropy.js — the "Anti-Entropy" lesson, as DATA. Same shape as
   the other db-scale lessons: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/anti-entropy-scene.js. */

export const antiEntropyLesson = {
  id: 'anti-entropy',
  title: 'Anti-Entropy',
  group: 'Distributed Systems',
  summary: 'A background process that constantly compares replicas and reconciles their differences — so every key converges, not just the ones that happen to get read.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['replicas', 'divergence', 'messages', 'conflicts'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why read-repair alone leaves cold data diverged', step: 0 },
    { text: 'Anti-entropy proactively syncs the whole dataset', step: 1 },
    { text: 'Merkle trees find differences cheaply', step: 2 },
    { text: 'Only the differing keys are shipped', step: 3 },
    { text: 'Background cost buys guaranteed convergence', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Cold data',
      title: 'Read-repair never touches cold data',
      body: [
        `Read-repair is <em>reactive</em>: it fixes a key only when a client reads it and the replicas disagree. That works beautifully for hot keys. But most of a database is <b>cold</b> — rarely or never read.`,
        `A replica that missed a write while it was down can stay <span class="term">diverged</span> for months, because nothing ever reads that key to trigger a repair. The longer it sits, the more a lost replica or a second failure turns stale data into <b>permanent</b> data loss.`,
      ],
      callout: { kind: 'warn', text: 'Read-repair only heals keys that get read. Cold, rarely-read data can stay inconsistent indefinitely — and a later failure can make that divergence permanent.' },
      metrics: { replicas: 3, divergence: 34, messages: 0, conflicts: 6 },
      scene: { view: 'cold', note: 'Hot keys get repaired on read; cold keys drift and stay drifted.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Background sync',
      title: 'Sweep every key in the background',
      body: [
        `<span class="term">Anti-entropy</span> is the <em>proactive</em> counterpart. A background task periodically walks <b>all</b> the data on a pair of replicas, compares it, and reconciles any differences — no client read required.`,
        `Now convergence no longer depends on traffic. Cold keys, hot keys, keys nobody has touched in a year — all of them get checked and healed on a schedule, driving the whole dataset toward a single agreed state.`,
      ],
      callout: { kind: 'insight', text: 'Anti-entropy proactively compares and reconciles entire datasets on a schedule, so every key converges — independent of whether anyone reads it.' },
      changes: ['+ background compare of all keys', '~ convergence no longer needs reads', '− divergence trends to zero'],
      metrics: { replicas: 3, divergence: 12, messages: 40, conflicts: 2 },
      scene: { view: 'sweep', note: 'A background sweep compares the full keyspace across replicas.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Merkle tree',
      title: 'Merkle trees make comparison cheap',
      body: [
        `Comparing two full datasets key-by-key would be ruinously expensive. Instead each replica builds a <span class="term">Merkle tree</span>: leaves hash ranges of keys, and every parent hashes its children. The single <b>root hash</b> summarises the entire dataset.`,
        `Two replicas first exchange just their root hashes. If the roots <b>match</b>, the datasets are identical — one comparison, done. If they differ, the replicas descend only into the child subtrees whose hashes disagree.`,
      ],
      callout: { kind: 'insight', text: 'A Merkle tree hashes the data into a tree. Equal roots mean equal data; unequal roots let replicas walk down only the branches that actually differ.' },
      metrics: { replicas: 3, divergence: 12, messages: 8, conflicts: 2 },
      scene: { view: 'merkle', note: 'Root hashes differ → descend only into the subtree that mismatches.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Ship the diff',
      title: 'Transfer only the keys that differ',
      body: [
        `Descending the tree isolates the mismatch to a handful of leaf ranges. Only the keys under those leaves are actually exchanged and reconciled — typically with the same last-writer-wins or version rules used elsewhere.`,
        `So comparing a terabyte that is <b>99% identical</b> costs a few hash exchanges plus the transfer of the tiny differing slice. The bandwidth is proportional to how much has <em>changed</em>, not to how much data exists.`,
      ],
      callout: { kind: 'tip', text: 'Only the keys beneath mismatching leaves are shipped. Sync cost scales with the amount of divergence, not the total dataset size.' },
      changes: ['+ walk down to mismatching leaves', '+ ship only the differing keys', '✓ replicas now identical'],
      metrics: { replicas: 3, divergence: 0, messages: 14, conflicts: 0 },
      scene: { view: 'diff', note: 'Only the differing leaf range crosses the wire; replicas converge.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Cost vs safety',
      title: 'Steady background cost, guaranteed convergence',
      body: [
        `Anti-entropy is not free: building Merkle trees burns CPU, and the sweeps use network and disk bandwidth continuously in the background, competing with live traffic. Run it too aggressively and it steals capacity from real work.`,
        `But the payoff is a <b>guarantee</b> that read-repair cannot give: every key converges within one sweep interval, whether or not it is ever read. Real systems <span class="term">combine</span> both — read-repair for instant healing of hot keys, anti-entropy for complete coverage of everything else.`,
      ],
      callout: { kind: 'warn', text: 'The background sweeps cost CPU and bandwidth. You spend steady resources to buy a hard guarantee: the whole dataset converges within a bounded interval.' },
      metrics: { replicas: 3, divergence: 2, messages: 30, conflicts: 0 },
      scene: { view: 'tradeoff', note: 'Pay steady background cost; get bounded, dataset-wide convergence.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Reactive repair plus proactive sweep',
      body: [
        `Two mechanisms, one goal. <b>Read-repair</b> is reactive and rides the read path — instant, but only for keys that get read. <b>Anti-entropy</b> is proactive and runs in the background — slower, but covers every key, cold ones included.`,
        `Merkle trees are what make the proactive sweep affordable, turning a whole-dataset comparison into a cheap tree walk. Together they let an eventually-consistent store promise that divergence is always <em>temporary</em>.`,
      ],
      callout: { kind: 'insight', text: 'Read-repair heals on the read path; anti-entropy sweeps everything in the background via Merkle trees. Together they bound divergence for the entire dataset.' },
      metrics: { replicas: 3, divergence: 0, messages: 10, conflicts: 0 },
      scene: { view: 'recap', note: 'Reactive + proactive → every key converges, hot or cold.' },
    },
  ],
};
