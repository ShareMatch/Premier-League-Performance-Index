import React, { useState } from "react";
import { GoogleGenAI } from "@google/genai";
import { Eye, EyeOff } from "lucide-react";
import type { Team } from "../types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AIAnalysisProps {
  teams: Team[];
  leagueName: string;
}

const SparkleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
    />
  </svg>
);

const AIAnalysis: React.FC<AIAnalysisProps> = ({ teams, leagueName }) => {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(true);

  const getAnalysis = async () => {
    setLoading(true);
    setError("");
    setAnalysis("");
    setIsVisible(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "API Key not found. Please set VITE_GEMINI_API_KEY in your .env file."
        );
      }

      const ai = new GoogleGenAI({ apiKey });

      const teamData = teams
        .slice(0, 10) // Analyze top 10 teams for brevity
        .map((t) => `${t.name}: ${t.offer.toFixed(1)}`)
        .join(", ");

      const prompt = `You are a sharp sports betting analyst. 
            
            Here are the current market prices (implied probability %) for the ${leagueName} winner: 
            ${teamData}
            
            TASK:
            1. Use Google Search to find the absolute latest news, injuries, and form for the top contenders in the ${leagueName}.
            2. Compare the real-world sentiment/news with these market prices.
            3. Identify ONE "Best Buy" (undervalued team) and ONE "Sell" (overvalued team).
            4. Provide a concise, data-driven rationale for each trade based on the *latest* news you found.
            
            Keep the response concise (under 150 words) and focused on actionable trading advice.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction:
            "You are an expert sports betting analyst. Use Google Search to ground your analysis in real-time data.",
        },
      });

      setAnalysis(response.text || "No analysis generated.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to retrieve analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-6">
      <div className="flex justify-center gap-4">
        <button
          onClick={getAnalysis}
          disabled={loading}
          className="bg-[#3AA189]/80 hover:bg-[#3AA189] text-white font-bold py-2 px-6 rounded-full inline-flex items-center gap-2 transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          <SparkleIcon className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          <span>
            {loading
              ? "Analyzing..."
              : analysis
              ? "Regenerate Analysis"
              : "Get AI Market Analysis"}
          </span>
        </button>

        {analysis && !loading && (
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full inline-flex items-center gap-2 transition-all duration-300"
          >
            {isVisible ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            <span>{isVisible ? "Hide" : "Show"}</span>
          </button>
        )}
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

      {analysis && !loading && isVisible && (
        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700 text-left animate-in fade-in slide-in-from-top-2">
          <h3 className="text-sm font-bold text-[#3AA189] flex items-center gap-2 mb-2">
            <SparkleIcon className="w-4 h-4" />
            AI Market Commentary
          </h3>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: (props) => (
                <p className="text-gray-300 text-sm mb-2" {...props} />
              ),
              strong: (props) => (
                <strong className="text-white font-bold" {...props} />
              ),
              ul: (props) => (
                <ul className="list-disc ml-4 text-sm text-gray-300" {...props} />
              ),
              li: (props) => <li className="mb-1" {...props} />,
              h3: (props) => (
                <h3 className="text-[#3AA189] text-sm font-bold mb-2" {...props} />
              ),
            }}
          >
            {analysis}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
