// Shared presentational helpers for teaching modules — consistent prose, code
// blocks, cards and canvas framing. Styles are injected once (guarded by id).

const STYLE_ID = 'ssmod-styles';
export function injectModStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
  .ss-prose{max-width:820px;font-size:14.5px;line-height:1.75;color:var(--text-secondary)}
  .ss-prose h3{color:var(--text-primary);font-size:17px;margin:26px 0 10px}
  .ss-prose h4{color:var(--text-primary);font-size:14.5px;margin:20px 0 8px}
  .ss-prose p{margin:10px 0}
  .ss-prose ul,.ss-prose ol{margin:10px 0;padding-left:22px}
  .ss-prose li{margin:6px 0}
  .ss-prose b,.ss-prose strong{color:var(--text-primary)}
  .ss-prose code{font-family:var(--font-mono);font-size:12.5px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:5px;padding:1px 5px;color:var(--cyan,#06B6D4)}
  .ss-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0}
  @media(max-width:760px){.ss-grid{grid-template-columns:1fr}}
  .ss-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px 16px}
  .ss-card h4{margin:0 0 6px;font-size:13.5px;color:var(--text-primary)}
  .ss-card p{margin:4px 0;font-size:13px;line-height:1.6;color:var(--text-secondary)}
  .ss-callout{background:var(--bg-surface);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:10px;padding:12px 16px;margin:16px 0;font-size:13.5px;line-height:1.65;color:var(--text-secondary)}
  .ss-callout b{color:var(--text-primary)}
  .ss-code{margin:14px 0;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:#0A0E1A}
  .ss-code-lang{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);padding:7px 14px;border-bottom:1px solid var(--border);background:var(--bg-surface)}
  .ss-code pre{margin:0;padding:12px 14px;overflow-x:auto}
  .ss-code code{font-family:var(--font-mono);font-size:12.5px;line-height:1.6;color:#E2E8F0;white-space:pre}
  .ss-canvas-wrap{background:#0A0E1A;border:1px solid var(--border);border-radius:12px;padding:12px;margin:8px 0}
  .ss-canvas-wrap canvas{width:100%;display:block;margin:0 auto}
  .ss-caption{font-size:12.5px;line-height:1.6;color:var(--text-secondary);margin:4px 4px 10px}
  .ss-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:10px 0}
  .ss-btn{background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-primary);border-radius:8px;padding:7px 12px;font-size:13px;cursor:pointer;font-weight:600}
  .ss-btn:hover{border-color:var(--accent)}
  .ss-btn.primary{background:var(--accent);border-color:var(--accent);color:#0A0E1A}
  .ss-metrics{display:flex;flex-wrap:wrap;gap:16px;margin:8px 0}
  .ss-metric{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:10px 14px;min-width:120px}
  .ss-metric .k{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);font-weight:700}
  .ss-metric .v{font-family:var(--font-mono);font-size:19px;color:var(--text-primary);font-weight:700;margin-top:2px}
  .ss-tbl{width:100%;border-collapse:collapse;font-size:12.5px;font-family:var(--font-mono)}
  .ss-tbl th{text-align:left;color:var(--text-muted);font-weight:600;padding:5px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border)}
  .ss-tbl td{padding:5px 10px;color:var(--text-primary);border-top:1px solid color-mix(in srgb,var(--border) 55%,transparent)}
  .ss-tbl tr.new td{background:color-mix(in srgb,var(--accent) 13%,transparent)}
  `;
  document.head.appendChild(s);
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
export const esc = (s) => String(s).replace(/[&<>]/g, (c) => ESC[c]);

export function codeBlock(lang, code) {
  return `<div class="ss-code"><div class="ss-code-lang">${esc(lang)}</div><pre><code>${esc(
    code.replace(/^\n/, '').replace(/\n+$/, '')
  )}</code></pre></div>`;
}
