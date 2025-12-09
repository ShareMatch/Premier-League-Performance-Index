import React, { useState, useEffect } from 'react';
import { Newspaper, X, Sparkles, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../lib/supabase';

interface NewsItem {
    id: string; // Changed to string for UUID
    headline: string;
    source: string;
    published_at: string;
    url?: string;
}

const HARAM_KEYWORDS = [
    "gambling", "betting", "wager", "wagers", "stake", "stakes", "odds", "line",
    "lines", "bookie", "bookmaker", "picks", "action", "parlay", "teaser",
    "future", "futures", "prop bet", "prop bets", "spread", "spreads",
    "over/under", "o/u", "payout", "risk-free", "vegas", "las vegas",
    "promo code", "promocode", "deposit match", "bonus", "bonuses",
    "free bet", "freebets", "sign-up offer", "welcome offer", "welcome bonus",
    "offer code", "credit", "credits", "guaranteed winnings", "cash back",
    "daily fantasy", "dfs", "draftkings", "fanduel", "sleeper", "casino",
    "poker", "slot", "slots", "roulette", "blackjack", "lotto", "lottery",
    "moneyline", "wine", "beer", "alcohol"
];

const isHaram = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return HARAM_KEYWORDS.some(keyword => {
        // For multi-word phrases or terms with special chars, use simple inclusion
        if (keyword.includes(' ') || keyword.includes('/') || keyword.includes('-')) {
            return lowerText.includes(keyword);
        }
        // For single words, use word boundary to avoid false positives (e.g. 'line' in 'online')
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(lowerText);
    });
};

interface NewsFeedProps {
    topic?: 'EPL' | 'UCL' | 'SPL' | 'WC' | 'F1' | 'NBA' | 'NFL' | 'Global';
}

