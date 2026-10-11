/* ============================================================
   Global search / command palette (Phase 2) — Ctrl/Cmd+K.

   ADDITIVE: builds a fast LOCAL index from the data banks already on
   window.TableViz (no backend), renders an accessible overlay, and
   navigates by setting location.hash to a VALID existing route. Opens
   on Ctrl/Cmd+K or "/" (when not typing in a field). Keyboard: ↑/↓ to
   move, Enter to open, Esc to close. Keeps recent searches locally.

   Nothing here modifies existing modules; it only reads their data and
   drives the existing hash router.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});
  const d = document;
  const esc = (TV.DS && TV.DS.esc) || (s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const RECENT_KEY = 'cde-cmdk-recent';
  const lsGet = (TV.ls && TV.ls.get) || (k => { try { return localStorage.getItem(k); } catch (e) { return null; } });
  const lsSet = (TV.ls && TV.ls.set) || ((k, v) => { try { localStorage.setItem(k, v); } catch (e) {} });

  const CLOUDS = { aws: 'AWS', azure: 'Azure', databricks: 'Databricks', fabric: 'Fabric' };
  const vendorFmt = v => ({ aws: 'aws', 'amazon web services': 'aws', microsoft: 'azure', azure: 'azure', databricks: 'databricks', fabric: 'fabric' }[String(v || '').toLowerCase()] || 'azure');

  /* ── Build the index once (lazily, after data is loaded) ── */
  let INDEX = null;
  function buildIndex() {
    const out = [];
    const add = (title, category, cloud, route, desc, kw) =>
      out.push({ title, category, cloud: cloud || '', route, desc: desc || '', kw: (title + ' ' + (desc || '') + ' ' + (kw || '')).toLowerCase() });

    const svcBanks = [['aws', TV.AwsServices], ['azure', TV.AzureServices], ['databricks', TV.DatabricksServices], ['fabric', TV.FabricServices]];
    svcBanks.forEach(([cl, bank]) => (bank || []).forEach(s =>
      add(s.name || s.id, 'Service', CLOUDS[cl], `${cl}/${s.id}`, s.tagline || (s.what && s.what.lead) || '', (s.aka || '') + ' ' + (s.category || ''))));

    const iqBanks = [['aws', TV.AwsInterviewQA], ['azure', TV.AzureInterviewQA], ['databricks', TV.DatabricksInterviewQA], ['fabric', TV.FabricInterviewQA]];
    iqBanks.forEach(([cl, bank]) => {
      const topics = Array.isArray(bank) ? bank : [];
      topics.forEach(t => t && t.id && add(t.label || t.id, 'Interview Q&A', CLOUDS[cl], `${cl}/iq-${t.id}`, 'Topic-wise interview questions', ''));
    });

    if (TV.DesignChallenges && TV.DesignChallenges.all) TV.DesignChallenges.all().forEach(c =>
      add(c.title || c.id, 'Design Challenge', 'Cross-cloud', `multi-cloud/dc-${c.id}`, c.requirement || c.prompt || 'Architecture design challenge', ''));

    if (TV.ProjectTracks && TV.ProjectTracks.ids) TV.ProjectTracks.ids().forEach(id => {
      const t = TV.ProjectTracks.byId(id); if (!t) return;
      add(t.title || id, 'Project Track', CLOUDS[t.cloud] || '', `${t.cloud || 'azure'}/pt-${id}`, t.summary || t.goal || 'End-to-end project track', '');
    });

    if (TV.Incidents && TV.Incidents.list) TV.Incidents.list().forEach(i =>
      add(i.title || i.id, 'Incident', CLOUDS[i.cloud] || '', `${i.cloud || 'azure'}/incidents`, i.context || 'Production incident scenario', i.service || ''));

    if (TV.CertLabs && TV.CertLabs.list) TV.CertLabs.list.forEach(l =>
      add(l.title || l.id, 'Hands-on Lab', '', `${(l.certIds && /aws/.test(l.certIds[0]) && 'aws') || (l.certIds && /dbx/.test(l.certIds[0]) && 'databricks') || (l.certIds && /dp700/.test(l.certIds[0]) && 'fabric') || 'azure'}/certifications`, 'Guided hands-on lab', (l.topicId || '')));

    if (TV.Certifications && TV.Certifications.tracks) TV.Certifications.tracks.forEach(c =>
      add(c.name || c.certificationId, 'Certification', c.vendor || '', `${vendorFmt(c.vendor)}/certifications`, c.examCode ? ('Exam ' + c.examCode) : 'Certification track', c.certificationId));

    (Array.isArray(TV.LearningPaths) ? TV.LearningPaths : []).forEach(p =>
      add(p.title || p.id, 'Learning Path', CLOUDS[p.cloud] || '', `${p.cloud || 'azure'}/paths`, p.summary || p.goal || 'Structured learning path', ''));

    // Top-level destinations (work under any cloud format).
    const here = () => TV.activeFormat || 'azure';
    add('Home', 'Go to', '', `${here()}/home`, 'Dashboard / overview', 'dashboard');
    add('Recommendations', 'Go to', '', `${here()}/recommend`, 'Personalized next actions', 'for you');
    add('Mastery', 'Go to', '', `${here()}/mastery`, 'Skill progress & spaced repetition', 'skills analytics');
    add('Certification Center', 'Go to', '', `${here()}/certifications`, 'Exams, objectives, readiness', 'cert exam');
    add('Incident Simulator', 'Go to', '', `${here()}/incidents`, 'Production troubleshooting practice', 'operate');
    add('Learning Paths', 'Go to', '', `${here()}/paths`, 'Guided journeys', '');
    add('Project Tracks', 'Go to', '', `${here()}/project-tracks`, 'End-to-end builds', 'build');
    add('Cross-cloud comparison', 'Go to', 'Cross-cloud', `multi-cloud/home`, 'Equivalence matrix', 'compare');
    add('Design Challenges', 'Go to', 'Cross-cloud', `multi-cloud/design-challenges`, 'System-design drills', 'architecture');
    add('Visualizers', 'Go to', '', `${here()}/visualizers`, 'Interactive conceptual visualizers', 'interactive diagram animation');
    add('Architecture Studio', 'Go to', '', `${here()}/architecture-studio`, 'Free-form design canvas', 'design canvas diagram draw');

    // Each registered visualizer, deep-linked to the Visualizers screen.
    if (TV.Viz && TV.Viz.list) TV.Viz.list().forEach(v =>
      add(v.title || v.id, 'Visualizer', CLOUDS[v.vendor] || (v.vendor === 'multi' ? 'Cross-cloud' : ''), `${here()}/visualizers`, v.subtitle || 'Interactive conceptual visualizer', (v.tags || []).join(' ') + ' visualizer'));

    INDEX = out;
    return out;
  }

  /* ── Ranking: prefix/word-start beats substring ── */
  function search(q) {
    if (!INDEX) buildIndex();
    q = q.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/);
    const scored = [];
    for (const it of INDEX) {
      let score = 0, ok = true;
      for (const t of terms) {
        const i = it.kw.indexOf(t);
        if (i === -1) { ok = false; break; }
        const title = it.title.toLowerCase();
        if (title === t) score += 100;
        else if (title.startsWith(t)) score += 60;
        else if (new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(title)) score += 40;
        else if (title.indexOf(t) !== -1) score += 20;
        else score += 6; // matched only in desc/keywords
      }
      if (ok) { score -= Math.min(it.title.length, 40) * 0.1; scored.push([score, it]); }
    }
    scored.sort((a, b) => b[0] - a[0]);
    return scored.slice(0, 40).map(s => s[1]);
  }

  function getRecent() { try { return JSON.parse(lsGet(RECENT_KEY) || '[]'); } catch (e) { return []; } }
  function pushRecent(q) {
    if (!q) return;
    let r = getRecent().filter(x => x !== q); r.unshift(q); r = r.slice(0, 6);
    lsSet(RECENT_KEY, JSON.stringify(r));
  }

  /* ── Overlay UI ── */
  let overlay = null, input = null, listEl = null, active = -1, rows = [];
  function close() { if (overlay) { overlay.remove(); overlay = null; input = null; rows = []; active = -1; } }

  function render(items, isRecent) {
    rows = items; active = items.length ? 0 : -1;
    if (!items.length) {
      listEl.innerHTML = `<div class="ds-empty" style="padding:28px"><h3>No matches</h3><p>Try a service, concept, cert, lab or incident name.</p></div>`;
      return;
    }
    listEl.innerHTML = items.map((it, i) => `
      <button class="cmdk-row${i === 0 ? ' is-active' : ''}" role="option" data-i="${i}" aria-selected="${i === 0}">
        <span class="cmdk-row-main">
          <span class="cmdk-row-title">${esc(it.title)}</span>
          <span class="cmdk-row-desc">${esc(it.desc)}</span>
        </span>
        <span class="cmdk-row-meta">
          ${it.cloud ? `<span class="ds-badge ds-badge--neutral">${esc(it.cloud)}</span>` : ''}
          <span class="cmdk-row-cat">${esc(isRecent ? 'Recent' : it.category)}</span>
        </span>
      </button>`).join('');
    [...listEl.querySelectorAll('.cmdk-row')].forEach(r => {
      r.addEventListener('mousemove', () => setActive(+r.dataset.i));
      r.addEventListener('click', () => go(+r.dataset.i));
    });
  }

  function setActive(i) {
    const els = listEl.querySelectorAll('.cmdk-row');
    if (!els.length) return;
    active = (i + els.length) % els.length;
    els.forEach((el, n) => { const on = n === active; el.classList.toggle('is-active', on); el.setAttribute('aria-selected', on); });
    els[active].scrollIntoView({ block: 'nearest' });
  }

  function go(i) {
    const it = rows[i]; if (!it) return;
    pushRecent(input.value.trim());
    close();
    location.hash = it.route;
  }

  function renderRecent() {
    const r = getRecent();
    if (!r.length) {
      const items = search('').length ? [] : [];
      listEl.innerHTML = `<div class="ds-empty" style="padding:24px"><h3>Search everything</h3><p>Services, concepts, interview Q&A, certifications, labs, incidents, projects, design challenges.</p></div>`;
      rows = []; active = -1; return;
    }
    listEl.innerHTML = `<div class="cmdk-recent-h">Recent searches</div>` + r.map(q =>
      `<button class="cmdk-row cmdk-recent" data-q="${esc(q)}"><span class="cmdk-row-title">${esc(q)}</span></button>`).join('');
    [...listEl.querySelectorAll('.cmdk-recent')].forEach(b => b.addEventListener('click', () => { input.value = b.dataset.q; onInput(); input.focus(); }));
    rows = []; active = -1;
  }

  function onInput() {
    const q = input.value;
    if (!q.trim()) { renderRecent(); return; }
    render(search(q), false);
  }

  function open(prefill) {
    if (overlay) return;
    overlay = d.createElement('div');
    overlay.className = 'ds-overlay cmdk-overlay';
    overlay.innerHTML = `
      <div class="cmdk" role="dialog" aria-modal="true" aria-label="Search">
        <div class="ds-search cmdk-search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
          <input class="ds-input" type="text" placeholder="Search services, concepts, certs, labs, incidents…" aria-label="Search" autocomplete="off" spellcheck="false" />
          <kbd class="cmdk-esc">Esc</kbd>
        </div>
        <div class="cmdk-list" role="listbox" aria-label="Results"></div>
        <div class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>
      </div>`;
    d.body.appendChild(overlay);
    input = overlay.querySelector('.ds-input');
    listEl = overlay.querySelector('.cmdk-list');
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); if (active >= 0) go(active); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    if (prefill) input.value = prefill;
    onInput();
    input.focus();
  }

  /* ── Global shortcuts ── */
  function isTyping(el) { return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable); }
  d.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); overlay ? close() : open(); return; }
    if (e.key === '/' && !overlay && !isTyping(d.activeElement)) { e.preventDefault(); open(); }
  });

  TV.CommandPalette = { open, close, search, buildIndex, _index: () => INDEX || buildIndex() };
})();
