// Learning Modes (EXTRAS).
// A lightweight view over the existing content: curated paths for different
// goals. Not a mode engine — each mode is a hand-picked sequence of existing
// modules/pages you can jump into. Progressive disclosure for a 32-module tool.
import { createModuleShell } from '../components/module-shell.js';
import { getNavItem } from '../components/nav.js';

const MODES = [
  { id:'learn', icon:'📚', name:'Learn', color:'#3B82F6',
    blurb:'Start from zero and build up. Follow the story, then the core features.',
    path:['m01','m07','m08','m09','m10','m11','m13','m15','m14','m12'] },
  { id:'internals', icon:'🔬', name:'Internals', color:'#8B5CF6',
    blurb:'How dbt actually works under the hood — compile, manifest, selection.',
    path:['m17','m18','m19','m20'] },
  { id:'production', icon:'🏭', name:'Production', color:'#EF4444',
    blurb:'Operate dbt: incidents, debugging, performance, and where it does not fit.',
    path:['m24','m25','m26','m23','m21','m16'] },
  { id:'architect', icon:'🏛️', name:'Architect', color:'#EC4899',
    blurb:'Design whole platforms: CI/CD, environments, warehouses, Airflow, real stacks.',
    path:['m27','m28','m29','m30','m31'] },
  { id:'interview', icon:'🎯', name:'Interview', color:'#FF694B',
    blurb:'Rehearse for the interview — tiered bank, simulator, and the study deck.',
    path:['interview-bank','interview-sim','study','comparison'] },
  { id:'revision', icon:'⚡', name:'Revision', color:'#F59E0B',
    blurb:'Last-minute refresh — cheat sheet, glossary, command reference, the big map.',
    path:['cheatsheet','m32','glossary','master-map'] },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Guide · Modes',
    title: 'Learning Modes',
    subtitle: 'Six goal-based paths through the 32 modules. Pick how you want to work today.',
    tabs: [{ id: 'modes', label: '🧭 Modes' }],
  });
  const tab = container.querySelector('#tab-modes');

  let done = new Set();
  try { done = new Set(JSON.parse(localStorage.getItem('dbt-done') || '[]')); } catch (e) {}

  tab.innerHTML = `
    <p class="lab-intro">The same 32 modules, organized by what you're trying to do right now. Each path is an
    ordered set — click any step to jump in.</p>
    <div class="modes-grid">
      ${MODES.map(m => `
        <div class="mode-card" style="--modeC:${m.color}">
          <div class="mode-head"><span class="mode-ic">${m.icon}</span>
            <span class="mode-name">${m.name}</span>
            <span class="mode-count">${m.path.length} steps</span></div>
          <div class="mode-blurb">${m.blurb}</div>
          <div class="mode-steps">
            ${m.path.map((id, i) => {
              const nav = getNavItem(id);
              const title = nav ? nav.title : id;
              const ic = nav ? nav.icon : '•';
              const isDone = done.has(id);
              return `<button class="mode-step${isDone ? ' done' : ''}" data-goto="${id}">
                <span class="mode-step-n">${i + 1}</span><span class="mode-step-ic">${ic}</span>
                <span class="mode-step-t">${title}</span>${isDone ? '<span class="mode-step-chk">✓</span>' : ''}</button>`;
            }).join('')}
          </div>
          <button class="btn btn-primary mode-start" data-goto="${m.path[0]}">Start ${m.name} →</button>
        </div>`).join('')}
    </div>
  `;

  tab.addEventListener('click', e => {
    const b = e.target.closest('[data-goto]');
    if (b) location.hash = b.dataset.goto;
  });
}
