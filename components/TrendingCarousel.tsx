import { Team, League } from "../types";
import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  Zap,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Flag,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getMarketInfo } from "../lib/marketInfo";
import { SeasonDates } from "../lib/api";

interface Question {
  id: string;
  market: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  volume: string;
  asset: string;
  change: number;
  changeDisplay: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
}

const generateDualPriceHistory = (
  yesPrice: number,
  noPrice: number,
  days: number = 7,
) => {
  const data = [];
  let buy = yesPrice * 0.92;
  let sell = noPrice * 1.05;
  for (let i = 0; i < days; i++) {
    const buyVolatility = Math.random() * 0.06 - 0.02;
    const sellVolatility = Math.random() * 0.06 - 0.02;
    buy = Math.max(30, Math.min(70, buy * (1 + buyVolatility)));
    sell = Math.max(25, Math.min(65, sell * (1 + sellVolatility)));
    data.push({
      date: `Jan ${i + 2}`,
      buy: parseFloat(buy.toFixed(1)),
      sell: parseFloat(sell.toFixed(1)),
    });
  }
  data[data.length - 1] = {
    date: `Jan ${days + 1}`,
    buy: yesPrice,
    sell: noPrice,
  };
  return data;
};

const generateQuestions = (
  teams: Team[],
  seasonDatesMap?: Map<string, SeasonDates>
): Question[] => {
  // Filter teams: not settled, price > $5.00, AND market is OPEN
  const activeTeams = teams.filter((t) => {
    if (t.is_settled) return false;
    if (t.offer <= 5.0) return false;

    // Use seasonDatesMap to determine if market is open
    const seasonData = seasonDatesMap?.get(t.market || "");
    const marketInfo = getMarketInfo(
      t.market as League,
      seasonData?.start_date,
      seasonData?.end_date,
      seasonData?.stage || undefined
    );
    return marketInfo.isOpen;
  }).slice(0, 50); // increased limit for pool

  const questions: Question[] = [];

  const getMarketConfig = (market: string) => {
    switch (market) {
      case "NBA": return { icon: <Activity className="w-3 h-3 text-orange-400" />, color: "from-orange-500/20 to-amber-500/20", borderColor: "group-hover:border-orange-500/50" };
      case "EPL": return { icon: <Trophy className="w-3 h-3 text-purple-400" />, color: "from-purple-500/20 to-blue-500/20", borderColor: "group-hover:border-purple-500/50" };
      case "F1": return { icon: <Flag className="w-3 h-3 text-red-400" />, color: "from-red-500/20 to-orange-500/20", borderColor: "group-hover:border-red-500/50" };
      case "UCL": return { icon: <Trophy className="w-3 h-3 text-blue-400" />, color: "from-blue-600/20 to-indigo-600/20", borderColor: "group-hover:border-blue-500/50" };
      case "NFL": return { icon: <Trophy className="w-3 h-3 text-blue-800" />, color: "from-blue-800/20 to-blue-900/20", borderColor: "group-hover:border-blue-800/50" };
      case "SPL": return { icon: <Activity className="w-3 h-3 text-green-400" />, color: "from-green-500/20 to-emerald-500/20", borderColor: "group-hover:border-green-500/50" };
      default: return { icon: <Activity className="w-3 h-3 text-gray-400" />, color: "from-gray-500/20 to-slate-500/20", borderColor: "group-hover:border-gray-500/50" };
    }
  };

  activeTeams.forEach((team) => {
    const market = team.market || "Unknown";
    const config = getMarketConfig(market);
    const validId = parseInt(team.id) || team.name.length;
    const volNum = (team.offer * (10000 + validId * 100)) / 1000;
    const volStr = volNum > 1000 ? `$${(volNum / 1000).toFixed(1)}M` : `$${volNum.toFixed(0)}K`;
    // Mock change for now since it's not on Team
    const change = Math.random() * 20 - 5;

    questions.push({
      id: `${market.toLowerCase()}-${team.id}`,
      market: market,
      question: `Will ${team.name} Top the ${market} Index?`,
      yesPrice: team.offer,
      noPrice: team.bid,
      volume: volStr,
      asset: team.name.substring(0, 3).toUpperCase(),
      change,
      changeDisplay: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`,
      icon: config.icon,
      color: config.color,
      borderColor: config.borderColor,
    });
  });

  return questions.sort(() => 0.5 - Math.random());
};



interface TrendingCarouselProps {
  teams: Team[];
  seasonDatesMap?: Map<string, SeasonDates>;
}

const TrendingCarousel: React.FC<TrendingCarouselProps> = ({ teams, seasonDatesMap }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const questionPool = useMemo(() => generateQuestions(teams, seasonDatesMap), [teams, seasonDatesMap]);
  const currentQuestion = questionPool[currentIndex];


  const chartData = useMemo(() => {
    if (!currentQuestion) return [];
    return generateDualPriceHistory(
      currentQuestion.yesPrice,
      currentQuestion.noPrice,
      7,
    );
  }, [currentQuestion]);

  const handleNext = () => {
    if (!isAnimating && questionPool.length > 0) {
      setIsAnimating(true);
      setCurrentIndex((prev) => (prev + 1) % questionPool.length);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const handlePrev = () => {
    if (!isAnimating && questionPool.length > 0) {
      setIsAnimating(true);
      setCurrentIndex(
        (prev) => (prev - 1 + questionPool.length) % questionPool.length,
      );
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  useEffect(() => {
    const interval = setInterval(handleNext, 8000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  if (!currentQuestion) return null;

  const isPositive = currentQuestion.change >= 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Trending Markets
          </span>
          <Zap
            className="w-3 h-3 text-yellow-400 animate-pulse ml-1"
            fill="currentColor"
          />
        </h2>
      </div>

      <div className="relative bg-slate-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[240px]">
          <div
            className={`p-4 flex items-center justify-center transition-all duration-300 ${isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
          >
            <div className="w-full max-w-sm">
              <div
                className={`group relative bg-gray-800/40 backdrop-blur-sm rounded-xl border p-3 transition-all duration-300 hover:bg-gray-800 hover:shadow-xl ${currentQuestion.borderColor} border-gray-700/50`}
              >
                <div
                  className={`absolute inset-0 rounded-xl bg-gradient-to-br ${currentQuestion.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                />

                <div className="relative z-10 flex flex-col h-full space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-1.5 bg-gray-900/60 rounded-full px-2 py-1 border border-gray-700/50">
                      {currentQuestion.icon}
                      <span className="text-xs font-medium text-gray-300">
                        {currentQuestion.market}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold ${isPositive ? "text-green-500" : "text-red-400"}`}
                      >
                        {currentQuestion.changeDisplay}
                      </span>
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded border border-green-500/20">
                        <div className="relative">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          <div className="absolute inset-0 w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                        </div>
                        <span className="text-[10px] text-green-500 font-bold uppercase tracking-wide">
                          Live
                        </span>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors leading-tight">
                    {currentQuestion.question}
                  </h3>

                  <div className="text-xs text-gray-500 font-mono">
                    Vol: {currentQuestion.volume}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button className="flex flex-col items-center justify-center bg-[#005430] hover:bg-[#006035] border border-[#005430] rounded-xl py-2.5 transition-all shadow-lg shadow-black/20 group/btn">
                      <span className="text-xs text-emerald-100/70 font-medium mb-0.5 uppercase tracking-wide">
                        Buy
                      </span>
                      <span className="text-xl font-bold text-white">
                        ${currentQuestion.yesPrice.toFixed(2)}
                      </span>
                    </button>
                    <button className="flex flex-col items-center justify-center bg-red-900/20 hover:bg-red-900/30 border border-red-500/20 hover:border-red-500/40 rounded-xl py-2.5 transition-all">
                      <span className="text-xs text-red-300/70 font-medium mb-0.5 uppercase tracking-wide">
                        Sell
                      </span>
                      <span className="text-xl font-bold text-red-400">
                        ${currentQuestion.noPrice.toFixed(2)}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`bg-slate-800 p-4 border-l border-gray-800 flex flex-col transition-all duration-300 ${isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-green-500" />
                  <span className="text-xs text-gray-400">Buy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-red-500" />
                  <span className="text-xs text-gray-400">Sell</span>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    stroke="#4B5563"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#4B5563"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[30, 70]}
                    ticks={[30, 40, 50, 60, 70]}
                    tickFormatter={(value) => `${value}%`}
                    orientation="right"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a2332",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value, name) => [
                      `${Number(value).toFixed(1)}%`,
                      name === "buy" ? "Buy" : "Sell",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="buy"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                    animationDuration={1000}
                  />
                  <Line
                    type="monotone"
                    dataKey="sell"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    dot={false}
                    animationDuration={1000}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-800 bg-slate-900">
          <button
            onClick={handlePrev}
            disabled={isAnimating}
            className="p-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/50 rounded-full text-white transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl backdrop-blur-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            {questionPool.slice(0, 5).map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (!isAnimating) {
                    setIsAnimating(true);
                    setCurrentIndex(idx);
                    setTimeout(() => setIsAnimating(false), 300);
                  }
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex % 5
                  ? "w-8 bg-green-500"
                  : "w-1.5 bg-gray-600 hover:bg-gray-500"
                  }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={isAnimating}
            className="p-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/50 rounded-full text-white transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl backdrop-blur-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrendingCarousel;