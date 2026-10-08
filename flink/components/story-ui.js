// Shared "one ride, traced end-to-end" UI primitives.
// Every module uses these to anchor concepts to canonical ride R-4471:
//   - rideSpine()      persistent clickable lifecycle tracker
//   - pyCode()         PyFlink code block with tier badge (from verified snippets)
//   - rideCallout()    "In this ride" card for a lifecycle stage
//   - scenarioCard()   interview corner-case card (scenario→break→Flink→answer)
// All content is data-driven from data/ride-story.js, data/pyflink-snippets.js,
// and data/interview-cases.js so the story stays identical across all modules.

import { STAGES, OPS_STAGES, INCIDENTS, RIDE, istTime } from '../data/ride-story.js';
import { PYFLINK, PYFLINK_TIERS } from '../data/pyflink-snippets.js';

const ALL_STAGES = [...STAGES, ...OPS_STAGES];

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- Ride lifecycle spine -------------------------------------------------
// opts: { active: ['DRIVER_ARRIVING', ...]  // stage keys to highlight
//         incidents: ['DEFECT-1', ...] }    // defects to flag on the spine
export function rideSpine(opts = {}) {
  const active = new Set(opts.active || []);
  const incidentStages = new Set(
    (opts.incidents || [])
      .map((id) => INCIDENTS.find((i) => i.id === id))
      .filter(Boolean)
      .map((i) => i.stage),
  );
  const chips = STAGES.map((s) => {
    const isActive = active.has(s.key);
    const hasIncident = incidentStages.has(s.key);
    const goto = s.modules && s.modules[0];
    return `
      <button class="spine-stage${isActive ? ' active' : ''}${hasIncident ? ' incident' : ''}"
              ${goto ? `data-goto="${goto}"` : ''} title="${esc(s.rider)}">
        <span class="spine-ic">${s.icon}</span>
        <span class="spine-lbl">${esc(s.label)}</span>
        ${hasIncident ? '<span class="spine-flag" title="corner case lives here">⚠</span>' : ''}
      </button>`;
  }).join('<span class="spine-arrow">→</span>');

  return `
    <div class="ride-spine" role="navigation" aria-label="Uber ride lifecycle">
      <div class="spine-head">
        <span class="spine-title">Ride ${esc(RIDE.ride_id)}</span>
        <span class="spine-sub">${esc(RIDE.city_id)} · follow one ride through every Flink concept</span>
      </div>
      <div class="spine-track">${chips}</div>
    </div>`;
}

export function initRideSpine(container) {
  container.querySelectorAll('.spine-stage[data-goto]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.goto;
      if (id) window.location.hash = id;
    });
  });
}

// ---- PyFlink code block (tiered, verified snippets) -----------------------
export function pyCode(key, opts = {}) {
  const snip = PYFLINK[key];
  if (!snip) return `<div class="code-block"><pre>// missing snippet: ${esc(key)}</pre></div>`;
  const label = PYFLINK_TIERS[snip.tier] || 'PyFlink';
  const tierClass = `tier-${snip.tier}`;
  const caption = opts.caption
    ? `<div class="code-caption">${opts.caption}</div>` : '';
  return `
    ${caption}
    <div class="code-block pyflink ${tierClass}">
      <span class="py-tier">${esc(label)}</span>
      <pre>${esc(snip.code)}</pre>
    </div>`;
}

// ---- "In this ride" callout for a lifecycle stage -------------------------
// Pass a stage key (string) or a stage object.
export function rideCallout(stageOrKey, opts = {}) {
  const stage = typeof stageOrKey === 'string'
    ? ALL_STAGES.find((s) => s.key === stageOrKey)
    : stageOrKey;
  if (!stage) return '';
  const e = stage.event;
  const jsonRows = e
    ? Object.entries(e)
        .map(([k, v]) => `  <span class="jk">${esc(k)}</span>: <span class="jv">${esc(
          typeof v === 'object' ? JSON.stringify(v) : v,
        )}</span>${k === 'event_time' ? `  <span class="jc"># ${esc(istTime(v))}</span>` : ''}`)
        .join(',\n')
    : '';
  return `
    <div class="ride-callout">
      <div class="rc-head">
        <span class="rc-ic">${stage.icon}</span>
        <span class="rc-stage">${esc(stage.label)}</span>
        <span class="rc-tag">In this ride</span>
      </div>
      <div class="rc-grid">
        <div class="rc-cell"><div class="rc-k">Rider sees</div><div class="rc-v">${esc(stage.rider)}</div></div>
        <div class="rc-cell"><div class="rc-k">Driver side</div><div class="rc-v">${esc(stage.driver)}</div></div>
        <div class="rc-cell rc-wide"><div class="rc-k">What Flink does</div><div class="rc-v">${esc(stage.flink)}</div></div>
        <div class="rc-cell rc-wide"><div class="rc-k">Why this concept, not another</div><div class="rc-v rc-why">${esc(stage.why)}</div></div>
      </div>
      ${jsonRows && opts.showEvent !== false ? `
        <details class="rc-json"${opts.openEvent ? ' open' : ''}>
          <summary>Event payload off Kafka at this instant</summary>
          <div class="code-block"><pre>{\n${jsonRows}\n}</pre></div>
        </details>` : ''}
    </div>`;
}

// ---- Interview corner-case card ------------------------------------------
// caseObj from data/interview-cases.js. Renders scenario→break→Flink→answer,
// optionally embedding the linked PyFlink snippet.
export function scenarioCard(c, opts = {}) {
  if (!c) return '';
  const diffClass = `diff-${c.difficulty || 'medium'}`;
  const inc = c.anchor?.incident ? INCIDENTS.find((i) => i.id === c.anchor.incident) : null;
  const anchorLabel = inc
    ? `${inc.id} · ${inc.title}`
    : (c.anchor?.stage
        ? (ALL_STAGES.find((s) => s.key === c.anchor.stage)?.label || c.anchor.stage)
        : null);
  const cfg = (c.config || []).map((x) => `<code>${esc(x)}</code>`).join(' ');
  return `
    <div class="scenario-card ${diffClass}">
      <div class="sc-head">
        <span class="sc-badge">${esc((c.difficulty || 'medium').toUpperCase())}</span>
        ${anchorLabel ? `<span class="sc-anchor">⚓ ${esc(anchorLabel)}</span>` : ''}
      </div>
      <div class="sc-row"><span class="sc-k">Scenario</span><div class="sc-v">${esc(c.scenario)}</div></div>
      <div class="sc-row sc-break"><span class="sc-k">What breaks</span><div class="sc-v">${esc(c.breaks)}</div></div>
      <div class="sc-row"><span class="sc-k">Interview answer</span><div class="sc-v">${c.answer}</div></div>
      ${cfg ? `<div class="sc-config">${cfg}</div>` : ''}
      ${c.snippet && opts.withCode !== false ? pyCode(c.snippet) : ''}
    </div>`;
}

// convenience: render a list of scenario cards
export function scenarioList(cases, opts = {}) {
  return (cases || []).map((c) => scenarioCard(c, opts)).join('');
}
