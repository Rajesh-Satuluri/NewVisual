import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Animation: root-leaf [10,20,30] (height=1, single node, FULL)
// Insert 25 → must split → new root [25] with two children → height=2

const H1_NODE  = { id:'root', keys:[10,20,30], x:400, y:120, type:'leaf',     color:'#EF4444', full:true };
const H2_NODES = [
  { id:'newroot', keys:[25],     x:400, y:60,  type:'internal', color:'#4F46E5', isNew:true },
  { id:'left',    keys:[10,20],  x:240, y:200, type:'leaf',     color:'#10B981' },
  { id:'right',   keys:[25,30],  x:560, y:200, type:'leaf',     color:'#A78BFA', isNew:true },
];
const H2_EDGES = [['newroot','left'],['newroot','right']];

// Intermediate: showing the split in progress
const SPLIT_LEFT  = { id:'split_l', keys:[10,20],  x:240, y:120, type:'leaf', color:'#10B981' };
const SPLIT_RIGHT = { id:'split_r', keys:[25,30],  x:560, y:120, type:'leaf', color:'#A78BFA', isNew:true };

const STEPS = [
  { mode:'h1', hi:[], badge:null,
    desc:'Root-split scenario: a single-node B+ tree (height=1) where the root IS a leaf. Keys [10,20,30] — at maximum capacity. This is also the starting state for any new index (single leaf node = root).' },
  { mode:'h1', hi:['root'], badge:'INSERT 25 — no room',
    desc:'Insert key=25. There is no room — the root-leaf is full. We cannot just insert into the root. A root split is required. This is the only event that increases tree height.' },
  { mode:'split', hi:['split_l','split_r'], badge:'SPLIT: allocate 2 new pages',
    desc:'Split the root-leaf. All 4 keys [10,20,25,30] sorted. Left half [10,20] goes to a new page. Right half [25,30] goes to another new page. Boundary key=25 (first key of right page) will become the new root\'s separator.' },
  { mode:'h2_forming', hi:['newroot','left','right'], badge:'New root created',
    desc:'Allocate a new root page with one separator key [25]. Root points left → [10,20], right → [25,30]. Old root-leaf page is reused as one of the children. Height increased from 1 to 2.' },
  { mode:'h2', hi:['newroot'], badge:'Height = 2',
    desc:'Final state. New root [25] with two leaf children. The tree grew taller. Height = 2. This root split is the ONLY way tree height increases. In a 350M-row table, height has increased exactly 3–4 times since the first insert.' },
  { mode:'h2', hi:['left','right'], badge:'Sibling chain updated',
    desc:'Left leaf → right leaf via btpo_next pointer. Leaf chain: [10,20] → [25,30]. Future range scans can still traverse the chain. 3 page writes total: 2 leaf pages + 1 new root page. WAL covers all atomically.' },
  { mode:'h2', hi:[], badge:null,
    desc:'Tree now at height=2 ready for future inserts. The new root has one key and room for more separators. Next split at root level would create a height=3 tree. Height grows very slowly — O(log_d N) splits over the entire index lifetime.' },
];

