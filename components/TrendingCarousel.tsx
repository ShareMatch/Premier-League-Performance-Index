import React, { useState, useEffect, useMemo } from "react";
import type { SeasonDates } from "../lib/api";
import type { Team, League } from "../types";
import {
  TrendingUp,
  Zap,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Flag,
  Activity,
} from "lucide-react";
import { FaCaretUp, FaCaretDown } from "react-icons/fa";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  ReferenceDot,
} from "recharts";
import InfoTooltip from "./InfoTooltip";
import { getMarketInfo } from "../lib/marketInfo";
import tooltipText from "../resources/ToolTip.txt?raw";

interface IndexToken {
  id: string;
  name: string;
  price: number;
  change: number;
  changeDisplay: string;
  color?: string;
  team: Team;
}

type TimeRange = "1D" | "1W" | "1M" | "ALL";

interface HistoryPoint {
  time: string;
  price: number;
  volume: number;
  timestamp: number;
}

// Helper to get index avatar URL
const getIndexAvatarUrl = (market: string): string | null => {
  const INDEX_AVATARS: Record<string, string> = {
    EPL: "/index-avatars/epl.svg",
    UCL: "/index-avatars/ucl.svg",
    SPL: "/index-avatars/spl.svg",
    F1: "/index-avatars/f1.svg",
    WC: "/index-avatars/wc.svg",
    NBA: "/index-avatars/nba.svg",
    NFL: "/index-avatars/nfl.svg",
    T20: "/index-avatars/t20.svg",
    ISL: "/index-avatars/isl.svg",
  };
  if (!market) return null;
  return INDEX_AVATARS[market.toUpperCase()] || null;
};

