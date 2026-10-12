import { MODULES } from '../components/nav.js';

const FLOW = [
  ['🧠 Platform', 'What o9 is', 'Digital Brain → EKG → GraphCube → IBPL. The 4 layers and the sense/decide/act loop.', ['m01','m02','m03','m04']],
  ['🧊 GraphCube', 'How data is stored', 'Sparse, graph-aware storage; measures at intersections; values aggregate along edges.', ['m05','m15']],
  ['⌨️ IBPL', 'How you talk to it', 'Select to read, scope to write (7 kinds), rules & commands. Not SQL.', ['m06','m07','m08','m09']],
  ['🗃️ Data Model', 'The structure underneath', 'Dimensions, hierarchies, measure groups, aggregation/spreading, versions.', ['m10','m11','m12','m13','m14']],
  ['⚙️ Operations', 'Running it', 'Access control, DistributeToLeaves, integrations, performance at scale.', ['m16','m17','m18','m20']],
  ['🎯 Practice', 'Proving it', 'CAT use cases and senior interview Q&A across five rounds.', ['m19','m21']],
];

export function mount(container) {
  const label = id => (MODULES.find(m=>m.id===id)||{}).label || id;
  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">Reference</div>
        <h1 class="module-title">Master Map</h1>
        <p class="module-subtitle">The whole tool as one path — from "what is o9" to interview-ready. Click any module to jump in.</p>
      </div>
      <div class="section-pad">
        <div style="display:flex;flex-direction:column;gap:14px">
          ${FLOW.map(([title,sub,desc,ids],i)=>`
            <div class="card">
              <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
                <h4 style="font-size:15px;margin:0">${title}</h4>
                <span style="font-size:12px;color:var(--accent);font-weight:700">${sub}</span>
              </div>
              <p style="margin:6px 0 10px">${desc}</p>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${ids.map(id=>`<a class="pill mm-pill" href="#${id}" style="cursor:pointer;text-decoration:none">${id} · ${label(id)}</a>`).join('')}
              </div>
            </div>
            ${i<FLOW.length-1?'<div style="text-align:center;color:var(--text3)">▼</div>':''}`).join('')}
        </div>
        <div class="callout" style="margin-top:18px"><b>Suggested order:</b> top to bottom. But every module is self-contained — jump to what you need. Progress is saved per module.</div>
      </div>
    </div>`;
  const onClick = (e) => {
    const p = e.target.closest('.mm-pill');
    if (p) { e.preventDefault(); location.hash = p.getAttribute('href').slice(1); }
  };
  container.addEventListener('click', onClick);
  return () => container.removeEventListener('click', onClick);
}
