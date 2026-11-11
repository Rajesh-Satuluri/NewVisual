/* ============================================================
   Loading Flashcards — active-recall study with spaced repetition.

   Flip a card, rate your recall (Missed / Almost / Got it), and the
   Leitner SRS store (window.CDWH.SRS) schedules when you next see it.
   "Study due" reviews only what the scheduler says is due; "Study all"
   runs the whole deck. Missed/almost cards loop back within the
   session (capped) so you actually re-see them. Nothing runs live.
   ============================================================ */
(function () {
  'use strict';

  const DECK_ID = 'loading';            // SRS deck key
  const MAX_SESSION_SEES = 3;           // stop looping a stubborn card after N sees

  const SRS = () => window.CDWH.SRS;
  const data = () => window.CDWH.P.snowflake.loadingFlashcards || [];

  const Module = {
    render(canvas) {
      canvas.innerHTML = '';
      const deck = data();
      const page = _el('div', 'mod-page');

      const header = _el('div', 'mod-header');
      header.innerHTML =
        '<div class="mod-eyebrow">Active Recall</div>' +
        '<h1 class="mod-title">Loading Flashcards</h1>' +
        '<p class="mod-subtitle">Test recall, not recognition. Flip each card, rate yourself honestly, and spaced repetition brings the ones you miss back sooner. Your progress is saved on this device.</p>';
      page.appendChild(header);

      if (!deck.length || !SRS()) {
        const ph = _el('div', 'placeholder-msg');
        ph.innerHTML = '<p>Flashcard deck not loaded.</p>';
        page.appendChild(ph); canvas.appendChild(page); return {};
      }

      const allIds = deck.map(c => c.id);
      const byId = {}; deck.forEach(c => { byId[c.id] = c; });

      /* Stats strip */
      const stats = _el('div', 'fc-stats'); stats.id = 'fc-stats';
      page.appendChild(stats);

      /* Controls */
      const controls = _el('div', 'fc-controls');
      const btnDue = _btn('fc-mode', 'Study due');
      const btnAll = _btn('fc-mode', 'Study all');
      const btnReset = _btn('btn btn-ghost fc-reset', '↺ Reset progress');
      controls.append(btnDue, btnAll, btnReset);
      page.appendChild(controls);

      /* Stage (card + session) */
      const stage = _el('div', 'fc-stage'); stage.id = 'fc-stage';
      page.appendChild(stage);

      canvas.appendChild(page);

      /* ---- session state ---- */
      let session = null; // { queue:[ids], sees:{id:n}, done:n, planned:n }

      function paintStats() {
        const s = SRS().stats(DECK_ID, allIds);
        const next = s.nextDue ? _relTime(s.nextDue) : '—';
        stats.innerHTML = [
          ['Total', s.total], ['Learned', s.learned], ['Due now', s.due], ['Next due', next],
        ].map(([l, v]) =>
          '<div class="fc-stat"><div class="fc-stat-val">' + v + '</div><div class="fc-stat-lbl">' + l + '</div></div>'
        ).join('');
        btnDue.textContent = 'Study due (' + s.due + ')';
      }

      function startSession(mode) {
        let ids = mode === 'due' ? SRS().due(DECK_ID, allIds) : allIds.slice();
        if (mode === 'all') ids = _shuffle(ids);
        else ids = _shuffle(ids); // due set is small; shuffle for variety
        if (!ids.length) { renderCaughtUp(); return; }
        session = { queue: ids, sees: {}, done: 0, planned: ids.length };
        controls.querySelectorAll('.fc-mode').forEach(b => b.classList.toggle('active',
          (mode === 'due' && b === btnDue) || (mode === 'all' && b === btnAll)));
        nextCard();
      }

      function nextCard() {
        if (!session || !session.queue.length) { renderComplete(); return; }
        const id = session.queue.shift();
        const card = byId[id];
        session.sees[id] = (session.sees[id] || 0) + 1;
        renderCard(card);
      }

      function rate(id, grade) {
        SRS().rate(DECK_ID, id, grade);
        // Re-see missed/almost cards within the session, up to a cap.
        if (grade !== 'got' && session.sees[id] < MAX_SESSION_SEES) {
          session.queue.push(id);
        } else {
          session.done += 1;
        }
        paintStats();
        nextCard();
      }

      /* ---- renderers ---- */
      function renderCard(card) {
        const remaining = session.queue.length + 1;
        stage.innerHTML =
          '<div class="fc-progress"><span>' + _esc(card.tag) + '</span>' +
          '<span>' + remaining + ' left this round</span></div>' +
          '<div class="fc-card" id="fc-card" tabindex="0" role="button" aria-label="Flashcard — activate to flip">' +
            '<div class="fc-card-inner">' +
              '<div class="fc-face fc-front"><div class="fc-hint">Question</div><div class="fc-text">' + _esc(card.front) + '</div><div class="fc-flip-hint">click / tap / Space to flip</div></div>' +
              '<div class="fc-face fc-back"><div class="fc-hint">Answer</div><div class="fc-text">' + _esc(card.back) + '</div></div>' +
            '</div>' +
          '</div>' +
          '<div class="fc-rate" id="fc-rate" hidden>' +
            '<div class="fc-rate-label">How did you do?</div>' +
            '<div class="fc-rate-btns">' +
              '<button class="fc-rate-btn missed" data-g="missed">Missed</button>' +
              '<button class="fc-rate-btn almost" data-g="almost">Almost</button>' +
              '<button class="fc-rate-btn got" data-g="got">Got it</button>' +
            '</div>' +
          '</div>';

        const cardEl = stage.querySelector('#fc-card');
        const rateEl = stage.querySelector('#fc-rate');
        let flipped = false;
        const flip = () => {
          if (flipped) return;
          flipped = true;
          cardEl.classList.add('flipped');
          rateEl.hidden = false;
        };
        cardEl.addEventListener('click', flip);
        cardEl.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
        });
        rateEl.querySelectorAll('.fc-rate-btn').forEach(b => {
          b.addEventListener('click', () => rate(card.id, b.dataset.g));
        });
        // Keyboard rating once flipped: 1/2/3
        cardEl.addEventListener('keydown', (e) => {
          if (!flipped) return;
          if (e.key === '1') rate(card.id, 'missed');
          else if (e.key === '2') rate(card.id, 'almost');
          else if (e.key === '3') rate(card.id, 'got');
        });
        cardEl.focus();
      }

      function renderComplete() {
        session = null;
        controls.querySelectorAll('.fc-mode').forEach(b => b.classList.remove('active'));
        const s = SRS().stats(DECK_ID, allIds);
        stage.innerHTML =
          '<div class="fc-done">' +
            '<div class="fc-done-emoji">🎉</div>' +
            '<h3>Round complete</h3>' +
            '<p>' + s.learned + ' of ' + s.total + ' cards are now in long-term boxes. ' +
            (s.due ? s.due + ' still due — keep going.' : 'Nothing due right now — come back later for a refresh.') + '</p>' +
            '<div class="fc-done-btns"></div>' +
          '</div>';
        const btns = stage.querySelector('.fc-done-btns');
        if (s.due) { const b = _btn('btn btn-primary', 'Study due (' + s.due + ')'); b.onclick = () => startSession('due'); btns.appendChild(b); }
        const ba = _btn('btn btn-ghost', 'Study all'); ba.onclick = () => startSession('all'); btns.appendChild(ba);
      }

      function renderCaughtUp() {
        const s = SRS().stats(DECK_ID, allIds);
        stage.innerHTML =
          '<div class="fc-done">' +
            '<div class="fc-done-emoji">✅</div>' +
            '<h3>All caught up</h3>' +
            '<p>No cards are due right now' + (s.nextDue ? ' — next review ' + _relTime(s.nextDue) + '.' : '.') + ' You can still run the whole deck.</p>' +
            '<div class="fc-done-btns"></div>' +
          '</div>';
        const ba = _btn('btn btn-primary', 'Study all'); ba.onclick = () => startSession('all');
        stage.querySelector('.fc-done-btns').appendChild(ba);
      }

      /* ---- wire controls ---- */
      btnDue.addEventListener('click', () => startSession('due'));
      btnAll.addEventListener('click', () => startSession('all'));
      btnReset.addEventListener('click', () => {
        SRS().reset(DECK_ID);
        paintStats();
        stage.innerHTML = '<div class="fc-done"><div class="fc-done-emoji">🧹</div><h3>Progress reset</h3><p>Every card is new again. Pick a mode to start.</p></div>';
        controls.querySelectorAll('.fc-mode').forEach(b => b.classList.remove('active'));
      });

      paintStats();
      // Auto-start on due cards so the page is immediately useful.
      startSession('due');

      return {};
    },
  };

  function _relTime(ts) {
    const ms = ts - Date.now();
    if (ms <= 0) return 'now';
    const min = Math.round(ms / 60000);
    if (min < 60) return 'in ' + min + ' min';
    const hr = Math.round(min / 60);
    if (hr < 24) return 'in ' + hr + ' h';
    return 'in ' + Math.round(hr / 24) + ' d';
  }
  function _shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function _btn(cls, label) { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = label; return b; }
  function _el(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  window.CDWH = window.CDWH || {};
  window.CDWH.P.snowflake.Modules = window.CDWH.P.snowflake.Modules || {};
  window.CDWH.P.snowflake.Modules.loadingFlashcards = Module;
})();
