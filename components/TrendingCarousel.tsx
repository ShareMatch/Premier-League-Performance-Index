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
import InfoPopup from "./InfoPopup";
import { getMarketInfo } from "../lib/marketInfo";



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
    'EPL': '/index-avatars/epl.svg',
    'UCL': '/index-avatars/ucl.svg',
    'SPL': '/index-avatars/spl.svg',
    'F1': '/index-avatars/f1.svg',
    'WC': '/index-avatars/wc.svg',
    'NBA': '/index-avatars/nba.svg',
    'NFL': '/index-avatars/nfl.svg',
    'T20': '/index-avatars/t20.svg',
    'ISL': '/index-avatars/isl.svg',
  };
  if (!market) return null;
  return INDEX_AVATARS[market.toUpperCase()] || null;
};

// Generate asset history using the same logic as AssetPage
const generateAssetHistory = (
  basePrice: number,
  period: '1h' | '24h' | '7d' | '1M' | 'All' = '24h',
  assetName?: string,
  startDate?: Date
): HistoryPoint[] => {
  const data: HistoryPoint[] = [];
  const now = new Date();

  let interval = 15 * 60 * 1000;
  let points = 100;
  let volatility = 0.02;

  switch (period) {
    case '1h':
      interval = 1 * 60 * 1000;
      points = 60;
      volatility = 0.005;
      break;
    case '24h':
      interval = 15 * 60 * 1000;
      points = 96;
      volatility = 0.02;
      break;
    case '7d':
      interval = 4 * 60 * 60 * 1000;
      points = 42;
      volatility = 0.05;
      break;
    case '1M':
      interval = 8 * 60 * 60 * 1000; // 8 hours
      points = 90; // About 30 days
      volatility = 0.08;
      break;
    case 'All':
      interval = 24 * 60 * 60 * 1000;
      if (startDate) {
        const daysSinceStart = Math.ceil((now.getTime() - startDate.getTime()) / interval);
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

    let timeLabel = '';
    if (period === '1h' || period === '24h') {
      timeLabel = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (period === 'All') {
      timeLabel = time.toLocaleDateString([], { month: 'short' });
    } else {
      timeLabel = time.toLocaleDateString([], { day: 'numeric', month: 'short' });
    }

    data.unshift({
      time: timeLabel,
      price: Number(currentPrice.toFixed(3)),
      volume: Math.floor(volume),
      timestamp: time.getTime()
    });
  }

  if (data.length > 0) {
    data[data.length - 1].price = basePrice;
  }

  return data;
};

// Convert TimeRange to period format
const convertTimeRangeToPeriod = (range: TimeRange): '1h' | '24h' | '7d' | '1M' | 'All' => {
  switch (range) {
    case '1D': return '24h';
    case '1W': return '7d';
    case '1M': return '1M';
    case 'ALL': return 'All';
    default: return '24h';
  }
};

// Generate combined data for all tokens
const generateMultiTokenHistory = (tokens: IndexToken[], range: TimeRange, startDate?: Date) => {
  const period = convertTimeRangeToPeriod(range);

  const baseHistory = generateAssetHistory(tokens[0].price, period, tokens[0].name, startDate);
  const otherHistories = tokens.slice(1).map(token =>
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
  onSelectOrder?: (team: Team, type: 'buy' | 'sell') => void;
}

const TrendingCarousel: React.FC<TrendingCarouselProps> = ({ teams = [], seasonDatesMap, onViewAsset, onSelectOrder }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("1W");
  const [activeHover, setActiveHover] = useState<{
    chartId: string;
    index: number;
    coordX?: number;
  } | null>(null);

  const DEFAULT_COLORS = ["#E24A3F", "#17B76E", "#1693F8"];

  const questionPool = useMemo(() => {
    // Helper to get top 3 teams for a market
    const getTopTeams = (marketId: string) => {
      return teams
        .filter(t => t.market === marketId)
        .sort((a, b) => b.offer - a.offer)
        .slice(0, 3)
        .map((t, idx) => ({
          id: t.id,
          name: t.name,
          price: t.offer,
          change: Math.random() * 5 * (Math.random() > 0.4 ? 1 : -1), // Mock change
          changeDisplay: (Math.random() * 5).toFixed(2), // Mock display
          color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
          team: t
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
      }
    ];

    // Map markets to Question format, filtering out closed markets and those with no teams
    return markets
      .filter(m => {
        const seasonData = seasonDatesMap?.get(m.market);
        const info = getMarketInfo(
          m.market as League,
          seasonData?.start_date,
          seasonData?.end_date,
          seasonData?.stage || undefined
        );
        return info.isOpen;
      })
      .map(m => {
        const topTokens = getTopTeams(m.market);
        const topTeam = topTokens[0];

        // Volume logic consistent with HotQuestions.tsx
        let volStr = "$0K";
        if (topTeam) {
          const teamObj = topTeam.team;
          const validId = parseInt(teamObj.id) || teamObj.name.length;
          const volNum = (teamObj.offer * (10000 + validId * 100)) / 1000;
          volStr = volNum > 1000
            ? `$${(volNum / 1000).toFixed(1)}M`
            : `$${volNum.toFixed(0)}K`;
        }

        return {
          ...m,
          topTokens,
          question: `Will ${topTeam?.name} top the ${m.fullName} Index?`,
          volume: volStr
        };
      })
      .filter(q => q.topTokens.length > 0);

  }, [teams]);

  const chartDataMap = useMemo(() => {
    const map = new Map<string, any[]>();
    questionPool.forEach((question) => {
      const key = `${question.id}-${timeRange}`;
      const seasonData = seasonDatesMap?.get(question.market);
      const startDate = seasonData ? new Date(seasonData.start_date) : undefined;
      map.set(key, generateMultiTokenHistory(question.topTokens, timeRange, startDate));
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

  const handlePrev = () => {
    if (!isAnimating && questionPool.length > 0) {
      setIsAnimating(true);
      setCurrentIndex((prev) => (prev - 1 + questionPool.length) % questionPool.length);
      setTimeout(() => setIsAnimating(false), 500);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0B1221] border border-[#005430] p-3 rounded shadow-xl text-xs">
          <p className="text-gray-400 mb-2">{label}</p>
          <div className="flex flex-col gap-1">
            {payload.map((entry: any, index: number) => {
              const tokenIndex = parseInt(entry.dataKey.replace('token', ''));
              const token = questionPool[currentIndex].topTokens[tokenIndex];
              if (!token) return null;

              return (
                <p key={index} className="flex justify-between gap-4">
                  <span style={{ color: entry.color }} className="font-bold">
                    {token.name}:
                  </span>
                  <span style={{ color: entry.color }} className="font-bold">
                    ${Number(entry.value).toFixed(2)}
                  </span>
                </p>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    const interval = setInterval(handleNext, 8000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  if (questionPool.length === 0) return null;



  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Trending Markets
          </span>
          <Zap className="w-3 h-3 text-yellow-400 animate-pulse ml-1" fill="currentColor" />
        </h2>
      </div>

      <div className="relative bg-slate-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div
          className="flex w-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {questionPool.map((question) => {
            const chartData = chartDataMap.get(`${question.id}-${timeRange}`) || [];

            return (
              <div key={question.id} className="w-full flex-shrink-0 grid grid-cols-1 lg:grid-cols-2">
                {/* Left Column - Question Card */}
                <div className="p-4 flex bg-[#0b1221]">
                  <div className="w-full">
                    <div className={`group relative bg-[#0b1221] rounded-xl border p-4 transition-all duration-300 hover:bg-gray-800/10 hover:shadow-xl ${question.borderColor} border-gray-800 h-full flex flex-col justify-between`}>
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${question.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`} />
                      <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-3 overflow-visible">
                              {(() => {
                                const indexAvatarUrl = getIndexAvatarUrl(question.market);
                                return indexAvatarUrl ? (
                                  <img
                                    src={indexAvatarUrl}
                                    alt={`${question.market} Index`}
                                    className="w-16 h-16 block flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-16 h-16 flex items-center justify-center bg-gray-800/50 rounded-lg flex-shrink-0">
                                    {question.icon}
                                  </div>
                                );
                              })()}

                              <div className="flex-1 min-w-0 flex flex-col justify-center mb-3">
                                <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-tight whitespace-nowrap">
                                  {question.fullName} Performance Index
                                </h2>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0 mb-3">
                              {/* Info Popup */}
                              {(() => {
                                const seasonData = seasonDatesMap?.get(question.market);
                                const marketInfo = getMarketInfo(
                                  question.market as any,
                                  seasonData?.start_date,
                                  seasonData?.end_date,
                                  seasonData?.stage || undefined
                                );

                                const seasonDatesStr = seasonData
                                  ? `${new Date(seasonData.start_date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })} - ${new Date(seasonData.end_date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}`
                                  : undefined;

                                return (
                                  <InfoPopup
                                    title={`${question.market} Index`}
                                    content={marketInfo.content}
                                    seasonDates={seasonDatesStr}
                                    isMarketOpen={marketInfo.isOpen}
                                    iconSize={14}
                                  />
                                );
                              })()}

                              {/* Live Badge */}
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
                          <h3 className="text-base font-bold text-gray-100 group-hover:text-white transition-colors leading-tight">
                            {question.question}
                          </h3>
                          <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                            Vol: {question.volume}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          {question.topTokens.map((token) => (
                            <div
                              key={token.id}
                              className="flex items-center justify-between bg-gray-900/40 border border-gray-800/50 rounded-lg py-1.5 px-3 hover:bg-gray-800/60 transition-all cursor-pointer group/row"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-bold text-gray-200 truncate group-hover/row:text-brand-primary transition-colors">
                                  {token.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-bold flex items-center gap-0.5 ${token.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                                    {token.change >= 0 ? <FaCaretUp className="w-3 h-3" /> : <FaCaretDown className="w-3 h-3" />}
                                    ${token.changeDisplay}
                                    <span className="ml-1">({timeRange})</span>
                                  </span>
                                  <span className="text-sm font-black text-gray-100 min-w-[50px] text-right">
                                    ${token.price.toFixed(2)}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelectOrder) {
                                      onSelectOrder(token.team, 'buy');
                                    }
                                  }}
                                  className="bg-[#005430] hover:bg-[#006035] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-lg shadow-black/20 uppercase tracking-wider">
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
                <div className="p-4 flex bg-[#0b1221]">
                  <div className="w-full bg-[#0b1221] rounded-xl border border-gray-800 p-4 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      {/* Left Side: Time Range (Top) + Legend (Bottom) */}
                      <div className="flex flex-col gap-2">
                        {/* Time Range Buttons */}
                        <div className="flex items-center gap-1">
                          {(["1D", "1W", "1M", "ALL"] as const).map((r) => (
                            <button
                              key={r}
                              onClick={() => setTimeRange(r)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${timeRange === r
                                ? "bg-[#005430] text-white"
                                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                                }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex">
                        {(() => {
                          const seasonData = seasonDatesMap?.get(question.market);
                          if (!seasonData) return null;

                          const startDate = new Date(seasonData.start_date);
                          const endDate = new Date(seasonData.end_date);

                          return (
                            <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-600">Start:</span>
                                <span className="text-gray-400">
                                  {startDate.toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                              <div className="w-1 h-1 bg-gray-600 rounded-full" />
                              <div className="flex items-center gap-1">
                                <span className="text-gray-600">End:</span>
                                <span className="text-gray-400">
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
                      <div className="flex items-center">
                        <img
                          src="/logos/white_icon_on_black-removebg-preview.png"
                          alt="Logo"
                          className="w-10 h-10 object-contain ml-2"
                        />
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="w-full h-[190px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={chartData}
                          margin={{ top: 15, right: 0, left: 0, bottom: 25 }}
                          onMouseMove={(e: any) => {
                            if (e.activeTooltipIndex !== undefined) {
                              setActiveHover({
                                chartId: question.id,
                                index: e.activeTooltipIndex,
                                coordX: e.activeCoordinate?.x,
                              });
                            }
                          }}
                          onMouseLeave={() => {
                            setActiveHover(null);
                          }}
                        >
                          <defs>
                            {question.topTokens.map((token, idx) => (
                              <linearGradient key={token.id} id={`colorToken${idx}-${question.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={token.color || DEFAULT_COLORS[idx]} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={token.color || DEFAULT_COLORS[idx]} stopOpacity={0} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                          <XAxis
                            dataKey="time"
                            tick={{ fill: "#6b7280", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={30}
                            padding={{ left: 20, right: 70 }}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            domain={[
                              (dataMin: number) => Math.max(0, dataMin - 20),
                              (dataMax: number) => dataMax + 20
                            ]}
                            tickCount={6}
                            tick={{ fill: "#9ca3af", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val: number | string) => `$${Number(val).toFixed(1)}`}
                            width={50}
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#4b5563", strokeDasharray: "3 3" }} />

                          {/* Render hover labels using ReferenceDot with custom label */}
                          {activeHover?.chartId === question.id &&
                            chartData[activeHover.index] &&
                            question.topTokens.map((token, idx) => {
                              const value = chartData[activeHover.index][`token${idx}`];
                              if (value === undefined) return null;

                              const color = token.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

                              return (
                                <ReferenceDot
                                  key={token.id}
                                  yAxisId="right"
                                  x={chartData[activeHover.index].time}
                                  y={value}
                                  r={4}
                                  fill={color}
                                  stroke="#000"
                                  strokeWidth={2}
                                  label={(props: any) => {
                                    const { viewBox } = props;
                                    if (!viewBox) return null;

                                    const { x, y } = viewBox;
                                    const coordX = activeHover.coordX || 0;

                                    // Determine if labels should be on left or right
                                    const showOnRight = coordX < x;
                                    const xOffset = showOnRight ? 10 : -10;
                                    const textAnchor = showOnRight ? "start" : "end";

                                    return (
                                      <g>
                                        <text
                                          x={x + xOffset}
                                          y={y - 12}
                                          fill={color}
                                          fontSize={9}
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
                                          fontSize={12}
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
                              const color = token.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
                              const rank = sortedTokens.findIndex((s) => s.originalIdx === idx);
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
                                  activeDot={{ r: 4, strokeWidth: 0 }}
                                  animationDuration={500}
                                >
                                  {!activeHover && (
                                    <LabelList
                                      dataKey={`token${idx}`}
                                      content={(props: any) => {
                                        const { x, y, index, value } = props;
                                        if (index !== chartData.length - 1) return null;

                                        return (
                                          <g>
                                            <text
                                              x={x + 5}
                                              y={y + yShift - 6}
                                              fill={color}
                                              fontSize={9}
                                              fontWeight="700"
                                              style={{ textTransform: "uppercase" }}
                                            >
                                              {token.name}
                                            </text>
                                            <text
                                              x={x + 5}
                                              y={y + yShift + 6}
                                              fill={color}
                                              fontSize={12}
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
        <div className="flex items-center justify-between px-4 py-2 bg-[#0b1221]">
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