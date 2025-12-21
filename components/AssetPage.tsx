import React, { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Share2, Star } from "lucide-react";
import PriceVolumeChart from "./PriceVolumeChart";
import TradeHistoryList from "./TradeHistoryList";
import { generateAssetHistory, generateTradeHistory } from "../utils/mockData";
import { Team } from "../types";
import NewsFeed from "./NewsFeed";
import DidYouKnow from "./DidYouKnow";
import OnThisDay from "./OnThisDay";

interface AssetPageProps {
    asset: Team;
    onBack: () => void;
    onSelectOrder?: (team: Team, type: 'buy' | 'sell') => void;
}

const AssetPage: React.FC<AssetPageProps> = ({ asset, onBack, onSelectOrder }) => {
    const [period, setPeriod] = useState<'1h' | '24h' | '7d' | 'All'>('24h');
    const [isFavorite, setIsFavorite] = useState(false);

    // Generate consistent mock data based on asset ID 
    // (In a real app this would be fetched)
    const chartData = useMemo(() => {
        // Determine base price roughly from current asset price
        const basePrice = asset.offer || 1.0;
        return generateAssetHistory(basePrice, period, asset.name);
    }, [asset.id, asset.offer, period, asset.name]);

    const tradeHistory = useMemo(() => {
        const basePrice = asset.offer || 1.0;
        return generateTradeHistory(basePrice);
    }, [asset.id, asset.offer]);

    // Generate a distinct color for the avatar based on name hash or just use brand color
    const avatarColor = useMemo(() => {
        const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600'];
        const index = asset.name.length % colors.length;
        return colors[index];
    }, [asset.name]);

    const handleShare = () => {
        // Mock share - just copy title to clipboard
        navigator.clipboard.writeText(`Check out ${asset.name} on ShareMatch!`);
        alert('Link copied to clipboard!');
        // In a real app, use a proper toast notification
    };

    return (
        <div className="flex flex-col h-full bg-[#040B11] animate-in fade-in duration-300 overflow-y-auto">
            {/* Header / Nav */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#0B1221] sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3">
                        {/* ShareMatch Branded Avatar - Generated Style */}
                        <div className={`w-12 h-12 rounded-xl ${avatarColor} flex items-center justify-center shadow-lg shadow-black/50 border border-white/10`}>
                            <span className="text-xl font-black text-white tracking-tighter">
                                {asset.name.substring(0, 2).toUpperCase()}
                            </span>
                        </div>

                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">{asset.name}</h1>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">{asset.market || 'Asset'}</span>
                                <span>•</span>
                                <span className="font-mono">{asset.id}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end mr-2">
                        <span className="text-2xl font-bold text-white font-mono">${(asset.offer || 0).toFixed(1)}</span>
                        <span className="text-xs text-brand-emerald500 font-medium flex items-center gap-1">
                            +{(Math.random() * 5).toFixed(2)}% (24h)
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onSelectOrder?.(asset, 'sell')}
                            className="px-6 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold rounded-lg transition-all"
                        >
                            Sell
                        </button>
                        <button
                            onClick={() => onSelectOrder?.(asset, 'buy')}
                            className="px-6 py-2 bg-[#005430] hover:bg-[#006838] text-white font-bold rounded-lg transition-colors shadow-lg shadow-[#005430]/20"
                        >
                            Buy
                        </button>
                    </div>

                    <div className="h-8 w-px bg-gray-700 mx-2"></div>

                    <div className="flex gap-1">
                        <button
                            onClick={() => setIsFavorite(!isFavorite)}
                            className={`p-2 rounded-lg transition-colors ${isFavorite ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                        >
                            <Star className={`w-5 h-5 ${isFavorite ? 'fill-yellow-400' : ''}`} />
                        </button>
                        <button
                            onClick={handleShare}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Charts (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                    <PriceVolumeChart
                        data={chartData}
                        assetName={asset.name}
                        period={period}
                        onPeriodChange={setPeriod}
                    />

                    {/* News Section */}
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Latest News for {asset.name}</h2>
                        </div>
                        {/* We reuse NewsFeed but filter it or pass specific query if supported, 
                    for now standard feed or if NewsFeed supports filtering we use it. 
                    Adding a wrapper to constrain height if needed. */}
                        <div className="bg-[#02060a] border border-gray-800 rounded-xl overflow-hidden">
                            <NewsFeed className="min-h-[400px]" topic={asset.name} />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <TradeHistoryList trades={tradeHistory} assetName={asset.name} />

                    {/* Key Stats Card */}
                    <div className="bg-[#0B1221] border border-gray-800 rounded-xl p-5 space-y-4">
                        <h3 className="text-white font-bold text-sm">Market Stats</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Market Cap</span>
                                <span className="text-white font-mono">$240.5M</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">24h Volume</span>
                                <span className="text-white font-mono">$1.2M</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">All Time High</span>
                                <span className="text-white font-mono">$4.2</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Total Supply</span>
                                <span className="text-white font-mono">100M</span>
                            </div>
                        </div>
                    </div>

                    import OnThisDay from "./OnThisDay"; // Add import at top (assumed separate step or handle logic)

                    // ...

                    {/* Did You Know Module */}
                    <DidYouKnow assetName={asset.name} market={asset.market} />

                    {/* On This Day Module */}
                    <OnThisDay assetName={asset.name} market={asset.market} />
                </div>

            </div>
        </div>
    );
};

export default AssetPage;
