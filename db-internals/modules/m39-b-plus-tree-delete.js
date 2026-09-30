import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Phase A: initial — simple delete (no underflow)
// root[30,60]: l1=[10,20,30], l2=[40,50,60], l3=[70,80]
const PHASE_A = {
  nodes:[
    { id:'root', keys:[30,60],    x:400, y:60,  type:'internal', color:'#4F46E5' },
    { id:'l1',   keys:[10,20,30], x:200, y:200, type:'leaf', color:'#10B981' },
    { id:'l2',   keys:[40,50,60], x:400, y:200, type:'leaf', color:'#10B981' },
    { id:'l3',   keys:[70,80],    x:600, y:200, type:'leaf', color:'#10B981' },
  ],
  edges:[['root','l1'],['root','l2'],['root','l3']],
};

// Phase B: after simple delete of 50 — l2=[40,60]
const PHASE_B = {
  nodes:[
    { id:'root', keys:[30,60],    x:400, y:60,  type:'internal', color:'#4F46E5' },
    { id:'l1',   keys:[10,20,30], x:200, y:200, type:'leaf', color:'#10B981' },
    { id:'l2',   keys:[40,60],    x:400, y:200, type:'leaf', color:'#10B981' },
    { id:'l3',   keys:[70,80],    x:600, y:200, type:'leaf', color:'#10B981' },
  ],
  edges:[['root','l1'],['root','l2'],['root','l3']],
};

// Phase C: l3=[80] underflow — borrow from l2=[40,60]
// After borrow: l2=[40], l3=[60,80], root separator updated to 60
const PHASE_C = {
  nodes:[
    { id:'root', keys:[30,60],    x:400, y:60,  type:'internal', color:'#4F46E5' },
    { id:'l1',   keys:[10,20,30], x:200, y:200, type:'leaf', color:'#10B981' },
    { id:'l2',   keys:[40,60],    x:400, y:200, type:'leaf', color:'#10B981' },
    { id:'l3',   keys:[80],       x:600, y:200, type:'leaf', color:'#EF4444', underflow:true },
  ],
  edges:[['root','l1'],['root','l2'],['root','l3']],
};

// Phase D: after borrow — l2=[40], l3=[60,80], root separator for l3 boundary = 60
const PHASE_D = {
  nodes:[
    { id:'root', keys:[30,60],    x:400, y:60,  type:'internal', color:'#4F46E5' },
    { id:'l1',   keys:[10,20,30], x:200, y:200, type:'leaf', color:'#10B981' },
    { id:'l2',   keys:[40],       x:400, y:200, type:'leaf', color:'#10B981' },
    { id:'l3',   keys:[60,80],    x:600, y:200, type:'leaf', color:'#10B981', borrowed:true },
  ],
  edges:[['root','l1'],['root','l2'],['root','l3']],
};

const STEPS = [
  { ph:'A', hi:[],           desc:'Delete operations on a B+ tree. Initial tree: root[30,60] with three leaf children. Minimum keys per leaf = 1 for this demo. Max = 3.' },
  { ph:'A', hi:['root','l2'],desc:'Delete key=50. Navigate: root — 50 ≥ 30 and 50 < 60 → middle child l2=[40,50,60]. Found key=50. Remove it. l2 still has 2 keys ≥ minimum. No structural change needed.' },
  { ph:'B', hi:['l2'],       desc:'Simple delete complete. l2=[40,60]. Key=50 is gone. The separator keys in root (30,60) are NOT changed — they remain valid routing separators even though 50 no longer exists as a leaf key. Root routing keys can be "stale" as long as they partition key space correctly.' },
  { ph:'C', hi:['root','l3'],desc:'Now delete key=70 from l3=[70,80]. Navigate: root — 70 ≥ 60 → l3. Delete 70 → l3=[80]. Only 1 key remains. At minimum — valid for now. But next: delete key=80.' },
  { ph:'C', hi:['l3'],       desc:'Delete key=80. l3=[80] → l3=[]. UNDERFLOW: 0 keys, below minimum of 1. Must fix. Option 1: borrow a key from a sibling. Option 2: merge with a sibling. Check left sibling l2=[40,60]: has 2 keys (> minimum). Can borrow!' },
  { ph:'D', hi:['l2','l3','root'], desc:'BORROW from left sibling: last key of l2 (60) moves to l3. l2=[40], l3=[60,80]? Wait — we deleted 80 so l3=[60]. Root separator between l2 and l3 updated to 60 (first key of l3). 2 page writes: l2 + l3. No new page allocated.' },
  { ph:'D', hi:[],           desc:'Final state after redistribute. l2=[40], l3=[60], root[30,60] — routing is still correct. No pages deleted. PostgreSQL never immediately removes empty pages; VACUUM reclaims them later. The tree remains balanced.' },
];

