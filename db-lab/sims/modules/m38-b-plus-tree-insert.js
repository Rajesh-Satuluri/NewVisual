import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Pre-split state: root[40], l1(FULL)=[10,20,30], l2=[40,60,70]
const PRE = {
  nodes:[
    { id:'root', keys:[40],        x:400, y:60,  type:'internal', color:'#4F46E5' },
    { id:'l1',   keys:[10,20,30],  x:220, y:200, type:'leaf', color:'#EF4444', full:true },
    { id:'l2',   keys:[40,60,70],  x:580, y:200, type:'leaf', color:'#10B981' },
  ],
  edges:[['root','l1'],['root','l2']],
};
// Post-split state: root[25,40], l1a=[10,20], l1b=[25,30](new), l2=[40,60,70]
const POST = {
  nodes:[
    { id:'root2', keys:[25,40],      x:400, y:60,  type:'internal', color:'#4F46E5' },
    { id:'l1a',   keys:[10,20],      x:190, y:200, type:'leaf', color:'#10B981' },
    { id:'l1b',   keys:[25,30],      x:390, y:200, type:'leaf', color:'#A78BFA', isNew:true },
    { id:'l2',    keys:[40,60,70],   x:600, y:200, type:'leaf', color:'#10B981' },
  ],
  edges:[['root2','l1a'],['root2','l1b'],['root2','l2']],
};

const STEPS = [
  { phase:'pre',  hi:[],          badge:null,          desc:'Insert key=25 into B+ Tree. root[40] with two leaf children. l1=[10,20,30] is FULL (3/3, capacity exceeded). l2=[40,60,70]. Must find correct leaf by descending tree.' },
  { phase:'pre',  hi:['root'],    badge:'25 < 40 → L', desc:'Descend from root. Key=25 < 40, follow left child pointer to leaf l1.' },
  { phase:'pre',  hi:['root','l1'], badge:'FULL — must split', desc:'Leaf l1=[10,20,30] is at capacity. Cannot insert 25. PostgreSQL allocates a new page from the Free Space Map before the insert can proceed.' },
  { phase:'pre',  hi:['l1'],      badge:'SPLIT l1',    desc:'SPLIT: divide l1 in half. Left half [10,20] stays in the existing page. Right half starts at insertion point: [25,30]. Key=25 (first key of right half) is COPIED UP to the parent as a new separator.' },
  { phase:'post', hi:['root2','l1b'], badge:'Key 25 promoted', desc:'Root updated: [25,40]. Separator 25 routes keys 25–39 to new leaf l1b=[25,30]. l1a=[10,20] handles keys < 25. New page l1b is allocated from free space and initialized.' },
  { phase:'post', hi:['l1a','l1b'], badge:'Siblings linked', desc:'Sibling pointers updated. btpo_next of l1a → l1b. btpo_next of l1b → l2. Range scans through this region work correctly via the updated chain: l1a → l1b → l2.' },
  { phase:'post', hi:[],          badge:null,          desc:'Final state. 3 page writes: l1a (updated), l1b (new page), root (new separator). WAL records written before data pages. Most inserts are simple leaf writes — splits are infrequent (roughly 1 split per page-full-of-inserts).' },
];

