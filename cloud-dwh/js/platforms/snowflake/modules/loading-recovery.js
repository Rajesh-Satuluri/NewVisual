/* ============================================================
   Failure, Recovery & Reconciliation Lab (P0-D).
   An on-call incident simulator (diagnose → choose root cause →
   choose a safe recovery → reconcile → verify, scored) plus a
   reconciliation panel, over 18 production ingestion failure cases.
   Complements (does not replace) the existing investigation labs.
   Deterministic simulation; nothing runs live.
   ============================================================ */
(function () {
  'use strict';
  const CASES = () => window.CDWH.P.snowflake.failureCases;
  const Progress = () => window.CDWH.ProgressStore;

  const WORKFLOW = [
    'Observe the symptom & business impact',
    'Inspect pipeline status',
    'Query load / change history',
    'Inspect files & source records',
    'Determine the failing stage',
    'Identify the root cause',
    'Choose a remediation',
    'Execute recovery (simulated)',
    'Reconcile source vs target',
    'Verify the final state',
  ];

  const Module = {
    render(canvas) {
      canvas.innerHTML = '';
      const fc = CASES();
      const page = _el('div', 'mod-page');
      page.innerHTML = `
        <div class="mod-header">
          <div class="mod-eyebrow">🚨 Troubleshoot</div>
          <h1 class="mod-title">Failure, Recovery &amp; Reconciliation</h1>
          <p class="mod-subtitle">Act as the on-call data engineer: diagnose an ingestion incident, pick the real root cause and a <em>safe</em> recovery, then reconcile source vs target. ${fc ? fc.cases.length : 0} production cases. Deterministic simulation — no live execution.</p>
        </div>`;
      canvas.appendChild(page);
      if (!fc) { page.appendChild(_el('div', 'in-empty')).textContent = 'Failure cases not loaded.'; return {}; }

      const tabs = ['Incident simulator', 'Reconciliation', 'Diagnostic workflow'];
      const bar = _el('div', 'wk-tabs'); const body = _el('div', 'wk-body');
      tabs.forEach((t, i) => { const b = _el('button', 'wk-tab' + (i === 0 ? ' active' : '')); b.type = 'button'; b.textContent = t; b.addEventListener('click', () => { bar.querySelectorAll('.wk-tab').forEach(x => x.classList.remove('active')); b.classList.add('active'); render(i); }); bar.appendChild(b); });
      page.append(bar, body);

      const score = { solved: 0, attempted: 0, done: {} };

      function render(i) { body.innerHTML = ''; if (i === 0) renderSim(); else if (i === 1) renderRecon(); else renderWorkflow(); }

      /* ---------- Tab 1: incident simulator ---------- */
      function renderSim() {
        const scoreBar = _el('div', 'rc-scorebar');
        scoreBar.id = 'rc-score';
        body.appendChild(scoreBar);
        updateScore();

        const list = _el('div', 'rc-list');
        fc.cases.forEach(c => {
          const card = _el('button', 'rc-card' + (score.done[c.id] ? ' solved' : ''));
          card.type = 'button';
          card.innerHTML = `<div class="rc-card-top"><span class="rc-cat">${c.cat}</span><span class="rc-sev rc-sev-${c.sev}">${c.sev}</span>${score.done[c.id] ? '<span class="lab-check">✓</span>' : ''}</div><div class="rc-card-title">${c.title}</div>`;
          card.addEventListener('click', () => openCase(c));
          list.appendChild(card);
        });
        body.appendChild(list);
      }

      function updateScore() {
        const el = document.getElementById('rc-score');
        if (el) el.innerHTML = `<span class="rc-score-val">${score.solved}</span> / ${fc.cases.length} incidents resolved safely <span class="rc-score-sub">(correct root cause + safe recovery)</span>`;
      }

      function openCase(c) {
        body.innerHTML = '';
        const back = _el('button', 'lab-back', '← All incidents'); back.type = 'button';
        back.addEventListener('click', () => renderSim());
        body.appendChild(back);

        const head = _el('div', 'rc-incident-head');
        head.innerHTML = `<div class="rc-card-top"><span class="rc-cat">${c.cat}</span><span class="rc-sev rc-sev-${c.sev}">${c.sev}</span></div>
          <h2 class="rc-incident-title">${c.title}</h2>
          <div class="rc-impact"><strong>Business impact:</strong> ${c.impact}</div>
          <div class="rc-symptom"><strong>🔥 Symptom:</strong> ${c.symptom}</div>
          <div class="rc-status"><strong>Pipeline status:</strong> ${c.status}</div>`;
        body.appendChild(head);

        const meta = _el('div', 'rc-meta');
        meta.innerHTML = c.meta.map(m => `<div class="rc-meta-item"><span>${m[0]}</span><b>${m[1]}</b></div>`).join('');
        body.appendChild(meta);

        body.appendChild(_subhead('Diagnostics — reveal what each establishes'));
        const diag = _el('div', 'rc-diag');
        c.diagnostics.forEach(d => {
          const row = _el('div', 'rc-diag-row');
          row.innerHTML = `<code>${_esc(d.q)}</code><button type="button" class="rc-reveal">what it tells you</button><span class="rc-diag-a" hidden>${d.a}</span>`;
          row.querySelector('.rc-reveal').addEventListener('click', e => { row.querySelector('.rc-diag-a').hidden = false; e.target.remove(); });
          diag.appendChild(row);
        });
        body.appendChild(diag);

        const st = { cause: null, fix: null };
        body.appendChild(_subhead('Step 1 — Identify the root cause'));
        const causeWrap = _el('div', 'lab-choices');
        c.causes.forEach(ch => {
          const b = _el('button', 'lab-choice'); b.type = 'button'; b.innerHTML = _esc(ch.t);
          b.addEventListener('click', () => {
            if (st.cause) return; st.cause = ch;
            causeWrap.querySelectorAll('.lab-choice').forEach((x, k) => { x.disabled = true; if (c.causes[k].ok) x.classList.add('is-correct'); else if (c.causes[k] === ch) x.classList.add('is-wrong'); });
            const fb = _el('div', 'lab-feedback ' + (ch.ok ? 'ok' : 'no'));
            fb.innerHTML = `<p><strong>${ch.ok ? '✓ Correct root cause.' : '✗ Not the root cause.'}</strong> ${ch.ok ? '' : 'The real cause: ' + _esc(c.causes.find(x => x.ok).t)}</p>`;
            causeWrap.after(fb); showRecovery();
          });
          causeWrap.appendChild(b);
        });
        body.appendChild(causeWrap);

        function showRecovery() {
          body.appendChild(_subhead('Step 2 — Choose a safe recovery'));
          const fixWrap = _el('div', 'lab-choices');
          c.fixes.forEach(ch => {
            const b = _el('button', 'lab-choice'); b.type = 'button'; b.innerHTML = _esc(ch.t);
            b.addEventListener('click', () => {
              if (st.fix) return; st.fix = ch;
              fixWrap.querySelectorAll('.lab-choice').forEach((k2, k) => { k2.disabled = true; if (c.fixes[k].ok) k2.classList.add('is-correct'); else if (c.fixes[k] === ch) k2.classList.add('is-wrong'); });
              const fb = _el('div', 'lab-feedback ' + (ch.ok ? 'ok' : 'no'));
              fb.innerHTML = `<p><strong>${ch.ok ? '✓ Safe recovery.' : '✗ Risky / wrong.'}</strong> ${_esc(ch.risk)}</p>` + (ch.ok ? '' : `<p>Safer: ${_esc(c.fixes.find(x => x.ok).t)}</p>`);
              fixWrap.after(fb);
              finishCase(c, st);
            });
            fixWrap.appendChild(b);
          });
          body.appendChild(fixWrap);
        }
      }

      function finishCase(c, st) {
        const solvedNow = st.cause && st.cause.ok && st.fix && st.fix.ok;
        if (!score.done.hasOwnProperty(c.id)) { score.attempted++; }
        if (solvedNow && !score.done[c.id]) { score.solved++; }
        score.done[c.id] = solvedNow;
        if (Progress()) Progress().record('loading-recovery', c.id, solvedNow);

        body.appendChild(_subhead('Reconcile source vs target'));
        body.appendChild(reconPanel(c));
        const lesson = _el('div', 'rc-lesson');
        lesson.innerHTML = `<div class="rc-lesson-tag">🎯 Key lesson</div><p>${c.lesson}</p>`;
        body.appendChild(lesson);
        const verdict = _el('div', 'wk-summary ' + (solvedNow ? 'wk-success' : 'wk-partial'));
        verdict.innerHTML = `<div class="wk-sum-line"><strong>${solvedNow ? '✓ Incident resolved safely.' : '△ Resolved, but review the root cause / recovery above.'}</strong></div>`;
        body.appendChild(verdict);
        const back = _el('button', 'lab-back', '← Back to incidents'); back.type = 'button';
        back.style.marginTop = '.8rem';
        back.addEventListener('click', () => renderSim());
        body.appendChild(back);
      }

      /* ---------- Tab 2: reconciliation ---------- */
      function renderRecon() {
        body.appendChild(_callout('📊 Reconciliation', 'Counts legitimately change along a pipeline — filtering, rejects, updates, deletes and dedup all move the number. Equal source/target counts can even be the bug. Pick a case to see its funnel.'));
        const sel = _el('select', 'prep-select');
        sel.innerHTML = fc.cases.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
        body.appendChild(sel);
        const out = _el('div'); out.id = 'rc-recon-out'; body.appendChild(out);
        function show() { out.innerHTML = ''; out.appendChild(reconPanel(fc.byId(sel.value))); }
        sel.addEventListener('change', show); show();
      }

      function reconPanel(c) {
        const r = c.recon;
        const rows = [
          ['Expected (source)', r.expected], ['Discovered', r.discovered], ['Parsed', r.parsed],
          ['Loaded', r.loaded], ['Rejected', r.rejected], ['Duplicates', r.duplicates],
          ['Net change', r.net], ['Final target', r.finalTarget],
        ];
        const max = Math.max(1, r.expected, r.discovered, r.parsed, r.loaded, r.finalTarget, r.net);
        const wrap = _el('div', 'rc-recon');
        wrap.innerHTML = rows.map(([k, v]) => {
          const pct = Math.max(2, Math.round((Math.abs(v) / max) * 100));
          const warn = (k === 'Rejected' || k === 'Duplicates') && v > 0;
          return `<div class="rc-funnel-row"><span class="rc-funnel-k">${k}</span><span class="rc-funnel-bar"><span class="rc-funnel-fill${warn ? ' warn' : ''}" style="width:${pct}%"></span></span><b class="rc-funnel-v">${Number(v).toLocaleString('en-US')}</b></div>`;
        }).join('') + `<div class="rc-recon-note">${c.recon.note}</div>`;
        return wrap;
      }

      /* ---------- Tab 3: workflow scaffold ---------- */
      function renderWorkflow() {
        body.appendChild(_callout('🧭 The diagnostic workflow', 'Every incident in the simulator follows this structure. Run it the same way each time so you never jump to a fix before the evidence.'));
        const ol = _el('ol', 'rc-workflow');
        WORKFLOW.forEach(s => { const li = document.createElement('li'); li.textContent = s; ol.appendChild(li); });
        body.appendChild(ol);
        body.appendChild(_callout('🛟 Recovery principles', 'Match the diagnostic to the mechanism (SYSTEM$PIPE_STATUS for pipes, TASK_HISTORY for tasks, COPY_HISTORY for COPY, consumer lag for Kafka). A retry must never silently duplicate business records. Do not reach for FORCE=TRUE, TRUNCATE, or resetting offsets as generic fixes — each is a specific, risky action.'));
        body.appendChild(_callout('🔗 Also see', 'The investigation labs "Snowflake + Data Engineering" and "Troubleshooting Lab" cover complementary cross-tool incidents (Airflow, dbt, Databricks, BI) in a step-by-step diagnosis format.'));
      }

      render(0);
      return {};
    },
  };

  function _subhead(t) { const e = _el('div', 'rc-subhead'); e.textContent = t; return e; }
  function _callout(tag, html) { const d = _el('div', 'wk-callout'); d.innerHTML = `<div class="wk-callout-tag">${tag}</div><p>${html}</p>`; return d; }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function _el(tag, cls, txt) { const el = document.createElement(tag); if (cls) el.className = cls; if (txt != null) el.textContent = txt; return el; }

  window.CDWH = window.CDWH || {};
  window.CDWH.Modules = window.CDWH.Modules || {};
  window.CDWH.P.snowflake.Modules.loadingRecovery = Module;
})();