function getState(ph) { return {A:PHASE_A,B:PHASE_B,C:PHASE_C,D:PHASE_D}[ph]; }

function drawDelete(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const step = STEPS[Math.max(0, stepIdx)];
  const state = getState(step.ph);
  const hiSet = new Set(step.hi);

  state.edges.forEach(([a,b]) => {
    const na=state.nodes.find(n=>n.id===a), nb=state.nodes.find(n=>n.id===b);
    const act=hiSet.has(a)||hiSet.has(b);
    ctx.strokeStyle=act?'#4F46E5':'#334155'; ctx.lineWidth=act?2.5:1;
    ctx.beginPath(); ctx.moveTo(na.x, na.y+22); ctx.lineTo(nb.x, nb.y-22); ctx.stroke();
  });

  // Leaf chain arrows
  const chain = state.nodes.filter(n=>n.type==='leaf').map(n=>n.id);
  for (let i=0; i<chain.length-1; i++) {
    const na=state.nodes.find(n=>n.id===chain[i]), nb=state.nodes.find(n=>n.id===chain[i+1]);
    ctx.strokeStyle='#1E293B'; ctx.lineWidth=1; ctx.setLineDash([3,4]);
    const x1=na.x+(na.keys.length*50+16)/2, x2=nb.x-(nb.keys.length*50+16)/2;
    ctx.beginPath(); ctx.moveTo(x1, na.y+5); ctx.lineTo(x2, nb.y+5); ctx.stroke();
    ctx.setLineDash([]);
  }

  state.nodes.forEach(n => {
    const isHi=hiSet.has(n.id);
    const nodeW=n.keys.length*50+16, nodeH=44;
    const nx=n.x-nodeW/2, ny=n.y-nodeH/2;
    const col = n.underflow ? '#EF4444' : n.borrowed ? '#F59E0B' : n.color;
    ctx.fillStyle=isHi?col+'33':'#0A0F1A';
    ctx.strokeStyle=isHi?col:(n.underflow?'#EF444466':n.borrowed?'#F59E0B66':'#1E293B');
    ctx.lineWidth=isHi?2.5:n.underflow||n.borrowed?1.5:1;
    ctx.beginPath(); ctx.roundRect(nx,ny,nodeW,nodeH,6); ctx.fill(); ctx.stroke();

    n.keys.forEach((k,ki)=>{
      if (ki>0){ctx.strokeStyle='#1E293B';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(nx+ki*50,ny+4);ctx.lineTo(nx+ki*50,ny+nodeH-4);ctx.stroke();}
      ctx.fillStyle=isHi?col:'#475569';
      ctx.font=(isHi?'700':'400')+' 12px system-ui'; ctx.textAlign='center';
      ctx.fillText(k, nx+ki*50+25, ny+nodeH/2-2);
      if (n.type==='leaf'){ctx.fillStyle=isHi?'#F59E0B':'#334155';ctx.font='7px system-ui';ctx.fillText('TID',nx+ki*50+25,ny+nodeH/2+10);}
      ctx.textAlign='left';
    });

    const label = n.underflow ? 'UNDERFLOW' : n.borrowed ? 'BORROWED INTO' : n.id;
    ctx.fillStyle=isHi?col:(n.underflow?'#EF4444':n.borrowed?'#F59E0B':'#334155');
    ctx.font=(n.underflow||n.borrowed?'700':'400')+' 8px system-ui';
    ctx.textAlign='center'; ctx.fillText(label, n.x, ny+nodeH+12); ctx.textAlign='left';
  });

  if (stepIdx < 0) {
    ctx.fillStyle='#475569'; ctx.font='13px system-ui'; ctx.textAlign='center';
    ctx.fillText('Press Play to animate B+ Tree delete and redistribute', w/2, h/2);
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
    tag:'Storage Engine · M39', title:'B+ Tree Delete',
    subtitle:'Delete, underflow detection, redistribute from sibling, and merge operations.',
    tabs:[
      { id:'del',  label:'🗑️ Delete Animation' },
      { id:'ops',  label:'🔄 Delete Operations' },
      { id:'iq',   label:'💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const tab = container.querySelector('#tab-del');
  tab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="330" style="width:100%;max-height:330px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="del-exp">
        <h3>B+ Tree Delete — Three Outcomes</h3>
        <p>Deleting a key from a B+ tree has three possible outcomes: (1) simple delete (leaf still has ≥ minimum keys),
           (2) redistribute from a sibling (sibling has extra keys to spare), (3) merge with a sibling (sibling at minimum too).
           Press <strong>Play</strong> to see simple delete and redistribute scenarios.</p>
      </div>
    </div>`;
  const canvas = tab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState:{step:-1},
    steps:STEPS.map((s,i)=>({label:`Step ${i+1}`, duration:2200, mutate:st=>{st.step=i;}})),
    onRender:state=>{
      drawDelete(ctx, state.step, 800, 330);
      const el=tab.querySelector('#del-exp');
      if(el&&state.step>=0) el.innerHTML=`<h3>Step ${state.step+1}</h3><p>${STEPS[state.step].desc}</p>`;
    },
  });
  SimulationEngine.renderControls(tab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(tab.querySelector('.canvas-wrap'), engine);
  drawDelete(ctx, -1, 800, 330);
  engine.reset();

  container.querySelector('#tab-ops').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Three Delete Scenarios</div>
        <div class="section-desc">How B+ tree handles underflow: redistribute vs merge</div>
      </div>
      <div class="prose">
        <h3>Redistribute (Borrow from Sibling)</h3>
        <div class="code-block">
Condition: leaf L underflows AND sibling S has > minimum keys.

Action:
  Left redistribute:  Last key of L_left  moves to L. Parent separator updated.
  Right redistribute: First key of L_right moves to L. Parent separator updated.

Cost: 2 page writes (L + sibling) + 1 parent write = 3 writes.
No new pages allocated. No pages freed.
        </div>
        <h3>Merge (Coalesce)</h3>
        <div class="code-block">
Condition: leaf L underflows AND ALL siblings are also at minimum.

Action:
  Merge L with one sibling S → combined page (guaranteed to fit since both ≤ d keys).
  Pull down separator key from parent (parent loses a key + pointer).
  Update sibling pointers: predecessor of L now points to S (or vice versa).
  If parent now underflows → merge propagates upward (recursive).

Cost: 2 page writes + parent writes up the path. One page freed.
Cascade to root: root can become empty → delete root → height decreases by 1.
        </div>
        <h3>PostgreSQL's Lazy Approach</h3>
        <p>PostgreSQL does NOT immediately merge underflowing pages. It marks them as "half-empty"
           and VACUUM later reclaims them. This avoids expensive cascade merges during DELETE-heavy
           workloads and prevents locking upper tree levels. Result: after heavy deletes, the index
           has many half-full pages — this is "index bloat." REINDEX or pg_repack rebuilds the
           index compactly.</p>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Scenario</th><th>Algorithm</th><th>Page Writes</th><th>Pages Freed</th></tr></thead>
          <tbody>
            ${[
              ['Simple delete','Remove key from leaf','1','0'],
              ['Redistribute','Borrow from sibling + update parent','3','0'],
              ['Merge two leaves','Combine + update parent','2 + parent','1'],
              ['Merge cascade to root','Root empties → delete root','O(height)','O(height)'],
              ['PostgreSQL DELETE','Mark as dead tuple only','1 (WAL only)','0'],
            ].map(([s,a,pw,pf])=>`<tr><td><strong>${s}</strong></td><td>${a}</td><td>${pw}</td><td>${pf}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q:'What are the three possible outcomes when you delete a key from a B+ tree leaf?',
      a:'(1) Simple delete (no underflow): the leaf has more than the minimum number of keys after deletion. Just remove the key and rewrite the leaf page. 1 page write + WAL. The parent separator key may become "stale" (the deleted key might have been a separator) — PostgreSQL leaves stale separators because they still correctly partition the key space. (2) Redistribute (borrow from sibling): the leaf drops below minimum keys, but a sibling leaf has more than the minimum. "Borrow" a key: for a right-borrow, take the first key of the right sibling and move it to the underflowing leaf. Update the parent separator between these two leaves to the new boundary. 3 page writes (underflowing leaf + sibling + parent). (3) Merge (coalesce): the leaf drops below minimum AND all siblings are also at minimum (cannot spare a key). Merge the underflowing leaf with one sibling. The merged page fits (sum of two minimum-size pages ≤ max page). Pull the separator from the parent — parent loses a key. If parent underflows, recurse upward. Height can decrease (root split reversed). In PostgreSQL: the merge path is largely avoided — deleted tuples are marked as dead and VACUUM later reclaims the space.',
      tip:'PostgreSQL avoids the cascade-merge path for B+ tree indexes. Empty pages after deletes are left half-empty and reclaimed during VACUUM. This trades index space (bloat) for lower DELETE latency and no lock contention on parent pages.',
    },
    {
      q:'After DELETE-heavy workloads, why does a PostgreSQL index become bloated and how do you fix it?',
      a:'PostgreSQL DELETE marks heap tuples as dead (sets t_xmax) but does NOT immediately remove them from the B+ tree index. The index still has entries pointing to dead heap tuples — these are called "dead index tuples." VACUUM performs two tasks: (1) Heap vacuuming: marks dead tuples as free space and updates the Visibility Map. (2) Index vacuuming: removes index entries pointing to dead heap tuples, freeing leaf page space. Without VACUUM: index leaf pages accumulate dead entries → pages become full → more splits → index grows → higher height → slower searches. With VACUUM: dead entries removed → pages may become sparse → some pages become nearly empty but are NOT merged (lazy approach). After sustained DELETE+INSERT cycles, many pages are half-full → "index bloat." Detection: SELECT pg_size_pretty(pg_total_relation_size(\'orders_pkey\'::regclass)). Fix: REINDEX INDEX CONCURRENTLY orders_pkey (rebuilds compactly, allows reads/writes during rebuild). Or pg_repack extension (online, no table lock). Warning: REINDEX INDEX (without CONCURRENTLY) takes an exclusive lock on the index — blocks all reads.',
      tip:'pg_stat_user_indexes view: idx_tup_read counts tuples fetched through the index; idx_tup_fetch counts live tuples actually returned. If (idx_tup_read - idx_tup_fetch) is large, many index reads are hitting dead tuples — time for VACUUM or REINDEX.',
    },
    {
      q:'Can a B+ tree shrink in height, and if so, how?',
      a:'Yes — a B+ tree can shrink in height when the root becomes empty after a cascade merge. The chain of events: (1) Delete from a leaf causes underflow. (2) Merge with sibling: parent internal node loses a separator key. (3) Parent internal node now has 0 keys (was a leaf of the internal tree). (4) If this was the root, the root is now empty. (5) Delete the empty root. The root\'s single remaining child becomes the new root. Height decreases by 1. This only happens when nearly all data has been deleted (tree almost empty). In practice: PostgreSQL avoids cascade merges for B+ tree indexes — instead, it marks internal nodes as "half-dead" and performs lazy cleanup during VACUUM. A PostgreSQL index typically does NOT shrink in height after deletes until REINDEX. Detection: EXPLAIN shows actual B+ tree height via "Index Cond" in the plan tree — or inspect pg_am and pg_index statistics. The height only truly decreases after REINDEX rebuilds the tree from scratch.',
      tip:'Tree height ONLY increases when a root splits (insert path) and ONLY decreases when the root empties (delete/merge cascade path). These events happen O(log N) times over the index lifetime — extremely rare.',
    },
  ]);
  initIQ(container);
  return () => engine.destroy();
}
