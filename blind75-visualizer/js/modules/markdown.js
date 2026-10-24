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
        parts[i] = parts[i]
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
          .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
          .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
      }
    }
    return parts.join("");
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

    return html.join("\n");
  }

  window.BLIND75.md = render;
})();
