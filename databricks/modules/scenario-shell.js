// Shared styling + a tiny difficulty/search control bar for the Scenarios
// pages (Decision Drills, Troubleshooting, Tiered Answers). Styles are injected
// once and reuse the app's CSS variables so they theme in dark/light.

const STYLE_ID = 'scenario-styles';

export function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
  .scn-controls { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin: 4px 0 18px; }
  .scn-search { flex:1; min-width:220px; background:var(--bg2); border:1px solid var(--border); color:var(--text);
    border-radius:10px; padding:10px 14px; font-size:14px; }
  .scn-search:focus { outline:none; border-color:var(--accent); }
  .scn-chips { display:flex; gap:6px; flex-wrap:wrap; }
  .scn-chip { background:var(--bg2); border:1px solid var(--border); color:var(--text2); border-radius:999px;
    padding:7px 14px; font-size:13px; cursor:pointer; transition:.15s; }
  .scn-chip:hover { color:var(--text); }
  .scn-chip.active { background:var(--accent-lo); border-color:var(--accent); color:var(--accent2); font-weight:600; }
  .scn-count { color:var(--text3); font-size:13px; margin-bottom:12px; }
  .scn-empty { color:var(--text3); text-align:center; padding:40px; }

  .scn-card { background:var(--bg2); border:1px solid var(--border); border-radius:14px; padding:0; margin-bottom:14px; overflow:hidden; }
  .scn-head { display:flex; align-items:flex-start; gap:12px; padding:16px 18px; cursor:pointer; }
  .scn-head:hover { background:var(--bg3); }
  .scn-ico { font-size:20px; line-height:1.3; }
  .scn-htext { flex:1; }
  .scn-title { font-weight:700; color:var(--text); font-size:15.5px; }
  .scn-sub { color:var(--text2); font-size:13px; margin-top:3px; }
  .scn-meta { display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-top:8px; }
  .scn-tag { font-size:11px; color:var(--text3); border:1px solid var(--border); border-radius:6px; padding:2px 7px; }
  .diff-badge { font-size:11px; font-weight:700; border-radius:6px; padding:2px 8px; text-transform:capitalize; }
  .diff-easy   { background:rgba(16,185,129,.15); color:var(--green); }
  .diff-medium { background:rgba(245,158,11,.15); color:var(--amber); }
  .diff-hard   { background:rgba(239,68,68,.15);  color:var(--red); }
  .scn-chev { color:var(--text3); transition:.2s; margin-left:4px; }
  .scn-card.open .scn-chev { transform:rotate(180deg); }
  .scn-body { display:none; padding:4px 18px 18px; border-top:1px solid var(--border); }
  .scn-card.open .scn-body { display:block; }
  .scn-body p { color:var(--text2); line-height:1.6; margin:12px 0; }
  .scn-body code { background:var(--bg3); border:1px solid var(--border); border-radius:4px; padding:1px 5px; font-size:12.5px; color:var(--accent2); }
  .scn-body b { color:var(--text); }
  .scn-label { font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--text3); margin:16px 0 6px; }

  /* Decision options */
  .scn-req { color:var(--text); line-height:1.6; margin:12px 0 4px; }
  .opt { border:1px solid var(--border); border-radius:10px; padding:12px 14px; margin:10px 0; background:var(--bg); }
  .opt-label { font-weight:650; color:var(--text); display:flex; align-items:center; gap:8px; }
  .opt-verdict { font-size:10.5px; font-weight:800; text-transform:uppercase; border-radius:6px; padding:2px 8px; letter-spacing:.03em; }
  .v-best   { background:rgba(16,185,129,.18); color:var(--green); }
  .v-viable { background:rgba(245,158,11,.18); color:var(--amber); }
  .v-wrong  { background:rgba(239,68,68,.18);  color:var(--red); }
  .opt-why { color:var(--text2); line-height:1.6; margin-top:8px; font-size:13.5px; }
  .opt.best { border-color:rgba(16,185,129,.5); }
  .scn-note { background:var(--accent-lo); border:1px solid var(--accent); border-radius:10px; padding:11px 14px; margin-top:14px; color:var(--text); font-size:13.5px; line-height:1.6; }
  .scn-whatif { background:var(--bg3); border-radius:10px; padding:11px 14px; margin-top:12px; color:var(--text2); font-size:13.5px; line-height:1.6; }

  /* Incident steps */
  .step { border-left:2px solid var(--border); padding:4px 0 4px 14px; margin:14px 0; }
  .step-prompt { font-weight:650; color:var(--text); margin-bottom:8px; }
  .chk { border:1px solid var(--border); border-radius:9px; padding:10px 12px; margin:8px 0; cursor:pointer; background:var(--bg); transition:.15s; }
  .chk:hover { border-color:var(--text3); }
  .chk-label { color:var(--text); font-size:13.5px; display:flex; gap:8px; align-items:center; }
  .chk-mark { font-weight:800; }
  .chk-reveal { display:none; color:var(--text2); font-size:13px; line-height:1.6; margin-top:8px; padding-top:8px; border-top:1px dashed var(--border); }
  .chk.revealed .chk-reveal { display:block; }
  .chk.correct.revealed { border-color:rgba(16,185,129,.5); background:rgba(16,185,129,.06); }
  .chk.wrong.revealed   { border-color:rgba(239,68,68,.4);  background:rgba(239,68,68,.05); }
  .chk.correct.revealed .chk-mark { color:var(--green); }
  .chk.wrong.revealed   .chk-mark { color:var(--red); }
  .scn-evi { color:var(--text); } .scn-evi b { color:var(--text); }
  .outcome { margin-top:14px; }
  .outcome-row { background:var(--bg); border:1px solid var(--border); border-radius:10px; padding:11px 14px; margin:8px 0; }
  .outcome-row .scn-label { margin-top:0; }

  /* Tiered */
  .tier { border:1px solid var(--border); border-radius:10px; padding:12px 14px; margin:10px 0; background:var(--bg); }
  .tier-weak   { border-left:3px solid var(--red); }
  .tier-good   { border-left:3px solid var(--amber); }
  .tier-senior { border-left:3px solid var(--green); }
  .tier-h { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px; }
  .tier-weak .tier-h { color:var(--red); }
  .tier-good .tier-h { color:var(--amber); }
  .tier-senior .tier-h { color:var(--green); }
  .tier-body { color:var(--text2); line-height:1.6; font-size:13.5px; }
  .tier-body b { color:var(--text); }
  `;
  document.head.appendChild(el);
}

// Toggle open/close on card headers and (for incidents) reveal checks.
export function wireCards(root) {
  root.querySelectorAll('.scn-head').forEach(h => {
    h.addEventListener('click', () => h.closest('.scn-card').classList.toggle('open'));
  });
  root.querySelectorAll('.chk').forEach(c => {
    c.addEventListener('click', e => { e.stopPropagation(); c.classList.add('revealed'); });
  });
}
