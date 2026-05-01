-- Backfill snapshots para todos los meses anteriores al actual que tengan pedidos
WITH months AS (
  SELECT DISTINCT DATE_TRUNC('month', created_at) AS month_start
  FROM orders
  WHERE DATE_TRUNC('month', created_at) < DATE_TRUNC('month', NOW())
),
financials AS (
  SELECT
    DATE_TRUNC('month', created_at)       AS month_start,
    TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
    COALESCE(SUM(total), 0)               AS total_revenue,
    COALESCE(SUM(amount_paid), 0)         AS collected,
    COALESCE(SUM(balance), 0)             AS pending,
    COUNT(*)                              AS orders_count
  FROM orders
  WHERE DATE_TRUNC('month', created_at) < DATE_TRUNC('month', NOW())
  GROUP BY DATE_TRUNC('month', created_at)
),
statuses AS (
  SELECT
    DATE_TRUNC('month', created_at) AS month_start,
    jsonb_object_agg(status, cnt)   AS status_counts
  FROM (
    SELECT DATE_TRUNC('month', created_at) AS month_start, status, COUNT(*) AS cnt
    FROM orders
    WHERE DATE_TRUNC('month', created_at) < DATE_TRUNC('month', NOW())
    GROUP BY DATE_TRUNC('month', created_at), status
  ) s
  GROUP BY month_start
)
INSERT INTO monthly_snapshots (month, total_revenue, collected, pending, orders_count, status_counts)
SELECT f.month, f.total_revenue, f.collected, f.pending, f.orders_count, s.status_counts
FROM financials f
JOIN statuses s ON s.month_start = f.month_start
ON CONFLICT (month) DO NOTHING;
