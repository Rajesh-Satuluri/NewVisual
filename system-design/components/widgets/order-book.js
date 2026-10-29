// ── Order-book matching engine (live canvas sim) ────────────────────────────
// The heart of an exchange. Resting buy orders (bids) and sell orders (asks)
// sit in the book, sorted by price then time. An incoming order matches the
// best opposite price first (price-time priority); if it can't fully match, the
// remainder rests. Send orders and watch trades print and the spread move.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  const MAXLVL = 6;
  // price levels; qty aggregated per price. seed a book around 100.00
  let bids = [[99.98, 300], [99.97, 500], [99.96, 200], [99.95, 700]].map(([p, q]) => ({ p, q, flash: 0 }));
  let asks = [[100.02, 200], [100.03, 400], [100.04, 600], [100.05, 300]].map(([p, q]) => ({ p, q, flash: 0 }));
  let lastTrade = null, lastSide = null, tradeFlash = 0;
  let trades = 0, volume = 0;

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="ob-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="ob-buy" style="background:var(--green);border-color:transparent">▲ Buy 300</button>
        <button class="sd-btn sd-btn-primary" id="ob-sell" style="background:var(--red);border-color:transparent">▼ Sell 300</button>
        <button class="sd-btn" id="ob-rand">🎲 Random order</button>
        <button class="sd-btn" id="ob-reset">↺ Reset book</button>
      </div>`,
    caption: 'Matching is best-price-first, then oldest-first (FIFO) within a price level. A marketable order crosses the spread and prints a trade; a non-marketable order rests in the book and becomes the new best bid/ask.',
  });

  const ctx = fitCanvas(canvas, 640, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#ob-note');

  const bestBid = () => bids.length ? Math.max(...bids.map(b => b.p)) : null;
  const bestAsk = () => asks.length ? Math.min(...asks.map(a => a.p)) : null;
  const sortBook = () => { bids.sort((a, b) => b.p - a.p); asks.sort((a, b) => a.p - b.p); };

  function rest(side, price, qty) {
    const book = side === 'buy' ? bids : asks;
    const lvl = book.find(l => Math.abs(l.p - price) < 1e-6);
    if (lvl) { lvl.q += qty; lvl.flash = 1; }
    else { book.push({ p: price, q: qty, flash: 1 }); }
    // cap depth
    if (side === 'buy') { bids.sort((a, b) => b.p - a.p); bids = bids.slice(0, MAXLVL); }
    else { asks.sort((a, b) => a.p - b.p); asks = asks.slice(0, MAXLVL); }
  }

  function submit(side, qty, limit) {
    // limit: price cap (buy) / floor (sell). market if null.
    let remaining = qty;
    const opp = side === 'buy' ? asks : bids;
    const priceOk = lvlP => side === 'buy' ? (limit == null || lvlP <= limit) : (limit == null || lvlP >= limit);
    sortBook();
    const ordered = side === 'buy' ? [...opp].sort((a, b) => a.p - b.p) : [...opp].sort((a, b) => b.p - a.p);
    for (const lvl of ordered) {
      if (remaining <= 0 || !priceOk(lvl.p)) break;
      const fill = Math.min(remaining, lvl.q);
      lvl.q -= fill; remaining -= fill; lvl.flash = 1;
      lastTrade = lvl.p; lastSide = side; tradeFlash = 1; trades++; volume += fill;
    }
    if (side === 'buy') asks = asks.filter(l => l.q > 0); else bids = bids.filter(l => l.q > 0);
    if (remaining > 0 && limit != null) rest(side, limit, remaining); // rest the remainder
    sortBook();
    render();
  }

  $('#ob-buy').addEventListener('click', () => submit('buy', 300, bestAsk() != null ? +(bestAsk() + 0.01).toFixed(2) : 100.05));
  $('#ob-sell').addEventListener('click', () => submit('sell', 300, bestBid() != null ? +(bestBid() - 0.01).toFixed(2) : 99.95));
  $('#ob-rand').addEventListener('click', () => {
    const side = Math.random() < 0.5 ? 'buy' : 'sell';
    const qty = (Math.floor(Math.random() * 6) + 1) * 100;
    const mid = ((bestBid() || 99.97) + (bestAsk() || 100.02)) / 2;
    const limit = +(mid + (Math.random() * 0.1 - 0.05)).toFixed(2);
    submit(side, qty, limit);
  });
  $('#ob-reset').addEventListener('click', () => {
    bids = [[99.98, 300], [99.97, 500], [99.96, 200], [99.95, 700]].map(([p, q]) => ({ p, q, flash: 0 }));
    asks = [[100.02, 200], [100.03, 400], [100.04, 600], [100.05, 300]].map(([p, q]) => ({ p, q, flash: 0 }));
    lastTrade = null; trades = 0; volume = 0; render();
  });

  function render() {
    const bb = bestBid(), ba = bestAsk();
    const spread = (bb != null && ba != null) ? (ba - bb).toFixed(2) : '—';
    const lt = lastTrade != null
      ? `last trade <b style="color:var(--${lastSide === 'buy' ? 'green' : 'red'})">$${lastTrade.toFixed(2)}</b>` : 'no trades yet';
    note.innerHTML = `best bid <b style="color:var(--green)">${bb != null ? '$' + bb.toFixed(2) : '—'}</b> · best ask <b style="color:var(--red)">${ba != null ? '$' + ba.toFixed(2) : '—'}</b> · spread <b>$${spread}</b> · ${lt} · ${trades} trades, ${volume} shares`;
  }

  function step(dt) {
    [...bids, ...asks].forEach(l => { if (l.flash > 0) l.flash = Math.max(0, l.flash - dt * 1.6); });
    if (tradeFlash > 0) tradeFlash = Math.max(0, tradeFlash - dt * 1.3);
  }

  function drawSide(book, side, x0) {
    const col = side === 'buy' ? pal.green : pal.red;
    const maxQ = Math.max(1, ...[...bids, ...asks].map(l => l.q));
    const rows = (side === 'buy' ? [...book].sort((a, b) => b.p - a.p) : [...book].sort((a, b) => a.p - b.p)).slice(0, MAXLVL);
    label(ctx, side === 'buy' ? 'BIDS (buy)' : 'ASKS (sell)', x0 + 140, 24, { color: col, size: 12, weight: 800 });
    rows.forEach((l, i) => {
      const y = 44 + i * 36;
      const w = 30 + (l.q / maxQ) * 220;
      const bx = side === 'buy' ? x0 + 280 - w : x0;
      roundRect(ctx, bx, y, w, 28, 5);
      ctx.fillStyle = withAlpha(col, 0.18 + l.flash * 0.5); ctx.fill();
      ctx.strokeStyle = withAlpha(col, 0.55); ctx.lineWidth = 1; ctx.stroke();
      label(ctx, `$${l.p.toFixed(2)}`, side === 'buy' ? x0 + 274 : x0 + 6, y + 14, { color: pal.text, size: 11, weight: 700, align: side === 'buy' ? 'right' : 'left' });
      label(ctx, `${l.q}`, side === 'buy' ? x0 + 6 : x0 + 274, y + 14, { color: pal.text2, size: 10.5, align: side === 'buy' ? 'left' : 'right' });
    });
  }

  function draw() {
    ctx.clearRect(0, 0, 640, 300);
    drawSide(bids, 'buy', 20);
    drawSide(asks, 'sell', 340);
    // spread divider
    ctx.strokeStyle = withAlpha(pal.border, 1); ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(320, 20); ctx.lineTo(320, 280); ctx.stroke(); ctx.setLineDash([]);
    if (lastTrade != null) {
      const c = lastSide === 'buy' ? pal.green : pal.red;
      ctx.globalAlpha = 0.4 + tradeFlash * 0.6;
      label(ctx, `⚡ $${lastTrade.toFixed(2)}`, 320, 294, { color: c, size: 12, weight: 800 });
      ctx.globalAlpha = 1;
    }
  }

  render();
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
