import React, { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';

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
    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col h-64">
            <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-[#3AA189]" />
                <h3 className="font-bold text-gray-200 text-sm">Formula 1 News Wire</h3>
                <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded animate-pulse ml-auto">LIVE</span>
            </div>

            <div className="flex-1 overflow-hidden relative group">
                <div className="absolute inset-0 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                    {/* Duplicate list for infinite scroll effect if we were doing animation, 
               but for now a clean scrollable list is safer and more usable. 
               Let's stick to a nice styled list. */}
                    {MOCK_NEWS.map((item) => (
                        <div key={item.id} className="border-b border-gray-700/50 last:border-0 pb-3 last:pb-0">
                            <p className="text-sm font-medium text-gray-300 hover:text-[#3AA189] cursor-pointer transition-colors">
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
    );
};

export default NewsFeed;
