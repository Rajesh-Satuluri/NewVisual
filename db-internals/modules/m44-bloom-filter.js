import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Bloom filter: 16-bit array, 3 hash functions
// For demo: hash(k, seed) = deterministic positions
const BIT_COUNT = 16;
const HASH_COLORS = ['#4F46E5', '#10B981', '#F59E0B'];
// Pre-computed bit positions for demo keys and 3 hash functions
const KEY_BITS = {
  15:  [[2,0],[7,1],[12,2]],
  42:  [[0,0],[5,1],[11,2]],
  78:  [[3,0],[9,1],[14,2]],
  55:  [[1,0],[6,1],[10,2]],
  99:  [[4,0],[8,1],[13,2]], // never inserted — false negative impossible
  27:  [[5,0],[9,1],[13,2]], // false positive: all 3 bits happen to be set
};

const BF_STEPS = [
  { bits:new Array(BIT_COUNT).fill(0), active:[], key:null, phase:'init',
    desc:'Bloom filter: probabilistic data structure. m bits, k hash functions. Initially all bits=0. Space-efficient: ~10 bits/key for 1% false positive rate. Used in SSTables to avoid unnecessary data block reads.' },
  { bits:null, active:KEY_BITS[15], key:15, phase:'insert',
    desc:'INSERT key=15. Apply 3 hash functions: h1(15)→bit 2, h2(15)→bit 7, h3(15)→bit 12. Set all 3 bits to 1. Key 15 is now "in" the filter.' },
  { bits:null, active:KEY_BITS[42], key:42, phase:'insert',
    desc:'INSERT key=42. h1(42)→bit 0, h2(42)→bit 5, h3(42)→bit 11. Set bits 0,5,11. Filter now has 6 bits set from 2 keys.' },
  { bits:null, active:KEY_BITS[78], key:78, phase:'insert',
    desc:'INSERT key=78. h1(78)→bit 3, h2(78)→bit 9, h3(78)→bit 14. Set bits 3,9,14. Three keys inserted: 15, 42, 78.' },
  { bits:null, active:KEY_BITS[15], key:15, phase:'query_hit',
    desc:'QUERY key=15. Check h1(15)=bit 2 ✓, h2(15)=bit 7 ✓, h3(15)=bit 12 ✓. ALL bits set. Answer: "MAYBE in set." Proceed to read the data block. No false negatives: if key was inserted, ALL its bits are 1.' },
  { bits:null, active:KEY_BITS[99], key:99, phase:'query_miss',
    desc:'QUERY key=99 (never inserted). h1(99)=bit 4 ✓, h2(99)=bit 8 ✓, h3(99)=bit 13 ✓. ALL bits happen to be 0. Answer: "DEFINITELY NOT in set." Skip this data block — zero disk reads. True negative.' },
  { bits:null, active:KEY_BITS[27], key:27, phase:'false_pos',
    desc:'QUERY key=27 (never inserted). h1(27)=bit 5 ✓, h2(27)=bit 9 ✓, h3(27)=bit 13 ✓. ALL bits happen to be 1 (set by other keys). FALSE POSITIVE: filter says "maybe" but 27 is not in the set. Data block read happens unnecessarily. At 1% FPR: 1 in 100 absent-key queries triggers a wasted read.' },
];

// Cumulative bit state after each insert
function computeBits(stepIdx) {
  const bits = new Array(BIT_COUNT).fill(0);
  const inserts = [15, 42, 78];
  const n = Math.max(0, stepIdx); // how many insert steps have occurred
  for (let i = 0; i < Math.min(n, 3); i++) {
    KEY_BITS[inserts[i]].forEach(([bit]) => { bits[bit] = 1; });
  }
  return bits;
}

