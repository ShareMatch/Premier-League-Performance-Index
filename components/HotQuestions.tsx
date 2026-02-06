import React, { useMemo, useState, useEffect, useRef } from "react";
import { Team, League } from "../types";
import InfoTooltip from "./InfoTooltip";
import { getMarketInfo } from "../lib/marketInfo";
import tooltipText from "../resources/ToolTip.txt?raw";
import questionTemplatesRaw from "../resources/QuestionTemplates_en.txt?raw";
import { getIndexAvatarUrl } from "../lib/logoHelper";
import { getMarketDisplayData } from "../utils/marketUtils";
import type { SeasonDates } from "../lib/api";

// Parse question templates text file (key=value format) into object
const parseTemplates = (rawText: string): Record<string, string> => {
  const result: Record<string, string> = {};
  const lines = rawText.split("\n");
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && trimmedLine.includes("=")) {
      const separatorIndex = trimmedLine.indexOf("=");
      const key = trimmedLine.substring(0, separatorIndex);
      const value = trimmedLine.substring(separatorIndex + 1);
      result[key] = value;
    }
  }
  return result;
};

// Helper to replace placeholders in template
const formatTemplate = (
  template: string,
  replacements: Record<string, string>,
): string => {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
};

const QUESTION_TEMPLATES = parseTemplates(questionTemplatesRaw);

interface HotQuestionsProps {
  teams: Team[];
  onNavigate: (league: League) => void;
  onViewAsset?: (asset: Team) => void;
  onSelectOrder?: (team: Team, type: "buy" | "sell") => void;
  seasonDatesMap?: Map<string, SeasonDates>;
  limit?: number;
  showHeader?: boolean;
  enableAnimation?: boolean;
  isLoading?: boolean;
  excludeTeamIds?: string[]; // NEW: IDs of teams to exclude (from TrendingCarousel)
}

interface Question {
  id: string;
  market: League;
  question: string;
  yesPrice: number;
  noPrice: number;
  volume: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  team: Team;
}

