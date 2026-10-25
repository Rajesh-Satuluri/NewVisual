#!/usr/bin/env node
/*
 * test_markdown_math.mjs — tests for math (KaTeX) rendering in the Markdown
 * renderer (js/modules/markdown.js). Loads the real vendored KaTeX and the
 * renderer under a minimal `window` shim and asserts the required behaviors:
 * inline math, block math, \qquad, JSON-escaped math, and code-block literals,
 * plus a regression check that ordinary Markdown still renders.
 *
 * Run: node scripts/test_markdown_math.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

// Load the vendored KaTeX exactly as the browser would consume it.
const katex = require(path.join(root, "js/vendor/katex.min.js"));

// Minimal browser-like globals for the renderer IIFE.
const win = { BLIND75: {}, katex: katex };
global.window = win;

// Execute markdown.js in this context (it attaches window.BLIND75.md).
const mdSrc = fs.readFileSync(path.join(root, "js/modules/markdown.js"), "utf8");
new Function("window", mdSrc)(win);
const md = win.BLIND75.md;

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log("  ok  - " + name); }
  else { fail++; console.log("  FAIL - " + name); }
}

// 1. Block math via \[ ... \] (the reported case). \qquad must not be literal.
const block = md("\\[\ndp[1] = 1\\qquad dp[2] = 2\n\\]");
check("block \\[...\\] produces a KaTeX block", /katex-display/.test(block));
check("block math has no literal \\qquad", block.indexOf("\\qquad") === -1);
check("block math has no literal \\[ delimiter", block.indexOf("\\[") === -1);

// 2. Inline math via \( ... \)
const inlineParen = md("Runtime is \\(O(n)\\) overall.");
check("inline \\(...\\) renders KaTeX", /class="katex"/.test(inlineParen));
check("inline math keeps surrounding prose", inlineParen.indexOf("Runtime is") !== -1 && inlineParen.indexOf("overall") !== -1);
check("inline math is not a display block", inlineParen.indexOf("katex-display") === -1);

// 3. Fractions
const frac = md("A ratio \\(\\frac{a}{b}\\) here.");
check("fraction renders with mfrac-style structure", /class="(mfrac|frac)"/.test(frac) || /frac/.test(frac));
check("fraction renders KaTeX markup", /class="katex"/.test(frac));

// 4. $$ ... $$ block and $ ... $ inline
check("$$...$$ renders a display block", /katex-display/.test(md("$$\\sum_{i=1}^{n} i$$")));
check("$...$ renders inline", /class="katex"/.test(md("cost $x^2$ grows")));
check("$...$ not treated as display", md("cost $x^2$ grows").indexOf("katex-display") === -1);

// 5. Greek letters, \text, subscripts/superscripts inside one expression
const mixed = md("\\(\\alpha_i^2 + \\text{max}\\)");
check("greek/sub/sup/\\text render without literal backslashes", /class="katex"/.test(mixed) && mixed.indexOf("\\alpha") === -1 && mixed.indexOf("\\text") === -1);

// 6. JSON-escaped source: a JSON string "\\(O(1)\\)" parses to \(O(1)\)
const fromJson = JSON.parse('"Lookup is \\\\(O(1)\\\\) time."');
check("JSON-escaped source still parses to real delimiters", fromJson.indexOf("\\(O(1)\\)") !== -1);
check("JSON-escaped math renders", /class="katex"/.test(md(fromJson)));

// 7. Fenced code block: LaTeX inside must stay literal (not rendered)
const fenced = md("```\n\\[ x = 1 \\qquad y = 2 \\]\n```");
check("fenced code keeps literal \\[", fenced.indexOf("\\[") !== -1);
check("fenced code keeps literal \\qquad", fenced.indexOf("\\qquad") !== -1);
check("fenced code does not render KaTeX", fenced.indexOf("katex") === -1);
check("fenced code is still a code block", /<pre class="md-pre"><code/.test(fenced));

// 8. Inline code: LaTeX inside backticks stays literal
const inlineCode = md("Use `\\frac{a}{b}` as syntax.");
check("inline code keeps literal \\frac", inlineCode.indexOf("\\frac{a}{b}") !== -1);
check("inline code does not render KaTeX", inlineCode.indexOf("katex") === -1);

// 9. Regression: ordinary Markdown features intact.
check("headings render", /<h2>Title<\/h2>/.test(md("## Title")));
check("bold renders", /<strong>hi<\/strong>/.test(md("**hi**")));
check("unordered list renders", /<ul><li>a<\/li><li>b<\/li><\/ul>/.test(md("- a\n- b")));
const tbl = md("| A | B |\n|---|---|\n| 1 | 2 |");
check("table renders", /<table class="lab-table">/.test(tbl) && tbl.indexOf("<td>1</td>") !== -1);
check("line break preserved in paragraph", /line1<br>line2/.test(md("line1\nline2")));

// 10. Mixed prose + math + code in one blob keeps each part correct.
const blob = md("Cost is \\(O(n)\\).\n\n```\n\\[ raw \\]\n```\n\nThen $k$ items.");
check("mixed blob: inline math rendered", /class="katex"/.test(blob));
check("mixed blob: code stayed literal", blob.indexOf("\\[ raw \\]") !== -1);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
