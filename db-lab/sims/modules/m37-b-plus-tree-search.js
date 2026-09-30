import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const NODES = [
  { id:'root', keys:[30,70],    x:400, y:45,  type:'internal', color:'#4F46E5' },
  { id:'i1',   keys:[15],       x:180, y:145, type:'internal', color:'#818CF8' },
  { id:'i2',   keys:[50],       x:400, y:145, type:'internal', color:'#818CF8' },
  { id:'i3',   keys:[85],       x:620, y:145, type:'internal', color:'#818CF8' },
  { id:'l1',   keys:[5,10],     x:80,  y:260, type:'leaf', color:'#10B981' },
  { id:'l2',   keys:[15,20,25], x:240, y:260, type:'leaf', color:'#10B981' },
  { id:'l3',   keys:[30,40],    x:370, y:260, type:'leaf', color:'#10B981' },
  { id:'l4',   keys:[50,60],    x:470, y:260, type:'leaf', color:'#10B981' },
  { id:'l5',   keys:[70,80],    x:580, y:260, type:'leaf', color:'#10B981' },
  { id:'l6',   keys:[85,90,95], x:710, y:260, type:'leaf', color:'#10B981' },
];
const EDGES = [
  ['root','i1'],['root','i2'],['root','i3'],
  ['i1','l1'],['i1','l2'],['i2','l3'],['i2','l4'],['i3','l5'],['i3','l6'],
];
const LEAF_CHAIN = ['l1','l2','l3','l4','l5','l6'];

const STEPS = [
  { path:[], chains:false, found:null, rangeKeys:[], desc:'B+ tree point and range search. Every search descends from root → internal nodes → leaf. Height ≤ 4 for 350M rows means every lookup uses at most 4 I/Os to find a leaf.' },
  { path:['root'], chains:false, found:null, rangeKeys:[], desc:'Point search for key=25. Root keys [30,70]. Since 25 < 30, follow leftmost child pointer to i1. This comparison takes O(log2 2) = 1 comparison per node.' },
  { path:['root','i1'], chains:false, found:null, rangeKeys:[], desc:'Internal node i1 [15]. Key=25 > 15, so follow right child (keys ≥ 15) to leaf l2. Internal nodes only route — they store no data records.' },
  { path:['root','i1','l2'], chains:false, found:25, rangeKeys:[], desc:'Leaf l2 [15,20,25]. Binary search within leaf finds key=25 → TID=(page 4817, slot 3). Fetch heap page by TID. Total: 3 index page reads + 1 heap read = 4 I/Os.' },
  { path:['root','i2'], chains:false, found:null, rangeKeys:[], desc:'Range scan: WHERE order_id BETWEEN 50 AND 80. Step 1 — find first key ≥ 50. Root: 50 ≥ 30 and 50 < 70, follow middle child → i2.' },
  { path:['root','i2','l4'], chains:true, found:null, rangeKeys:[50,60], desc:'i2 [50]: 50 ≥ 50, go right → l4 [50,60]. Both keys in [50,80]. Follow btpo_next pointer to next leaf.' },
  { path:['l4','l5'], chains:true, found:null, rangeKeys:[70,80], desc:'Leaf l5 [70,80]. Both keys in range [50,80]. Next leaf l6 starts at 85 > 80 — stop. Range done: 4 keys returned, 2 leaf reads + 2 internal = 4 I/Os total (same as point lookup).' },
];

