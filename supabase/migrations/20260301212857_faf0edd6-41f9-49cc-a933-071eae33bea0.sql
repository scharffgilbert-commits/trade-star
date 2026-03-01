
CREATE OR REPLACE FUNCTION public.calculate_croc_ice_score(p_symbol text, p_date date, p_direction text)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_score NUMERIC := 0;
    v_close NUMERIC;
    v_effective_date DATE;
    v_jaw NUMERIC; v_teeth NUMERIC; v_lips NUMERIC;
    v_status INT; v_candle INT; v_cloud INT;
    v_dist_jaw NUMERIC;
    v_exhaust NUMERIC; v_bull_exhaust INT; v_bear_exhaust INT;
    v_ema6 NUMERIC; v_ema24 NUMERIC; v_ema100 NUMERIC;
    v_active_bull_count INT; v_active_bear_count INT;
    v_has_strong_signal BOOLEAN;
    v_has_bummerrang BOOLEAN;
BEGIN
    -- Preis laden
    SELECT close INTO v_close FROM stock_prices WHERE symbol = p_symbol AND date <= p_date ORDER BY date DESC LIMIT 1;
    IF v_close IS NULL THEN RETURN 0; END IF;

    -- Effektives Datum: letztes verfügbares CROC_ALLIGATOR Datum (nicht zwingend p_date)
    SELECT date INTO v_effective_date
    FROM technical_indicators
    WHERE symbol = p_symbol AND indicator_name = 'CROC_ALLIGATOR' AND date <= p_date
    ORDER BY date DESC LIMIT 1;
    IF v_effective_date IS NULL THEN RETURN 0; END IF;

    -- CROC-Indikatoren laden (mit effektivem Datum)
    SELECT value_1, value_2, value_3 INTO v_jaw, v_teeth, v_lips
    FROM technical_indicators WHERE symbol = p_symbol AND date = v_effective_date AND indicator_name = 'CROC_ALLIGATOR';
    IF v_jaw IS NULL THEN RETURN 0; END IF;

    SELECT value_1, value_2, value_3 INTO v_status, v_candle, v_cloud
    FROM technical_indicators WHERE symbol = p_symbol AND date = v_effective_date AND indicator_name = 'CROC_STATUS';

    SELECT value_1 INTO v_dist_jaw
    FROM technical_indicators WHERE symbol = p_symbol AND date = v_effective_date AND indicator_name = 'CROC_DISTANCE';

    SELECT value_1, value_2, value_3 INTO v_exhaust, v_bull_exhaust, v_bear_exhaust
    FROM technical_indicators WHERE symbol = p_symbol AND date = v_effective_date AND indicator_name = 'CROC_EXHAUSTION';

    SELECT value_1, value_2, value_3 INTO v_ema6, v_ema24, v_ema100
    FROM technical_indicators WHERE symbol = p_symbol AND date = v_effective_date AND indicator_name = 'CROC_RAINBOW';

    -- Aktive Signale zählen
    SELECT
        COUNT(*) FILTER (WHERE direction = 'LONG'),
        COUNT(*) FILTER (WHERE direction = 'SHORT')
    INTO v_active_bull_count, v_active_bear_count
    FROM croc_ice_signals
    WHERE symbol = p_symbol AND is_active = true AND signal_date <= p_date
      AND (expiry_date IS NULL OR expiry_date >= p_date);

    -- Starke Signale?
    SELECT EXISTS(
        SELECT 1 FROM croc_ice_signals
        WHERE symbol = p_symbol AND is_active = true AND signal_date <= p_date
          AND (expiry_date IS NULL OR expiry_date >= p_date)
          AND signal_type IN ('BULL_7', 'BULL_1', 'BULL_9') AND direction = 'LONG'
    ) INTO v_has_strong_signal;

    -- BummeRRRang aktiv?
    SELECT EXISTS(
        SELECT 1 FROM croc_ice_signals
        WHERE symbol = p_symbol AND is_active = true AND signal_date <= p_date
          AND (expiry_date IS NULL OR expiry_date >= p_date)
          AND signal_type LIKE 'BUMMERRANG%' AND direction = 'LONG'
    ) INTO v_has_bummerrang;

    IF p_direction = 'LONG' THEN
        IF v_status = 1 THEN v_score := v_score + 15; END IF;
        IF v_candle = 1 THEN v_score := v_score + 10; END IF;
        IF v_cloud = 1 THEN v_score := v_score + 10; END IF;
        IF v_close > GREATEST(v_jaw, v_teeth, v_lips) AND v_lips > v_teeth AND v_teeth > v_jaw THEN
            v_score := v_score + 15;
        ELSIF v_close > GREATEST(v_jaw, v_teeth, v_lips) THEN
            v_score := v_score + 8;
        END IF;
        IF v_ema6 IS NOT NULL AND v_ema6 > v_ema24 AND v_ema24 > v_ema100 THEN
            v_score := v_score + 10;
        ELSIF v_ema6 IS NOT NULL AND v_ema6 > v_ema24 THEN
            v_score := v_score + 5;
        END IF;
        IF v_active_bull_count > 0 THEN v_score := v_score + 20; END IF;
        IF v_has_strong_signal THEN v_score := v_score + 10; END IF;
        IF v_bull_exhaust = 0 THEN v_score := v_score + 5; END IF;
        IF v_has_bummerrang THEN v_score := v_score + 5; END IF;
    ELSE -- SHORT
        IF v_status = -1 THEN v_score := v_score + 15; END IF;
        IF v_candle = -1 THEN v_score := v_score + 10; END IF;
        IF v_cloud = -1 THEN v_score := v_score + 10; END IF;
        IF v_close < LEAST(v_jaw, v_teeth, v_lips) AND v_lips < v_teeth AND v_teeth < v_jaw THEN
            v_score := v_score + 15;
        ELSIF v_close < LEAST(v_jaw, v_teeth, v_lips) THEN
            v_score := v_score + 8;
        END IF;
        IF v_ema6 IS NOT NULL AND v_ema6 < v_ema24 AND v_ema24 < v_ema100 THEN
            v_score := v_score + 10;
        ELSIF v_ema6 IS NOT NULL AND v_ema6 < v_ema24 THEN
            v_score := v_score + 5;
        END IF;
        IF v_active_bear_count > 0 THEN v_score := v_score + 20; END IF;

        SELECT EXISTS(
            SELECT 1 FROM croc_ice_signals
            WHERE symbol = p_symbol AND is_active = true AND signal_date <= p_date
              AND (expiry_date IS NULL OR expiry_date >= p_date)
              AND signal_type IN ('BEAR_7', 'BEAR_1', 'BEAR_9') AND direction = 'SHORT'
        ) INTO v_has_strong_signal;
        IF v_has_strong_signal THEN v_score := v_score + 10; END IF;

        IF v_bear_exhaust = 0 THEN v_score := v_score + 5; END IF;

        SELECT EXISTS(
            SELECT 1 FROM croc_ice_signals
            WHERE symbol = p_symbol AND is_active = true AND signal_date <= p_date
              AND (expiry_date IS NULL OR expiry_date >= p_date)
              AND signal_type LIKE 'BUMMERRANG%' AND direction = 'SHORT'
        ) INTO v_has_bummerrang;
        IF v_has_bummerrang THEN v_score := v_score + 5; END IF;
    END IF;

    RETURN LEAST(100, v_score);
END;
$function$;
