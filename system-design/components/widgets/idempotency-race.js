// ── Idempotency race simulator (E14) ────────────────────────────────────────
// Two concurrent requests arrive with the SAME idempotency key. Step through
// what the database does. Toggle the UNIQUE constraint off to watch the
// double-charge bug appear.
//
// mount(container, opts) → cleanup()

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

export function mount(container) {
  let unique = true;      // UNIQUE constraint on idempotency_key?
  let step = 0;           // 0..N

  const root = el('div', 'wg wg-idem');
  root.innerHTML = `
    <div class="wg-controls">
      <label class="wg-switch">
        <input type="checkbox" id="idem-uniq" checked>
        <span><code>UNIQUE</code> constraint on <code>idempotency_key</code></span>
      </label>
    </div>
    <div class="wg-lanes">
      <div class="wg-lane" data-lane="A">
        <div class="wg-lane-head">Request A <span class="wg-key">key = K</span></div>
        <div class="wg-lane-body" id="lane-A"></div>
      </div>
      <div class="wg-db" id="idem-db">
        <div class="wg-db-title">💾 orders table</div>
        <div class="wg-db-rows" id="idem-rows"><div class="wg-db-empty">(empty)</div></div>
      </div>
      <div class="wg-lane" data-lane="B">
        <div class="wg-lane-head">Request B <span class="wg-key">key = K</span></div>
        <div class="wg-lane-body" id="lane-B"></div>
      </div>
    </div>
    <div class="wg-outcome" id="idem-outcome"></div>
    <div class="wg-btnrow">
      <button class="sd-btn" id="idem-reset">↺ Reset</button>
      <button class="sd-btn sd-btn-primary" id="idem-step">Fire both requests →</button>
    </div>`;
  container.appendChild(root);

  const laneA = root.querySelector('#lane-A');
  const laneB = root.querySelector('#lane-B');
  const rowsEl = root.querySelector('#idem-rows');
  const outcome = root.querySelector('#idem-outcome');
  const stepBtn = root.querySelector('#idem-step');
  const resetBtn = root.querySelector('#idem-reset');
  const uniqBox = root.querySelector('#idem-uniq');

  // scenario frames, computed per unique-mode
  function frames() {
    if (unique) {
      return [
        { a: ['SELECT key=K → none'], b: ['SELECT key=K → none'], rows: [], note: 'Both requests look up key K. Neither finds a row — both think they are first.' },
        { a: ['INSERT key=K ✓ <b>won</b>'], b: ['INSERT key=K ✗ <b>duplicate</b>'], rows: [{k:'K', s:'PROCESSING', r:'—'}], note: 'Both try to INSERT. The UNIQUE constraint lets exactly one win; B is rejected with a duplicate-key error.' },
        { a: ['charge card 💳', 'store response'], b: ['SELECT key=K → row'], rows: [{k:'K', s:'COMPLETED', r:'order#901'}], note: 'A (the winner) runs the business logic once and writes the result. B treats the duplicate error as “someone else is handling K”.' },
        { a: ['200 → order#901'], b: ['200 → order#901'], rows: [{k:'K', s:'COMPLETED', r:'order#901'}], note: '✅ Both callers get the SAME response. The card was charged exactly once.' , good:true},
      ];
    }
    return [
      { a: ['SELECT key=K → none'], b: ['SELECT key=K → none'], rows: [], note: 'No UNIQUE constraint. Both requests look up key K and find nothing.' },
      { a: ['INSERT key=K ✓'], b: ['INSERT key=K ✓'], rows: [{k:'K', s:'PROCESSING', r:'—'},{k:'K', s:'PROCESSING', r:'—'}], note: 'Without the constraint BOTH inserts succeed. Two rows now exist for the same key.' },
      { a: ['charge card 💳', 'store response'], b: ['charge card 💳', 'store response'], rows: [{k:'K', s:'COMPLETED', r:'order#901'},{k:'K', s:'COMPLETED', r:'order#902'}], note: 'Both run the business logic. The card is charged TWICE and two orders are created.' },
      { a: ['200 → order#901'], b: ['200 → order#902'], rows: [{k:'K', s:'COMPLETED', r:'order#901'},{k:'K', s:'COMPLETED', r:'order#902'}], note: '❌ Duplicate charge. This is the bug the UNIQUE constraint prevents.', bad:true },
    ];
  }

  function renderRows(rows) {
    if (!rows.length) { rowsEl.innerHTML = '<div class="wg-db-empty">(empty)</div>'; return; }
    rowsEl.innerHTML = rows.map(r =>
      `<div class="wg-db-row"><code>${r.k}</code><span class="wg-pill s-${r.s.toLowerCase()}">${r.s}</span><span class="wg-db-res">${r.r}</span></div>`
    ).join('');
  }

  function render() {
    const fr = frames();
    const shown = fr.slice(0, step);
    laneA.innerHTML = shown.map((f,i) => f.a.map(x => `<div class="wg-msg${i===step-1?' live':''}">${x}</div>`).join('')).join('');
    laneB.innerHTML = shown.map((f,i) => f.b.map(x => `<div class="wg-msg${i===step-1?' live':''}">${x}</div>`).join('')).join('');
    const last = shown[shown.length - 1];
    renderRows(last ? last.rows : []);
    if (step === 0) {
      outcome.className = 'wg-outcome';
      outcome.textContent = 'Press “Fire both requests” to step through two simultaneous calls.';
    } else {
      outcome.className = 'wg-outcome' + (last.good ? ' good' : last.bad ? ' bad' : '');
      outcome.innerHTML = last.note;
    }
    stepBtn.disabled = step >= fr.length;
    stepBtn.textContent = step === 0 ? 'Fire both requests →' : step >= fr.length ? 'Done ✓' : 'Next step →';
    uniqBox.disabled = step > 0;
  }

  stepBtn.addEventListener('click', () => { step = Math.min(frames().length, step + 1); render(); });
  resetBtn.addEventListener('click', () => { step = 0; render(); });
  uniqBox.addEventListener('change', () => { unique = uniqBox.checked; step = 0; render(); });

  render();
  return () => { root.remove(); };
}