function drawSearch(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const step = STEPS[Math.max(0, stepIdx)];
  const pathSet = new Set(step.path);
  const rangeSet = new Set(step.rangeKeys);

  EDGES.forEach(([a,b]) => {
    const na = NODES.find(n=>n.id===a), nb = NODES.find(n=>n.id===b);
    const active = pathSet.has(a) && pathSet.has(b);
    ctx.strokeStyle = active ? '#4F46E5' : '#1E293B'; ctx.lineWidth = active ? 2.5 : 1;
    ctx.beginPath(); ctx.moveTo(na.x, na.y+22); ctx.lineTo(nb.x, nb.y-22); ctx.stroke();
    if (active) {
      const dx = nb.x - na.x, dy = (nb.y-22) - (na.y+22);
      const len = Math.sqrt(dx*dx+dy*dy);
      if (len > 0) {
        const ux=dx/len, uy=dy/len;
        ctx.fillStyle='#4F46E5'; ctx.beginPath();
        ctx.moveTo(nb.x, nb.y-22);
        ctx.lineTo(nb.x - ux*10 - uy*5, nb.y-22 - uy*10 + ux*5);
        ctx.lineTo(nb.x - ux*10 + uy*5, nb.y-22 - uy*10 - ux*5);
        ctx.fill();
      }
    }
  });

  if (step.chains) {
    for (let i = 0; i < LEAF_CHAIN.length - 1; i++) {
      const na = NODES.find(n=>n.id===LEAF_CHAIN[i]), nb = NODES.find(n=>n.id===LEAF_CHAIN[i+1]);
      const both = pathSet.has(LEAF_CHAIN[i]) || pathSet.has(LEAF_CHAIN[i+1]);
      ctx.strokeStyle = both ? '#10B981' : '#1E293B44'; ctx.lineWidth = both ? 2 : 1;
      ctx.setLineDash(both ? [5,3] : [3,4]);
      const x1 = na.x + (na.keys.length*44+16)/2, x2 = nb.x - (nb.keys.length*44+16)/2;
      ctx.beginPath(); ctx.moveTo(x1, na.y+6); ctx.lineTo(x2, nb.y+6); ctx.stroke();
      ctx.setLineDash([]);
      if (both) {
        ctx.fillStyle='#10B981'; ctx.font='9px system-ui'; ctx.textAlign='center';
        ctx.fillText('→', (x1+x2)/2, na.y+9); ctx.textAlign='left';
      }
    }
  }

  NODES.forEach(n => {
    const isPath = pathSet.has(n.id);
    const nodeW = n.keys.length*44+16, nodeH = 44;
    const nx = n.x - nodeW/2, ny = n.y - nodeH/2;
    ctx.fillStyle = isPath ? n.color+'33' : '#0A0F1A';
    ctx.strokeStyle = isPath ? n.color : '#1E293B'; ctx.lineWidth = isPath ? 2.5 : 1;
    ctx.beginPath(); ctx.roundRect(nx, ny, nodeW, nodeH, 6); ctx.fill(); ctx.stroke();

    n.keys.forEach((k, ki) => {
      const isFound = step.found===k && isPath && n.type==='leaf';
      const inRange = rangeSet.has(k) && isPath && n.type==='leaf';
      if (ki>0) {
        ctx.strokeStyle='#1E293B'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(nx+ki*44, ny+4); ctx.lineTo(nx+ki*44, ny+nodeH-4); ctx.stroke();
      }
      ctx.fillStyle = isFound ? '#F59E0B' : inRange ? '#10B981' : isPath ? n.color : '#475569';
      ctx.font = (isPath?'700':'400')+' 11px system-ui'; ctx.textAlign='center';
      ctx.fillText(k, nx+ki*44+22, ny+nodeH/2-2);
      if (n.type==='leaf') {
        ctx.fillStyle = isFound ? '#F59E0B' : inRange ? '#10B981' : '#334155';
        ctx.font='7px system-ui'; ctx.fillText('TID', nx+ki*44+22, ny+nodeH/2+10);
      } else {
        ctx.fillStyle='#334155'; ctx.font='7px system-ui'; ctx.fillText('→', nx+ki*44+22, ny+nodeH/2+10);
      }
      ctx.textAlign='left';
    });
    ctx.fillStyle = isPath ? n.color : '#334155'; ctx.font='8px system-ui'; ctx.textAlign='center';
    ctx.fillText(n.id, n.x, ny+nodeH+12); ctx.textAlign='left';
  });

  if (stepIdx < 0) {
    ctx.fillStyle='#475569'; ctx.font='13px system-ui'; ctx.textAlign='center';
    ctx.fillText('Press Play to animate point and range search on a B+ Tree', w/2, h/2);
    ctx.textAlign='left';
  } else {
    ctx.fillStyle='#0F172A'; ctx.beginPath(); ctx.roundRect(20, h-52, w-40, 44, 4); ctx.fill();
    const words = step.desc.split(' ');
    let line='', ly=h-36;
    ctx.fillStyle='#94A3B8'; ctx.font='9.5px system-ui';
    words.forEach(wd => {
      const t = line+(line?' ':'')+wd;
      if (ctx.measureText(t).width > w-50) { ctx.fillText(line,28,ly); line=wd; ly+=13; } else line=t;
    });
    if (line) ctx.fillText(line, 28, ly);
  }
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag:'Storage Engine · M37', title:'B+ Tree Search',
    subtitle:'Point lookup O(log N) and range scan O(log N + K): descend the tree, then follow the leaf chain.',
    tabs:[
      { id:'search', label:'🔍 Search Animation' },
      { id:'cost',   label:'💰 I/O Cost Analysis' },
      { id:'iq',     label:'💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const tab = container.querySelector('#tab-search');
  tab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="360" style="width:100%;max-height:360px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="srch-exp">
        <h3>B+ Tree Search — Root to Leaf</h3>
        <p>Every search begins at the root and descends exactly h levels (h = tree height, typically 3–4 for 350M rows).
           Internal nodes are routing-only; the leaf holds the TID pointing to the heap row.
           Press <strong>Play</strong> to animate point lookup (key=25) then range scan (50–80).</p>
      </div>
    </div>`;
  const canvas = tab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState:{step:-1},
    steps:STEPS.map((s,i)=>({label:`Step ${i+1}`, duration:2200, mutate:st=>{st.step=i;}})),
    onRender:state=>{
      drawSearch(ctx, state.step, 800, 360);
      const el=tab.querySelector('#srch-exp');
      if (el&&state.step>=0) el.innerHTML=`<h3>Step ${state.step+1}</h3><p>${STEPS[state.step].desc}</p>`;
    },
  });
  SimulationEngine.renderControls(tab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(tab.querySelector('.canvas-wrap'), engine);
  drawSearch(ctx, -1, 800, 360);
  engine.reset();

  container.querySelector('#tab-cost').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">B+ Tree I/O Cost Analysis</div>
        <div class="section-desc">How search cost scales with table size and tree height</div>
      </div>
      <div class="prose">
        <h3>Point Lookup Cost Formula</h3>
        <div class="code-block">
-- orders table: 350M rows, int8 primary key, 8 KB pages
-- Internal node: ~512 entries/page  →  height = ⌈log₅₁₂(350M)⌉ = 4

Point lookup cost:
  3–4 internal page reads (root + 2–3 levels)
  +1 leaf page read
  +1 heap page read (fetch row by TID)
  ─────────────────────────────
  5 I/Os worst case  |  2 I/Os typical (root + upper levels cached)

-- Root is accessed on EVERY query → pinned in shared_buffers
-- Top 512 level-1 children also usually cached (frequently accessed)
-- Actual disk I/Os: usually 1 (leaf) + 1 (heap) = 2 I/Os
        </div>
        <h3>Range Scan Cost Formula</h3>
        <div class="code-block">
-- Range: WHERE order_id BETWEEN 1M AND 1M+999  (K=1000 rows)
-- Leaf page holds ~500 keys  →  2 leaf pages for 1000 rows

Total cost = O(log N) + O(K/f)
  log₅₁₂(350M) ≈ 4 internal reads  (find first leaf)
  K/f = 1000/500 = 2 leaf page reads (chain traversal)
  + K heap reads  (1 per TID unless index-only scan)
  ─────────────────────────────
  ~6 index I/Os + 1000 heap I/Os (or 0 with Index-Only Scan)
        </div>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Scenario</th><th>Index I/Os</th><th>Heap I/Os</th><th>Total</th></tr></thead>
          <tbody>
            ${[
              ['Point lookup (cold)', '4 (tree height)', '1', '5'],
              ['Point lookup (warm root)', '2 (leaf + 1 internal)', '1', '3'],
              ['Range K=100, Index-Only', '4 + 1', '0 (all-visible)', '5'],
              ['Range K=1000, heap fetch', '4 + 2', '1000 random', '1006'],
              ['Full index scan (ORDER BY)', '4 + all leaf pages', '0 (index-only)', '4 + N/500'],
            ].map(([s,i,h,t])=>`<tr><td>${s}</td><td>${i}</td><td>${h}</td><td><strong>${t}</strong></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q:'Walk me through a B+ tree point lookup for order_id=12345 on a 350M-row PostgreSQL table.',
      a:'Tree height = ⌈log₅₁₂(350M)⌉ = 4. Step 1 (root): root page is pinned in shared_buffers (accessed on every query — always cached). Binary search on root keys routes 12345 to the correct subtree. Step 2 (level-3 internal): typically cached (512 level-1 children × accessed frequently). Step 3 (level-2 internal): may be a disk read if cold. Step 4 (leaf): ~1 disk read — leaf pages are rarely cached unless the row is hot. Step 5 (heap): fetch from heap page by TID — 1 disk read if row is cold. Practical cost: usually 2 disk I/Os (1 cold internal + 1 leaf) + 1 heap = 3 disk reads. At NVMe latency 0.1ms each: ~0.3ms. At DRAM latency (if all cached): ~0.4μs. The goal is to keep as many index pages as possible in shared_buffers — especially the top 2–3 levels, which are accessed on EVERY query to that table.',
      tip:'The root and first 1–2 internal levels are effectively free (always in cache). Only the leaf and heap reads actually cost disk I/O on a cache miss.',
    },
    {
      q:'How does a B+ tree range scan work and why is it more efficient than doing N point lookups?',
      a:'Range scan WHERE order_id BETWEEN A AND B: (1) Descend tree to find first leaf containing key ≥ A — O(log N) I/Os, same as point lookup. (2) Scan within the leaf sequentially — keys are sorted. (3) Follow btpo_next (right sibling pointer) to the next leaf. This is a direct page reference — no re-traversal of internal nodes. (4) Repeat until key > B. Why N point lookups would be much worse: each would re-read root + 2 internal nodes = 3 internal page reads × N. For 1000 rows: N × 3 = 3000 extra internal reads. Range scan skips all those — you pay internal read cost only once (to find the first leaf), then pure leaf chain traversal. For K=1000 rows, leaf pages = 2 reads. Range scan total: 4 + 2 = 6 index reads. N point lookups total: 1000 × 5 = 5000 reads. Range scan is ~833× cheaper in index I/Os. At NVMe 0.1ms: range scan 0.6ms vs N lookups 500ms.',
      tip:'btpo_next is the right-sibling page number stored in BTPageOpaqueData on every leaf page. Following it requires no tree traversal — it\'s a direct page reference (one page read). PostgreSQL also stores btpo_prev for backward scans.',
    },
    {
      q:'What is an index-only scan and when does PostgreSQL fall back to fetching the heap?',
      a:'Index-only scan (IOS): all columns needed by the query are present in the index leaf pages. PostgreSQL never reads the heap. Example: CREATE INDEX ON orders(order_id) INCLUDE (total, status). Query: SELECT total, status FROM orders WHERE order_id=12345. The leaf page has all needed data → 0 heap reads. Fallback condition — Visibility Map: PostgreSQL must verify MVCC visibility for returned tuples. For heap pages marked "all-visible" in the VM, PostgreSQL trusts the index is current → true index-only scan. For pages not all-visible (recent inserts, pages with dead tuples): PostgreSQL falls back to heap read for visibility check. This is the "Heap Fetches: N" line in EXPLAIN (ANALYZE). Solutions: (1) Run VACUUM to mark pages all-visible. (2) Monitor pg_stat_user_indexes.idx_blks_read vs heap_blks_read. (3) Use autovacuum aggressively on write-heavy tables. At Amazon scale: a covering index on (product_id, price, stock_count) INCLUDE (title, image_url) eliminates all heap reads for product-listing queries during Prime Day — reducing I/O by 10–100×.',
      tip:'EXPLAIN (ANALYZE) output line "Heap Fetches: N" on an Index Only Scan tells you how many rows required a heap page read for visibility. If N > 0, VACUUM is overdue. Target: Heap Fetches: 0 for hot read paths.',
    },
  ]);
  initIQ(container);
  return () => engine.destroy();
}
