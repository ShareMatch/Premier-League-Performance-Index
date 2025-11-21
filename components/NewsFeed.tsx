import React, { useState } from 'react';
import { Newspaper, X, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface NewsItem {
    id: number;
    headline: string;
    source: string;
    time: string;
    <div className = "fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className = "bg-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className = "p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                        <h3 className = "font-bold text-gray-200 flex items-center gap-2">
                            <Sparkles className = "w-4 h-4 text-[#3AA189]" />
                            AI News Summary
                        </h3 >
    <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">
        <X className="w-5 h-5" />
    </button>
                    </div >

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
                </div >
            </div >
        )}
    </>
);
};

export default NewsFeed;
