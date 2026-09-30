/* ============================================================
   Scenario Engine — the reusable interaction layer for every
   interview-simulator lab. Four renderers share one schema-driven
   core plus a common list/detail shell (LabView):

     • investigation(container, scenario)  — stepwise diagnosis
     • decision(container, scenario)        — choose-with-rationale
     • chain(container, scenario)           — progressive follow-ups
     • tiered(container, item)              — bad→good→senior / 30-90-180

   Content lives in window.SnowflakeViz.ScenarioBank[area] = [ ... ].
   Every completion writes to ProgressStore(area).
   ============================================================ */

(function () {
  'use strict';

  const viz = (window.SnowflakeViz = window.SnowflakeViz || {});
  viz.ScenarioBank = viz.ScenarioBank || {};

  /** Register a bank of scenarios for an area (merges/appends). */
  function register(area, list) {
    if (!Array.isArray(list)) return;
    viz.ScenarioBank[area] = (viz.ScenarioBank[area] || []).concat(list);
  }

  const Progress = () => viz.ProgressStore;

  /* ── tiny DOM helpers ─────────────────────────────────────── */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function diffBadge(d) {
    if (!d) return '';
    return `<span class="lab-diff lab-diff-${d}">${d}</span>`;
  }

  /* ============================================================
     1. INVESTIGATION — stepwise diagnosis
     ============================================================ */
  function investigation(container, sc) {
    container.innerHTML = '';
    const root = el('div', 'lab-run');
    root.appendChild(el('div', 'lab-symptom',
      `<div class="lab-symptom-tag">🔥 Symptom</div><p>${esc(sc.symptom)}</p>`));

    const steps = sc.steps || [];
    const stepsWrap = el('div', 'lab-steps');
    root.appendChild(stepsWrap);

    const outcome = el('div', 'lab-outcome');
    outcome.hidden = true;
    root.appendChild(outcome);

    let idx = 0;
    let allCorrect = true;

    function renderStep() {
      if (idx >= steps.length) return finish();
      const step = steps[idx];
      const card = el('div', 'lab-step');
      card.appendChild(el('div', 'lab-step-head',
        `<span class="lab-step-n">Step ${idx + 1}/${steps.length}</span>${esc(step.prompt)}`));

      const opts = el('div', 'lab-choices');
      let answered = false;
      (step.choices || []).forEach(ch => {
        const b = el('button', 'lab-choice');
        b.type = 'button';
        b.innerHTML = esc(ch.text);
        b.addEventListener('click', () => {
          if (answered) return;
          answered = true;
          if (!ch.correct) allCorrect = false;
          opts.querySelectorAll('.lab-choice').forEach((x, i) => {
            const c = step.choices[i];
            x.disabled = true;
            if (c.correct) x.classList.add('is-correct');
            else if (c === ch) x.classList.add('is-wrong');
          });
          const fb = el('div', 'lab-feedback ' + (ch.correct ? 'ok' : 'no'));
          fb.innerHTML =
            `<p><strong>${ch.correct ? '✓ Right call.' : '✗ Not the strongest move.'}</strong> ${esc(ch.why)}</p>` +
            (step.evidence ? `<p class="lab-evidence"><strong>Evidence:</strong> ${esc(step.evidence)}</p>` : '') +
            (step.insight ? `<p class="lab-insight"><strong>Why it matters:</strong> ${esc(step.insight)}</p>` : '') +
            (step.wrongAssumption ? `<p class="lab-trap"><strong>Common wrong assumption:</strong> ${esc(step.wrongAssumption)}</p>` : '');
          card.appendChild(fb);
          const next = el('button', 'lab-next');
          next.type = 'button';
          next.textContent = idx + 1 >= steps.length ? 'See root cause →' : 'Next step →';
          next.addEventListener('click', () => { idx++; renderStep(); });
          card.appendChild(next);
        });
        opts.appendChild(b);
      });
      card.appendChild(opts);
      stepsWrap.appendChild(card);
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function finish() {
      outcome.hidden = false;
      outcome.innerHTML =
        `<div class="lab-outcome-grid">
           <div class="lab-oc lab-oc-cause"><h4>🎯 Root cause</h4><p>${esc(sc.rootCause)}</p></div>
           <div class="lab-oc lab-oc-fix"><h4>🛠️ Resolution</h4><p>${esc(sc.resolution)}</p></div>
           <div class="lab-oc lab-oc-prev"><h4>🛡️ Prevention</h4><p>${esc(sc.prevention)}</p></div>
         </div>
         <div class="lab-answer"><h4>🎤 Interview-quality answer</h4><p>${esc(sc.interviewAnswer)}</p></div>`;
      if (Progress()) Progress().record(sc.area, sc.id, allCorrect);
      outcome.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    container.appendChild(root);
    renderStep();
  }

  /* ============================================================
     2. DECISION — choose the right feature / strategy
     (shared by Feature Decisions, Query Optimization, Cost Lab)
     ============================================================ */
  function decision(container, sc) {
    container.innerHTML = '';
    const root = el('div', 'lab-run');

    root.appendChild(el('div', 'lab-symptom',
      `<div class="lab-symptom-tag">${sc.tag || '⚖️ Requirement'}</div><p>${esc(sc.scenario)}</p>`));

    // Optional query-profile / evidence panel (optimization lab)
    if (Array.isArray(sc.profile) && sc.profile.length) {
      const prof = el('div', 'lab-profile');
      prof.innerHTML = `<div class="lab-profile-tag">🔎 Query Profile</div>` +
        sc.profile.map(p => `<div class="lab-profile-row"><span>${esc(p.stage)}</span><b>${esc(p.metric)}</b></div>`).join('');
      root.appendChild(prof);
    }

    const q = el('div', 'lab-step-head', esc(sc.question || 'Which option would you choose?'));
    root.appendChild(q);

    const opts = el('div', 'lab-choices');
    const reveal = el('div', 'lab-outcome');
    reveal.hidden = true;
    let answered = false;

    (sc.choices || []).forEach(ch => {
      const b = el('button', 'lab-choice');
      b.type = 'button';
      b.innerHTML = esc(ch.text);
      b.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        opts.querySelectorAll('.lab-choice').forEach((x, i) => {
          const c = sc.choices[i];
          x.disabled = true;
          if (c.correct) x.classList.add('is-correct');
          else if (c === ch) x.classList.add('is-wrong');
        });
        const r = sc.rationale || {};
        reveal.hidden = false;
        reveal.innerHTML =
          `<div class="lab-fit ${ch.correct ? 'ok' : 'no'}"><strong>${ch.correct ? '✓ Correct.' : '✗ Reconsider.'}</strong> ${esc(r.fit)}</div>` +
          (Array.isArray(r.alternatives) && r.alternatives.length
            ? `<div class="lab-alts"><h4>Why not the alternatives</h4>` +
              r.alternatives.map(a => `<p><b>${esc(a.name)}:</b> ${esc(a.why)}</p>`).join('') + `</div>`
            : '') +
          `<div class="lab-impact">` +
          (r.performance ? `<div class="lab-imp"><h4>⚡ Performance</h4><p>${esc(r.performance)}</p></div>` : '') +
          (r.cost ? `<div class="lab-imp"><h4>💰 Cost</h4><p>${esc(r.cost)}</p></div>` : '') +
          (r.tradeoffs ? `<div class="lab-imp"><h4>⚖️ Trade-offs</h4><p>${esc(r.tradeoffs)}</p></div>` : '') +
          `</div>` +
          (r.whenAltApplies ? `<div class="lab-answer"><h4>↪️ When the alternative wins</h4><p>${esc(r.whenAltApplies)}</p></div>` : '') +
          (sc.interviewAnswer ? `<div class="lab-answer"><h4>🎤 Interview-quality answer</h4><p>${esc(sc.interviewAnswer)}</p></div>` : '');
        if (Progress()) Progress().record(sc.area, sc.id, ch.correct);
        reveal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      opts.appendChild(b);
    });

    root.appendChild(opts);
    root.appendChild(reveal);
    container.appendChild(root);
  }

  /* ============================================================
     3. CHAIN — progressive interview follow-ups
     ============================================================ */
  function chain(container, sc) {
    container.innerHTML = '';
    const root = el('div', 'lab-run');
    root.appendChild(el('div', 'lab-symptom',
      `<div class="lab-symptom-tag">🎤 Follow-up chain</div><p>${esc(sc.intro || sc.title)}</p>`));

    const wrap = el('div', 'lab-chain');
    root.appendChild(wrap);
    const steps = sc.steps || [];
    let idx = 0;

    function renderNext() {
      if (idx >= steps.length) {
        if (Progress()) Progress().record(sc.area, sc.id, true);
        const done = el('div', 'lab-chain-done', '✓ Chain complete — you handled every follow-up.');
        wrap.appendChild(done);
        done.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      const step = steps[idx];
      const card = el('div', 'lab-chain-step');
      card.innerHTML = `<div class="lab-chain-q"><span class="lab-chain-n">Q${idx + 1}</span>${esc(step.q)}</div>`;
      const ansBtn = el('button', 'lab-next', 'Reveal strong answer');
      ansBtn.type = 'button';
      ansBtn.addEventListener('click', () => {
        ansBtn.remove();
        card.appendChild(el('div', 'lab-chain-a', esc(step.a)));
        const more = el('button', 'lab-next', idx + 1 >= steps.length ? 'Finish chain →' : 'Next follow-up →');
        more.type = 'button';
        more.addEventListener('click', () => { idx++; renderNext(); });
        card.appendChild(more);
      });
      card.appendChild(ansBtn);
      wrap.appendChild(card);
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    container.appendChild(root);
    renderNext();
  }

  /* ============================================================
     4. TIERED — bad → good → senior  +  30 / 90 / 180-second
     ============================================================ */
  function tiered(container, sc) {
    container.innerHTML = '';
    const root = el('div', 'lab-run');
    root.appendChild(el('div', 'lab-symptom',
      `<div class="lab-symptom-tag">🎤 Interview question</div><p>${esc(sc.question)}</p>`));

    const hasTiers = sc.bad || sc.good || sc.senior;
    const hasTime = sc.sec30 || sc.sec90 || sc.min3;

    // Tab set built from whichever content the item provides.
    const tabs = [];
    if (hasTiers) tabs.push(
      { k: 'bad', label: '👎 Weak', cls: 'tier-bad', body: sc.bad },
      { k: 'good', label: '👍 Good', cls: 'tier-good', body: sc.good },
      { k: 'senior', label: '🌟 Senior', cls: 'tier-senior', body: sc.senior });
    if (hasTime) tabs.push(
      { k: 's30', label: '⏱️ 30 sec', body: sc.sec30 },
      { k: 's90', label: '⏱️ 90 sec', body: sc.sec90 },
      { k: 's180', label: '⏱️ 3 min', body: sc.min3 });

    const bar = el('div', 'lab-tier-tabs');
    const panel = el('div', 'lab-tier-panel');
    tabs.forEach((t, i) => {
      const b = el('button', 'lab-tier-tab' + (t.cls ? ' ' + t.cls : ''));
      b.type = 'button';
      b.textContent = t.label;
      b.addEventListener('click', () => {
        bar.querySelectorAll('.lab-tier-tab').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        panel.className = 'lab-tier-panel' + (t.cls ? ' ' + t.cls : '');
        panel.innerHTML = `<p>${esc(t.body)}</p>`;
      });
      bar.appendChild(b);
      if (i === 0) setTimeout(() => b.click(), 0);
    });
    root.appendChild(bar);
    root.appendChild(panel);

    if (sc.why) root.appendChild(el('div', 'lab-answer',
      `<h4>Why the senior answer is stronger</h4><p>${esc(sc.why)}</p>`));

    if (Progress()) Progress().record(sc.area, sc.id, true);
    container.appendChild(root);
  }

  /* ============================================================
     5. DESIGN — requirements → sequential decisions → architecture
     (System Design, RBAC Design, Data Loading Lab)
     ============================================================ */
  function design(container, sc) {
    container.innerHTML = '';
    const root = el('div', 'lab-run');
    root.appendChild(el('div', 'lab-symptom',
      `<div class="lab-symptom-tag">${sc.tag || '🏗️ Requirements'}</div><p>${esc(sc.requirements)}</p>`));

    const steps = sc.steps || [];
    const stepsWrap = el('div', 'lab-steps');
    root.appendChild(stepsWrap);
    const outcome = el('div', 'lab-outcome');
    outcome.hidden = true;
    root.appendChild(outcome);

    let idx = 0, allCorrect = true;

    function renderStep() {
      if (idx >= steps.length) return finish();
      const step = steps[idx];
      const card = el('div', 'lab-step');
      card.appendChild(el('div', 'lab-step-head',
        `<span class="lab-step-n">Decision ${idx + 1}/${steps.length}</span>${esc(step.prompt)}`));
      const opts = el('div', 'lab-choices');
      let answered = false;
      (step.choices || []).forEach(ch => {
        const b = el('button', 'lab-choice');
        b.type = 'button';
        b.innerHTML = esc(ch.text);
        b.addEventListener('click', () => {
          if (answered) return;
          answered = true;
          if (!ch.correct) allCorrect = false;
          opts.querySelectorAll('.lab-choice').forEach((x, i) => {
            const c = step.choices[i];
            x.disabled = true;
            if (c.correct) x.classList.add('is-correct');
            else if (c === ch) x.classList.add('is-wrong');
          });
          const fb = el('div', 'lab-feedback ' + (ch.correct ? 'ok' : 'no'));
          fb.innerHTML = `<p><strong>${ch.correct ? '✓ Sound choice.' : '✗ Weaker choice.'}</strong> ${esc(ch.why)}</p>` +
            (step.insight ? `<p class="lab-insight"><strong>Design note:</strong> ${esc(step.insight)}</p>` : '');
          card.appendChild(fb);
          const next = el('button', 'lab-next');
          next.type = 'button';
          next.textContent = idx + 1 >= steps.length ? 'See reference design →' : 'Next decision →';
          next.addEventListener('click', () => { idx++; renderStep(); });
          card.appendChild(next);
        });
        opts.appendChild(b);
      });
      card.appendChild(opts);
      stepsWrap.appendChild(card);
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function finish() {
      outcome.hidden = false;
      outcome.innerHTML =
        `<div class="lab-answer" style="border-left-color:var(--snowflake)"><h4>🏗️ Reference architecture</h4><p>${esc(sc.architecture)}</p></div>` +
        `<div class="lab-outcome-grid">` +
        (sc.tradeoffs ? `<div class="lab-oc lab-oc-prev"><h4>⚖️ Trade-offs</h4><p>${esc(sc.tradeoffs)}</p></div>` : '') +
        (sc.failureModes ? `<div class="lab-oc lab-oc-cause"><h4>💥 Failure modes</h4><p>${esc(sc.failureModes)}</p></div>` : '') +
        (sc.cost ? `<div class="lab-oc lab-oc-fix"><h4>💰 Cost considerations</h4><p>${esc(sc.cost)}</p></div>` : '') +
        `</div>` +
        (sc.interviewAnswer ? `<div class="lab-answer"><h4>🎤 Interview-quality answer</h4><p>${esc(sc.interviewAnswer)}</p></div>` : '');
      if (Progress()) Progress().record(sc.area, sc.id, allCorrect);
      outcome.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    container.appendChild(root);
    renderStep();
  }

  /* ============================================================
     6. TRAPS — misconception: judge the claim, then learn the truth
     ============================================================ */
  function traps(container, sc) {
    container.innerHTML = '';
    const root = el('div', 'lab-run');
    root.appendChild(el('div', 'lab-symptom',
      `<div class="lab-symptom-tag">⚠️ Claim under test</div><p>“${esc(sc.myth)}”</p>`));

    const q = el('div', 'lab-step-head', 'Is this accurate, or a trap?');
    root.appendChild(q);
    const opts = el('div', 'lab-choices');
    const reveal = el('div', 'lab-outcome');
    reveal.hidden = true;
    let answered = false;

    [{ text: '✓ Accurate', correct: false }, { text: '✗ Myth / oversimplified', correct: true }].forEach(ch => {
      const b = el('button', 'lab-choice');
      b.type = 'button';
      b.innerHTML = ch.text;
      b.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        opts.querySelectorAll('.lab-choice').forEach(x => { x.disabled = true; });
        opts.querySelectorAll('.lab-choice')[1].classList.add('is-correct');
        if (!ch.correct) b.classList.add('is-wrong');
        reveal.hidden = false;
        reveal.innerHTML =
          `<div class="lab-fit ${ch.correct ? 'ok' : 'no'}"><strong>${ch.correct ? '✓ Right — it\'s a trap.' : '✗ It\'s a trap.'}</strong> This is a common misconception.</div>` +
          `<div class="lab-oc lab-oc-cause"><h4>🧠 Why people get it wrong</h4><p>${esc(sc.whyWrong)}</p></div>` +
          `<div class="lab-oc lab-oc-fix"><h4>✅ The correct picture</h4><p>${esc(sc.correct)}</p></div>` +
          `<div class="lab-answer"><h4>🎤 Interview-safe wording</h4><p>${esc(sc.interviewSafe)}</p></div>`;
        if (Progress()) Progress().record(sc.area, sc.id, ch.correct);
        reveal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      opts.appendChild(b);
    });
    root.appendChild(opts);
    root.appendChild(reveal);
    container.appendChild(root);
  }

  /* ============================================================
     7. SQL — progressive Snowflake SQL reasoning with reveals
     ============================================================ */
  function sql(container, sc) {
    container.innerHTML = '';
    const root = el('div', 'lab-run');
    root.appendChild(el('div', 'lab-symptom',
      `<div class="lab-symptom-tag">🧮 SQL scenario</div><p>${esc(sc.scenario)}</p>`));
    const wrap = el('div', 'lab-chain');
    root.appendChild(wrap);
    const steps = sc.steps || [];
    let idx = 0;

    function renderNext() {
      if (idx >= steps.length) {
        if (Progress()) Progress().record(sc.area, sc.id, true);
        const done = el('div', 'lab-chain-done', '✓ Scenario complete.');
        wrap.appendChild(done);
        done.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      const step = steps[idx];
      const card = el('div', 'lab-chain-step');
      card.innerHTML = `<div class="lab-chain-q"><span class="lab-chain-n">Q${idx + 1}</span>${esc(step.q)}</div>`;
      const btn = el('button', 'lab-next', 'Reveal solution');
      btn.type = 'button';
      btn.addEventListener('click', () => {
        btn.remove();
        if (step.sql) {
          const pre = el('pre', 'lab-code');
          pre.appendChild(el('code', null, esc(step.sql)));
          card.appendChild(pre);
        }
        if (step.a) card.appendChild(el('div', 'lab-chain-a', esc(step.a)));
        const more = el('button', 'lab-next', idx + 1 >= steps.length ? 'Finish →' : 'Next →');
        more.type = 'button';
        more.addEventListener('click', () => { idx++; renderNext(); });
        card.appendChild(more);
      });
      card.appendChild(btn);
      wrap.appendChild(card);
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    container.appendChild(root);
    renderNext();
  }

  /* ============================================================
     LabView — shared list/detail shell for a lab module.
     opts = { area, eyebrow, title, intro, renderer, categoryKey?,
              itemLabel? }
     ============================================================ */
  const RENDERERS = { investigation, decision, chain, tiered, design, traps, sql };

  function labView(canvas, opts) {
    canvas.innerHTML = '';
    const page = el('div', 'mod-page');
    const bank = (viz.ScenarioBank[opts.area] || []).slice();
    const renderer = typeof opts.renderer === 'function' ? opts.renderer : RENDERERS[opts.renderer];

    page.appendChild(el('div', 'mod-header',
      `<div class="mod-eyebrow">${esc(opts.eyebrow || 'Interview Simulator')}</div>
       <h1 class="mod-title">${esc(opts.title)}</h1>
       <p class="mod-subtitle">${esc(opts.intro)}</p>`));

    // progress + filter bar
    const bar = el('div', 'lab-bar');
    const stat = el('span', 'lab-stat');
    const diffSel = el('select', 'prep-select');
    diffSel.innerHTML = `<option value="">All difficulties</option>
      <option value="beginner">Beginner</option>
      <option value="intermediate">Intermediate</option>
      <option value="advanced">Advanced</option>`;
    const catSel = el('select', 'prep-select');
    const cats = [...new Set(bank.map(s => s.category).filter(Boolean))];
    catSel.innerHTML = `<option value="">All categories</option>` +
      cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    if (!cats.length) catSel.style.display = 'none';
    bar.append(stat, diffSel, catSel);
    page.appendChild(bar);

    const listWrap = el('div', 'lab-list');
    const detailWrap = el('div', 'lab-detail');
    detailWrap.hidden = true;
    page.append(listWrap, detailWrap);

    function refreshStat() {
      if (!viz.ProgressStore) { stat.textContent = `${bank.length} scenarios`; return; }
      const s = viz.ProgressStore.summary(opts.area, bank.length);
      stat.innerHTML = `<b>${s.attempted}</b> / ${bank.length} attempted` +
        (s.attempted ? ` · <b>${s.correct}</b> nailed` : '');
    }

    function renderList() {
      listWrap.innerHTML = '';
      const d = diffSel.value, c = catSel.value;
      const items = bank.filter(s => (!d || s.difficulty === d) && (!c || s.category === c));
      if (!items.length) { listWrap.innerHTML = `<div class="cmdk-empty">No scenarios match.</div>`; return; }
      items.forEach(s => {
        const done = viz.ProgressStore && viz.ProgressStore.isDone(opts.area, s.id);
        const card = el('button', 'lab-card' + (done ? ' done' : ''));
        card.type = 'button';
        card.innerHTML =
          `<div class="lab-card-top">${s.category ? `<span class="lab-cat">${esc(s.category)}</span>` : ''}${diffBadge(s.difficulty)}${done ? '<span class="lab-check">✓</span>' : ''}</div>
           <div class="lab-card-title">${esc(s.title)}</div>`;
        card.addEventListener('click', () => openScenario(s));
        listWrap.appendChild(card);
      });
    }

    function openScenario(s) {
      listWrap.hidden = true;
      bar.hidden = true;
      detailWrap.hidden = false;
      detailWrap.innerHTML = '';
      const back = el('button', 'lab-back', '← All scenarios');
      back.type = 'button';
      back.addEventListener('click', () => {
        detailWrap.hidden = true;
        listWrap.hidden = false;
        bar.hidden = false;
        refreshStat(); renderList();
        page.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      detailWrap.appendChild(back);
      detailWrap.appendChild(el('h2', 'lab-detail-title', esc(s.title)));
      const body = el('div');
      detailWrap.appendChild(body);
      renderer(body, s);
    }

    diffSel.addEventListener('change', renderList);
    catSel.addEventListener('change', renderList);
    document.addEventListener('sviz:progress', refreshStat);

    refreshStat();
    renderList();
    canvas.appendChild(page);
    return {
      destroy() { document.removeEventListener('sviz:progress', refreshStat); },
    };
  }

  viz.ScenarioEngine = { register, investigation, decision, chain, tiered, design, traps, sql, labView };
})();
