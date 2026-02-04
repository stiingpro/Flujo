-- ==========================================
-- MODULE 1: Server-Side Cumulative Utility Calculation
-- ==========================================

-- Standard View for Monthly Balances with Running Total
-- We use a standard VIEW (not Materialized) for real-time accuracy without refresh triggers.
-- Given the volume < 1M rows, performance will be instant.

CREATE OR REPLACE VIEW monthly_balances AS
WITH monthly_stats AS (
    SELECT 
        user_id,
        EXTRACT(YEAR FROM date)::INT as year,
        EXTRACT(MONTH FROM date)::INT as month,
        -- Calculate Income (Real + Projected potentially, but usually we want Real for strict accounting)
        -- User can filter by status at query time, but aggregates are easier if pre-calculated.
        -- Here we aggregate ALL valid transactions (not deleted).
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
    FROM transactions
    GROUP BY 1, 2, 3
)
SELECT 
    user_id,
    year,
    month,
    total_income,
    total_expense,
    (total_income - total_expense) as net_flow,
    -- Window Function for Running Total (Cumulative Utility)
    SUM(total_income - total_expense) OVER (
        PARTITION BY user_id 
        ORDER BY year, month
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as cumulative_utility
FROM monthly_stats;

-- Grant access to authenticated users
GRANT SELECT ON monthly_balances TO authenticated;


-- ==========================================
-- MODULE 3: Heuristic Pattern Detection
-- ==========================================

-- Type for returning suggestions
CREATE TYPE transaction_suggestion AS (
    category_id TEXT,
    description TEXT,
    amount DECIMAL,
    suggested_date DATE,
    confidence_score DECIMAL
);

-- Function to detect recurring patterns from the last 6 months
CREATE OR REPLACE FUNCTION detect_recurrences(target_date DATE)
RETURNS SETOF transaction_suggestion
LANGUAGE plpgsql
AS $$
DECLARE
    curr_user_id UUID;
    search_start_date DATE;
BEGIN
    -- Get current user context
    curr_user_id := auth.uid();
    
    -- Look back 6 months
    search_start_date := target_date - INTERVAL '6 months';

    RETURN QUERY
    WITH recent_txs AS (
        SELECT 
            t.category_id,
            t.description,
            t.amount,
            EXTRACT(DAY FROM t.date) as day_of_month
        FROM transactions t
        WHERE t.user_id = curr_user_id
        AND t.date >= search_start_date
        AND t.date < target_date
        AND t.type = 'expense' -- Usually we predict fixed expenses
    ),
    grouped_patterns AS (
        SELECT 
            r.category_id,
            r.description,
            -- Detect modal amount (most frequent) using simple avg for now, 
            -- or logic can be refined to require exact matches.
            ROUND(AVG(r.amount), 0) as avg_amount,
            ROUND(AVG(r.day_of_month), 0) as avg_day,
            COUNT(*) as occurrences,
            STDDEV(r.amount) as amount_variance
        FROM recent_txs r
        GROUP BY 1, 2
    )
    SELECT 
        gp.category_id,
        gp.description,
        gp.avg_amount,
        -- Construct the date for the target month
        (DATE_TRUNC('month', target_date) + (LEAST(gp.avg_day, 28) - 1 || ' days')::INTERVAL)::DATE as suggested_date,
        -- Simple confidence score based on frequency (max 6) and variance
        (LEAST(gp.occurrences, 6) / 6.0) * (CASE WHEN COALESCE(gp.amount_variance, 0) < (gp.avg_amount * 0.05) THEN 1.0 ELSE 0.8 END) as confidence_score
    FROM grouped_patterns gp
    WHERE gp.occurrences >= 3 -- Must appear at least 3 times in last 6 months
    AND COALESCE(gp.amount_variance, 0) < (gp.avg_amount * 0.10); -- Low variance (<10%)

END;
$$ SECURITY DEFINER;
-- Security Definer needed to access transactions if RLS blocks logic (though we filtered by auth.uid inside)
