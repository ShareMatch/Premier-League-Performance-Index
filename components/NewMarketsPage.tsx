import React from "react";
import { Team, League } from "../types";
import { ArrowLeft, Rocket } from "lucide-react";
import { SeasonDates } from "../lib/api";
import HotQuestions from "./HotQuestions";

interface NewMarketsPageProps {
    teams: Team[];
    onNavigate: (league: League) => void;
    onViewAsset: (asset: Team) => void; // Optional if you want to support clicking to view asset
    seasonDatesMap?: Map<string, SeasonDates>;
}

const NewMarketsPage: React.FC<NewMarketsPageProps> = ({
    teams,
    onNavigate,
    onViewAsset,
    seasonDatesMap,
}) => {
    // No extra loading state needed, HotQuestions handles its own skeleton if needed via props or check
    // Actually, user wants no loader delay here, so we just remove the state logic that forced a delay.
    // If the data (teams) is not ready, HotQuestions will show partial or empty.
    // But usually App.tsx passes `allAssets` which might be waiting.
    // However, HotQuestions doesn't have internal loading logic unless we pass `isLoading`.
    // We will just pass `isLoading={false}` or let it derive.
    // Let's check `App.tsx`... `teams` are passed. Usually `App` handles initial data fetch loader.
    // The previous implementation added an artificial 600ms delay. We remove that.

    return (
        <div className="h-full flex flex-col bg-gray-900 text-white overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onNavigate("HOME")}
                        className="p-1 rounded-full hover:bg-gray-800 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Rocket className="w-5 h-5 text-[#00A651]" />
                        <h1 className="text-xl font-bold font-sans">New Markets</h1>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                <HotQuestions
                    teams={teams}
                    onNavigate={onNavigate}
                    onViewAsset={onViewAsset}
                    seasonDatesMap={seasonDatesMap}
                    limit={0} // Show all
                    showHeader={false}
                    enableAnimation={false}
                    isLoading={false}
                />
            </div>
        </div>
    );
};

export default NewMarketsPage;
