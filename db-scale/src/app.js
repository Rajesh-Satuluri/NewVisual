/* app.js — the course shell: top bar · course tree · lesson workspace · narrative.
   The LSM-Tree lesson is fully built; every other catalog concept is navigable
   as a graceful "not built yet" placeholder so the whole curriculum validates. */
import { h, mount } from './engine/h.js';
import { createStore } from './engine/store.js';
import { onRoute, go } from './engine/router.js';
import { createFlowSystem } from './engine/flows.js';
import { renderLsmScene } from './db/lsm-scene.js';
import { renderDbmsScene } from './db/dbms-scene.js';
import { renderWhyDatabasesScene } from './db/why-databases-scene.js';
import { renderDbmsArchitectureScene } from './db/dbms-architecture-scene.js';
import { renderDataModelsScene } from './db/data-models-scene.js';
import { renderRelationalModelScene } from './db/relational-model-scene.js';
import { renderRelationalAlgebraScene } from './db/relational-algebra-scene.js';
import { renderSqlRelationalAlgebraScene } from './db/sql-relational-algebra-scene.js';
import { renderSchemaConstraintsScene } from './db/schema-constraints-scene.js';
import { renderStorageHierarchyScene } from './db/storage-hierarchy-scene.js';
import { renderSqlParsingScene } from './db/sql-parsing-scene.js';
import { renderParseTreeScene } from './db/parse-tree-scene.js';
import { renderAstScene } from './db/ast-scene.js';
import { renderQueryAnalysisScene } from './db/query-analysis-scene.js';
import { renderLogicalPlanScene } from './db/logical-plan-scene.js';
import { renderPhysicalPlanScene } from './db/physical-plan-scene.js';
import { renderQueryOptimizationScene } from './db/query-optimization-scene.js';
import { renderCostBasedOptimizationScene } from './db/cost-based-optimization-scene.js';
import { renderTableScanScene } from './db/table-scan-scene.js';
import { renderIndexScanScene } from './db/index-scan-scene.js';
import { renderNestedLoopJoinScene } from './db/nested-loop-join-scene.js';
import { renderHashJoinScene } from './db/hash-join-scene.js';
import { renderSortMergeJoinScene } from './db/sort-merge-join-scene.js';
import { renderAggregationScene } from './db/aggregation-scene.js';
import { renderQueryExecutionScene } from './db/query-execution-scene.js';
import { renderQueryPlanComparatorScene } from './db/query-plan-comparator-scene.js';
import { renderExplainAnalyzeScene } from './db/explain-analyze-scene.js';
import { renderParallelQueryScene } from './db/parallel-query-scene.js';
import { renderQueryStatisticsScene } from './db/query-statistics-scene.js';
import { renderCostModelScene } from './db/cost-model-scene.js';
import { renderDatabaseFilesScene } from './db/database-files-scene.js';
import { renderPagesScene } from './db/pages-scene.js';
import { renderRecordsTuplesScene } from './db/records-tuples-scene.js';
import { renderSlottedPagesScene } from './db/slotted-pages-scene.js';
import { renderBufferPoolScene } from './db/buffer-pool-scene.js';
import { renderBufferPoolReplacementScene } from './db/buffer-pool-replacement-scene.js';
import { renderPageCacheScene } from './db/page-cache-scene.js';
import { renderDiskIoScene } from './db/disk-io-scene.js';
import { renderSequentialVsRandomIoScene } from './db/sequential-vs-random-io-scene.js';
import { renderBTreeScene } from './db/b-tree-scene.js';
import { renderBPlusTreeScene } from './db/b-plus-tree-scene.js';
import { renderBPlusTreeSearchScene } from './db/b-plus-tree-search-scene.js';
import { renderBPlusTreeInsertScene } from './db/b-plus-tree-insert-scene.js';
import { renderBPlusTreeDeleteScene } from './db/b-plus-tree-delete-scene.js';
import { renderBPlusTreeRootSplitScene } from './db/b-plus-tree-root-split-scene.js';
import { renderMemtableWalScene } from './db/memtable-wal-scene.js';
import { renderSstableScene } from './db/sstable-scene.js';
import { renderBloomFilterScene } from './db/bloom-filter-scene.js';
import { renderLsmCompactionScene } from './db/lsm-compaction-scene.js';
import { renderIndexTypesScene } from './db/index-types-scene.js';
import { renderHud, renderLegend } from './db/hud.js';
import { icon } from './engine/icons.js';
import { lsmLesson } from './content/lsm.js';
import { dbmsLesson } from './content/dbms.js';
import { whyDatabasesLesson } from './content/why-databases.js';
import { dbmsArchitectureLesson } from './content/dbms-architecture.js';
import { dataModelsLesson } from './content/data-models.js';
import { relationalModelLesson } from './content/relational-model.js';
import { relationalAlgebraLesson } from './content/relational-algebra.js';
import { sqlRelationalAlgebraLesson } from './content/sql-relational-algebra.js';
import { schemaConstraintsLesson } from './content/schema-constraints.js';
import { storageHierarchyLesson } from './content/storage-hierarchy.js';
import { sqlParsingLesson } from './content/sql-parsing.js';
import { parseTreeLesson } from './content/parse-tree.js';
import { astLesson } from './content/ast.js';
import { queryAnalysisLesson } from './content/query-analysis.js';
import { logicalPlanLesson } from './content/logical-plan.js';
import { physicalPlanLesson } from './content/physical-plan.js';
import { queryOptimizationLesson } from './content/query-optimization.js';
import { costBasedOptimizationLesson } from './content/cost-based-optimization.js';
import { tableScanLesson } from './content/table-scan.js';
import { indexScanLesson } from './content/index-scan.js';
import { nestedLoopJoinLesson } from './content/nested-loop-join.js';
import { hashJoinLesson } from './content/hash-join.js';
import { sortMergeJoinLesson } from './content/sort-merge-join.js';
import { aggregationLesson } from './content/aggregation.js';
import { queryExecutionLesson } from './content/query-execution.js';
import { queryPlanComparatorLesson } from './content/query-plan-comparator.js';
import { explainAnalyzeLesson } from './content/explain-analyze.js';
import { parallelQueryLesson } from './content/parallel-query.js';
import { queryStatisticsLesson } from './content/query-statistics.js';
import { costModelLesson } from './content/cost-model.js';
import { databaseFilesLesson } from './content/database-files.js';
import { pagesLesson } from './content/pages.js';
import { recordsTuplesLesson } from './content/records-tuples.js';
import { slottedPagesLesson } from './content/slotted-pages.js';
import { bufferPoolLesson } from './content/buffer-pool.js';
import { bufferPoolReplacementLesson } from './content/buffer-pool-replacement.js';
import { pageCacheLesson } from './content/page-cache.js';
import { diskIoLesson } from './content/disk-io.js';
import { sequentialVsRandomIoLesson } from './content/sequential-vs-random-io.js';
import { bTreeLesson } from './content/b-tree.js';
import { bPlusTreeLesson } from './content/b-plus-tree.js';
import { bPlusTreeSearchLesson } from './content/b-plus-tree-search.js';
import { bPlusTreeInsertLesson } from './content/b-plus-tree-insert.js';
import { bPlusTreeDeleteLesson } from './content/b-plus-tree-delete.js';
import { bPlusTreeRootSplitLesson } from './content/b-plus-tree-root-split.js';
import { memtableWalLesson } from './content/memtable-wal.js';
import { sstableLesson } from './content/sstable.js';
import { bloomFilterLesson } from './content/bloom-filter.js';
import { lsmCompactionLesson } from './content/lsm-compaction.js';
import { indexTypesLesson } from './content/index-types.js';
import { createLsm } from './kernels/lsm.mjs';
import { CATALOG, TOTAL, BUILT_COUNT } from './content/catalog.js';

