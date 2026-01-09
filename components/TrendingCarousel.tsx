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
import { FaCaretDown } from "react-icons/fa";
import { FaCaretUp } from "react-icons/fa6";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getMarketInfo } from "../lib/marketInfo";
import { SeasonDates } from "../lib/api";

interface IndexToken {
  id: string;
  name: string;
  price: number;
  change: number;
  changeDisplay: string;
}

interface Question {
  id: string;
  market: string;
  question: string;
  topTokens: IndexToken[];
  volume: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  seasonData?: SeasonDates;
}

const generateTriplePriceHistory = (tokens: IndexToken[], days: number = 7) => {
  const data = [];

  // Initialize starting prices
  let prices = tokens.map((t) => t.price * 0.92);

  for (let i = 0; i < days; i++) {
    const dataPoint: any = {
      date: `Jan ${i + 2}`,
    };

    prices = prices.map((price, idx) => {
      const volatility = Math.random() * 0.06 - 0.02;
      return Math.max(30, Math.min(70, price * (1 + volatility)));
    });

    tokens.forEach((token, idx) => {
      dataPoint[`token${idx}`] = parseFloat(prices[idx].toFixed(1));
    });

    data.push(dataPoint);
  }

  // Set final prices to actual current prices
  const finalPoint: any = {
    date: `Jan ${days + 1}`,
  };
  tokens.forEach((token, idx) => {
    finalPoint[`token${idx}`] = token.price;
  });
  data[data.length - 1] = finalPoint;

  return data;
};

const generateQuestions = (
  teams: Team[],
  seasonDatesMap?: Map<string, SeasonDates>,
): Question[] => {
  const activeTeams = teams.filter((t) => {
    if (t.is_settled) return false;
    if (t.offer <= 1.0) return false;

    const seasonData = seasonDatesMap?.get(t.market || "");
    const marketInfo = getMarketInfo(
      t.market as League,
      seasonData?.start_date,
      seasonData?.end_date,
      seasonData?.stage || undefined,
    );
    return marketInfo.isOpen;
  });

  const teamsByMarket = new Map<string, Team[]>();
  activeTeams.forEach((team) => {
    const market = team.market || "Unknown";
    if (!teamsByMarket.has(market)) {
      teamsByMarket.set(market, []);
    }
    teamsByMarket.get(market)!.push(team);
  });

  const questions: Question[] = [];

  const getMarketConfig = (market: string) => {
    switch (market) {
      case "NBA":
        return {
          icon: <Activity className="w-3 h-3 text-orange-400" />,
          color: "from-orange-500/20 to-amber-500/20",
          borderColor: "group-hover:border-orange-500/50",
        };
      case "EPL":
        return {
          icon: <Trophy className="w-3 h-3 text-purple-400" />,
          color: "from-purple-500/20 to-blue-500/20",
          borderColor: "group-hover:border-purple-500/50",
        };
      case "F1":
        return {
          icon: <Flag className="w-3 h-3 text-red-400" />,
          color: "from-red-500/20 to-orange-500/20",
          borderColor: "group-hover:border-red-500/50",
        };
      case "UCL":
        return {
          icon: <Trophy className="w-3 h-3 text-blue-400" />,
          color: "from-blue-600/20 to-indigo-600/20",
          borderColor: "group-hover:border-blue-500/50",
        };
      case "NFL":
        return {
          icon: <Trophy className="w-3 h-3 text-blue-800" />,
          color: "from-blue-800/20 to-blue-900/20",
          borderColor: "group-hover:border-blue-800/50",
        };
      case "SPL":
        return {
          icon: <Activity className="w-3 h-3 text-green-400" />,
          color: "from-green-500/20 to-emerald-500/20",
          borderColor: "group-hover:border-green-500/50",
        };
      default:
        return {
          icon: <Activity className="w-3 h-3 text-gray-400" />,
          color: "from-gray-500/20 to-slate-500/20",
          borderColor: "group-hover:border-gray-500/50",
        };
    }
  };

  teamsByMarket.forEach((marketTeams, market) => {
    const top3Teams = marketTeams.sort((a, b) => b.offer - a.offer).slice(0, 3);
    if (top3Teams.length === 0) return;

    const config = getMarketConfig(market);
    const totalVolume = top3Teams.reduce((sum, team) => {
      const validId = parseInt(team.id) || team.name.length;
      return sum + (team.offer * (10000 + validId * 100)) / 1000;
    }, 0);

    const volStr =
      totalVolume > 1000
        ? `$${(totalVolume / 1000).toFixed(1)}M`
        : `$${totalVolume.toFixed(0)}K`;

    const topTokens: IndexToken[] = top3Teams.map((team) => {
      const change = Math.random() * 20 - 5;
      return {
        id: team.id,
        name: team.name,
        price: team.offer,
        change,
        changeDisplay: `${Math.abs(change).toFixed(1)}`,
      };
    });

    questions.push({
      id: `${market.toLowerCase()}-index`,
      market: market,
      question: `Top ${market} Index Tokens`,
      topTokens,
      volume: volStr,
      icon: config.icon,
      color: config.color,
      borderColor: config.borderColor,
      seasonData: seasonDatesMap?.get(market),
    });
  });

  return questions.slice(0, 5);
};

