// Shared shell primitives (I08 — template subset).
// The full merged shell (Kafka+Flink reconciliation, tabs, IQ) lands with
// the Gate 3 port; this template version provides the section-page layout and
// the scenario banner used by every placeholder section today.
import { getScenario } from '../data/scenarios.js';

export function pageHead({ eyebrow, title, sub }) {
  return `<div class="page-head">
    ${eyebrow ? `<div class="page-eyebrow">${eyebrow}</div>` : ''}
    <h1 class="page-title">${title}</h1>
    ${sub ? `<p class="page-sub">${sub}</p>` : ''}
  </div>`;
}

// A banner that reflects the active scenario, proving the switcher drives real data.
export function scenarioBanner() {
  const s = getScenario();
  return `<div class="scenario-banner">
    <span class="sb-ico">${s.icon}</span>
    <div class="sb-body">
      Active scenario: <b>${s.name}</b> — worked example <b>${s.canonicalId}</b>.
      Partition key: <b>${s.keyField}</b>. ${s.tagline}
    </div>
  </div>`;
}

export function card(inner, cls = '') { return `<div class="card ${cls}">${inner}</div>`; }
