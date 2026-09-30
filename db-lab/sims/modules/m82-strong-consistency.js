import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Topic: Read Repair — Cassandra Merkle trees, active vs passive repair
const RR_STEPS = [
  {
    label: 'Divergent Replicas',
    desc: 'After a network partition or missed write, replicas hold different values for the same key. The cluster must detect and reconcile the divergence.',
    phase: 'diverge',
  },
  {
    label: 'Passive Read Repair',
    desc: 'On a coordinator read, responses from all replicas are compared. If any replica is stale, the coordinator sends a repair mutation to bring it up to date — piggybacking on normal reads at zero extra cost.',
    phase: 'passive',
  },
  {
    label: 'Merkle Tree Construction',
    desc: 'Each node builds a Merkle hash tree over its key range. Leaves are hashes of individual rows; parents are hashes of their children. Two nodes can compare just the root hash to detect divergence — O(1) to detect, O(log N) to locate the mismatch.',
    phase: 'merkle',
  },
  {
    label: 'Anti-Entropy Streaming',
    desc: 'When Merkle trees differ, nodes stream only the divergent sections to each other. Cassandra\'s nodetool repair triggers this. With incremental repair, only un-repaired SSTables are streamed, cutting repair time by >90% on stable clusters.',
    phase: 'stream',
  },
  {
    label: 'Last-Write-Wins',
    desc: 'Cassandra resolves conflicts using LWW (Last-Write-Wins): the cell with the highest timestamp wins. The winning value is propagated to all replicas. Requires loosely-synchronized clocks — NTP drift can cause older data to win.',
    phase: 'lww',
  },
];