// Generate asset history using the same logic as AssetPage
const generateAssetHistory = (
  basePrice: number,
  period: "1h" | "24h" | "7d" | "1M" | "All" = "24h",
  assetName?: string,
  startDate?: Date
): HistoryPoint[] => {
  const data: HistoryPoint[] = [];
  const now = new Date();

  let interval = 15 * 60 * 1000;
  let points = 100;
  let volatility = 0.02;

  switch (period) {
    case "1h":
      interval = 1 * 60 * 1000;
      points = 60;
      volatility = 0.005;
      break;
    case "24h":
      interval = 15 * 60 * 1000;
      points = 96;
      volatility = 0.02;
      break;
    case "7d":
      interval = 4 * 60 * 60 * 1000;
      points = 42;
      volatility = 0.05;
      break;
    case "1M":
      interval = 8 * 60 * 60 * 1000; // 8 hours
      points = 90; // About 30 days
      volatility = 0.08;
      break;
    case "All":
      interval = 24 * 60 * 60 * 1000;
      if (startDate) {
        const daysSinceStart = Math.ceil(
          (now.getTime() - startDate.getTime()) / interval
        );
        points = Math.max(1, daysSinceStart);
      } else {
        points = 180;
      }
      volatility = 0.1;
      break;
  }

  let currentPrice = basePrice;
  for (let i = 0; i <= points; i++) {
    const time = new Date(now.getTime() - i * interval);
    const change = (Math.random() - 0.5) * (basePrice * volatility);
    currentPrice += change;
    currentPrice = Math.max(0.01, currentPrice);

    const isSpike = Math.random() > 0.9;
    const baseVolume = 1000 + Math.random() * 5000;
    const volume = isSpike ? baseVolume * (2 + Math.random() * 3) : baseVolume;

    let timeLabel = "";
    if (period === "1h" || period === "24h") {
      timeLabel = time.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (period === "All") {
      timeLabel = time.toLocaleDateString([], { month: "short" });
    } else {
      timeLabel = time.toLocaleDateString([], {
        day: "numeric",
        month: "short",
      });
    }

    data.unshift({
      time: timeLabel,
      price: Number(currentPrice.toFixed(3)),
      volume: Math.floor(volume),
      timestamp: time.getTime(),
    });
  }

  if (data.length > 0) {
    data[data.length - 1].price = basePrice;
  }

  return data;
};

// Convert TimeRange to period format
const convertTimeRangeToPeriod = (
  range: TimeRange
): "1h" | "24h" | "7d" | "1M" | "All" => {
  switch (range) {
    case "1D":
      return "24h";
    case "1W":
      return "7d";
    case "1M":
      return "1M";
    case "ALL":
      return "All";
    default:
      return "24h";
  }
};

// Generate combined data for all tokens
const generateMultiTokenHistory = (
  tokens: IndexToken[],
  range: TimeRange,
  startDate?: Date
) => {
  const period = convertTimeRangeToPeriod(range);

  const baseHistory = generateAssetHistory(
    tokens[0].price,
    period,
    tokens[0].name,
    startDate
  );
  const otherHistories = tokens
    .slice(1)
    .map((token) =>
      generateAssetHistory(token.price, period, token.name, startDate)
    );

  return baseHistory.map((point, idx) => {
    const dataPoint: any = {
      time: point.time,
      token0: point.price,
      volume0: point.volume,
    };

    otherHistories.forEach((history, tokenIdx) => {
      if (history[idx]) {
        dataPoint[`token${tokenIdx + 1}`] = history[idx].price;
        dataPoint[`volume${tokenIdx + 1}`] = history[idx].volume;
      }
    });

    return dataPoint;
  });
};

interface TrendingCarouselProps {
  teams?: Team[]; // Make optional to avoid breaking other usages initially, though we should pass it
  seasonDatesMap?: Map<string, SeasonDates>;
  onViewAsset?: (asset: Team) => void;
  onSelectOrder?: (team: Team, type: "buy" | "sell") => void;
  onCurrentTeamsChange?: (teamIds: string[]) => void
}

const TrendingCarousel: React.FC<TrendingCarouselProps> = ({
  teams = [],
  seasonDatesMap,
  onViewAsset,
  onSelectOrder,
  onCurrentTeamsChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("1W");
  const [activeHover, setActiveHover] = useState<{
    chartId: string;
    index: number;
    coordX?: number;
  } | null>(null);

  const DEFAULT_COLORS = ["#17B76E", "#FFBF00", "#E24A3F"];

  const questionPool = useMemo(() => {
    // Helper to get top 3 teams for a market
    const getTopTeams = (marketId: string) => {
      return teams
        .filter((t) => t.market === marketId)
        .sort((a, b) => b.offer - a.offer)
        .slice(0, 3)
        .map((t, idx) => ({
          id: t.id,
          name: t.name,
          price: t.offer,
          change: Math.random() * 5 * (Math.random() > 0.4 ? 1 : -1), // Mock change
          changeDisplay: (Math.random() * 5).toFixed(2), // Mock display
          color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
          team: t,
        }));
    };

    const markets = [
      {
        id: "nba-index",
        market: "NBA",
        fullName: "NBA",
        question: "Top NBA Finals?",
        icon: <Activity className="w-3 h-3 text-orange-400" />,
        color: "from-orange-500/20 to-amber-500/20",
        borderColor: "group-hover:border-orange-500/50",
      },
      {
        id: "epl-index",
        market: "EPL",
        fullName: "England Premier League",
        question: "Premier League Title Race",
        icon: <Trophy className="w-3 h-3 text-purple-400" />,
        color: "from-purple-500/20 to-blue-500/20",
        borderColor: "group-hover:border-purple-500/50",
      },
      {
        id: "ucl-index",
        market: "UCL",
        fullName: "Champions League",
        question: "UEFA Champions League Favorites",
        icon: <Trophy className="w-3 h-3 text-blue-400" />,
        color: "from-blue-600/20 to-indigo-600/20",
        borderColor: "group-hover:border-blue-500/50",
      },
      {
        id: "nfl-index",
        market: "NFL",
        fullName: "NFL",
        question: "Super Bowl Contenders",
        icon: <Trophy className="w-3 h-3 text-blue-800" />,
        color: "from-blue-800/20 to-blue-900/20",
        borderColor: "group-hover:border-blue-800/50",
      },
    ];

    // Map markets to Question format, filtering out closed markets and those with no teams
    const results = markets
      .filter((m) => {
        const seasonData = seasonDatesMap?.get(m.market);
        const info = getMarketInfo(
          m.market as League,
          seasonData?.start_date,
          seasonData?.end_date,
          seasonData?.stage || undefined
        );
        return info.isOpen;
      })
      .map((m) => {
        const topTokens = getTopTeams(m.market);
        const topTeam = topTokens[0];

        // Volume logic consistent with HotQuestions.tsx
        let volStr = "$0K";
        if (topTeam) {
          const teamObj = topTeam.team;
          const validId = parseInt(teamObj.id) || teamObj.name.length;
          const volNum = (teamObj.offer * (10000 + validId * 100)) / 1000;
          volStr =
            volNum > 1000
              ? `$${(volNum / 1000).toFixed(1)}M`
              : `$${volNum.toFixed(0)}K`;
        }

        return {
          ...m,
          topTokens,
          question: `Will ${topTeam?.name} top the ${m.fullName} Index?`,
          volume: volStr,
        };
      })
      .filter((q) => q.topTokens.length > 0);

    // Randomize the order of the pool
    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [results[i], results[j]] = [results[j], results[i]];
    }

    return results;
  }, [teams, seasonDatesMap]);

  const chartDataMap = useMemo(() => {
    const map = new Map<string, any[]>();
    questionPool.forEach((question) => {
      const key = `${question.id}-${timeRange}`;
      const seasonData = seasonDatesMap?.get(question.market);
      const startDate = seasonData
        ? new Date(seasonData.start_date)
        : undefined;
      map.set(
        key,
        generateMultiTokenHistory(question.topTokens, timeRange, startDate)
      );
    });
    return map;
  }, [questionPool, timeRange, seasonDatesMap]);

  const handleNext = () => {
    if (!isAnimating && questionPool.length > 0) {
      setIsAnimating(true);
      setCurrentIndex((prev) => (prev + 1) % questionPool.length);
      setTimeout(() => setIsAnimating(false), 500);
    }
  };

  const handleHover = (e: any, chartId: string) => {
    if (e && e.activeTooltipIndex !== undefined) {
      setActiveHover({
        chartId,
        index: e.activeTooltipIndex,
        coordX: e.activeCoordinate?.x,
      });
    }
  };


  const handlePrev = () => {
    if (!isAnimating && questionPool.length > 0) {
      setIsAnimating(true);
      setCurrentIndex(
        (prev) => (prev - 1 + questionPool.length) % questionPool.length
      );
      setTimeout(() => setIsAnimating(false), 500);
    }
  };

  const CustomCursor = (props: any) => {
    const { points, width, height } = props;
    if (!points) return null;

    const x = points[0].x; // this is EXACT x of active dot
    return (
      <g>
        <line
          x1={x}
          x2={x}
          y1={0}
          y2={height}
          stroke="#4b5563"
          strokeDasharray="3 3"
        />
      </g>
    );
  };




  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="bg-[#0B1221] border border-[#005430] rounded shadow-xl"
          style={{
            padding: "clamp(4px, 1vw, 12px)", // smaller padding on mobile
            fontSize: "clamp(10px, 2vw, 14px)", // responsive text size
            maxWidth: "clamp(120px, 40vw, 220px)", // limit width on mobile
            lineHeight: "1.2",
          }}
        >
          <p
            style={{
              color: "#9ca3af",
              marginBottom: "clamp(2px, 0.5vw, 6px)",
              fontSize: "clamp(9px, 1.5vw, 12px)",
            }}
          >
            {label}
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(2px, 0.5vw, 6px)",
            }}
          >
            {payload.map((entry: any, index: number) => {
              const tokenIndex = parseInt(entry.dataKey.replace("token", ""));
              const token = questionPool[currentIndex].topTokens[tokenIndex];
              if (!token) return null;

              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "clamp(4px, 1vw, 10px)",
                    fontSize: "clamp(8px, 1.5vw, 12px)",
                    fontWeight: 700,
                    color: entry.color,
                  }}
                >
                  <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {token.name}:
                  </span>
                  <span>${Number(entry.value).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };


  useEffect(() => {
    if (questionPool.length > 0 && onCurrentTeamsChange) {
      const currentQuestion = questionPool[currentIndex];
      const currentTeamIds = currentQuestion.topTokens.map(t => t.id);
      onCurrentTeamsChange(currentTeamIds);
    }
  }, [currentIndex, questionPool, onCurrentTeamsChange]);


  useEffect(() => {
    if (questionPool.length > 0) {
      const randomIndex = Math.floor(Math.random() * questionPool.length);
      setCurrentIndex(randomIndex);
    }
  }, [questionPool.length]);

  useEffect(() => {
    const interval = setInterval(handleNext, 8000);
    return () => clearInterval(interval);
  }, [currentIndex, questionPool.length]);

  if (questionPool.length === 0) return null;

  return (
    <div className="space-y-2 sm:space-y-3 md:space-y-4">
      <div className="flex items-center justify-between px-1 sm:px-1">
        <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-white flex items-center gap-1 sm:gap-2 flex-wrap">
          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Trending Markets
          </span>
          <img
            src="/logos/white_icon_on_black-removebg-preview.png"
            alt="Zap"
            className="w-[clamp(1rem,5vw,2rem)] h-[clamp(1rem,5vw,2rem)] object-contain animate-pulse ml-0.5 sm:ml-1 flex-shrink-0"
          />
        </h2>
      </div>

      <div className="relative bg-slate-900 rounded-lg sm:rounded-xl md:rounded-2xl border border-gray-800 overflow-hidden max-w-7xl mx-auto">
        <div
          className="flex w-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {questionPool.map((question) => {
            const chartData =
              chartDataMap.get(`${question.id}-${timeRange}`) || [];

            // Calculate right padding for XAxis dynamically
            const xAxisRightPadding = (() => {
              if (chartData.length === 0) return 40;
              const fontSize = window.innerWidth < 640 ? 8 : window.innerWidth < 1024 ? 9 : 10;
              const font = `${fontSize}px sans-serif`;
              const canvas = document.createElement("canvas");
              const context = canvas.getContext("2d");
              if (!context) return 40;

              context.font = font;
              const maxWidth = Math.max(...chartData.map((d) => context.measureText(d.time).width));
              return Math.ceil(maxWidth) + 45; // add extra padding
            })();

            return (
              <div
                key={question.id}
                className="w-full flex-shrink-0 grid grid-cols-1 lg:grid-cols-2"
              >
                {/* Left Column - Question Card */}
                <div className="p-[clamp(0.375rem,1.2vw,2rem)] flex bg-[#0b1221]">
                  <div className="w-full">
                    <div
                      className={`group relative bg-[#0b1221] rounded-lg sm:rounded-xl border p-[clamp(0.375rem,0.9vw,0.75rem)] transition-all duration-300 hover:bg-gray-800/10 hover:shadow-xl ${question.borderColor} border-gray-800 h-full flex flex-col justify-between`}
                    >
                      <div
                        className={`absolute inset-0 rounded-xl bg-gradient-to-br ${question.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`}
                      />
                      <div className="relative z-10 flex flex-col h-full gap-8">
                        <div className="flex flex-col gap-1.5 sm:gap-2 md:gap-2 lg:gap-1.5">
                          <div className="flex justify-between items-center gap-1.5 sm:gap-2">
                            <div className="flex items-center gap-[clamp(0.5rem,1.5vw,1rem)] md:gap-3 overflow-visible min-w-0 min-h-0 flex-1 ml-[clamp(0.25rem,1vw,0.5rem)]">
                              {(() => {
                                const indexAvatarUrl = getIndexAvatarUrl(
                                  question.market
                                );
                                const avatarSizeClass = "w-[clamp(3.5rem,10vw,5rem)] h-[clamp(3.5rem,10vw,5rem)] flex-shrink-0";
                                return indexAvatarUrl ? (
                                  <img
                                    src={indexAvatarUrl}
                                    alt={`${question.market} Index`}
                                    className={`${avatarSizeClass}`}
                                  />
                                ) : (
                                  <div className={`${avatarSizeClass} flex items-center justify-center bg-gray-800/50 rounded-lg`}>
                                    {question.icon}
                                  </div>
                                );
                              })()}

                              <div className="flex-1 min-w-0 flex flex-col justify-center mt-[clamp(0.75rem,2vw,1.25rem)]">
                                <h3 className="text-[clamp(0.75rem,2.5vw,1.125rem)] font-bold text-gray-100 group-hover:text-white transition-colors leading-tight line-clamp-2">
                                  {question.question}
                                </h3>
                                <div className="text-[clamp(0.5rem,1.2vw,0.625rem)] text-gray-500 font-mono uppercase tracking-wider mt-1">
                                  Vol: {question.volume}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                                {/* Info Tooltip */}
                                <InfoTooltip
                                  text={tooltipText}
                                />

                                {/* Live Badge */}
                                <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-500/10 rounded border border-green-500/20 flex-shrink-0">
                                  <div className="relative">
                                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-green-500 rounded-full" />
                                    <div className="absolute inset-0 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-green-500 rounded-full animate-ping" />
                                  </div>
                                  <span className="text-[8px] sm:text-[9px] md:text-[10px] text-green-500 font-bold uppercase tracking-wide">
                                    Live
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-[clamp(0.1rem,1.5vw,0.5rem)]">
                          {question.topTokens.map((token) => (
                            <div
                              key={token.id}
                              className="flex items-center justify-between bg-gray-900/40 border border-gray-800/50 rounded-lg py-1 sm:py-1.5 px-2 sm:px-3 hover:bg-gray-800/60 transition-all cursor-pointer group/row text-xs sm:text-sm"
                            >
                              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onViewAsset) onViewAsset(token.team);
                                  }}
                                  className="text-[9px] sm:text-xs md:text-xs font-bold text-gray-200 truncate hover:text-brand-primary hover:underline transition-all text-left"
                                >
                                  {token.name}
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                                <div className="flex items-center gap-1 sm:gap-2 flex-wrap sm:flex-nowrap justify-end">
                                  <span
                                    className={`text-[7px] sm:text-[8px] md:text-[10px] font-bold flex items-center gap-0.5 whitespace-nowrap ${token.change >= 0
                                      ? "text-green-400"
                                      : "text-red-400"
                                      }`}
                                  >
                                    {token.change >= 0 ? (
                                      <FaCaretUp className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
                                    ) : (
                                      <FaCaretDown className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
                                    )}
                                    ${token.changeDisplay}
                                    <span className="ml-0.5">
                                      ({timeRange})
                                    </span>
                                  </span>
                                  <span className="text-[9px] sm:text-xs md:text-sm font-black text-gray-100 min-w-[40px] sm:min-w-[50px] text-right">
                                    ${token.price.toFixed(2)}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelectOrder) {
                                      onSelectOrder(token.team, "buy");
                                    }
                                  }}
                                  className="bg-[#005430] hover:bg-[#006035] text-white text-[7px] sm:text-[8px] md:text-[10px] font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all shadow-lg shadow-black/20 uppercase tracking-wider flex-shrink-0"
                                >
                                  Buy
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Chart */}
                <div className="flex bg-[#0b1221] p-[clamp(0.375rem,1.2vw,2rem)]">
                  <div className="w-full bg-[#0b1221] border border-gray-800 h-full flex flex-col justify-between p-[clamp(0.375rem,1.2vw,0.75rem)] rounded-[clamp(0.375rem,0.75vw,0.5rem)]">
                    <div className="flex items-center justify-between gap-[clamp(0.375rem,1.5vw,1rem)] mb-[clamp(0.375rem,1vw,0.75rem)]">
                      {/* Left Side: Time Range Buttons */}
                      <div className="flex items-center gap-[clamp(0.25rem,0.5vw,0.375rem)]">
                        {(["1D", "1W", "1M", "ALL"] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => setTimeRange(r)}
                            className={`rounded-full font-medium transition-colors whitespace-nowrap text-[clamp(0.375rem,0.6vw,0.55rem)] px-[clamp(0.25rem,0.7vw,0.6rem)] py-[clamp(0.0625rem,0.35vw,0.25rem)] ${timeRange === r
                              ? "bg-[#005430] text-white"
                              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                              }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-[clamp(0.375rem,1vw,0.75rem)]">
                        {(() => {
                          const seasonData = seasonDatesMap?.get(
                            question.market
                          );
                          if (!seasonData) return null;

                          const startDate = new Date(seasonData.start_date);
                          const endDate = new Date(seasonData.end_date);

                          return (
                            <div className="flex items-center uppercase tracking-wider text-gray-400 gap-[clamp(0.25rem,0.75vw,0.5rem)] text-[clamp(0.5rem,0.75vw,0.625rem)]">
                              <div className="flex items-center gap-[clamp(0.125rem,0.25vw,0.25rem)]">
                                <span className="text-gray-600">Start:</span>
                                <span className="text-gray-400 whitespace-nowrap">
                                  {startDate.toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                              <div className="bg-gray-600 rounded-full w-[clamp(0.125rem,0.25vw,0.25rem)] h-[clamp(0.125rem,0.25vw,0.25rem)]" />
                              <div className="flex items-center gap-[clamp(0.125rem,0.25vw,0.25rem)]">
                                <span className="text-gray-600">End:</span>
                                <span className="text-gray-400 whitespace-nowrap">
                                  {endDate.toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Logo on Right */}
                      <div className="flex items-center flex-shrink-0">
                        <img
                          src="/logos/white_icon_on_black-removebg-preview.png"
                          alt="Logo"
                          className="object-contain w-[clamp(1rem,2.5vw,2.5rem)] h-[clamp(1rem,2.5vw,2.5rem)]"
                        />
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="w-full h-40 sm:h-48 md:h-52 lg:h-56 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={chartData}
                          margin={{ top: 10, right: 5, left: 0, bottom: 20 }}
                          onMouseMove={(e: any) => handleHover(e, question.id)}
                          onTouchStart={(e: any) => handleHover(e, question.id)}
                          onTouchMove={(e: any) => handleHover(e, question.id)}
                          onMouseLeave={() => setActiveHover(null)}
                          onTouchEnd={() => setActiveHover(null)}
                          syncMethod="value"
                        >
                          <defs>
                            {question.topTokens.map((token, idx) => (
                              <linearGradient
                                key={token.id}
                                id={`colorToken${idx}-${question.id}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor={token.color || DEFAULT_COLORS[idx]}
                                  stopOpacity={0.8}
                                />
                                <stop
                                  offset="95%"
                                  stopColor={token.color || DEFAULT_COLORS[idx]}
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#1f2937"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="time"
                            tick={{
                              fill: "#6b7280",
                              fontSize:
                                window.innerWidth < 640
                                  ? 8
                                  : window.innerWidth < 1024
                                    ? 9
                                    : 10,
                            }}
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            minTickGap={
                              window.innerWidth < 640
                                ? 20
                                : window.innerWidth < 1024
                                  ? 25
                                  : 30
                            }
                            padding={{
                              left: window.innerWidth < 640 ? 10 : 20,
                              right: xAxisRightPadding,
                            }}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            domain={[
                              (dataMin: number) => Math.max(0, dataMin - 20),
                              (dataMax: number) => dataMax + 20,
                            ]}
                            tickCount={window.innerWidth < 640 ? 4 : 6}
                            tick={{
                              fill: "#9ca3af",
                              fontSize:
                                window.innerWidth < 640
                                  ? 8
                                  : window.innerWidth < 1024
                                    ? 9
                                    : 11,
                            }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val: number | string) =>
                              `$${Number(val).toFixed(1)}`
                            }
                            width={
                              window.innerWidth < 640
                                ? 35
                                : window.innerWidth < 1024
                                  ? 40
                                  : 50
                            }
                          />
                          <Tooltip
                            content={<CustomTooltip />}
                            cursor={<CustomCursor />}
                          />

                          {/* Render hover labels using ReferenceDot with custom label */}
                          {activeHover?.chartId === question.id &&
                            chartData[activeHover.index] &&
                            question.topTokens.map((token, idx) => {
                              const value =
                                chartData[activeHover.index][`token${idx}`];
                              if (value === undefined) return null;

                              const color =
                                token.color ||
                                DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

                              return (
                                <ReferenceDot
                                  key={token.id}
                                  yAxisId="right"
                                  x={chartData[activeHover.index].time}
                                  y={value}
                                  r={window.innerWidth < 640 ? 3 : 4} // smaller dot on mobile
                                  fill={color}
                                  stroke="#000"
                                  strokeWidth={1.5}
                                  label={(props: any) => {
                                    const { viewBox } = props;
                                    if (!viewBox) return null;

                                    const { x, y } = viewBox;
                                    const coordX = activeHover.coordX || 0;

                                    // show label on left or right
                                    const showOnRight = coordX < x;
                                    const xOffset = showOnRight ? (window.innerWidth < 640 ? 6 : 10) : (window.innerWidth < 640 ? -6 : -10);
                                    const textAnchor = showOnRight ? "start" : "end";

                                    // responsive font sizes
                                    const nameFontSize = `clamp(6px, 1vw, 9px)`; // min 6px, max 9px
                                    const valueFontSize = `clamp(8px, 1.2vw, 12px)`; // min 8px, max 12px

                                    return (
                                      <g>
                                        <text
                                          x={x + xOffset}
                                          y={y - 12}
                                          fill={color}
                                          fontSize={nameFontSize}
                                          fontWeight="700"
                                          textAnchor={textAnchor}
                                          style={{ textTransform: "uppercase" }}
                                        >
                                          {token.name}
                                        </text>
                                        <text
                                          x={x + xOffset}
                                          y={y + 4}
                                          fill={color}
                                          fontSize={valueFontSize}
                                          fontWeight="800"
                                          fontFamily="monospace"
                                          textAnchor={textAnchor}
                                        >
                                          ${Number(value).toFixed(2)}
                                        </text>
                                      </g>
                                    );
                                  }}
                                />

                              );
                            })}

                          {/* Lines for each token */}
                          {(() => {
                            const lastPoint = chartData[chartData.length - 1];
                            const sortedTokens = question.topTokens
                              .map((t, i) => ({
                                ...t,
                                val: lastPoint?.[`token${i}`] as number,
                                originalIdx: i,
                              }))
                              .sort((a, b) => b.val - a.val);

                            return question.topTokens.map((token, idx) => {
                              const color =
                                token.color ||
                                DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
                              const rank = sortedTokens.findIndex(
                                (s) => s.originalIdx === idx
                              );
                              const yShift = (rank - 1) * 18;

                              return (
                                <Line
                                  key={token.id}
                                  yAxisId="right"
                                  type="monotone"
                                  dataKey={`token${idx}`}
                                  stroke={color}
                                  strokeWidth={2}
                                  dot={false}
                                  activeDot={{ r: 0, strokeWidth: 0 }}
                                  animationDuration={500}
                                >
                                  {!activeHover && (
                                    <LabelList
                                      dataKey={`token${idx}`}
                                      content={(props: any) => {
                                        const { x, y, index, value } = props;
                                        if (index !== chartData.length - 1) return null;

                                        // responsive font sizes
                                        const nameFontSize =
                                          window.innerWidth < 640 ? 6 : window.innerWidth < 1024 ? 8 : 9;
                                        const valueFontSize =
                                          window.innerWidth < 640 ? 8 : window.innerWidth < 1024 ? 10 : 12;

                                        return (
                                          <g>
                                            <text
                                              x={x + 5}
                                              y={y + yShift - 6}
                                              fill={color}
                                              fontSize={nameFontSize}
                                              fontWeight="700"
                                              style={{ textTransform: "uppercase" }}
                                            >
                                              {token.name}
                                            </text>
                                            <text
                                              x={x + 5}
                                              y={y + yShift + 6}
                                              fill={color}
                                              fontSize={valueFontSize}
                                              fontWeight="800"
                                              fontFamily="monospace"
                                            >
                                              ${Number(value).toFixed(2)}
                                            </text>
                                          </g>
                                        );
                                      }}
                                    />
                                  )}
                                </Line>
                              );
                            });
                          })()}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-[#0b1221]">
          <button
            onClick={handlePrev}
            disabled={isAnimating}
            className="p-1.5 sm:p-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/50 rounded-full text-white transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl backdrop-blur-sm flex-shrink-0"
          >
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
          <div className="flex items-center gap-1 sm:gap-2 px-2">
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
                className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex
                  ? "w-6 sm:w-8 bg-green-500"
                  : "w-1 sm:w-1.5 bg-gray-600 hover:bg-gray-500"
                  }`}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            disabled={isAnimating}
            className="p-1.5 sm:p-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/50 rounded-full text-white transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl backdrop-blur-sm flex-shrink-0"
          >
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrendingCarousel;
