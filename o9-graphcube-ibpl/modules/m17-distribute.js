import { createModuleShell, createIQSection } from '../components/module-shell.js';

export const IQ = [
  { q: 'What does DistributeToLeaves actually do, step by step?',
    a: '(1) A value is written at an aggregate level (e.g. State forecast = 15). (2) The engine looks up the spreading rule\'s BasisMeasure at the eligible leaves. (3) It computes each leaf\'s weight = leafBasis / sum(basis). (4) It writes leafValue = aggregateValue × weight into each leaf cell, creating new intersections if needed. (5) On read, the leaves re-aggregate back to exactly the value you typed. If the basis sums to null/zero it splits equally; AssortmentBasisMeasure restricts which leaves are eligible.',
    tip: 'Five steps: write aggregate → read basis → weight = basis/Σbasis → write leaves → re-aggregates back.' },
  { q: 'When is DistributeToLeaves the right choice vs CopyToLeaves?',
    a: 'Use DistributeToLeaves for Sum-aggregated measures (quantities, revenue) — it preserves the total by splitting it. Use CopyToLeaves for Min/Max/Avg measures where every leaf should equal the aggregate (e.g. a target or a flag). The failure case: CopyToLeaves on a Sum measure double-counts — set 8 at the parent over 2 leaves, both become 8, parent re-aggregates to 16.',
    tip: 'Sum → Distribute; Min/Max/Avg → Copy. CopyToLeaves + Sum is the classic bug.' },
  { q: 'How does DistributeToLeaves relate to scope statements and the planner UI?',
    a: 'They are two front-ends to the same mechanism. When a planner edits an aggregate cell in the workbench, the measure\'s spreading rule fires automatically. When you write an aggregate in IBPL via a spread scope, the same rule distributes it. Both require a spreading rule to exist on the measure — without one, aggregate writes are rejected and you can only write leaves directly.',
    tip: 'UI edit and spread scope both trigger the same rule — the rule lives on the measure, not the statement.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M17 · Operations',
    title: 'DistributeToLeaves',
    subtitle: 'The leaf-level write-back mechanism in detail — how an aggregate edit becomes consistent leaf values.',
    tabs: [
      { id: 'how',  label: '💧 How It Works' },
      { id: 'calc', label: '🧮 Interactive Split' },
      { id: 'iq',   label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  container.querySelector('#tab-how').innerHTML = `
    <div class="section-pad">
      <p class="lead">Editing an aggregate is really writing the leaves — the aggregate is never stored.</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[
          ['1','Write aggregate','A value lands at a parent — Brand Fructis forecast = 15 (UI edit or spread scope).','#F59E0B'],
          ['2','Read basis','Engine reads BasisMeasure at eligible leaves (AssortmentBasis decides eligibility).','#A78BFA'],
          ['3','Weight','weight = leafBasis ÷ Σ(basis). If Σ is null/zero → equal split.','#22D3EE'],
          ['4','Write leaves','leafValue = 15 × weight, into each leaf cell (new intersections created as needed).','#34D399'],
          ['5','Re-aggregate','On read the leaves sum back to exactly 15 — no stored aggregate, no drift.','#F472B6'],
        ].map(([n,t,d,c])=>`<div class="card" style="border-left:4px solid ${c};display:flex;gap:14px;align-items:flex-start"><div style="font-size:20px;font-weight:800;color:${c};min-width:26px">${n}</div><div><h4 style="color:${c}">${t}</h4><p>${d}</p></div></div>`).join('')}
      </div>
    </div>`;

  const calc = container.querySelector('#tab-calc');
  calc.innerHTML = `
    <div class="section-pad">
      <p class="lead">Set an aggregate value and a basis; watch the split. (Self-basis = basis equals current values.)</p>
      <div class="card">
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
          <label style="font-size:13px">Aggregate value:
            <input id="agg" type="number" value="15" style="width:90px;margin-left:6px;padding:6px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text)">
          </label>
        </div>
        <table class="o9-table" style="margin:0">
          <thead><tr><th>Leaf (SKU)</th><th>Basis</th><th>Weight</th><th>Distributed value</th></tr></thead>
          <tbody id="split-rows"></tbody>
          <tfoot><tr><th>Σ</th><th id="sum-basis"></th><th>1.00</th><th id="sum-val"></th></tr></tfoot>
        </table>
        <p style="font-size:11.5px;color:var(--text3);margin-top:8px">Edit a basis cell to re-split. Leaves always re-aggregate to the value you typed.</p>
      </div>
    </div>`;

  const LEAVES = [{n:'320D-Pump',b:4},{n:'320D-Seal',b:3},{n:'330-Drive',b:2},{n:'330-Link',b:1}];
  function render() {
    const agg = +calc.querySelector('#agg').value || 0;
    const sumB = LEAVES.reduce((s,l)=>s+(+l.b||0),0);
    const rows = calc.querySelector('#split-rows');
    rows.innerHTML = LEAVES.map((l,i)=>{
      const w = sumB>0 ? (l.b/sumB) : (1/LEAVES.length);
      const v = agg*w;
      return `<tr><td>${l.n}</td>
        <td><input data-i="${i}" class="basis-in" type="number" value="${l.b}" style="width:70px;padding:4px;background:var(--bg3);border:1px solid var(--border);border-radius:5px;color:var(--text)"></td>
        <td>${(w*100).toFixed(1)}%</td><td><b>${v.toFixed(2)}</b></td></tr>`;
    }).join('');
    calc.querySelector('#sum-basis').textContent = sumB;
    calc.querySelector('#sum-val').textContent = agg.toFixed(2);
  }
  render();
  const onCalc = (e) => {
    if (e.target.id === 'agg') render();
    if (e.target.classList.contains('basis-in')) { LEAVES[+e.target.dataset.i].b = +e.target.value; render(); }
  };
  calc.addEventListener('input', onCalc);

  return () => calc.removeEventListener('input', onCalc);
}
