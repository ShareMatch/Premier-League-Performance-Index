-- Enable Realtime for positions table (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.positions;

-- Verify Realtime is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
