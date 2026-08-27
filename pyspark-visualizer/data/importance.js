/*
 * importance.js — interview-importance tier per problem, keyed by question number (lc).
 * A curated ESTIMATE of study priority independent of difficulty:
 *   "essential" (★★★) — asked constantly; know cold.
 *   "common"    (★★)  — shows up regularly.
 *   "occasional"(★)   — nice to know, rarer.
 * Curated from PySpark interview-frequency consensus (core DataFrame ops, common
 * aggregation/window patterns). Labeled in the UI as a curated estimate, not a live feed.
 * Add EVERY problem's number here so coverage stays 100%.
 */
(function () {
  window.PYSPARK.IMPORTANCE = {
    // DataFrame Basics (Q1–Q20)
    1: "essential", 2: "common", 3: "essential", 4: "essential", 5: "common",
    6: "essential", 7: "common", 8: "occasional", 9: "common", 10: "common",
    11: "common", 12: "essential", 13: "common", 14: "common", 15: "common",
    16: "common", 17: "essential", 18: "common", 19: "essential", 20: "common",
    // Aggregations & GroupBy (Q21–Q26, Q33–Q35, Q40, Q42, Q43)
    21: "essential", 22: "essential", 23: "common", 24: "essential", 25: "common",
    26: "common", 33: "essential", 34: "common", 35: "essential", 40: "essential",
    42: "common", 43: "common"
  };
})();
