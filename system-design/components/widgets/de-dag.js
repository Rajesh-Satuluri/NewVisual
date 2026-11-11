// ── Orchestration DAG (live canvas sim) ─────────────────────────────────────
// A pipeline as a DAG of tasks. The orchestrator runs each task once its
// upstreams succeed, parallelizing independent branches. Fail a task to see it
// retry, then — if it gives up — the whole downstream subtree get skipped
// rather than run on bad data.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  // DAG definition
  const defs = [
    { id: 'A', name: 'extract_sales', x: 92, y: 90, deps: [] },
    { id: 'B', name: 'extract_users', x: 92, y: 210, deps: [] },
    { id: 'C', name: 'validate', x: 250, y: 150, deps: ['A', 'B'] },
    { id: 'D', name: 'transform', x: 400, y: 150, deps: ['C'] },
    { id: 'E', name: 'load', x: 525, y: 150, deps: ['D'] },
    { id: 'F', name: 'publish', x: 625, y: 150, deps: ['E'] },
  ];
  let nodes = {};
  function reset() {
    nodes = {};
    defs.forEach(d => { nodes[d.id] = { ...d, state: 'pending', prog: 0, retries: 0, willFail: false }; });
  }
  reset();
  let doneAt = null;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="dg-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="dg-run">▶ Run DAG</button>
        <button class="sd-btn" id="dg-fail">💥 Fail 'transform'</button>
      </div>`,
    caption: 'Tasks run in dependency order; independent branches run in parallel and fan in. A failing task retries with backoff, and if it finally fails the orchestrator skips everything downstream instead of running it on bad or missing data — the reliability a chain of cron jobs can’t give you.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#dg-note');

  $('#dg-run').addEventListener('click', () => { reset(); doneAt = null; });
  $('#dg-fail').addEventListener('click', () => { if (nodes.D.state === 'pending' || nodes.D.state === 'running') { nodes.D.willFail = true; nodes.D.retries = 2; } });

  function depsOk(n) { return n.deps.every(d => nodes[d].state === 'success'); }
  function anyDepBad(n) { return n.deps.some(d => nodes[d].state === 'failed' || nodes[d].state === 'skipped'); }

  let autoAcc = 0;
  function step(dt) {
    // start eligible tasks
    for (const id in nodes) {
      const n = nodes[id];
      if (n.state === 'pending') {
        if (anyDepBad(n)) n.state = 'skipped';
        else if (depsOk(n)) { n.state = 'running'; n.prog = 0; }
      } else if (n.state === 'running') {
        n.prog += dt / 1.1;
        if (n.prog >= 1) {
          if (n.willFail && n.retries > 0) { n.retries--; n.prog = 0; n.state = 'running'; if (n.retries === 0) n._lastTry = true; }
          else if (n.willFail && n.retries === 0 && n._lastTry) { n.state = 'failed'; }
          else n.state = 'success';
        }
      }
    }
    // auto-restart a few seconds after the run settles
    const settled = Object.values(nodes).every(n => ['success', 'failed', 'skipped'].includes(n.state));
    if (settled) { if (doneAt === null) doneAt = 0; else { doneAt += dt; if (doneAt > 3) { reset(); doneAt = null; } } }
  }

  const STCOL = { pending: 'text3', running: 'accent', success: 'green', failed: 'red', skipped: 'amber' };
  const STICON = { pending: '○', running: '◌', success: '✓', failed: '✕', skipped: '⤼' };

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    // edges
    defs.forEach(d => d.deps.forEach(dep => {
      const a = nodes[dep], b = nodes[d.id];
      const live = a.state === 'success' && (b.state === 'running' || b.state === 'success');
      ctx.strokeStyle = live ? withAlpha(pal.green, 0.8) : withAlpha(pal.border, 0.8);
      ctx.lineWidth = live ? 2 : 1.2;
      ctx.beginPath(); ctx.moveTo(a.x + 30, a.y); ctx.lineTo(b.x - 30, b.y); ctx.stroke();
    }));
    // nodes
    for (const id in nodes) {
      const n = nodes[id];
      const col = pal[STCOL[n.state]] || pal.text3;
      const w = 62, h = 40;
      roundRect(ctx, n.x - w / 2, n.y - h / 2, w, h, 8);
      ctx.fillStyle = withAlpha(col, n.state === 'running' ? 0.22 : 0.14); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = n.state === 'running' ? 2.2 : 1.4; ctx.stroke();
      if (n.state === 'running') { // progress bar
        roundRect(ctx, n.x - w / 2 + 4, n.y + h / 2 - 7, (w - 8) * Math.min(1, n.prog), 3, 2); ctx.fillStyle = pal.accent; ctx.fill();
      }
      label(ctx, `${STICON[n.state]} ${n.name}`, n.x, n.y - 4, { color: pal.text, size: 8.5, weight: 700 });
      if (n.state === 'running' && n.willFail && n.retries >= 0) label(ctx, `retry ${2 - n.retries}/2`, n.x, n.y + 7, { color: pal.amber, size: 7.5, weight: 700 });
    }

    const states = Object.values(nodes);
    const succeeded = states.filter(s => s.state === 'success').length;
    const failed = states.filter(s => s.state === 'failed').length;
    const skipped = states.filter(s => s.state === 'skipped').length;
    note.innerHTML = `✓ <b style="color:var(--green)">${succeeded}</b> succeeded · ✕ <b style="color:var(--red)">${failed}</b> failed · ⤼ <b style="color:var(--amber)">${skipped}</b> skipped (downstream of failure)`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
