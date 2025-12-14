import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Team, League } from '../types';
import { TrendingUp, Trophy, Flag, Activity, Zap } from 'lucide-react';
import InfoPopup from './InfoPopup';
import { getMarketInfo } from '../lib/marketInfo';

interface HotQuestionsProps {
  teams: Team[];
  onNavigate: (league: League) => void;
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
}

const HotQuestions: React.FC<HotQuestionsProps> = ({ teams, onNavigate }) => {
  const [displayedQuestions, setDisplayedQuestions] = useState<Question[]>([]);
  const [animatingCard, setAnimatingCard] = useState<number | null>(null);

  // Create a pool of ALL valid questions
  const questionPool = useMemo(() => {
    // 1. Filter active teams, price > $5.00, and OPEN markets
    const activeTeams = teams.filter(t => {
      if (t.is_settled) return false;
      if (t.offer <= 5.00) return false;

      const marketInfo = getMarketInfo(t.market as League);
      return marketInfo.isOpen;
    });

    const markets = {
      EPL: activeTeams.filter(t => t.market === 'EPL'),
      UCL: activeTeams.filter(t => t.market === 'UCL'),
      SPL: activeTeams.filter(t => t.market === 'SPL'),
      F1: activeTeams.filter(t => t.market === 'F1'),
      WC: activeTeams.filter(t => t.market === 'WC'),
      NBA: activeTeams.filter(t => t.market === 'NBA'),
      NFL: activeTeams.filter(t => t.market === 'NFL'),
    };

    const generated: Question[] = [];

    // Helper to generate questions
    const addQuestions = (leagueTeams: Team[], market: League, icon: React.ReactNode, color: string, border: string) => {
      // Create questions for multiple top teams to fill the pool
      // Sort by price descending to get "hottest" assets
      const sorted = [...leagueTeams].sort((a, b) => b.offer - a.offer).slice(0, 5);

      sorted.forEach((team, idx) => {
        // Calculate dynamic volume (mock) based on price
        const volNum = (team.offer * (10000 + team.id * 100)) / 1000;
        const volStr = volNum > 1000 ? `£${(volNum / 1000).toFixed(1)}M` : `£${volNum.toFixed(0)}K`;

        generated.push({
          id: `${market.toLowerCase()}-${team.id}`,
          market: market,
          question: `Will ${team.name} Top the ${market} Index?`,
          yesPrice: team.offer,
          noPrice: team.bid,
          volume: volStr,
          icon: icon,
          color: color,
          borderColor: border
        });
      });
    };

    // Generate for all markets
    if (markets.EPL.length > 0) addQuestions(markets.EPL, 'EPL', <Trophy className="w-5 h-5 text-purple-400" />, 'from-purple-500/20 to-blue-500/20', 'group-hover:border-purple-500/50');
    if (markets.F1.length > 0) addQuestions(markets.F1, 'F1', <Flag className="w-5 h-5 text-red-400" />, 'from-red-500/20 to-orange-500/20', 'group-hover:border-red-500/50');
    if (markets.SPL.length > 0) addQuestions(markets.SPL, 'SPL', <Activity className="w-5 h-5 text-green-400" />, 'from-green-500/20 to-emerald-500/20', 'group-hover:border-green-500/50');
    if (markets.UCL.length > 0) addQuestions(markets.UCL, 'UCL', <Trophy className="w-5 h-5 text-blue-400" />, 'from-blue-600/20 to-indigo-600/20', 'group-hover:border-blue-500/50');
    if (markets.NBA.length > 0) addQuestions(markets.NBA, 'NBA', <Activity className="w-5 h-5 text-orange-400" />, 'from-orange-500/20 to-amber-500/20', 'group-hover:border-orange-500/50');
    if (markets.NFL.length > 0) addQuestions(markets.NFL, 'NFL', <Trophy className="w-5 h-5 text-blue-800" />, 'from-blue-800/20 to-blue-900/20', 'group-hover:border-blue-800/50');

    // Shuffle full pool
    return generated.sort(() => 0.5 - Math.random());
  }, [teams]);

  // Initial load
  useEffect(() => {
    if (questionPool.length > 0 && displayedQuestions.length === 0) {
      setDisplayedQuestions(questionPool.slice(0, 3));
    }
  }, [questionPool]);

  // Dynamic Update Interval
  useEffect(() => {
    if (questionPool.length <= 3) return; // No accumulation to rotate

    const scheduleNextUpdate = () => {
      // Random delay between 3s and 5s
      const delay = Math.floor(Math.random() * 2000) + 3000;

      return setTimeout(() => {
        // Pick random slot to update (0, 1, or 2)
        const slotToUpdate = Math.floor(Math.random() * 3);

        // Pick new question that isn't currently displayed
        const currentIds = displayedQuestions.map(q => q?.id);
        const available = questionPool.filter(q => !currentIds.includes(q.id));

        if (available.length > 0) {
          const nextQuestion = available[Math.floor(Math.random() * available.length)];

          setAnimatingCard(slotToUpdate);

          // Slight delay to sync with animation start if needed, or immediate
          setDisplayedQuestions(prev => {
            const next = [...prev];
            next[slotToUpdate] = nextQuestion;
            return next;
          });

          // Reset animation state after pop fits
          setTimeout(() => setAnimatingCard(null), 600);
        }

        // Reschedule
        timerRef.current = scheduleNextUpdate();
      }, delay);
    };

    let timerRef = { current: scheduleNextUpdate() };

    return () => clearTimeout(timerRef.current);
  }, [questionPool, displayedQuestions]);


  if (displayedQuestions.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-[#00A651]" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Trending Markets
          </span>
          <Zap className="w-4 h-4 text-yellow-400 animate-pulse ml-1" fill="currentColor" />
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedQuestions.map((q, index) => {
          if (!q) return null; // Guard against race conditions (rare)

          return (
            <div
              key={`${q.id}-${index}`} // Key change triggers React re-render, but we manage animation via class
              onClick={() => onNavigate(q.market as any)}
              className={`
                group relative bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/50 p-5 cursor-pointer 
                transition-all duration-300 hover:bg-gray-800 hover:shadow-xl hover:-translate-y-1 hover:z-10
                ${q.borderColor}
                ${animatingCard === index ? 'animate-pop z-20 ring-1 ring-[#00A651]/50 bg-gray-800' : ''}
              `}
            >
              {/* Gradient Background Effect */}
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${q.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 bg-gray-900/60 rounded-full px-3 py-1 border border-gray-700/50">
                      {q.icon}
                      <span className="text-xs font-medium text-gray-300 whitespace-nowrap">{q.market}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-mono pl-1">Vol: {q.volume}</span>
                  </div>
                  {(() => {
                    const info = getMarketInfo(q.market);
                    return (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border whitespace-nowrap ${info.isOpen
                          ? 'bg-[#005430] text-white border-[#005430] shadow-[0_0_10px_rgba(0,166,81,0.2)]'
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                          }`}>
                          {info.isOpen ? 'LIVE' : 'CLOSED'}
                        </span>
                        <InfoPopup
                          title={info.title}
                          content={info.content}
                          seasonDates={info.seasonDates}
                          isMarketOpen={info.isOpen}
                          iconSize={20}
                          iconClassName="text-gray-500 hover:text-white transition-colors cursor-pointer"
                        />
                      </div>
                    );
                  })()}
                </div>

                <h3 className="text-base font-semibold text-gray-100 mb-6 group-hover:text-white transition-colors leading-snug">
                  {q.question}
                </h3>

                <div className="mt-auto grid grid-cols-2 gap-3">
                  <button className="flex flex-col items-center justify-center bg-[#005430] hover:bg-[#006035] border border-[#005430] rounded-lg p-2 transition-all group/btn shadow-lg shadow-black/20">
                    <span className="text-[10px] text-emerald-100/70 font-medium mb-0.5 uppercase tracking-wide">Buy</span>
                    <span className="text-lg font-bold text-white">${q.yesPrice.toFixed(2)}</span>
                  </button>
                  <button className="flex flex-col items-center justify-center bg-red-900/20 hover:bg-red-900/30 border border-red-500/20 hover:border-red-500/40 rounded-lg p-2 transition-all group/btn">
                    <span className="text-[10px] text-red-300/70 font-medium mb-0.5 uppercase tracking-wide">Sell</span>
                    <span className="text-lg font-bold text-red-400">${q.noPrice.toFixed(2)}</span>
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
