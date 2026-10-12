import { createModuleShell, createIQSection } from '../components/module-shell.js';

export const IQ = [
  { q: 'Why is sparsity the key to performance at scale?',
    a: 'A full planning model (Customer × Item × LC × Week × Version) has an astronomically large number of possible intersections, but only a tiny fraction have real data. Because the GraphCube stores only populated cells (sparse) and computes aggregates on read, memory and compute scale with the data that actually exists, not with the dimensional cross-product. The moment you force dense intersections — e.g. an unfiltered cartesian scope — you can explode the model and exhaust memory.',
    tip: 'Sparse storage means cost scales with real data, not with the dimension cross-product. Dense writes break that.' },
  { q: 'What is MaxIntersections and when does it bite?',
    a: 'It is a guard on how many intersections a scope/query may touch or create. A cartesian or evaluatemember scope without tight member filters can try to create a huge number of cells and hit the limit (or hang the system). The fix is to filter members hard, use file upload for genuinely large volumes, and prefer regular scope (operates on existing cells) over cartesian when you aren\'t intentionally creating new intersections.',
    tip: 'Name it with cartesian scope: unfiltered create blows up intersection counts. Filter members or upload.' },
  { q: 'How do you tune an IBPL query that is slow or hangs the browser?',
    a: 'Always limit while exploring. Filter with where (pre-input) rather than post-.filter() so you compute less. Grain the query only as finely as you need — don\'t pull SKU×Week if Brand×Month answers the question. Avoid returning huge member cross-products. For writes, use block scope to compute several measures in one pass, and prefer regular over cartesian. Null-handle with coalesce so you don\'t scan/aggregate garbage.',
    tip: 'The quick wins: limit, where over post-filter, coarsest grain that answers the question, block scope for multi-measure writes.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M20 · Operations',
    title: 'Performance & Scale',
    subtitle: 'Why sparsity wins, what MaxIntersections guards, and how to keep IBPL fast.',
    tabs: [
      { id: 'sparse', label: '🪶 Sparsity at Scale' },
      { id: 'tuning', label: '🚀 Tuning Checklist' },
      { id: 'iq',     label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  container.querySelector('#tab-sparse').innerHTML = `
    <div class="section-pad">
      <p class="lead">The cross-product is enormous; the real data is tiny. The GraphCube only pays for what exists.</p>
      <div class="vs-grid">
        <div class="vs-col sql"><h5>Possible intersections</h5>
          <p style="color:var(--text2);font-size:12.5px">5,000 Items × 40 LCs × 2,000 Customers × 104 Weeks × 5 Versions<br><br>
          = <b>~208 billion</b> cells if dense.</p></div>
        <div class="vs-col ibpl"><h5>Actually populated</h5>
          <p style="color:var(--text2);font-size:12.5px">Most customer-item-LC combinations never transact in a given week.<br><br>
          Maybe <b>a few million</b> real cells — that's what gets stored.</p></div>
      </div>
      <div class="callout warn"><b>Don't densify by accident:</b> an unfiltered <code>cartesian scope</code> tries to create the dense cross-product — the fastest way to exhaust memory. Filter members hard; use file upload for large volumes.</div>
    </div>`;

  container.querySelector('#tab-tuning').innerHTML = `
    <div class="section-pad">
      <p class="lead">A practical checklist for fast queries and safe writes.</p>
      <table class="o9-table">
        <thead><tr><th>Do</th><th>Why</th></tr></thead>
        <tbody>
          <tr><td><code>limit</code> while exploring</td><td>Stops the browser hanging on huge result sets</td></tr>
          <tr><td>Filter with <code>where</code>, not post-<code>.filter()</code></td><td>Filters upstream — computes less</td></tr>
          <tr><td>Query the coarsest grain that answers the question</td><td>Fewer intersections scanned</td></tr>
          <tr><td>Prefer <code>regular</code> over <code>cartesian</code> scope</td><td>Operates on existing cells; creates nothing</td></tr>
          <tr><td>Use <code>block scope</code> for several measures</td><td>One pass over the intersections, not many</td></tr>
          <tr><td><code>coalesce</code> nulls deliberately</td><td>Avoids null-propagation surprises and wasted work</td></tr>
          <tr><td>Tighten member filters before a create</td><td>Keeps intersection counts under MaxIntersections</td></tr>
        </tbody>
      </table>
      <div class="callout"><b>Rule of thumb:</b> the cheapest query is the one that touches the fewest cells. Everything above is a way to touch fewer cells.</div>
    </div>`;

  return null;
}
