/* ============================================================
   modules/json-lab.js — JSON Laboratory
   Live editor + validator: parse on input, report the error with
   position, pretty-print valid JSON, and teach the common mistakes
   (trailing commas, single quotes, unquoted keys, NaN).
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var SAMPLES = {
    valid: '{\n  "orderId": "ORD-10025",\n  "status": "PENDING",\n  "total": 29980,\n  "currency": "INR",\n  "items": [\n    { "productId": "P501", "quantity": 2 }\n  ],\n  "gift": false,\n  "coupon": null\n}',
    trailing: '{\n  "orderId": "ORD-10025",\n  "items": [\n    { "productId": "P501", "quantity": 2 },\n  ]\n}',
    quotes: "{\n  'orderId': 'ORD-10025',\n  status: 'PENDING'\n}",
    nan: '{\n  "total": NaN,\n  "discount": 0.1,\n}'
  };

  var MISTAKES = [
    ["Trailing comma", "A comma after the last item/property. Valid in JS, invalid in JSON.", '… 2 }<b style="color:var(--red)">,</b> ]'],
    ["Single quotes", "JSON strings and keys must use double quotes.", "<b style=\"color:var(--red)\">'orderId'</b> → \"orderId\""],
    ["Unquoted keys", "Every key must be a quoted string.", '<b style="color:var(--red)">status</b>: → "status":'],
    ["NaN / Infinity / undefined", "Not valid JSON values. Use null or a number.", '"total": <b style="color:var(--red)">NaN</b>'],
    ["Comments", "JSON has no comments (// or /* */).", 'remove <b style="color:var(--red)">// note</b>']
  ];

  var module = {
    id: "json-lab",
    title: "JSON Laboratory",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("beginner");
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Fundamentals</div>' +
          '<h1 class="module-title">JSON — the shape every client parses</h1>' +
          '<p class="module-subtitle">JSON is the lingua franca of web APIs. It looks like JavaScript but is stricter. Edit below and watch it validate live; load a broken sample to see the exact error a server would reject.</p></div>' +

        '<div class="chiprow" style="margin-bottom:var(--space-3)">' +
          '<button class="chip" data-s="valid">Valid order</button>' +
          '<button class="chip" data-s="trailing">Trailing comma</button>' +
          '<button class="chip" data-s="quotes">Single quotes</button>' +
          '<button class="chip" data-s="nan">NaN + comma</button>' +
        "</div>" +

        '<div class="lab-2col">' +
          '<div class="panel"><div class="panel-title">Editor</div>' +
            '<textarea class="textarea mono" id="jl-input" spellcheck="false" rows="16"></textarea></div>' +
          '<div class="panel"><div class="panel-title">Result</div><div id="jl-out"></div></div>' +
        "</div>" +

        '<section class="section" style="margin-top:var(--space-6)"><h2 class="section-title">Common mistakes</h2>' +
          '<div class="note-grid">' + MISTAKES.map(function (m) {
            return '<div class="panel"><div class="panel-title">' + m[0] + "</div><p>" + m[1] + '</p><div class="http-msg"><div class="http-msg-body mono">' + m[2] + "</div></div></div>";
          }).join("") + "</div>" +
          '<div class="callout info" style="margin-top:var(--space-4)"><span class="callout-icon">🧩</span><div class="callout-body"><b>Types JSON supports:</b> object <code>{}</code>, array <code>[]</code>, string, number, <code>true</code>/<code>false</code>, and <code>null</code>. No dates, no comments, no trailing commas, no functions. Serialization turns a value into this text; deserialization (parsing) turns the text back into a value.</div></div>' +
        "</section>";

      var input = container.querySelector("#jl-input");
      var out = container.querySelector("#jl-out");

      function validate() {
        var txt = input.value;
        if (!txt.trim()) { out.innerHTML = '<p class="text-muted">Type or paste JSON to validate.</p>'; return; }
        try {
          var parsed = JSON.parse(txt);
          out.innerHTML =
            '<div class="callout tip"><span class="callout-icon">✅</span><div class="callout-body"><b>Valid JSON.</b> Parsed to a ' + jsType(parsed) + ".</div></div>" +
            '<div class="http-msg" style="margin-top:var(--space-3)"><div class="http-msg-head"><span>Pretty-printed</span><span>formatted</span></div><div class="http-msg-body">' + AV.fmtJSON(parsed) + "</div></div>";
        } catch (e) {
          var pos = (e.message.match(/position (\d+)/) || [])[1];
          var where = "";
          if (pos !== undefined) {
            var p = parseInt(pos, 10);
            var upto = txt.slice(0, p);
            var line = upto.split("\n").length;
            var col = p - upto.lastIndexOf("\n");
            where = " <span class=\"text-muted\">(around line " + line + ", column " + col + ")</span>";
            var snippet = txt.slice(Math.max(0, p - 20), p) + "⟪" + (txt[p] || "⏎") + "⟫" + txt.slice(p + 1, p + 20);
            where += '<div class="http-msg" style="margin-top:var(--space-2)"><div class="http-msg-body mono">' + esc(snippet) + "</div></div>";
          }
          out.innerHTML = '<div class="callout danger"><span class="callout-icon">🚫</span><div class="callout-body"><b>Invalid JSON.</b> ' + esc(e.message) + where + "</div></div>" +
            '<p class="text-muted text-sm" style="margin-top:var(--space-3)">A server would reject this with <span class="status-pill st-4xx">400</span> Bad Request before any business logic runs.</p>';
        }
      }

      container.querySelector(".chiprow").addEventListener("click", function (e) {
        var b = e.target.closest(".chip"); if (!b) return;
        container.querySelectorAll(".chiprow .chip").forEach(function (x) { x.classList.toggle("active", x === b); });
        input.value = SAMPLES[b.getAttribute("data-s")]; validate();
      });
      input.addEventListener("input", validate);
      input.value = SAMPLES.valid;
      container.querySelector('.chip[data-s="valid"]').classList.add("active");
      validate();
    },
    destroy: function () {}
  };

  function jsType(v) { return Array.isArray(v) ? "array (" + v.length + " items)" : v === null ? "null" : typeof v === "object" ? "object (" + Object.keys(v).length + " keys)" : typeof v; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  AV.registerModule(module);
})();
