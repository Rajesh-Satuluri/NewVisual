/* ============================================================
   gen-assets.mjs — generate favicon, PWA icons, and the OG image
   by rendering the brand mark / a card template with headless
   Chromium. Re-run to regenerate; output lands in ../assets/.
   Usage: node scripts/gen-assets.mjs
   ============================================================ */
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets');

function resolveChromium() {
  const c = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome']
    .find(p => existsSync(p));
  return c;
}

// Brand iceberg mark (from index.html), scaled into a 512 art field.
const MARK = `
  <g transform="translate(96,104) scale(10)">
    <polygon points="16,2 28,12 4,12" fill="url(#g)" opacity="0.95"/>
    <polygon points="13,14 19,14 22,26 10,26" fill="url(#g)" opacity="0.4"/>
    <line x1="4" y1="12" x2="28" y2="12" stroke="url(#g)" stroke-width="1.5" opacity="0.6"/>
  </g>`;

function iconSVG({ maskable = false } = {}) {
  // Maskable icons need the mark inside the safe zone (smaller), on a full-bleed bg.
  const markTransform = maskable
    ? 'translate(146,150) scale(7.2)'
    : 'translate(96,104) scale(10)';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#4aaeff"/><stop offset="100%" stop-color="#a371f7"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#4aaeff" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#4aaeff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="#0d1117"/>
    <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="url(#glow)"/>
    <g transform="${markTransform}">
      <polygon points="16,2 28,12 4,12" fill="url(#g)" opacity="0.95"/>
      <polygon points="13,14 19,14 22,26 10,26" fill="url(#g)" opacity="0.4"/>
      <line x1="4" y1="12" x2="28" y2="12" stroke="url(#g)" stroke-width="1.5" opacity="0.6"/>
    </g>
  </svg>`;
}

function ogHTML() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;box-sizing:border-box}
    body{width:1200px;height:630px;overflow:hidden;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      background:radial-gradient(120% 140% at 15% 10%, #12233b 0%, #0d1117 55%, #090d14 100%);
      color:#e6edf3;position:relative}
    .glow{position:absolute;top:-160px;right:-160px;width:620px;height:620px;border-radius:50%;
      background:radial-gradient(circle, rgba(74,174,255,.28), rgba(163,113,247,.10) 45%, transparent 70%)}
    .wrap{position:absolute;inset:0;padding:84px 88px;display:flex;flex-direction:column;justify-content:space-between}
    .top{display:flex;align-items:center;gap:20px}
    .badge{font-size:20px;letter-spacing:.18em;text-transform:uppercase;color:#7d8896;font-weight:700}
    h1{font-size:82px;line-height:1.02;font-weight:800;letter-spacing:-.02em;
      background:linear-gradient(120deg,#8cc7ff,#c4a9ff);-webkit-background-clip:text;background-clip:text;color:transparent;max-width:960px}
    p{font-size:31px;line-height:1.4;color:#9aa4b1;max-width:900px;margin-top:20px}
    .chips{display:flex;gap:14px;flex-wrap:wrap}
    .chip{font-size:22px;color:#b9c2cd;border:1px solid #2b333d;background:rgba(255,255,255,.03);
      padding:10px 20px;border-radius:999px}
    .foot{font-size:22px;color:#7d8896}
  </style></head><body>
    <div class="glow"></div>
    <div class="wrap">
      <div class="top">
        <svg width="72" height="72" viewBox="0 0 32 32" fill="none">
          <defs><linearGradient id="bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#4aaeff"/><stop offset="100%" stop-color="#a371f7"/></linearGradient></defs>
          <polygon points="16,2 28,12 4,12" fill="url(#bg)" opacity=".95"/>
          <polygon points="13,14 19,14 22,26 10,26" fill="url(#bg)" opacity=".4"/>
          <line x1="4" y1="12" x2="28" y2="12" stroke="url(#bg)" stroke-width="1.5" opacity=".6"/>
        </svg>
        <span class="badge">ShopKart Engineering Handbook</span>
      </div>
      <div>
        <h1>Apache Iceberg Visualizer</h1>
        <p>Interactive, animation-driven walkthroughs of the lakehouse — metadata hierarchy, write operations, query planning, time travel, and more.</p>
      </div>
      <div class="chips">
        <span class="chip">Metadata Explorer</span>
        <span class="chip">Write &amp; Read Paths</span>
        <span class="chip">Query Planner</span>
        <span class="chip">Quiz &amp; Interview</span>
      </div>
    </div>
  </body></html>`;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const exec = resolveChromium();
  const browser = await chromium.launch(exec ? { executablePath: exec } : {});

  async function renderSVG(svg, size, file) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><head><style>*{margin:0}html,body{width:${size}px;height:${size}px}
      svg{width:${size}px;height:${size}px;display:block}</style></head><body>${svg}</body></html>`);
    await page.locator('svg').screenshot({ path: join(OUT, file), omitBackground: true });
    await page.close();
    console.log('  ✓ ' + file);
  }

  console.log('Icons:');
  await renderSVG(iconSVG(), 512, 'icon-512.png');
  await renderSVG(iconSVG(), 192, 'icon-192.png');
  await renderSVG(iconSVG(), 180, 'apple-touch-icon.png');
  await renderSVG(iconSVG(), 32, 'favicon-32.png');
  await renderSVG(iconSVG({ maskable: true }), 512, 'icon-512-maskable.png');

  console.log('OG image:');
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await og.setContent(ogHTML());
  await og.screenshot({ path: join(OUT, 'og-image.png') });
  await og.close();
  console.log('  ✓ og-image.png');

  await browser.close();
  console.log('Done → ' + OUT);
}

main().catch(e => { console.error(e); process.exit(1); });
