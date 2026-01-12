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
import InfoPopup from "./InfoPopup";
import { getMarketInfo } from "../lib/marketInfo";
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
  LabelList,
  ReferenceDot,
} from "recharts";
import { getIndexAvatarUrl } from "../lib/logoHelper";
import { SeasonDates } from "../lib/api";

interface IndexToken {
  id: string;
  name: string;
  price: number;
  change: number;
  changeDisplay: string;
  color?: string;
}

interface Question {
  id: string;
  market: string;
  fullName: string;
  question: string;
  topTokens: IndexToken[];
  volume: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  seasonData?: SeasonDates;
}

type TimeRange = "1D" | "1W" | "1M" | "ALL";

const generateTriplePriceHistory = (
  tokens: IndexToken[],
  range: TimeRange = "1W",
  seasonData?: SeasonDates
) => {
  const now = new Date();
  const data = [];
  let points = 7;
  if (range === "1D") points = 13;
  else if (range === "1W") points = 7;
  else if (range === "1M") points = 15;
  else if (range === "ALL") {
    if (seasonData?.start_date) {
      const start = new Date(seasonData.start_date);
      const diffDays = Math.ceil(
        Math.abs(now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      points = Math.min(30, Math.max(10, Math.floor(diffDays / 5)));
    } else {
      points = 24;
    }
  }

  // Start prices at a lower point to allow for dramatic swings
  let prices = tokens.map((t) => t.price * (0.7 + Math.random() * 0.4));

  // Track momentum for each token to create trends with sharp reversals
  let momentum = tokens.map(() => (Math.random() > 0.5 ? 1 : -1));

  for (let i = 0; i < points; i++) {
    let dateStr = "";
    const date = new Date(now);

    if (range === "1D") {
      date.setHours(now.getHours() - (points - 1 - i) * 2);
      const hours = date.getHours();
      const ampm = hours >= 12 ? "PM" : "AM";
      const h12 = hours % 12 || 12;
      dateStr = `${h12}${ampm}`;
    } else if (range === "1W") {
      date.setDate(now.getDate() - (points - 1 - i));
      dateStr = date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
    } else if (range === "1M") {
      date.setDate(now.getDate() - (points - 1 - i) * 2);
      dateStr = date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
    } else {
      if (seasonData?.start_date) {
        const start = new Date(seasonData.start_date);
        const diffDays = Math.ceil(
          Math.abs(now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        );
        date.setDate(
          now.getDate() -
            Math.floor((diffDays / (points - 1)) * (points - 1 - i))
        );
      } else {
        date.setDate(now.getDate() - (points - 1 - i) * 7);
      }
      dateStr = date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
    }

    const dataPoint: any = { date: dateStr };

    prices = prices.map((price, idx) => {
      // 20% chance of dramatic momentum shift (sharp reversal)
      if (Math.random() < 0.2) {
        momentum[idx] *= -1;
      }

      // Base volatility: much higher swings (-15% to +15%)
      const baseVolatility = (Math.random() * 0.3 - 0.15) * momentum[idx];

      // Occasional spike/crash (10% chance of extreme move)
      const extremeMove =
        Math.random() < 0.1 ? (Math.random() > 0.5 ? 0.25 : -0.25) : 0;

      // Random walk with drift toward current token price
      const driftTowardsTarget = (tokens[idx].price - price) * 0.05;

      // Combine all factors
      const totalChange = baseVolatility + extremeMove + driftTowardsTarget;

      // Apply change with wider bounds to allow for bigger swings
      let newPrice = price * (1 + totalChange);

      // Keep prices in reasonable range but allow for bigger swings
      newPrice = Math.max(5, Math.min(tokens[idx].price * 1.8, newPrice));

      return newPrice;
    });

    tokens.forEach((token, idx) => {
      dataPoint[`token${idx}`] = parseFloat(prices[idx].toFixed(1));
    });
    data.push(dataPoint);
  }

  // Make sure the final point matches current prices
  const finalPoint = data[data.length - 1];
  finalPoint.date =
    range === "1D"
      ? "Now"
      : now.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  tokens.forEach((token, idx) => {
    finalPoint[`token${idx}`] = token.price;
  });

  return data;
};

const generateQuestions = (
  teams: Team[],
  seasonDatesMap?: Map<string, SeasonDates>
): Question[] => {
  const activeTeams = teams.filter((t) => {
    if (t.is_settled) return false;
    if (t.offer <= 1.0) return false;
    const seasonData = seasonDatesMap?.get(t.market || "");
    const marketInfo = getMarketInfo(
      t.market as League,
      seasonData?.start_date,
      seasonData?.end_date,
      seasonData?.stage || undefined
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
  const getFullMarketName = (market: string): string => {
    const names: Record<string, string> = {
      NBA: "National Basketball Association",
      EPL: "England Premier League",
      F1: "Formula 1 World Championship",
      UCL: "UEFA Champions League",
      NFL: "National Football League",
      SPL: "Saudi Pro League",
      MLS: "Major League Soccer",
      MLB: "Major League Baseball",
      NHL: "National Hockey League",
      LaLiga: "La Liga Española",
      SerieA: "Serie A Italia",
      Bundesliga: "Bundesliga Germany",
      Ligue1: "Ligue 1 France",
    };
    return names[market] || market;
  };
  const getQuestionTitle = (market: string): string => {
    const titles: Record<string, string> = {
      NBA: "Who will win the NBA Finals?",
      EPL: "Premier League Title Race",
      F1: "Who takes the Drivers Championship?",
      UCL: "UEFA Champions League Favorites",
      NFL: "Super Bowl Contenders",
      SPL: "Saudi Pro League Title Hunt",
      MLS: "MLS Cup Race Leaders",
      MLB: "World Series Frontrunners",
      NHL: "Stanley Cup Favorites",
      LaLiga: "La Liga Title Contenders",
      SerieA: "Serie A Scudetto Race",
      Bundesliga: "Bundesliga Title Leaders",
      Ligue1: "Ligue 1 Championship Race",
    };
    return titles[market] || `${market} Championship Race`;
  };
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

    // Check if the market itself is open before adding the question
    const seasonData = seasonDatesMap?.get(market);
    const marketInfo = getMarketInfo(
      market as League,
      seasonData?.start_date,
      seasonData?.end_date,
      seasonData?.stage || undefined
    );
    if (!marketInfo.isOpen) return;

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
        color: team.color,
      };
    });
    questions.push({
      id: `${market.toLowerCase()}-index`,
      market: market,
      fullName: getFullMarketName(market),
      question: getQuestionTitle(market),
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
  onSelectOrder?: (team: Team, type: "buy" | "sell") => void;
  seasonDatesMap?: Map<string, SeasonDates>;
}

const TrendingCarousel: React.FC<TrendingCarouselProps> = ({
  teams,
  onViewAsset,
  onSelectOrder,
  seasonDatesMap,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("1W");
  const [activeHover, setActiveHover] = useState<{
    chartId: string;
    index: number;
    coordX?: number;
  } | null>(null);

  const questionPool = useMemo(
    () => generateQuestions(teams, seasonDatesMap),
    [teams, seasonDatesMap]
  );

  const chartDataMap = useMemo(() => {
    const map = new Map<string, any[]>();
    questionPool.forEach((question) => {
      const key = `${question.id}-${timeRange}`;
      map.set(
        key,
        generateTriplePriceHistory(
          question.topTokens,
          timeRange,
          question.seasonData
        )
      );
    });
    return map;
  }, [questionPool, timeRange]);

  const HoverLabelsComponent = (props: any) => {
    console.log("=== HoverLabelsComponent ALL PROPS ===", Object.keys(props));

    const {
      chartData,
      tokens,
      activeIndex,
      coordX,
      defaultColors,
      xAxisMap,
      yAxisMap,
    } = props;

    console.log("HoverLabelsComponent values:", {
      activeIndex,
      coordX,
      chartDataLength: chartData?.length,
      tokensLength: tokens?.length,
      xAxisMap,
      yAxisMap,
      xAxisMapKeys: xAxisMap ? Object.keys(xAxisMap) : "none",
      yAxisMapKeys: yAxisMap ? Object.keys(yAxisMap) : "none",
    });

    if (activeIndex == null || coordX == null) {
      console.log("Early return: no activeIndex or coordX");
      return null;
    }

    if (!chartData || !tokens) {
      console.log("Early return: no chartData or tokens");
      return null;
    }

    // Try to access xAxisMap and yAxisMap in different ways
    let xAxis = null;
    let yAxis = null;

    if (xAxisMap) {
      // Try different keys
      xAxis = xAxisMap[0] || xAxisMap["0"] || Object.values(xAxisMap)[0];
      console.log("xAxis found:", !!xAxis);
    }

    if (yAxisMap) {
      yAxis = yAxisMap[0] || yAxisMap["0"] || Object.values(yAxisMap)[0];
      console.log("yAxis found:", !!yAxis);
    }

    if (!xAxis || !yAxis) {
      console.log("Missing axis - xAxis:", !!xAxis, "yAxis:", !!yAxis);
      return null;
    }

    // Get the x position of the data point
    const date = chartData[activeIndex]?.date;
    if (!date) {
      console.log("No date at activeIndex:", activeIndex);
      return null;
    }

    console.log("Trying to scale date:", date);
    const dataPointX = xAxis.scale(date) + (xAxis.bandwidth || 0) / 2;
    console.log("dataPointX:", dataPointX);

    // Determine if labels should be on left or right
    const showOnRight = coordX < dataPointX;
    const xOffset = showOnRight ? 10 : -10;
    const textAnchor = showOnRight ? "start" : "end";

    console.log("Rendering labels - showOnRight:", showOnRight);

    return (
      <g className="recharts-hover-labels">
        {tokens.map((token: any, idx: number) => {
          const value = chartData[activeIndex][`token${idx}`];
          if (value === undefined) {
            console.log("No value for token", idx);
            return null;
          }

          const color =
            token.color || defaultColors[idx % defaultColors.length];

          // Get Y position from the actual data point using the yAxis scale
          const y = yAxis.scale(value);
          const x = dataPointX;

          console.log(`Token ${token.name}: x=${x}, y=${y}, value=${value}`);

          return (
            <g key={token.id}>
              {/* Draw a dot at the data point */}
              <circle
                cx={x}
                cy={y}
                r={6}
                fill={color}
                stroke="#fff"
                strokeWidth={2}
              />

              {/* Team name */}
              <text
                x={x + xOffset}
                y={y - 8}
                fill={color}
                fontSize={11}
                fontWeight="700"
                textAnchor={textAnchor}
                style={{ textTransform: "uppercase" }}
              >
                {token.name}
              </text>

              {/* Price value */}
              <text
                x={x + xOffset}
                y={y + 6}
                fill={color}
                fontSize={14}
                fontWeight="800"
                fontFamily="monospace"
                textAnchor={textAnchor}
              >
                ${Number(value).toFixed(2)}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

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
        (prev) => (prev - 1 + questionPool.length) % questionPool.length
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

  const DEFAULT_COLORS = ["#10b981", "#3b82f6", "#f59e0b"];

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
      <div className="relative bg-slate-900 rounded-2xl border border-gray-800 overflow-x-hidden overflow-y-visible">
        <div
          className="flex w-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {questionPool.map((question) => {
            const chartData =
              chartDataMap.get(`${question.id}-${timeRange}`) || [];
            return (
              <div
                key={question.id}
                className="w-full flex-shrink-0 grid grid-cols-1 lg:grid-cols-2 min-h-[240px]"
              >
                <div className="p-4 flex items-center justify-center">
                  <div className="w-full">
                    <div
                      className={`group relative bg-gray-800/40 backdrop-blur-sm rounded-xl border p-3 transition-all duration-300 hover:bg-gray-800 hover:shadow-xl ${question.borderColor} border-gray-700/50`}
                    >
                      <div
                        className={`absolute inset-0 rounded-xl bg-gradient-to-br ${question.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                      />
                      <div className="relative z-10 flex flex-col h-full space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2 overflow-visible">
                            {(() => {
                              const indexAvatarUrl = getIndexAvatarUrl(
                                question.market
                              );
                              return indexAvatarUrl ? (
                                <img
                                  src={indexAvatarUrl}
                                  alt={`${question.market} Index`}
                                  className="w-10 h-10 block"
                                />
                              ) : (
                                question.icon
                              );
                            })()}
                            <span className="text-xs font-medium text-gray-300 leading-tight">
                              {question.fullName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const seasonData = seasonDatesMap?.get(
                                question.market
                              );
                              const info = getMarketInfo(
                                question.market as League,
                                seasonData?.start_date,
                                seasonData?.end_date,
                                seasonData?.stage || undefined
                              );
                              const seasonDatesStr = seasonData
                                ? `${new Date(
                                    seasonData.start_date
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })} - ${new Date(
                                    seasonData.end_date
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}`
                                : undefined;
                              return (
                                <InfoPopup
                                  title={question.fullName}
                                  content={info.content}
                                  seasonDates={seasonDatesStr}
                                  isMarketOpen={info.isOpen}
                                  iconSize={14}
                                />
                              );
                            })()}
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
                          {question.question}
                        </h3>
                        <div className="text-xs text-gray-500 font-mono">
                          Vol: {question.volume}
                        </div>
                        <div className="flex flex-col gap-2">
                          {question.topTokens.map((token) => (
                            <div
                              key={token.id}
                              className="flex items-center justify-between bg-gray-900/40 border border-gray-700/30 rounded-lg p-2 hover:bg-gray-800/60 transition-all cursor-pointer group/row"
                              onClick={() => handleTokenClick(token.id)}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-bold text-gray-200 truncate group-hover/row:text-brand-primary transition-colors">
                                  {token.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-0.5 min-w-[42px] justify-end">
                                    {token.change >= 0 ? (
                                      <FaCaretUp className="w-2.5 h-2.5 text-green-400" />
                                    ) : (
                                      <FaCaretDown className="w-2.5 h-2.5 text-red-400" />
                                    )}
                                    <span
                                      className={`text-[10px] font-bold ${
                                        token.change >= 0
                                          ? "text-green-400"
                                          : "text-red-400"
                                      }`}
                                    >
                                      ${token.changeDisplay}
                                    </span>
                                  </div>
                                  <span className="text-sm font-black text-gray-100 min-w-[50px] text-right">
                                    ${token.price.toFixed(2)}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const asset = teams.find(
                                      (t) => t.id === token.id
                                    );
                                    if (asset && onSelectOrder)
                                      onSelectOrder(asset, "buy");
                                  }}
                                  className="bg-[#005430] hover:bg-[#006035] text-white text-[10px] font-bold px-4 py-1.5 rounded-lg transition-all shadow-lg shadow-black/20 uppercase tracking-wider"
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
                <div className="bg-black p-4 border-l border-gray-800 flex flex-col relative">
                  <div className="flex items-center justify-between mb-2 relative">
                    {question.seasonData && (
                      <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-gray-700/80 px-2.5 py-1 rounded-lg border border-gray-700/20">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">Start:</span>
                          <span className="text-gray-400">
                            {new Date(
                              question.seasonData.start_date
                            ).toLocaleDateString("en-GB", {
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
                            {new Date(
                              question.seasonData.end_date
                            ).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 ml-auto mr-12 bg-gray-950/50 p-1 rounded-lg border border-gray-800">
                      {(["1D", "1W", "1M", "ALL"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setTimeRange(r)}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                            timeRange === r
                              ? "bg-[#005430] text-white"
                              : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                          }`}
                        >
                          {r === "1M" ? "M" : r}
                        </button>
                      ))}
                    </div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2">
                      <img
                        src="/logos/white_icon_on_black-removebg-preview.png"
                        alt="Logo"
                        className="w-12 h-12 object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-start mb-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {question.topTokens.map((token, idx) => (
                        <div
                          key={token.id}
                          className="flex items-center gap-1.5"
                        >
                          <div
                            className="w-2 h-2 rounded-full shadow-sm"
                            style={{
                              backgroundColor:
                                token.color ||
                                DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
                            }}
                          />
                          <span className="text-[10px] font-medium text-gray-400 truncate max-w-[70px]">
                            {token.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 h-[200px] relative">
                    {" "}
                    <ResponsiveContainer width="100%" height={200}>
                      {" "}
                      {/* Fixed height here */}
                      <LineChart
                        data={chartData}
                        margin={{ top: 20, right: 0, left: 0, bottom: 20 }}
                        onMouseMove={(e: any) => {
                          if (e.isTooltipActive) {
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
                        <XAxis
                          dataKey="date"
                          stroke="#4B5563"
                          tick={{ fill: "#9CA3AF", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          padding={{ left: 20, right: 70 }}
                          interval={timeRange === "1D" ? 2 : "preserveStartEnd"}
                        />
                        <CartesianGrid
                          stroke="#4B5563"
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <YAxis
                          stroke="#4B5563"
                          tick={{ fill: "#9CA3AF", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          orientation="right"
                          domain={[
                            (dataMin: number) => Math.max(0, dataMin - 10),
                            (dataMax: number) => dataMax + 10,
                          ]}
                          tickFormatter={(val) => `$${val.toFixed(1)}`}
                          width={45}
                        />
                        <Tooltip
                          content={() => null}
                          wrapperStyle={{ display: "none" }}
                          cursor={{ stroke: "#6B7280", strokeDasharray: "3 3" }}
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
                                x={chartData[activeHover.index].date}
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
                                  const textAnchor = showOnRight
                                    ? "start"
                                    : "end";

                                  return (
                                    <g>
                                      {/* Team name */}
                                      <text
                                        x={x + xOffset}
                                        y={y - 8}
                                        fill={color}
                                        fontSize={9}
                                        fontWeight="700"
                                        textAnchor={textAnchor}
                                        style={{ textTransform: "uppercase" }}
                                      >
                                        {token.name}
                                      </text>

                                      {/* Price value */}
                                      <text
                                        x={x + xOffset}
                                        y={y + 6}
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
                            const yShift = (rank - 1) * 24;
                            return (
                              <Line
                                key={token.id}
                                type="monotone"
                                dataKey={`token${idx}`}
                                stroke={color}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{
                                  r: 4,
                                  fill: color,
                                  stroke: "#000",
                                  strokeWidth: 2,
                                }}
                              >
                                {activeHover?.chartId !== question.id && (
                                  <LabelList
                                    dataKey={`token${idx}`}
                                    content={(props: any) => {
                                      const { x, y, index, value } = props;
                                      if (index !== chartData.length - 1)
                                        return null;
                                      return (
                                        <g>
                                          <text
                                            x={x + 8}
                                            y={y + yShift - 5}
                                            fill={color}
                                            fontSize={9}
                                            fontWeight="700"
                                            style={{
                                              textTransform: "uppercase",
                                            }}
                                          >
                                            {token.name}
                                          </text>
                                          <text
                                            x={x + 8}
                                            y={y + yShift + 9}
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
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            );
          })}
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
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex
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
