// ─────────────────────────────────────────────────────────────────────────────
// Coding Studio seed dataset — the e-commerce "raw" layer, loaded into DuckDB
// (real, in-browser via DuckDB-WASM). This is the SAME SQL used by the offline
// validator (tools/validate-sql.mjs → python duckdb), so exercise solutions are
// checked against the exact tables learners query.
//
// Deliberately messy where it teaches something:
//   • raw_orders has a duplicate (double-loaded) row  → dedup exercises
//   • one order has TWO payment rows                  → join fan-out / double revenue
//   • some orders have refunds                        → net revenue
//   • updated_at present                              → incremental / late-arriving
// Small enough to load and reset instantly.
// ─────────────────────────────────────────────────────────────────────────────

export const SEED_SQL = `
create table raw_customers (customer_id integer, name varchar, country varchar, signup_date date);
insert into raw_customers values
  (1,'Ava Stone','US',date '2023-11-02'),
  (2,'Liam Park','US',date '2023-12-15'),
  (3,'Noah Kim','UK',date '2024-01-09'),
  (4,'Mia Chen','DE',date '2024-02-20'),
  (5,'Zoe Ray','US',date '2024-03-01'),
  (6,'Eli Vance','UK',date '2024-03-18');

create table raw_products (product_id integer, sku varchar, category varchar, unit_price decimal(10,2));
insert into raw_products values
  (10,'TSHIRT-01','apparel',19.00),
  (11,'MUG-02','home',12.50),
  (12,'BOOK-03','media',24.00),
  (13,'LAMP-04','home',45.00),
  (14,'CABLE-05','electronics',9.00);

-- raw_orders: order 1004 is double-loaded (duplicate row); updated_at drives incr.
create table raw_orders (order_id integer, customer_id integer, status varchar, order_date date, updated_at timestamp);
insert into raw_orders values
  (1001,1,'completed',date '2024-03-02',timestamp '2024-03-02 10:00:00'),
  (1002,1,'completed',date '2024-03-05',timestamp '2024-03-05 14:30:00'),
  (1003,2,'completed',date '2024-03-06',timestamp '2024-03-06 09:15:00'),
  (1004,3,'completed',date '2024-03-07',timestamp '2024-03-07 16:45:00'),
  (1004,3,'completed',date '2024-03-07',timestamp '2024-03-08 11:00:00'),
  (1005,4,'cancelled',date '2024-03-08',timestamp '2024-03-08 08:20:00'),
  (1006,5,'completed',date '2024-03-10',timestamp '2024-03-10 19:05:00'),
  (1007,2,'completed',date '2024-03-11',timestamp '2024-03-11 12:00:00'),
  (1008,6,'pending',  date '2024-03-12',timestamp '2024-03-12 07:40:00');

create table raw_order_items (order_id integer, product_id integer, quantity integer);
insert into raw_order_items values
  (1001,10,2),(1001,14,1),
  (1002,12,1),
  (1003,11,4),(1003,13,1),
  (1004,10,1),
  (1006,13,2),
  (1007,12,2),(1007,11,1),
  (1008,14,3);

-- raw_payments: order 1001 was paid in TWO installments (fan-out trap).
create table raw_payments (payment_id integer, order_id integer, amount decimal(10,2), paid_at timestamp);
insert into raw_payments values
  (9001,1001,20.00,timestamp '2024-03-02 10:05:00'),
  (9002,1001,27.00,timestamp '2024-03-03 09:00:00'),
  (9003,1002,24.00,timestamp '2024-03-05 14:35:00'),
  (9004,1003,95.00,timestamp '2024-03-06 09:20:00'),
  (9005,1004,19.00,timestamp '2024-03-07 16:50:00'),
  (9006,1006,90.00,timestamp '2024-03-10 19:10:00'),
  (9007,1007,61.00,timestamp '2024-03-11 12:05:00');

create table raw_refunds (refund_id integer, order_id integer, amount decimal(10,2), refunded_at timestamp);
insert into raw_refunds values
  (7001,1003,12.50,timestamp '2024-03-09 10:00:00'),
  (7002,1006,45.00,timestamp '2024-03-12 15:00:00');
`;