function drawInsert(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const step = STEPS[Math.max(0, stepIdx)];
  const state = step.phase === 'pre' ? PRE : POST;
  const hiSet = new Set(step.hi);

  state.edges.forEach(([a,b]) => {
    const na=state.nodes.find(n=>n.id===a), nb=state.nodes.find(n=>n.id===b);
    const act = hiSet.has(a)||hiSet.has(b);
    ctx.strokeStyle = act ? '#4F46E5' : '#334155'; ctx.lineWidth = act ? 2.5 : 1;
    ctx.beginPath(); ctx.moveTo(na.x, na.y+22); ctx.lineTo(nb.x, nb.y-22); ctx.stroke();
  });

  // Sibling chain arrows in post state
  if (step.phase === 'post') {
    const chain = ['l1a','l1b','l2'];
    for (let i=0; i<chain.length-1; i++) {
      const na=POST.nodes.find(n=>n.id===chain[i]), nb=POST.nodes.find(n=>n.id===chain[i+1]);
      const act = hiSet.has(chain[i])||hiSet.has(chain[i+1]);
      ctx.strokeStyle = act ? '#10B981' : '#10B98133'; ctx.lineWidth = act ? 2 : 1;
      ctx.setLineDash([5,3]);
      const x1=na.x+(na.keys.length*50+16)/2, x2=nb.x-(nb.keys.length*50+16)/2;
      ctx.beginPath(); ctx.moveTo(x1, na.y+6); ctx.lineTo(x2, nb.y+6); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = act ? '#10B981' : '#10B98166';
      ctx.font='10px system-ui'; ctx.textAlign='center';
      ctx.fillText('→', (x1+x2)/2, na.y+9); ctx.textAlign='left';
    }
  }

  state.nodes.forEach(n => {
    const isHi = hiSet.has(n.id);
    const nodeW = n.keys.length*50+16, nodeH=44;
    const nx=n.x-nodeW/2, ny=n.y-nodeH/2;
    const baseColor = n.full ? '#EF4444' : (n.isNew ? '#7C3AED' : n.color);
    ctx.fillStyle = isHi ? baseColor+'33' : '#0A0F1A';
    ctx.strokeStyle = isHi ? baseColor : (n.full ? '#EF444466' : n.isNew ? '#7C3AED66' : '#1E293B');
    ctx.lineWidth = isHi ? 2.5 : n.full||n.isNew ? 1.5 : 1;
    ctx.beginPath(); ctx.roundRect(nx, ny, nodeW, nodeH, 6); ctx.fill(); ctx.stroke();

    n.keys.forEach((k,ki) => {
      if (ki>0) {
        ctx.strokeStyle='#1E293B'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(nx+ki*50, ny+4); ctx.lineTo(nx+ki*50, ny+nodeH-4); ctx.stroke();
      }
      ctx.fillStyle = isHi ? baseColor : '#475569';
      ctx.font=(isHi?'700':'400')+' 12px system-ui'; ctx.textAlign='center';
      ctx.fillText(k, nx+ki*50+25, ny+nodeH/2-2);
      if (n.type==='leaf') {
        ctx.fillStyle = isHi ? '#F59E0B' : '#334155'; ctx.font='7px system-ui';
        ctx.fillText('TID', nx+ki*50+25, ny+nodeH/2+10);
      }
      ctx.textAlign='left';
    });

    const label = n.full ? 'FULL' : n.isNew ? 'NEW PAGE' : n.id;
    ctx.fillStyle = isHi ? baseColor : (n.full ? '#EF4444' : n.isNew ? '#7C3AED' : '#334155');
    ctx.font = (n.full||n.isNew ? '700' : '400') + ' 8px system-ui';
    ctx.textAlign='center'; ctx.fillText(label, n.x, ny+nodeH+12); ctx.textAlign='left';
  });

  if (step.badge && stepIdx >= 0) {
    ctx.font='700 11px system-ui'; ctx.textAlign='center';
    const bw=ctx.measureText(step.badge).width+24;
    ctx.fillStyle='#F59E0B22'; ctx.strokeStyle='#F59E0B'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.roundRect(w/2-bw/2, 8, bw, 24, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#F59E0B'; ctx.fillText(step.badge, w/2, 24); ctx.textAlign='left';
  }

  if (stepIdx < 0) {
    ctx.fillStyle='#475569'; ctx.font='13px system-ui'; ctx.textAlign='center';
    ctx.fillText('Press Play to animate B+ Tree insert and leaf split', w/2, h/2);
    ctx.textAlign='left';
  } else {
    ctx.fillStyle='#0F172A'; ctx.beginPath(); ctx.roundRect(20, h-52, w-40, 44, 4); ctx.fill();
    const words=step.desc.split(' ');
    let line='', ly=h-36;
    ctx.fillStyle='#94A3B8'; ctx.font='9.5px system-ui';
    words.forEach(wd => {
      const t=line+(line?' ':'')+wd;
      if (ctx.measureText(t).width>w-50){ctx.fillText(line,28,ly);line=wd;ly+=13;}else line=t;
    });
    if (line) ctx.fillText(line, 28, ly);
  }
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag:'Storage Engine · M38', title:'B+ Tree Insert',
    subtitle:'Leaf insert, overflow detection, page split, and separator key promotion to parent.',
    tabs:[
      { id:'ins',   label:'➕ Insert Animation' },
      { id:'mech',  label:'⚙️ Split Mechanics' },
      { id:'iq',    label:'💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const tab = container.querySelector('#tab-ins');
  tab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="340" style="width:100%;max-height:340px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="ins-exp">
        <h3>B+ Tree Insert — Navigate, Insert, Split if Needed</h3>
        <p>Most inserts are simple leaf writes (O(log N) to find the leaf + 1 page write).
           When a leaf is full, it splits: allocate a new page, divide keys, and promote the
           first key of the right half to the parent. Press <strong>Play</strong> to animate inserting key=25 into a full leaf.</p>
      </div>
    </div>`;
  const canvas = tab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState:{step:-1},
    steps:STEPS.map((s,i)=>({label:`Step ${i+1}`, duration:2200, mutate:st=>{st.step=i;}})),
    onRender:state=>{
      drawInsert(ctx, state.step, 800, 340);
      const el=tab.querySelector('#ins-exp');
      if (el&&state.step>=0) el.innerHTML=`<h3>Step ${state.step+1}</h3><p>${STEPS[state.step].desc}</p>`;
    },
  });
  SimulationEngine.renderControls(tab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(tab.querySelector('.canvas-wrap'), engine);
  drawInsert(ctx, -1, 800, 340);
  engine.reset();

  container.querySelector('#tab-mech').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Leaf Split Mechanics</div>
        <div class="section-desc">What PostgreSQL does when a leaf page overflows</div>
      </div>
      <div class="prose">
        <h3>Split Algorithm (Copy-Up)</h3>
        <div class="code-block">
When leaf L with 2d keys overflows on insert of key K:
1. Allocate new page R from Free Space Map (FSM)
2. Sort all 2d+1 keys (existing + K) into a temporary array
3. Left half  [0 .. d-1] stays in L  (L is updated in place)
4. Right half [d .. 2d] goes to R  (new page R)
5. COPY-UP: first key of R (= key at index d) is inserted into parent
   as a new separator pointing to R
6. Update sibling pointers:
     R.btpo_next = L.btpo_next
     L.btpo_next = R
     R.btpo_prev = L
     (R.btpo_next).btpo_prev = R  (if successor exists)
7. WAL: XLOG_BTREE_SPLIT record covers all 3–4 page changes atomically
        </div>
        <h3>Fill Factor and Split Frequency</h3>
        <p>PostgreSQL B+ Tree pages default to <code>fillfactor=90</code> (leaf pages are only
           filled to 90%). The 10% slack is reserved for in-place updates (HOT updates).
           A page at 90% capacity can absorb ~50 more 16-byte keys before splitting.
           Lower fillfactor = fewer splits but more disk space used.</p>
        <div class="code-block">
-- Create index with lower fill factor for write-heavy column
CREATE INDEX idx_orders_created ON orders(created_at)
  WITH (fillfactor = 70);

-- Check index bloat
SELECT relname, pg_size_pretty(pg_total_relation_size(oid))
FROM pg_class WHERE relkind = 'i' ORDER BY pg_total_relation_size(oid) DESC;
        </div>
      </div>
      <div class="info-grid">
        ${[
          { label:'WAL atomicity',     color:'#4F46E5', desc:'A leaf split writes 3–4 pages (old leaf, new leaf, parent, possibly grandparent). PostgreSQL writes a single WAL record XLOG_BTREE_SPLIT that covers all changed pages. Crash recovery replays the record atomically — no partial split state persists.' },
          { label:'Page locks during split', color:'#F59E0B', desc:'PostgreSQL acquires an exclusive lock on the splitting leaf and a write lock on the parent. Other readers of sibling leaves are unaffected. Lock is held for the duration of the split (~microseconds). This is why index splits don\'t cause visible latency spikes at normal insert rates.' },
          { label:'Rightmost insert optimization', color:'#10B981', desc:'Monotonically increasing keys (serial, timestamps) always insert into the rightmost leaf. PostgreSQL detects this pattern and does a "fastpath" insert: only lock the rightmost page, no tree descent needed. INSERT performance for auto-increment primary keys is 3–5× faster than random-key inserts.' },
          { label:'Root split creates new root',   color:'#06B6D4', desc:'When the root page itself is full, a split creates a NEW root with one separator key and two children (the two halves of the old root). Tree height increases by 1. This only happens log_d(N) times over the life of the index — extremely rare.' },
        ].map(e=>`
          <div class="info-card" style="border-color:${e.color}33">
            <div style="font-weight:700;font-size:11px;color:${e.color};margin-bottom:6px">${e.label}</div>
            <div class="info-card-body">${e.desc}</div>
          </div>`).join('')}
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q:'Describe exactly what happens when a B+ tree leaf page overflows during an INSERT.',
      a:'When a leaf L at maximum capacity receives a new key K: (1) Allocate a new page R from the Free Space Map (free pages tracked by FSM). (2) Sort the 2d+1 keys (2d existing + K). (3) Left half [0..d-1] stays in L — L is updated in place. (4) Right half [d..2d] goes to R — R is a fresh page. (5) "Copy-up": the first key of R (the boundary key) is inserted into the parent internal node as a new separator. (6) Sibling pointers: R.btpo_next = old L.btpo_next; L.btpo_next = R; R.btpo_prev = L — this maintains the leaf linked list for range scans. (7) WAL: XLOG_BTREE_SPLIT covers all dirty pages. On crash recovery, the split is replayed atomically. Total pages written: 2 (L + R) + 1 (parent) + possibly more if parent also splits (cascade). Cost: O(tree height) writes in the worst case (cascading splits), O(1) in the typical case (parent has space).',
      tip:'"Copy-up" = the boundary key appears in both the leaf (right half) AND the parent. This differs from B-Tree "push-up" where the key is only in the parent. In B+ Tree, the key stays in the leaf because leaves hold the definitive data.',
    },
    {
      q:'What is "monotonic insert optimization" and why is it critical for primary keys?',
      a:'PostgreSQL detects when a B+ Tree is receiving monotonically increasing keys (auto-increment integer, BIGSERIAL, timestamps with high cardinality). The optimization: (1) The target page is always the rightmost leaf — no tree descent needed. (2) PostgreSQL caches a "fastpath" pointer to the rightmost leaf page. (3) Only one lock is needed (on the rightmost leaf) instead of the usual read-locks on internal nodes. Result: INSERT throughput for serial primary keys is 3–5× higher than for random UUIDs. At Amazon scale: an orders table with BIGINT GENERATED ALWAYS AS IDENTITY (serial) handles 500K INSERTs/sec on a single NVMe node. The same table with UUID primary keys maxes out at ~100K INSERTs/sec due to random tree traversal and cache-busting (random page reads). Recommendation: use BIGINT GENERATED ALWAYS AS IDENTITY over UUID for high-write OLTP tables. If UUID is required for global uniqueness, consider UUID v7 (timestamp-prefixed) which maintains monotonic ordering.',
      tip:'pg_stat_user_indexes.idx_tup_fetch counts tuple fetches via the index. High idx_blks_hit vs idx_blks_read shows how well index pages are cached. For a write-heavy table, idx_blks_read spiking under load indicates random page access (UUID keys) hitting cold cache.',
    },
    {
      q:'Does a B+ tree leaf split require locking the entire index? How does PostgreSQL handle concurrent inserts during a split?',
      a:'No, PostgreSQL uses fine-grained locking — only the affected pages are locked during a split, not the entire index. Protocol: (1) Acquire an exclusive lock on the splitting leaf L. (2) Acquire a write lock on the parent internal node (to insert the new separator). (3) Allocate and write new page R. (4) Flush WAL. (5) Release all locks. Other sessions reading different leaves of the same index are completely unaffected — their shared page locks on other leaves are never contested. For highly concurrent inserts to the same leaf (all threads racing to insert into the same hotspot page): this is the "rightmost insert" pattern — only one split happens while the first thread holds the exclusive leaf lock; others wait a few microseconds. After the split, the new rightmost leaf has free space and subsequent inserts proceed without another split. Contrast with row-level locking for heap writes: B+ tree page locking is coarser (page-level) but contention only occurs on the exact page being split, which is milliseconds at most.',
      tip:'EXPLAIN (ANALYZE, BUFFERS) shows "Buffers: shared hit=N read=M written=K". A high "written" count during normal reads (not CHECKPOINT) indicates a lot of B+ tree page splits — consider increasing fillfactor or batching inserts.',
    },
  ]);
  initIQ(container);
  return () => engine.destroy();
}
