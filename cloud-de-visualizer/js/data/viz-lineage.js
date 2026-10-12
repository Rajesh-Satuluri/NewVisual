/* ============================================================
   Conceptual visualizer: data lineage & governance.

   Models how a governance catalog (Unity Catalog / Purview /
   Glue + Lake Formation) tracks column-level lineage and enforces
   access: catalog registration, transform lineage, column lineage,
   access policies + masking, and audit. Conceptual only. On TV.Viz.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Viz) return;

  TV.Viz.register({
    id: 'data-lineage',
    title: 'Data lineage & governance',
    subtitle: 'How a governance catalog tracks where data came from, column by column, and controls who can see what — the backbone of a trustworthy platform.',
    vendor: 'multi',
    tags: ['governance', 'lineage', 'unity catalog', 'purview', 'lake formation', 'access control', 'masking', 'audit', 'catalog', 'rbac'],
    steps: [
      {
        title: 'Register assets in the catalog',
        caption: 'Every table, view, and column is registered in a central catalog with an owner and metadata. The catalog — not the storage path — becomes the control plane: you grant, audit, and discover through it.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">catalog.schema.table<small>owner · tags · classification</small></div>
          </div><small style="color:var(--text-muted)">one namespace over all data</small></div>`,
      },
      {
        title: 'Table-level lineage',
        caption: 'As jobs read and write, the catalog records upstream→downstream relationships automatically. You can answer "what feeds the gold table?" and "what breaks if I change this source?" without reading every pipeline.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-done">raw_orders</div><span class="viz-arrow">→</span>
            <div class="viz-box is-done">silver_orders</div><span class="viz-arrow">→</span>
            <div class="viz-box is-active">gold_revenue</div>
          </div></div>`,
      },
      {
        title: 'Column-level lineage',
        caption: 'Fine-grained lineage traces individual columns through transforms: gold_revenue.amount derives from silver_orders.price × qty. Essential for impact analysis and for proving where a sensitive field ended up.',
        diagram: `<div class="viz-col">
          <div class="viz-row"><div class="viz-box is-done">price</div><div class="viz-box is-done">qty</div></div>
          <span class="viz-arrow">↓ price × qty</span>
          <div class="viz-row"><div class="viz-box is-active">revenue.amount</div></div></div>`,
      },
      {
        title: 'Access policies',
        caption: 'Grants are expressed on catalog objects (role/group → privilege → object), not on files. One model covers notebooks, SQL, and BI tools. Row filters and column masks apply the same policy everywhere the data is read.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">analysts<small>SELECT on gold_*</small></div>
            <div class="viz-box is-hot">analysts<small>DENY raw PII</small></div>
          </div></div>`,
      },
      {
        title: 'Masking & row filtering',
        caption: 'A column mask shows analysts a tokenized email while admins see the real value — enforced at query time by identity, from the same stored data. Row filters restrict which rows a group can see (e.g. their region only).',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">admin → a***@corp.com? no: real</div></div>
          <div class="viz-row"><div class="viz-box is-done">analyst → a***@c***.com (masked)</div></div></div>`,
      },
      {
        title: 'Audit & discovery',
        caption: 'Every grant and access is logged, so you can answer "who read this table last quarter?". Combined with lineage and classification, the catalog turns compliance from a manual hunt into a query — the real payoff of central governance.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-done">audit log<small>who · what · when</small></div><span class="viz-arrow">+</span>
            <div class="viz-box is-done">lineage</div><span class="viz-arrow">=</span>
            <div class="viz-box is-active">provable compliance</div>
          </div></div>`,
      },
    ],
  });
})();
