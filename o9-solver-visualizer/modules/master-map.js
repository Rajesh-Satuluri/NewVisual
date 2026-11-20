// master-map.js — a whole-curriculum overview. Reads MODULES live (single
// source of truth) and lays out every group as a section of clickable module
// cards with level badge, prerequisite and one-line description. Clicking a
// card navigates to that module via the hash router.
import { MODULES } from '../components/nav.js';

// One-line orientation per curriculum group (what the group is FOR).
const GROUP_BLURB = {
  'Foundations': 'The mental model — why a plan is needed and how the solver thinks.',
  'Network & Data Model': 'The world the solver plans over — networks, nodes and the horizon.',
  'Solver Inputs': 'Everything you feed the solver before it runs.',
  'How It Solves': 'The decisions the solver makes while planning a demand.',
  'Outputs & Diagnostics': 'What comes out, and how to read and debug it.',
  'Invocation': 'How a run is launched and the plan types it supports.',
  'Models Supported': 'Advanced modelling capabilities layered on the core solver.',
  'Optimization & Ops': 'Passes, scale, configuration and deployment flavours.',
};

// Auxiliary sections (not concept modules) — shown as an appendix of quick links.
const AUX = [
  { name: 'Playground', items: [
    { id: 'playground', icon: '🎮', label: 'Solver Playground', desc: 'Drive the real engine functions on one demand, live.' },
    { id: 'sim-lab',    icon: '🧪', label: 'Scenario Lab',      desc: 'Pre-built situations run through the solver primitives.' },
  ]},
  { name: 'Reference', items: [
    { id: 'master-map', icon: '🗺️', label: 'Master Map',   desc: 'This page — the whole curriculum at a glance.' },
    { id: 'glossary',   icon: '📖', label: 'Glossary',     desc: 'The vocabulary of the solver.' },
    { id: 'cheatsheet', icon: '📋', label: 'Cheat Sheet',  desc: 'Dense one-page quick reference.' },
  ]},
  { name: 'Practice', items: [
    { id: 'mock-interview', icon: '🎤', label: 'Mock Interview', desc: 'Timed questions drawn from every module.' },
    { id: 'decisions',      icon: '🧭', label: 'Decision Drills', desc: 'Pick the correct solver behaviour.' },
    { id: 'rca-clinic',     icon: '🚑', label: 'RCA Clinic',      desc: 'Diagnose the root cause of a short/late demand.' },
    { id: 'interview',      icon: '🎯', label: 'Interview Q&A',   desc: 'The full question bank, browsable.' },
  ]},
  { name: 'Review', items: [
    { id: 'dashboard', icon: '📊', label: 'Dashboard',     desc: 'Your readiness and coverage.' },
    { id: 'review',    icon: '🔁', label: 'Review Center', desc: 'Spaced-repetition flashcards.' },
    { id: 'study',     icon: '📚', label: 'Study Hub',     desc: 'What to study next.' },
  ]},
];

// Group order = first-seen order in MODULES (GROUP_ORDER is not exported).
function groupOrder() {
  const seen = [];
  MODULES.forEach(m => { if (!seen.includes(m.group)) seen.push(m.group); });
  return seen;
}

function levelBadge(level) {
  if (!level) return '';
  const lv = level.toLowerCase();
  return `<span class="level-badge level-${lv}">${level}</span>`;
}

function moduleCard(m) {
  return `
    <a class="mm-card" href="#${m.id}" data-search="${(m.label + ' ' + (m.desc || '')).toLowerCase()}">
      <div class="mm-card-head">
        <span class="mm-icon">${m.icon || '▫️'}</span>
        <span class="mm-label">${m.label}</span>
        ${levelBadge(m.level)}
      </div>
      ${m.desc ? `<div class="mm-desc">${m.desc}</div>` : ''}
      ${m.prereq ? `<div class="mm-prereq">Builds on: <strong>${m.prereq}</strong></div>` : ''}
    </a>`;
}

