/* ============================================================
   deepdives/bloom-filter.js — "Bloom Filter" deep dive.
   Registers DBLab.deepDives['bloom-filter'] (concept m44).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  var N = 16; // bit-array size for the demo
  function bitsFrom(setPositions) {
    var b = [];
    for (var i = 0; i < N; i++) b.push(setPositions.indexOf(i) >= 0 ? 1 : 0);
    return b;
  }
  // Deterministic "hash" positions per key (k = 3 hashes).
  var H = { apple: [2, 7, 11], mango: [4, 7, 13], cherry: [1, 9, 14], grape: [2, 11, 13] };
  var AFTER_APPLE = [2, 7, 11];
  var AFTER_MANGO = [2, 4, 7, 11, 13];

  var STEPS = [
    {
      label: "1 · A bit array + k hash functions",
      what: "A <b>Bloom filter</b> is a bit array (here 16 bits, all 0) plus <b>k</b> independent hash functions (here k=3). It answers one question: <i>is this element in the set?</i> — using a tiny fraction of the memory the full set would need.",
      why: "Sometimes you only need to know 'is X <b>definitely not</b> here?' to skip an expensive lookup. A Bloom filter gives that answer in a few bits per element, with a controllable false-positive rate and — crucially — <b>no false negatives</b>.",
      how: "To test or add an element, hash it k ways to get k bit positions. The whole structure is just those bits; there's no stored list of elements.",
      when: "Anywhere a cheap 'probably present / definitely absent' pre-check saves a costly operation — LSM SSTable lookups, cache filters, dedup, CDNs.",
      mistake: "Expecting it to store or return the elements. It stores only bits — it can tell you 'maybe' or 'no', never give you the data back.",
      interview: "“What is a Bloom filter?” A space-efficient probabilistic set: k hashes set/test bits in an array; it reports 'definitely not present' or 'possibly present', never a false negative.",
      example: "ShopKart puts a Bloom filter in front of an expensive per-SKU lookup to skip work for SKUs that definitely aren't in a given file.",
      viz: { bits: bitsFrom([]), members: [], probe: null, note: "16 bits, all 0, and k=3 hash functions. No element list — just bits." }
    },
    {
      label: "2 · Insert 'apple' → set 3 bits",
      what: "Add <b>apple</b>. Hash it 3 ways → positions <code>2, 7, 11</code>. Set those bits to 1. That's the entire cost of an insert: three bit-sets.",
      why: "Inserts are O(k) and touch only bits — no comparisons, no growth, no rebalancing. Memory is fixed regardless of element size (a 2 KB URL costs the same 3 bits as 'apple').",
      how: "<code>set bit[h1(apple)]</code>, <code>set bit[h2(apple)]</code>, <code>set bit[h3(apple)]</code>. Bits already set stay set.",
      when: "Every add to the set the filter guards.",
      mistake: "Assuming each element owns its bits. Bits are shared — different elements can (and will) set overlapping positions, which is the root of false positives.",
      interview: "“How do you add an element to a Bloom filter?” Hash it with the k functions and set the k resulting bits; nothing else is stored.",
      example: "Adding SKU 'apple' flips bits 2, 7, 11 — the filter now 'knows' about apple in 3 bits.",
      viz: { bits: bitsFrom(AFTER_APPLE), members: ["apple"], probe: { key: "apple", kind: "insert", positions: H.apple, verdict: "set" },
        note: "apple → h(2,7,11) → set those bits. Insert is O(k) and touches only bits." }
    },
    {
      label: "3 · Insert 'mango' → bits can overlap",
      what: "Add <b>mango</b> → positions <code>4, 7, 13</code>. Notice bit <b>7</b> was already set by apple. Bits are <b>shared</b> across elements; mango just adds 4 and 13.",
      why: "Sharing bits is what makes the filter tiny — but it's also why a query can be fooled later: a position set by one element counts for any element that hashes there.",
      how: "Set bits 4 and 13 (bit 7 already 1). The filter can't tell <i>who</i> set a bit, only that it's set.",
      when: "As more elements are added, more bits turn on and overlaps accumulate.",
      mistake: "Thinking overlap is a bug. It's the intended tradeoff — density for size — and it's why the false-positive rate rises as the filter fills.",
      interview: "“Why do false positives happen at all?” Because bits are shared: an element's k positions can all happen to be set by <i>other</i> elements, making it look present.",
      example: "Adding 'mango' shares bit 7 with 'apple' — the filter is getting denser, one insert at a time.",
      viz: { bits: bitsFrom(AFTER_MANGO), members: ["apple", "mango"], probe: { key: "mango", kind: "insert", positions: H.mango, verdict: "set" },
        note: "mango → h(4,7,13); bit 7 already set by apple. Shared bits = small size, but the seed of false positives." }
    },
    {
      label: "4 · Query 'apple' → maybe present",
      what: "Test <b>apple</b>. Hash → <code>2, 7, 11</code>; check those bits — <b>all 1</b>. Verdict: <b>possibly present</b>. Now you do the real, expensive lookup to confirm.",
      why: "'All bits set' is necessary but not sufficient for membership. For a truly-present element, the bits are guaranteed set (it set them), so a Bloom filter <b>never</b> says 'no' to something that's actually there — no false negatives.",
      how: "Test <code>bit[h1] AND bit[h2] AND bit[h3]</code>. All 1 → 'maybe'. This gates the expensive operation; it doesn't replace it.",
      when: "Every membership test where the answer 'maybe' is followed by the real check.",
      mistake: "Treating 'maybe present' as 'present'. It means 'don't skip — go verify'. The certainty is only in the negative direction.",
      interview: "“Can a Bloom filter give a false negative?” No. If an element was added, all its bits are set, so a query for it always returns 'maybe'. Only false positives are possible.",
      example: "A lookup for 'apple' returns 'maybe', so ShopKart proceeds to the real fetch — and finds it.",
      viz: { bits: bitsFrom(AFTER_MANGO), members: ["apple", "mango"], probe: { key: "apple", kind: "query", positions: H.apple, verdict: "maybe" },
        note: "All 3 bits set → 'possibly present' → do the real lookup. A present element is never missed (no false negatives)." }
    },
    {
      label: "5 · Query 'cherry' → definitely NOT (the win)",
      what: "Test <b>cherry</b>. Hash → <code>1, 9, 14</code>; check those bits — bit <b>1 is 0</b>. Even one zero means the element was <b>never added</b>. Verdict: <b>definitely not present</b>. Skip the expensive lookup entirely.",
      why: "This is the whole value proposition. A confident 'no' lets you avoid a disk read, a network call, a cache miss — for the cost of checking 3 bits. At scale, skipping the misses is enormous.",
      how: "If <i>any</i> of the k bits is 0, the element cannot be in the set (adding it would have set all k). Return 'no' with certainty and short-circuit.",
      when: "The common, valuable case: most queries for absent elements are rejected in a few bit reads.",
      mistake: "Under-valuing the negative answer. 'Definitely not' is the certain, cheap result that makes Bloom filters worth using.",
      interview: "“What guarantees a Bloom filter's 'not present' answer?” A zero bit: adding the element would have set all k bits, so any zero proves it was never added.",
      example: "A lookup for absent SKU 'cherry' sees a 0 bit and is rejected instantly — no wasted disk read.",
      viz: { bits: bitsFrom(AFTER_MANGO), members: ["apple", "mango"], probe: { key: "cherry", kind: "query", positions: H.cherry, verdict: "no" },
        note: "Bit 1 is 0 → cherry was never added → DEFINITELY NOT present. Skip the expensive lookup. This is the payoff." }
    },
    {
      label: "6 · Query 'grape' → false positive",
      what: "Test <b>grape</b> (never added). Hash → <code>2, 11, 13</code>; check those bits — <b>all happen to be 1</b> (set by apple and mango). Verdict: <b>possibly present</b> — but grape isn't in the set. A <b>false positive</b>.",
      why: "This is the price of the space savings: sometimes an absent element's bits are all set by others, so you do a wasted lookup that finds nothing. It's a performance cost, never a correctness bug — you still get the right final answer after the real check.",
      how: "Grape's 3 positions were coincidentally covered by apple (2, 11) and mango (13). The filter says 'maybe', you do the real lookup, it's absent, you move on — you just paid for one needless check.",
      when: "At a rate set by how full the filter is: fuller array → more collisions → more false positives.",
      mistake: "Fearing false positives will return wrong data. They won't — they only cause an occasional wasted verification; the real lookup is still authoritative.",
      interview: "“What's the impact of a false positive?” A wasted real lookup, not a wrong answer — the subsequent authoritative check corrects it. You tune the FP rate to keep waste acceptable.",
      example: "A lookup for absent 'grape' passes the filter (false positive), triggers one real fetch that finds nothing — a small, tunable inefficiency.",
      viz: { bits: bitsFrom(AFTER_MANGO), members: ["apple", "mango"], probe: { key: "grape", kind: "query", positions: H.grape, verdict: "fp" },
        note: "grape's bits (2,11,13) were all set by apple/mango → 'maybe' though grape is absent. False positive = a wasted check, not a wrong answer." }
    },
    {
      label: "7 · Tuning & real-world use",
      what: "The <b>false-positive rate</b> is a dial: more bits per element and an optimal <b>k</b> drive it down (at more memory). Standard Bloom filters <b>can't delete</b> (clearing a shared bit could break other elements) — counting Bloom filters trade space to allow it.",
      why: "This tunability is why Bloom filters are everywhere: you pick the FP rate your workload can afford. In an LSM-Tree, a per-SSTable Bloom filter lets a read skip files that can't contain the key — the single biggest weapon against read amplification.",
      how: "For n elements and m bits, the optimal number of hashes is <code>k ≈ (m/n)·ln2</code>, giving an FP rate around <code>0.6185^(m/n)</code>. ~10 bits/element ≈ 1% false positives — cheap and effective.",
      when: "Sizing a filter (choose m, k for your n and target FP rate); anywhere a probabilistic pre-check gates expensive work.",
      mistake: "Sizing for too few bits/element and drowning in false positives, or forgetting standard filters can't delete (use a counting variant, or rebuild).",
      interview: "“Where have you seen Bloom filters used?” LSM SSTable lookups (skip files), cache/CDN 'have I seen this?' checks, dedup, and databases avoiding disk reads for absent keys.",
      example: "ShopKart's LSM store attaches a Bloom filter to every SSTable, so a lookup for an absent SKU skips files whose filter says 'no' — turning many potential disk reads into a few bit checks.",
      viz: { bits: bitsFrom(AFTER_MANGO), members: ["apple", "mango"], probe: null,
        note: "Tune bits/element & k for your FP rate (~10 bits ≈ 1%). No deletes in the standard form. Key use: LSM SSTable skips." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function bitsHtml(bits, probe) {
      var pos = probe ? probe.positions : [];
      return bits.map(function (b, i) {
        var isProbe = pos.indexOf(i) >= 0;
        var cls = "dd-bit" + (b ? " set" : "") + (isProbe ? (b ? " probe" : " probe-bad") : "");
        return '<div class="' + cls + '">' + b + '<span class="dd-bit-idx">' + i + "</span></div>";
      }).join("");
    }
    function verdictChip(p) {
      if (!p) return "";
      if (p.kind === "insert") return '<span class="dd-chip dd-chip--accent">INSERT ' + p.key + " → set " + p.positions.join(",") + "</span>";
      var map = {
        maybe: ['dd-chip--warn', "maybe present → verify"],
        no: ['dd-chip--ok', "definitely NOT present → skip"],
        fp: ['dd-chip--bad', "false positive (maybe, but absent)"]
      }[p.verdict] || ["dd-chip", p.verdict];
      return '<span class="dd-chip dd-chip--info">GET ' + p.key + " → h(" + p.positions.join(",") + ")</span> " +
        '<span class="dd-chip ' + map[0] + '">' + map[1] + "</span>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to add elements to a Bloom filter, then query present, absent, ' +
          "and false-positive keys — and see why it can say 'definitely no' but only 'maybe yes'.</div>";
        return;
      }
      var html = '<div class="dd-section"><div class="dd-section-label">Bit array (16 bits · k=3 hashes) ' + verdictChip(s.probe) + "</div>" +
        '<div class="dd-bits">' + bitsHtml(s.bits, s.probe) + "</div></div>";
      html += '<div class="dd-section"><div class="dd-section-label">Members added</div>' +
        (s.members.length ? '<div class="dd-bloom-members">' + s.members.map(function (m) {
          return '<span class="dd-chip dd-chip--accent">' + m + "</span>";
        }).join("") + "</div>" : '<span class="dd-note">none yet</span>') + "</div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["bloom-filter"] = {
    slug: "bloom-filter",
    overview: {
      what: "A <b>Bloom filter</b> is a space-efficient probabilistic set: a bit array plus k hash functions. It answers 'is X in the set?' with either <b>definitely not present</b> or <b>possibly present</b> — never a false negative.",
      why: "It lets you skip expensive work (a disk read, a network call) for elements that are definitely absent, using only a few bits per element. That certain 'no' — at a tiny, tunable false-positive rate — is what makes it a workhorse in databases, caches, and LSM-Trees.",
      how: "Adding an element sets the k bits its hashes point to. Testing checks those k bits: any zero means definitely-absent (short-circuit the expensive lookup); all ones means possibly-present (do the real check to confirm). Bits are shared, so false positives happen; false negatives cannot."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Bloom filter operations & sizing",
      lang: "sql",
      code:
        "add(x):\n" +
        "    for h in hashes:  bits[h(x) % m] = 1        # set k bits\n" +
        "\n" +
        "might_contain(x):\n" +
        "    for h in hashes:\n" +
        "        if bits[h(x) % m] == 0:\n" +
        "            return FALSE        # DEFINITELY NOT present (a zero proves it)\n" +
        "    return TRUE                 # POSSIBLY present -> do the real lookup\n" +
        "\n" +
        "# Sizing for n elements, m bits:\n" +
        "#   optimal k  ~= (m/n) * ln 2\n" +
        "#   false-positive rate ~= 0.6185 ^ (m/n)   ->  ~10 bits/element ~= 1%\n" +
        "# No delete in the standard form (shared bits); use a counting Bloom filter.",
      highlights: [6, 7, 9]
    },
    reference: [
      ["Bloom filter", "Probabilistic set: bit array + k hashes; 'no' is certain, 'yes' is 'maybe'"],
      ["bit array (m)", "The m bits that make up the whole structure"],
      ["k", "Number of independent hash functions (bits set/tested per element)"],
      ["false positive", "'Possibly present' for an element that's actually absent"],
      ["no false negatives", "A present element always tests 'maybe' — never missed"],
      ["fill ratio", "Fraction of bits set; rises with elements → more false positives"],
      ["FP rate", "≈ 0.6185^(m/n); ~10 bits/element ≈ 1%"],
      ["optimal k", "≈ (m/n)·ln2 hashes minimize the FP rate"],
      ["counting Bloom filter", "Counters instead of bits to support deletion"]
    ],
    internals:
      "<p>A Bloom filter is <b>m</b> bits and <b>k</b> hash functions — nothing else, no stored elements. <b>Add(x)</b> sets the k bits at <code>h₁(x)…h_k(x)</code>. <b>Test(x)</b> checks those k bits: if any is 0, x was definitely never added (adding it would have set all k), so you can reject with certainty; if all are 1, x is <i>possibly</i> present — the bits could have been set by other elements.</p>" +
      "<p>That asymmetry is the whole point: <b>no false negatives, only false positives</b>. The false-positive rate depends on how full the array is: with n elements in m bits, the optimal number of hashes is <code>k ≈ (m/n)·ln2</code> and the FP rate is about <code>0.6185^(m/n)</code> — roughly 1% at 10 bits per element. Deletion isn't supported in the standard form, because clearing a shared bit could wrongly evict other elements; a <b>counting Bloom filter</b> replaces bits with small counters to allow it, at extra space.</p>" +
      "<p>The classic database use is in <b>LSM-Trees</b>: each SSTable carries a Bloom filter over its keys, so a read can skip files that definitely don't contain the key — collapsing read amplification from 'check every file' to roughly one probe.</p>",
    engineering:
      "<p>Bloom filters are a precision tool for one job: cheaply gating expensive work with a certain 'no'. Size them for your target FP rate — bits-per-element is the dial (≈10 bits ≈ 1%, ≈15 ≈ 0.1%) and k should be near <code>(m/n)·ln2</code>. Over-size and you waste memory; under-size and false positives erode the benefit by triggering wasted real lookups.</p>" +
      "<p>Mind the constraints: standard filters can't delete (rebuild periodically, or use a counting/scalable variant), and their accuracy degrades as they fill past the designed n (so plan capacity, or use a scalable Bloom filter that grows). They complement, never replace, the authoritative store — a 'maybe' always needs the real check. Beyond LSM SSTables, they're used for cache/CDN 'seen it?' checks, dedup, and avoiding round-trips for definitely-absent keys.</p>",
    gotchas: [
      { kind: "tip", html: "<b>The certainty is only in the 'no'.</b> 'Definitely not present' is guaranteed; 'possibly present' means 'go verify'. Design around skipping work on the certain negatives — that's the entire value." },
      { kind: "warn", html: "<b>Standard Bloom filters can't delete.</b> Bits are shared, so clearing one could evict other elements. If you need deletion, use a counting Bloom filter (more space) or rebuild the filter periodically." },
      { kind: "info", html: "<b>Accuracy degrades as it fills.</b> The false-positive rate is only as good as your bits-per-element for the actual element count. Overfill it and false positives climb — size for your real n (or use a scalable Bloom filter)." }
    ],
    failureModes:
      "<p><b>Under-sized filter:</b> too few bits per element pushes the false-positive rate high, so many absent keys pass the filter and trigger wasted real lookups — erasing the benefit. <i>Fix:</i> size m/n for the target FP rate; set k ≈ (m/n)·ln2.</p>" +
      "<p><b>Overfilled filter:</b> inserting far more than the designed n saturates the bits and FP rate spikes. <i>Fix:</i> capacity planning; scalable Bloom filters; periodic rebuilds.</p>" +
      "<p><b>Expecting deletes:</b> attempting to 'remove' by clearing bits corrupts membership for other elements. <i>Fix:</i> counting Bloom filter, or rebuild from the source of truth.</p>" +
      "<p><b>Treating 'maybe' as 'yes':</b> skipping the authoritative check on a positive returns wrong results on false positives. <i>Fix:</i> always verify a 'maybe' against the real store.</p>",
    quickCheck: [
      {
        q: "A Bloom filter returns 'possibly present' for a key. What can you correctly conclude?",
        options: [
          "The key is definitely in the set",
          "The key might be in the set — you must do the real lookup to know",
          "The key is definitely not in the set",
          "The filter is full"
        ],
        answer: 1,
        why: "'Possibly present' means all k bits were set, which is necessary but not sufficient for membership (other elements could have set them). Only a real lookup confirms it. Certainty exists only for the negative answer.",
        diff: "easy"
      },
      {
        q: "Why can a Bloom filter never produce a false negative?",
        options: [
          "It stores every element it has seen",
          "Adding an element sets all k of its bits, so a query for it always finds them set → 'maybe', never 'no'",
          "It re-hashes on every query",
          "It uses a perfect hash function"
        ],
        answer: 1,
        why: "If an element was added, all k of its bit positions are 1. A test checks exactly those positions and finds them set, so it returns 'maybe' — it can never wrongly say 'not present'. Only the reverse (false positive) is possible.",
        diff: "medium"
      },
      {
        q: "In an LSM-Tree, what job does a per-SSTable Bloom filter do?",
        options: [
          "It stores the SSTable's data in memory",
          "It lets a read skip SSTables that definitely don't contain the key, cutting read amplification",
          "It sorts the SSTable",
          "It deletes old keys during compaction"
        ],
        answer: 1,
        why: "Each SSTable's Bloom filter is checked in memory before any disk I/O; files that can't contain the key are skipped, so a read typically probes only the one file that might hold it — the primary defense against LSM read amplification.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "What is a Bloom filter, and what exactly does each answer guarantee?",
        a: "A Bloom filter is a space-efficient probabilistic set: an m-bit array plus k hash functions, storing no elements themselves. To add an element you set the k bits its hashes point to; to test one you check those k bits. If any bit is 0, the element was definitely never added — a guaranteed 'not present'. If all are 1, it's 'possibly present', because those bits could have been set by other elements. So the guarantees are asymmetric: no false negatives ever, but false positives are possible at a rate you control with bits-per-element and k. The value is the certain negative: it lets you skip an expensive lookup for elements that are definitely absent.",
        tip: "Lead with the asymmetry — 'certain no, uncertain yes, no false negatives.' That one sentence is the concept."
      },
      {
        q: "How do you tune a Bloom filter's false-positive rate, and what are its limits?",
        a: "The false-positive rate is governed by the array size relative to the number of elements: for n elements in m bits, the optimal number of hashes is k ≈ (m/n)·ln2, giving an FP rate around 0.6185^(m/n) — roughly 1% at 10 bits per element, 0.1% at ~15. So you pick bits-per-element for your target rate and set k accordingly. The limits: standard Bloom filters can't delete, because clearing a shared bit could evict other elements (use a counting Bloom filter, at extra space, or rebuild); and accuracy degrades if you insert past the designed n, so you must plan capacity or use a scalable variant. And a 'maybe' always requires the authoritative check — the filter gates work, it doesn't replace the store.",
        tip: "Knowing the rule-of-thumb (~10 bits/element ≈ 1%) and the no-delete limitation signals real familiarity, not just the definition."
      },
      {
        q: "Give a concrete example of a Bloom filter earning its keep in a database.",
        a: "In an LSM-Tree, reads can be expensive because a key may live in the MemTable or any of several SSTables, so naively a read checks many files (read amplification). Each SSTable carries a Bloom filter over its keys. On a read, the engine checks each SSTable's Bloom filter in memory first; files whose filter says 'definitely not' are skipped without any disk I/O, so a read typically does one real probe instead of many. It costs a few bits per key and an occasional false-positive probe, and in return collapses the read amplification that would otherwise make LSM reads slow. The same pattern shows up in caches/CDNs ('have we seen this URL?') and dedup pipelines.",
        tip: "The LSM SSTable example is the canonical one — tie it explicitly to 'reduces read amplification' to connect it to the storage-engine picture."
      }
    ],
    businessLens: {
      task: "ShopKart's LSM event store skipping SSTables for absent SKUs",
      meaning: "Look up a key's latest value without reading files that can't possibly contain it.",
      system: "LSM store with per-SSTable Bloom filters",
      point: "ShopKart's event store spreads a key's history across many immutable SSTables, so a naive read would probe file after file. A per-SSTable Bloom filter changes that: for a lookup, files whose filter says 'definitely not' are skipped in memory, and only the one file that might hold the key is read from disk. At a few bits per key and an occasional harmless false-positive probe, it turns a read-amplification problem into a handful of bit checks — the quiet reason the store stays fast even as SSTables pile up. It's the textbook case of a certain 'no' being worth far more than its tiny cost."
    }
  };
})();
