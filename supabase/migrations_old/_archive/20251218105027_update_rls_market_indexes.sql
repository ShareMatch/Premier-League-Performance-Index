ALTER TABLE market_indexes
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read market indexes"
ON market_indexes
FOR SELECT
USING (true);