function drawBloom(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const si = Math.max(0, stepIdx);
  const step = BF_STEPS[si];
  const bits = computeBits(si);
  const activeSet = new Set(step.active.map(([b])=>b));

  // Bit array
  const bw = 36, bh = 50, bstartX = 40, bY = 60;
  ctx.fillStyle='#64748B'; ctx.font='700 10px system-ui';
  ctx.fillText(`Bloom filter bit array — ${BIT_COUNT} bits`, bstartX, bY-12);

  for (let i=0; i<BIT_COUNT; i++) {
    const bx = bstartX + i*(bw+4);
    const isActive = activeSet.has(i);
    const activeInfo = step.active.find(([b])=>b===i);
    const hc = activeInfo ? HASH_COLORS[activeInfo[1]] : null;
    const isSet = bits[i] === 1;

    ctx.fillStyle = isActive ? (hc+'44') : isSet ? '#1E3A5F' : '#0A0F1A';
    ctx.strokeStyle = isActive ? hc : isSet ? '#3B82F666' : '#1E293B';
    ctx.lineWidth = isActive ? 2.5 : 1;
    ctx.beginPath(); ctx.roundRect(bx, bY, bw, bh, 4); ctx.fill(); ctx.stroke();

    ctx.fillStyle = isActive ? hc : isSet ? '#60A5FA' : '#334155';
    ctx.font = '700 14px monospace'; ctx.textAlign='center';
    ctx.fillText(isActive ? '1' : isSet ? '1' : '0', bx+bw/2, bY+bh/2+5);

    ctx.fillStyle = '#475569'; ctx.font = '7px system-ui';
    ctx.fillText(i, bx+bw/2, bY+bh+12); ctx.textAlign='left';
  }

  // Hash function arrows
  if (step.key && step.phase !== 'init') {
    step.active.forEach(([bitIdx, hi]) => {
      const bx = bstartX + bitIdx*(bw+4) + bw/2;
      const fromY = 195;
      const col = HASH_COLORS[hi];
      ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.moveTo(bx, bY+bh); ctx.lineTo(bx, fromY+30); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle=col;
      ctx.beginPath(); ctx.moveTo(bx,bY+bh); ctx.lineTo(bx-5,bY+bh+8); ctx.lineTo(bx+5,bY+bh+8); ctx.fill();
    });

    // Hash function labels
    const hashY = 195;
    ctx.fillStyle='#1E293B'; ctx.beginPath(); ctx.roundRect(bstartX, hashY, BIT_COUNT*(bw+4)-4, 80, 6); ctx.fill();
    HASH_COLORS.forEach((col,hi) => {
      const info = step.active.find(([,h])=>h===hi);
      if(!info) return;
      ctx.fillStyle=col; ctx.font='700 9px monospace';
      ctx.fillText(`h${hi+1}(${step.key}) → bit ${info[0]}`, bstartX+12 + hi*220, hashY+20+hi*16);
    });

    // Result badge
    const phaseMap = {
      insert:['INSERT','#F59E0B'],
      query_hit:['MAYBE IN SET (positive)','#10B981'],
      query_miss:['DEFINITELY NOT IN SET','#4F46E5'],
      false_pos:['FALSE POSITIVE — wasted read','#EF4444'],
    };
    const [label,col] = phaseMap[step.phase]||['','#64748B'];
    if(label){
      const font='700 12px system-ui'; ctx.font=font;
      const bww=ctx.measureText(label).width+32;
      ctx.fillStyle=col+'22'; ctx.strokeStyle=col; ctx.lineWidth=2;
      ctx.beginPath(); ctx.roundRect(w/2-bww/2, hashY+50, bww, 28, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle=col; ctx.textAlign='center';
      ctx.fillText(label, w/2, hashY+68); ctx.textAlign='left';
    }
  }

  // Legend
  HASH_COLORS.forEach((col,i)=>{
    ctx.fillStyle=col; ctx.beginPath(); ctx.arc(bstartX+10+i*120, h-68, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#64748B'; ctx.font='9px system-ui';
    ctx.fillText(`h${i+1}(key)`, bstartX+20+i*120, h-64);
  });

  if (stepIdx<0) {
    ctx.fillStyle='#475569'; ctx.font='13px system-ui'; ctx.textAlign='center';
    ctx.fillText('Press Play to animate bloom filter inserts and queries', w/2, h/2+40);
    ctx.textAlign='left';
  } else {
    ctx.fillStyle='#0F172A'; ctx.beginPath(); ctx.roundRect(20, h-52, w-40, 44, 4); ctx.fill();
    const words=step.desc.split(' ');
    let line='', ly=h-36;
    ctx.fillStyle='#94A3B8'; ctx.font='9.5px system-ui';
    words.forEach(wd=>{
      const t=line+(line?' ':'')+wd;
      if(ctx.measureText(t).width>w-50){ctx.fillText(line,28,ly);line=wd;ly+=13;}else line=t;
    });
    if(line) ctx.fillText(line,28,ly);
  }
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag:'Storage Engine · M44', title:'Bloom Filter',
    subtitle:'Probabilistic membership test: no false negatives, tunable false positive rate. Eliminates unnecessary SSTable reads.',
    tabs:[
      { id:'bf',   label:'🌸 Bloom Filter Demo' },
      { id:'math', label:'📐 Math & Tuning' },
      { id:'iq',   label:'💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const tab = container.querySelector('#tab-bf');
  tab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="370" style="width:100%;max-height:370px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="bf-exp">
        <h3>Bloom Filter — Probabilistic Set Membership</h3>
        <p>A bloom filter uses m bits and k hash functions. Insertion sets k bits. Query checks k bits:
           ALL set → "maybe in set" (could be false positive). ANY unset → "definitely not in set" (no false negatives).
           Used in SSTables to skip data block reads when a key is absent.
           Press <strong>Play</strong> to animate inserts, a true negative, and a false positive.</p>
      </div>
    </div>`;
  const canvas = tab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState:{step:-1},
    steps:BF_STEPS.map((s,i)=>({label:i===0?'Init':i<=3?`Insert ${[0,15,42,78][i]}`:`Query ${[15,99,27][i-4]}`, duration:2000, mutate:st=>{st.step=i;}})),
    onRender:state=>{
      drawBloom(ctx, state.step, 800, 370);
      const el=tab.querySelector('#bf-exp');
      if(el&&state.step>=0) el.innerHTML=`<h3>Step ${state.step+1}</h3><p>${BF_STEPS[state.step].desc}</p>`;
    },
  });
  SimulationEngine.renderControls(tab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(tab.querySelector('.canvas-wrap'), engine);
  drawBloom(ctx, -1, 800, 370);
  engine.reset();

  container.querySelector('#tab-math').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Bloom Filter Math and Tuning</div>
        <div class="section-desc">False positive rate formula, optimal k, memory per key</div>
      </div>
      <div class="prose">
        <h3>False Positive Rate Formula</h3>
        <div class="code-block">
FPR ≈ (1 - e^(-kn/m))^k

where:
  m = number of bits
  n = number of elements inserted
  k = number of hash functions

Optimal k (minimizing FPR for given m/n):
  k* = (m/n) × ln(2) ≈ 0.693 × (m/n)

For 1% FPR: m/n ≈ 9.6 bits/element, k* ≈ 6.6 → use k=7
For 0.1% FPR: m/n ≈ 14.4 bits/element, k* ≈ 10

RocksDB default: 10 bits/key → ~1% FPR
  At 350M keys: bloom filter size = 350M × 10 / 8 = 437.5 MB
  (Stored per SSTable file, not as one global filter)
        </div>
        <h3>Per-SSTable vs Partitioned Bloom Filter</h3>
        <div class="code-block">
Per-file filter:
  One bloom filter per SSTable file.
  Size: n_keys_in_file × bits_per_key / 8 bytes.
  Query: load entire filter to check 1 key.

Partitioned/block-level filter (RocksDB default since v5.14):
  One bloom filter per data block (4 KB block → ~200 keys → 250 bytes filter).
  Only load the specific partition needed for a key range.
  Reduces cache footprint: cache only the partition covering the target key.
        </div>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>bits/key</th><th>FPR</th><th>Size (1M keys)</th><th>Use case</th></tr></thead>
          <tbody>
            ${[
              ['6.4','10%','800 KB','High write, low read workloads'],
              ['10','1%','1.25 MB','RocksDB default — general OLTP'],
              ['14.4','0.1%','1.8 MB','Read-heavy, latency-sensitive'],
              ['20','0.01%','2.5 MB','Critical lookup (auth, rate limiting)'],
            ].map(([b,f,s,u])=>`<tr><td>${b}</td><td>${f}</td><td>${s}</td><td>${u}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q:'Explain bloom filters and why they have no false negatives but can have false positives.',
      a:'A bloom filter is an m-bit array with k hash functions, all initialized to 0. Insert key K: compute h1(K), h2(K), ..., hk(K) — each gives a bit index. Set all k bits to 1. Query key Q: compute h1(Q),...,hk(Q). Check each bit. No false negatives: if Q was inserted, all its bits were set to 1 during insertion. So checking those same bits will always find all 1s → "maybe in set." There is NO way to get "definitely not in set" if Q was inserted. False positives: bits can be set to 1 by OTHER keys. If Q was never inserted, it\'s possible that all k bits of Q happen to be 1 because other keys set them. When this happens: filter says "maybe in set" but Q is not — false positive. The false positive rate depends on m, k, and n (number of elements). You can NEVER delete from a basic bloom filter (deleting would clear bits shared with other keys → false negatives would appear). Solution: counting bloom filters (each bit replaced by a counter, can decrement). Used in databases where keys are deleted, e.g., Cassandra\'s row-level bloom filters.',
      tip:'Bloom filters are strictly probabilistic: positive results mean "go check the real data" (with ~1% chance of wasted I/O). Negative results mean "definitely skip this SSTable" (zero I/O). At 350M keys with 10 bits/key → ~437 MB for all bloom filters across a table — easily fits in RocksDB block cache.',
    },
    {
      q:'How does RocksDB use bloom filters to reduce read amplification?',
      a:'Without bloom filters: a point lookup for a non-existent key must check every SSTable at every level. For 5 levels (L0–L4) with 4 L0 files: 4+1+1+1+1 = 8 SSTable files × 1 data block read each = 8 random disk reads. Answer: "key not found." With bloom filters: for each SSTable, before reading any data block, load the filter (typically cached in block cache) and check if the key is "maybe here." For a non-existent key with 1% FPR per filter: probability of at least one filter saying "maybe" on a non-existent key across 8 SSTables = 1-(0.99)^8 ≈ 7.7%. So 92.3% of non-existent key lookups: 0 data block reads (just bloom filter checks). 7.7%: 1 wasted data block read (false positive). Average disk reads for non-existent key: 0 × 0.923 + 1 × 0.077 = 0.077 vs 8 without filters. Read amplification reduced ~100×. RocksDB metric: rocksdb.bloom.filter.useful = number of times bloom filter avoided a data block read. On a read-heavy workload: this should be millions per second.',
      tip:'RocksDB provides per-level bloom filter statistics. Use rocksdb.bloom.filter.full.positive (checked and said "maybe") and rocksdb.bloom.filter.full.true.positive (said "maybe" and key actually existed). The ratio gives empirical FPR: (full_positive - full_true_positive) / full_positive.',
    },
    {
      q:'What is the optimal number of hash functions k for a bloom filter, and why is there a trade-off?',
      a:'Optimal k: k* = (m/n) × ln(2) ≈ 0.693 × (m/n). With m/n = 10 (10 bits per key): k* ≈ 6.9 → use k=7. Trade-off with k: More hash functions (higher k): each insertion sets more bits → filter fills faster → more false positives for the same m/n. But also: each query has more bits to check → bits set by other keys are more likely to ALL be set → higher FPR. Wait, more k checks increases chances of false positive? Yes — the probability that all k bits are 1 by accident goes up if k is too large. Also: more hash function evaluations = more CPU per lookup. Fewer hash functions (lower k): fewer bits set per insertion → filter fills slower → less false positive risk per individual bit check. But fewer checks means less discrimination between "in set" and "not in set." The optimal k minimizes FPR by balancing fill rate vs discrimination. This is why k* ≈ 0.693 × (m/n) — it\'s the minimum of the FPR function with respect to k. In practice: k=6 or k=7 is used for 10 bits/key setups. RocksDB uses k=6 by default.',
      tip:'Increasing bloom_filter_bits_per_key in RocksDB from 10 to 14.4 reduces FPR from 1% to 0.1% — 10× fewer false positive data block reads at the cost of 44% more filter memory. Worth it for read-heavy workloads like product catalog lookup on Amazon Prime Day.',
    },
  ]);
  initIQ(container);
  return () => engine.destroy();
}
