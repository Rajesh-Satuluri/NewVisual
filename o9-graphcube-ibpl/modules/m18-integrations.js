import { createModuleShell, createIQSection } from '../components/module-shell.js';

export const IQ = [
  { q: 'How does data get into and out of o9?',
    a: 'Inbound: SFTP batch files (CSV/flat), REST API, SOAP/XML, and streaming, with pre-built connectors to SAP, Oracle, Snowflake, Databricks and Google BigQuery feeding a data lake / staging layer. Outbound: IBPL DownloadDataFile / ExportAll / Export for CSV/Excel extracts, plus API reads of the GraphCube server. Inbound data lands as member data (dimensional structure) and fact data (measure values at a grain), then the planning engine computes on it.',
    tip: 'Inbound = SFTP/REST/SOAP/streaming + connectors; outbound = IBPL exports + GraphCube API. Two payload kinds: members and facts.' },
  { q: 'How do you ensure ERP-fed data is correct before it affects the live plan?',
    a: 'Stage and validate before promoting to CWV: load into a staging/scenario version, run validation IBPL (row counts, null checks, referential checks that every fact key resolves to a real member, range/outlier checks), compare against the prior load, and only then copy into the Current Working View. Guard against orphan members (facts whose member was never created) and grain mismatches. The version isolation makes this safe — a bad load in staging never touches the live plan.',
    tip: 'Pattern: load to staging version → validate (counts, nulls, orphans, ranges) → compare → promote to CWV.' },
  { q: 'What is the difference between loading member data and fact data?',
    a: 'Member data creates/updates the dimensional structure — SKUs, locations, hierarchy parents (via createmember/updatemember or a member file). Fact data loads measure values at a measure group\'s grain (via fact file upload or update). Order matters: members first, then facts — a fact whose member doesn\'t exist yet becomes an orphan or is rejected. Calculative measures aren\'t loaded directly; you load their inputs.',
    tip: 'Members before facts — always. A fact for a non-existent member orphans or fails.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M18 · Operations',
    title: 'Integrations',
    subtitle: 'Getting data in and out: ingestion channels, connectors, the members-then-facts order, and validation before go-live.',
    tabs: [
      { id: 'channels', label: '🔌 Channels & Connectors' },
      { id: 'flow',     label: '🔁 Load → Validate → Promote' },
      { id: 'iq',       label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  container.querySelector('#tab-channels').innerHTML = `
    <div class="section-pad">
      <p class="lead">The platform ingests from systems of record and external feeds through several channels.</p>
      <div class="card-grid">
        <div class="card"><h4>📁 SFTP batch</h4><p>Scheduled CSV / flat-file drops — the workhorse for ERP extracts.</p></div>
        <div class="card"><h4>🌐 REST API</h4><p>Programmatic reads/writes, incl. access to the GraphCube server data & model.</p></div>
        <div class="card"><h4>🧾 SOAP / XML</h4><p>Legacy enterprise integration payloads.</p></div>
        <div class="card"><h4>📡 Streaming</h4><p>Near-real-time event feeds for demand sensing.</p></div>
      </div>
      <div class="code-cap">Pre-built connectors</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${['SAP','Oracle','Snowflake','Databricks','Google BigQuery'].map(c=>`<span class="pill on">${c}</span>`).join('')}
      </div>
      <div class="code-cap" style="margin-top:16px">Outbound (IBPL)</div>
      <pre class="code"><span class="tok-k">DownloadDataFile</span> ...   <span class="tok-c">-- CSV/Excel extract of a query</span>
<span class="tok-k">ExportAll</span> / <span class="tok-k">Export</span> ...    <span class="tok-c">-- bulk out to downstream systems</span></pre>
    </div>`;

  container.querySelector('#tab-flow').innerHTML = `
    <div class="section-pad">
      <p class="lead">Never load straight into the live plan. Stage, validate, then promote — version isolation makes it safe.</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[
          ['1','Members first','Load/refresh dimensional structure (createmember / member file). Facts need their members to exist.','#F59E0B'],
          ['2','Facts to staging','Load measure values at the correct grain into a staging/scenario version — not CWV.','#A78BFA'],
          ['3','Validate','IBPL checks: row counts, null checks, every fact key resolves to a real member (no orphans), range/outlier checks, compare vs prior load.','#22D3EE'],
          ['4','Promote','Copy validated measures into the Current Working View (copymeasure / cross-version scope).','#34D399'],
        ].map(([n,t,d,c])=>`<div class="card" style="border-left:4px solid ${c};display:flex;gap:14px;align-items:flex-start"><div style="font-size:20px;font-weight:800;color:${c};min-width:26px">${n}</div><div><h4 style="color:${c}">${t}</h4><p>${d}</p></div></div>`).join('')}
      </div>
      <div class="callout warn"><b>Two silent killers:</b> grain mismatch (facts loaded at the wrong granularity) and orphan members (facts whose member was never created). Validate for both before promoting.</div>
    </div>`;

  return null;
}
