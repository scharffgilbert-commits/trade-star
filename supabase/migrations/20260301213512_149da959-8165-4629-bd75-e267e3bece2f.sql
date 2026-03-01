
-- Fix account 2 statistics based on actual position data
DO $$
DECLARE
  v_total INT;
  v_wins INT;
  v_losses INT;
  v_total_pnl NUMERIC;
  v_peak NUMERIC;
  v_max_dd NUMERIC;
BEGIN
  -- Calculate actual stats from positions
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE pnl_amount > 0),
    COUNT(*) FILTER (WHERE pnl_amount < 0),
    COALESCE(SUM(pnl_amount), 0)
  INTO v_total, v_wins, v_losses, v_total_pnl
  FROM demo_positions
  WHERE account_id = 2 AND position_status IN ('CLOSED', 'STOPPED_OUT');

  -- Calculate peak balance from balance_snapshots
  SELECT COALESCE(MAX(balance), 100000 + v_total_pnl)
  INTO v_peak
  FROM balance_snapshots
  WHERE account_id = 2;

  -- Calculate max drawdown
  v_max_dd := CASE WHEN v_peak > 0 
    THEN ROUND(((v_peak - (100000 + v_total_pnl)) / v_peak * 100), 4)
    ELSE 0 END;
  IF v_max_dd < 0 THEN v_max_dd := 0; END IF;

  UPDATE demo_accounts
  SET current_balance = 100000 + v_total_pnl,
      total_pnl = v_total_pnl,
      total_pnl_percent = ROUND(v_total_pnl / 100000 * 100, 4),
      total_trades = v_total,
      winning_trades = v_wins,
      losing_trades = v_losses,
      peak_balance = GREATEST(v_peak, 100000 + v_total_pnl),
      updated_at = now()
  WHERE id = 2;

  -- Also recalculate the latest balance_snapshots to match
  UPDATE balance_snapshots
  SET balance = 100000 + v_total_pnl,
      equity = 100000 + v_total_pnl,
      cumulative_pnl = v_total_pnl
  WHERE account_id = 2 
    AND snapshot_date = (SELECT MAX(snapshot_date) FROM balance_snapshots WHERE account_id = 2);
END;
$$;
