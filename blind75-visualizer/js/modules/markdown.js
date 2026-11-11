/*
 * markdown.js — a small, dependency-free Markdown renderer.
 * Supports: headings, bold/italic/inline-code, fenced code blocks (```),
 * unordered + ordered lists, blockquotes, links, paragraphs, and hard breaks.
 * It is intentionally minimal but safe (HTML is escaped before formatting).
 */
(function () {
  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // --- Math (KaTeX) support ------------------------------------------------
  // We protect math spans BEFORE the Markdown pipeline runs so that neither
  // escapeHtml nor the inline formatter can mangle LaTeX (backslashes, $, []).
  // Each span is rendered to HTML with KaTeX and swapped for a NUL-delimited
  // placeholder that survives escaping/formatting untouched; after rendering we
  // splice the KaTeX HTML back in. Fenced code and inline code are copied
  // verbatim here, so LaTeX inside code stays literal. If KaTeX is unavailable
  // the source is returned unchanged (graceful no-op), matching prior behavior.
  function renderKatex(latex, display, tokens) {
    var html;
    try {
      html = window.katex.renderToString(latex, {
        displayMode: display,
        throwOnError: false,
        output: "html"
      });
    } catch (e) {
      return null; // leave the raw text in place on failure
    }
    var idx = tokens.length;
    tokens.push(html);
    return "\u0000" + idx + "\u0000";
  }

  function protectMath(src) {
    var tokens = [];
    if (!window.katex || typeof window.katex.renderToString !== "function") {
      return { src: src, tokens: tokens };
    }
    var out = "";
    var n = src.length;
    var p = 0;
    var atLineStart = true;

    while (p < n) {
      var ch = src.charAt(p);

      // fenced code block (``` at line start) -> copy through the closing fence
      if (atLineStart && src.substr(p, 3) === "```") {
        var firstNl = src.indexOf("\n", p);
        var ls = firstNl === -1 ? n : firstNl + 1;
        var blockEnd = n;
        while (ls <= n) {
          var le = src.indexOf("\n", ls);
          if (le === -1) le = n;
          if (/^\s*```\s*$/.test(src.slice(ls, le))) { blockEnd = le; break; }
          if (le === n) break;
          ls = le + 1;
        }
        out += src.slice(p, blockEnd);
        p = blockEnd;
        atLineStart = false;
        continue;
      }

      // inline code (`...`) -> copy verbatim
      if (ch === "`") {
        var close = src.indexOf("`", p + 1);
        if (close === -1) { out += src.slice(p); break; }
        out += src.slice(p, close + 1);
        p = close + 1;
        atLineStart = false;
        continue;
      }

      // block math: $$...$$
      if (src.substr(p, 2) === "$$") {
        var e = src.indexOf("$$", p + 2);
        if (e !== -1) {
          var tok = renderKatex(src.slice(p + 2, e), true, tokens);
          if (tok !== null) { out += tok; p = e + 2; atLineStart = false; continue; }
        }
      }

      // block math: \[ ... \]
      if (src.substr(p, 2) === "\\[") {
        var e2 = src.indexOf("\\]", p + 2);
        if (e2 !== -1) {
          var tok2 = renderKatex(src.slice(p + 2, e2), true, tokens);
          if (tok2 !== null) { out += tok2; p = e2 + 2; atLineStart = false; continue; }
        }
      }

      // inline math: \( ... \)  (must not span lines)
      if (src.substr(p, 2) === "\\(") {
        var e3 = src.indexOf("\\)", p + 2);
        if (e3 !== -1) {
          var inner3 = src.slice(p + 2, e3);
          if (inner3.indexOf("\n") === -1) {
            var tok3 = renderKatex(inner3, false, tokens);
            if (tok3 !== null) { out += tok3; p = e3 + 2; atLineStart = false; continue; }
          }
        }
      }

      // inline math: $ ... $  (single dollar, non-empty, same line)
      if (ch === "$") {
        var k = p + 1, e4 = -1;
        while (k < n) {
          var kc = src.charAt(k);
          if (kc === "$") { e4 = k; break; }
          if (kc === "\n") break;
          k++;
        }
        if (e4 !== -1 && e4 > p + 1) {
          var tok4 = renderKatex(src.slice(p + 1, e4), false, tokens);
          if (tok4 !== null) { out += tok4; p = e4 + 1; atLineStart = false; continue; }
        }
      }

      out += ch;
      atLineStart = (ch === "\n");
      p++;
    }
    return { src: out, tokens: tokens };
  }

  function restoreMath(html, tokens) {
    for (var i = tokens.length - 1; i >= 0; i--) {
      html = html.split("\u0000" + i + "\u0000").join(tokens[i]);
    }
    return html;
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
    // Protect inline code into placeholders FIRST. This keeps its contents from
    // being further formatted AND — crucially — lets emphasis markers that
    // straddle a code span still pair up (e.g. "**foo `bar` baz**"). Splitting
    // on code spans instead would sever the leading/trailing ** into different
    // pieces, leaving them literal. Placeholders are NUL + "c" + idx + NUL, which
    // survive the emphasis/link passes (no *, [, or `) and never collide with the
    // math placeholders (NUL + digits + NUL) that may also be present here.
    var codes = [];
    var protectedText = text.replace(/`[^`]+`/g, function (m) {
      codes.push("<code>" + m.slice(1, -1) + "</code>");
      return "\u0000c" + (codes.length - 1) + "\u0000";
    });
    var out = protectedText
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    for (var i = codes.length - 1; i >= 0; i--) {
      out = out.split("\u0000c" + i + "\u0000").join(codes[i]);
    }
    return out;
  }

  // Strip stray SVG <text> wrappers that sometimes leak into pasted content.
  // Real diagrams in this app are drawn at runtime via createElementNS (pyviz.js),
  // never as Markdown, so a literal <text ...> / </text> here is always junk — e.g.
  // ASCII art pasted wrapped in <text preserveWhitespace>...</text>. Because the
  // renderer escapes HTML, those tags would otherwise show as visible garbage.
  // We drop the wrapper tags only, keeping the ASCII art between them intact.
  function stripLeakedSvgText(s) {
    return s.replace(/<\/?text\b[^>]*>/gi, "");
  }

  // --- Linked-list diagram -------------------------------------------------
  // A ```linkedlist fenced block renders a clean, theme-aware SVG instead of
  // ASCII art: value boxes joined by arrows, a `head` pointer, a `None`
  // terminator, and a curved back-arrow for a cycle. Syntax (one chain line):
  //   1 -> 2 -> 3 -> 4 -> None      (terminated list)
  //   1 -> 2 -> 3 -> 4 -> *2        (tail links back to the node labelled 2)
  // Arrows may be written -> or →. A trailing *<label> (or @<label>) marks the
  // node the tail points back to. Colours come from the app's CSS variables so
  // the diagram matches both themes.
  var llSeq = 0;
  function renderLinkedList(spec) {
    var raw = String(spec || "").replace(/\n+/g, " ").trim();
    if (!raw) return "";
    var parts = raw.split(/\s*(?:->|→)\s*/);
    var nodes = [];        // { label } for each real node
    var terminated = false;
    var cycleTo = -1;      // index of node the tail loops back to, or -1
    for (var pi = 0; pi < parts.length; pi++) {
      var tok = parts[pi].trim();
      if (tok === "") continue;
      if (/^(none|null|nil|∅)$/i.test(tok)) { terminated = true; continue; }
      if (tok.charAt(0) === "*" || tok.charAt(0) === "@") {
        var want = tok.slice(1).trim();
        for (var fi = 0; fi < nodes.length; fi++) {
          if (nodes[fi].label === want) { cycleTo = fi; break; }
        }
        if (cycleTo === -1) { var ix = parseInt(want, 10); if (!isNaN(ix) && ix >= 0 && ix < nodes.length) cycleTo = ix; }
        continue;
      }
      nodes.push({ label: tok });
    }
    var n = nodes.length;
    if (n === 0) return "";

    var boxW = 48, boxH = 34, gap = 34, topPad = 28;
    var boxTop = topPad, boxBottom = topPad + boxH, midY = topPad + boxH / 2;
    var bottomPad = cycleTo >= 0 ? 46 : 14;
    var totalH = boxBottom + bottomPad;
    function nodeX(i) { return 12 + i * (boxW + gap); }
    function cx(i) { return nodeX(i) + boxW / 2; }
    var lastRight = nodeX(n - 1) + boxW;
    var width = lastRight + (terminated ? gap + 46 : 14);

    var uid = "llm" + (++llSeq);
    var s = '<svg class="md-ll" viewBox="0 0 ' + width + ' ' + totalH +
      '" width="' + width + '" height="' + totalH +
      '" role="img" aria-label="Linked list diagram" xmlns="http://www.w3.org/2000/svg">';
    s += '<defs><marker id="' + uid + '" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">' +
      '<path d="M0,0 L8,4 L0,8 z" style="fill:var(--brand)"></path></marker>' +
      '<marker id="' + uid + 'c" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">' +
      '<path d="M0,0 L8,4 L0,8 z" style="fill:var(--brand-2)"></path></marker></defs>';

    // head pointer above the first node
    s += '<text x="' + cx(0) + '" y="12" text-anchor="middle" style="fill:var(--muted);font:600 11px var(--font,sans-serif)">head</text>';
    s += '<line x1="' + cx(0) + '" y1="16" x2="' + cx(0) + '" y2="' + (boxTop - 3) +
      '" style="stroke:var(--brand);stroke-width:1.5" marker-end="url(#' + uid + ')"></line>';

    // node boxes + value labels
    for (var i = 0; i < n; i++) {
      var x = nodeX(i);
      s += '<rect x="' + x + '" y="' + boxTop + '" width="' + boxW + '" height="' + boxH +
        '" rx="7" style="fill:var(--bg-2);stroke:var(--brand);stroke-width:1.5"></rect>';
      s += '<text x="' + (x + boxW / 2) + '" y="' + (midY + 4) +
        '" text-anchor="middle" style="fill:var(--text);font:600 13px ui-monospace,Menlo,Consolas,monospace">' +
        escapeHtml(nodes[i].label) + '</text>';
      if (i < n - 1) {
        s += '<line x1="' + (x + boxW) + '" y1="' + midY + '" x2="' + (nodeX(i + 1) - 2) + '" y2="' + midY +
          '" style="stroke:var(--brand);stroke-width:1.5" marker-end="url(#' + uid + ')"></line>';
      }
    }

    // terminator: arrow to a None cap
    if (terminated) {
      var tx = lastRight, ty = midY;
      s += '<line x1="' + tx + '" y1="' + ty + '" x2="' + (tx + gap - 2) + '" y2="' + ty +
        '" style="stroke:var(--brand);stroke-width:1.5" marker-end="url(#' + uid + ')"></line>';
      s += '<text x="' + (tx + gap + 4) + '" y="' + (ty + 4) +
        '" style="fill:var(--muted);font:600 12px ui-monospace,Menlo,Consolas,monospace">None</text>';
    }

    // cycle: curved back-arrow from the tail to the target node
    if (cycleTo >= 0) {
      var sxp = cx(n - 1), txp = cx(cycleTo), dip = boxBottom + 34;
      s += '<path d="M' + sxp + ',' + boxBottom + ' C' + sxp + ',' + dip + ' ' + txp + ',' + dip + ' ' + txp + ',' + (boxBottom + 3) +
        '" style="fill:none;stroke:var(--brand-2);stroke-width:1.5" marker-end="url(#' + uid + 'c)"></path>';
    }

    s += "</svg>";
    return '<figure class="md-ll-fig">' + s + "</figure>";
  }

  function render(md) {
    if (md == null) return "";
    var prot = protectMath(stripLeakedSvgText(String(md)));
    var src = escapeHtml(prot.src);
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
        if (lang === "linkedlist" || lang === "ll") {
          // buf was already HTML-escaped; renderLinkedList re-escapes labels, so
          // unescape the arrow/text source first to parse the chain cleanly.
          var llSrc = buf.join("\n").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
          var llSvg = renderLinkedList(llSrc);
          if (llSvg) { html.push(llSvg); continue; }
        }
        var cls = lang ? ' class="language-' + lang + '"' : "";
        html.push('<pre class="md-pre"><code' + cls + ">" + buf.join("\n") + "</code></pre>");
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
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        var lvl = h[1].length;
        html.push("<h" + lvl + ">" + inline(h[2]) + "</h" + lvl + ">");
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

      // unordered list
      if (/^\s*[-*]\s+/.test(line)) {
        var ul = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          ul.push("<li>" + inline(lines[i].replace(/^\s*[-*]\s+/, "")) + "</li>");
          i++;
        }
        html.push("<ul>" + ul.join("") + "</ul>");
        continue;
      }

      // ordered list
      if (/^\s*\d+\.\s+/.test(line)) {
        var ol = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          ol.push("<li>" + inline(lines[i].replace(/^\s*\d+\.\s+/, "")) + "</li>");
          i++;
        }
        html.push("<ol>" + ol.join("") + "</ol>");
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
        !/^#{1,6}\s/.test(lines[i]) &&
        !/^>\s?/.test(lines[i]) &&
        !/^!\[[^\]]*\]\([^)]+\)\s*$/.test(lines[i]) &&
        !/^\s*[-*]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i]) &&
        !/^\s*\|.*\|\s*$/.test(lines[i])
      ) {
        para.push(lines[i]);
        i++;
      }
      html.push("<p>" + inline(para.join("<br>")) + "</p>");
    }

    return restoreMath(html.join("\n"), prot.tokens);
  }

  window.BLIND75.md = render;
})();
