/*
 * markdown.js — a small, dependency-free Markdown renderer.
 * Supports: headings, bold/italic/strikethrough/inline-code, fenced code blocks
 * (```), nested unordered + ordered lists, blockquotes, links, horizontal rules,
 * GFM pipe tables, images, paragraphs, hard breaks, and lightweight inline/block
 * math (\(..\), \[..\], $..$, $$..$$ plus stray LaTeX symbol commands rendered to
 * Unicode — no KaTeX dependency). HTML is escaped before formatting, so it is safe
 * to render pasted content. Code-block syntax highlighting + a copy button are
 * applied after insertion via window.BLIND75.enhanceMd(node).
 */
(function () {
  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ---- lightweight LaTeX -> Unicode -----------------------------------------
  // A map of common LaTeX commands to Unicode. Longer keys are applied first so
  // \leq wins over \le, \neq over \ne, etc. Applied only to prose/math text,
  // never inside code blocks or inline code (those paths bypass inline()).
  var SYMBOLS = {
    "\\times": "×", "\\cdot": "·", "\\div": "÷", "\\pm": "±",
    "\\mp": "∓", "\\ast": "∗",
    "\\leq": "≤", "\\le": "≤", "\\geq": "≥", "\\ge": "≥",
    "\\neq": "≠", "\\ne": "≠", "\\approx": "≈", "\\equiv": "≡",
    "\\sim": "∼", "\\propto": "∝", "\\ll": "≪", "\\gg": "≫",
    "\\rightarrow": "→", "\\leftarrow": "←", "\\to": "→",
    "\\Rightarrow": "⇒", "\\Leftarrow": "⇐", "\\leftrightarrow": "↔",
    "\\mapsto": "↦", "\\uparrow": "↑", "\\downarrow": "↓",
    "\\infty": "∞", "\\partial": "∂", "\\nabla": "∇",
    "\\sum": "∑", "\\prod": "∏", "\\int": "∫", "\\sqrt": "√",
    "\\in": "∈", "\\notin": "∉", "\\ni": "∋",
    "\\subseteq": "⊆", "\\subset": "⊂", "\\supseteq": "⊇",
    "\\supset": "⊃", "\\cup": "∪", "\\cap": "∩",
    "\\emptyset": "∅", "\\varnothing": "∅",
    "\\forall": "∀", "\\exists": "∃", "\\nexists": "∄",
    "\\land": "∧", "\\lor": "∨", "\\lnot": "¬", "\\neg": "¬",
    "\\oplus": "⊕", "\\otimes": "⊗",
    "\\ldots": "…", "\\dots": "…", "\\cdots": "⋯",
    "\\lfloor": "⌊", "\\rfloor": "⌋", "\\lceil": "⌈", "\\rceil": "⌉",
    "\\langle": "⟨", "\\rangle": "⟩", "\\mid": "|",
    "\\Theta": "Θ", "\\Omega": "Ω", "\\Delta": "Δ",
    "\\Gamma": "Γ", "\\Lambda": "Λ", "\\Sigma": "Σ", "\\Phi": "Φ",
    "\\Pi": "Π", "\\Psi": "Ψ",
    "\\alpha": "α", "\\beta": "β", "\\gamma": "γ", "\\delta": "δ",
    "\\epsilon": "ε", "\\varepsilon": "ε", "\\zeta": "ζ",
    "\\eta": "η", "\\theta": "θ", "\\iota": "ι", "\\kappa": "κ",
    "\\lambda": "λ", "\\mu": "μ", "\\nu": "ν", "\\xi": "ξ",
    "\\pi": "π", "\\rho": "ρ", "\\sigma": "σ", "\\tau": "τ",
    "\\phi": "φ", "\\varphi": "φ", "\\chi": "χ", "\\psi": "ψ",
    "\\omega": "ω",
    "\\log": "log", "\\ln": "ln", "\\lg": "lg", "\\exp": "exp",
    "\\min": "min", "\\max": "max", "\\gcd": "gcd", "\\lcm": "lcm",
    "\\bmod": "mod", "\\mod": "mod", "\\deg": "deg"
  };
  // Build a single regex of all command keys, longest first.
  var SYM_KEYS = Object.keys(SYMBOLS).sort(function (a, b) { return b.length - a.length; });
  var SYM_RE = new RegExp(
    "(" + SYM_KEYS.map(function (k) { return k.replace(/\\/g, "\\\\"); }).join("|") + ")(?![a-zA-Z])",
    "g"
  );

  function symbols(t) {
    return t.replace(SYM_RE, function (m) { return SYMBOLS[m]; });
  }

  // Superscript/subscript — only applied inside delimited math so prose like
  // some_variable isn't mangled.
  function subsup(t) {
    t = t.replace(/\^\{([^}]*)\}/g, "<sup>$1</sup>").replace(/\^(\\?\w)/g, "<sup>$1</sup>");
    t = t.replace(/_\{([^}]*)\}/g, "<sub>$1</sub>").replace(/_(\\?\w)/g, "<sub>$1</sub>");
    return t;
  }

  // Lightweight Unicode fallback (used only when KaTeX is unavailable or errors).
  function mathSpan(inner, block) {
    var s = subsup(symbols(inner.replace(/\\\\/g, " "))).replace(/\\,|\\;|\\ |\\!/g, " ");
    return '<span class="md-math' + (block ? " md-math-block" : "") + '">' + s + "</span>";
  }

  // Render one delimited math region. Prefer real KaTeX typesetting; KaTeX needs
  // the raw LaTeX, so undo the HTML escaping we applied to the source up front.
  function renderMath(escInner, block) {
    if (window.katex && window.katex.renderToString) {
      var raw = escInner
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
      try {
        return window.katex.renderToString(raw, {
          displayMode: !!block,
          throwOnError: false,
          output: "html"
        });
      } catch (e) {}
    }
    return mathSpan(escInner, block);
  }

  // Pull delimited math (\(..\), \[..\], $..$, $$..$$) out of a text segment into
  // placeholders so the Markdown emphasis pass can't corrupt the rendered HTML;
  // the caller splices the rendered math back in afterwards.
  function extractMath(seg, store) {
    if (seg.indexOf("\\") === -1 && seg.indexOf("$") === -1) return seg;
    function ph(inner, block) {
      store.push(renderMath(inner, block));
      return "" + (store.length - 1) + "";
    }
    seg = seg.replace(/\\\[([\s\S]*?)\\\]/g, function (_, m) { return ph(m, true); });
    seg = seg.replace(/\\\(([\s\S]*?)\\\)/g, function (_, m) { return ph(m, false); });
    seg = seg.replace(/\$\$([\s\S]*?)\$\$/g, function (_, m) { return ph(m, true); });
    seg = seg.replace(/\$([^$\n]+?)\$/g, function (_, m) { return ph(m, false); });
    return seg;
  }

  // split a GFM table row "| a | b |" into trimmed cell strings
  function splitRow(row) {
    var t = row.trim().replace(/^\|/, "").replace(/\|$/, "");
    var raw = t.split("|");
    var out = [];
    for (var k = 0; k < raw.length; k++) out.push(raw[k].replace(/^\s+|\s+$/g, ""));
    return out;
  }

  // Inline formatting applied to already-escaped text.
  function inline(text) {
    // inline code first so its contents aren't further formatted
    var parts = text.split(/(`[^`]+`)/g);
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].charAt(0) === "`" && parts[i].charAt(parts[i].length - 1) === "`") {
        parts[i] = "<code>" + parts[i].slice(1, -1) + "</code>";
      } else {
        var store = [];
        var seg = extractMath(parts[i], store);
        seg = seg
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
          .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
          .replace(/~~([^~]+)~~/g, "<del>$1</del>")
          .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
        seg = symbols(seg); // stray LaTeX symbol commands in prose (outside math)
        if (store.length) {
          seg = seg.replace(/(\d+)/g, function (_, n) { return store[+n]; });
        }
        parts[i] = seg;
      }
    }
    return parts.join("");
  }

  // ---- nested list builder --------------------------------------------------
  // Items carry an indent depth; a strictly deeper item opens a nested list
  // inside the current <li>, a shallower one closes lists back to the match.
  var LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

  function listToHtml(items) {
    var out = [];
    var stack = []; // { tag, indent }
    for (var k = 0; k < items.length; k++) {
      var it = items[k];
      var tag = it.ordered ? "ol" : "ul";
      if (stack.length === 0) {
        out.push("<" + tag + ">"); stack.push({ tag: tag, indent: it.indent });
        out.push("<li>" + inline(it.content));
      } else if (it.indent > stack[stack.length - 1].indent) {
        out.push("<" + tag + ">"); stack.push({ tag: tag, indent: it.indent });
        out.push("<li>" + inline(it.content));
      } else if (it.indent === stack[stack.length - 1].indent) {
        out.push("</li><li>" + inline(it.content));
      } else {
        while (stack.length > 1 && it.indent < stack[stack.length - 1].indent) {
          out.push("</li></" + stack.pop().tag + ">");
        }
        out.push("</li><li>" + inline(it.content));
      }
    }
    while (stack.length) out.push("</li></" + stack.pop().tag + ">");
    return out.join("");
  }

  function render(md) {
    if (md == null) return "";
    var src = escapeHtml(String(md));
    var lines = src.split("\n");
    var html = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      // fenced code block
      var fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        var lang = fence[1] || "";
        var buf = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) {
          buf.push(lines[i]);
          i++;
        }
        i++; // skip closing fence
        var cls = lang ? ' class="language-' + lang + '"' : "";
        html.push('<pre class="md-pre"><code' + cls + ">" + buf.join("\n") + "</code></pre>");
        continue;
      }

      // horizontal rule (3+ of - * _ on their own line)
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
        html.push("<hr>");
        i++;
        continue;
      }

      // standalone image -> figure (e.g. the inline pattern diagrams)
      var img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
      if (img) {
        html.push('<figure class="md-fig"><img src="' + img[2] + '" alt="' + img[1] + '" loading="lazy"></figure>');
        i++;
        continue;
      }

      // headings
      var hd = line.match(/^(#{1,6})\s+(.*)$/);
      if (hd) {
        var lvl = hd[1].length;
        html.push("<h" + lvl + ">" + inline(hd[2]) + "</h" + lvl + ">");
        i++;
        continue;
      }

      // blockquote
      if (/^>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          q.push(lines[i].replace(/^>\s?/, ""));
          i++;
        }
        html.push("<blockquote>" + inline(q.join(" ")) + "</blockquote>");
        continue;
      }

      // GFM pipe table: a "| h | h |" header, a "|---|---|" separator, then rows
      if (
        /^\s*\|.*\|\s*$/.test(line) &&
        i + 1 < lines.length &&
        /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) &&
        lines[i + 1].indexOf("-") !== -1
      ) {
        var headers = splitRow(line);
        i += 2; // skip the header and separator rows
        var trs = "";
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          var cells = splitRow(lines[i]);
          trs += "<tr>";
          for (var c = 0; c < headers.length; c++) {
            trs += "<td>" + inline(cells[c] || "") + "</td>";
          }
          trs += "</tr>";
          i++;
        }
        var ths = "";
        for (var hh = 0; hh < headers.length; hh++) ths += "<th>" + inline(headers[hh]) + "</th>";
        html.push(
          '<div class="lab-table-scroll"><table class="lab-table"><thead><tr>' +
            ths +
            "</tr></thead><tbody>" +
            trs +
            "</tbody></table></div>"
        );
        continue;
      }

      // nested list (unordered or ordered, by indentation)
      if (LIST_RE.test(line)) {
        var items = [];
        while (i < lines.length && LIST_RE.test(lines[i])) {
          var m = lines[i].match(LIST_RE);
          items.push({
            indent: m[1].replace(/\t/g, "  ").length,
            ordered: /\d/.test(m[2]),
            content: m[3]
          });
          i++;
        }
        html.push(listToHtml(items));
        continue;
      }

      // blank line
      if (/^\s*$/.test(line)) {
        i++;
        continue;
      }

      // paragraph (gather consecutive non-empty, non-special lines)
      var para = [];
      while (
        i < lines.length &&
        !/^\s*$/.test(lines[i]) &&
        !/^```/.test(lines[i]) &&
        !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i]) &&
        !/^#{1,6}\s/.test(lines[i]) &&
        !/^>\s?/.test(lines[i]) &&
        !/^!\[[^\]]*\]\([^)]+\)\s*$/.test(lines[i]) &&
        !LIST_RE.test(lines[i]) &&
        !/^\s*\|.*\|\s*$/.test(lines[i])
      ) {
        para.push(lines[i]);
        i++;
      }
      html.push("<p>" + inline(para.join("<br>")) + "</p>");
    }

    return html.join("\n");
  }

  // ---- post-render enhancement ----------------------------------------------
  // Prism-highlight fenced code blocks and give each a copy button. Called once
  // after the rendered HTML is inserted into the DOM (Prism needs real elements).
  var LANG_ALIAS = {
    pyspark: "python", py: "python", python3: "python",
    postgres: "sql", postgresql: "sql", mysql: "sql", tsql: "sql", plsql: "sql"
  };

  function enhanceMd(root) {
    if (!root) return;
    var pres = root.querySelectorAll("pre.md-pre");
    for (var p = 0; p < pres.length; p++) {
      var pre = pres[p];
      var code = pre.querySelector("code");
      if (code && window.Prism) {
        var mm = (code.className || "").match(/language-([\w-]+)/);
        if (mm) {
          var lang = LANG_ALIAS[mm[1]] || mm[1];
          if (window.Prism.languages[lang]) {
            if (lang !== mm[1]) code.className = "language-" + lang;
            try { window.Prism.highlightElement(code); } catch (e) {}
          }
        }
      }
      if (!pre.querySelector(".md-copy")) {
        pre.classList.add("md-pre-has-copy");
        (function (preEl, codeEl) {
          var btn = document.createElement("button");
          btn.className = "md-copy";
          btn.type = "button";
          btn.textContent = "Copy";
          btn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            var txt = codeEl ? codeEl.textContent : preEl.textContent;
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(txt);
              }
            } catch (e) {}
            btn.textContent = "Copied";
            setTimeout(function () { btn.textContent = "Copy"; }, 1200);
          });
          preEl.appendChild(btn);
        })(pre, code);
      }
    }
  }

  window.BLIND75.md = render;
  window.BLIND75.enhanceMd = enhanceMd;
})();
