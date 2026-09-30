/* ============================================================
   ShopFlow Data — business context for all DB modules
   E-commerce platform: 50M customers, 500K sellers, 5M orders/day
   ============================================================ */

(function () {
  'use strict';

  const ShopFlowData = {
    company: {
      name: 'ShopFlow',
      tagline: 'Connecting 50M customers with 500K sellers',
      founded: 2018,
      stats: {
        customers: 50000000,
        sellers: 500000,
        products: 2000000000,
        ordersPerDay: 5000000,
        eventsPerDay: 500000000,
        dataVolumeGB: 50000,
      },
    },

    /* ── Evolution: spreadsheet → DB → Lakehouse ───────────────── */
    evolution: [
      { year: 2018, stage: 'Excel',           problem: 'Duplicate entries, no search, single user',              rows: 1000 },
      { year: 2019, stage: 'CSV Files',        problem: 'No transactions, data corruption, hard to query',       rows: 100000 },
      { year: 2020, stage: 'Multiple CSVs',    problem: 'No joins, referential integrity broken',               rows: 1000000 },
      { year: 2021, stage: 'SQLite',           problem: 'Not scalable for concurrent users',                    rows: 10000000 },
      { year: 2022, stage: 'PostgreSQL',       problem: 'Analytics slow on OLTP, single-node scale limits',     rows: 500000000 },
      { year: 2023, stage: 'PostgreSQL + DW',  problem: 'Need separate analytical store',                       rows: 5000000000 },
      { year: 2024, stage: 'Delta Lakehouse',  problem: 'Solved: unified analytics + ACID + governance',        rows: 50000000000 },
    ],

    /* ── Core entities ─────────────────────────────────────── */
    entities: [
      {
        name: 'Customer', color: '#3b82f6',
        attributes: ['customer_id SERIAL PK', 'email VARCHAR(255) UNIQUE NOT NULL', 'name VARCHAR(200)', 'phone VARCHAR(20)', 'address_id INT FK', 'tier VARCHAR(10)', 'created_at TIMESTAMPTZ'],
        description: 'Registered buyer on the ShopFlow marketplace',
      },
      {
        name: 'Product', color: '#10b981',
        attributes: ['product_id SERIAL PK', 'seller_id INT FK', 'category_id INT FK', 'name VARCHAR(500)', 'description TEXT', 'price DECIMAL(12,2)', 'sku VARCHAR(100) UNIQUE', 'stock_qty INT DEFAULT 0'],
        description: 'Item listed for sale by a seller',
      },
      {
        name: 'Seller', color: '#f59e0b',
        attributes: ['seller_id SERIAL PK', 'name VARCHAR(200)', 'email VARCHAR(255) UNIQUE', 'rating DECIMAL(2,1)', 'verified BOOLEAN DEFAULT FALSE', 'joined_at TIMESTAMPTZ'],
        description: 'Merchant listing products on ShopFlow',
      },
      {
        name: 'Order', color: '#8b5cf6',
        attributes: ['order_id SERIAL PK', 'customer_id INT FK', 'status VARCHAR(20)', 'shipping_addr_id INT FK', 'created_at TIMESTAMPTZ', 'updated_at TIMESTAMPTZ', 'total DECIMAL(14,2)'],
        description: 'A purchase transaction by a customer',
      },
      {
        name: 'OrderItem', color: '#ef4444',
        attributes: ['item_id SERIAL PK', 'order_id INT FK', 'product_id INT FK', 'quantity INT NOT NULL', 'unit_price DECIMAL(12,2)', 'discount DECIMAL(5,2) DEFAULT 0'],
        description: 'One line in an order (product + quantity + price)',
      },
      {
        name: 'Review', color: '#f97316',
        attributes: ['review_id SERIAL PK', 'customer_id INT FK', 'product_id INT FK', 'rating SMALLINT CHECK(rating BETWEEN 1 AND 5)', 'body TEXT', 'created_at TIMESTAMPTZ'],
        description: 'Customer rating and text review of a product',
      },
      {
        name: 'Inventory', color: '#06b6d4',
        attributes: ['inv_id SERIAL PK', 'product_id INT FK UNIQUE', 'warehouse VARCHAR(50)', 'qty_on_hand INT', 'qty_reserved INT', 'reorder_point INT', 'updated_at TIMESTAMPTZ'],
        description: 'Real-time stock levels per product per warehouse',
      },
      {
        name: 'Payment', color: '#a855f7',
        attributes: ['payment_id SERIAL PK', 'order_id INT FK UNIQUE', 'amount DECIMAL(14,2)', 'currency CHAR(3)', 'method VARCHAR(30)', 'status VARCHAR(20)', 'processed_at TIMESTAMPTZ'],
        description: 'Payment record linked to an order',
      },
    ],

    /* ── Key relationships ─────────────────────────────────── */
    relationships: [
      { from: 'Customer',  to: 'Order',     type: 'ONE_TO_MANY',  label: 'places' },
      { from: 'Order',     to: 'OrderItem', type: 'ONE_TO_MANY',  label: 'contains' },
      { from: 'Product',   to: 'OrderItem', type: 'ONE_TO_MANY',  label: 'referenced in' },
      { from: 'Seller',    to: 'Product',   type: 'ONE_TO_MANY',  label: 'lists' },
      { from: 'Customer',  to: 'Review',    type: 'ONE_TO_MANY',  label: 'writes' },
      { from: 'Product',   to: 'Review',    type: 'ONE_TO_MANY',  label: 'receives' },
      { from: 'Order',     to: 'Payment',   type: 'ONE_TO_ONE',   label: 'paid via' },
      { from: 'Product',   to: 'Inventory', type: 'ONE_TO_ONE',   label: 'tracked in' },
    ],

    /* ── Normalization example (unnormalized → 3NF) ──────────── */
    unnormalizedTable: {
      name: 'orders_flat',
      columns: ['order_id', 'order_date', 'customer_id', 'customer_name', 'customer_email', 'customer_city', 'product_id', 'product_name', 'product_category', 'seller_id', 'seller_name', 'qty', 'unit_price', 'discount'],
      problem: 'Repeats customer/product/seller info on every row. 500M rows x 14 cols = massive storage waste + update anomalies.',
    },

    /* ── Medallion architecture ────────────────────────────── */
    medallion: {
      bronze: {
        label: 'Bronze — Raw Ingestion',
        color: '#b45309',
        description: 'Raw events exactly as received from source systems. Never modified.',
        tables: ['raw_orders', 'raw_clickstream', 'raw_product_events', 'raw_payments', 'raw_inventory_updates'],
        format: 'JSON (append-only, partitioned by ingestion_date)',
        latency: 'Seconds (streaming via Kafka)',
        rowsPerDay: '500M+',
        storageGB: 8000,
      },
      silver: {
        label: 'Silver — Cleaned & Enriched',
        color: '#6b7280',
        description: 'Validated, deduplicated, schema-enforced, joined/enriched data.',
        tables: ['orders_cleaned', 'customer_sessions', 'product_views', 'payments_validated'],
        format: 'Delta (OPTIMIZE + Z-ORDER on customer_id, product_id)',
        latency: 'Minutes',
        rowsPerDay: '50M',
        storageGB: 2400,
      },
      gold: {
        label: 'Gold — Business Metrics',
        color: '#d97706',
        description: 'Aggregated, business-ready tables consumed by dashboards and ML.',
        tables: ['daily_sales_summary', 'customer_ltv_segments', 'seller_performance_weekly', 'product_rank_hourly'],
        format: 'Delta (small files, heavily aggregated)',
        latency: 'Hourly / Daily',
        rowsPerDay: '1M',
        storageGB: 80,
      },
    },

    /* ── Star schema (Data Warehouse) ──────────────────────── */
    starSchema: {
      factTable: {
        name: 'fact_order_items',
        description: 'One row per order line item — the atomic fact.',
        grainStatement: 'One row = one product in one order',
        metrics: ['quantity', 'unit_price', 'discount_amount', 'revenue', 'shipping_cost', 'tax_amount', 'margin'],
        keys: ['order_item_key', 'order_key', 'customer_key', 'product_key', 'seller_key', 'date_key', 'geo_key'],
      },
      dimensions: [
        { name: 'dim_customer',  type: 'SCD2', color: '#3b82f6', attributes: ['customer_name','email','tier','city','country','age_band'], description: 'Customer slowly changes: tier upgrades, address moves' },
        { name: 'dim_product',   type: 'SCD1', color: '#10b981', attributes: ['product_name','category','brand','sku','is_active','list_price'], description: 'Product attributes overwritten on change' },
        { name: 'dim_date',      type: 'static', color: '#f59e0b', attributes: ['date','year','quarter','month','week_num','day_name','is_holiday'], description: 'Pre-populated 10-year calendar' },
        { name: 'dim_seller',    type: 'SCD2', color: '#f97316', attributes: ['seller_name','rating_band','tier','country','verified_flag'], description: 'Seller tier changes over time' },
        { name: 'dim_geo',       type: 'SCD1', color: '#a855f7', attributes: ['city','state','country','region','timezone','lat','lng'], description: 'Geography of shipping address' },
      ],
    },

    /* ── Sample SQL queries by module ──────────────────────── */
    sampleQueries: {
      basic: 'SELECT p.name, COUNT(*) AS times_ordered\nFROM order_items oi\nJOIN products p ON oi.product_id = p.product_id\nGROUP BY p.name\nORDER BY times_ordered DESC\nLIMIT 10;',

      withCTE: 'WITH monthly_revenue AS (\n  SELECT\n    DATE_TRUNC(\'month\', o.created_at) AS month,\n    SUM(oi.unit_price * oi.quantity)   AS revenue\n  FROM orders o\n  JOIN order_items oi ON o.order_id = oi.order_id\n  WHERE o.status = \'completed\'\n  GROUP BY 1\n)\nSELECT month, revenue,\n       LAG(revenue) OVER (ORDER BY month) AS prev_month,\n       ROUND((revenue - LAG(revenue) OVER (ORDER BY month))\n             / LAG(revenue) OVER (ORDER BY month) * 100, 1) AS pct_change\nFROM monthly_revenue\nORDER BY month;',

      analyticsSQL: 'SELECT\n  c.tier,\n  COUNT(DISTINCT o.customer_id)                       AS customers,\n  COUNT(o.order_id)                                   AS orders,\n  SUM(oi.unit_price * oi.quantity)                    AS total_revenue,\n  AVG(oi.unit_price * oi.quantity)                    AS avg_order_value\nFROM customers c\nJOIN orders o     ON c.customer_id = o.customer_id\nJOIN order_items oi ON o.order_id = oi.order_id\nWHERE o.created_at >= NOW() - INTERVAL \'90 days\'\nGROUP BY c.tier\nORDER BY total_revenue DESC;',
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.Data = ShopFlowData;
})();
