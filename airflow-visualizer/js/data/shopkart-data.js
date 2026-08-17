/* ============================================================
   shopkart-data.js — the running example company
   ShopKart is a fictional e-commerce company whose data platform
   runs on Airflow. Every module reuses these DAGs/tasks so the
   examples stay consistent across the whole visualizer.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  AV.data.shopkart = {
    company: "ShopKart",
    blurb: "A mid-size online retailer running ~400 DAGs on Airflow.",

    // The flagship DAG referenced throughout the visualizer.
    dag: {
      dagId: "daily_sales_etl",
      schedule: "0 2 * * *", // 02:00 every day
      owner: "data-eng",
      tags: ["sales", "etl", "core"],
      tasks: [
        { id: "wait_for_orders", type: "Sensor", desc: "Wait for the raw orders export to land in S3." },
        { id: "extract_orders", type: "PythonOperator", desc: "Pull yesterday's orders from the OLTP replica." },
        { id: "extract_inventory", type: "PythonOperator", desc: "Pull warehouse inventory snapshots." },
        { id: "transform_sales", type: "PythonOperator", desc: "Join orders + inventory, compute daily KPIs." },
        { id: "load_warehouse", type: "PythonOperator", desc: "Write the curated table to Snowflake." },
        { id: "publish_metrics", type: "PythonOperator", desc: "Refresh the executive sales dashboard." }
      ],
      // adjacency: task -> downstream tasks
      edges: {
        wait_for_orders: ["extract_orders"],
        extract_orders: ["transform_sales"],
        extract_inventory: ["transform_sales"],
        transform_sales: ["load_warehouse"],
        load_warehouse: ["publish_metrics"],
        publish_metrics: []
      }
    },

    // A representative authoring snippet (TaskFlow API, Airflow 3.x style).
    dagCode:
      "from airflow.sdk import dag, task\n" +
      "from datetime import datetime\n" +
      "\n" +
      "@dag(\n" +
      "    schedule=\"0 2 * * *\",\n" +
      "    start_date=datetime(2024, 1, 1),\n" +
      "    catchup=False,\n" +
      "    tags=[\"sales\", \"etl\"],\n" +
      ")\n" +
      "def daily_sales_etl():\n" +
      "    @task\n" +
      "    def extract_orders():\n" +
      "        return fetch_orders()  # returns an XCom\n" +
      "\n" +
      "    @task\n" +
      "    def transform_sales(orders):\n" +
      "        return build_kpis(orders)\n" +
      "\n" +
      "    transform_sales(extract_orders())\n" +
      "\n" +
      "daily_sales_etl()"
  };
})();
