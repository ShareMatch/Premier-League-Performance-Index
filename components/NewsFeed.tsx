import React, { useState } from 'react';
import { Newspaper, X, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface NewsItem {
    id: number;
    headline: string;
    source: string;
    time: string;
}

const MOCK_NEWS: NewsItem[] = [
    { id: 1, headline: "Norris confident in McLaren upgrades ahead of next race", source: "F1.com", time: "2h ago" },
    { id: 2, headline: "Verstappen dismisses rumors of Red Bull exit", source: "Autosport", time: "4h ago" },
    { id: 3, headline: "Piastri: 'We are closing the gap to Max'", source: "Sky Sports", time: "5h ago" },
    { id: 4, headline: "Ferrari strategy under scrutiny after recent GP", source: "BBC Sport", time: "6h ago" },
    { id: 5, headline: "Hamilton praises Mercedes progress", source: "ESPN", time: "8h ago" },
];

const NewsFeed: React.FC = () => {
    const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
            const prompt = `Write a short, engaging 3-sentence summary for a news article with the headline: "${item.headline}". Assume it's about Formula 1. Focus on the implications for the championship or team performance.`;

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
                    <h3 className="font-bold text-gray-200 text-sm">Formula 1 News Wire</h3>
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded animate-pulse ml-auto">LIVE</span>
                </div>

                <div className="flex-1 overflow-hidden relative group">
                    <div className="absolute inset-0 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                        {MOCK_NEWS.map((item) => (
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
