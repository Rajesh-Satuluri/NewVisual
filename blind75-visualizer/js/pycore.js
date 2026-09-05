/*
 * pycore.js — registry for the "Python for DSA" workspace.
 * Parallel to core.js (which powers the DSA problem set) so the two workspaces
 * never touch each other's data. Loaded BEFORE any data/python/*.js file so
 * register() exists when they run.
 */
(function () {
  // Display groups shown on the Python landing page, in order. Each topic that a
  // data/python/*.js file registers declares which section it belongs to.
  var SECTION_ORDER = [
    "Foundations",
    "Data Structures",
    "Core Python",
    "Object-Oriented Python",
    "Complexity",
    "DSA Toolkit"
  ];

  var SECTION_ICON = {
    "Foundations": "◇",
    "Data Structures": "▦",
    "Core Python": "λ",
    "Object-Oriented Python": "◎",
    "Complexity": "∆",
    "DSA Toolkit": "🧰"
  };

  // The full intended curriculum — lets the landing page show the whole map
  // (with "soon" badges) even before every topic is authored. A topic becomes
  // live the moment a data file registers it under the same title.
  var OUTLINE = [
    { section: "Foundations",     topics: ["Variables & Objects", "Numbers & Booleans", "Type Conversion"] },
    { section: "Data Structures", topics: ["Lists", "Strings", "Tuples", "Sets", "Dictionaries"] },
    { section: "Core Python",     topics: ["Functions", "Recursion", "Comprehensions", "Bit Manipulation", "Dynamic Programming"] },
    { section: "Object-Oriented Python", topics: [
        "Classes & Objects", "Instance State & __init__", "Methods: instance, class, static",
        "Encapsulation & Properties", "Inheritance & Polymorphism", "Dunder Methods",
        "Dataclasses", "Composition & Interfaces"
    ] },
    { section: "Complexity",      topics: ["Big-O by Example", "Operation Complexity"] },
    { section: "DSA Toolkit",     topics: ["deque", "Counter", "defaultdict", "heapq", "bisect", "functools · cache", "itertools", "math", "Custom Sorting"] }
  ];

  var registry = {};   // section -> [topic]
  var byId = {};       // topic id -> topic
  var byTitle = {};    // topic title -> topic

  window.PYDSA = {
    SECTION_ORDER: SECTION_ORDER,
    SECTION_ICON: SECTION_ICON,
    OUTLINE: OUTLINE,
    _registry: registry,

    register: function (section, topics) {
      if (!registry[section]) registry[section] = [];
      for (var i = 0; i < topics.length; i++) {
        var t = topics[i];
        t.section = section;
        registry[section].push(t);
        byId[t.id] = t;
        byTitle[t.title] = t;
      }
    },

    // Topics for one section, ordered to match the curriculum OUTLINE (so nav
    // order is stable regardless of which data file loaded first).
    sectionTopics: function (section) {
      var list = (registry[section] || []).slice();
      var order = null;
      for (var o = 0; o < OUTLINE.length; o++) if (OUTLINE[o].section === section) order = OUTLINE[o].topics;
      if (order) {
        list.sort(function (a, b) {
          var ia = order.indexOf(a.title), ib = order.indexOf(b.title);
          if (ia === -1) ia = 999; if (ib === -1) ib = 999;
          return ia - ib;
        });
      }
      return list;
    },

    all: function () {
      var out = [];
      for (var s = 0; s < SECTION_ORDER.length; s++) {
        out = out.concat(this.sectionTopics(SECTION_ORDER[s]));
      }
      for (var key in registry) {
        if (SECTION_ORDER.indexOf(key) === -1) out = out.concat(registry[key]);
      }
      return out;
    },

    byId: function (id) { return byId[id] || null; },
    byTitle: function (title) { return byTitle[title] || null; }
  };
})();
