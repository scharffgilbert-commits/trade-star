-- Update auto_trade_config to allow all active symbols
UPDATE auto_trade_config 
SET allowed_symbols = (
  SELECT array_agg(symbol ORDER BY symbol) 
  FROM symbols_master 
  WHERE active = true
), 
updated_at = now() 
WHERE id = 1;