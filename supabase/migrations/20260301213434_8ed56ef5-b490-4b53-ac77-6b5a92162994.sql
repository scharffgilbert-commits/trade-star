
-- Recalculate S4 scores for ALL trading decisions using a DO block
DO $$
DECLARE
  rec RECORD;
  v_long_score NUMERIC;
  v_short_score NUMERIC;
  v_s4_confidence NUMERIC;
  v_s4_signal TEXT;
  v_decision_date DATE;
  v_new_overall_confidence NUMERIC;
BEGIN
  FOR rec IN 
    SELECT decision_id, symbol, action_type, decision_timestamp,
           strand1_confidence, strand2_confidence, strand3_confidence
    FROM trading_decisions
    ORDER BY decision_timestamp
  LOOP
    v_decision_date := rec.decision_timestamp::date;
    
    v_long_score := calculate_croc_ice_score(rec.symbol, v_decision_date, 'LONG');
    v_short_score := calculate_croc_ice_score(rec.symbol, v_decision_date, 'SHORT');
    
    IF v_long_score > v_short_score + 10 THEN
      v_s4_signal := 'LONG';
      v_s4_confidence := v_long_score;
    ELSIF v_short_score > v_long_score + 10 THEN
      v_s4_signal := 'SHORT';
      v_s4_confidence := v_short_score;
    ELSE
      v_s4_signal := 'NEUTRAL';
      v_s4_confidence := GREATEST(v_long_score, v_short_score);
    END IF;
    
    v_new_overall_confidence := ROUND(
      COALESCE(rec.strand1_confidence, 50) * 0.30 +
      COALESCE(rec.strand2_confidence, 50) * 0.25 +
      COALESCE(rec.strand3_confidence, 50) * 0.20 +
      v_s4_confidence * 0.25
    );
    
    UPDATE trading_decisions
    SET strand4_long_score = v_long_score,
        strand4_short_score = v_short_score,
        strand4_confidence = v_s4_confidence,
        strand4_signal = v_s4_signal,
        confidence_score = v_new_overall_confidence
    WHERE decision_id = rec.decision_id;
  END LOOP;
  
  RAISE NOTICE 'S4 recalculation complete';
END;
$$;
