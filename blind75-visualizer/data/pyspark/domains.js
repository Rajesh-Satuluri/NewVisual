/*
 * domains.js — a SECOND lens over the PySpark practice problems.
 *
 * The default sidebar groups problems by PATTERN (DataFrame Basics, Joins,
 * Window Functions, …) — how you solve them. This file adds the DOMAIN lens —
 * WHAT the problem is about: the business dataset an interviewer frames it in
 * (employees, orders, sessions, …). Flip "Group by: Pattern | Domain" in the
 * practice sidebar to re-bucket the exact same problems by subject.
 *
 * Keyed by question number (lc), mirroring importance.js. Every practice
 * problem's lc MUST appear exactly once so coverage stays 100% in both lenses.
 * Curated estimate of subject, not a live feed.
 */
(function () {
  if (!window.PYSPARK) return;

  // Canonical domain order for the sidebar (entity/analytical domains first,
  // then the cross-cutting technical ones).
  var ORDER = [
    "Employees & Org",
    "Orders & Revenue",
    "Customers & Users",
    "Events, Sessions & Retention",
    "Text, Arrays & JSON",
    "Data Quality & Debugging",
    "Streaming & Lakehouse",
    "Core DataFrame API",
    "Performance & Tuning"
  ];

  var ICON = {
    "Employees & Org": "👔",
    "Orders & Revenue": "🧾",
    "Customers & Users": "👥",
    "Events, Sessions & Retention": "🖱",
    "Text, Arrays & JSON": "🔤",
    "Data Quality & Debugging": "🧹",
    "Streaming & Lakehouse": "🌊",
    "Core DataFrame API": "⚙",
    "Performance & Tuning": "⚡"
  };

  // Authored per domain as lc lists, then flattened to lc -> domain below.
  var BY_DOMAIN = {
    "Employees & Org": [
      4, 5, 6, 9, 10, 17, 33, 34, 35, 55,
      61, 62, 63, 64, 65, 240, 241, 270, 271, 272,
      273, 274, 275, 308
    ],
    "Orders & Revenue": [
      18, 19, 21, 22, 23, 24, 25, 26, 40, 42,
      43, 44, 51, 52, 54, 56, 57, 71, 73, 74,
      75, 76, 77, 78, 80, 88, 89, 90, 91, 92,
      93, 96, 119, 133, 155, 156, 157, 160, 201, 209,
      260
    ],
    "Customers & Users": [
      11, 12, 14, 53, 68, 69, 70, 83, 84, 159,
      307, 309
    ],
    "Events, Sessions & Retention": [
      85, 86, 100, 104, 158, 205, 210, 261, 280, 281,
      282, 283, 301, 302, 303, 304, 306
    ],
    "Text, Arrays & JSON": [
      111, 112, 113, 114, 115, 116, 117, 118, 202, 230,
      231, 232, 233, 234, 235, 236, 237
    ],
    "Data Quality & Debugging": [
      206, 250, 251, 252, 253, 254, 255, 256, 284, 285,
      286, 287, 288, 289, 290, 291, 292, 293, 294, 295,
      296
    ],
    "Streaming & Lakehouse": [
      203, 204, 211, 212, 213, 214, 215, 216, 217, 218,
      219, 220, 221, 222
    ],
    "Core DataFrame API": [
      1, 2, 3, 7, 8, 13, 15, 16, 20, 58,
      208, 242, 243, 244, 245, 246, 262, 263, 264, 265,
      297, 298, 299, 300, 305
    ],
    "Performance & Tuning": [
      141, 142, 145, 146, 148, 149, 150, 152, 153, 154,
      207
    ]
  };

  var DOMAINS = {};
  ORDER.forEach(function (dom) {
    (BY_DOMAIN[dom] || []).forEach(function (lc) { DOMAINS[lc] = dom; });
  });

  window.PYSPARK.DOMAINS = DOMAINS;
  window.PYSPARK.DOMAIN_ORDER = ORDER;
  window.PYSPARK.DOMAIN_ICON = ICON;
})();
