-- Convert Decimal Odds to Implied Probability Percentages
-- Logic:
-- 1. If Decimal Odds >= 100.0, set Price to 0.1 (Bid) / 0.2 (Offer) (De-minimis level)
-- 2. Else, Price = 100 / Decimal Odds

BEGIN;

UPDATE public.assets
SET 
    bid = CASE 
        WHEN bid >= 100.0 THEN 0.1 
        ELSE ROUND((100.0 / bid), 2) 
    END,
    offer = CASE 
        WHEN bid >= 100.0 THEN 0.2 
        ELSE ROUND((100.0 / offer), 2) 
    END
WHERE market IN ('UCL', 'WC', 'SPL', 'F1') AND bid > 0 AND offer > 0;

COMMIT;
