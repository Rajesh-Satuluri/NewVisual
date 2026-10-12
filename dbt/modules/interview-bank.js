// Interview Master Bank — reference page (EXTRAS).
// Tiered, full-schema dbt interview questions with search + tier filter.
// Each card expands to short answer, detailed answer, example, common mistake,
// follow-up, and the senior-level answer.
import { createModuleShell } from '../components/module-shell.js';
import { injectCodeEnhancements } from '../components/module-shell.js';
import { BANK, TIERS } from '../data/interview-bank.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Reference · Interview',
    title: 'Interview Master Bank',
    subtitle: `${BANK.length} tiered questions, each with a short + detailed answer, example, common mistake, follow-up, and the senior-level answer.`,
    tabs: [{ id: 'bank', label: '🎯 Question Bank' }, { id: 'coverage', label: '📊 Coverage Matrix' }],
  });

  const tab = container.querySelector('#tab-bank');
  const counts = Object.fromEntries(TIERS.map(t => [t.id, BANK.filter(b => b.tier === t.id).length]));

  tab.innerHTML = `
    <div class="ref-toolbar">
      <input class="ref-search" id="ib-search" type="text" placeholder="Search questions, answers, topics…" />
    </div>
    <div class="ref-toolbar" id="ib-tiers">
      <button class="ref-chip active" data-tier="all">All <span class="ib-n">${BANK.length}</span></button>
      ${TIERS.map(t => `<button class="ref-chip" data-tier="${t.id}" style="--chipC:${t.color}">${t.label} <span class="ib-n">${counts[t.id] || 0}</span></button>`).join('')}
    </div>
    <div class="ib-count" id="ib-count"></div>
    <div class="ib-list" id="ib-list"></div>
  `;

  const listEl = tab.querySelector('#ib-list');
  const countEl = tab.querySelector('#ib-count');
  const search = tab.querySelector('#ib-search');
  let tier = 'all', q = '';

  const tierMeta = id => TIERS.find(t => t.id === id) || { label: id, color: 'var(--accent)' };

  function card(b, i) {
    const tm = tierMeta(b.tier);
    return `
      <div class="ib-item" data-i="${i}">
        <button class="ib-q">
          <span class="ib-tier" style="background:${tm.color}22;color:${tm.color}">${tm.label}</span>
          <span class="ib-qtext">${b.q}</span>
          <span class="ib-chevron">▾</span>
        </button>
        <div class="ib-a">
          <div class="ib-a-body">
            <div class="ib-row"><span class="ib-k">Short answer</span><div>${b.short}</div></div>
            <div class="ib-row"><span class="ib-k">Detailed</span><div>${b.detailed}</div></div>
            ${b.example ? `<div class="ib-row"><span class="ib-k">Example</span><div class="code-block" data-lang="sql">${escapeHtml(b.example)}</div></div>` : ''}
            <div class="ib-row"><span class="ib-k ib-k-warn">Common mistake</span><div>${b.mistake}</div></div>
            <div class="ib-row"><span class="ib-k ib-k-follow">Follow-up</span><div>${b.followup}</div></div>
            <div class="ib-row"><span class="ib-k ib-k-senior">Senior answer</span><div>${b.senior}</div></div>
          </div>
        </div>
      </div>`;
  }

  function render() {
    const ql = q.trim().toLowerCase();
    const items = BANK.map((b, i) => ({ b, i })).filter(({ b }) => {
      if (tier !== 'all' && b.tier !== tier) return false;
      if (!ql) return true;
      return (b.q + b.short + b.detailed + b.mistake + b.followup + b.senior + b.cat).toLowerCase().includes(ql);
    });
    countEl.textContent = `${items.length} question${items.length === 1 ? '' : 's'}${tier !== 'all' ? ' · ' + tierMeta(tier).label : ''}${ql ? ` · matching "${q.trim()}"` : ''}`;
    listEl.innerHTML = items.length
      ? items.map(({ b, i }) => card(b, i)).join('')
      : `<div class="ref-empty">No questions match. Try a different tier or search.</div>`;
    injectCodeEnhancements(listEl);
  }

  tab.querySelector('#ib-tiers').addEventListener('click', e => {
    const chip = e.target.closest('.ref-chip');
    if (!chip) return;
    tab.querySelectorAll('#ib-tiers .ref-chip').forEach(c => c.classList.toggle('active', c === chip));
    tier = chip.dataset.tier; render();
  });
  search.addEventListener('input', () => { q = search.value; render(); });
  listEl.addEventListener('click', e => {
    const qbtn = e.target.closest('.ib-q');
    if (!qbtn) return;
    const item = qbtn.closest('.ib-item');
    const a = item.querySelector('.ib-a');
    const open = item.classList.toggle('open');
    a.style.maxHeight = open ? a.scrollHeight + 'px' : '0';
  });

  render();
  buildCoverage(container.querySelector('#tab-coverage'));
}

