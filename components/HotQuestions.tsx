import React, { useMemo } from 'react';
import { Team } from '../types';
import { ArrowRight, TrendingUp, Trophy, Flag, Activity } from 'lucide-react';
import InfoPopup from './InfoPopup';
import { getMarketInfo } from '../lib/marketInfo';

interface HotQuestionsProps {
  teams: Team[];
  onNavigate: (league: 'EPL' | 'UCL' | 'WC' | 'SPL' | 'F1') => void;
}

const HotQuestions: React.FC<HotQuestionsProps> = ({ teams, onNavigate }) => {
  const questions = useMemo(() => {
    // Group teams by market
    const activeTeams = teams.filter(t => !t.is_settled);

    const markets = {
      EPL: activeTeams.filter(t => t.market === 'EPL'),
      UCL: activeTeams.filter(t => t.market === 'UCL'),
      SPL: activeTeams.filter(t => t.market === 'SPL'),
      F1: activeTeams.filter(t => t.market === 'F1'),
      WC: activeTeams.filter(t => t.market === 'WC'),
      NBA: activeTeams.filter(t => t.market === 'NBA'),
      NFL: activeTeams.filter(t => t.market === 'NFL'),
    };

    const generatedQuestions = [];

    // Helper to get a random top team (from top 5)
    const getRandomTopTeam = (leagueTeams: Team[]) => {
      const sorted = [...leagueTeams].sort((a, b) => b.offer - a.offer);
      const top5 = sorted.slice(0, 5);
      return top5[Math.floor(Math.random() * top5.length)];
    };

    // Generate questions for each active market
    if (markets.EPL.length > 0) {
      const top = getRandomTopTeam(markets.EPL);
      generatedQuestions.push({
        id: 'epl-1',
        market: 'EPL',
        question: `Will ${top.name} Top the Premier League Index?`,
        yesPrice: top.offer,
        noPrice: top.bid, // Using bid as proxy for "No" sell price
        volume: '£1.2M',
        IconComponent: Trophy,
        iconColor: 'text-purple-400',
        color: 'from-purple-500/20 to-blue-500/20',
        borderColor: 'group-hover:border-purple-500/50'
      });
    }

    if (markets.F1.length > 0) {
      const top = getRandomTopTeam(markets.F1);
      generatedQuestions.push({
        id: 'f1-1',
        market: 'F1',
        question: `Will ${top.name} Top the Drivers' Championship Index?`,
        yesPrice: top.offer,
        noPrice: top.bid,
        volume: '£850K',
        IconComponent: Flag,
        iconColor: 'text-red-400',
        color: 'from-red-500/20 to-orange-500/20',
        borderColor: 'group-hover:border-red-500/50'
      });
    }

    if (markets.SPL.length > 0) {
      const top = getRandomTopTeam(markets.SPL);
      generatedQuestions.push({
        id: 'spl-1',
        market: 'SPL',
        question: `Will ${top.name} Top the Saudi Pro League Index?`,
        yesPrice: top.offer,
        noPrice: top.bid,
        volume: '£420K',
        IconComponent: Activity,
        iconColor: 'text-green-400',
        color: 'from-green-500/20 to-emerald-500/20',
        borderColor: 'group-hover:border-green-500/50'
      });
    }


    if (markets.UCL.length > 0) {
      const top = getRandomTopTeam(markets.UCL);
      generatedQuestions.push({
        id: 'ucl-1',
        market: 'UCL',
        question: `Will ${top.name} Top the Champions League Index?`,
        yesPrice: top.offer,
        noPrice: top.bid,
        volume: '£2.1M',
        IconComponent: Trophy,
        iconColor: 'text-blue-400',
        color: 'from-blue-600/20 to-indigo-600/20',
        borderColor: 'group-hover:border-blue-500/50'
      });
    }

    if (markets.NBA.length > 0) {
      const top = getRandomTopTeam(markets.NBA);
      generatedQuestions.push({
        id: 'nba-1',
        market: 'NBA',
        question: `Will ${top.name} Top the NBA Index?`,
        yesPrice: top.offer,
        noPrice: top.bid,
        volume: '£3.5M',
        IconComponent: Activity,
        iconColor: 'text-orange-400',
        color: 'from-orange-500/20 to-amber-500/20',
        borderColor: 'group-hover:border-orange-500/50'
      });
    }

    if (markets.NFL.length > 0) {
      const top = getRandomTopTeam(markets.NFL);
      generatedQuestions.push({
        id: 'nfl-1',
        market: 'NFL',
        question: `Will ${top.name} Top the NFL Index?`,
        yesPrice: top.offer,
        noPrice: top.bid,
        volume: '£5.2M',
        IconComponent: Trophy,
        iconColor: 'text-blue-800',
        color: 'from-blue-800/20 to-blue-900/20',
        borderColor: 'group-hover:border-blue-800/50'
      });
    }

    // Shuffle and take top 3
    return generatedQuestions.sort(() => 0.5 - Math.random()).slice(0, 3);
  }, [teams]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-[#3AA189]" />
          Trending Markets
        </h2>
      </div>

      {/* Responsive grid: 1 col mobile, 2 cols tablet, 3 cols desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4">
        {questions.map((q) => (
          <div
            key={q.id}
            onClick={() => onNavigate(q.market as any)}
            className={`group relative bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-3 sm:p-5 cursor-pointer transition-all duration-300 hover:bg-gray-800 hover:shadow-xl hover:-translate-y-1 hover:z-10 ${q.borderColor}`}
          >
            {/* Gradient Background Effect */}
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${q.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

            <div className="relative z-10 flex flex-col h-full">
              {/* Header - horizontal layout on mobile */}
              <div className="flex flex-wrap justify-between items-start gap-2 mb-3 sm:mb-4">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-900/60 rounded-full px-2 sm:px-3 py-1 border border-gray-700">
                    <q.IconComponent className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${q.iconColor}`} />
                    <span className="text-[10px] sm:text-xs font-medium text-gray-300 whitespace-nowrap">{q.market}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-gray-500 font-mono pl-1">Vol: {q.volume}</span>
                </div>
                {(() => {
                  const info = getMarketInfo(q.market);
                  return (
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <span className={`px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold rounded border whitespace-nowrap ${info.isOpen
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                        }`}>
                        {info.isOpen ? 'Market Open' : 'Market Closed'}
                      </span>
                      <InfoPopup
                        title={info.title}
                        content={info.content}
                        seasonDates={info.seasonDates}
                        isMarketOpen={info.isOpen}
                        iconSize={22}
                      />
                    </div>
                  );
                })()}
              </div>

              <h3 className="text-sm sm:text-base font-semibold text-gray-100 mb-3 sm:mb-6 group-hover:text-white transition-colors leading-snug line-clamp-2">
                {q.question}
              </h3>

              <div className="mt-auto grid grid-cols-2 gap-2 sm:gap-3">
                <button className="flex flex-col items-center justify-center bg-[#3AA189]/10 hover:bg-[#3AA189]/20 border border-[#3AA189]/30 rounded-lg p-1.5 sm:p-2 transition-colors group/btn">
                  <span className="text-[10px] sm:text-xs text-[#3AA189] font-medium mb-0.5 sm:mb-1">Buy</span>
                  <span className="text-base sm:text-lg font-bold text-[#3AA189]">${q.yesPrice.toFixed(1)}</span>
                </button>
                <button className="flex flex-col items-center justify-center bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg p-1.5 sm:p-2 transition-colors group/btn">
                  <span className="text-[10px] sm:text-xs text-red-400 font-medium mb-0.5 sm:mb-1">Sell</span>
                  <span className="text-base sm:text-lg font-bold text-red-400">${q.noPrice.toFixed(1)}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotQuestions;
