/* ============================================================
   retailflow-data.js — the recurring RetailFlow business story
   Single source of truth for the fictional org and its "Daily
   Revenue Pipeline", reused by every module and the lens.
   Populated fully in later content iterations; this scaffold
   exposes the core narrative facts.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.RetailFlow = {
    org: {
      name: "RetailFlow",
      blurb: "A fictional global e-commerce & supply-chain company: 800+ stores, a large online platform, multi-region warehouses.",
      stack: ["Python", "PySpark", "SQL", "Databricks", "Airflow", "dbt", "Azure/AWS", "GitHub", "Terraform", "Docker", "Kubernetes"]
    },
    // The flagship scenario every module connects to.
    scenario: {
      title: "RetailFlow's Daily Revenue Pipeline",
      deadline: "7:00 AM executive dashboard",
      medallion: ["Sources", "Ingestion", "Bronze", "PySpark", "Silver", "dbt", "Gold", "BI Dashboard"],
      sources: ["E-commerce DB", "Payments API", "Inventory DB", "Product DB", "Marketing API"],
      // The change that drives the story: fixing net-revenue.
      change: "net_revenue = gross_revenue - refund_amount"
    }
  };
})();