const LESSONS = {
  'lsm-tree': lsmLesson,
  'what-is-dbms': dbmsLesson,
  'why-databases': whyDatabasesLesson,
  'dbms-architecture': dbmsArchitectureLesson,
  'data-models': dataModelsLesson,
  'relational-model': relationalModelLesson,
  'relational-algebra': relationalAlgebraLesson,
  'sql-relational-algebra': sqlRelationalAlgebraLesson,
  'schema-constraints': schemaConstraintsLesson,
  'storage-hierarchy': storageHierarchyLesson,
  'sql-parsing': sqlParsingLesson,
  'parse-tree': parseTreeLesson,
  'ast': astLesson,
  'query-analysis': queryAnalysisLesson,
  'logical-plan': logicalPlanLesson,
  'physical-plan': physicalPlanLesson,
  'query-optimization': queryOptimizationLesson,
  'cost-based-optimization': costBasedOptimizationLesson,
  'table-scan': tableScanLesson,
  'index-scan': indexScanLesson,
  'nested-loop-join': nestedLoopJoinLesson,
  'hash-join': hashJoinLesson,
  'sort-merge-join': sortMergeJoinLesson,
  'aggregation': aggregationLesson,
  'query-execution': queryExecutionLesson,
  'query-plan-comparator': queryPlanComparatorLesson,
  'explain-analyze': explainAnalyzeLesson,
  'parallel-query': parallelQueryLesson,
  'query-statistics': queryStatisticsLesson,
  'cost-model': costModelLesson,
  'database-files': databaseFilesLesson,
  'pages': pagesLesson,
  'records-tuples': recordsTuplesLesson,
  'slotted-pages': slottedPagesLesson,
  'buffer-pool': bufferPoolLesson,
  'buffer-pool-replacement': bufferPoolReplacementLesson,
  'page-cache': pageCacheLesson,
  'disk-io': diskIoLesson,
  'sequential-vs-random-io': sequentialVsRandomIoLesson,
  'b-tree': bTreeLesson,
  'b-plus-tree': bPlusTreeLesson,
  'b-plus-tree-search': bPlusTreeSearchLesson,
  'b-plus-tree-insert': bPlusTreeInsertLesson,
  'b-plus-tree-delete': bPlusTreeDeleteLesson,
  'b-plus-tree-root-split': bPlusTreeRootSplitLesson,
  'memtable-wal': memtableWalLesson,
  'sstable': sstableLesson,
  'bloom-filter': bloomFilterLesson,
  'lsm-compaction': lsmCompactionLesson,
  'index-types': indexTypesLesson,
};
// per-lesson scene renderer (all share the iso3d visual vocabulary)
const SCENES = {
  'lsm-tree': renderLsmScene,
  'what-is-dbms': renderDbmsScene,
  'why-databases': renderWhyDatabasesScene,
  'dbms-architecture': renderDbmsArchitectureScene,
  'data-models': renderDataModelsScene,
  'relational-model': renderRelationalModelScene,
  'relational-algebra': renderRelationalAlgebraScene,
  'sql-relational-algebra': renderSqlRelationalAlgebraScene,
  'schema-constraints': renderSchemaConstraintsScene,
  'storage-hierarchy': renderStorageHierarchyScene,
  'sql-parsing': renderSqlParsingScene,
  'parse-tree': renderParseTreeScene,
  'ast': renderAstScene,
  'query-analysis': renderQueryAnalysisScene,
  'logical-plan': renderLogicalPlanScene,
  'physical-plan': renderPhysicalPlanScene,
  'query-optimization': renderQueryOptimizationScene,
  'cost-based-optimization': renderCostBasedOptimizationScene,
  'table-scan': renderTableScanScene,
  'index-scan': renderIndexScanScene,
  'nested-loop-join': renderNestedLoopJoinScene,
  'hash-join': renderHashJoinScene,
  'sort-merge-join': renderSortMergeJoinScene,
  'aggregation': renderAggregationScene,
  'query-execution': renderQueryExecutionScene,
  'query-plan-comparator': renderQueryPlanComparatorScene,
  'explain-analyze': renderExplainAnalyzeScene,
  'parallel-query': renderParallelQueryScene,
  'query-statistics': renderQueryStatisticsScene,
  'cost-model': renderCostModelScene,
  'database-files': renderDatabaseFilesScene,
  'pages': renderPagesScene,
  'records-tuples': renderRecordsTuplesScene,
  'slotted-pages': renderSlottedPagesScene,
  'buffer-pool': renderBufferPoolScene,
  'buffer-pool-replacement': renderBufferPoolReplacementScene,
  'page-cache': renderPageCacheScene,
  'disk-io': renderDiskIoScene,
  'sequential-vs-random-io': renderSequentialVsRandomIoScene,
  'b-tree': renderBTreeScene,
  'b-plus-tree': renderBPlusTreeScene,
  'b-plus-tree-search': renderBPlusTreeSearchScene,
  'b-plus-tree-insert': renderBPlusTreeInsertScene,
  'b-plus-tree-delete': renderBPlusTreeDeleteScene,
  'b-plus-tree-root-split': renderBPlusTreeRootSplitScene,
  'memtable-wal': renderMemtableWalScene,
  'sstable': renderSstableScene,
  'bloom-filter': renderBloomFilterScene,
  'lsm-compaction': renderLsmCompactionScene,
  'index-types': renderIndexTypesScene,
};
const TABS = ['Learn', 'Practice', 'Design Lab', 'Cheatsheets'];
const TAB_ICON = { 'Learn': 'book', 'Practice': 'target', 'Design Lab': 'sliders', 'Cheatsheets': 'grid' };
const SECTION_ICON_COLORS = ['#c98a3e', '#2f8a43', '#6b4fbb', '#2a7a6b', '#c0392b', '#3b82c9', '#b5892b', '#7a8290', '#5a6b8c'];
const CALLOUT_ICON = { warn: 'alert', insight: 'gauge', tip: 'check' };
const CHAPTER_LABEL = { setup: 'Setup', problem: 'Problem', solution: 'Solution', technique: 'How it works', tradeoff: 'Trade-off', recap: 'Recap', insight: 'Insight' };

