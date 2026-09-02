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
    42: "common", 43: "common",
    // Joins (Q51–Q58)
    51: "essential", 52: "essential", 53: "common", 54: "common", 55: "common",
    56: "common", 57: "common", 58: "common",
    // Window Functions (Q71, Q73–Q77, Q89, Q90)
    71: "essential", 73: "common", 74: "essential", 75: "common", 76: "common",
    77: "common", 89: "common", 90: "occasional",
    // Ranking & Dedup (Q61–Q65, Q68–Q70)
    61: "essential", 62: "common", 63: "occasional", 64: "essential", 65: "essential",
    68: "essential", 69: "common", 70: "common",
    // Date & Time (Q44, Q78, Q83, Q84, Q92, Q93, Q100, Q119)
    44: "common", 78: "common", 83: "common", 84: "common", 92: "essential",
    93: "common", 100: "common", 119: "common",
    // Arrays, JSON & Nested (Q111–Q118)
    111: "essential", 112: "common", 113: "common", 114: "common", 115: "essential",
    116: "common", 117: "common", 118: "occasional",
    // Cohort & Time-Series (Q80, Q85, Q86, Q88, Q91, Q96, Q104, Q133)
    80: "common", 85: "common", 86: "common", 88: "occasional", 91: "common",
    96: "common", 104: "common", 133: "occasional",
    // Performance & Optimization (Q141, Q142, Q145, Q146, Q148, Q149, Q150, Q154)
    141: "essential", 142: "essential", 145: "common", 146: "common", 148: "essential",
    149: "common", 150: "common", 154: "common",
    // End-to-End Challenges (Q152, Q153, Q155-Q160)
    152: "common", 153: "common", 155: "essential", 156: "essential", 157: "common",
    158: "common", 159: "common", 160: "essential",
    // Advanced Patterns (synthetic ids 201-208: pivot, regex, SCD2, CDC, retention,
    // broken-pipeline debug, AQE, as-of/point-in-time join)
    201: "common", 202: "common", 203: "essential", 204: "common", 205: "essential",
    206: "common", 207: "common", 208: "common", 209: "common", 210: "common"
  };
})();