const HotQuestions: React.FC<HotQuestionsProps> = ({
  teams,
  onNavigate,
  onViewAsset,
  onSelectOrder,
  seasonDatesMap,
  limit = 3,
  showHeader = true,
  enableAnimation = true,
  isLoading = false,
  excludeTeamIds = [], // NEW: default to empty array
}) => {
  const [displayedQuestions, setDisplayedQuestions] = useState<Question[]>([]);
  const [animatingCard, setAnimatingCard] = useState<number | null>(null);
  const prevExcludeIdsRef = useRef<string>("");
  const stableQuestionPoolRef = useRef<Question[]>([]);

  // Create a pool of ALL valid questions
  const questionPool = useMemo(() => {
    // Only regenerate if teams, seasonDatesMap changed, or excludeTeamIds actually changed
    const excludeIdsKey = excludeTeamIds.sort().join(",");
    const hasExcludeChanged = prevExcludeIdsRef.current !== excludeIdsKey;

    // If we have a stable pool and excludeTeamIds didn't change, just filter it
    if (stableQuestionPoolRef.current.length > 0 && !hasExcludeChanged) {
      return stableQuestionPoolRef.current.filter(
        (q) => !excludeTeamIds.includes(q.team.id),
      );
    }

    prevExcludeIdsRef.current = excludeIdsKey;

    // 1. Filter active teams, price > $5.00, OPEN markets, and NOT in excludeTeamIds
    const activeTeams = teams.filter((t) => {
      if (t.is_settled) return false;
      if (t.offer <= 5.0) return false;

      const market = t.market || t.index_token;
      if (!market) return false;

      const seasonData = seasonDatesMap?.get(market);
      const marketInfo = getMarketInfo(
        market as League,
        seasonData?.start_date,
        seasonData?.end_date,
        seasonData?.stage || undefined,
        t.index_name,
      );
      return marketInfo.isOpen;
    });

    // Dynamically group teams by market
    const marketGroups = new Map<string, Team[]>();
    activeTeams.forEach((t) => {
      const market = t.market || t.index_token;
      if (!market) return;
      const existing = marketGroups.get(market) || [];
      existing.push(t);
      marketGroups.set(market, existing);
    });

    const generated: Question[] = [];

    // Helper to generate questions for a market
    const addQuestionsForMarket = (
      marketToken: string,
      marketTeams: Team[],
    ) => {
      // Get display data dynamically from the first team's DB data
      const sampleTeam = marketTeams[0];
      const displayData = getMarketDisplayData(marketToken, {
        index_name: sampleTeam?.index_name,
        market_name: sampleTeam?.market_name,
        category: sampleTeam?.category,
      });

      // Check if market is open
      const seasonData = seasonDatesMap?.get(marketToken);
      const marketInfo = getMarketInfo(
        marketToken as League,
        seasonData?.start_date,
        seasonData?.end_date,
        seasonData?.stage || undefined,
        sampleTeam?.index_name,
      );
      if (!marketInfo.isOpen) return;

      const sorted = [...marketTeams]
        .sort((a, b) => b.offer - a.offer)
        .slice(0, 5);

      sorted.forEach((team) => {
        const validId = parseInt(team.id) || team.name.length;
        const volNum = (team.offer * (10000 + validId * 100)) / 1000;
        const volStr =
          volNum > 1000
            ? `$${(volNum / 1000).toFixed(1)}M`
            : `$${volNum.toFixed(0)}K`;

        generated.push({
          id: `${marketToken.toLowerCase()}-${team.id}`,
          market: marketToken as League,
          question: formatTemplate(QUESTION_TEMPLATES.assetQuestion || "Will {teamName} top the {marketName} ?", {
            teamName: team.name,
            marketName: displayData.fullName,
          }),
          yesPrice: team.offer,
          noPrice: team.bid,
          volume: volStr,
          icon: displayData.icon,
          color: displayData.color,
          borderColor: displayData.borderColor,
          team: team,
        });
      });
    };

    // Generate questions for all markets dynamically
    marketGroups.forEach((marketTeams, marketToken) => {
      if (marketTeams.length > 0) {
        addQuestionsForMarket(marketToken, marketTeams);
      }
    });

    // Shuffle full pool ONCE and store it
    const shuffled = generated.sort(() => 0.5 - Math.random());
    stableQuestionPoolRef.current = shuffled;

    // Filter out excluded teams
    return shuffled.filter((q) => !excludeTeamIds.includes(q.team.id));
  }, [teams, seasonDatesMap]); // Removed excludeTeamIds from dependencies

  // Initial load
  useEffect(() => {
    if (questionPool.length > 0) {
      // If limit is provided (and > 0), slice. Otherwise show all.
      const questionsToShow =
        limit && limit > 0 ? questionPool.slice(0, limit) : questionPool;
      setDisplayedQuestions(questionsToShow);
    }
  }, [questionPool, limit]);

  // Dynamic Update Interval - only if animation enabled and limited
  useEffect(() => {
    if (!enableAnimation || !limit || questionPool.length <= limit) return;

    const scheduleNextUpdate = () => {
      const delay = Math.floor(Math.random() * 5000) + 8000; // 8-13 seconds

      return setTimeout(() => {
        setDisplayedQuestions((prev) => {
          const slotToUpdate = Math.floor(Math.random() * limit);
          const currentIds = prev.map((q) => q?.id);
          const available = questionPool.filter(
            (q) => !currentIds.includes(q.id),
          );

          if (available.length > 0) {
            const nextQuestion =
              available[Math.floor(Math.random() * available.length)];
            setAnimatingCard(slotToUpdate);

            const next = [...prev];
            next[slotToUpdate] = nextQuestion;

            setTimeout(() => setAnimatingCard(null), 600);

            return next;
          }

          return prev;
        });

        timerRef.current = scheduleNextUpdate();
      }, delay);
    };

    let timerRef = { current: scheduleNextUpdate() };
    return () => clearTimeout(timerRef.current);
  }, [questionPool, enableAnimation, limit]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-3">
          {Array.from({ length: limit > 0 ? limit : 9 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/50 p-2.5 sm:p-3 h-[180px] animate-pulse flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-5 bg-gray-700/50 rounded-full" />
                    <div className="w-8 h-3 bg-gray-700/30 rounded" />
                  </div>
                  <div className="w-full h-10 bg-gray-700/30 rounded-lg mt-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-auto">
                <div className="h-10 bg-emerald-900/20 rounded-lg border border-emerald-900/30" />
                <div className="h-10 bg-red-900/10 rounded-lg border border-red-900/20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (displayedQuestions.length === 0) return null;

  return (
    <div data-testid="hot-questions" className="space-y-3">
      {/* Responsive grid: 1 col mobile, 2 cols tablet, 3 cols desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-3">
        {displayedQuestions.map((q, index) => {
          if (!q) return null;

          return (
            <div
              key={`${q.id}-${index}`}
              onClick={() => {
                if (onViewAsset) {
                  onViewAsset(q.team);
                } else {
                  onNavigate(q.market as any);
                }
              }}
              className={`
                group relative bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/50 p-2.5 sm:p-3 cursor-pointer
                transition-all duration-300 hover:bg-gray-800 hover:shadow-xl hover:-translate-y-1 hover:z-10
                ${q.borderColor}
                ${
                  animatingCard === index
                    ? "animate-pop z-20 ring-1 ring-[#00A651]/50 bg-gray-800"
                    : ""
                }
              `}
            >
              {/* Gradient Background Effect */}
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-br ${q.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
              />

              <div className="relative z-10 flex flex-col h-full">
                {/* Info Button - Top Right */}
                <div className="absolute top-0 right-0">
                  <InfoTooltip text={tooltipText} />
                </div>

                {/* Header - Avatar + Question */}
                <div className="flex items-center gap-2 mb-3 sm:mb-4 pr-6">
                  {/* Avatar with Volume underneath */}
                  <div className="flex flex-col items-center flex-shrink-0 gap-1">
                    {(() => {
                      const indexAvatarUrl = getIndexAvatarUrl(q.market);
                      return indexAvatarUrl ? (
                        <img
                          src={indexAvatarUrl}
                          alt={`${q.market} Index`}
                          className="w-14 h-14 sm:w-16 sm:h-16 block"
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center bg-gray-700/50 rounded-lg">
                          {q.icon}
                        </div>
                      );
                    })()}
                    <span className="text-[9px] sm:text-[10px] text-gray-500 font-mono">
                      Vol: {q.volume}
                    </span>
                  </div>

                  {/* Question Text Only */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-100 group-hover:text-white transition-colors leading-snug">
                      {q.question}
                    </h3>
                  </div>
                </div>

                {/* Buy/Sell Buttons */}
                <div className="mt-auto grid grid-cols-2 gap-1.5 sm:gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectOrder) {
                        onSelectOrder(q.team, "buy");
                      }
                    }}
                    className="flex flex-col items-center justify-center bg-[#005430] hover:bg-[#006035] border border-[#005430] rounded-lg p-1 sm:p-1.5 transition-all group/btn shadow-lg shadow-black/20"
                  >
                    <span className="text-[8px] text-emerald-100/70 font-medium mb-0.5 uppercase tracking-wide">
                      Buy
                    </span>
                    <span className="text-sm sm:text-base font-bold text-white">
                      ${q.yesPrice.toFixed(2)}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectOrder) {
                        onSelectOrder(q.team, "sell");
                      }
                    }}
                    className="flex flex-col items-center justify-center bg-red-900/20 hover:bg-red-900/30 border border-red-500/20 hover:border-red-500/40 rounded-lg p-1 sm:p-1.5 transition-all group/btn"
                  >
                    <span className="text-[8px] text-red-300/70 font-medium mb-0.5 uppercase tracking-wide">
                      Sell
                    </span>
                    <span className="text-sm sm:text-base font-bold text-red-400">
                      ${q.noPrice.toFixed(2)}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HotQuestions;
