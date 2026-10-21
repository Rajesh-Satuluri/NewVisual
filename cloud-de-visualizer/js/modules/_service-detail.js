/* ============================================================
   Cloud DE Visualizer — generic Service Detail renderer.
   One renderer drives every cloud service page. A service object
   supplies up to six "depth" sections (What / Why / How / DE Use
   Case / Integrations / Runtime) plus optional key facts and
   interview Q&A. Pages scroll via the .page-enter bridge; no
   animation engine is attached.

   Public API:
     TV.ServiceDetail.registerAll(format, services[])
     TV.ServiceDetail.registerHome(format, meta)
     TV.ServiceDetail.categoriesFor(format)  -> ordered [{id,label,icon,items}]
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  /* Category registry — label + sidebar icon + display order, shared
     across formats. A service's `category` keys into this. */
  const CATEGORIES = {
    storage:      { label: 'Storage',              icon: 'folder',  order: 10 },
    'ingest-etl': { label: 'Ingestion & ETL',      icon: 'arrow-down', order: 20 },
    streaming:    { label: 'Streaming',            icon: 'activity', order: 30 },
    analytics:    { label: 'Analytics & Warehouse', icon: 'cpu',    order: 40 },
    databases:    { label: 'Databases',            icon: 'layers',  order: 50 },
    orchestration:{ label: 'Orchestration',        icon: 'git-branch', order: 60 },
    compute:      { label: 'Compute & Runtime',    icon: 'zap',     order: 70 },
    ml:           { label: 'ML & AI',              icon: 'sparkles', order: 80 },
    governance:   { label: 'Governance & Security', icon: 'shield', order: 90 },
    ops:          { label: 'Monitoring & Ops',     icon: 'sliders', order: 100 },
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  }

  /* Normalize a section: accept a string (lead only) or an object
     { lead, bullets:[{h,d}], code:{lang,text}, note }. */
  function normSection(s) {
    if (!s) return null;
    if (typeof s === 'string') return { lead: s };
    return s;
  }

  function bulletsHTML(bullets) {
    if (!bullets || !bullets.length) return '';
    return `<div class="sd-bullets">` + bullets.map(b =>
      `<div class="sd-bullet">
         <div class="sd-bullet-h">${esc(b.h)}</div>
         <div class="sd-bullet-d">${esc(b.d)}</div>
       </div>`).join('') + `</div>`;
  }

  function codeHTML(code) {
    if (!code || !code.text) return '';
    return `<div class="sd-code"><div class="sd-code-lang">${esc(code.lang || 'code')}</div><pre>${esc(code.text)}</pre></div>`;
  }

  /* Callouts — pedagogical highlight boxes. A section may supply
     callouts:[{ kind, title?, body }] with kind in
     insight | gotcha | interview | analogy | tip. Renders nothing when absent. */
  const CO_ICON = { insight: '💡', gotcha: '⚠️', interview: '🎯', analogy: '🔗', tip: '📌' };
  const CO_LABEL = { insight: 'Key insight', gotcha: 'Gotcha', interview: 'Interview angle', analogy: 'Analogy', tip: 'Tip' };
  function calloutsHTML(callouts) {
    if (!callouts || !callouts.length) return '';
    return callouts.map(c => {
      if (!c || !c.body) return '';
      const kind = CO_ICON[c.kind] ? c.kind : 'tip';
      const title = c.title || CO_LABEL[kind];
      return `<div class="sd-callout" data-kind="${kind}">
          <span class="sd-co-ico" aria-hidden="true">${CO_ICON[kind]}</span>
          <div><span class="sd-co-b">${esc(title)}</span><span class="sd-co-body">${esc(c.body)}</span></div>
        </div>`;
    }).join('');
  }

  function sectionHTML(kicker, accent, section) {
    const s = normSection(section);
    if (!s) return '';
    const lead = s.lead ? `<p class="sd-lead">${esc(s.lead)}</p>` : '';
    const note = s.note ? `<div class="sd-note">${esc(s.note)}</div>` : '';
    return `
      <section class="sd-section" data-accent="${accent}">
        <div class="sd-kicker">${esc(kicker)}</div>
        ${lead}
        ${bulletsHTML(s.bullets)}
        ${codeHTML(s.code)}
        ${calloutsHTML(s.callouts)}
        ${note}
      </section>`;
  }

  function integrationsHTML(format, integrations) {
    if (!integrations || !integrations.length) return '';
    const chips = integrations.map(it => {
      const label = esc(it.label || it.id);
      const note = it.note ? `<span class="sd-chip-note">${esc(it.note)}</span>` : '';
      if (it.id) {
        const fmt = it.format || format;
        return `<a class="sd-chip sd-chip--link" href="#${fmt}/${it.id}">
                  <span class="sd-chip-label">${label}</span>${note}
                </a>`;
      }
      return `<span class="sd-chip"><span class="sd-chip-label">${label}</span>${note}</span>`;
    }).join('');
    return `
      <section class="sd-section" data-accent="link">
        <div class="sd-kicker">Integrations</div>
        <p class="sd-lead">How this service wires into the rest of a data platform. Linked chips open that service.</p>
        <div class="sd-chips">${chips}</div>
      </section>`;
  }

  /* Intuition callout: business-first mental model. Accepts a string
     or { pain, aha, when }. Sourced from svc.intuition or TV.Intuition. */
  function intuitionHTML(intu) {
    if (!intu) return '';
    let body;
    if (typeof intu === 'string') {
      body = `<p class="sd-intu-line">${esc(intu)}</p>`;
    } else {
      const row = (lbl, v) => v ? `<div class="sd-intu-row"><span class="sd-intu-lbl">${lbl}</span><span class="sd-intu-val">${esc(v)}</span></div>` : '';
      body = row('The pain', intu.pain) + row('The “aha”', intu.aha) + row('When to use', intu.when);
    }
    return `
      <section class="sd-intu" aria-label="Intuition">
        <div class="sd-intu-head"><span class="sd-intu-bulb">💡</span>Intuition — why this exists</div>
        ${body}
      </section>`;
  }

  function keyFactsHTML(facts) {
    if (!facts || !facts.length) return '';
    return `<div class="sd-facts">` + facts.map(f =>
      `<div class="sd-fact"><div class="sd-fact-k">${esc(f.k)}</div><div class="sd-fact-v">${esc(f.v)}</div></div>`
    ).join('') + `</div>`;
  }

  /* Cert mapping: which certifications/objectives this service maps to.
     Accepts { lead, items:[{cert, label, objectives:[...]}|string] }. */
  function certMappingHTML(cm) {
    if (!cm) return '';
    const items = (cm.items || []).map(it => {
      if (typeof it === 'string') return `<li class="sd-cm-row"><span class="sd-cm-txt">${esc(it)}</span></li>`;
      const objs = (it.objectives || []).length
        ? `<span class="sd-cm-objs">${it.objectives.map(o => esc(o)).join(' · ')}</span>` : '';
      const label = esc(it.label || it.cert || '');
      return `<li class="sd-cm-row"><span class="sd-cm-cert">${label}</span>${objs}</li>`;
    }).join('');
    const lead = cm.lead ? `<p class="sd-lead">${esc(cm.lead)}</p>` : '';
    return `
      <section class="sd-section" data-accent="certmap">
        <div class="sd-kicker">Certification mapping</div>
        ${lead}
        <ul class="sd-cm">${items}</ul>
      </section>`;
  }

  /* Execution walkthrough: ordered lifecycle of a representative
     operation. Accepts an array of steps, or { lead, steps:[string|{h,d}], note }. */
  function walkthroughHTML(wt) {
    if (!wt) return '';
    const w = Array.isArray(wt) ? { steps: wt } : wt;
    if (!w.steps || !w.steps.length) return '';
    const lead = w.lead ? `<p class="sd-lead">${esc(w.lead)}</p>` : '';
    const steps = w.steps.map(s => {
      const o = (typeof s === 'string') ? { d: s } : s;
      const h = o.h ? `<div class="sd-step-h">${esc(o.h)}</div>` : '';
      return `<li class="sd-step"><div class="sd-step-body">${h}<div class="sd-step-d">${esc(o.d)}</div></div></li>`;
    }).join('');
    const note = w.note ? `<div class="sd-note">${esc(w.note)}</div>` : '';
    return `
      <section class="sd-section" data-accent="walk">
        <div class="sd-kicker">Execution walkthrough</div>
        ${lead}
        <ol class="sd-steps">${steps}</ol>
        ${note}
      </section>`;
  }

  /* A value that may be a string or a list → rendered inline or as an
     ordered/unordered list. */
  function valOrList(v, ordered) {
    if (v == null) return '';
    if (Array.isArray(v)) {
      const tag = ordered ? 'ol' : 'ul';
      return `<${tag} class="sd-vlist">${v.map(x => `<li>${esc(x)}</li>`).join('')}</${tag}>`;
    }
    return `<span>${esc(v)}</span>`;
  }

  /* Worked examples: realistic end-to-end data-engineering scenarios.
     Each: { title, illustrative, requirement, input, architecture,
     code:{lang,text}, steps:[...], output, validation, errorHandling,
     production, cleanup }. Code is labelled illustrative unless
     illustrative===false (i.e. actually executed). */
  function examplesHTML(exs) {
    if (!exs || !exs.length) return '';
    const row = (lbl, v, ordered) => {
      const body = valOrList(v, ordered);
      return body ? `<div class="sd-ex-row"><div class="sd-ex-lbl">${esc(lbl)}</div><div class="sd-ex-val">${body}</div></div>` : '';
    };
    const cards = exs.map(ex => {
      const badge = ex.illustrative === false
        ? `<span class="sd-ex-badge sd-ex-badge--run" title="Executed in a real environment">Tested</span>`
        : `<span class="sd-ex-badge" title="Illustrative — copy-correct but not executed in a live cloud environment">Illustrative</span>`;
      const code = ex.code ? `<div class="sd-ex-row"><div class="sd-ex-lbl">Code</div><div class="sd-ex-val">${codeHTML(ex.code)}</div></div>` : '';
      return `<div class="sd-ex">
        <div class="sd-ex-head">${esc(ex.title || 'Worked example')}${badge}</div>
        ${row('Requirement', ex.requirement)}
        ${row('Input data', ex.input)}
        ${row('Architecture', ex.architecture)}
        ${code}
        ${row('Steps', ex.steps, true)}
        ${row('Expected output', ex.output)}
        ${row('Validation', ex.validation)}
        ${row('Error handling', ex.errorHandling)}
        ${row('Production notes', ex.production)}
        ${row('Cleanup', ex.cleanup)}
      </div>`;
    }).join('');
    return `
      <section class="sd-section" data-accent="example">
        <div class="sd-kicker">Worked example</div>
        <div class="sd-exs">${cards}</div>
      </section>`;
  }

  /* Troubleshooting / incident scenarios in the evidence-based format:
     Symptom → Evidence → Causes → Investigation → Root cause →
     Remediation → Validation → Prevention. Each: { symptom, evidence,
     causes, investigation, rootCause, remediation, validation, prevention }. */
  function troubleshootingHTML(ts) {
    if (!ts || !ts.length) return '';
    const field = (lbl, v, ordered) => {
      const body = valOrList(v, ordered);
      return body ? `<div class="sd-tb-row"><div class="sd-tb-lbl">${esc(lbl)}</div><div class="sd-tb-val">${body}</div></div>` : '';
    };
    const cards = ts.map(t => `<div class="sd-tb">
      <div class="sd-tb-sym"><span class="sd-tb-sym-tag">Symptom</span>${esc(t.symptom)}</div>
      ${field('Evidence', t.evidence)}
      ${field('Possible causes', t.causes)}
      ${field('Investigation', t.investigation, true)}
      ${field('Root cause', t.rootCause)}
      ${field('Remediation', t.remediation, true)}
      ${field('Validation', t.validation)}
      ${field('Prevention', t.prevention)}
    </div>`).join('');
    return `
      <section class="sd-section" data-accent="trouble">
        <div class="sd-kicker">Troubleshooting &amp; incidents</div>
        <p class="sd-lead">Evidence-first diagnosis. Each scenario traces symptom to root cause before prescribing a fix.</p>
        <div class="sd-tbs">${cards}</div>
      </section>`;
  }

  /* Does this service carry the extended deep-dive depth tier? */
  function hasDeepDepth(svc) {
    return !!(svc.architecture || svc.security || svc.operations || svc.cost ||
              svc.walkthrough || svc.examples || svc.troubleshooting);
  }

  /* "Test yourself" — the interview Q&A as flip-to-reveal flashcards with a
     self-grade, so the page drives active recall instead of passive reading. */
  function interviewHTML(qa) {
    if (!qa || !qa.length) return '';
    const cards = qa.map((x, i) => `
      <div class="sd-fc" data-fc="${i}">
        <div class="sd-fc-q"><span class="sd-fc-num">${i + 1}</span><span class="sd-fc-qt">${esc(x.q)}</span></div>
        <button class="sd-fc-reveal" type="button" aria-expanded="false">Reveal answer ▾</button>
        <div class="sd-fc-a" hidden>
          <p>${esc(x.a)}</p>
          <div class="sd-fc-grade">
            <button class="sd-fc-g sd-fc-g--good" type="button" data-g="good">✓ I knew it</button>
            <button class="sd-fc-g sd-fc-g--again" type="button" data-g="again">↻ Review again</button>
          </div>
        </div>
      </div>`).join('');
    return `
      <section class="sd-section sd-recall" data-accent="interview">
        <h2 class="sd-recall-h">🎯 Test yourself</h2>
        <p class="sd-recall-sub">Active recall beats re-reading — try to answer out loud before you reveal.</p>
        <div class="sd-fcs">${cards}</div>
      </section>`;
  }

  /* The next service in reading order (within, then across categories). */
  function nextService(format, svc) {
    const flat = [];
    categoriesFor(format).forEach(c => c.items.forEach(s => flat.push({ cat: c.label, svc: s })));
    const idx = flat.findIndex(x => x.svc.id === svc.id);
    if (idx < 0 || idx + 1 >= flat.length) return null;
    return flat[idx + 1];
  }
  function footerHTML(format, svc) {
    const nx = nextService(format, svc);
    if (!nx) return '';
    return `
      <div class="sd-foot">
        <a class="sd-next" href="#${format}/${nx.svc.id}">
          <span class="sd-next-lbl">Next up in ${esc(nx.cat)} →</span>
          <span class="sd-next-nm">${esc(nx.svc.name)}</span>
        </a>
      </div>`;
  }

  function styleTag() {
    return `
<style id="sd-styles">
.sd { height:100%; overflow-y:auto; padding:30px clamp(16px, 3vw, 56px) 88px; background:var(--bg-0); }
.sd-wrap { width:100%; max-width:1600px; margin:0 auto; }
.sd-eyebrow { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--brand); margin-bottom:8px; }
.sd-h1 { font-size:28px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin:0 0 6px; }
.sd-aka { font-size:13px; color:var(--text-muted); margin:0 0 10px; font-style:italic; }
.sd-tagline { font-size:16px; color:var(--text-secondary); line-height:1.7; margin:0 0 14px; max-width:760px; }
.sd-verified { margin:0 0 20px; }
.sd-intu { background:linear-gradient(135deg, var(--brand-glow), transparent 70%); border:1px solid var(--border-default); border-left:3px solid var(--brand); border-radius:var(--radius-lg,12px); padding:16px 18px; margin:0 0 18px; }
.sd-intu-head { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--brand); margin-bottom:11px; display:flex; align-items:center; gap:7px; }
.sd-intu-bulb { font-size:14px; }
.sd-intu-line { font-size:14px; color:var(--text-secondary); line-height:1.7; margin:0; }
.sd-intu-row { display:grid; grid-template-columns:96px 1fr; gap:12px; padding:5px 0; }
.sd-intu-row + .sd-intu-row { border-top:1px solid var(--border-subtle); }
.sd-intu-lbl { font-size:12px; font-weight:800; color:var(--text-muted); padding-top:2px; }
.sd-intu-val { font-size:14px; color:var(--text-secondary); line-height:1.65; }
@media (max-width:620px){ .sd-intu-row { grid-template-columns:1fr; gap:2px; } }
.sd-facts { display:flex; flex-wrap:wrap; gap:10px; margin:0 0 28px; }
.sd-fact { position:relative; overflow:hidden; background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:12px; padding:12px 16px 10px; min-width:132px; box-shadow:var(--card-shadow); }
.sd-fact::before { content:''; position:absolute; left:0; right:0; top:0; height:3px; background:var(--brand); opacity:.9; }
.sd-fact-k { font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); font-weight:800; margin-bottom:3px; }
.sd-fact-v { font-size:14px; font-weight:700; color:var(--text-primary); }
.sd-section { position:relative; background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:16px; padding:22px 26px 24px; margin-bottom:18px; box-shadow:var(--card-shadow); }
.sd-section::before { content:''; position:absolute; left:0; top:0; bottom:0; width:4px; border-radius:16px 0 0 16px; background:var(--stripe-neutral); }
.sd-section[data-accent="what"]::before { background:var(--brand); }
.sd-section[data-accent="why"]::before { background:var(--yellow); }
.sd-section[data-accent="how"]::before { background:var(--green); }
.sd-section[data-accent="deuse"]::before { background:var(--blue); }
.sd-section[data-accent="link"]::before { background:var(--purple); }
.sd-section[data-accent="runtime"]::before { background:var(--orange); }
.sd-section[data-accent="arch"]::before { background:#06b6d4; }
.sd-section[data-accent="security"]::before { background:#ef4444; }
.sd-section[data-accent="operations"]::before { background:#f59e0b; }
.sd-section[data-accent="cost"]::before { background:#10b981; }
.sd-section[data-accent="certmap"]::before { background:var(--brand); }
.sd-section[data-accent="interview"]::before { background:var(--brand-2); }
.sd-section[data-accent="walk"]::before { background:#0ea5e9; }
.sd-section[data-accent="example"]::before { background:#8b5cf6; }
.sd-section[data-accent="trouble"]::before { background:#e11d48; }
/* Execution walkthrough — numbered lifecycle */
.sd-steps { list-style:none; counter-reset:sd-step; margin:0; padding:0; display:grid; gap:10px; }
.sd-step { counter-increment:sd-step; display:flex; gap:12px; background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:9px; padding:11px 13px; }
.sd-step::before { content:counter(sd-step); flex:0 0 auto; width:22px; height:22px; border-radius:6px; background:#0ea5e9; color:#fff; font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:1px; }
.sd-step-body { flex:1; min-width:0; }
.sd-step-h { font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:3px; }
.sd-step-d { font-size:13px; color:var(--text-secondary); line-height:1.65; }
/* Worked examples */
.sd-exs { display:grid; gap:14px; }
.sd-ex { background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:10px; padding:13px 15px; }
.sd-ex-head { font-size:14px; font-weight:800; color:var(--text-primary); margin-bottom:10px; display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
.sd-ex-badge { font-size:10px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; padding:2px 8px; border-radius:999px; color:#7c3aed; background:color-mix(in srgb, #8b5cf6 15%, transparent); border:1px solid color-mix(in srgb, #8b5cf6 42%, transparent); }
.sd-ex-badge--run { color:#047857; background:color-mix(in srgb, #10b981 15%, transparent); border-color:color-mix(in srgb, #10b981 42%, transparent); }
:root[data-theme="dark"] .sd-ex-badge, :root:not([data-theme="light"]) .sd-ex-badge { color:#c4b5fd; }
:root[data-theme="dark"] .sd-ex-badge--run, :root:not([data-theme="light"]) .sd-ex-badge--run { color:#6ee7b7; }
.sd-ex-row { display:grid; grid-template-columns:128px 1fr; gap:12px; padding:6px 0; }
.sd-ex-row + .sd-ex-row { border-top:1px solid var(--border-subtle); }
.sd-ex-lbl { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; color:var(--text-muted); padding-top:2px; }
.sd-ex-val { font-size:13px; color:var(--text-secondary); line-height:1.65; min-width:0; }
.sd-ex-val .sd-code { margin-top:0; }
@media (max-width:620px){ .sd-ex-row { grid-template-columns:1fr; gap:3px; } }
/* Troubleshooting incidents */
.sd-tbs { display:grid; gap:14px; }
.sd-tb { background:var(--bg-1); border:1px solid var(--border-subtle); border-left:3px solid #e11d48; border-radius:10px; padding:13px 15px; }
.sd-tb-sym { font-size:14px; font-weight:800; color:var(--text-primary); line-height:1.5; margin-bottom:10px; display:flex; align-items:baseline; gap:9px; flex-wrap:wrap; }
.sd-tb-sym-tag { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; padding:2px 8px; border-radius:999px; color:#e11d48; background:color-mix(in srgb, #e11d48 14%, transparent); border:1px solid color-mix(in srgb, #e11d48 40%, transparent); }
:root[data-theme="dark"] .sd-tb-sym-tag, :root:not([data-theme="light"]) .sd-tb-sym-tag { color:#fda4af; }
.sd-tb-row { display:grid; grid-template-columns:128px 1fr; gap:12px; padding:6px 0; }
.sd-tb-row + .sd-tb-row { border-top:1px solid var(--border-subtle); }
.sd-tb-lbl { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; color:var(--text-muted); padding-top:2px; }
.sd-tb-val { font-size:13px; color:var(--text-secondary); line-height:1.65; min-width:0; }
@media (max-width:620px){ .sd-tb-row { grid-template-columns:1fr; gap:3px; } }
.sd-vlist { margin:0; padding-left:18px; display:grid; gap:4px; }
.sd-vlist li { line-height:1.6; }
.sd-depth { display:inline-block; margin-left:10px; padding:2px 9px; border-radius:999px; font-size:10px; font-weight:800; letter-spacing:.04em; vertical-align:middle; }
.sd-depth--deep { color:#047857; background:color-mix(in srgb, #10b981 16%, transparent); border:1px solid color-mix(in srgb, #10b981 45%, transparent); }
:root[data-theme="dark"] .sd-depth--deep, :root:not([data-theme="light"]) .sd-depth--deep { color:#6ee7b7; }
.sd-cm { list-style:none; margin:0; padding:0; display:grid; gap:8px; }
.sd-cm-row { display:flex; flex-wrap:wrap; align-items:baseline; gap:8px 12px; background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:9px; padding:10px 13px; }
.sd-cm-cert { font-size:13px; font-weight:800; color:var(--brand); text-decoration:none; }
a.sd-cm-cert:hover { text-decoration:underline; }
.sd-cm-objs { font-size:12px; color:var(--text-muted); line-height:1.5; }
.sd-cm-txt { font-size:13px; color:var(--text-secondary); line-height:1.6; }
.sd-kicker { display:inline-block; font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); background:var(--bg-3); padding:5px 12px; border-radius:999px; margin-bottom:14px; }
.sd-section[data-accent="what"] .sd-kicker,
.sd-section[data-accent="certmap"] .sd-kicker { color:var(--brand); background:var(--brand-glow); }
.sd-section[data-accent="interview"] .sd-kicker { color:var(--brand-2); background:var(--brand-glow); }
.sd-section[data-accent="why"] .sd-kicker,
.sd-section[data-accent="operations"] .sd-kicker { color:var(--yellow); background:var(--yellow-subtle); }
.sd-section[data-accent="how"] .sd-kicker,
.sd-section[data-accent="cost"] .sd-kicker { color:var(--green); background:var(--green-subtle); }
.sd-section[data-accent="deuse"] .sd-kicker,
.sd-section[data-accent="walk"] .sd-kicker { color:var(--blue); background:var(--blue-subtle); }
.sd-section[data-accent="link"] .sd-kicker,
.sd-section[data-accent="example"] .sd-kicker { color:var(--purple); background:var(--purple-subtle); }
.sd-section[data-accent="runtime"] .sd-kicker { color:var(--orange); background:var(--orange-subtle); }
.sd-section[data-accent="arch"] .sd-kicker { color:var(--teal); background:var(--teal-subtle); }
.sd-section[data-accent="security"] .sd-kicker,
.sd-section[data-accent="trouble"] .sd-kicker { color:var(--red); background:var(--red-subtle); }
.sd-lead { font-size:14px; color:var(--text-secondary); line-height:1.7; margin:0 0 12px; }
.sd-bullets { display:grid; gap:10px; }
.sd-bullet { background:var(--bg-2); border:1px solid var(--border-subtle); border-radius:11px; padding:12px 15px; }
.sd-bullet-h { font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:3px; }
.sd-bullet-d { font-size:13px; color:var(--text-secondary); line-height:1.6; }
.sd-code { margin-top:14px; background:var(--code-bg,#0b1017); border:1px solid #1a2536; border-radius:11px; overflow:hidden; }
.sd-code-lang { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#7e8da8; font-weight:800; padding:8px 14px; border-bottom:1px solid #1a2536; }
.sd-code pre { margin:0; padding:14px 16px; font-family:var(--font-mono); font-size:12.5px; line-height:1.7; color:#b3c0d6; white-space:pre; overflow-x:auto; }
.sd-note { margin-top:12px; background:var(--brand-glow); border-radius:8px; padding:10px 13px; font-size:13px; color:var(--text-primary); line-height:1.6; }
/* Callouts — pedagogical highlight boxes (rendered when a section supplies callouts[]) */
.sd-callout { display:flex; gap:12px; align-items:flex-start; margin-top:14px; padding:13px 16px; border-radius:11px; border:1px solid var(--border-subtle); border-left:3px solid var(--text-muted); background:var(--bg-2); font-size:13.5px; line-height:1.65; }
.sd-co-ico { flex-shrink:0; font-size:16px; line-height:1.4; }
.sd-co-b { display:block; font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px; color:var(--text-muted); }
.sd-co-body { color:var(--text-primary); }
.sd-callout[data-kind="insight"]   { background:var(--green-subtle);  border-left-color:var(--green); }
.sd-callout[data-kind="insight"] .sd-co-b { color:var(--green); }
.sd-callout[data-kind="gotcha"]    { background:var(--red-subtle);    border-left-color:var(--red); }
.sd-callout[data-kind="gotcha"] .sd-co-b { color:var(--red); }
.sd-callout[data-kind="interview"] { background:var(--purple-subtle); border-left-color:var(--purple); }
.sd-callout[data-kind="interview"] .sd-co-b { color:var(--purple); }
.sd-callout[data-kind="analogy"]   { background:var(--teal-subtle);   border-left-color:var(--teal); }
.sd-callout[data-kind="analogy"] .sd-co-b { color:var(--teal); }
.sd-callout[data-kind="tip"]       { background:var(--blue-subtle);   border-left-color:var(--blue); }
.sd-callout[data-kind="tip"] .sd-co-b { color:var(--blue); }
.sd-chips { display:flex; flex-wrap:wrap; gap:9px; }
.sd-chip { display:inline-flex; flex-direction:column; gap:2px; background:var(--bg-2); border:1px solid var(--border-subtle); border-left:3px solid var(--purple); border-radius:10px; padding:9px 13px; text-decoration:none; }
.sd-chip--link { transition:border-color .12s, transform .12s, background .12s; }
.sd-chip--link:hover { border-color:var(--brand); background:var(--brand-glow); transform:translateY(-1px); text-decoration:none; }
.sd-chip-label { font-size:13px; font-weight:700; color:var(--text-primary); }
.sd-chip--link .sd-chip-label { color:var(--brand); }
.sd-chip-note { font-size:11px; color:var(--text-muted); line-height:1.4; }
.sd-iqs { display:grid; gap:8px; }
.sd-iq { background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:9px; overflow:hidden; }
.sd-iq-q { width:100%; display:flex; align-items:flex-start; gap:10px; padding:11px 14px; background:none; border:none; cursor:pointer; text-align:left; font:inherit; }
.sd-iq-mark { flex-shrink:0; width:20px; height:20px; border-radius:5px; background:var(--brand); color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:1px; }
.sd-iq-text { flex:1; font-size:14px; font-weight:600; color:var(--text-primary); line-height:1.5; }
.sd-iq-chev { color:var(--text-muted); transition:transform .15s; flex-shrink:0; }
.sd-iq.open .sd-iq-chev { transform:rotate(180deg); }
.sd-iq-a { display:grid; grid-template-rows:0fr; transition:grid-template-rows .2s var(--ease); }
.sd-iq.open .sd-iq-a { grid-template-rows:1fr; }
.sd-iq-a > p { overflow:hidden; min-height:0; margin:0; padding:0 14px 13px 44px; font-size:13px; color:var(--text-secondary); line-height:1.7; }
/* Overview / home grid */
.sd-home { height:100%; overflow-y:auto; padding:34px clamp(18px,3vw,56px) 88px; background:var(--bg-0); }
.sd-home-wrap { width:100%; max-width:1080px; margin:0 auto; }
.sd-home-cat { margin-top:26px; }
.sd-home-cat-h { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin:0 0 12px; }
.sd-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; }
.sd-card { display:block; background:var(--bg-1); border:1px solid var(--border-subtle); border-left:3px solid var(--brand); border-radius:14px; padding:16px 18px; text-decoration:none; box-shadow:var(--card-shadow); transition:border-color .12s, transform .14s, box-shadow .14s; }
.sd-card:hover { transform:translateY(-3px); box-shadow:var(--card-shadow-lg); text-decoration:none; }
.sd-card-name { font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:5px; }
.sd-card-tag { font-size:12px; color:var(--text-secondary); line-height:1.55; }
.sd-home-hero { position:relative; border:1px solid var(--border-subtle); border-radius:20px; padding:30px 34px; box-shadow:var(--card-shadow-lg); background:
  radial-gradient(130% 150% at 0% 0%, var(--brand-glow), transparent 55%), linear-gradient(180deg, var(--bg-1), var(--bg-2)); }
.sd-home-hero h1 { font-size:28px; font-weight:800; letter-spacing:-.02em; margin:0 0 8px; color:var(--text-primary); }
.sd-home-hero p { font-size:15px; color:var(--text-secondary); line-height:1.7; margin:0; max-width:720px; }
.sd-home-stats { display:flex; gap:14px; margin-top:22px; flex-wrap:wrap; }
.sd-home-stat { background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:14px; padding:13px 20px; box-shadow:var(--card-shadow); }
.sd-home-stat b { display:block; font-size:24px; font-weight:800; color:var(--brand); }
.sd-home-stat span { font-size:12px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; }
.sd-home-cta { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-top:20px; padding:14px 18px; border:1px solid var(--brand); border-radius:12px; background:color-mix(in srgb, var(--brand) 8%, transparent); }
.sd-home-cta-txt { display:flex; flex-direction:column; gap:3px; }
.sd-home-cta-txt b { font-size:15px; font-weight:800; color:var(--text-primary); }
.sd-home-cta-txt span { font-size:13px; color:var(--text-secondary); line-height:1.5; }
.sd-home-cta-btn { flex:0 0 auto; cursor:pointer; border:0; border-radius:9px; padding:10px 16px; font-size:13px; font-weight:700; color:#07171a; background:var(--brand); }
.sd-home-cta-btn:hover { filter:brightness(1.08); }
/* ── Iter F: in-page section navigator + checkpoint ───────── */
.sd-nav { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:12px; margin:0 0 18px; padding:8px 0; background:linear-gradient(var(--bg-0) 72%, transparent); backdrop-filter:saturate(1.1) blur(2px); }
.sd-nav-chips { display:flex; gap:7px; overflow-x:auto; flex:1; min-width:0; scrollbar-width:thin; padding-bottom:2px; }
.sd-nav-chips::-webkit-scrollbar { height:5px; }
.sd-nav-chips::-webkit-scrollbar-thumb { background:var(--border-default); border-radius:3px; }
.sd-nav-chip { flex:0 0 auto; cursor:pointer; border:1px solid var(--border-default); background:var(--bg-2); color:var(--text-secondary); font:inherit; font-size:12px; font-weight:600; padding:5px 11px; border-radius:999px; white-space:nowrap; transition:color .12s, border-color .12s, background .12s; }
.sd-nav-chip:hover { color:var(--text-primary); border-color:var(--brand); }
.sd-nav-chip.is-active { color:#fff; background:var(--brand); border-color:var(--brand); }
.sd-review { flex:0 0 auto; cursor:pointer; display:inline-flex; align-items:center; gap:6px; border:1px solid var(--border-default); background:var(--bg-2); color:var(--text-secondary); font:inherit; font-size:12px; font-weight:700; padding:5px 12px; border-radius:999px; transition:color .12s, border-color .12s, background .12s; }
.sd-review:hover { color:var(--text-primary); border-color:var(--green,#10b981); }
.sd-review .sd-review-tick { opacity:.35; font-weight:900; }
.sd-review.is-done { color:#047857; border-color:color-mix(in srgb,#10b981 45%,transparent); background:color-mix(in srgb,#10b981 14%,transparent); }
.sd-review.is-done .sd-review-tick { opacity:1; }
:root[data-theme="dark"] .sd-review.is-done, :root:not([data-theme="light"]) .sd-review.is-done { color:#6ee7b7; }
@media (max-width:620px){ .sd-review .sd-review-txt { display:none; } }
/* copy button on code blocks */
.sd-code { position:relative; }
.sd-copy { position:absolute; top:6px; right:8px; cursor:pointer; border:1px solid var(--border-default); background:var(--bg-2); color:var(--text-muted); font:inherit; font-size:10px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; padding:3px 9px; border-radius:6px; opacity:.75; transition:opacity .12s, color .12s, border-color .12s; }
.sd-code:hover .sd-copy { opacity:1; }
.sd-copy:hover { color:var(--text-primary); border-color:var(--brand); }
/* related services */
.sd-rels { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px; }
.sd-rel { display:flex; flex-direction:column; gap:3px; text-decoration:none; background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:9px; padding:10px 13px; transition:border-color .12s, transform .12s; }
.sd-rel:hover { border-color:var(--brand); transform:translateY(-1px); text-decoration:none; }
.sd-rel-name { font-size:13px; font-weight:700; color:var(--brand); }
.sd-rel-tag { font-size:12px; color:var(--text-muted); line-height:1.5; }
.sd-vizlinks { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:10px; }
.sd-vizlink { display:flex; align-items:center; gap:11px; cursor:pointer; text-align:left; background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:10px; padding:11px 13px; font:inherit; transition:border-color .12s, transform .12s; }
.sd-vizlink:hover { border-color:var(--brand); transform:translateY(-1px); }
.sd-vizlink-ic { flex:0 0 auto; width:28px; height:28px; border-radius:7px; background:#0ea5e9; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; }
.sd-vizlink-txt { display:flex; flex-direction:column; gap:2px; min-width:0; }
.sd-vizlink-txt b { font-size:13px; font-weight:700; color:var(--text-primary); }
.sd-vizlink-txt span { font-size:11px; color:var(--text-muted); }
/* ── Study header: meta chips, mastery checklist, progress ring ── */
.sd-headrow { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; flex-wrap:wrap; }
.sd-headmain { flex:1; min-width:0; }
.sd-essence { font-size:16px; color:var(--text-secondary); line-height:1.6; margin:2px 0 0; max-width:680px; font-style:italic; }
.sd-meta { display:flex; flex-wrap:wrap; gap:10px; margin:16px 0 0; }
.sd-mchip { display:inline-flex; align-items:center; gap:7px; background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:999px; padding:7px 13px; font-size:12.5px; font-weight:600; color:var(--text-secondary); box-shadow:var(--card-shadow); }
.sd-mchip b { color:var(--text-primary); font-weight:800; }
.sd-mchip .sd-mchip-ico { font-size:13px; line-height:1; }
.sd-mchip-lvl .dot { width:8px; height:8px; border-radius:50%; background:var(--text-muted); display:inline-block; }
.sd-mchip-lvl[data-lvl="foundational"] { color:var(--green); } .sd-mchip-lvl[data-lvl="foundational"] .dot { background:var(--green); }
.sd-mchip-lvl[data-lvl="core"] { color:var(--yellow); } .sd-mchip-lvl[data-lvl="core"] .dot { background:var(--yellow); }
.sd-mchip-lvl[data-lvl="advanced"] { color:var(--red); } .sd-mchip-lvl[data-lvl="advanced"] .dot { background:var(--red); }
.sd-ringwrap { display:flex; flex-direction:column; align-items:center; gap:7px; flex-shrink:0; }
.sd-ring { position:relative; width:72px; height:72px; }
.sd-ring-fg { transition:stroke-dashoffset .4s ease; }
.sd-ring-txt { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:800; color:var(--brand); }
.sd-ring-sub { font-size:11px; color:var(--text-muted); white-space:nowrap; }
.sd-master { background:linear-gradient(180deg,var(--bg-1),var(--bg-2)); border:1px solid var(--border-subtle); border-radius:16px; padding:20px 24px; margin:0 0 28px; box-shadow:var(--card-shadow-lg); }
.sd-master-h { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); margin:0 0 14px; display:flex; align-items:center; gap:8px; }
.sd-master-h .sd-master-hint { margin-left:auto; font-size:10px; font-weight:600; text-transform:none; letter-spacing:0; color:var(--text-disabled); }
.sd-master-grid { display:grid; grid-template-columns:1fr 1fr; gap:11px 28px; }
.sd-goal { display:flex; align-items:flex-start; gap:11px; width:100%; text-align:left; background:none; border:none; font:inherit; padding:0; cursor:pointer; font-size:13.5px; color:var(--text-secondary); line-height:1.5; }
.sd-goal .sd-goal-box { flex-shrink:0; width:18px; height:18px; border:2px solid var(--border-muted); border-radius:5px; margin-top:1px; display:flex; align-items:center; justify-content:center; transition:background .12s, border-color .12s; }
.sd-goal:hover .sd-goal-box { border-color:var(--brand); }
.sd-goal.done .sd-goal-box { background:var(--green); border-color:var(--green); }
.sd-goal.done .sd-goal-box::after { content:'✓'; color:#fff; font-size:11px; font-weight:800; line-height:1; }
.sd-goal.done .sd-goal-txt { color:var(--text-muted); text-decoration:line-through; text-decoration-color:var(--border-muted); }
@media (max-width:720px){ .sd-master-grid { grid-template-columns:1fr; } }
/* Test yourself — flashcards */
.sd-recall { background:linear-gradient(180deg,var(--bg-1),var(--bg-2)); }
.sd-recall-h { font-size:19px; font-weight:800; color:var(--text-primary); margin:0 0 4px; display:flex; align-items:center; gap:9px; }
.sd-recall-sub { font-size:13px; color:var(--text-muted); margin:0 0 18px; }
.sd-fcs { display:grid; gap:12px; }
.sd-fc { background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:12px; padding:16px 18px; box-shadow:var(--card-shadow); transition:border-color .12s; }
.sd-fc-q { display:flex; gap:11px; align-items:flex-start; font-size:14.5px; font-weight:700; color:var(--text-primary); line-height:1.5; }
.sd-fc-num { flex-shrink:0; width:22px; height:22px; border-radius:6px; background:var(--purple); color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:1px; }
.sd-fc-qt { flex:1; }
.sd-fc-reveal { margin:14px 0 0 33px; font-size:12.5px; font-weight:700; color:var(--purple); background:var(--purple-subtle); border:1px dashed var(--purple); border-radius:8px; padding:9px 14px; cursor:pointer; }
.sd-fc-reveal:hover { filter:brightness(1.06); }
.sd-fc-a { margin-left:33px; }
.sd-fc-a > p { margin:14px 0 0; font-size:13.5px; color:var(--text-secondary); line-height:1.7; padding:13px 16px; background:var(--bg-2); border-radius:9px; border-left:3px solid var(--purple); }
.sd-fc-grade { display:flex; gap:9px; margin-top:12px; }
.sd-fc-g { font-size:12px; font-weight:700; border-radius:8px; padding:6px 13px; cursor:pointer; border:1px solid var(--border-muted); background:var(--bg-2); color:var(--text-secondary); }
.sd-fc-g--good:hover, .sd-fc[data-grade="good"] .sd-fc-g--good { color:var(--green); border-color:var(--green); background:var(--green-subtle); }
.sd-fc-g--again:hover, .sd-fc[data-grade="again"] .sd-fc-g--again { color:var(--orange); border-color:var(--orange); background:var(--orange-subtle); }
.sd-fc[data-grade="good"] { border-color:var(--green); }
.sd-fc[data-grade="again"] { border-color:var(--orange); }
/* Next-up momentum footer */
.sd-foot { display:flex; align-items:center; justify-content:flex-end; gap:16px; flex-wrap:wrap; margin-top:30px; padding-top:24px; border-top:1px solid var(--border-subtle); }
.sd-next { display:inline-flex; flex-direction:column; align-items:flex-end; text-decoration:none; }
.sd-next:hover { text-decoration:none; }
.sd-next-lbl { font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; font-weight:700; }
.sd-next-nm { font-size:15px; font-weight:700; color:var(--brand); }
.sd-next:hover .sd-next-nm { text-decoration:underline; }
</style>`;
  }

  /* ── Ordered categories present for a format ─────────────── */
  function categoriesFor(format) {
    const list = (TV._services && TV._services[format]) || [];
    const byCat = {};
    list.forEach(s => { (byCat[s.category] = byCat[s.category] || []).push(s); });
    return Object.keys(byCat)
      .map(id => ({ id, label: (CATEGORIES[id] || {}).label || id, icon: (CATEGORIES[id] || {}).icon || 'layers',
                    order: (CATEGORIES[id] || {}).order || 999, items: byCat[id] }))
      .sort((a, b) => a.order - b.order);
  }

  /* Related services: same-category siblings (additive; links only). */
  function relatedHTML(format, svc) {
    const list = (TV._services && TV._services[format]) || [];
    const sibs = list.filter(s => s.category === svc.category && s.id !== svc.id);
    if (!sibs.length) return '';
    const cards = sibs.map(s =>
      `<a class="sd-rel" href="#${format}/${s.id}">
         <span class="sd-rel-name">${esc(s.name)}</span>
         <span class="sd-rel-tag">${esc(s.tagline || '')}</span>
       </a>`).join('');
    return `
      <section class="sd-section" data-accent="link" data-sd-skip="1">
        <div class="sd-kicker">Related in ${esc((CATEGORIES[svc.category] || {}).label || svc.category || 'this category')}</div>
        <p class="sd-lead">Other services in the same category — useful to study side by side.</p>
        <div class="sd-rels">${cards}</div>
      </section>`;
  }

  /* Map a service to relevant conceptual visualizers (by id, then category). */
  const VIZ_BY_CATEGORY = {
    storage: ['row-vs-columnar', 'storage-pruning', 'delta-transaction'],
    'ingest-etl': ['pipeline-dag', 'spark-execution'],
    streaming: ['streaming-windows', 'log-partitions'],
    analytics: ['row-vs-columnar', 'storage-pruning'],
    compute: ['spark-execution'],
    databases: ['row-vs-columnar'],
    orchestration: ['pipeline-dag'],
  };
  const VIZ_BY_ID = {
    'delta-lake': ['delta-transaction', 'storage-pruning'],
    spark: ['spark-execution'], 'fabric-spark': ['spark-execution'],
    'structured-streaming': ['streaming-windows', 'log-partitions'],
    'event-hubs': ['log-partitions'], kinesis: ['log-partitions'], 'kinesis-data-streams': ['log-partitions'],
    'auto-loader': ['pipeline-dag'],
  };
  function relatedVizIds(svc) {
    const avail = (TV.Viz && TV.Viz.list) ? TV.Viz.list().map(v => v.id) : [];
    if (!avail.length) return [];
    const ids = (VIZ_BY_ID[svc.id] || VIZ_BY_CATEGORY[svc.category] || []).filter(id => avail.indexOf(id) !== -1);
    return ids.slice(0, 2);
  }

  const SLUG = s => String(s || '').toLowerCase().replace(/&amp;|&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const REVIEW_KEY = 'cde-sd-reviewed';
  function reviewedSet() { try { return JSON.parse(TV.ls.get(REVIEW_KEY) || '{}') || {}; } catch (e) { return {}; } }

  /* Post-render enhancements (all additive, all wired):
     section navigator with scroll-spy, copy-code buttons, review checkpoint. */
  function enhanceDetail(container, format, svc) {
    const scroller = container.querySelector('.sd');
    const wrap = container.querySelector('.sd-wrap');
    if (!scroller || !wrap) return;

    // 1) Collect navigable sections in document order; give each a stable id.
    const secs = [...wrap.querySelectorAll('.sd-intu, .sd-section')].filter(el => !el.hasAttribute('data-sd-skip'));
    const entries = secs.map((el, i) => {
      const kick = el.querySelector('.sd-kicker, .sd-intu-head, .sd-recall-h');
      let label = kick ? kick.textContent.trim() : ('Section ' + (i + 1));
      label = label.replace(/^(?:💡|🎯|🎓|⚠️|🔗|📌)\s*/, '').replace(/\s*—.*$/, '');
      el.id = el.id || ('sd-sec-' + (SLUG(label) || i));
      return { el, label, id: el.id };
    });

    // 2) Build the navigator + checkpoint bar.
    const reviewed = !!reviewedSet()[svc.id];
    const nav = document.createElement('div');
    nav.className = 'sd-nav';
    nav.innerHTML =
      `<div class="sd-nav-chips" role="navigation" aria-label="On this page">` +
        entries.map(e => `<button type="button" class="sd-nav-chip" data-sd-to="${e.id}">${esc(e.label)}</button>`).join('') +
      `</div>` +
      `<button type="button" class="sd-review ${reviewed ? 'is-done' : ''}" aria-pressed="${reviewed}">` +
        `<span class="sd-review-tick">✓</span><span class="sd-review-txt">${reviewed ? 'Reviewed' : 'Mark reviewed'}</span>` +
      `</button>`;
    const anchor = wrap.querySelector('.sd-verified') || wrap.querySelector('.sd-tagline') || wrap.firstElementChild;
    if (anchor && anchor.nextSibling) wrap.insertBefore(nav, anchor.nextSibling);
    else wrap.insertBefore(nav, wrap.children[1] || null);

    // Jump to a section (account for sticky nav height within the scroller).
    nav.querySelectorAll('.sd-nav-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const el = document.getElementById(btn.getAttribute('data-sd-to'));
        if (!el) return;
        const top = el.offsetTop - (nav.offsetHeight + 16);
        scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      });
    });

    // Review checkpoint — genuine, user-driven, persisted per service.
    const reviewBtn = nav.querySelector('.sd-review');
    reviewBtn.addEventListener('click', () => {
      const set = reviewedSet();
      const now = !set[svc.id];
      if (now) set[svc.id] = Date.now(); else delete set[svc.id];
      TV.ls.set(REVIEW_KEY, JSON.stringify(set));
      reviewBtn.classList.toggle('is-done', now);
      reviewBtn.setAttribute('aria-pressed', String(now));
      reviewBtn.querySelector('.sd-review-txt').textContent = now ? 'Reviewed' : 'Mark reviewed';
      if (TV.DS && TV.DS.toast) TV.DS.toast(now ? 'Marked as reviewed' : 'Review mark removed', { type: now ? 'success' : 'info' });
    });

    // 2b) Related visualizers — deep-open the matching conceptual visualizer.
    const vizIds = relatedVizIds(svc);
    if (vizIds.length && TV.Viz) {
      const chips = vizIds.map(id => {
        const v = TV.Viz.get(id); if (!v) return '';
        return `<button type="button" class="sd-vizlink" data-sd-viz="${id}">
                  <span class="sd-vizlink-ic">▶</span>
                  <span class="sd-vizlink-txt"><b>${esc(v.title)}</b><span>Interactive conceptual visualizer</span></span>
                </button>`;
      }).join('');
      const sec = document.createElement('section');
      sec.className = 'sd-section';
      sec.setAttribute('data-accent', 'walk');
      sec.setAttribute('data-sd-skip', '1');
      sec.innerHTML = `<div class="sd-kicker">See it in motion</div>
        <p class="sd-lead">Step through how this works as an interactive, conceptual visualizer.</p>
        <div class="sd-vizlinks">${chips}</div>`;
      // place just before the Related section if present, else at the end of wrap.
      const relSec = [...wrap.querySelectorAll('.sd-section')].find(s => /Related in/.test((s.querySelector('.sd-kicker') || {}).textContent || ''));
      if (relSec) wrap.insertBefore(sec, relSec); else wrap.appendChild(sec);
      sec.querySelectorAll('[data-sd-viz]').forEach(b => b.addEventListener('click', () => {
        const id = b.getAttribute('data-sd-viz');
        if (TV.VisualizersView && TV.VisualizersView.show) TV.VisualizersView.show(id);
        else location.hash = (TV.activeFormat || format) + '/visualizers';
      }));
    }

    // 3) Copy buttons on every code block.
    wrap.querySelectorAll('.sd-code').forEach(block => {
      const pre = block.querySelector('pre');
      if (!pre || block.querySelector('.sd-copy')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sd-copy';
      btn.setAttribute('aria-label', 'Copy code');
      btn.textContent = 'Copy';
      block.appendChild(btn);
      if (TV.DS && TV.DS.wireCopy) TV.DS.wireCopy(btn, () => pre.textContent);
      else btn.addEventListener('click', () => { try { navigator.clipboard.writeText(pre.textContent); btn.textContent = 'Copied'; setTimeout(() => btn.textContent = 'Copy', 1200); } catch (e) {} });
    });

    // 4) Scroll-spy: highlight the active chip as sections pass the top.
    if (entries.length) {
      const chips = [...nav.querySelectorAll('.sd-nav-chip')];
      const spy = () => {
        const line = scroller.scrollTop + nav.offsetHeight + 24;
        let active = 0;
        entries.forEach((e, i) => { if (e.el.offsetTop <= line) active = i; });
        chips.forEach((c, i) => c.classList.toggle('is-active', i === active));
      };
      scroller.addEventListener('scroll', spy, { passive: true });
      spy();
    }
  }

  /* Teachable depth sections that carry bullets, in study order. */
  const DEPTH_KEYS = ['what', 'why', 'architecture', 'how', 'deUseCase', 'runtime', 'security', 'operations', 'cost'];
  const GOAL_KEYS = ['what', 'why', 'how', 'architecture', 'deUseCase', 'runtime'];

  function countWords(str) {
    if (!str) return 0;
    return String(str).trim().split(/\s+/).filter(Boolean).length;
  }
  function conceptCount(svc) {
    let n = 0;
    DEPTH_KEYS.forEach(k => { const s = normSection(svc[k]); if (s && s.bullets) n += s.bullets.length; });
    return n;
  }
  function studyMinutes(svc) {
    let w = countWords(svc.aka) + countWords(svc.tagline);
    DEPTH_KEYS.forEach(k => {
      const s = normSection(svc[k]); if (!s) return;
      w += countWords(s.lead);
      (s.bullets || []).forEach(b => { w += countWords(b.h) + countWords(b.d); });
    });
    (svc.interview || []).forEach(x => { w += countWords(x.q) + countWords(x.a); });
    const wt = Array.isArray(svc.walkthrough) ? { steps: svc.walkthrough } : (svc.walkthrough || {});
    (wt.steps || []).forEach(s => { w += countWords(typeof s === 'string' ? s : (s.h + ' ' + s.d)); });
    return Math.min(30, Math.max(2, Math.round(w / 200)));
  }

  function studyMetaHTML(svc) {
    const chips = [];
    const lvl = svc.level && ['foundational', 'core', 'advanced'].includes(svc.level) ? svc.level : null;
    if (lvl) {
      const label = lvl.charAt(0).toUpperCase() + lvl.slice(1);
      chips.push(`<span class="sd-mchip sd-mchip-lvl" data-lvl="${lvl}"><span class="dot"></span>${label}</span>`);
    }
    chips.push(`<span class="sd-mchip"><span class="sd-mchip-ico">⏱</span><b>~${studyMinutes(svc)} min</b> study</span>`);
    const concepts = conceptCount(svc);
    if (concepts) chips.push(`<span class="sd-mchip"><span class="sd-mchip-ico">📚</span><b>${concepts}</b> concept${concepts === 1 ? '' : 's'}</span>`);
    const iq = (svc.interview || []).length;
    if (iq) chips.push(`<span class="sd-mchip"><span class="sd-mchip-ico">🎯</span><b>${iq}</b> interview Q${iq === 1 ? '' : 's'}</span>`);
    const ints = (svc.integrations || []).length;
    if (ints) chips.push(`<span class="sd-mchip"><span class="sd-mchip-ico">🔗</span><b>${ints}</b> integration${ints === 1 ? '' : 's'}</span>`);
    return `<div class="sd-meta">${chips.join('')}</div>`;
  }

  function masterGoals(svc) {
    if (Array.isArray(svc.goals) && svc.goals.length) return svc.goals.slice(0, 6);
    const goals = [];
    GOAL_KEYS.forEach(k => {
      const s = normSection(svc[k]);
      if (s && s.bullets && s.bullets[0] && s.bullets[0].h) goals.push(s.bullets[0].h);
    });
    return goals.slice(0, 6);
  }

  /* Per-service goal progress (micro; drives the header ring). Macro completion
     is the existing "Mark reviewed" checkpoint (cde-sd-reviewed). */
  function goalsKey(format, id) { return 'cde-' + format + '-goals-' + id; }
  function getCheckedGoals(format, id) {
    try { return new Set(JSON.parse(TV.ls.get(goalsKey(format, id)) || '[]')); } catch (e) { return new Set(); }
  }
  function setCheckedGoals(format, id, set) {
    try { TV.ls.set(goalsKey(format, id), JSON.stringify(Array.from(set))); } catch (e) {}
  }

  function ringHTML(pct, sub) {
    const r = 30, C = 2 * Math.PI * r;
    const off = Math.max(0, Math.min(C, C * (1 - pct)));
    return `
      <div class="sd-ringwrap">
        <div class="sd-ring" data-circ="${C.toFixed(1)}">
          <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
            <circle cx="36" cy="36" r="${r}" fill="none" stroke="var(--bg-4)" stroke-width="7"/>
            <circle class="sd-ring-fg" cx="36" cy="36" r="${r}" fill="none" stroke="var(--brand)" stroke-width="7"
              stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
              transform="rotate(-90 36 36)"/>
          </svg>
          <div class="sd-ring-txt">${Math.round(pct * 100)}%</div>
        </div>
        <span class="sd-ring-sub">${esc(sub)}</span>
      </div>`;
  }

  function masterHTML(format, svc) {
    const goals = masterGoals(svc);
    if (goals.length < 2) return '';
    const checked = getCheckedGoals(format, svc.id);
    const items = goals.map((g, i) => {
      const done = checked.has(i);
      return `<button class="sd-goal${done ? ' done' : ''}" type="button" data-goal="${i}" aria-pressed="${done}">
          <span class="sd-goal-box"></span><span class="sd-goal-txt">${esc(g)}</span>
        </button>`;
    }).join('');
    return `
      <div class="sd-master">
        <div class="sd-master-h">🎓 What you'll master here <span class="sd-master-hint">tap to check off</span></div>
        <div class="sd-master-grid">${items}</div>
      </div>`;
  }

  /* ── Detail page for one service ─────────────────────────── */
  function renderDetail(container, format, svc) {
    container.className = '';
    let styles = document.getElementById('sd-styles') ? '' : styleTag();
    const aka = svc.aka ? `<p class="sd-aka">${esc(svc.aka)}</p>` : '';
    const catLabel = (CATEGORIES[svc.category] || {}).label || svc.category || '';
    const vchip = (TV.VerifiedChip ? TV.VerifiedChip.html(format + '-services', svc) : '');
    const deep = hasDeepDepth(svc);
    const depthBadge = deep
      ? `<span class="sd-depth sd-depth--deep" title="Full deep dive: architecture &amp; internals, execution walkthrough, worked example, security, operations, troubleshooting, cost and certification mapping">Deep dive</span>`
      : '';
    const goals = masterGoals(svc);
    const hasGoals = goals.length >= 2;
    const checkedNow = getCheckedGoals(format, svc.id);
    const ring = hasGoals ? ringHTML(checkedNow.size / goals.length, checkedNow.size + ' / ' + goals.length + ' goals') : '';
    container.innerHTML = `${styles}
<div class="sd page-enter">
  <div class="sd-wrap">
    <div class="sd-eyebrow">${esc(catLabel)}${depthBadge}</div>
    <div class="sd-headrow">
      <div class="sd-headmain">
        <h1 class="sd-h1">${esc(svc.name)}</h1>
        ${aka}
        ${studyMetaHTML(svc)}
      </div>
      ${ring}
    </div>
    <p class="sd-tagline">${esc(svc.tagline || '')}</p>
    ${vchip ? `<div class="sd-verified">${vchip}</div>` : ''}
    ${keyFactsHTML(svc.keyFacts)}
    ${masterHTML(format, svc)}
    ${intuitionHTML(svc.intuition || (TV.Intuition && TV.Intuition[svc.id]))}
    ${sectionHTML('What it is', 'what', svc.what)}
    ${sectionHTML('Why it exists', 'why', svc.why)}
    ${sectionHTML('Architecture & internals', 'arch', svc.architecture)}
    ${sectionHTML('How it works', 'how', svc.how)}
    ${walkthroughHTML(svc.walkthrough)}
    ${sectionHTML('Data engineering use case', 'deuse', svc.deUseCase)}
    ${examplesHTML(svc.examples)}
    ${integrationsHTML(format, svc.integrations)}
    ${sectionHTML('Runtime & performance', 'runtime', svc.runtime)}
    ${sectionHTML('Security & governance', 'security', svc.security)}
    ${sectionHTML('Operations & reliability', 'operations', svc.operations)}
    ${troubleshootingHTML(svc.troubleshooting)}
    ${sectionHTML('Cost model', 'cost', svc.cost)}
    ${interviewHTML(svc.interview)}
    ${certMappingHTML(svc.certMapping)}
    ${relatedHTML(format, svc)}
    ${footerHTML(format, svc)}
  </div>
</div>`;
    // Flashcards: reveal answer, then self-grade
    container.querySelectorAll('.sd-fc-reveal').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.sd-fc');
        const ans = card && card.querySelector('.sd-fc-a');
        if (ans) ans.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        btn.style.display = 'none';
      });
    });
    container.querySelectorAll('.sd-fc-g').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.sd-fc');
        if (card) card.setAttribute('data-grade', btn.getAttribute('data-g'));
      });
    });
    // Goal checklist → persist + update the header progress ring (guarded:
    // the unit-test container has querySelectorAll but no querySelector).
    try {
      const ringEl = container.querySelector('.sd-ring');
      const ringFg = ringEl && ringEl.querySelector('.sd-ring-fg');
      const ringTxt = ringEl && ringEl.querySelector('.sd-ring-txt');
      const ringSub = container.querySelector('.sd-ring-sub');
      const refreshRing = () => {
        const total = goals.length;
        const set = getCheckedGoals(format, svc.id);
        const pct = total ? set.size / total : 0;
        if (ringEl && ringFg) {
          const C = parseFloat(ringEl.getAttribute('data-circ')) || (2 * Math.PI * 30);
          ringFg.setAttribute('stroke-dashoffset', (C * (1 - pct)).toFixed(1));
        }
        if (ringTxt) ringTxt.textContent = Math.round(pct * 100) + '%';
        if (ringSub) ringSub.textContent = set.size + ' / ' + total + ' goals';
      };
      container.querySelectorAll('.sd-goal[data-goal]').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.getAttribute('data-goal'), 10);
          const set = getCheckedGoals(format, svc.id);
          const now = !set.has(i);
          if (now) set.add(i); else set.delete(i);
          setCheckedGoals(format, svc.id, set);
          btn.classList.toggle('done', now);
          btn.setAttribute('aria-pressed', String(now));
          refreshRing();
        });
      });
    } catch (e) { /* non-fatal */ }

    // Additive UX layer: section navigator, copy-code, review checkpoint.
    try { enhanceDetail(container, format, svc); } catch (e) { /* non-fatal */ }
  }

  /* ── Overview / home page for a format ───────────────────── */
  function renderHome(container, format, meta) {
    container.className = '';
    let styles = document.getElementById('sd-styles') ? '' : styleTag();
    const cats = categoriesFor(format);
    const total = cats.reduce((n, c) => n + c.items.length, 0);
    const deepN = cats.reduce((n, c) => n + c.items.filter(hasDeepDepth).length, 0);
    // Optional certification practice-exam launcher (e.g., Fabric → DP-700).
    const examId = meta.certExam;
    const examN = (examId && TV.CertQuestions && TV.CertQuestions.has(examId))
      ? TV.CertQuestions.byCert(examId).length : 0;
    const ctaHtml = examN ? `
      <div class="sd-home-cta">
        <div class="sd-home-cta-txt">
          <b>${esc(meta.certExamLabel || 'Practice exam')}</b>
          <span>${examN} model questions with worked explanations, mapped to the official exam domains.</span>
        </div>
        <button class="sd-home-cta-btn" data-action="cert-exam" data-exam="${esc(examId)}">Start model questions →</button>
      </div>` : '';
    const catBlocks = cats.map(c => `
      <div class="sd-home-cat">
        <h2 class="sd-home-cat-h">${esc(c.label)}</h2>
        <div class="sd-grid">${c.items.map(s =>
          `<a class="sd-card" href="#${format}/${s.id}">
             <div class="sd-card-name">${esc(s.name)}</div>
             <div class="sd-card-tag">${esc(s.tagline || '')}</div>
           </a>`).join('')}</div>
      </div>`).join('');
    container.innerHTML = `${styles}
<div class="sd-home page-enter">
  <div class="sd-home-wrap">
    <div class="sd-home-hero">
      <h1>${esc(meta.title)}</h1>
      <p>${esc(meta.subtitle)}</p>
      <div class="sd-home-stats">
        <div class="sd-home-stat"><b>${total}</b><span>services</span></div>
        <div class="sd-home-stat"><b>${cats.length}</b><span>categories</span></div>
        ${deepN ? `<div class="sd-home-stat"><b>${deepN}</b><span>A–I deep dives</span></div>` : ''}
      </div>
      ${ctaHtml}
    </div>
    ${catBlocks}
  </div>
</div>`;
    const examBtn = container.querySelector('[data-action="cert-exam"]');
    if (examBtn) examBtn.addEventListener('click', () => {
      const id = examBtn.getAttribute('data-exam');
      if (TV.CertExam && TV.CertExam.open) TV.CertExam.open(id, { count: 20 });
    });
  }

  /* ── Registration ────────────────────────────────────────── */
  function registerAll(format, services) {
    TV._services = TV._services || {};
    TV._services[format] = services;
    services.forEach(svc => {
      TV.registerModule(format, {
        id: svc.id, title: svc.name, group: svc.category, format,
        render(container) { renderDetail(container, format, svc); },
        destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); },
      });
    });
  }

  function registerHome(format, meta) {
    TV.registerModule(format, {
      id: 'home', title: meta.title || 'Overview', group: 'overview', format,
      render(container) { renderHome(container, format, meta); },
      destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); },
    });
  }

  /* Build navGroups for a format's descriptor from its service list. */
  function navGroupsFor(format, opts) {
    opts = opts || {};
    const groups = [{
      id: 'overview', label: 'Overview',
      items: [{ id: 'home', label: opts.homeLabel || 'Overview', icon: 'home', available: true }],
    }];
    categoriesFor(format).forEach(c => {
      groups.push({
        id: c.id, label: c.label,
        items: c.items.map(s => ({ id: s.id, label: s.name, icon: c.icon, available: true })),
      });
    });
    return groups;
  }

  TV.ServiceDetail = { registerAll, registerHome, categoriesFor, navGroupsFor, CATEGORIES };
})();