interface TrendingCarouselProps {
  teams: Team[];
  onViewAsset?: (asset: Team) => void;
  seasonDatesMap?: Map<string, SeasonDates>;
}

const TrendingCarousel: React.FC<TrendingCarouselProps> = ({
  teams,
  onViewAsset,
  seasonDatesMap,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const questionPool = useMemo(
    () => generateQuestions(teams, seasonDatesMap),
    [teams, seasonDatesMap],
  );

  const handleNext = () => {
    if (!isAnimating && questionPool.length > 0) {
      setIsAnimating(true);
      setCurrentIndex((prev) => (prev + 1) % questionPool.length);
      setTimeout(() => setIsAnimating(false), 500);
    }
  };

  const handlePrev = () => {
    if (!isAnimating && questionPool.length > 0) {
      setIsAnimating(true);
      setCurrentIndex(
        (prev) => (prev - 1 + questionPool.length) % questionPool.length,
      );
      setTimeout(() => setIsAnimating(false), 500);
    }
  };

  useEffect(() => {
    const interval = setInterval(handleNext, 8000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const handleTokenClick = (tokenId: string) => {
    if (onViewAsset) {
      const asset = teams.find((t) => t.id === tokenId);
      if (asset) onViewAsset(asset);
    }
  };

  if (questionPool.length === 0) return null;

  const tokenColorClasses = [
    { bg: "bg-green-500" },
    { bg: "bg-blue-500" },
    { bg: "bg-amber-500" },
  ];
  const tokenColors = ["#10b981", "#3b82f6", "#f59e0b"];

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
        <div
          className="flex w-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {questionPool.map((question) => {
            const chartData = generateTriplePriceHistory(question.topTokens, 7);

            return (
              <div key={question.id} className="w-full flex-shrink-0 grid grid-cols-1 lg:grid-cols-2 min-h-[240px]">
                {/* Left Panel: Info and Buttons */}
                <div className="p-4 flex items-center justify-center">
                  <div className="w-full">
                    <div className={`group relative bg-gray-800/40 backdrop-blur-sm rounded-xl border p-3 transition-all duration-300 hover:bg-gray-800 hover:shadow-xl ${question.borderColor} border-gray-700/50`}>
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${question.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                      <div className="relative z-10 flex flex-col h-full space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-1.5 bg-gray-900/60 rounded-full px-2 py-1 border border-gray-700/50">
                            {question.icon}
                            <span className="text-xs font-medium text-gray-300">{question.market}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded border border-green-500/20">
                              <div className="relative">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                <div className="absolute inset-0 w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                              </div>
                              <span className="text-[10px] text-green-500 font-bold uppercase tracking-wide">Live</span>
                            </div>
                          </div>
                        </div>

                        <h3 className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors leading-tight">
                          {question.question}
                        </h3>

                        <div className="text-xs text-gray-500 font-mono">
                          Vol: {question.volume}
                        </div>

                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            {question.topTokens.map((token) => (
                              <button
                                key={token.id}
                                onClick={() => handleTokenClick(token.id)}
                                className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-1 flex flex-col items-center justify-center bg-[#005430] hover:bg-[#006035] border border-[#005430] rounded-lg py-2 transition-all shadow-lg shadow-black/20 min-w-[90px]"
                              >
                                <span className="text-[8px] text-emerald-100/70 font-medium mb-0.5 uppercase tracking-wide truncate w-full px-1">{token.name}</span>
                                <span className="text-sm sm:text-base font-bold text-white">${token.price.toFixed(2)}</span>
                              </button>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {question.topTokens.map((token) => {
                              const isPositive = token.change >= 0;
                              return (
                                <div key={`change-${token.id}`} className="flex items-center justify-center gap-1">
                                  {isPositive ? <FaCaretUp className="w-3 h-3 text-green-400" /> : <FaCaretDown className="w-3 h-3 text-red-400" />}
                                  <span className={`text-xs font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                                    ${token.changeDisplay}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Chart */}
                <div className="bg-slate-800 p-4 border-l border-gray-800 flex flex-col">
                  {/* Header: Season Dates (Top Center) & Logo */}
                  <div className="flex items-center justify-center mb-2 relative">
                    {question.seasonData && (
                      <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-gray-950/40 px-2.5 py-1 rounded-lg border border-gray-700/20">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">Start:</span>
                          <span className="text-gray-400">{new Date(question.seasonData.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                        <div className="w-1 h-1 bg-gray-600 rounded-full" />
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">End:</span>
                          <span className="text-gray-400">{new Date(question.seasonData.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                      </div>
                    )}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-60">
                      <img src="/logos/white_icon_on_green.jpeg" alt="Logo" className="w-5 h-5 object-contain" />
                    </div>
                  </div>

                  {/* Sub-Header: Legend (Below Dates) */}
                  <div className="flex items-center justify-start mb-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {question.topTokens.map((token, idx) => (
                        <div key={token.id} className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${tokenColorClasses[idx].bg} shadow-sm`} />
                          <span className="text-[10px] font-medium text-gray-400 truncate max-w-[70px]">{token.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 min-h-[160px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="date" stroke="#4B5563" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <CartesianGrid stroke="#4B5563" strokeDasharray="3 3" vertical={false} />
                        <YAxis
                          stroke="#4B5563"
                          tick={{ fill: "#9CA3AF", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          orientation="right"
                          domain={[
                            (dataMin: number) => Math.max(0, dataMin - 5),
                            (dataMax: number) => dataMax + 5,
                          ]}
                          tickFormatter={(val) => `$${val.toFixed(2)}`}
                        />


                        <Tooltip
                          contentStyle={{ backgroundColor: "#1a2332", border: "1px solid #374151", borderRadius: "8px", color: "#fff" }}
                          formatter={(value, name) => {
                            const tokenIdx = parseInt(name.toString().replace("token", ""));
                            const tokenName = question.topTokens[tokenIdx]?.name || name;
                            return [`${Number(value).toFixed(1)}`, tokenName];
                          }}
                        />
                        {question.topTokens.map((token, idx) => (
                          <Line key={token.id} type="monotone" dataKey={`token${idx}`} stroke={tokenColors[idx]} strokeWidth={2.5} dot={false} animationDuration={1000} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-800 bg-slate-900">
          <button
            onClick={handlePrev}
            disabled={isAnimating}
            className="p-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/50 rounded-full text-white transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl backdrop-blur-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            {questionPool.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (!isAnimating) {
                    setIsAnimating(true);
                    setCurrentIndex(idx);
                    setTimeout(() => setIsAnimating(false), 500);
                  }
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? "w-8 bg-green-500" : "w-1.5 bg-gray-600 hover:bg-gray-500"
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