// section index that contains a given slug (for auto-expand)
function sectionOf(slug) {
  for (let i = 0; i < CATALOG.length; i++) if (CATALOG[i].items.some(it => it.slug === slug)) return i;
  return 0;
}
function catalogItem(slug) {
  for (const s of CATALOG) { const it = s.items.find(i => i.slug === slug); if (it) return { ...it, section: s }; }
  return null;
}

const store = createStore({ slug: 'lsm-tree', step: 0, expanded: new Set([sectionOf('lsm-tree')]) });
let flows = null;

function boot() {
  const app = document.getElementById('app');
  mount(app, h('div.shell', [
    renderTopbar(),
    h('div.layout', [
      h('aside.sidebar', { id: 'sidebar' }),
      h('main.workspace', { id: 'workspace' }),
      h('section.rail', { id: 'rail' }),
    ]),
  ]));
  onRoute(({ lesson, step }) => {
    const slug = lesson || store.get().slug;
    const exp = store.get().expanded; exp.add(sectionOf(slug));
    store.set({ slug, step: step || 0, expanded: exp });
    render();
  });
}

/* ── Top bar ── */
function renderTopbar() {
  return h('header.topbar', [
    h('div.topbar__brand', [h('span.brand__dot'), h('b', 'DB Internals'), h('span.brand__thin', 'to scale')]),
    h('nav.tabs', TABS.map((t, i) => h('button.tab' + (i === 0 ? '.is-active' : ''), { title: i ? 'Coming soon' : '' }, [
      h('span.tab__ic', { html: icon(TAB_ICON[t]) }),
      h('span', { text: t }),
    ]))),
    h('div.topbar__right', [
      h('div.search', [
        h('span.search__ic', { html: icon('search') }),
        h('span.search__ph', 'Search concepts…'),
        h('kbd.search__kbd', '⌘K'),
      ]),
      h('button.chip-btn.chip-btn--lang', [h('span.chip-btn__ic', { html: icon('globe') }), h('span', 'EN'), h('span.chip-btn__caret', { html: icon('chevron') })]),
      h('button.chip-btn.chip-btn--icon', { id: 'themeToggle2', title: 'Toggle theme', 'aria-label': 'Toggle theme' }, [
        h('span.ic-moon', { html: icon('moon') }),
        h('span.ic-sun', { html: icon('sun') }),
      ]),
    ]),
  ]);
}

