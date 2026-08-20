/* Supply & Demand Planning Interview Q&A — renderer
   Data comes from data/questions.js which sets:
     window.QA_GROUPS = [{ id, title, questions: [{ question, answer, example }] }]
*/
(function () {
  var groups = window.QA_GROUPS || [];
  var nav = document.getElementById("nav");
  var content = document.getElementById("content");

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  if (!groups.length) {
    content.innerHTML = '<div class="loading">No questions loaded.</div>';
    return;
  }

  // Sidebar
  var navFrag = document.createDocumentFragment();
  groups.forEach(function (g) {
    var a = el("a");
    a.href = "#group-" + g.id;
    a.innerHTML =
      '<span class="gnum">' + esc(g.id) + '</span>' +
      '<span class="gname">' + esc(g.title) + '</span>' +
      '<span class="gcount">' + g.questions.length + '</span>';
    navFrag.appendChild(a);
  });
  nav.appendChild(navFrag);

  // Content
  content.innerHTML = "";
  var frag = document.createDocumentFragment();
  groups.forEach(function (g) {
    var sec = el("section", "group");
    sec.id = "group-" + g.id;
    sec.appendChild(
      el("h2", null, '<span class="gid">Group ' + esc(g.id) + '</span>' + esc(g.title))
    );
    sec.appendChild(el("div", "gmeta", g.questions.length + " questions"));

    g.questions.forEach(function (q) {
      var d = el("details", "qa");
      var sum = el("summary", null,
        '<span class="chev">▶</span><span>' + esc(q.question) + "</span>");
      d.appendChild(sum);
      var body = el("div", "body");
      body.appendChild(
        el("div", "block",
          '<div class="label ans">Interview answer</div>' +
          '<div class="text">' + esc(q.answer) + "</div>")
      );
      body.appendChild(
        el("div", "block",
          '<div class="label ex">Business case example</div>' +
          '<div class="text ex">' + esc(q.example) + "</div>")
      );
      d.appendChild(body);
      sec.appendChild(d);
    });
    frag.appendChild(sec);
  });
  content.appendChild(frag);

  // Controls
  function setAll(open) {
    document.querySelectorAll("details.qa").forEach(function (d) { d.open = open; });
  }
  document.getElementById("expandAll").addEventListener("click", function () { setAll(true); });
  document.getElementById("collapseAll").addEventListener("click", function () { setAll(false); });

  // Total count in subtitle
  var total = groups.reduce(function (n, g) { return n + g.questions.length; }, 0);
  var sub = document.querySelector("header.top .sub");
  if (sub) sub.textContent =
    total + " questions across " + groups.length +
    " topic groups. Each has a plain-English answer and a business-case example.";
})();
