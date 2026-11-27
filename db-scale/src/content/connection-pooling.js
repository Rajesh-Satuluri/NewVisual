/* content/connection-pooling.js — the "Connection Pooling" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/connection-pooling-scene.js. Closes out the Storage Engine section. */

export const connectionPoolingLesson = {
  id: 'connection-pooling',
  title: 'Connection Pooling',
  group: 'Storage Engine',
  summary: 'A database connection is far more expensive than the query that rides on it. Pooling keeps a small set of connections open and lends them out — so clients stop paying the open/close tax on every request.',
  minutes: 7,
  level: 'intermediate',
  metrics: ['conns', 'waiting', 'latency', 'throughput'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why opening a connection per request is ruinously expensive', step: 0 },
    { text: 'A fixed pool of pre-opened connections in the middle', step: 1 },
    { text: 'The borrow → use → return checkout cycle', step: 2 },
    { text: 'What happens when every connection is busy', step: 3 },
    { text: 'Sizing the pool: too small waits, too large drowns the DB', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Storm',
      title: 'A new connection for every request',
      body: [
        `Every time a client wants to talk to the database it opens a fresh connection — a <b>TCP handshake</b>, a <b>TLS negotiation</b>, an <b>auth round-trip</b>, and on the server a whole <span class="term">backend process</span> (or thread) spun up with its own memory. Then the query runs for a millisecond and the connection is torn down.`,
        `Under load this becomes a <span class="term">handshake storm</span>: hundreds of connections opening and closing per second, the setup cost dwarfing the actual work, and the database buckling under thousands of short-lived backends.`,
      ],
      callout: { kind: 'warn', text: 'Opening a Postgres connection can cost 1–3 ms and several MB of server RAM — often far more than the query itself. Per-request connections do not scale.' },
      metrics: { conns: 200, waiting: 0, latency: 180, throughput: 400 },
      scene: { view: 'noPool', clients: 6, note: 'Six clients, six private connections — each paying the full open/close tax.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Pool',
      title: 'Keep a few connections open, forever',
      body: [
        `A <span class="term">connection pool</span> is a fixed set of connections opened <em>once</em>, at start-up, and kept alive. It sits between the clients and the database. Clients no longer open connections — they <b>borrow</b> one from the pool, use it, and <b>return</b> it.`,
        `The expensive handshake happens a handful of times total, not once per request. Twenty warm connections can serve thousands of requests a second because each request only pays for the query, never the setup.`,
      ],
      callout: { kind: 'insight', text: 'Amortise the setup cost: pay for a connection once, reuse it millions of times. The pool turns a per-request cost into a one-time cost.' },
      changes: ['+ fixed pool of warm connections', '~ clients borrow, not open', '− no per-request handshake'],
      metrics: { conns: 20, waiting: 0, latency: 40, throughput: 1200 },
      scene: { view: 'pool', clients: 6, size: 8, busy: 2, note: 'One pool of eight warm connections fronts the whole database.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Checkout',
      title: 'Borrow, run, return',
      body: [
        `The lifecycle of a request is a <span class="term">checkout</span>. A client asks the pool for a connection; the pool hands it an <b>idle</b> one and marks it busy. The client runs its query on that connection, then <b>returns</b> it — the pool resets it and marks it idle again, ready for the next borrower.`,
        `The connection object outlives any single request. That reuse is the entire trick: the socket, the authenticated session and the server backend all persist across thousands of checkouts.`,
      ],
      callout: { kind: 'tip', text: 'A pooled connection cycles idle → busy → idle thousands of times. The pool owns the connection; the client only ever leases it.' },
      changes: ['+ checkout marks a conn busy', '~ query runs on the lease', '+ return resets it to idle'],
      metrics: { conns: 20, waiting: 0, latency: 35, throughput: 1400 },
      scene: { view: 'checkout', clients: 6, size: 8, hot: 3, note: 'One connection checked out, used, and returned — the cycle that repeats forever.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Saturation',
      title: 'When every connection is busy',
      body: [
        `The pool is bounded on purpose. When a burst of requests arrives and <em>all</em> connections are checked out, the next client cannot borrow one — so it <b>waits in a queue</b> until a connection is returned.`,
        `This is a feature, not a bug. The queue acts as a <span class="term">back-pressure</span> valve: instead of overwhelming the database with unlimited concurrency, excess load piles up harmlessly in the client's wait queue. Latency rises, but the database stays healthy.`,
      ],
      callout: { kind: 'insight', text: 'A full pool turns into a queue. Bounded connections mean the database never sees more concurrency than it can handle — the overflow waits, it does not crash.' },
      changes: ['~ all connections busy', '+ extra clients queue & wait', '~ pool caps DB concurrency'],
      metrics: { conns: 20, waiting: 18, latency: 90, throughput: 1300 },
      scene: { view: 'saturation', clients: 6, size: 8, queued: 4, note: 'Pool fully checked out — four clients wait their turn in the queue.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Sizing',
      title: 'How big should the pool be?',
      body: [
        `Pool size is a genuine trade-off. Make it <b>too small</b> and clients spend their lives in the wait queue — the database sits idle while requests starve. Make it <b>too large</b> and you are back to the original problem: hundreds of backend processes thrashing the DB's CPU and memory with context switches.`,
        `The sweet spot is surprisingly small — often close to the number of CPU cores on the database, plus a little for disk wait. More connections than the DB can run in parallel just adds queueing <em>inside</em> the database instead of in your pool.`,
      ],
      callout: { kind: 'tip', text: 'A classic starting point: pool size ≈ (cores × 2) + effective spindles. Bigger is almost never better — a saturated DB serves everyone slowly.' },
      metrics: { conns: 20, waiting: 4, latency: 45, throughput: 1500 },
      scene: { view: 'tradeoff', note: 'Too small starves; too large drowns the DB. The sweet spot tracks the core count.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Bounded concurrency, reused connections',
      body: [
        `A connection pool does two jobs at once. It <b>reuses</b> connections so the handshake cost is paid once instead of per request, and it <b>bounds</b> concurrency so the database is never asked to do more at once than it can.`,
        `The payoff is steady, low latency under load and a database that stays protected behind a small, warm set of connections. Nearly every production system — web apps, microservices, serverless front ends — fronts its database with a pool.`,
      ],
      callout: { kind: 'insight', text: 'Reuse + back-pressure. The pool amortises setup cost and shields the database from unbounded load — two wins from one small, warm set of connections.' },
      metrics: { conns: 20, waiting: 1, latency: 38, throughput: 1600 },
      scene: { view: 'recap', clients: 6, size: 8, busy: 3, note: 'One warm pool: connections reused, concurrency bounded, the DB protected.' },
    },
  ],
};
