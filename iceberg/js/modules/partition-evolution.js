/* ============================================================
   Partition Evolution Module
   Animated 7-step tour of Iceberg's schema-evolution-for-
   partitions feature: from country-only spec → add month
   bucketing (no rewrite) → drop country (no rewrite).
   ShopKart: orders table, 6 PB, 3 spec changes in 2 years.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('pe-styles')) return;
    const s = document.createElement('style');
    s.id = 'pe-styles';
    s.textContent = `
.pe-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.pe-outer {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.pe-canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--bg-1);
  overflow: hidden;
}

.pe-sidebar {
  width: 360px;
  border-left: 1px solid var(--border-default);
  background: var(--bg-2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.pe-sidebar-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.pe-sidebar-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.pe-sidebar-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.55;
  min-height: 52px;
}

.pe-steps-list {
  flex: 0 0 auto;
  overflow-y: auto;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-default);
  max-height: 230px;
}

.pe-step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 16px;
  cursor: pointer;
  transition: background 0.12s;
  border-left: 3px solid transparent;
}
.pe-step-item:hover { background: var(--bg-3); }
.pe-step-item.active { background: rgba(74,174,255,0.07); border-left-color: var(--blue); }
.pe-step-item.done { opacity: 0.6; }

.pe-step-badge {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--bg-4);
  color: var(--text-muted);
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
  transition: background 0.12s, color 0.12s;
}
.pe-step-item.active .pe-step-badge { background: var(--blue); color: #fff; }
.pe-step-item.done .pe-step-badge   { background: var(--green); color: #fff; }

.pe-step-text { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }
.pe-step-item.active .pe-step-text { color: var(--text-primary); font-weight: 500; }

.pe-info-panel {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.pe-info-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  margin-top: 10px;
}

.pe-spec-card {
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 6px;
  font-family: var(--font-mono);
  font-size: 10.5px;
}

.pe-spec-card.active-spec {
  border-color: var(--blue);
  background: rgba(88,166,255,0.06);
}

.pe-spec-id {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.pe-spec-def { color: var(--text-secondary); line-height: 1.5; }
.pe-spec-era { font-size: 9.5px; color: var(--text-muted); margin-top: 4px; }

.pe-kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

.pe-kpi {
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 9px 11px;
}

.pe-kpi-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 3px; }
.pe-kpi-value { font-size: 14px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
.pe-kpi-sub   { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
.pe-kpi-value.green  { color: var(--green); }
.pe-kpi-value.orange { color: var(--orange); }
.pe-kpi-value.blue   { color: var(--blue); }
`;
    document.head.appendChild(s);
  }

  /* ── Step metadata ──────────────────────────────────────── */
  function _getStepDescs() {
    return [
      { label: 'Spec 0: country only',
        desc: 'ShopKart launched with PARTITIONED BY (country) — 30 partitions, one per country. Simple and fast to implement.' },
      { label: 'Skew Discovered (18 months later)',
        desc: 'After 18 months: BR and US account for 65% of all files. Spark task skew: BR partition tasks take 47× longer than LU. Query time variance is unacceptable.' },
      { label: 'ADD PARTITION FIELD: months(order_date)',
        desc: 'No data rewrite. Iceberg creates partition spec 1. All existing files keep their spec_id=0 tag. New writes will use spec_id=1 with compound key: country + month.' },
      { label: 'Old Files Keep spec_id=0',
        desc: 'Iceberg stores spec_id per manifest file. Old manifests reference spec 0 files; new manifests reference spec 1 files. Both coexist in every query.' },
      { label: 'New Writes Use Spec 1',
        desc: 'All new orders are written into compound partitions. BR\'s 8,247 files are now spread across 24 months: ~344 files/month vs 8,247 in one partition. Skew resolved.' },
      { label: 'DROP PARTITION FIELD: identity(country)',
        desc: '2 years later: ShopKart simplifies to month-only partitioning for BI workloads. Drop the country identity field. Again, zero data rewrite.' },
      { label: '3 Specs, 1 Table',
        desc: 'ShopKart\'s orders table has lived through 3 partition strategies without a single ETL migration. This is Iceberg\'s most operationally impactful feature.' },
    ];
  }

  /* ── SVG ────────────────────────────────────────────────── */
  function _buildSVG() {
    const W = 860, H = 440;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.maxWidth = W + 'px';
    svg.style.maxHeight = H + 'px';
    svg.id = 'pe-svg';

    svg.innerHTML = `
<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="12" y="14" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">ShopKart Partition Evolution — orders table, 6 PB</text>

<!-- ═══ LEFT: Partition Spec History ═══ -->
<rect x="12" y="22" width="260" height="410" rx="8" fill="#0d1117" stroke="#30363d" stroke-width="1.2"/>
<text x="28" y="41" font-family="system-ui" font-size="10" font-weight="700" fill="rgba(139,148,158,0.7)">Partition Spec History</text>

<!-- Spec 0 -->
<g id="pe-spec0-card">
  <rect x="20" y="50" width="244" height="72" rx="6" fill="#161b22" stroke="#30363d" stroke-width="1"/>
  <text x="32" y="67" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.5)" letter-spacing="0.04em">SPEC 0</text>
  <text x="32" y="82" font-family="ui-monospace" font-size="9.5" fill="#e6edf3">identity(country)</text>
  <text x="32" y="96" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.5)">30 partitions</text>
  <text x="32" y="110" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.4)">2022-01 – 2023-06</text>
</g>
<rect id="pe-hl-spec0" x="18" y="48" width="248" height="76" rx="7" fill="none" stroke="#58a6ff" stroke-width="2" opacity="0"/>

<!-- Spec 1 (hidden until step 3) -->
<g id="pe-spec1-card" opacity="0">
  <rect x="20" y="132" width="244" height="80" rx="6" fill="#161b22" stroke="#30363d" stroke-width="1"/>
  <text x="32" y="149" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.5)" letter-spacing="0.04em">SPEC 1</text>
  <text x="32" y="164" font-family="ui-monospace" font-size="9.5" fill="#e6edf3">identity(country)</text>
  <text x="32" y="178" font-family="ui-monospace" font-size="9.5" fill="#e6edf3">+ month(order_date)</text>
  <text x="32" y="192" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.5)">compound partition key</text>
  <text x="32" y="204" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.4)">2023-06 – 2024-12</text>
</g>
<rect id="pe-hl-spec1" x="18" y="130" width="248" height="84" rx="7" fill="none" stroke="#56d364" stroke-width="2" opacity="0"/>

<!-- Spec 2 (hidden until step 6) -->
<g id="pe-spec2-card" opacity="0">
  <rect x="20" y="224" width="244" height="72" rx="6" fill="#161b22" stroke="#30363d" stroke-width="1"/>
  <text x="32" y="241" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.5)" letter-spacing="0.04em">SPEC 2</text>
  <text x="32" y="256" font-family="ui-monospace" font-size="9.5" fill="#e6edf3">month(order_date)</text>
  <text x="32" y="270" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.5)">BI-optimized, one field</text>
  <text x="32" y="284" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.4)">2025-01 – present</text>
</g>
<rect id="pe-hl-spec2" x="18" y="222" width="248" height="76" rx="7" fill="none" stroke="#f0883e" stroke-width="2" opacity="0"/>

<!-- ALTER TABLE SQL (step 3) -->
<g id="pe-alter1-sql" opacity="0">
  <rect x="20" y="306" width="244" height="50" rx="5" fill="#0a1f10" stroke="#56d364" stroke-width="1"/>
  <text x="32" y="323" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.8)">ALTER TABLE orders</text>
  <text x="32" y="337" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.8)">ADD PARTITION FIELD</text>
  <text x="32" y="351" font-family="ui-monospace" font-size="8.5" fill="#56d364">  months(order_date)</text>
</g>

<!-- ALTER TABLE SQL (step 6) -->
<g id="pe-alter2-sql" opacity="0">
  <rect x="20" y="306" width="244" height="50" rx="5" fill="#1a0f00" stroke="#f0883e" stroke-width="1"/>
  <text x="32" y="323" font-family="ui-monospace" font-size="8.5" fill="rgba(240,136,62,0.8)">ALTER TABLE orders</text>
  <text x="32" y="337" font-family="ui-monospace" font-size="8.5" fill="rgba(240,136,62,0.8)">DROP PARTITION FIELD</text>
  <text x="32" y="351" font-family="ui-monospace" font-size="8.5" fill="#f0883e">  identity(country)</text>
</g>

<!-- "0 bytes rewritten" badge -->
<g id="pe-zero-rewrite" opacity="0">
  <rect x="20" y="364" width="244" height="30" rx="5" fill="rgba(86,211,100,0.08)" stroke="#56d364" stroke-width="1.2"/>
  <text x="142" y="383" text-anchor="middle" font-family="system-ui" font-size="9.5" font-weight="700" fill="#56d364">0 bytes rewritten</text>
</g>

<!-- ═══ CENTER: Timeline ═══ -->
<line x1="390" y1="30" x2="390" y2="420" stroke="#1c2128" stroke-width="1.5" stroke-dasharray="4 3"/>

<!-- Timeline nodes -->
<circle id="pe-node0" cx="390" cy="80" r="10" fill="#0d1f3c" stroke="#1f6feb" stroke-width="2"/>
<text x="390" y="84" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="700" fill="#58a6ff">0</text>

<circle id="pe-node1" cx="390" cy="180" r="10" fill="#0d1117" stroke="#30363d" stroke-width="1.5" opacity="0.4"/>
<text x="390" y="184" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(139,148,158,0.4)">1</text>

<circle id="pe-node2" cx="390" cy="280" r="10" fill="#0d1117" stroke="#30363d" stroke-width="1.5" opacity="0.4"/>
<text x="390" y="284" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(139,148,158,0.4)">2</text>

<!-- Active node overlays -->
<circle id="pe-hl-node1" cx="390" cy="180" r="10" fill="#0a1f10" stroke="#56d364" stroke-width="2" opacity="0"/>
<text id="pe-node1-text" x="390" y="184" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="700" fill="#56d364" opacity="0">1</text>

<circle id="pe-hl-node2" cx="390" cy="280" r="10" fill="#1a0f00" stroke="#f0883e" stroke-width="2" opacity="0"/>
<text id="pe-node2-text" x="390" y="284" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="700" fill="#f0883e" opacity="0">2</text>

<!-- ═══ RIGHT: S3 Layout Preview ═══ -->
<rect x="430" y="22" width="416" height="410" rx="8" fill="#0d1117" stroke="#30363d" stroke-width="1.2"/>
<text x="446" y="42" font-family="system-ui" font-size="10" font-weight="700" fill="rgba(139,148,158,0.7)">S3 Layout Preview</text>

<!-- Spec 0 layout (flat country folders) -->
<g id="pe-s3-spec0" opacity="0">
  <text x="446" y="62" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.7)">s3://shopkart-lakehouse/warehouse/orders/</text>
  <rect x="438" y="68" width="400" height="18" rx="3" fill="#111d30"/>
  <text x="452" y="81" font-family="ui-monospace" font-size="8" fill="#e6edf3">country=AR/</text>
  <rect x="438" y="90" width="400" height="18" rx="3" fill="#0d1117"/>
  <text x="452" y="103" font-family="ui-monospace" font-size="8" fill="rgba(230,237,243,0.7)">country=BR/  ← 8,247 files 🔥</text>
  <rect x="438" y="112" width="400" height="18" rx="3" fill="#111d30"/>
  <text x="452" y="125" font-family="ui-monospace" font-size="8" fill="rgba(230,237,243,0.7)">country=CA/</text>
  <rect x="438" y="134" width="400" height="18" rx="3" fill="#0d1117"/>
  <text x="452" y="147" font-family="ui-monospace" font-size="8" fill="rgba(230,237,243,0.7)">country=DE/</text>
  <rect x="438" y="156" width="400" height="18" rx="3" fill="#111d30"/>
  <text x="452" y="169" font-family="ui-monospace" font-size="8" fill="rgba(230,237,243,0.7)">country=FR/</text>
  <text x="446" y="192" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.5)">... 25 more countries ...</text>
  <rect x="438" y="200" width="400" height="18" rx="3" fill="#111d30"/>
  <text x="452" y="213" font-family="ui-monospace" font-size="8" fill="rgba(230,237,243,0.7)">country=US/  ← 6,103 files</text>
  <text x="446" y="238" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.7)">30 partition folders total</text>
</g>

<!-- Skew histogram (step 2) -->
<g id="pe-skew-chart" opacity="0">
  <text x="446" y="56" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(248,81,73,0.9)">File Count per Partition (Top 5 + Bottom 5):</text>
  <!-- Bar chart -->
  <rect x="446" y="64" width="${Math.round(400*8247/8247)}" height="18" rx="2" fill="rgba(248,81,73,0.7)"/>
  <text x="852" y="77" text-anchor="end" font-family="ui-monospace" font-size="8" fill="#f85149">BR: 8,247</text>
  <rect x="446" y="88" width="${Math.round(400*6103/8247)}" height="18" rx="2" fill="rgba(240,136,62,0.7)"/>
  <text x="852" y="101" text-anchor="end" font-family="ui-monospace" font-size="8" fill="#f0883e">US: 6,103</text>
  <rect x="446" y="112" width="${Math.round(400*3891/8247)}" height="18" rx="2" fill="rgba(227,179,65,0.7)"/>
  <text x="852" y="125" text-anchor="end" font-family="ui-monospace" font-size="8" fill="#e3b341">MX: 3,891</text>
  <rect x="446" y="136" width="${Math.round(400*3204/8247)}" height="18" rx="2" fill="rgba(88,166,255,0.5)"/>
  <text x="852" y="149" text-anchor="end" font-family="ui-monospace" font-size="8" fill="#58a6ff">DE: 3,204</text>
  <rect x="446" y="160" width="${Math.round(400*2944/8247)}" height="18" rx="2" fill="rgba(88,166,255,0.5)"/>
  <text x="852" y="173" text-anchor="end" font-family="ui-monospace" font-size="8" fill="#58a6ff">FR: 2,944</text>
  <text x="446" y="198" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.5)">... 23 more countries (8–224 files) ...</text>
  <rect x="446" y="206" width="${Math.round(400*224/8247)}" height="14" rx="2" fill="rgba(86,211,100,0.4)"/>
  <text x="852" y="218" text-anchor="end" font-family="ui-monospace" font-size="8" fill="#56d364">SG: 224</text>
  <rect x="446" y="224" width="${Math.round(400*42/8247)}" height="14" rx="2" fill="rgba(86,211,100,0.4)"/>
  <text x="852" y="236" text-anchor="end" font-family="ui-monospace" font-size="8" fill="#56d364">SE: 42</text>
  <rect x="446" y="242" width="${Math.round(400*18/8247)}" height="14" rx="2" fill="rgba(86,211,100,0.4)"/>
  <text x="852" y="254" text-anchor="end" font-family="ui-monospace" font-size="8" fill="#56d364">LU: 18</text>
  <rect x="446" y="262" width="400" height="22" rx="4" fill="rgba(248,81,73,0.1)" stroke="rgba(248,81,73,0.3)" stroke-width="1"/>
  <text x="646" y="277" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="700" fill="#f85149">BR tasks take 47× longer than LU — critical skew</text>
</g>

<!-- Spec 1 split view (step 4+) -->
<g id="pe-s3-spec1" opacity="0">
  <text x="446" y="56" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.6)">── Old files (spec_id=0) ──────────────────</text>
  <rect x="438" y="64" width="400" height="18" rx="3" fill="#111d30"/>
  <text x="452" y="77" font-family="ui-monospace" font-size="8" fill="rgba(88,166,255,0.6)">country=BR/  (spec0 flat)</text>
  <rect x="438" y="86" width="400" height="18" rx="3" fill="#0d1117"/>
  <text x="452" y="99" font-family="ui-monospace" font-size="8" fill="rgba(88,166,255,0.6)">country=US/  (spec0 flat)</text>
  <rect x="438" y="108" width="400" height="18" rx="3" fill="#111d30"/>
  <text x="452" y="121" font-family="ui-monospace" font-size="8" fill="rgba(88,166,255,0.6)">country=DE/  (spec0 flat)</text>

  <text x="446" y="152" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.6)">── New files (spec_id=1) ──────────────────</text>
  <rect x="438" y="160" width="400" height="18" rx="3" fill="#111d30"/>
  <text x="452" y="173" font-family="ui-monospace" font-size="8" fill="#56d364">country=BR/order_date_month=2024-01/</text>
  <rect x="438" y="182" width="400" height="18" rx="3" fill="#0d1117"/>
  <text x="452" y="195" font-family="ui-monospace" font-size="8" fill="#56d364">country=BR/order_date_month=2024-02/</text>
  <rect x="438" y="204" width="400" height="18" rx="3" fill="#111d30"/>
  <text x="452" y="217" font-family="ui-monospace" font-size="8" fill="#56d364">country=US/order_date_month=2024-01/</text>
  <text x="446" y="243" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.5)">... 72 more compound partition folders ...</text>
  <rect x="438" y="252" width="400" height="26" rx="4" fill="rgba(86,211,100,0.07)" stroke="rgba(86,211,100,0.25)" stroke-width="1"/>
  <text x="638" y="266" text-anchor="middle" font-family="system-ui" font-size="8.5" font-weight="700" fill="#56d364">Both specs coexist — Iceberg reads both transparently</text>
  <text x="638" y="276" text-anchor="middle" font-family="system-ui" font-size="7.5" fill="rgba(86,211,100,0.6)">spec_id tag on each manifest file</text>
</g>

<!-- Spec 2 layout (step 6+) -->
<g id="pe-s3-spec2" opacity="0">
  <text x="446" y="56" font-family="ui-monospace" font-size="8.5" fill="rgba(240,136,62,0.7)">── Spec 2: month-only (new writes) ────────</text>
  <rect x="438" y="64" width="400" height="18" rx="3" fill="#111d30"/>
  <text x="452" y="77" font-family="ui-monospace" font-size="8" fill="rgba(240,136,62,0.8)">order_date_month=2025-01/</text>
  <rect x="438" y="86" width="400" height="18" rx="3" fill="#0d1117"/>
  <text x="452" y="99" font-family="ui-monospace" font-size="8" fill="rgba(240,136,62,0.8)">order_date_month=2025-02/</text>
  <rect x="438" y="108" width="400" height="18" rx="3" fill="#111d30"/>
  <text x="452" y="121" font-family="ui-monospace" font-size="8" fill="rgba(240,136,62,0.8)">order_date_month=2025-03/</text>
  <text x="446" y="155" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.5)">── Spec 0 files still intact ──────────────</text>
  <text x="452" y="172" font-family="ui-monospace" font-size="8" fill="rgba(88,166,255,0.4)">country=BR/ ... country=US/ ...  (untouched)</text>
  <text x="446" y="200" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.5)">── Spec 1 files still intact ──────────────</text>
  <text x="452" y="217" font-family="ui-monospace" font-size="8" fill="rgba(86,211,100,0.4)">country=BR/month=2024-01/ ...  (untouched)</text>
  <rect x="438" y="230" width="400" height="22" rx="4" fill="rgba(240,136,62,0.07)" stroke="rgba(240,136,62,0.25)" stroke-width="1"/>
  <text x="638" y="245" text-anchor="middle" font-family="system-ui" font-size="8.5" font-weight="700" fill="#f0883e">3 active specs, 6 PB, zero migration cost</text>
</g>

<!-- Summary timeline (step 7) -->
<g id="pe-summary" opacity="0">
  <rect x="438" y="30" width="400" height="380" rx="7" fill="#0d1117" stroke="#30363d" stroke-width="1"/>
  <text x="638" y="56" text-anchor="middle" font-family="system-ui" font-size="11" font-weight="700" fill="#e6edf3">3 Specs, 1 Table, 0 Rewrites</text>
  <!-- Timeline bars -->
  <rect x="454" y="72" width="370" height="60" rx="5" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1"/>
  <text x="466" y="93" font-family="system-ui" font-size="10" font-weight="700" fill="#58a6ff">Spec 0: identity(country)</text>
  <text x="466" y="109" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.6)">Jan 2022 – Jun 2023 · 30 partitions</text>
  <text x="466" y="122" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.6)">Skew discovered: BR 47× slower than LU</text>
  <rect x="454" y="146" width="370" height="60" rx="5" fill="#0a1f10" stroke="#56d364" stroke-width="1"/>
  <text x="466" y="167" font-family="system-ui" font-size="10" font-weight="700" fill="#56d364">Spec 1: identity(country) + month(order_date)</text>
  <text x="466" y="183" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.6)">Jun 2023 – Dec 2024 · compound key</text>
  <text x="466" y="196" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.6)">Skew resolved: ~344 files/month vs 8,247</text>
  <rect x="454" y="220" width="370" height="60" rx="5" fill="#1a0f00" stroke="#f0883e" stroke-width="1"/>
  <text x="466" y="241" font-family="system-ui" font-size="10" font-weight="700" fill="#f0883e">Spec 2: month(order_date)</text>
  <text x="466" y="257" font-family="ui-monospace" font-size="8.5" fill="rgba(240,136,62,0.6)">Jan 2025 – present · BI-optimized</text>
  <text x="466" y="270" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.6)">Simplified for analytics workloads</text>
  <!-- Stats row -->
  <rect x="454" y="298" width="370" height="60" rx="5" fill="rgba(86,211,100,0.06)" stroke="rgba(86,211,100,0.2)" stroke-width="1"/>
  <text x="466" y="318" font-family="system-ui" font-size="9.5" font-weight="700" fill="#56d364">Impact vs Hive-style migrations:</text>
  <text x="466" y="334" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Bytes rewritten across 3 spec changes:</text>
  <text x="790" y="334" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#56d364">0 bytes</text>
  <text x="466" y="349" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Equivalent Hive rewrite cost (6 PB × 3):</text>
  <text x="790" y="349" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#f85149">~$54,000</text>
</g>
`;
    return svg;
  }

  /* ── Animation steps ────────────────────────────────────── */
  function _buildAnimationSteps(svg) {
    const AE = IV.AnimationEngine;

    function g(id) { return svg.getElementById(id); }
    function show(id, glowColor) {
      const el = g(id);
      if (!el) return;
      el.setAttribute('opacity', '1');
      if (glowColor === 'blue')   el.style.filter = 'drop-shadow(0 0 8px rgba(88,166,255,0.7))';
      if (glowColor === 'green')  el.style.filter = 'drop-shadow(0 0 8px rgba(86,211,100,0.7))';
      if (glowColor === 'orange') el.style.filter = 'drop-shadow(0 0 8px rgba(240,136,62,0.7))';
      if (glowColor === 'red')    el.style.filter = 'drop-shadow(0 0 8px rgba(248,81,73,0.7))';
    }
    function hide(id) {
      const el = g(id);
      if (el) { el.setAttribute('opacity', '0'); el.style.filter = ''; }
    }
    function unglow(id) {
      const el = g(id);
      if (el) el.style.filter = '';
    }

    return [
      AE.fnStep('Spec 0: country only', '', () => {
        show('pe-hl-spec0', 'blue');
        show('pe-s3-spec0');
        show('pe-node0');
      }, () => {
        hide('pe-hl-spec0');
        hide('pe-s3-spec0');
      }, 2800),

      AE.fnStep('Skew Discovered (18 months later)', '', () => {
        unglow('pe-hl-spec0');
        hide('pe-s3-spec0');
        show('pe-skew-chart');
      }, () => {
        hide('pe-skew-chart');
      }, 3200),

      AE.fnStep('ADD PARTITION FIELD: months(order_date)', '', () => {
        hide('pe-skew-chart');
        show('pe-hl-spec1', 'green');
        show('pe-spec1-card', 'green');
        show('pe-hl-node1', 'green');
        show('pe-node1-text');
        show('pe-alter1-sql');
        show('pe-zero-rewrite');
      }, () => {
        hide('pe-hl-spec1');
        hide('pe-alter1-sql');
        hide('pe-zero-rewrite');
      }, 3000),

      AE.fnStep('Old Files Keep spec_id=0', '', () => {
        unglow('pe-hl-spec1');
        show('pe-s3-spec1');
      }, () => {
        hide('pe-s3-spec1');
      }, 3000),

      AE.fnStep('New Writes Use Spec 1', '', () => {
        hide('pe-alter1-sql');
        show('pe-s3-spec1');
      }, () => {
        hide('pe-s3-spec1');
      }, 2800),

      AE.fnStep('DROP PARTITION FIELD: identity(country)', '', () => {
        hide('pe-s3-spec1');
        hide('pe-zero-rewrite');
        show('pe-hl-spec2', 'orange');
        show('pe-spec2-card', 'orange');
        show('pe-hl-node2', 'orange');
        show('pe-node2-text');
        show('pe-alter2-sql');
        show('pe-zero-rewrite');
        show('pe-s3-spec2');
      }, () => {
        hide('pe-hl-spec2');
        hide('pe-alter2-sql');
        hide('pe-zero-rewrite');
        hide('pe-s3-spec2');
      }, 3200),

      AE.fnStep('3 Specs, 1 Table', '', () => {
        unglow('pe-hl-spec0'); unglow('pe-hl-spec1'); unglow('pe-hl-spec2');
        hide('pe-alter2-sql');
        hide('pe-s3-spec2');
        show('pe-summary', 'green');
        show('pe-zero-rewrite');
      }, () => {
        hide('pe-summary');
        hide('pe-zero-rewrite');
      }, 5000),
    ];
  }

  /* ── Sidebar ────────────────────────────────────────────── */
  function _buildSidebar(page, engine, stepsData) {
    const list    = page.querySelector('#pe-steps-list');
    const titleEl = page.querySelector('#pe-step-title');
    const descEl  = page.querySelector('#pe-step-desc');
    if (!list) return;

    list.innerHTML = stepsData.map((s, i) => `
      <div class="pe-step-item" data-step="${i}">
        <div class="pe-step-badge">${i + 1}</div>
        <div class="pe-step-text">${s.label}</div>
      </div>
    `).join('');

    engine.on('stepchange', (idx) => {
      list.querySelectorAll('.pe-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
      const step = idx >= 0 ? stepsData[idx] : null;
      if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
      if (descEl)  descEl.textContent  = step ? step.desc  : 'Watch ShopKart\'s orders table evolve through 3 partition strategies over 3 years, with zero data rewritten.';
      const active = list.querySelector('.pe-step-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-step]');
      if (item) engine.goto(parseInt(item.dataset.step, 10));
    });
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'partition-evolution',
    title: 'Partition Evolution',
    group: 'metadata',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'pe-page page-enter';
      page.innerHTML = `
        <div class="pe-outer">
          <div class="pe-canvas" id="pe-canvas"></div>
          <div class="pe-sidebar">
            <div class="pe-sidebar-header">
              <div class="pe-sidebar-title" id="pe-step-title">Press Play to begin</div>
              <div class="pe-sidebar-desc" id="pe-step-desc">Watch ShopKart's orders table evolve through 3 partition strategies over 3 years, with zero data rewritten.</div>
            </div>
            <div class="pe-steps-list" id="pe-steps-list"></div>
            <div class="pe-info-panel">
              <div class="pe-info-label">Current Specs</div>
              <div class="pe-spec-card">
                <div class="pe-spec-id">Spec 0 — 2022–2023</div>
                <div class="pe-spec-def">identity(country)</div>
                <div class="pe-spec-era">30 partitions · flat layout</div>
              </div>
              <div class="pe-spec-card">
                <div class="pe-spec-id">Spec 1 — 2023–2024</div>
                <div class="pe-spec-def">identity(country) + month(order_date)</div>
                <div class="pe-spec-era">compound key · skew fixed</div>
              </div>
              <div class="pe-spec-card">
                <div class="pe-spec-id">Spec 2 — 2025+</div>
                <div class="pe-spec-def">month(order_date)</div>
                <div class="pe-spec-era">BI-optimized · single field</div>
              </div>
              <div class="pe-info-label">Table Stats</div>
              <div class="pe-kpi-grid">
                <div class="pe-kpi">
                  <div class="pe-kpi-label">Total Size</div>
                  <div class="pe-kpi-value blue">6 PB</div>
                  <div class="pe-kpi-sub">uncompressed</div>
                </div>
                <div class="pe-kpi">
                  <div class="pe-kpi-label">Bytes Rewritten</div>
                  <div class="pe-kpi-value green">0</div>
                  <div class="pe-kpi-sub">across 3 changes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(page);

      const svg    = _buildSVG();
      page.querySelector('#pe-canvas').appendChild(svg);

      const stepsData = _getStepDescs();
      const steps     = _buildAnimationSteps(svg);
      const engine    = new IV.AnimationEngine({ steps });
      engine.setContext({ svg });
      this._engine = engine;

      _buildSidebar(page, engine, stepsData);
      IV.AnimationControls.register(engine);
    },

    destroy() {
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      IV.AnimationControls.hide();
      document.getElementById('pe-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['partition-evolution'] = mod;
})();