function render() {
  const { slug, step } = store.get();
  const lesson = LESSONS[slug];
  renderSidebar(slug);
  if (lesson) { renderBuilt(lesson, step); }
  else { renderPlaceholder(slug); }
}

/* ── Course tree (full catalog) ── */
function renderSidebar(activeSlug) {
  const host = document.getElementById('sidebar');
  const { expanded } = store.get();
  mount(host, h('div.course', [
    h('div.course__head', [h('span', { html: icon('layers') }), h('b', 'Course'), h('span.course__count', `${TOTAL} concepts`)]),
    h('div.sections', CATALOG.map((sec, i) => {
      const open = expanded.has(i);
      const builtN = sec.items.filter(x => x.built).length;
      return h('div.section' + (open ? '.is-open' : ''), [
        h('button.section__head', { onClick: () => toggleSection(i) }, [
          h('span.section__caret', open ? '▾' : '▸'),
          h('span.section__folder', { html: icon('folder'), style: { color: SECTION_ICON_COLORS[i % SECTION_ICON_COLORS.length] } }),
          h('span.section__n', { text: sec.n }),
          h('span.section__name', { text: sec.name }),
          h('span.section__count', { text: `${builtN}/${sec.items.length}` }),
        ]),
        open ? h('div.items', sec.items.map(it =>
          h('button.item' + (it.slug === activeSlug ? '.is-active' : '') + (it.built ? '.is-built' : ''),
            { onClick: () => go({ lesson: it.slug, step: 0 }) }, [
            h('span.item__icon', { text: it.built ? '●' : '○' }),
            h('span.item__title', { text: it.title }),
            it.built ? h('span.item__badge', 'live') : null,
          ])) ) : null,
      ]);
    })),
    h('div.progress', [
      h('div.progress__bar', [h('div.progress__fill', { style: { width: (BUILT_COUNT / TOTAL * 100).toFixed(1) + '%' } })]),
      h('div.progress__txt', `${BUILT_COUNT} / ${TOTAL} built`),
    ]),
  ]));
}
function toggleSection(i) {
  const exp = store.get().expanded;
  exp.has(i) ? exp.delete(i) : exp.add(i);
  store.set({ expanded: exp }); renderSidebar(store.get().slug);
}

/* ── Built lesson workspace ── */
function renderBuilt(L, step) {
  step = Math.min(Math.max(0, step), L.steps.length - 1);
  const st = L.steps[step];
  const ws = document.getElementById('workspace');
  if (flows) { flows.clear(); flows = null; }

  const header = h('div.ws-head', [
    h('div.breadcrumb', { text: `${L.group}  /  ${L.title}` }),
    h('div.ws-head__row', [
      h('div.ws-head__main', [
        h('h1.ws-title', { text: L.title }),
        h('p.ws-sub', { text: L.summary }),
      ]),
      h('div.badges', [
        h('span.badge', [h('span.badge__ic', { html: icon('clock') }), h('span', `${L.minutes} min`)]),
        h('span.badge', [h('span.badge__ic', { html: icon('gauge') }), h('span', L.level)]),
        h('span.badge.badge--steps', [h('span.badge__ic', { html: icon('listOrdered') }), h('span', `${L.steps.length} steps`)]),
      ]),
    ]),
  ]);

  // scene
  let sceneBox, legendEl;
  if (st.scene && st.scene.lab) { sceneBox = h('div', { id: 'labmount' }); }
  else {
    const renderScene = SCENES[L.id] || renderLsmScene;
    const r = renderScene(st.scene, { hiKey: st.scene.hiKey, pulse: st.scene.pulse, probe: st.probe || [] });
    sceneBox = h('div.scene-box', [r.svg, h('div.scene-note', { text: r.note })]);
    flows = createFlowSystem(r.layer);
    (r.flows || []).forEach(f => { const p = r.rail(f.id); if (p) flows.add({ path: p, kind: f.kind, speed: f.speed, size: f.size }); });
    legendEl = renderLegend(L.legend);
  }

  mount(ws, h('div', [
    header,
    st.metrics ? h('div.hud-row', [renderHud(st.metrics, L.metrics, step > 0 ? L.steps[step - 1].metrics : null)]) : h('div'),
    sceneBox,
    legendEl || h('div'),
    renderStepRail(L, step),
  ]));

  if (st.scene && st.scene.lab) mountLab(document.getElementById('labmount'), L, step);
  renderNarrative(L, step);
}

