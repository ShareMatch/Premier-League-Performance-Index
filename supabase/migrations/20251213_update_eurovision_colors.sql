-- Migration: Update Eurovision Asset Colors
-- Date: 2025-12-13

DO $$
BEGIN

-- Update colors for Eurovision countries to match flags
UPDATE assets SET color = '#0038B8' WHERE id = 481; -- Israel (Blue)
UPDATE assets SET color = '#003580' WHERE id = 482; -- Finland (Blue)
UPDATE assets SET color = '#FECC00' WHERE id = 483; -- Sweden (Yellow)
UPDATE assets SET color = '#FFD700' WHERE id = 484; -- Ukraine (Yellow)
UPDATE assets SET color = '#009246' WHERE id = 485; -- Italy (Green)
UPDATE assets SET color = '#00A1DE' WHERE id = 486; -- Luxembourg (Light Blue)
UPDATE assets SET color = '#0055A4' WHERE id = 487; -- France (Blue)
UPDATE assets SET color = '#BA0C2F' WHERE id = 488; -- Norway (Red)
UPDATE assets SET color = '#ED2939' WHERE id = 489; -- Belgium (Red)
UPDATE assets SET color = '#00966E' WHERE id = 490; -- Bulgaria (Green)
UPDATE assets SET color = '#C60C30' WHERE id = 491; -- Denmark (Red)
UPDATE assets SET color = '#FF0000' WHERE id = 492; -- Croatia (Red)
UPDATE assets SET color = '#D47600' WHERE id = 493; -- Cyprus (Copper/Orange)
UPDATE assets SET color = '#FDB913' WHERE id = 494; -- Lithuania (Yellow)
UPDATE assets SET color = '#AE1C28' WHERE id = 495; -- Netherlands (Red - Flag tricolour, Orange is national color but flag is Red/White/Blue)
UPDATE assets SET color = '#0046AE' WHERE id = 496; -- Moldova (Blue)
UPDATE assets SET color = '#00247D' WHERE id = 497; -- United Kingdom (Blue)
UPDATE assets SET color = '#002B7F' WHERE id = 498; -- Romania (Blue)
UPDATE assets SET color = '#0072CE' WHERE id = 499; -- Estonia (Blue)
UPDATE assets SET color = '#0D5EAF' WHERE id = 500; -- Greece (Blue)
UPDATE assets SET color = '#DC143C' WHERE id = 501; -- Poland (Red)
UPDATE assets SET color = '#FF0000' WHERE id = 502; -- Switzerland (Red)
UPDATE assets SET color = '#AA151B' WHERE id = 503; -- Spain (Red)
UPDATE assets SET color = '#9E3039' WHERE id = 504; -- Latvia (Maroon)
UPDATE assets SET color = '#C40000' WHERE id = 505; -- Montenegro (Red)

-- Ensure updated_at is refreshed
UPDATE assets SET updated_at = NOW() WHERE market = 'Eurovision';

END $$;