// Stable competency areas — questions are bucketed by keyword (from cat + q), so
// the matrix stays readable no matter how granular the raw `cat` labels are.
const AREAS = [
  ['Fundamentals & ELT', /fundamental|elt|etl|what is dbt|where dbt|transformation vs|when not|ref\(|source\(|\bdag\b|lineage|\bmodel\b/],
  ['Project & Config', /config|dbt_project|profile|target|\bvar\b|naming|environment|variable|precedence|property|seed/],
  ['Jinja & Macros', /jinja|macro|dispatch|whitespace|template|run_query|execute var|loop/],
  ['Materializations', /materializ|ephemeral|\bview\b|\btable\b materi|relation/],
  ['Incremental', /incremental|is_incremental|merge|microbatch|watermark|backfill|lookback|append|insert_overwrite|delete.?insert/],
  ['Snapshots & History', /snapshot|scd|slowly changing|dbt_valid|invalidate_hard/],
  ['Testing & Data Quality', /\btest|contract|freshness|not_null|unique|accepted_values|relationship|constraint|data quality|coverage/],
  ['SQL & Modeling', /\bsql\b|\bjoin|grain|window|dedup|surrogate|dimension|\bfact|aggregat|cardinality|null handling|date|time zone|precision|pivot/],
  ['CLI & Artifacts', /\bcli\b|command|parse|compile|manifest|run_results|catalog|artifact|dbt run|dbt build|dbt ls|dbt show|retry|clean/],
  ['Selection & State', /select|\bstate\b|slim ci|defer|state:modified|\btag/],
  ['CI/CD & Orchestration', /ci\/cd|\bci\b|deploy|airflow|orchestrat|schedul|\bretry|idempoten|pull request|\bpr\b/],
  ['Performance & Cost', /perform|\bcost|cluster|partition|prune|warehouse siz|scan|concurren/],
  ['Adapters & Platform', /adapter|snowflake|bigquery|databricks|redshift|postgres|platform|\bcloud|mesh|cross-project|python model|semantic|metric/],
  ['Debugging & Incidents', /debug|incident|root cause|triage|\bfail|orphan|broke|on-call|duplicate/],
  ['Architecture & Governance', /architect|governance|\bdesign|ownership|domain|access|deprecat|version|large.?team|audit/],
];
function areaOf(b) {
  const hay = ((b.cat || '') + ' ' + (b.q || '')).toLowerCase();
  for (const [name, re] of AREAS) if (re.test(hay)) return name;
  return 'Other';
}

function buildCoverage(root) {
  if (!root) return;
  const activeTiers = TIERS.filter(t => BANK.some(b => b.tier === t.id));
  const tagged = BANK.map(b => ({ b, area: areaOf(b) }));
  const areaNames = [...AREAS.map(a => a[0]), 'Other'].filter(name => tagged.some(x => x.area === name));
  const rows = areaNames.map(name => {
    const inArea = tagged.filter(x => x.area === name);
    return { name, total: inArea.length,
      byTier: Object.fromEntries(activeTiers.map(t => [t.id, inArea.filter(x => x.b.tier === t.id).length])) };
  }).sort((a, b) => b.total - a.total);
  const tierTotals = Object.fromEntries(activeTiers.map(t => [t.id, BANK.filter(b => b.tier === t.id).length]));
  const rawCats = new Set(BANK.map(b => b.cat)).size;

  let weak = [];
  try { weak = JSON.parse(localStorage.getItem('dbt-weak-topics') || '[]'); } catch {}

  root.innerHTML = `
    <p class="cov-lead">Competency coverage by area and difficulty tier — counts are live: <strong>${BANK.length}</strong> questions across ${rows.length} areas (${rawCats} raw categories) and ${activeTiers.length} tiers. A thin row is a competency to shore up before an interview.</p>
    ${weak.length ? `<div class="cov-weak"><strong>Your weak topics</strong> (saved from the Interview Simulator): ${weak.map(w => `<span class="cov-weak-chip">${escapeHtml(w)}</span>`).join('')}</div>` : ''}
    <div class="cov-scroll">
      <table class="cov-table">
        <thead><tr><th class="cov-cat-h">Competency area</th>${activeTiers.map(t => `<th style="color:${t.color}">${t.label}</th>`).join('')}<th>Total</th></tr></thead>
        <tbody>
          ${rows.map(c => `<tr><td class="cov-cat">${escapeHtml(c.name)}</td>${activeTiers.map(t => {
            const n = c.byTier[t.id]; return `<td class="${n ? 'cov-has' : 'cov-none'}">${n || '·'}</td>`;
          }).join('')}<td class="cov-total">${c.total}</td></tr>`).join('')}
        </tbody>
        <tfoot><tr><td class="cov-cat">All areas</td>${activeTiers.map(t => `<td class="cov-total">${tierTotals[t.id]}</td>`).join('')}<td class="cov-total">${BANK.length}</td></tr></tfoot>
      </table>
    </div>`;
}

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