/* horizontal step scrubber ("IN THIS LESSON") */
function renderStepRail(L, step) {
  return h('div.steprail', [
    h('div.steprail__head', [h('span', 'In this lesson'), h('span.steprail__count', `Step ${step + 1} of ${L.steps.length}`)]),
    h('div.steprail__track', L.steps.map((s, i) =>
      h('button.srnode' + (i === step ? '.is-active' : '') + (i < step ? '.is-done' : ''),
        { onClick: () => go({ lesson: L.id, step: i }) }, [
        h('span.srnode__dot', { text: String(i + 1) }),
        h('span.srnode__label', { text: s.short }),
      ])),
    ),
  ]);
}

/* ── Narrative rail ── */
function renderNarrative(L, step) {
  const st = L.steps[step];
  mount(document.getElementById('rail'), h('div.rail__inner', [
    h('div.rail__top', [
      h('span.rail__stepno', { text: `STEP ${step + 1} / ${L.steps.length}` }),
      h('span.rail__chaptag.chap--' + st.chapter, { text: (CHAPTER_LABEL[st.chapter] || st.chapter).toUpperCase() }),
    ]),
    h('h2.rail__title', { text: st.title }),
    h('div.rail__body', st.body.map(p => h('p', { html: p }))),
    st.changes ? h('ul.changes', st.changes.map(c => {
      const t = c[0] === '+' ? 'add' : c[0] === '-' ? 'del' : 'mod'; return h('li.change--' + t, { html: c });
    })) : null,
    st.callout ? h('div.callout.callout--' + st.callout.kind, [
      h('span.callout__icon', { html: icon(CALLOUT_ICON[st.callout.kind] || 'check') }), h('span', { html: st.callout.text }),
    ]) : null,
    h('div.nav', [
      h('button.nav__btn', { disabled: step === 0, onClick: () => go({ lesson: L.id, step: step - 1 }) }, '← Back'),
      (step === L.steps.length - 1
        ? h('button.nav__btn.nav__btn--primary', { disabled: true }, 'Finish ✓')
        : h('button.nav__btn.nav__btn--primary', { onClick: () => go({ lesson: L.id, step: step + 1 }) },
          `Next: ${L.steps[step + 1].short} →`)),
    ]),
    h('div.nav-hint', [
      h('kbd', '←'), h('kbd', '→'), h('span', 'step'),
      h('span.nav-hint__dot', '·'), h('kbd', 'Home'), h('span', 'restart'),
    ]),
    h('div.youll', [
      h('div.youll__label', 'You will learn'),
      ...L.goals.map(g => {
        const done = step >= g.step;
        return h('button.youll__item' + (done ? '.is-done' : ''), { onClick: () => go({ lesson: L.id, step: g.step }) }, [
          h('span.youll__box' + (done ? '.is-checked' : ''), done ? { html: icon('check') } : {}),
          h('span', { html: g.text }),
        ]);
      }),
    ]),
  ]));
}

