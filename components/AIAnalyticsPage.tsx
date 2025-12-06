import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, AlertTriangle } from 'lucide-react';
import type { Team } from '../types';

interface AIAnalyticsPageProps {
    teams: Team[];
}

const AIAnalyticsPage: React.FC<AIAnalyticsPageProps> = ({ teams }) => {
    const [analysis, setAnalysis] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [selectedMarket, setSelectedMarket] = useState<'EPL' | 'F1' | 'SPL' | 'UCL'>('EPL');

    const getAnalysis = async () => {
        setLoading(true);
        setAnalysis('');

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error('API Key configuration missing.');

            const ai = new GoogleGenAI({ apiKey });

            const marketTeams = teams
                .filter(t => t.market === selectedMarket)
                .sort((a, b) => b.offer - a.offer)
                .slice(0, 8)
                .map(t => `${t.name} (${t.offer.toFixed(1)}%)`)
                .join(', ');

            const prompt = `
        You are an Expert Sports Analyst for the ShareMatch trading platform.
        
        Market: ${selectedMarket} Index
        Current Market Prices: ${marketTeams}
        
        TASK:
        1. Search for the latest breaking news, injuries, and team morale impacting these specific teams/drivers.
        2. Provide a technical analysis of the market. Focus on fundamentals, performance, and momentum.
        3. Identify 1 Undervalued Asset and 1 Overvalued Asset based on the divergence between sentiment and current market price.
        4. Format with clean Markdown (headers, bullet points). Start directly with the analysis title.
        
        STRICT TERMINOLOGY GUIDELINES:
        - DO NOT use religious terms like "Halal", "Islamic", "Sharia", "Haram". The analysis must be compliant in *principle* (ethical, no gambling), but must NOT use the labels.
        - DO NOT use gambling terms like "bet", "odds", "wager", "gamble". Use "trade", "position", "sentiment", "forecast".
        - DO NOT use "Win" or "Winner" when referring to the market outcome. Use "Top the Index" or "finish first".
        - DO NOT provide meta-commentary or conversational openings (e.g., "Okay, here is..."). Start immediately with the content.
        
        Style: Professional, insightful, concise, data-driven.
      `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                }
            });

            setAnalysis(response.text || 'Analysis currently unavailable. Please try again.');
        } catch (err) {
            console.error(err);
            setAnalysis('Unable to generate analysis at this time.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full space-y-8">

                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center p-3 bg-[#3AA189]/10 rounded-full mb-4">
                        <Sparkles className="w-8 h-8 text-[#3AA189]" />
                    </div>
                    <h1 className="text-4xl font-bold text-white font-serif">AI Analytics Engine</h1>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Exclusive deep-dive analysis for our community. Powered by real-time data and grounded in Sharia-compliant investment principles.
                    </p>
                                        }`}
                                >
                    {market}
                </button>
                            ))}
            </div>

            <button
                onClick={getAnalysis}
                disabled={loading}
                className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-[#3AA189] to-[#2F8E75] hover:from-[#42B59A] hover:to-[#36A386] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
                {loading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-5 h-5" />
                        Generate Analysis
                    </>
                )}
            </button>
        </div>
                </div >

    {/* Results */ }
{
    analysis ? (
        <div className="bg-[#0B1221] border border-gray-800 rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
            <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed text-gray-300">
                    {analysis}
                </div>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-800 flex items-center gap-2 text-xs text-gray-500">
                <AlertTriangle className="w-4 h-4" />
                <span>AI-generated analysis is for informational purposes only. Past performance does not guarantee future results.</span>
            </div>
        </div>
    ) : (
        !loading && (
            <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-2xl text-gray-500">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Select a market and click "Generate Analysis" to begin.</p>
            </div>
        )
    )
}
            </div >
        </div >
    );
};

export default AIAnalyticsPage;
