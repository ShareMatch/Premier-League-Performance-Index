-- Create news_articles table
CREATE TABLE IF NOT EXISTS public.news_articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic TEXT NOT NULL, -- 'EPL', 'UCL', 'SPL', 'WC', 'F1', 'Global'
    headline TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT,
    published_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create news_updates table to track last fetch time
CREATE TABLE IF NOT EXISTS public.news_updates (
    topic TEXT PRIMARY KEY,
    last_updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_updates ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on news_articles"
    ON public.news_articles
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Allow public read access on news_updates"
    ON public.news_updates
    FOR SELECT
    TO public
    USING (true);

-- Create policies for service_role write access (for Edge Functions)
CREATE POLICY "Allow service_role full access on news_articles"
    ON public.news_articles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service_role full access on news_updates"
    ON public.news_updates
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create index for faster queries by topic
CREATE INDEX IF NOT EXISTS idx_news_articles_topic ON public.news_articles(topic);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON public.news_articles(published_at DESC);
