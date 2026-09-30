/* ============================================================
   code-viewer.js — syntax-highlighted code panel
   DBLab.CodeViewer.create({ title, lang, code, highlights })
   Returns a .code-block element. Lightweight highlighter that
   understands both SQL and Python (DB examples are mostly SQL).
   Ported from the Airflow Visualizer; namespace → DBLab.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // SQL + Python keywords merged (case-insensitive match handled below for SQL).
  var KW = [
    // SQL
    "SELECT","FROM","WHERE","INSERT","INTO","VALUES","UPDATE","SET","DELETE",
    "BEGIN","START","TRANSACTION","COMMIT","ROLLBACK","SAVEPOINT","AND","OR","NOT",
    "JOIN","INNER","LEFT","RIGHT","OUTER","ON","GROUP","BY","ORDER","HAVING","LIMIT",
    "CREATE","TABLE","INDEX","PRIMARY","KEY","FOREIGN","REFERENCES","ALTER","DROP",
    "AS","DISTINCT","COUNT","SUM","AVG","MIN","MAX","IN","BETWEEN","LIKE","IS","NULL",
    "ISOLATION","LEVEL","READ","WRITE","COMMITTED","UNCOMMITTED","REPEATABLE",
    "SERIALIZABLE","SNAPSHOT","FOR","SHARE","NOWAIT","RETURNING","VACUUM","ANALYZE",
    "EXPLAIN","WITH","CASE","WHEN","THEN","ELSE","END",
    // Python
    "def","class","import","return","with","for","if","elif","while","lambda","None","True","False"
  ].join("|");

  var RE = new RegExp(
    [
      "(--.*$|#.*$)",                                    // 1 comment (SQL -- or Python #)
      "('(?:[^'\\\\]|\\\\.)*'|\"(?:[^\"\\\\]|\\\\.)*\")",// 2 string
      "(@[A-Za-z_][\\w.]*)",                            // 3 decorator
      "\\b(" + KW + ")\\b",                             // 4 keyword
      "\\b([A-Za-z_]\\w*)(?=\\s*\\()",                  // 5 function call
      "\\b(\\d+\\.?\\d*)\\b"                             // 6 number
    ].join("|"),
    "gmi"
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
        "<span>" + esc(opts.lang || "sql") + "</span>";
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

  DL.CodeViewer = { create: create, highlight: highlight };
})();
