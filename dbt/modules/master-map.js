// Master Map — the whole dbt project on one page. Clickable nodes deep-link
// into the modules that explain each stage.
import { createModuleShell } from '../components/module-shell.js';

const STAGES = [
  {
    name: 'Raw & Sources', color: '#8895AA',
    nodes: [
      { ic: '🗄️', t: 'Raw warehouse tables', s: 'Loaded by Fivetran / Airbyte — EL, untouched', goto: 'm07' },
      { ic: '📇', t: 'sources.yml', s: 'Declare + freshness-test the raw inputs', goto: 'm11' },
    ],
  },
  {
    name: 'Transform (ELT)', color: '#3B82F6',
    nodes: [
      { ic: '⚡', t: 'ELT in the warehouse', s: 'Why transformation moved to SQL, in-warehouse', goto: 'm08' },
      { ic: '🦆', t: 'dbt runs the SQL', s: 'ref() + Jinja compile to a DAG of models', goto: 'm09' },
    ],
  },
  {
    name: 'Modeling layers', color: '#FF694B',
    nodes: [
      { ic: '🧱', t: 'Staging (stg_)', s: 'One model per source, light cleanup', goto: 'm10' },
      { ic: '🔗', t: 'Intermediate (int_)', s: 'Reusable joins & business logic', goto: 'm10' },
      { ic: '📊', t: 'Marts (fct_ / dim_)', s: 'Analytics-ready tables per domain', goto: 'm10' },
      { ic: '♻️', t: 'Macros', s: 'Write SQL once, call it everywhere', goto: 'm14' },
    ],
  },
  {
    name: 'Materialization', color: '#8B5CF6',
    nodes: [
      { ic: '⏩', t: 'Incremental models', s: 'Process only new rows, not full refresh', goto: 'm13' },
      { ic: '📸', t: 'Snapshots (SCD2)', s: 'Track how records change over time', goto: 'm12' },
    ],
  },
  {
    name: 'Trust & Governance', color: '#10B981',
    nodes: [
      { ic: '🧪', t: 'Tests', s: 'unique, not_null, relationships, custom', goto: 'm11' },
      { ic: '🕸️', t: 'Lineage & DAG', s: 'Know exactly what depends on what', goto: 'm15' },
      { ic: '📖', t: 'Docs & catalog', s: 'schema.yml → searchable data catalog', goto: 'm05' },
      { ic: '🚫', t: 'When NOT to use dbt', s: 'The edges where dbt is the wrong tool', goto: 'm16' },
    ],
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Reference · Master Map',
    title: 'The dbt project, end to end',
    subtitle: 'Every concept in this course, placed where it lives in a real dbt pipeline. Click any node to jump to the module that explains it.',
    tabs: [{ id: 'map', label: '🗺️ Pipeline Map' }],
  });

  const legend = STAGES.map(s => `<span><span class="mm-dot" style="background:${s.color}"></span>${s.name}</span>`).join('');

  const body = `
    <div class="mm-legend">${legend}</div>
    ${STAGES.map(s => `
      <div class="mm-stage">
        <div class="mm-stage-title"><span class="mm-dot" style="background:${s.color}"></span>${s.name}<span class="mm-stage-line"></span></div>
        <div class="mm-nodes">
          ${s.nodes.map(n => `
            <button class="mm-node" data-goto="${n.goto}" style="--nodeColor:${s.color}">
              <span class="mm-node-ic">${n.ic}</span>
              <span>
                <div class="mm-node-t">${n.t}</div>
                <div class="mm-node-s">${n.s}</div>
              </span>
            </button>`).join('')}
        </div>
      </div>`).join('')}
  `;
  container.querySelector('#tab-map').innerHTML = body;

  const onClick = (e) => {
    const node = e.target.closest('[data-goto]');
    if (node) window.location.hash = node.dataset.goto;
  };
  container.addEventListener('click', onClick);
  return () => container.removeEventListener('click', onClick);
}
