// Headless route verifier for the flink tool.
// Serves ROOT, loads each #route, asserts the module mounted + zero console
// errors, flips to light theme, and runs extra assertions passed per-route.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;

const ROOT = '/home/user/newvisual/flink';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8099;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const base = p.startsWith('/shared/') ? path.dirname(ROOT) : ROOT;
    const fp = path.join(base, p);
    if (!existsSync(fp)) { res.writeHead(404); res.end('nf'); return; }
    const data = await readFile(fp);
    res.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
});
await new Promise((r) => server.listen(PORT, r));

// routes to test (keys from LOADERS)
const ROUTES = process.argv[2]
  ? process.argv[2].split(',')
  : ['home','m01','m02','m03','m04','m05','m06','m07','m08','m09','m10','m11','m12','m13','m14','m15','m16','m17','m18','m19','comparison','glossary','cheatsheet','master-map','study'];

const browser = await chromium.launch({ executablePath: CHROME });
let failures = 0;
for (const theme of ['dark', 'light']) {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
    await page.goto(`http://localhost:${PORT}/index.html#${route}`, { waitUntil: 'networkidle' });
    if (theme === 'light') {
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
      await page.waitForTimeout(150);
    }
    // mounted?
    const mounted = await page.evaluate(() => {
      const el = document.getElementById('module-canvas') || document.querySelector('main') || document.body;
      const txt = (el.innerText || '').trim();
      return txt.length > 80 && !/coming soon/i.test(txt);
    });
    let extra = '';
    if (route === 'm09') {
      const spine = await page.evaluate(() => ({
        hasSpine: !!document.querySelector('.ride-spine'),
        stages: document.querySelectorAll('.spine-stage').length,
        active: document.querySelectorAll('.spine-stage.active').length,
      }));
      if (!spine.hasSpine || spine.stages !== 10) { extra = ` SPINE_FAIL ${JSON.stringify(spine)}`; }
      else extra = ` spine✓(${spine.stages} stages, ${spine.active} active)`;
    }
    const ok = mounted && errors.length === 0 && !extra.includes('FAIL');
    if (!ok) {
      failures++;
      console.log(`✗ [${theme}] #${route}  mounted=${mounted} errors=${errors.length}${extra}`);
      errors.slice(0, 3).forEach((e) => console.log('     ' + e.slice(0, 160)));
    } else if (theme === 'dark') {
      console.log(`✓ #${route}${extra}`);
    }
    await page.close();
  }
}
await browser.close();
server.close();
console.log(failures === 0 ? '\nALL GREEN — every route mounts, zero console errors, light+dark' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