function drawRR(ctx, idx, w, h) {
  const step = RR_STEPS[idx];
  ctx.clearRect(0, 0, w, h);
  const { phase } = step;

  function roundRect(x, y, bw, bh, r, fill, stroke) {
    ctx.beginPath(); ctx.roundRect(x, y, bw, bh, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  function textC(t, x, y, col, size, bold) {
    ctx.fillStyle = col; ctx.font = `${bold ? '700 ' : ''}${size || 11}px system-ui`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y);
  }
  function arrow(fx, fy, tx, ty, col, lbl, dashed) {
    if (dashed) ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.setLineDash([]);
    const ang = Math.atan2(ty - fy, tx - fx);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - 9 * Math.cos(ang - 0.4), ty - 9 * Math.sin(ang - 0.4));
    ctx.lineTo(tx - 9 * Math.cos(ang + 0.4), ty - 9 * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    if (lbl) {
      ctx.fillStyle = col; ctx.font = '9px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(lbl, (fx + tx) / 2, Math.min(fy, ty) - 3);
    }
  }

  const rs = [w * 0.18, w * 0.50, w * 0.82];
  const cols = ['#10B981', '#EF4444', '#EF4444'];
  const vals = ['x=7 (t=100)', 'x=3 (t=80)', 'x=3 (t=80)'];

  if (phase === 'diverge') {
    rs.forEach((x, i) => {
      roundRect(x - 54, h * 0.18, 108, 48, 8, cols[i] + '22', cols[i]);
      textC(`Replica ${i + 1}`, x, h * 0.30, cols[i], 11, true);
      textC(vals[i], x, h * 0.44, cols[i], 9, false);
    });
    textC('Replicas diverged — R2 and R3 missed the latest write', w / 2, h * 0.68, '#EF4444', 10, true);
    textC('(network partition or missed write during downtime)', w / 2, h * 0.78, '#94A3B8', 9, false);
  }

  if (phase === 'passive') {
    const cl = w * 0.50, cy = h * 0.20;
    const coord = w * 0.50, coy = h * 0.42;
    // Client
    roundRect(cl - 44, cy, 88, 28, 5, '#818CF833', '#818CF8');
    textC('Client', cl, cy + 14, '#818CF8', 11, true);
    // Coordinator
    roundRect(coord - 54, coy, 108, 28, 5, '#4F46E533', '#4F46E5');
    textC('Coordinator', coord, coy + 14, '#4F46E5', 11, true);
    arrow(cl, cy + 28, coord, coy, '#818CF8', 'READ (QUORUM)');
    // Replicas
    const ry = h * 0.70;
    rs.forEach((x, i) => {
      roundRect(x - 50, ry, 100, 36, 6, cols[i] + '22', cols[i]);
      textC(`R${i + 1}: ${vals[i]}`, x, ry + 18, cols[i], 9, false);
      arrow(coord, coy + 28, x, ry, '#4F46E5', '');
      arrow(x, ry, coord, coy + 28, cols[i], vals[i], true);
    });
    // Repair
    arrow(coord, coy + 14, rs[1], ry, '#10B981', 'REPAIR x=7,t=100', false);
    arrow(coord, coy + 14, rs[2], ry, '#10B981', 'REPAIR x=7,t=100', false);
  }

  if (phase === 'merkle') {
    // Two trees side by side
    const drawTree = (cx, labels, hashes, isMatch) => {
      // Root
      const rc = isMatch ? '#10B981' : '#EF4444';
      roundRect(cx - 44, 20, 88, 24, 4, rc + '33', rc);
      textC(hashes[0], cx, 32, rc, 9, true);
      // Level 1
      [[cx - 50, hashes[1], isMatch],[cx + 50, hashes[2], false]].forEach(([x, h2, m]) => {
        const c2 = m ? '#10B981' : '#EF4444';
        roundRect(x - 40, 62, 80, 22, 4, c2 + '22', c2);
        textC(h2, x, 73, c2, 8, false);
        ctx.beginPath(); ctx.moveTo(cx, 44); ctx.lineTo(x, 62);
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
      });
      // Leaves
      const lys = [[cx - 80, labels[0]],[cx - 20, labels[1]],[cx + 20, labels[2]],[cx + 80, labels[3]]];
      lys.forEach(([x, l], i) => {
        const lc = (i >= 2) ? '#EF4444' : '#10B981';
        roundRect(x - 28, 100, 56, 20, 3, lc + '22', lc);
        textC(l, x, 110, lc, 8, false);
        const parentX = i < 2 ? cx - 50 : cx + 50;
        ctx.beginPath(); ctx.moveTo(parentX, 84); ctx.lineTo(x, 100);
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
      });
    };
    drawTree(w * 0.28, ['k1:x=7','k2:y=3','k3:z=9','k4:a=1'],
      ['0xA1B2(diff)','0x3F4E(ok)','0x9F2D(diff)'], false);
    drawTree(w * 0.72, ['k1:x=3','k2:y=3','k3:z=9','k4:a=1'],
      ['0x7C8D(diff)','0x3F4E(ok)','0x5E6F(diff)'], false);
    textC('Node 1 Merkle Tree', w * 0.28, 152, '#94A3B8', 9, true);
    textC('Node 2 Merkle Tree', w * 0.72, 152, '#94A3B8', 9, true);
    textC('Root hashes differ → drill down → mismatch in right subtree (k3,k4 range)', w / 2, h * 0.68, '#EF4444', 10, true);
    textC('O(log N) traversal to find divergent ranges', w / 2, h * 0.78, '#94A3B8', 9, false);
  }

  if (phase === 'stream') {
    const n1 = w * 0.25, n2 = w * 0.75, my = h * 0.35;
    roundRect(n1 - 55, my - 18, 110, 36, 6, '#4F46E533', '#4F46E5');
    textC('Node 1', n1, my, '#4F46E5', 11, true);
    roundRect(n2 - 55, my - 18, 110, 36, 6, '#10B98133', '#10B981');
    textC('Node 2', n2, my, '#10B981', 11, true);
    // Merkle compare
    arrow(n1, my, n2, my, '#F59E0B', 'Compare Merkle trees');
    // Stream divergent range
    const sy = my + 70;
    ctx.setLineDash([5, 4]);
    arrow(n2, my + 18, n1, sy, '#10B981', 'Stream k1 range (divergent)');
    ctx.setLineDash([]);
    // Size saved
    roundRect(w / 2 - 80, h * 0.72, 160, 36, 6, '#1E293B', '#334155');
    textC('Incremental repair:', w / 2, h * 0.76, '#94A3B8', 9, true);
    textC('Only repaired SSTables streamed — 90% less I/O', w / 2, h * 0.86, '#10B981', 9, false);
  }

  if (phase === 'lww') {
    // Two writes, different timestamps
    const cx = w * 0.5, ty = h * 0.18;
    const writes = [
      { x: w * 0.25, t: 'T=100', val: 'x=7', col: '#10B981', winner: true },
      { x: w * 0.75, t: 'T=80',  val: 'x=3', col: '#EF4444', winner: false },
    ];
    writes.forEach(wr => {
      roundRect(wr.x - 50, ty, 100, 50, 6, wr.col + '22', wr.col);
      textC(wr.t, wr.x, ty + 14, wr.col, 10, true);
      textC(wr.val, wr.x, ty + 32, wr.col, 11, true);
      if (wr.winner) {
        textC('🏆 WINNER', wr.x, ty + 54, wr.col, 9, true);
      } else {
        textC('✗ DISCARDED', wr.x, ty + 54, wr.col, 9, false);
      }
    });
    // Resolve
    roundRect(cx - 54, h * 0.55, 108, 44, 6, '#10B98133', '#10B981');
    textC('Resolved: x=7', cx, h * 0.65, '#10B981', 12, true);
    textC('(highest timestamp wins)', cx, h * 0.73, '#94A3B8', 9, false);
    // Caveat
    roundRect(w * 0.05, h * 0.84, w * 0.90, 30, 5, '#EF444422', '#EF4444');
    textC('⚠ NTP clock skew can make T=100 actually arrive BEFORE T=80 in real time', cx, h * 0.89, '#EF4444', 9, false);
  }

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function renderConcepts(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Read Repair & Anti-Entropy Concepts</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px">
    ${[
      ['Passive Read Repair','Triggered on reads. Coordinator compares replica responses; repairs stale replicas in the background (or synchronously with read_repair=BLOCKING). Zero extra I/O during quiet periods.','#4F46E5'],
      ['Active Anti-Entropy','Background process. Compares Merkle hash trees between replicas. Streams divergent key ranges. Cassandra: nodetool repair. Run daily on clusters that receive deletes (tombstone GC).','#10B981'],
      ['Merkle Tree','A hash tree where each leaf = hash(row value). Root hash = hash(all data). Comparing roots is O(1); finding the divergent subtree is O(log N). Enables efficient detection of which key ranges differ.','#F59E0B'],
      ['LWW (Last-Write-Wins)','Cassandra\'s default conflict resolution. Highest timestamp wins. Simple but vulnerable to NTP drift. Alternative: CRDTs or application-level conflict resolution.','#EF4444'],
      ['Tombstones','Deletes in Cassandra write a special "tombstone" marker rather than actually deleting. Tombstones are garbage collected after gc_grace_seconds. Anti-entropy must run within gc_grace to avoid deleted data reappearing.','#A78BFA'],
      ['Incremental Repair','Cassandra 3.0+. Only streams SSTables that have never been repaired before. A bloom filter tracks repaired status. Cuts repair I/O by 90%+ on stable clusters.','#06B6D4'],
    ].map(([t,d,col]) => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px;border-left:3px solid ${col}">
        <div style="color:${col};font-weight:700;font-size:12px;margin-bottom:6px">${t}</div>
        <div style="font-size:11px;color:#94A3B8">${d}</div>
      </div>`).join('')}
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'What is a Merkle tree and why does Cassandra use it for anti-entropy?',
      a: 'A Merkle tree is a hash tree where each leaf node contains the hash of a data block (in Cassandra, the hash of a row\'s value and timestamp), and each parent node contains the hash of its children\'s hashes. Two nodes can compare their Merkle tree roots in O(1) to determine if their data matches. If they differ, the nodes traverse down the tree to find the divergent subtrees, then stream only those key ranges to each other — O(log N) to locate the mismatch. Without Merkle trees, repair would require streaming all data or comparing every row individually.',
    },
    {
      q: 'Why must Cassandra repair run within gc_grace_seconds?',
      a: 'When data is deleted in Cassandra, a tombstone marker is written instead of immediately removing the data. After gc_grace_seconds (default 10 days), the tombstone is eligible for garbage collection. If a replica was offline during the delete and came back online after the tombstone was GC\'d, it would receive no evidence that the delete happened — the data would "reappear." Running repair within gc_grace ensures all replicas receive the tombstone before it is deleted, preventing this resurrection. If repair is delayed beyond gc_grace, the safest option is to wipe and re-seed the offline replica.',
    },
    {
      q: 'How does passive read repair work and when is it not enough?',
      a: 'On a coordinator read at consistency level QUORUM or higher, the coordinator reads from multiple replicas, compares the responses using timestamps, and asynchronously (or synchronously with read_repair=BLOCKING) sends repair mutations to stale replicas. This is zero-cost during normal reads. However, it only repairs key ranges that are actively read — cold data (infrequently read keys) may drift indefinitely. Active anti-entropy (nodetool repair) is needed to repair cold ranges. Passive repair also cannot fix missing tombstones — a tombstone on only one replica is invisible to replicas that never received the delete.',
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Read Repair',
    subtitle: 'Cassandra Merkle trees, passive read repair, anti-entropy streaming, and LWW conflict resolution.',
    tabs: [
      { id:'anim',     label:'Visualisation' },
      { id:'concepts', label:'Concepts' },
      { id:'iq',       label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = RR_STEPS.map((s, i) => ({ label: s.label, duration: 2200, mutate: st => { st.idx = i; } }));
      const engine = new SimulationEngine({
        initialState: { idx: 0 }, steps,
        onRender: (state, cnv) => {
          const c = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; c.scale(pr, pr);
          drawRR(c, state.idx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = RR_STEPS[i].desc; });
      desc.textContent = RR_STEPS[0].desc;
      return () => engine.destroy();
    },
    concepts: renderConcepts,
    iq:       renderIQ,
  });
  return null;
}
