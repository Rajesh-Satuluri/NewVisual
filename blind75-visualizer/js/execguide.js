/*
 * execguide.js — a template-free, TEXT-ONLY renderer for long-form Learn guides.
 * A "chapter" is a normal window.LEARN topic that carries a `blocks` array instead
 * of the card schema. conceptlab.js delegates any topic with `blocks` to
 * ExecGuide.render(). Blocks are plain text/structure — no diagrams or visuals:
 *   heading | prose | code | callout | keynumbers | steps | table | qa
 * Navigation reuses the existing Learn sidebar; each chapter also gets an
 * "On this page" anchor list and prev/next chapter links.
 */
(function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function slug(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  var CALLOUT_LABEL = { note: "Note", trap: "Common trap", interview: "In an interview", analogy: "Think of it like…", why: "Why it matters" };

  var CALLOUT_KINDS = { analogy: 1, why: 1, trap: 1, interview: 1, note: 1 };

  function renderBlock(b) {
    if (!b || !b.type) return null;
    // shorthand: a callout kind used directly as the block type
    if (CALLOUT_KINDS[b.type]) b = { type: "callout", kind: b.type, html: b.html };
    switch (b.type) {
      case "heading": {
        var lvl = b.level === 3 ? 3 : 2;
        var id = b.id || slug(b.text);
        return h("h" + lvl, { class: "eg-h" + lvl, id: id }, esc(b.text));
      }
      case "prose":
        return h("p", { class: "eg-p" }, b.html || "");
      case "code": {
        var wrap = h("div", { class: "eg-code-wrap" });
        wrap.appendChild(h("pre", { class: "eg-code" }, "<code>" + esc(b.code) + "</code>"));
        return wrap;
      }
      case "callout": {
        var kind = b.kind || "note";
        var box = h("div", { class: "eg-callout eg-" + kind });
        box.appendChild(h("div", { class: "eg-callout-tag" }, esc(CALLOUT_LABEL[kind] || "Note")));
        box.appendChild(h("div", { class: "eg-callout-body" }, b.html || ""));
        return box;
      }
      case "keynumbers": {
        var keys = h("div", { class: "eg-keys" });
        (b.items || []).forEach(function (it) {
          keys.appendChild(h("span", { class: "eg-key" }, "<b>" + esc(it.num) + "</b> " + esc(it.label)));
        });
        return keys;
      }
      case "steps": {
        var ol = h("ol", { class: "eg-steps" });
        (b.items || []).forEach(function (it) { ol.appendChild(h("li", {}, it)); });
        return ol;
      }
      case "table": {
        var t = h("div", { class: "eg-table-wrap" });
        var tbl = h("table", { class: "eg-table" });
        var thead = "<thead><tr>" + (b.headers || []).map(function (x) { return "<th>" + esc(x) + "</th>"; }).join("") + "</tr></thead>";
        var body = "<tbody>" + (b.rows || []).map(function (r) {
          return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>";
        }).join("") + "</tbody>";
        tbl.innerHTML = thead + body;
        t.appendChild(tbl);
        return t;
      }
      case "qa": {
        var d = h("details", { class: "eg-qa" });
        d.appendChild(h("summary", { class: "eg-qa-q" }, esc(b.q)));
        d.appendChild(h("div", { class: "eg-qa-a" }, b.a || ""));
        return d;
      }
      default:
        return null;
    }
  }

  function render(topic) {
    var main = document.getElementById("main");
    if (!main) return;
    main.innerHTML = "";

    var stack = topic.stack || "spark";
    var section = topic.section;
    var chapters = (window.LEARN && window.LEARN.sectionTopics) ? window.LEARN.sectionTopics(stack, section) : [topic];
    var idx = 0;
    for (var i = 0; i < chapters.length; i++) if (chapters[i].id === topic.id) idx = i;
    var N = chapters.length;

    var wrap = h("div", { class: "eg-chapter" });

    // header
    var head = h("div", { class: "eg-head" });
    head.appendChild(h("div", { class: "eg-kicker" }, "SPARK EXECUTION GUIDE · Chapter " + (idx + 1) + " of " + N));
    head.appendChild(h("h1", { class: "eg-title" }, esc(topic.title)));
    if (topic.tagline) head.appendChild(h("p", { class: "eg-tagline" }, topic.tagline));
    if (topic.estMinutes) head.appendChild(h("div", { class: "eg-readtime" }, "≈ " + topic.estMinutes + " min read"));
    wrap.appendChild(head);

    // "On this page" — anchors from level-2 headings
    var h2s = (topic.blocks || []).filter(function (b) { return b.type === "heading" && (b.level || 2) === 2; });
    if (h2s.length > 1) {
      var toc = h("nav", { class: "eg-toc" });
      toc.appendChild(h("div", { class: "eg-toc-h" }, "On this page"));
      var ul = h("ul", {});
      h2s.forEach(function (b) {
        var id = b.id || slug(b.text);
        var li = h("li", {});
        var a = h("a", { href: "#" + id }, esc(b.text));
        a.addEventListener("click", function (e) {
          e.preventDefault();
          var target = document.getElementById(id);
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        li.appendChild(a); ul.appendChild(li);
      });
      toc.appendChild(ul); wrap.appendChild(toc);
    }

    // body blocks
    var body = h("div", { class: "eg-body" });
    (topic.blocks || []).forEach(function (b) {
      var node = renderBlock(b);
      if (node) body.appendChild(node);
    });
    wrap.appendChild(body);

    // prev / next
    var navRow = h("div", { class: "eg-navrow" });
    var prev = chapters[idx - 1], next = chapters[idx + 1];
    if (prev) {
      var pb = h("button", { class: "eg-nav-btn eg-prev" }, "<span class='eg-nav-dir'>← Previous</span><span class='eg-nav-t'>" + esc(prev.title) + "</span>");
      pb.addEventListener("click", function () { window.BLIND75.goTo("learn", stack, prev.id); });
      navRow.appendChild(pb);
    } else { navRow.appendChild(h("span", {})); }
    if (next) {
      var nb = h("button", { class: "eg-nav-btn eg-next" }, "<span class='eg-nav-dir'>Next →</span><span class='eg-nav-t'>" + esc(next.title) + "</span>");
      nb.addEventListener("click", function () { window.BLIND75.goTo("learn", stack, next.id); });
      navRow.appendChild(nb);
    }
    wrap.appendChild(navRow);

    main.appendChild(wrap);
    main.scrollTop = 0;
  }

  window.ExecGuide = { render: render };
})();