function drawRootSplit(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const step = STEPS[Math.max(0, stepIdx)];
  const hiSet = new Set(step.hi);

  function drawNode(n) {
    const isHi=hiSet.has(n.id);
    const nodeW=n.keys.length*56+16, nodeH=44;
    const nx=n.x-nodeW/2, ny=n.y-nodeH/2;
    const col = n.full ? '#EF4444' : n.isNew ? '#7C3AED' : n.color;
    ctx.fillStyle=isHi?col+'33':'#0A0F1A';
    ctx.strokeStyle=isHi?col:(n.full?'#EF444466':n.isNew?'#7C3AED66':'#1E293B');
    ctx.lineWidth=isHi?2.5:n.full||n.isNew?1.5:1;
    ctx.beginPath(); ctx.roundRect(nx,ny,nodeW,nodeH,6); ctx.fill(); ctx.stroke();

    n.keys.forEach((k,ki)=>{
      if(ki>0){ctx.strokeStyle='#1E293B';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(nx+ki*56,ny+4);ctx.lineTo(nx+ki*56,ny+nodeH-4);ctx.stroke();}
      ctx.fillStyle=isHi?col:'#475569';
      ctx.font=(isHi?'700':'400')+' 13px system-ui'; ctx.textAlign='center';
      ctx.fillText(k, nx+ki*56+28, ny+nodeH/2-2);
      if(n.type==='leaf'){ctx.fillStyle=isHi?'#F59E0B':'#334155';ctx.font='7px system-ui';ctx.fillText('TID',nx+ki*56+28,ny+nodeH/2+10);}
      ctx.textAlign='left';
    });

    const lbl = n.full ? 'ROOT-LEAF (FULL)' : n.isNew ? (n.type==='internal'?'NEW ROOT':'NEW PAGE') : n.id;
    ctx.fillStyle=isHi?col:(n.full?'#EF4444':n.isNew?'#7C3AED':'#334155');
    ctx.font=(n.full||n.isNew?'700':'400')+' 8px system-ui';
    ctx.textAlign='center'; ctx.fillText(lbl, n.x, ny+nodeH+12); ctx.textAlign='left';
  }

  function drawEdge(na, nb, active) {
    ctx.strokeStyle=active?'#4F46E5':'#334155'; ctx.lineWidth=active?2.5:1;
    ctx.beginPath(); ctx.moveTo(na.x, na.y+22); ctx.lineTo(nb.x, nb.y-22); ctx.stroke();
    if(active){
      const dx=nb.x-na.x, dy=(nb.y-22)-(na.y+22);
      const len=Math.sqrt(dx*dx+dy*dy);
      if(len>0){const ux=dx/len,uy=dy/len;ctx.fillStyle='#4F46E5';ctx.beginPath();ctx.moveTo(nb.x,nb.y-22);ctx.lineTo(nb.x-ux*10-uy*5,nb.y-22-uy*10+ux*5);ctx.lineTo(nb.x-ux*10+uy*5,nb.y-22-uy*10-ux*5);ctx.fill();}
    }
  }

  if(step.mode==='h1'){
    drawNode(H1_NODE);
    // Height label
    ctx.fillStyle='#64748B'; ctx.font='11px system-ui';
    ctx.fillText('Tree height = 1  (root IS a leaf)', 20, 30);
  } else if(step.mode==='split'){
    // Show two split halves at same level, arrow between them
    drawNode(SPLIT_LEFT); drawNode(SPLIT_RIGHT);
    ctx.strokeStyle='#F59E0B'; ctx.lineWidth=2; ctx.setLineDash([6,4]);
    ctx.beginPath(); ctx.moveTo(SPLIT_LEFT.x+70, SPLIT_LEFT.y); ctx.lineTo(SPLIT_RIGHT.x-70, SPLIT_RIGHT.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#F59E0B'; ctx.font='700 11px system-ui'; ctx.textAlign='center';
    ctx.fillText('SPLIT POINT: key 25', (SPLIT_LEFT.x+70+SPLIT_RIGHT.x-70)/2, SPLIT_LEFT.y-12);
    ctx.textAlign='left';
    ctx.fillStyle='#64748B'; ctx.font='11px system-ui';
    ctx.fillText('Splitting root-leaf...', 20, 30);
  } else {
    H2_EDGES.forEach(([a,b])=>{
      const na=H2_NODES.find(n=>n.id===a), nb=H2_NODES.find(n=>n.id===b);
      drawEdge(na, nb, hiSet.has(a)&&hiSet.has(b));
    });
    // Sibling arrow
    const left=H2_NODES.find(n=>n.id==='left'), right=H2_NODES.find(n=>n.id==='right');
    const act = hiSet.has('left')||hiSet.has('right');
    ctx.strokeStyle=act?'#10B981':'#1E293B44'; ctx.lineWidth=act?2:1; ctx.setLineDash([5,3]);
    ctx.beginPath(); ctx.moveTo(left.x+65, left.y+5); ctx.lineTo(right.x-65, right.y+5); ctx.stroke();
    ctx.setLineDash([]);
    if(act){ctx.fillStyle='#10B981';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText('→',(left.x+65+right.x-65)/2,left.y+8);ctx.textAlign='left';}
    H2_NODES.forEach(drawNode);
    // Height labels
    ctx.fillStyle='#334155'; ctx.font='10px system-ui';
    ctx.fillText('Level 0 (root)', 20, 75);
    ctx.fillText('Level 1 (leaves)', 20, 215);
    ctx.fillStyle='#64748B'; ctx.font='11px system-ui';
    ctx.fillText('Tree height = 2', 20, 30);
  }

  // Height indicator bar on right
  const levels = step.mode==='h1' ? 1 : 2;
  for(let i=0; i<levels; i++){
    ctx.fillStyle = i===0 ? '#4F46E566' : '#10B98133';
    ctx.strokeStyle = i===0 ? '#4F46E5' : '#10B981';
    ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(w-70, 50+i*55, 50, 40, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle=i===0?'#818CF8':'#10B981'; ctx.font='9px system-ui'; ctx.textAlign='center';
    ctx.fillText(i===0?'internal':'leaf', w-45, 75+i*55); ctx.textAlign='left';
  }
  ctx.fillStyle='#475569'; ctx.font='700 10px system-ui'; ctx.textAlign='center';
  ctx.fillText(`h=${levels}`, w-45, 45); ctx.textAlign='left';

  if(step.badge && stepIdx>=0){
    ctx.font='700 11px system-ui'; ctx.textAlign='center';
    const bw=ctx.measureText(step.badge).width+24;
    ctx.fillStyle='#F59E0B22'; ctx.strokeStyle='#F59E0B'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.roundRect(w/2-bw/2-60, 8, bw, 24, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#F59E0B'; ctx.fillText(step.badge, w/2-60, 24); ctx.textAlign='left';
  }

  if(stepIdx<0){
    ctx.fillStyle='#475569'; ctx.font='13px system-ui'; ctx.textAlign='center';
    ctx.fillText('Press Play to animate B+ Tree root split and height growth', w/2, h/2);
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
    tag:'Storage Engine · M40', title:'B+ Tree Root Split',
    subtitle:'The only way a B+ tree grows taller: root overflow forces creation of a new root node.',
    tabs:[
      { id:'rsplit', label:'🌱 Root Split Animation' },
      { id:'height', label:'📏 Height Analysis' },
      { id:'iq',     label:'💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const tab = container.querySelector('#tab-rsplit');
  tab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="350" style="width:100%;max-height:350px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="rs-exp">
        <h3>Root Split — Tree Height Increases</h3>
        <p>A B+ tree only grows taller when its root overflows. This is the rarest event in
           index maintenance — for a 350M row table, the root has split exactly 3–4 times
           since the index was created. Press <strong>Play</strong> to watch a root-leaf split and height increase.</p>
      </div>
    </div>`;
  const canvas = tab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState:{step:-1},
    steps:STEPS.map((s,i)=>({label:`Step ${i+1}`, duration:2200, mutate:st=>{st.step=i;}})),
    onRender:state=>{
      drawRootSplit(ctx, state.step, 800, 350);
      const el=tab.querySelector('#rs-exp');
      if(el&&state.step>=0) el.innerHTML=`<h3>Step ${state.step+1}</h3><p>${STEPS[state.step].desc}</p>`;
    },
  });
  SimulationEngine.renderControls(tab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(tab.querySelector('.canvas-wrap'), engine);
  drawRootSplit(ctx, -1, 800, 350);
  engine.reset();

  container.querySelector('#tab-height').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">B+ Tree Height Analysis</div>
        <div class="section-desc">How branching factor determines height for any table size</div>
      </div>
      <div class="prose">
        <h3>Height Formula</h3>
        <div class="code-block">
Branching factor b ≈ page_size / key_size

Height h = ⌈log_b(N)⌉

PostgreSQL defaults:
  page_size = 8 192 bytes
  int8 key:  ~16 bytes/entry in internal node  →  b ≈ 512
  text(100): ~120 bytes/entry                  →  b ≈ 68

Height for orders (350M rows, int8 PK):
  h = ⌈log_512(350_000_000)⌉ = ⌈3.82⌉ = 4

Height for text(100) composite key:
  h = ⌈log_68(350_000_000)⌉  = ⌈4.65⌉ = 5

One extra level = +1 I/O per lookup. On NVMe at 0.1ms = +0.1ms per query.
At 1M QPS: +100K disk reads/sec on top of your IOPS budget.
        </div>
        <h3>How Height Changes</h3>
        <p><strong>Grows</strong> when root overflows (very rare — log_d(N) times total). For 350M rows
           with d=512: only log_512(350M) ≈ 4 root splits ever. <strong>Shrinks</strong> when deletes cascade
           to empty the root (even rarer — PostgreSQL avoids this with lazy cleanup).</p>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Table Size</th><th>int8 PK (b=512)</th><th>UUID (b=120)</th><th>text(200) (b=40)</th></tr></thead>
          <tbody>
            ${[
              ['1K rows',   '1','2','2'],
              ['1M rows',   '2','3','4'],
              ['100M rows', '3','4','5'],
              ['350M rows', '4','5','6'],
              ['10B rows',  '5','6','7'],
            ].map(([n,a,b,c])=>`<tr><td>${n}</td><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q:'How does a B+ tree root split work and why is it the only way tree height increases?',
      a:'Root split scenario: the root page is full AND an insert propagates a split from a leaf all the way up to the root. Steps: (1) Insert causes a leaf to split → leaf sends a new separator key up to its parent internal node. (2) The parent internal node is also full → it splits too → sends a separator up to its parent. (3) This cascade continues until it reaches the root. (4) The root is full → it must split. But the root has no parent. Solution: (a) Allocate TWO new pages (left half, right half of old root). (b) OLD root page is REUSED as the new root with ONE separator key. (c) The two halves become the new root\'s first two children. (d) Tree height increases by 1. Why this is the only way height increases: all insertions go to leaves. Splits propagate upward only when a node overflows. The root has no parent, so its overflow forces a new level. Every other node has a parent that can absorb the new separator (possibly via its own split). The root split is the single structural event that permanently increases tree height.',
      tip:'A root split reuses the original root page (same page number) as the new root. This is important for PostgreSQL\'s metapage: the root page is referenced by page 0 (metapage), so reusing it avoids updating the metapage on every root split.',
    },
    {
      q:'Why does key size matter for B+ tree performance, and what is the branching factor trade-off?',
      a:'Branching factor b = (page_size - page_header) / bytes_per_key_entry. For PostgreSQL 8 KB pages: int8 key ≈ 16 bytes/entry → b ≈ 512. UUID (16 bytes raw + overhead) ≈ 40 bytes/entry → b ≈ 200. text(200) ≈ 220 bytes/entry → b ≈ 36. Height for 350M rows: int8 → h=4, UUID → h=4 still (log_200(350M)≈3.9), text(200) → h=5 (log_36(350M)≈5.3). More impactful: random UUID inserts cause random leaf page access (every new UUID is likely a page miss — UUIDs are distributed across all 512^3 leaf positions). Serial int8 always inserts at the rightmost leaf — only 1 hot leaf page, max cache utilization. Amazon finding: switching orders.order_id from UUID to BIGINT GENERATED ALWAYS AS IDENTITY reduced index insert time by 4× and index size by 20% (UUIDs are 16 bytes vs 8 bytes, plus the smaller branching factor means more pages, more levels, more splits). For global uniqueness with sequential access: use UUID v7 (timestamp-prefixed) which inserts mostly at the rightmost leaf.',
      tip:'EXPLAIN (ANALYZE) on an index scan shows actual rows and pages fetched. Compare with pg_relation_size(\'index_name\'::regclass) / 8192 to get page count. height ≈ log_b(leaf_pages). This lets you estimate actual tree height from metadata without reading the index internals.',
    },
    {
      q:'What is fillfactor in a B+ tree index and how does it prevent split cascades on update-heavy columns?',
      a:'Fillfactor controls how full leaf pages are packed during initial builds and bulk inserts (default=90 for B+ tree). A fillfactor of 90 means each page is filled to 90% capacity, leaving 10% as a slack space buffer. For UPDATE operations on indexed columns: if the old tuple\'s index entry is on the same page as the new entry, PostgreSQL can do a "HOT update" (Heap-Only Tuple) — no index entry is added, just the heap page changes. HOT is only possible when the new tuple fits on the same heap page as the old. But for index splits: the fillfactor slack absorbs inserts without triggering a split until the page reaches 100%. A leaf that was filled to 90% can absorb ~50 more 16-byte entries before splitting. For write-heavy workloads: use fillfactor=70–80 to reduce split frequency (more disk space used, but fewer splits and less write amplification). For read-heavy or append-only: use fillfactor=100 to maximize key density and minimize tree height. CREATE INDEX ON orders(customer_id) WITH (fillfactor=70) — set at index creation; changing requires REINDEX.',
      tip:'VACUUM FULL and CLUSTER commands rebuild the index (and heap) at the current fillfactor. pg_repack is the online alternative (no table lock). After running these, the index has the expected space distribution and branching factor.',
    },
  ]);
  initIQ(container);
  return () => engine.destroy();
}