export function mount(container) {
  const order = groupOrder();
  const grouped = {};
  MODULES.forEach(m => { (grouped[m.group] = grouped[m.group] || []).push(m); });

  const total = MODULES.length;

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">Reference</div>
        <h1 class="module-title">Master Map</h1>
        <p class="module-subtitle">The whole curriculum at a glance — all ${total} modules across ${order.length} groups, in learning order. Click any card to jump to it. Colour marks difficulty; "Builds on" marks the prerequisite.</p>
      </div>
      <div class="scroll-content">

        <div class="mm-legend">
          <span class="mm-legend-item"><span class="level-badge level-beginner">Beginner</span> start here</span>
          <span class="mm-legend-item"><span class="level-badge level-core">Core</span> the working model</span>
          <span class="mm-legend-item"><span class="level-badge level-advanced">Advanced</span> specialised capabilities</span>
        </div>

        <input class="nav-filter" id="mm-filter" type="text" placeholder="Filter modules…" aria-label="Filter modules" style="max-width:420px;margin:4px 0 18px" />

        <div id="mm-list">
          ${order.map((g, i) => `
            <div class="mm-group" data-group="${g}">
              <div class="section-header">
                <div class="section-title"><span class="mm-group-num">${i + 1}</span> ${g} <span class="mm-group-count">${grouped[g].length}</span></div>
                ${GROUP_BLURB[g] ? `<div class="section-desc">${GROUP_BLURB[g]}</div>` : ''}
              </div>
              <div class="mm-grid">
                ${grouped[g].map(moduleCard).join('')}
              </div>
            </div>`).join('')}
        </div>

        <div class="section-header" style="margin-top:28px">
          <div class="section-title">Beyond the curriculum</div>
          <div class="section-desc">Tools and review surfaces that sit alongside the ${total} modules.</div>
        </div>
        ${AUX.map(sec => `
          <div class="mm-group mm-aux" data-group="${sec.name}">
            <div class="mm-aux-name">${sec.name}</div>
            <div class="mm-grid">
              ${sec.items.map(it => `
                <a class="mm-card mm-card-aux" href="#${it.id}" data-search="${(it.label + ' ' + it.desc).toLowerCase()}">
                  <div class="mm-card-head"><span class="mm-icon">${it.icon}</span><span class="mm-label">${it.label}</span></div>
                  <div class="mm-desc">${it.desc}</div>
                </a>`).join('')}
            </div>
          </div>`).join('')}

      </div>
    </div>

    <style>
      .mm-legend { display:flex; flex-wrap:wrap; gap:16px; margin:2px 0 14px; font-size:13px; color:var(--text2); }
      .mm-legend-item { display:inline-flex; align-items:center; gap:7px; }
      .mm-group { margin-bottom:26px; }
      .mm-group-num { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:50%; background:var(--accent,#6366F1); color:#fff; font-size:12px; font-weight:700; margin-right:4px; vertical-align:middle; }
      .mm-group-count { font-size:12px; color:var(--text2); font-weight:600; background:rgba(127,127,127,.12); border-radius:10px; padding:1px 9px; margin-left:6px; vertical-align:middle; }
      .mm-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(248px,1fr)); gap:12px; margin-top:12px; }
      .mm-card { display:block; text-decoration:none; background:var(--surface,#111827); border:1px solid var(--border,#1e2a3f); border-left:3px solid var(--accent,#6366F1); border-radius:12px; padding:13px 15px; transition:transform .12s ease, border-color .12s ease, box-shadow .12s ease; }
      .mm-card:hover { transform:translateY(-2px); border-color:var(--accent,#818CF8); box-shadow:0 6px 20px rgba(0,0,0,.25); }
      .mm-card-head { display:flex; align-items:center; gap:9px; }
      .mm-icon { font-size:17px; }
      .mm-label { font-weight:650; color:var(--text,#E2E8F0); font-size:14px; flex:1; }
      .mm-desc { font-size:12.5px; color:var(--text2,#94A3B8); line-height:1.45; margin-top:7px; }
      .mm-prereq { font-size:11.5px; color:var(--text2,#64748B); margin-top:8px; padding-top:7px; border-top:1px dashed var(--border,#1e2a3f); }
      .mm-card-aux { border-left-color:#64748B; }
      .mm-aux-name { font-size:13px; font-weight:700; letter-spacing:.02em; text-transform:uppercase; color:var(--text2); margin:14px 0 2px; }
      .mm-empty { color:var(--text2); font-size:13px; padding:10px 2px; }
    </style>`;

  // ── Filter ────────────────────────────────────────────────────────────────
  const filter = container.querySelector('#mm-filter');
  filter?.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    container.querySelectorAll('.mm-group').forEach(group => {
      let any = false;
      group.querySelectorAll('.mm-card').forEach(card => {
        const match = !q || (card.dataset.search || '').includes(q);
        card.hidden = !match;
        if (match) any = true;
      });
      group.hidden = !any;
    });
  });

  return null;
}
