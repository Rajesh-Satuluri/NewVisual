/* ============================================================
   code-viewer.js — syntax-highlighted code panel
   AirflowViz.CodeViewer.create({ title, lang, code, highlights })
   Returns a .code-block element. Lightweight Python highlighter.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // Only <, >, & need escaping — code goes into element text, not attributes.
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var RE = new RegExp(
    [
      "(#.*$)",                                   // 1 comment
      "('(?:[^'\\\\]|\\\\.)*'|\"(?:[^\"\\\\]|\\\\.)*\")", // 2 string
      "(@[A-Za-z_][\\w.]*)",                     // 3 decorator
      "\\b(def|class|import|from|as|return|with|for|in|if|elif|else|try|except|finally|raise|while|pass|yield|lambda|and|or|not|is|None|True|False|await|async)\\b", // 4 keyword
      "\\b([A-Za-z_]\\w*)(?=\\s*\\()",           // 5 function call
      "\\b(\\d+\\.?\\d*)\\b"                      // 6 number
    ].join("|"),
    "gm"
  );

  function highlight(rawLine) {
    return esc(rawLine).replace(RE, function (m, comment, str, deco, kw, fn, num) {
      if (comment) return '<span class="tok-comment">' + comment + "</span>";
      if (str) return '<span class="tok-string">' + str + "</span>";
      if (deco) return '<span class="tok-deco">' + deco + "</span>";
      if (kw) return '<span class="tok-keyword">' + kw + "</span>";
      if (fn) return '<span class="tok-func">' + fn + "</span>";
      if (num) return '<span class="tok-num">' + num + "</span>";
      return m;
    });
  }

  function create(opts) {
    opts = opts || {};
    var highlights = opts.highlights || [];
    var lines = String(opts.code || "").split("\n");

    var block = document.createElement("div");
    block.className = "code-block";

    if (opts.title || opts.lang) {
      var header = document.createElement("div");
      header.className = "code-block-header";
      header.innerHTML =
        "<span>" + esc(opts.title || "") + "</span>" +
        "<span>" + esc(opts.lang || "python") + "</span>";
      block.appendChild(header);
    }

    var body = document.createElement("div");
    body.className = "code-block-body";
    var code = document.createElement("code");
    code.innerHTML = lines
      .map(function (ln, i) {
        var cls = "code-line" + (highlights.indexOf(i + 1) !== -1 ? " highlight" : "");
        return '<span class="' + cls + '">' + (highlight(ln) || "&nbsp;") + "</span>";
      })
      .join("");
    body.appendChild(code);
    block.appendChild(body);
    return block;
  }

  AV.CodeViewer = { create: create, highlight: highlight };
})();
