-- Remove F1 drivers that are not in championship contention
-- Keep only: Lando Norris, Oscar Piastri, Max Verstappen

DELETE FROM public.assets 
WHERE market = 'F1' 
AND name NOT IN ('Lando Norris', 'Oscar Piastri', 'Max Verstappen');

-- Verify remaining F1 drivers
SELECT id, name, market, bid, offer 
FROM public.assets 
WHERE market = 'F1'
ORDER BY id;
