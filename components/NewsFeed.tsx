import React, { useState } from 'react';
import { Newspaper, X, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface NewsItem {
    id: number;
    headline: string;
    source: string;
    time: string;
}

const NEWS_DATA: Record<string, NewsItem[]> = {
    'EPL': [
        { id: 1, headline: "Newcastle stun Man City 2-1 as Barnes strikes winner", source: "Sky Sports", time: "2h ago" },
        { id: 2, headline: "Slot under pressure after Liverpool's defeat to Forest", source: "BBC Sport", time: "4h ago" },
        { id: 3, headline: "Chelsea close gap on Arsenal with win over Burnley", source: "The Guardian", time: "5h ago" },
        { id: 4, headline: "North London Derby preview: Arsenal face defensive reshuffle", source: "The Athletic", time: "6h ago" },
        { id: 5, headline: "Man Utd unveil plans for squad during AFCON", source: "Manchester Evening News", time: "8h ago" },
    ],
    'UCL': [
        { id: 1, headline: "Man City cruise past Dortmund with Foden masterclass", source: "UEFA.com", time: "1h ago" },
        { id: 2, headline: "Arsenal beat Slavia Prague thanks to Merino double", source: "BBC Sport", time: "3h ago" },
        { id: 3, headline: "Liverpool end losing streak with win in Frankfurt", source: "Sky Sports", time: "4h ago" },
        { id: 4, headline: "Chelsea held by Qarabag in frustrating draw", source: "ESPN", time: "6h ago" },
        { id: 5, headline: "Max Dowman becomes youngest ever Champions League player", source: "Goal.com", time: "12h ago" },
    ],
    'SPL': [
        { id: 1, headline: "Ronaldo scores 950th career goal as Al-Nassr stay top", source: "Arab News", time: "2h ago" },
        { id: 2, headline: "Al-Hilal edge Al-Shabab to keep pressure on leaders", source: "Saudi Gazette", time: "4h ago" },
        { id: 3, headline: "10-man Al-Ittihad stage incredible comeback draw", source: "SPL Official", time: "5h ago" },
        { id: 4, headline: "Salah remains top target for Saudi Pro League", source: "The Athletic", time: "8h ago" },
        { id: 5, headline: "2025-26 Season start date confirmed for August", source: "Reuters", time: "1d ago" },
    ],
    'WC': [
        { id: 1, headline: "Mbappe brace secures France's spot in 2026 World Cup", source: "FIFA.com", time: "3h ago" },
        { id: 2, headline: "USA, Canada, Mexico preparations ramp up for 2026", source: "ESPN", time: "5h ago" },
        { id: 3, headline: "DR Congo advance in African playoffs after penalty drama", source: "BBC Africa", time: "7h ago" },
        { id: 4, headline: "Intercontinental playoff spots decided this week", source: "Sky Sports", time: "10h ago" },
        { id: 5, headline: "FIFA projects record attendance for expanded tournament", source: "Reuters", time: "1d ago" },
    ],
    'F1': [
        { id: 1, headline: "Verstappen wins Las Vegas GP to keep title hopes alive", source: "F1.com", time: "2h ago" },
        { id: 2, headline: "Norris and Piastri disqualified from Vegas GP for technical breach", source: "Autosport", time: "3h ago" },
        { id: 3, headline: "Norris admits 'major f*** up' at Turn 1 cost victory", source: "Sky Sports F1", time: "4h ago" },
        { id: 4, headline: "Horner linked with shock move to Aston Martin", source: "Crash.net", time: "6h ago" },
        { id: 5, headline: "Leclerc questions Ferrari strategy after missed podium", source: "The Race", time: "8h ago" },
    ]
};

interface NewsFeedProps {
    topic?: 'EPL' | 'UCL' | 'SPL' | 'WC' | 'F1' | 'Global';
}

const NewsFeed: React.FC<NewsFeedProps> = ({ topic = 'Global' }) => {
    const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Default to EPL if topic not found or Global
    const newsItems = NEWS_DATA[topic] || NEWS_DATA['EPL'];

    const getTitle = (topic: string) => {
        switch (topic) {
            case 'EPL': return 'England Premier League News Wire';
            case 'UCL': return 'UEFA Champions League News Wire';
            case 'SPL': return 'Saudi Pro League News Wire';
            case 'WC': return 'FIFA World Cup News Wire';
            case 'F1': return 'Formula 1 News Wire';
            default: return 'Global Sports News Wire';
        }
    };

    const title = getTitle(topic);
    const promptContext = topic === 'F1' ? 'Formula 1' : 'Football';

    const handleNewsClick = async (item: NewsItem) => {
        setSelectedNews(item);
        setSummary('');
        setLoading(true);
        setError('');

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error('API Key not found.');
            }

            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Write a short, engaging 3-sentence summary for a news article with the headline: "${item.headline}". Assume it's about ${promptContext}. Focus on the implications for the championship or team performance.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });

            setSummary(response.text || 'No summary generated.');
        } catch (err: any) {
            console.error(err);
            setError('Failed to generate summary. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setSelectedNews(null);
        setSummary('');
        setError('');
    };

    return (
        <>
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col h-64">
                <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex items-center gap-2">
                    <Newspaper className="w-4 h-4 text-[#3AA189]" />
                    <h3 className="font-bold text-gray-200 text-sm">{title}</h3>
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded animate-pulse ml-auto">LIVE</span>
                </div>

                <div className="flex-1 overflow-hidden relative group">
                    <div className="absolute inset-0 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                        {newsItems.map((item) => (
                            <div
                                key={item.id}
                                className="border-b border-gray-700/50 last:border-0 pb-3 last:pb-0 cursor-pointer group/item"
                                onClick={() => handleNewsClick(item)}
                            >
                                <p className="text-sm font-medium text-gray-300 group-hover/item:text-[#3AA189] transition-colors">
                                    {item.headline}
                                </p>
                                <div className="flex justify-between mt-1 text-xs text-gray-500">
                                    <span>{item.source}</span>
                                    <span>{item.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Summary Modal */}
            {selectedNews && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                            <h3 className="font-bold text-gray-200 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-[#3AA189]" />
                                AI News Summary
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <h4 className="font-bold text-lg text-white mb-4 leading-tight">{selectedNews.headline}</h4>

                            {loading ? (
                                <div className="space-y-3 animate-pulse">
                                    <div className="h-2 bg-gray-700 rounded w-full"></div>
                                    <div className="h-2 bg-gray-700 rounded w-5/6"></div>
                                    <div className="h-2 bg-gray-700 rounded w-4/5"></div>
                                </div>
                            ) : error ? (
                                <p className="text-red-400 text-sm">{error}</p>
                            ) : (
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    {summary}
                                </p>
                            )}

                            <div className="mt-6 flex justify-end">
                                <span className="text-xs text-gray-500">Powered by Google Gemini</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default NewsFeed;
