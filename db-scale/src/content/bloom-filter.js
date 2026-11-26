/* content/bloom-filter.js — the "Bloom Filter" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/bloom-filter-scene.js. Rendered through the shared course shell. */

export const bloomFilterLesson = {
  id: 'bloom-filter',
  title: 'Bloom Filter',
  group: 'Storage Engine',
  summary: 'A tiny probabilistic set that tells a read which SSTables definitely do not hold a key — so it can skip them instead of probing every file.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['fpr', 'bits', 'readAmp', 'memory'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a point lookup wastes I/O probing files that never had the key', step: 0 },
    { text: 'A Bloom filter: a bit array plus k hash functions', step: 1 },
    { text: 'Insert = set the k hashed bits to 1', step: 2 },
    { text: '“Definitely not” vs “maybe” — the asymmetric answer', step: 3 },
    { text: 'False positives, and the memory ↔ accuracy trade', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Probe them all',
      title: 'A missing key still touches every file',
      body: [
        `An LSM store spreads a key's history across many <span class="term">SSTables</span>. To answer <code>GET "k"</code> the engine must, in the worst case, look in <em>every</em> file — newest to oldest — until it finds the key or runs out of files.`,
        `When the key isn't there at all, that's the most expensive case: a full sweep of the files, every one a disk probe, all of them a <b>miss</b>. Pure wasted I/O on files that never contained the key.`,
      ],
      callout: { kind: 'warn', text: 'The painful lookup is the one that finds nothing: it pays to read every SSTable before it can say “absent.” That is read amplification at its worst.' },
      metrics: { fpr: 0, bits: 0, readAmp: 6, memory: 0 },
      scene: { view: 'probe-all', note: 'One lookup, six files, six misses — all to prove a key is absent.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Bits + hashes',
      title: 'A bit array and a few hash functions',
      body: [
        `A <span class="term">Bloom filter</span> is a small summary that sits in front of each SSTable: a fixed array of <b>bits</b>, all zero to begin with, plus <b>k</b> independent hash functions.`,
        `It is tiny — a few bits per key — so every SSTable's filter fits comfortably in RAM. It never stores the keys themselves, only a fingerprint of which bits they touched.`,
      ],
      callout: { kind: 'insight', text: 'A Bloom filter is a set you can only ask “is x maybe in here?” — built from one bit array and k hashes, holding no keys, costing a handful of bits each.' },
      changes: ['+ bit array (all 0)', '+ k hash functions', '~ one filter per SSTable, kept in RAM'],
      metrics: { fpr: 0, bits: 10, readAmp: 6, memory: 1 },
      scene: { view: 'bitarray', k: 3, note: 'An empty filter: a row of zero bits and three hash functions.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Insert',
      title: 'Insert: set the k hashed bits',
      body: [
        `To record that a key lives in this SSTable, hash it with each of the <b>k</b> functions. Each hash picks one position in the bit array; set all k of those bits to <b>1</b>.`,
        `Add another key and it sets its own k bits — which may <em>overlap</em> bits an earlier key already set. The filter never grows; bits only ever flip from 0 to 1.`,
      ],
      callout: { kind: 'tip', text: 'Insert touches exactly k bits, no matter how big the key. The array fills up gradually as more keys share its bits.' },
      changes: ['~ hash key → k positions', '+ set those k bits to 1', '~ bits are shared across keys'],
      metrics: { fpr: 0, bits: 10, readAmp: 6, memory: 1 },
      scene: { view: 'insert', k: 3, note: 'One key, three hashes, three bits flipped to 1.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Query',
      title: '“Definitely not” or “maybe”',
      body: [
        `To test a key, hash it the same way and look at its k bits. If <b>any</b> of them is <b>0</b>, the key was never inserted — it is <span class="term">definitely not</span> in this SSTable, with certainty. Skip the file entirely.`,
        `If <b>all</b> k bits are <b>1</b>, the key is <span class="term">maybe</span> present — so the engine reads the file to be sure. The answer is asymmetric: a hard no, or a soft maybe.`,
      ],
      callout: { kind: 'insight', text: 'One 0 bit is proof of absence. All-1s is only a hint of presence. The filter can rule a file out for certain, but never rule it in.' },
      changes: ['any bit 0 → skip the file (certain)', 'all bits 1 → read the file (maybe)', '− files probed falls sharply'],
      metrics: { fpr: 2, bits: 10, readAmp: 2, memory: 1 },
      scene: { view: 'query', k: 3, note: 'A 0 bit rules one file out for sure; all-1s sends the other to disk.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'False positives',
      title: 'False positives, never false negatives',
      body: [
        `Because bits are shared, a key that was never inserted can still find all k of its bits set — by coincidence, flipped on by other keys. The filter says “maybe,” the file is read, the key isn't there: a <span class="term">false positive</span>, costing one wasted lookup.`,
        `There are <b>no false negatives</b> — a present key always sets its bits, so it is never wrongly skipped. More <b>bits per key</b> and more hashes push the false-positive rate down, at the cost of more memory.`,
      ],
      callout: { kind: 'warn', text: 'A false positive wastes a read; it never returns a wrong answer. Tune bits-per-key to trade RAM for a lower false-positive rate.' },
      metrics: { fpr: 1, bits: 14, readAmp: 1, memory: 2 },
      scene: { view: 'fpr', k: 3, note: 'All three bits set by chance — a false positive, but never a wrong result.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Probe only the files that might have it',
      body: [
        `A Bloom filter per SSTable turns “probe every file” into “probe only the files whose filter says maybe.” Absent keys are rejected in RAM, and most lookups now touch one file instead of all of them.`,
        `No false negatives, a false-positive rate you dial in with a few bits per key, and a memory cost measured in kilobytes — the standard trick that keeps LSM reads fast.`,
      ],
      callout: { kind: 'insight', text: 'Certain “no,” cheap “maybe,” tiny RAM — the Bloom filter is what slashes read amplification across an LSM-tree’s SSTables.' },
      metrics: { fpr: 1, bits: 14, readAmp: 1, memory: 2 },
      scene: { view: 'recap', note: 'Filters in RAM skip the files that can’t help; one read instead of six.' },
    },
  ],
};
