/* ============================================================
   modules/pagination.js — Pagination Simulator
   Page/limit, offset/limit, and cursor pagination over ~320
   simulated orders, with filtering + sorting, live metadata, and
   an "insert a row between pages" demo that shows why offset
   paging duplicates/skips while cursor paging stays stable.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var module = {
    id: "pagination",
    title: "Pagination Simulator",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("intermediate");
      AV.data.store.reset();

      var state = { strategy: "page", limit: 10, page: 0, offset: 0, cursor: null, sort: "createdAt", dir: "asc", status: "", region: "" };

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">REST Design Studio</div>' +
          '<h1 class="module-title">Return thousands of orders without melting the database</h1>' +
          '<p class="module-subtitle">A support agent opens a customer with 2,000 orders. You can\'t send them all at once. Compare the three pagination strategies on a live dataset of ~320 orders — then insert a row mid-scroll and watch which strategy breaks.</p></div>' +

        '<div class="panel"><div class="panel-title">Controls</div><div class="pg-controls">' +
          '<div class="field"><label>Strategy</label><div class="segmented" id="pg-strategy">' +
            '<button class="active" data-s="page">page + limit</button><button data-s="offset">offset + limit</button><button data-s="cursor">cursor</button></div></div>' +
          '<div class="field"><label>Page size</label><select class="select" id="pg-limit"><option>5</option><option selected>10</option><option>20</option><option>50</option><option>200</option></select></div>' +
          '<div class="field"><label>Filter status</label><select class="select" id="pg-status"><option value="">any</option>' + ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"].map(function (s) { return "<option>" + s + "</option>"; }).join("") + "</select></div>" +
          '<div class="field"><label>Filter region</label><select class="select" id="pg-region"><option value="">any</option>' + ["IN", "US", "EU", "APAC"].map(function (s) { return "<option>" + s + "</option>"; }).join("") + "</select></div>" +
          '<div class="field"><label>Sort by</label><select class="select" id="pg-sort"><option value="createdAt">date</option><option value="total">total</option><option value="status">status</option></select></div>' +
        "</div></div>" +

        '<div class="lab-2col wide-right" style="margin-top:var(--space-4)">' +
          '<div class="panel"><div class="pg-nav"><button class="btn btn-ghost btn-sm" id="pg-first">⏮ First</button>' +
            '<button class="btn btn-ghost btn-sm" id="pg-prev">← Prev</button>' +
            '<span id="pg-pageinfo" class="mono"></span>' +
            '<button class="btn btn-ghost btn-sm" id="pg-next">Next →</button></div>' +
            '<div id="pg-table" style="overflow-x:auto;margin-top:var(--space-3)"></div></div>' +
          '<aside class="sticky-side"><div class="panel"><div class="panel-title">Request &amp; response metadata</div><div id="pg-meta"></div></div>' +
            '<div class="panel"><div class="panel-title">Mid-scroll mutation test</div>' +
              '<p class="panel-sub">Insert a brand-new <i>old-dated</i> order at the start of the list, then press Next and see what each strategy does.</p>' +
              '<button class="btn btn-primary btn-sm" id="pg-insert">➕ Insert an order at the top</button>' +
              '<div id="pg-mutate" style="margin-top:var(--space-3)"></div></div>' +
          "</aside>" +
        "</div>" +

        '<section class="section" style="margin-top:var(--space-6)"><h2 class="section-title">How they differ</h2>' +
          '<div class="note-grid">' +
            noteCard("page + limit", "?page=3&limit=10", ["Simple mental model for UIs with page numbers.", "Same drift problem as offset — it's offset in disguise (offset = page × limit)."]) +
            noteCard("offset + limit", "?offset=30&limit=10", ["Flexible jumping to any position.", "Large offsets get slow — the DB still scans/skips all preceding rows.", "Inserts/deletes between pages cause duplicates or skipped rows."]) +
            noteCard("cursor", "?cursor=<last-key>&limit=10", ["Stable under inserts/deletes — pages off a real sort key.", "Scales: an index on the sort key makes each page cheap.", "Needs a stable, unique ordering; can't jump to an arbitrary page number."]) +
          "</div>" +
          '<div class="callout info" style="margin-top:var(--space-4)"><span class="callout-icon">🧪</span><div class="callout-body"><b>Edge cases to remember:</b> cap the page size (reject <code>limit=10000</code>); reject or ignore an invalid/garbled cursor; and make the sort order <b>total</b> (tie-break by id) so the cursor is deterministic.</div></div>' +
        "</section>";

      var tableEl = container.querySelector("#pg-table");
      var metaEl = container.querySelector("#pg-meta");
      var pageInfo = container.querySelector("#pg-pageinfo");
      var mutateEl = container.querySelector("#pg-mutate");

      function filtered() {
        var rows = AV.data.store.orders.filter(function (o) {
          return (!state.status || o.status === state.status) && (!state.region || o.region === state.region);
        });
        rows = rows.slice().sort(function (a, b) {
          var av = a[state.sort], bv = b[state.sort];
          if (av < bv) return -1; if (av > bv) return 1;
          return a.orderId < b.orderId ? -1 : 1; // stable tie-break
        });
        return rows;
      }

      function keyOf(o) { return o[state.sort] + "|" + o.orderId; }

      function fetchPage() {
        var rows = filtered();
        var total = rows.length, out, meta;
        if (state.strategy === "cursor") {
          var start = 0;
          if (state.cursor) { for (var i = 0; i < rows.length; i++) { if (keyOf(rows[i]) === state.cursor) { start = i + 1; break; } } }
          out = rows.slice(start, start + state.limit);
          var nextCursor = out.length === state.limit && (start + state.limit) < total ? keyOf(out[out.length - 1]) : null;
          meta = { total: total, returned: out.length, hasNext: !!nextCursor, nextCursor: nextCursor, start: start };
        } else {
          var offset = state.strategy === "page" ? state.page * state.limit : state.offset;
          out = rows.slice(offset, offset + state.limit);
          meta = { total: total, returned: out.length, hasNext: offset + state.limit < total, offset: offset };
        }
        return { rows: out, meta: meta };
      }

      function render() {
        var r = fetchPage();
        tableEl.innerHTML = r.rows.length ? '<table class="dtable"><thead><tr><th>orderId</th><th>status</th><th>region</th><th>total</th><th>createdAt</th></tr></thead><tbody>' +
          r.rows.map(function (o) { return '<tr' + (o._new ? ' class="row-new"' : "") + '><td class="mono">' + o.orderId + "</td><td>" + o.status + "</td><td>" + o.region + '</td><td class="mono">' + o.total + "</td><td class=\"mono\">" + o.createdAt.slice(0, 10) + "</td></tr>"; }).join("") +
          "</tbody></table>" : '<p class="text-muted">No rows on this page.</p>';

        var m = r.meta;
        var url = "/v1/orders?limit=" + state.limit + (state.status ? "&status=" + state.status : "") + (state.region ? "&region=" + state.region : "");
        if (state.strategy === "page") url += "&page=" + state.page;
        else if (state.strategy === "offset") url += "&offset=" + state.offset;
        else if (state.cursor) url += "&cursor=" + encodeURIComponent(state.cursor);
        metaEl.innerHTML =
          '<div class="http-msg"><div class="http-msg-body"><span class="method-pill m-get">GET</span> <span class="mono">' + esc(url) + "</span></div></div>" +
          '<dl class="kv" style="margin-top:var(--space-3)"><dt>total matching</dt><dd class="mono">' + m.total + "</dd>" +
          "<dt>returned</dt><dd class=\"mono\">" + m.returned + "</dd>" +
          (state.strategy === "cursor"
            ? "<dt>next cursor</dt><dd class=\"mono\">" + (m.nextCursor ? esc(m.nextCursor) : "(end)") + "</dd>"
            : "<dt>offset</dt><dd class=\"mono\">" + m.offset + "</dd>") +
          "<dt>has next</dt><dd>" + (m.hasNext ? "yes" : "no") + "</dd></dl>" +
          (state.strategy !== "cursor" && m.offset >= 100 ? '<div class="callout warn" style="margin-top:var(--space-3)"><span class="callout-icon">🐢</span><div class="callout-body">Large offset (' + m.offset + "): the DB must scan and skip all preceding rows — this gets slower the deeper you page.</div></div>" : "");

        var pageNum = state.strategy === "page" ? state.page : state.strategy === "offset" ? Math.floor(state.offset / state.limit) : "—";
        pageInfo.textContent = state.strategy === "cursor" ? "cursor page" : "page " + (typeof pageNum === "number" ? pageNum + 1 : pageNum);
      }

      // controls
      container.querySelector("#pg-strategy").addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        container.querySelectorAll("#pg-strategy button").forEach(function (x) { x.classList.toggle("active", x === b); });
        state.strategy = b.getAttribute("data-s"); state.page = 0; state.offset = 0; state.cursor = null; render();
      });
      container.querySelector("#pg-limit").addEventListener("change", function (e) { state.limit = parseInt(e.target.value, 10); state.page = 0; state.offset = 0; state.cursor = null; render(); });
      container.querySelector("#pg-status").addEventListener("change", function (e) { state.status = e.target.value; reset(); });
      container.querySelector("#pg-region").addEventListener("change", function (e) { state.region = e.target.value; reset(); });
      container.querySelector("#pg-sort").addEventListener("change", function (e) { state.sort = e.target.value; reset(); });
      function reset() { state.page = 0; state.offset = 0; state.cursor = null; render(); }

      container.querySelector("#pg-first").addEventListener("click", reset);
      container.querySelector("#pg-prev").addEventListener("click", function () {
        if (state.strategy === "page") state.page = Math.max(0, state.page - 1);
        else if (state.strategy === "offset") state.offset = Math.max(0, state.offset - state.limit);
        else { mutateEl.innerHTML = note("Cursor paging is forward-only here — press First to restart.", "info"); return; }
        render();
      });
      container.querySelector("#pg-next").addEventListener("click", function () {
        var r = fetchPage();
        if (!r.meta.hasNext) return;
        if (state.strategy === "page") state.page++;
        else if (state.strategy === "offset") state.offset += state.limit;
        else state.cursor = r.meta.nextCursor;
        render();
      });

      container.querySelector("#pg-insert").addEventListener("click", function () {
        // Insert an order dated before everything so it lands at the START of
        // an ascending sort — shifting every offset by one.
        var o = { orderId: "ORD-NEW" + (Math.floor(Date.now() / 1000) % 10000), customerId: "C1024", status: state.status || "PENDING", total: 9999, currency: "INR", region: state.region || "IN", createdAt: "2023-12-01T00:00:00.000Z", items: [], _new: true };
        AV.data.store.orders.push(o);
        if (state.strategy === "cursor") {
          mutateEl.innerHTML = note("Inserted an older order at the start. Because the cursor points at a real sort key, your next page is <b>unaffected</b> — no duplicate, no skip. That's the whole point of cursor pagination.", "tip");
        } else {
          mutateEl.innerHTML = note("Inserted an older order at the start. Every offset just shifted by one — so paging with " + state.strategy + " will now <b>repeat a row</b> you already saw (or skip one going the other way). Press First, then Next, to see the drift.", "warn");
        }
        render();
      });

      render();

      function note(msg, kind) { var icon = kind === "tip" ? "✅" : kind === "warn" ? "⚠️" : "ℹ️"; return '<div class="callout ' + kind + '"><span class="callout-icon">' + icon + '</span><div class="callout-body">' + msg + "</div></div>"; }
    },
    destroy: function () { AV.data.store.reset(); }
  };

  function noteCard(title, ex, pts) { return '<div class="panel"><div class="panel-title">' + title + '</div><div class="http-msg"><div class="http-msg-body mono">' + ex + "</div></div><ul class=\"tick-list\" style=\"margin-top:var(--space-3)\">" + pts.map(function (p) { return "<li>" + p + "</li>"; }).join("") + "</ul></div>"; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  AV.registerModule(module);
})();
