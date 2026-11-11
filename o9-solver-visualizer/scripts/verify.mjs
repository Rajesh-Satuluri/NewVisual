#!/usr/bin/env node
/* verify.mjs — headless Chromium smoke sweep of every screen.
   Serves the tool, then for each registered screen (dark + light):
     • navigates to #<id>
     • asserts the sidebar built and #module-container rendered content
     • collects uncaught console errors (transient network noise filtered)
   Exits non-zero on any failure. Uses the pre-installed Playwright/Chromium.
   Usage: node scripts/verify.mjs */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url || "/").split("?")[0]);
    if (p === "/") p = "/index.html";
    const fp = normalize(join(root, p));
    if (!fp.startsWith(root)) { res.writeHead(403); return res.end(); }
    const body = await readFile(fp);
    res.writeHead(200, { "content-type": MIME[extname(fp)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404); res.end("not found");
  }
});

const IGNORE = /favicon|manifest|net::|ERR_|Failed to load resource|download|connect_rejected/i;

const port = await new Promise((r) => server.listen(0, () => r(server.address().port)));
const base = `http://127.0.0.1:${port}/`;

// Playwright is typically installed GLOBALLY in this environment (no local
// node_modules), so resolve it defensively: bare import, then absolute module
// paths, then createRequire from the global root. Accept named or default export.
let chromium;
const PW_PATHS = ["playwright", "/opt/node22/lib/node_modules/playwright/index.js",
  "/usr/lib/node_modules/playwright/index.js", "/usr/local/lib/node_modules/playwright/index.js"];
for (const cand of PW_PATHS) {
  try { const m = await import(cand); chromium = m.chromium || (m.default && m.default.chromium); if (chromium) break; } catch { /* next */ }
}
if (!chromium) {
  for (const base of ["/opt/node22/lib/node_modules/", "/usr/lib/node_modules/", "/usr/local/lib/node_modules/"]) {
    try { const { createRequire } = await import("node:module"); chromium = createRequire(base)("playwright").chromium; if (chromium) break; } catch { /* next */ }
  }
}
if (!chromium) { console.error("Playwright not available; skipping headless sweep."); server.close(); process.exit(0); }

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const results = [];

for (const theme of ["dark", "light"]) {
  const ctx = await browser.newContext({ colorScheme: theme });
  const page = await ctx.newPage();
  await page.addInitScript((t) => { try { localStorage.setItem("o9viz-theme", t); } catch (e) {} }, theme);
  await page.goto(base, { waitUntil: "networkidle" });

  const ids = await page.evaluate(() => (window.SolverViz?.getScreens?.() || []).map((s) => ({ id: s.id, ready: s.ready })));
  if (!ids.length) { results.push({ theme, id: "(registry)", ok: false, note: "getScreens() empty" }); }

  // sidebar built?
  const navCount = await page.$$eval(".sidebar-link", (els) => els.length);
  results.push({ theme, id: "(sidebar)", ok: navCount > 50, note: navCount + " links" });

  for (const { id, ready } of ids) {
    const errors = [];
    const onErr = (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) errors.push(m.text()); };
    page.on("console", onErr);
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(base + "#" + id, { waitUntil: "load" });
    await page.waitForTimeout(ready ? 220 : 60);
    const filled = await page.$eval("#module-container", (el) => el.textContent.trim().length > 20).catch(() => false);
    page.off("console", onErr);
    const ok = filled && errors.length === 0;
    results.push({ theme, id, ok, note: !filled ? "empty container" : errors.length ? errors[0].slice(0, 120) : "" });
  }
  await ctx.close();
}

await browser.close();
server.close();

const fails = results.filter((r) => !r.ok);
for (const r of fails) console.error(`✗ [${r.theme}] ${r.id} — ${r.note}`);
const total = results.length;
if (fails.length) {
  console.error(`\n${fails.length}/${total} checks failed.`);
  process.exit(1);
}
console.log(`✓ All ${total} checks passed (every screen × dark/light, 0 console errors).`);
