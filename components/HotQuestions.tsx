import React, { useMemo } from 'react';
import { Team } from '../types';
import { ArrowRight, TrendingUp, Trophy, Flag, Activity } from 'lucide-react';

interface HotQuestionsProps {
  teams: Team[];
  onNavigate: (league: 'EPL' | 'UCL' | 'WC' | 'SPL' | 'F1') => void;
}

const HotQuestions: React.FC<HotQuestionsProps> = ({ teams, onNavigate }) => {
  const questions = useMemo(() => {
    // Group teams by market
    const markets = {
      EPL: teams.filter(t => t.market === 'EPL'),
      UCL: teams.filter(t => t.market === 'UCL'),
      SPL: teams.filter(t => t.market === 'SPL'),
      F1: teams.filter(t => t.market === 'F1'),
      WC: teams.filter(t => t.market === 'WC'),
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
        question: `Will ${top.name} win the Premier League?`,
        yesPrice: top.offer,
        noPrice: top.bid, // Using bid as proxy for "No" sell price
        volume: '£1.2M',
        icon: <Trophy className="w-5 h-5 text-purple-400" />,
        color: 'from-purple-500/20 to-blue-500/20',
        borderColor: 'group-hover:border-purple-500/50'
      });
    }

    if (markets.F1.length > 0) {
      const top = getRandomTopTeam(markets.F1);
      generatedQuestions.push({
        id: 'f1-1',
        market: 'F1',
        question: `Will ${top.name} win the Drivers' Championship?`,
        yesPrice: top.offer,
        noPrice: top.bid,
        volume: '£850K',
        icon: <Flag className="w-5 h-5 text-red-400" />,
        color: 'from-red-500/20 to-orange-500/20',
        borderColor: 'group-hover:border-red-500/50'
      });
    }

    if (markets.SPL.length > 0) {
      const top = getRandomTopTeam(markets.SPL);
      generatedQuestions.push({
        id: 'spl-1',
        market: 'SPL',
        question: `Will ${top.name} win the Saudi Pro League?`,
        yesPrice: top.offer,
        noPrice: top.bid,
        volume: '£420K',
        icon: <Activity className="w-5 h-5 text-green-400" />,
        color: 'from-green-500/20 to-emerald-500/20',
        borderColor: 'group-hover:border-green-500/50'
      });
    }

    if (markets.UCL.length > 0) {
      const top = getRandomTopTeam(markets.UCL);
      generatedQuestions.push({
        id: 'ucl-1',
        market: 'UCL',
        question: `Will ${top.name} win the Champions League?`,
        yesPrice: top.offer,
        noPrice: top.bid,
        volume: '£2.1M',
        icon: <Trophy className="w-5 h-5 text-blue-400" />,
        color: 'from-blue-600/20 to-indigo-600/20',
        borderColor: 'group-hover:border-blue-500/50'
      });
    }

    // Shuffle and take top 3
    return generatedQuestions.sort(() => 0.5 - Math.random()).slice(0, 3);
  }, [teams]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-[#3AA189]" />
          Trending Markets
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {questions.map((q) => (
          <div
            key={q.id}
            onClick={() => onNavigate(q.market as any)}
            className={`group relative bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-5 cursor-pointer transition-all duration-300 hover:bg-gray-800 hover:shadow-xl hover:-translate-y-1 ${q.borderColor}`}
          >
            {/* Gradient Background Effect */}
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${q.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 bg-gray-900/60 rounded-full px-3 py-1 border border-gray-700">
                  {q.icon}
                  <span className="text-xs font-medium text-gray-300">{q.market}</span>
                </div>
                <span className="text-xs text-gray-500 font-mono">Vol: {q.volume}</span>
              </div>

              <h3 className="text-lg font-semibold text-gray-100 mb-6 group-hover:text-white transition-colors line-clamp-2">
                {q.question}
              </h3>

              <div className="mt-auto grid grid-cols-2 gap-3">
                <button className="flex flex-col items-center justify-center bg-[#3AA189]/10 hover:bg-[#3AA189]/20 border border-[#3AA189]/30 rounded-lg p-2 transition-colors group/btn">
                  <span className="text-xs text-[#3AA189] font-medium mb-1">Yes</span>
                  <span className="text-lg font-bold text-[#3AA189]">{q.yesPrice.toFixed(1)}</span>
                </button>
                <button className="flex flex-col items-center justify-center bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg p-2 transition-colors group/btn">
                  <span className="text-xs text-red-400 font-medium mb-1">No</span>
                  <span className="text-lg font-bold text-red-400">{q.noPrice.toFixed(1)}</span>
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
