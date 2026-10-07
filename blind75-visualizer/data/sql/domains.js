/*
 * domains.js — a SECOND lens over the SQL practice problems (mirrors the PySpark
 * lab's Pattern/Domain toggle).
 *
 * The default sidebar groups problems by PATTERN (Aggregation, Joins, Window
 * Functions, …) — HOW you solve them. This file adds the DOMAIN lens — WHAT the
 * problem is about: the business subject an interviewer frames it in (sales,
 * employees, products, …). Flip "Group by: Pattern | Domain" to re-bucket the
 * exact same problems by subject.
 *
 * Every SQL practice problem already ships a free-form `domains` tag in its data
 * (e.g. "Sales Analytics", "HR Analytics", "Customer Support Analytics"). Those
 * ~40 raw values are too noisy for a sidebar, so we fold them into a handful of
 * canonical buckets here and build an id -> domain map at load time. New problems
 * with a known raw tag classify automatically; anything unmapped falls to "Other".
 *
 * Keyed by problem `id` (SQL has no numeric lc), so coverage tracks the data.
 */
(function () {
  if (!window.SQLLAB) return;

  // Canonical domain order for the sidebar (entity/business domains first, the
  // cross-cutting technical one last).
  var ORDER = [
    "Sales & Revenue",
    "Retail & E-commerce",
    "HR & Org",
    "Products & Inventory",
    "Marketing, Web & Media",
    "Finance & Banking",
    "Education & Scores",
    "Customers & CRM",
    "Operations & Logistics",
    "Data Quality",
    "Other"
  ];

  var ICON = {
    "Sales & Revenue": "💰",
    "Retail & E-commerce": "🛒",
    "HR & Org": "👔",
    "Products & Inventory": "📦",
    "Marketing, Web & Media": "📣",
    "Finance & Banking": "🏦",
    "Education & Scores": "🎓",
    "Customers & CRM": "👥",
    "Operations & Logistics": "🚚",
    "Data Quality": "🧹",
    "Other": "•"
  };

  // Raw data tag (normalized: lowercased, non-alphanumerics stripped) -> canonical
  // bucket. Normalizing collapses spacing/punctuation variants such as
  // "E-commerce Analytics", "E-Commerce Analytics" and "E-commerce" to one key.
  var RAW2CANON = {
    salesanalytics: "Sales & Revenue",
    reporting: "Sales & Revenue",
    mathreporting: "Sales & Revenue",

    retailanalytics: "Retail & E-commerce",
    ecommerceanalytics: "Retail & E-commerce",
    ecommerce: "Retail & E-commerce",

    hranalytics: "HR & Org",

    productanalytics: "Products & Inventory",
    inventoryops: "Products & Inventory",
    supplychainanalytics: "Products & Inventory",
    manufacturing: "Products & Inventory",
    libraryanalytics: "Products & Inventory",
    facilitiesanalytics: "Products & Inventory",

    marketinganalytics: "Marketing, Web & Media",
    webanalytics: "Marketing, Web & Media",
    contentanalytics: "Marketing, Web & Media",
    gaminganalytics: "Marketing, Web & Media",
    entertainmentanalytics: "Marketing, Web & Media",
    streaminganalytics: "Marketing, Web & Media",

    financeanalytics: "Finance & Banking",
    finance: "Finance & Banking",
    fintech: "Finance & Banking",
    bankinganalytics: "Finance & Banking",

    educationanalytics: "Education & Scores",
    edtech: "Education & Scores",
    sportsanalytics: "Education & Scores",

    crm: "Customers & CRM",
    crmanalytics: "Customers & CRM",
    customersupportanalytics: "Customers & CRM",
    subscriptionanalytics: "Customers & CRM",
    saasanalytics: "Customers & CRM",

    operationsanalytics: "Operations & Logistics",
    logisticsanalytics: "Operations & Logistics",
    airlineanalytics: "Operations & Logistics",
    hospitality: "Operations & Logistics",
    iotanalytics: "Operations & Logistics",

    datacleaning: "Data Quality",
    dataquality: "Data Quality",
    dataengineering: "Data Quality"
  };

  function norm(s) { return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]/g, ""); }
  function canonFor(p) {
    var tags = p.domains || [];
    for (var i = 0; i < tags.length; i++) {       // use the first tag that maps
      var c = RAW2CANON[norm(tags[i])];
      if (c) return c;
    }
    return "Other";
  }

  var DOMAINS = {};
  (window.SQLLAB.all() || []).forEach(function (p) { DOMAINS[p.id] = canonFor(p); });

  window.SQLLAB.DOMAINS = DOMAINS;
  window.SQLLAB.DOMAIN_ORDER = ORDER;
  window.SQLLAB.DOMAIN_ICON = ICON;
})();
