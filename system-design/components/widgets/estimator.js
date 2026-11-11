// ── Back-of-envelope estimator (E17) ────────────────────────────────────────
// Turn product assumptions (DAU, requests, payload, read:write) into the
// numbers interviewers ask for: average & peak QPS, storage growth, bandwidth.
//
// mount(container) → cleanup()

function fmt(n) {
  if (!isFinite(n)) return '—';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + ' T';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + ' M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + ' K';
  return n.toFixed(n < 10 ? 1 : 0);
}
function bytes(n) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = 0; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return n.toFixed(n < 10 ? 2 : 1) + ' ' + u[i];
}

const FIELDS = [
  { k: 'dau', label: 'Daily active users', val: 10_000_000, step: 1_000_000, min: 0 },
  { k: 'rpu', label: 'Requests / user / day', val: 20, step: 1, min: 0 },
  { k: 'peak', label: 'Peak factor (× average)', val: 5, step: 1, min: 1 },
  { k: 'payload', label: 'Avg payload (KB)', val: 2, step: 1, min: 0 },
  { k: 'wpct', label: 'Writes (% of requests)', val: 10, step: 5, min: 0, max: 100 },
  { k: 'repl', label: 'Replication / overhead (×)', val: 3, step: 1, min: 1 },
];

export function mount(container) {
  const s = {}; FIELDS.forEach(f => s[f.k] = f.val);

  const root = document.createElement('div');
  root.className = 'wg wg-est';
  root.innerHTML = `
    <div class="wg-est-grid">
      <div class="wg-est-inputs">
        ${FIELDS.map(f => `
          <label class="wg-est-field">
            <span>${f.label}</span>
            <input type="number" id="est-${f.k}" value="${f.val}" step="${f.step}" min="${f.min}" ${f.max != null ? `max="${f.max}"` : ''}>
          </label>`).join('')}
      </div>
      <div class="wg-est-out" id="est-out"></div>
    </div>
    <div class="wg-note">Order-of-magnitude only — the goal is a defensible estimate, not precision. 86,400 seconds/day.</div>`;
  container.appendChild(root);

  const out = root.querySelector('#est-out');

  function compute() {
    const reqDay = s.dau * s.rpu;
    const avgQps = reqDay / 86400;
    const peakQps = avgQps * s.peak;
    const writesDay = reqDay * (s.wpct / 100);
    const rawDay = writesDay * s.payload * 1024;        // bytes/day of new data (writes only)
    const storeDay = rawDay * s.repl;
    const storeYear = storeDay * 365;
    const bwAvg = avgQps * s.payload * 1024 * 8;        // bits/sec (all requests move payload)
    const bwPeak = peakQps * s.payload * 1024 * 8;
    return { reqDay, avgQps, peakQps, writesDay, storeDay, storeYear, bwAvg, bwPeak };
  }

  function card(label, value, sub) {
    return `<div class="wg-stat"><div class="wg-stat-val">${value}</div><div class="wg-stat-label">${label}</div>${sub ? `<div class="wg-stat-sub">${sub}</div>` : ''}</div>`;
  }

  function render() {
    const r = compute();
    out.innerHTML =
      card('Requests / day', fmt(r.reqDay)) +
      card('Average QPS', fmt(r.avgQps)) +
      card('Peak QPS', fmt(r.peakQps), `${s.peak}× average`) +
      card('New data / day', bytes(r.storeDay), `${s.repl}× replicated`) +
      card('Storage / year', bytes(r.storeYear)) +
      card('Peak bandwidth', fmt(r.bwPeak) + 'bps', bytes(r.bwPeak / 8) + '/s');
  }

  FIELDS.forEach(f => {
    const inp = root.querySelector('#est-' + f.k);
    inp.addEventListener('input', () => {
      let v = parseFloat(inp.value); if (isNaN(v)) v = 0;
      if (f.min != null) v = Math.max(f.min, v);
      if (f.max != null) v = Math.min(f.max, v);
      s[f.k] = v; render();
    });
  });

  render();
  return () => { root.remove(); };
}
