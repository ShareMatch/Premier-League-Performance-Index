import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Team, League } from '../types';
import { TrendingUp, Trophy, Flag, Activity, Zap } from 'lucide-react';
import InfoPopup from './InfoPopup';
import { getMarketInfo } from '../lib/marketInfo';
import { getIndexAvatarUrl } from '../lib/logoHelper';
import type { SeasonDates } from '../lib/api';

interface HotQuestionsProps {
  teams: Team[];
  onNavigate: (league: League) => void;
  onViewAsset?: (asset: Team) => void;
  seasonDatesMap?: Map<string, SeasonDates>;
  limit?: number;
  showHeader?: boolean;
  enableAnimation?: boolean;
  isLoading?: boolean;
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
  seasonDatesMap,
  limit = 3,
  showHeader = true,
  enableAnimation = true,
  isLoading = false,
}) => {
  const [displayedQuestions, setDisplayedQuestions] = useState<Question[]>([]);
  const [animatingCard, setAnimatingCard] = useState<number | null>(null);

  // ... (useMemo logic is unchanged, skipping for brevity in replacement if possible, but safer to replace block)

  // Create a pool of ALL valid questions
  const questionPool = useMemo(() => {
    // 1. Filter active teams, price > $5.00, and OPEN markets
    const activeTeams = teams.filter((t) => {
      if (t.is_settled) return false;
      if (t.offer <= 5.0) return false;

      const seasonData = seasonDatesMap?.get(t.market || "");
      const marketInfo = getMarketInfo(
        t.market as League,
        seasonData?.start_date,
        seasonData?.end_date,
        seasonData?.stage || undefined,
      );
      return marketInfo.isOpen;
    });

    const markets = {
      EPL: activeTeams.filter((t) => t.market === "EPL"),
      UCL: activeTeams.filter((t) => t.market === "UCL"),
      SPL: activeTeams.filter((t) => t.market === "SPL"),
      F1: activeTeams.filter((t) => t.market === "F1"),
      WC: activeTeams.filter((t) => t.market === "WC"),
      NBA: activeTeams.filter((t) => t.market === "NBA"),
      NFL: activeTeams.filter((t) => t.market === "NFL"),
    };

    const generated: Question[] = [];

    // Helper to generate questions
    const addQuestions = (
      leagueTeams: Team[],
      market: League,
      icon: React.ReactNode,
      color: string,
      border: string,
    ) => {
      const sorted = [...leagueTeams]
        .sort((a, b) => b.offer - a.offer)
        .slice(0, 5);

      sorted.forEach((team, idx) => {
        const validId = parseInt(team.id) || team.name.length;
        const volNum = (team.offer * (10000 + validId * 100)) / 1000;
        const volStr =
          volNum > 1000
            ? `$${(volNum / 1000).toFixed(1)}M`
            : `$${volNum.toFixed(0)}K`;

        generated.push({
          id: `${market.toLowerCase()}-${team.id}`,
          market: market,
          question: `Will ${team.name} Top the ${market} Index?`,
          yesPrice: team.offer,
          noPrice: team.bid,
          volume: volStr,
          icon: icon,
          color: color,
          borderColor: border,
          team: team,
        });
      });
    };

    // Generate for all markets
    if (markets.EPL.length > 0) addQuestions(markets.EPL, 'EPL', null, 'from-purple-500/20 to-blue-500/20', 'group-hover:border-purple-500/50');
    if (markets.F1.length > 0) addQuestions(markets.F1, 'F1', null, 'from-red-500/20 to-orange-500/20', 'group-hover:border-red-500/50');
    if (markets.SPL.length > 0) addQuestions(markets.SPL, 'SPL', null, 'from-green-500/20 to-emerald-500/20', 'group-hover:border-green-500/50');
    if (markets.UCL.length > 0) addQuestions(markets.UCL, 'UCL', null, 'from-blue-600/20 to-indigo-600/20', 'group-hover:border-blue-500/50');
    if (markets.NBA.length > 0) addQuestions(markets.NBA, 'NBA', null, 'from-orange-500/20 to-amber-500/20', 'group-hover:border-orange-500/50');
    if (markets.NFL.length > 0) addQuestions(markets.NFL, 'NFL', null, 'from-blue-800/20 to-blue-900/20', 'group-hover:border-blue-800/50');

    // Shuffle full pool
    return generated.sort(() => 0.5 - Math.random());
  }, [teams, seasonDatesMap]);

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
      const delay = Math.floor(Math.random() * 2000) + 3000;

      return setTimeout(() => {
        const slotToUpdate = Math.floor(Math.random() * limit);
        const currentIds = displayedQuestions.map((q) => q?.id);
        const available = questionPool.filter(
          (q) => !currentIds.includes(q.id),
        );

        if (available.length > 0) {
          const nextQuestion =
            available[Math.floor(Math.random() * available.length)];
          setAnimatingCard(slotToUpdate);

          setDisplayedQuestions((prev) => {
            const next = [...prev];
            next[slotToUpdate] = nextQuestion;
            return next;
          });

          setTimeout(() => setAnimatingCard(null), 600);
        }

        timerRef.current = scheduleNextUpdate();
      }, delay);
    };

    let timerRef = { current: scheduleNextUpdate() };
    return () => clearTimeout(timerRef.current);
  }, [questionPool, displayedQuestions, enableAnimation, limit]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-3">
          {Array.from({ length: limit || 3 }).map((_, i) => (
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
                {/* Header - horizontal layout on mobile */}
                <div className="flex flex-wrap justify-between items-start gap-2 mb-3 sm:mb-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 overflow-visible">
                      {(() => {
                        const indexAvatarUrl = getIndexAvatarUrl(q.market);
                        return indexAvatarUrl ? (
                          <img
                            src={indexAvatarUrl}
                            alt={`${q.market} Index`}
                            className="w-10 h-10 sm:w-11 sm:h-11 block"
                          />
                        ) : (
                          q.icon
                        );
                      })()}
                      <span className="text-[10px] sm:text-xs font-medium text-gray-300 whitespace-nowrap">{q.market}</span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-gray-500 font-mono pl-1">
                      Vol: {q.volume}
                    </span>
                  </div>
                  {(() => {
                    const seasonData = seasonDatesMap?.get(q.market);
                    const info = getMarketInfo(
                      q.market,
                      seasonData?.start_date,
                      seasonData?.end_date,
                      seasonData?.stage || undefined,
                    );
                    return (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* <span
                          className={`px-1 sm:px-1.5 py-0.5 text-[8px] font-bold rounded border whitespace-nowrap ${info.isOpen
                            ? "bg-[#005430] text-white border-[#005430] shadow-[0_0_10px_rgba(0,166,81,0.4)] animate-pulse"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                            }`}
                        >
                          {info.isOpen ? "OPEN" : "CLOSED"}
                        </span> */}
                      </div>
                    );
                  })()}
                </div>

                <h3 className="text-xs sm:text-sm font-semibold text-gray-100 mb-2 sm:mb-3 group-hover:text-white transition-colors leading-snug line-clamp-2">
                  {q.question}
                </h3>

                <div className="mt-auto grid grid-cols-2 gap-1.5 sm:gap-2">
                  <button className="flex flex-col items-center justify-center bg-[#005430] hover:bg-[#006035] border border-[#005430] rounded-lg p-1 sm:p-1.5 transition-all group/btn shadow-lg shadow-black/20">
                    <span className="text-[8px] text-emerald-100/70 font-medium mb-0.5 uppercase tracking-wide">
                      Buy
                    </span>
                    <span className="text-sm sm:text-base font-bold text-white">
                      ${q.yesPrice.toFixed(2)}
                    </span>
                  </button>
                  <button className="flex flex-col items-center justify-center bg-red-900/20 hover:bg-red-900/30 border border-red-500/20 hover:border-red-500/40 rounded-lg p-1 sm:p-1.5 transition-all group/btn">
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
