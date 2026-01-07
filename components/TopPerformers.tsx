import React from "react";
import { Award } from "lucide-react";

interface IndexItem {
  name: string;
  performance: string;
  volume: string;
  rank: number;
  logoUrl: string;
}

const TopPerformers: React.FC = () => {
  // Mock data for top performing indexes - in real app, this could come from props or API
  const indexes: IndexItem[] = [
    {
      name: "EPL",
      performance: "+12.5%",
      volume: "£4.5M",
      rank: 1,
      logoUrl: "https://logo.clearbit.com/premierleague.com",
    },
    {
      name: "F1",
      performance: "+9.8%",
      volume: "£3.2M",
      rank: 2,
      logoUrl: "https://logo.clearbit.com/formula1.com",
    },
    {
      name: "NBA",
      performance: "+8.3%",
      volume: "£2.8M",
      rank: 3,
      logoUrl: "https://logo.clearbit.com/nba.com",
    },
  ];

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-[#00A651]" />
          Top Performing Indexes This Week
        </h3>
      </div>
      <div className="p-4 space-y-2">
        {indexes.map((indexItem) => (
          <div
            key={indexItem.rank}
            className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800 transition-all cursor-pointer group border border-transparent hover:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 flex items-center justify-center font-bold text-[10px] ${
                  indexItem.rank === 1
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    : indexItem.rank === 2
                    ? "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                    : "bg-amber-700/20 text-amber-600 border border-amber-700/30"
                } rounded-full`}
              >
                {indexItem.rank}
              </div>
              {/* <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center border border-gray-600/30 overflow-hidden">
                <img
                  src={indexItem.logoUrl}
                  alt={`${indexItem.name} logo`}
                  className="w-full h-full object-contain"
                />
              </div> */}
              <span className="text-sm text-gray-200 font-medium group-hover:text-white transition-colors">
                {indexItem.name}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#00A651] font-bold">
                {indexItem.performance}
              </p>
              <p className="text-[10px] text-gray-500">{indexItem.volume}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopPerformers;
