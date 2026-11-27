/* content/network-communication.js — "Network Communication" lesson, as DATA.
   Same shape as content/dbms.js. `scene` is a view-snapshot consumed by
   db/network-communication-scene.js. */

export const networkCommunicationLesson = {
  id: 'network-communication',
  title: 'Network Communication',
  group: 'Distributed Systems',
  summary: 'Once a database spans more than one machine, its parts can cooperate only by sending messages over a network that loses, delays, duplicates and reorders them — and never tells you which.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['messages', 'rtt', 'latency', 'throughput'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why an in-process call is instant, reliable and ordered', step: 0 },
    { text: 'How a remote call becomes a message + a wait (RPC)', step: 1 },
    { text: 'The network loses, delays, duplicates and reorders messages', step: 2 },
    { text: 'A timeout cannot tell "lost" from "slow"', step: 3 },
    { text: 'Why retries demand idempotency', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM (baseline)
      chapter: 'problem', short: 'Shared memory',
      title: 'In one process, a call is free',
      body: [
        `When two components live in the <em>same</em> process, one calling the other is just a jump: the caller pushes arguments, the callee runs, a value comes back. It is <b>instant</b>, it is <b>reliable</b> — it cannot half-happen — and calls are <b>ordered</b>, one strictly after another.`,
        `This is the comfortable world a single-node database lives in. Everything that follows is about what breaks the moment that call has to cross a wire.`,
      ],
      callout: { kind: 'insight', text: 'A local function call shares one address space and one clock. It never gets lost, never arrives twice, never arrives out of order. Hold onto that — you are about to lose all three.' },
      metrics: { messages: 0, rtt: 0, latency: 0, throughput: 9000 },
      scene: { view: 'shared', note: 'One process: a call is a jump in shared memory — nothing can go wrong.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'RPC',
      title: 'Across machines, a call is a message',
      body: [
        `Put the callee on another machine and that convenient call becomes a <span class="term">remote procedure call</span>. The arguments are <b>serialized</b> into bytes, pushed through the operating system onto the network, carried to the other node, decoded, executed — and a reply makes the whole trip back.`,
        `RPC frameworks dress this up to <em>look</em> like a local call, but underneath it is two messages and a wait. That disguise is convenient and dangerous: the failure modes are nothing like a local call's.`,
      ],
      callout: { kind: 'tip', text: 'A remote call = a request message out, a reply message back, and a round-trip you pay for every time. Latency is now measured in network hops, not CPU cycles.' },
      changes: ['+ serialize args → bytes', '+ request & reply over the network', '~ a round-trip to wait on'],
      metrics: { messages: 2, rtt: 4, latency: 4, throughput: 1200 },
      scene: { view: 'rpc', note: 'A call becomes a request message out and a reply back — bytes on a wire.' },
    },
    { // 2 — PROBLEM
      chapter: 'problem', short: 'Unreliable',
      title: 'The network is not a wire',
      body: [
        `A real network is a best-effort courier, not a reliable pipe. A message can be <b>lost</b> outright, <b>delayed</b> for seconds, <b>duplicated</b> when a lower layer retransmits, or <b>reordered</b> so a later message arrives first.`,
        `None of these are rare edge cases — at scale they happen constantly. Any two nodes that talk must assume every message might vanish, double, or show up in the wrong order.`,
      ],
      callout: { kind: 'warn', text: 'Loss, delay, duplication and reordering are the normal behaviour of a network, not a malfunction. Protocols that ignore them are simply broken protocols.' },
      changes: ['− messages dropped', '~ messages delayed & reordered', '+ duplicates from retransmits'],
      metrics: { messages: 7, rtt: 9, latency: 60, throughput: 900 },
      scene: { view: 'unreliable', note: 'Lost, delayed, duplicated, reordered — the network does all four, routinely.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Timeout',
      title: 'Lost, or just slow? You can’t tell',
      body: [
        `Node A sends a request and no reply comes. Did the request get lost? Did it arrive but the reply got lost? Is B merely slow, and the answer still on its way? From A's side these are <em>indistinguishable</em> — the only signal A has is silence.`,
        `So A sets a <span class="term">timeout</span>: wait this long, then assume failure. But a timeout is a guess. Too short and you give up on healthy-but-slow nodes; too long and you hang. Either way you never actually learn what happened.`,
      ],
      callout: { kind: 'warn', text: 'A timeout converts "I don’t know" into "I’ll assume failure." It is a decision made without information — the deepest difficulty in all of distributed systems.' },
      changes: ['? request lost — or reply lost?', '+ timeout = a bounded guess', '~ act without ever knowing'],
      metrics: { messages: 9, rtt: 250, latency: 250, throughput: 400 },
      scene: { view: 'timeout', note: 'No reply. Lost or slow? A timeout is a guess, not an answer.' },
    },
    { // 4 — HOW IT WORKS
      chapter: 'technique', short: 'Idempotency',
      title: 'Retries demand idempotency',
      body: [
        `If a timeout means "maybe it failed," the natural fix is to <b>retry</b>. But the first message might have actually succeeded — so a blind retry can run the operation <em>twice</em> (charge the card twice, insert the row twice).`,
        `The cure is <span class="term">idempotency</span>: design the operation so doing it again is harmless, usually by tagging each request with a unique key the receiver remembers. A duplicate — whether from your retry or the network's own — is recognized and ignored.`,
      ],
      callout: { kind: 'insight', text: 'Timeouts force retries; retries create duplicates; idempotency makes duplicates safe. The three are a package — you cannot adopt one without the others.' },
      changes: ['+ retry on timeout', '+ unique request key', '~ receiver dedups → apply once'],
      metrics: { messages: 11, rtt: 8, latency: 12, throughput: 1100 },
      scene: { view: 'idempotent', note: 'Same request, retried; the receiver keys on id and applies it exactly once.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Assume the worst of the wire',
      body: [
        `Remote communication is nothing like a local call. It is <b>asynchronous</b> message passing over a network that will lose, delay, duplicate and reorder — and leave you unable to tell failure from slowness.`,
        `The survival kit is small and always the same: bound every wait with a <b>timeout</b>, <b>retry</b> what times out, and make every operation <b>idempotent</b> so retries and duplicates do no harm. Every protocol in this section is built on these assumptions.`,
      ],
      callout: { kind: 'tip', text: 'Timeout · retry · idempotency. Three habits that turn an unreliable, asynchronous network into something you can actually build a database on.' },
      metrics: { messages: 12, rtt: 6, latency: 10, throughput: 1400 },
      scene: { view: 'recap', note: 'Unreliable network + timeouts + retries + idempotency = a foundation you can trust.' },
    },
  ],
};
