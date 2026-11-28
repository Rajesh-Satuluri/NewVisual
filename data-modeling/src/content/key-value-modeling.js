/* content/key-value-modeling.js — "Key-Value Modeling", the simplest NoSQL model
   (Redis, DynamoDB basic, Memcached), as DATA. A pure dictionary: an opaque value
   addressed by one key, O(1) GET/PUT, no query over the value. Modeling is designing
   the KEY (composite keys encode access) and the VALUE shape. Its scene is a kvStore. */

export const keyValueModelingLesson = {
  id: 'key-value-modeling',
  title: 'Key-Value Modeling',
  group: 'NoSQL & Access-Pattern Modeling',
  summary: 'A key-value store is a pure dictionary: one opaque value addressed by one key, read and written in O(1) with no query over the value. Modeling is designing the key to encode the access pattern and serializing the whole aggregate as the value.',
  minutes: 7,
  level: 'intermediate',
  metrics: ['latency', 'requests', 'hitRate', 'accessPatterns'],
  legend: [],
  goals: [
    { text: 'A key-value store is a dictionary: one opaque value per key, nothing more', step: 0 },
    { text: 'GET and PUT by exact key are O(1) — a single hash lookup, one hot slot', step: 1 },
    { text: 'Modeling is key design: a composite key encodes the access pattern', step: 2 },
    { text: 'The value is opaque — the store cannot query, filter or scan inside it', step: 3 },
    { text: 'Perfect for caches, sessions, counters, flags; wrong when you must query', step: 4 },
    { text: 'Design the key to the access pattern, serialize the aggregate as the value', step: 5 },
  ],

  steps: [
    { // 0 SETUP — the dictionary
      chapter: 'setup', short: 'A dictionary',
      title: 'The simplest model: a dictionary',
      body: [
        `A <span class="term">key-value store</span> — Redis, Memcached, DynamoDB in its basic form — is the simplest data model there is: a giant distributed <b>dictionary</b>. You put a value in under a key, and you get it back by that exact key. That is the entire interface. There are no columns, no rows, no relationships — just <code>key → value</code> pairs.`,
        `The value is <span class="term">opaque</span> to the store: a blob of bytes, a JSON string, a number — the database neither knows nor cares what is inside. All it guarantees is that whatever you <code>PUT</code> under <code>session:abc</code> is exactly what you <code>GET</code> back. This radical simplicity is what makes a key-value store astonishingly fast and easy to scale.`,
      ],
      callout: { kind: 'insight', text: 'A key-value store is a hash map with a network in front of it. One key, one value, and the store never looks inside the value.' },
      metrics: { latency: 1, requests: 1, hitRate: 100, accessPatterns: 1 },
      scene: { view: 'dict', note: 'A key-value store as a dictionary: opaque values addressed by exact keys, with no structure the store understands.' },
    },
    { // 1 TECHNIQUE — GET/PUT by key, O(1), hot slot
      chapter: 'technique', short: 'GET/PUT O(1)',
      title: 'Every access is O(1) by exact key',
      body: [
        `Access is a single <b>hash lookup</b>. <code>GET user:42:cart</code> hashes the key, jumps straight to the one slot that holds the value, and returns it — <span class="term">O(1)</span>, independent of how many billions of keys the store holds. <code>PUT</code> is the same: hash, write the slot. No scan, no index traversal, no comparison against other keys.`,
        `This is why key-value stores anchor the latency floor of a system: a GET is a dictionary lookup plus a network hop, measured in a handful of microseconds to a low millisecond. But the power is also the limit — you can reach a value <em>only</em> by its exact key. There is no "find all carts over $100"; there is only "give me <code>user:42:cart</code>."`,
      ],
      callout: { kind: 'tip', text: 'GET and PUT hash the key and land on one slot. O(1) at any scale — but only the exact key gets you there.' },
      changes: ['+ GET user:42:cart → one hash lookup', '~ O(1), independent of store size', '! reachable only by the exact key'],
      metrics: { latency: 1, requests: 1, hitRate: 100, accessPatterns: 1 },
      scene: { view: 'get', note: 'GET user:42:cart hashes straight to one slot — an O(1) hit — with no scan over the other keys.' },
    },
    { // 2 TECHNIQUE — designing the key (composite key encodes access)
      chapter: 'technique', short: 'Design the key',
      title: 'The key is the whole design',
      body: [
        `Since the only way in is the key, <b>key design is the entire data model</b>. A well-chosen <span class="term">composite key</span> encodes the access pattern directly in its structure: <code>user:42:cart</code> says "the cart belonging to user 42"; <code>session:abc123</code>, <code>feature_flag:dark_mode</code>, <code>counter:page:home:views</code>. The colon-delimited namespace turns the flat key-space into a readable, collision-free scheme.`,
        `You design the key so that at the moment the app needs a value, it can <b>construct the exact key</b> from what it already has in hand — a user id, a session token, a flag name. If the app knows the user id and wants their cart, <code>user:{id}:cart</code> is reachable with zero lookups. The key <em>is</em> the query, pre-answered by naming convention.`,
      ],
      callout: { kind: 'insight', text: 'A composite key encodes the access pattern. Design keys the app can construct from data it already holds, and every read is a direct hit.' },
      changes: ['+ composite key: user:{id}:cart', '+ namespaces: session:, flag:, counter:', '~ the key is the query, pre-answered'],
      metrics: { latency: 1, requests: 1, hitRate: 100, accessPatterns: 4 },
      scene: { view: 'keydesign', note: 'Composite keys encode the access pattern — user:42:cart, session:abc, counter:views — constructed from data the app holds.' },
    },
    { // 3 TRADEOFF — the value is opaque
      chapter: 'tradeoff', short: 'Opaque value',
      title: 'You cannot query inside the value',
      body: [
        `The hard limit is the mirror of the strength: the value is <b>opaque</b>, so the store offers <span class="term">no secondary access</span>. You cannot filter by a field inside the value, you cannot range-scan, you cannot join, you cannot ask "which sessions belong to user 42" unless you designed a key that answers it. Every question the value's contents could support is invisible to the database.`,
        `This forces two disciplines. First, <b>serialize the whole aggregate</b> as the value — if the app reads a cart, store the entire cart as one value, because you cannot fetch just one line. Second, if you need a second way to find data — by a field, not the key — you must <em>build it yourself</em>: maintain a second key (an index key) that maps the alternate lookup to the primary key, updated on every write.`,
      ],
      callout: { kind: 'warn', text: 'No server-side filtering, scanning or joining. A second access path is a second key you maintain by hand — or it does not exist.' },
      changes: ['! no filter / scan / join over the value', '~ serialize the whole aggregate as the value', '! alternate lookups need a hand-built index key'],
      metrics: { latency: 1, requests: 2, hitRate: 100, accessPatterns: 1 },
      scene: { view: 'opaque', note: 'The value is an opaque blob: the store cannot filter, scan or join inside it — only the exact key reaches it.' },
    },
    { // 4 TRADEOFF — use cases + limits
      chapter: 'tradeoff', short: 'Where it fits',
      title: 'Caches, sessions, counters, flags',
      body: [
        `Key-value modeling shines wherever access is naturally <b>by a single known key</b> and the value is a self-contained blob. The canonical fits: a <span class="term">cache</span> (<code>page:home → rendered HTML</code>), a <span class="term">session</span> store (<code>session:{token} → user state</code>), <b>counters</b> (<code>INCR counter:views</code>), and <b>feature flags</b> (<code>flag:dark_mode → on</code>). Each is read and written by an exact key, needs microsecond latency, and never needs a query over the contents.`,
        `It is the <em>wrong</em> tool the moment you need to ask questions the key cannot answer — "all orders placed last week", "users sorted by spend", anything ad-hoc or analytical. That is a job for a document, wide-column, or relational store. Key-value is a scalpel: unbeatable for direct-key access, useless for exploration.`,
      ],
      callout: { kind: 'tip', text: 'Reach for key-value when access is by one known key and you need raw speed. Reach past it the moment you need to query the contents.' },
      changes: ['+ caches, sessions, counters, feature flags', '! unfit for ad-hoc or analytical queries'],
      metrics: { latency: 1, requests: 1, hitRate: 98, accessPatterns: 4 },
      scene: { view: 'usecases', note: 'The canonical key-value fits: cache, session, counter and feature-flag keys — each read by one exact key at microsecond latency.' },
    },
    { // 5 RECAP
      chapter: 'recap', short: 'Key is the model',
      title: 'Design the key, serialize the value',
      body: [
        `Key-value modeling strips NoSQL to its core: a dictionary of opaque values, reached in <b>O(1)</b> by exact key and nothing else. There is no query over the value, no secondary access, no join — only <code>GET</code> and <code>PUT</code> by a key you must be able to construct. The entire data model lives in two decisions: the shape of the <b>key</b> and the shape of the <b>value</b>.`,
        `Design the <span class="term">key</span> to encode the access pattern as a composite namespace the app can build from data it holds; serialize the whole <span class="term">aggregate</span> as the value so every read is a single hit. It is query-first design in its purest form — the access pattern is literally the key — and it is why key-value stores sit at the fast, simple foundation of nearly every large system.`,
      ],
      callout: { kind: 'insight', text: 'Key-value is query-first stripped bare: the key is the query. Design the key to the access pattern, store the aggregate as the value.' },
      metrics: { latency: 1, requests: 1, hitRate: 100, accessPatterns: 4 },
      scene: { view: 'recap', note: 'Composite keys encoding the access pattern, each returning a whole serialized aggregate in one O(1) hit.' },
    },
  ],
};
