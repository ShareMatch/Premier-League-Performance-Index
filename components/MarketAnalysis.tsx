import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { Team } from '../types';

interface MarketAnalysisProps {
    teams: Team[];
}

const SparkleIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

const MarketAnalysis: React.FC<MarketAnalysisProps> = ({ teams }) => {
    const [analysis, setAnalysis] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const getAnalysis = async () => {
        setLoading(true);
        setError('');
        setAnalysis('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const teamData = teams
                .slice(0, 10) // Analyze top 10 teams for brevity
                .map(t => `${t.name}: ${t.offer.toFixed(1)}%`)
                .join(', ');

            const prompt = `Based on these Premier League winner market prices (${teamData}), act as a sharp sports betting analyst. Provide a brief market commentary. Identify one potentially undervalued team and one that might be overvalued, explaining why in a sentence each. Keep the total response under 100 words.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                 config: {
                    systemInstruction: "You are an expert sports betting analyst specializing in the English Premier League. Your analysis is concise, insightful, and data-driven. Do not use markdown formatting.",
                }
            });

            setAnalysis(response.text);

        } catch (err) {
            console.error(err);
            setError('Failed to retrieve analysis. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="my-6">
            <div className="flex justify-center">
                <button
                    onClick={getAnalysis}
                    disabled={loading}
                    className="bg-[#3AA189]/80 hover:bg-[#3AA189] text-white font-bold py-2 px-6 rounded-full inline-flex items-center gap-2 transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    <SparkleIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    <span>{loading ? 'Analyzing...' : 'Get AI Market Analysis'}</span>
                </button>
            </div>

            {error && <p className="text-center text-red-400 mt-4">{error}</p>}
            
            {loading && (
                <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700 animate-pulse">
                    <div className="h-3 bg-gray-700 rounded w-1/3 mb-3"></div>
                    <div className="space-y-2">
                        <div className="h-2 bg-gray-700 rounded w-full"></div>
                        <div className="h-2 bg-gray-700 rounded w-5/6"></div>
                        <div className="h-2 bg-gray-700 rounded w-3/4"></div>
                    </div>
                </div>
            )}
            
            {analysis && !loading && (
                <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700 text-left">
                    <h3 className="text-sm font-bold text-[#3AA189] flex items-center gap-2 mb-2">
                        <SparkleIcon className="w-4 h-4" />
                        AI Market Commentary
                    </h3>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{analysis}</p>
                </div>
            )}
        </div>
    );
};

export default MarketAnalysis;