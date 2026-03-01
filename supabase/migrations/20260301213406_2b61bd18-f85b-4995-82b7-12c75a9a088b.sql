
-- Function to recalculate ALL S4 scores for all trading_decisions
CREATE OR REPLACE FUNCTION public.recalculate_all_s4_scores()
RETURNS TABLE(updated_symbol text, updated_date timestamptz, new_long_score numeric, new_short_score numeric, new_confidence numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    
    -- Calculate LONG and SHORT scores using the fixed function
    v_long_score := calculate_croc_ice_score(rec.symbol, v_decision_date, 'LONG');
    v_short_score := calculate_croc_ice_score(rec.symbol, v_decision_date, 'SHORT');
    
    -- Determine S4 signal and confidence
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
    
    -- Recalculate overall confidence: weighted average of all 4 strands
    -- S1: 30%, S2: 25%, S3: 20%, S4: 25%
    v_new_overall_confidence := ROUND(
      COALESCE(rec.strand1_confidence, 50) * 0.30 +
      COALESCE(rec.strand2_confidence, 50) * 0.25 +
      COALESCE(rec.strand3_confidence, 50) * 0.20 +
      v_s4_confidence * 0.25
    );
    
    -- Update the trading decision
    UPDATE trading_decisions
    SET strand4_long_score = v_long_score,
        strand4_short_score = v_short_score,
        strand4_confidence = v_s4_confidence,
        strand4_signal = v_s4_signal,
        confidence_score = v_new_overall_confidence
    WHERE decision_id = rec.decision_id;
    
    updated_symbol := rec.symbol;
    updated_date := rec.decision_timestamp;
    new_long_score := v_long_score;
    new_short_score := v_short_score;
    new_confidence := v_new_overall_confidence;
    RETURN NEXT;
  END LOOP;
END;
$$;