const NewsFeed: React.FC<NewsFeedProps> = ({ topic = 'Global' }) => {
    const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
    const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const getTitle = (topic: string) => {
        switch (topic) {
            case 'EPL': return 'England Premier League News Wire';
            case 'UCL': return 'UEFA Champions League News Wire';
            case 'SPL': return 'Saudi Pro League News Wire';
            case 'WC': return 'FIFA World Cup News Wire';
            case 'F1': return 'Formula 1 News Wire';
            case 'NBA': return 'NBA News Wire';
            case 'NFL': return 'NFL News Wire';
            default: return 'Global Sports News Wire';
        }
    };

    const title = getTitle(topic);
    const promptContext = topic === 'F1' ? 'Formula 1' : topic === 'NBA' ? 'Basketball' : topic === 'NFL' ? 'American Football' : 'Football';

    const fetchNews = async () => {
        setLoading(true);
        try {
            // 1. Fetch existing news from DB
            const { data, error } = await supabase
                .from('news_articles')
                .select('*')
                .eq('topic', topic)
                .order('published_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            if (data && data.length > 0) {
                // Filter for Sharia compliance (remove gambling/betting/haram keywords)
                const filteredData = data.filter(item => {
                    const text = (item.headline + ' ' + (item.source || '')).toLowerCase();
                    return !isHaram(text);
                });
                setNewsItems(filteredData);
            }

            // 2. Check if update is needed (Lazy Update)
            const { data: updateData } = await supabase
                .from('news_updates')
                .select('last_updated_at')
                .eq('topic', topic)
                .single();

            const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
            const lastUpdated = updateData?.last_updated_at ? new Date(updateData.last_updated_at) : null;

            if (!lastUpdated || lastUpdated < sixHoursAgo) {
                console.log(`News for ${topic} is stale. Triggering update...`);
                triggerUpdate();
            }

        } catch (err) {
            console.error('Error fetching news:', err);
            setError('Failed to load news.');
        } finally {
            setLoading(false);
        }
    };

    const triggerUpdate = async () => {
        setIsUpdating(true);
        try {
            const { data, error } = await supabase.functions.invoke('fetch-news', {
                body: { topic }
            });

            if (error) throw error;

            if (data?.updated) {
                // Refetch to get new items
                const { data: newData } = await supabase
                    .from('news_articles')
                    .select('*')
                    .eq('topic', topic)
                    .order('published_at', { ascending: false })
                    .limit(10);

                if (newData) setNewsItems(newData);
            }
        } catch (err) {
            console.error('Error updating news:', err);
        } finally {
            setIsUpdating(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, [topic]);

    const handleNewsClick = async (item: NewsItem) => {
        setSelectedNews(item);
        setSummary('');
        setLoading(true); // Re-use loading state for modal or create separate one? 
        // Let's create a local loading state for the modal to avoid hiding the feed
        // Actually, let's just use a separate state variable for summary loading
    };

    // Separate loading state for summary
    const [summaryLoading, setSummaryLoading] = useState(false);

    const generateSummary = async (item: NewsItem) => {
        setSummaryLoading(true);
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error('API Key not found.');

            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Write a short, engaging 3-sentence summary for a news article with the headline: "${item.headline}". Assume it's about ${promptContext}. Focus on the implications for the championship or team performance.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });

            setSummary(response.text || 'No summary generated.');
        } catch (err: any) {
            console.error(err);
            setSummary('Failed to generate summary.');
        } finally {
            setSummaryLoading(false);
        }
    };

    // Trigger summary generation when modal opens
    useEffect(() => {
        if (selectedNews) {
            generateSummary(selectedNews);
        }
    }, [selectedNews]);

    const closeModal = () => {
        setSelectedNews(null);
        setSummary('');
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        return `${Math.floor(diffInHours / 24)}d ago`;
    };

    return (
        <>
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col h-64">
                <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex items-center gap-2">
                    <Newspaper className="w-4 h-4 text-[#3AA189]" />
                    <h3 className="font-bold text-gray-200 text-sm truncate flex-1">{title}</h3>
                    {isUpdating && <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />}
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded animate-pulse">LIVE</span>
                </div>

                <div className="flex-1 overflow-hidden relative group">
                    <div className="absolute inset-0 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                        {loading && newsItems.length === 0 ? (
                            <div className="text-center text-gray-500 text-sm py-4">Loading news...</div>
                        ) : newsItems.length === 0 ? (
                            <div className="text-center text-gray-500 text-sm py-4">No news available.</div>
                        ) : (
                            newsItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="border-b border-gray-700/50 last:border-0 pb-3 last:pb-0 cursor-pointer group/item"
                                    onClick={() => handleNewsClick(item)}
                                >
                                    <p className="text-sm font-medium text-gray-300 group-hover/item:text-[#3AA189] transition-colors line-clamp-2">
                                        {item.headline}
                                    </p>
                                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                                        <span>{item.source}</span>
                                        <span>{formatTime(item.published_at)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* AI Summary Modal */}
            {selectedNews && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div 
                        className="max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
                        style={{
                            borderRadius: '24px',
                            background: 'rgba(4, 34, 34, 0.60)',
                            backdropFilter: 'blur(40px)',
                            WebkitBackdropFilter: 'blur(40px)',
                        }}
                    >
                        <div 
                            className="px-5 py-4 flex justify-between items-center"
                            style={{
                                background: '#021A1A',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                        >
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-[#3AA189]" />
                                AI News Summary
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <h4 className="font-bold text-lg text-white mb-4 leading-tight">{selectedNews.headline}</h4>

                            {summaryLoading ? (
                                <div className="space-y-3 animate-pulse">
                                    <div className="h-2 bg-white/10 rounded w-full"></div>
                                    <div className="h-2 bg-white/10 rounded w-5/6"></div>
                                    <div className="h-2 bg-white/10 rounded w-4/5"></div>
                                </div>
                            ) : (
                                <p className="text-gray-200 text-sm leading-relaxed">
                                    {summary}
                                </p>
                            )}

                            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                                <span className="text-xs text-gray-400">Powered by Google Gemini</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default NewsFeed;