/* ── Live lab ── */
function mountLab(host, L, step) {
  let kernel = createLsm({ memtableLimit: 4, fanout: 4 });
  [[12, 100], [42, 7], [88, 3], [7, 1]].forEach(([k, v]) => kernel.dispatch({ type: 'put', key: k, value: v }));
  let nextKey = 20;
  function paint() {
    if (flows) flows.clear();
    const snap = kernel.snapshot();
    const r = renderLsmScene(snap, {});
    const m = kernel.metrics();
    mount(host, h('div', [
      h('div.hud-row', [renderHud(m, ['memtable', 'sstables', 'readAmp', 'writeAmp'], null)]),
      h('div.scene-box', [r.svg, h('div.scene-note', { text: snap.note })]),
      h('div.lab-controls', [
        h('button.lab-btn', { onClick: () => { kernel.dispatch({ type: 'put', key: nextKey++, value: 1 }); paint(); } }, '+ Put key'),
        h('button.lab-btn', { onClick: () => { kernel.dispatch({ type: 'delete', key: 12 }); paint(); } }, 'Delete 12'),
        h('button.lab-btn', { onClick: () => { kernel.dispatch({ type: 'flush' }); paint(); } }, 'Flush'),
        h('button.lab-btn', { onClick: () => { kernel.dispatch({ type: 'compact' }); paint(); } }, 'Compact'),
        h('button.lab-btn.lab-btn--ghost', { onClick: () => { kernel.reset(); nextKey = 20; paint(); } }, 'Reset'),
      ]),
    ]));
    flows = createFlowSystem(r.layer);
    const wr = r.rail('write'); if (wr) flows.add({ path: wr, kind: 'write', speed: 160, size: 5 });
  }
  paint();
}

/* ── Placeholder for not-yet-built concepts ── */
function renderPlaceholder(slug) {
  if (flows) { flows.clear(); flows = null; }
  const it = catalogItem(slug) || { title: slug, section: { name: '' } };
  mount(document.getElementById('workspace'), h('div', [
    h('div.ws-head', [
      h('div.breadcrumb', { text: `${it.section.name}  /  ${it.title}` }),
      h('h1.ws-title', { text: it.title }),
      h('p.ws-sub', 'This lesson is on the roadmap — the content exists in db-lab; the Designed-to-Scale rebuild is pending.'),
    ]),
    h('div.placeholder', [
      h('div.placeholder__icon', { text: it.icon || '◇' }),
      h('div.placeholder__title', 'Not built yet'),
      h('div.placeholder__sub', `“${it.title}” will become a guided, animated lesson like LSM-Tree.`),
      h('button.placeholder__cta', { onClick: () => go({ lesson: 'lsm-tree', step: 0 }) }, 'Open the LSM-Tree lesson →'),
    ]),
  ]));
  mount(document.getElementById('rail'), h('div.rail__inner', [
    h('div.rail__top', [h('span.rail__stepno', 'PREVIEW')]),
    h('h2.rail__title', { text: it.title }),
    h('p.rail__muted', 'Pick a section on the left to browse the full curriculum. Lessons marked “live” are built; the rest are placeholders for now.'),
  ]));
}

function wireTheme() {
  document.addEventListener('click', e => {
    const btn = e.target && e.target.closest && e.target.closest('#themeToggle2');
    if (btn) {
      const dark = document.documentElement.dataset.theme === 'dark';
      document.documentElement.dataset.theme = dark ? 'light' : 'dark';
      try { localStorage.setItem('dbs:theme', JSON.stringify(dark ? 'light' : 'dark')); } catch {}
    }
  });
}

/* keyboard navigation through a lesson's steps (Designed-to-Scale parity) */
function wireKeys() {
  document.addEventListener('keydown', e => {
    const tag = (e.target && e.target.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
    const { slug, step } = store.get();
    const L = LESSONS[slug]; if (!L) return;
    if (e.key === 'ArrowRight' && step < L.steps.length - 1) { e.preventDefault(); go({ lesson: slug, step: step + 1 }); }
    else if (e.key === 'ArrowLeft' && step > 0) { e.preventDefault(); go({ lesson: slug, step: step - 1 }); }
    else if (e.key === 'Home' && step !== 0) { e.preventDefault(); go({ lesson: slug, step: 0 }); }
  });
}

wireTheme();
wireKeys();
boot();
