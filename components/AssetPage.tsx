import React, { useMemo, useState } from "react";
import { ArrowLeft, Share2, Star, TrendingUp, BarChart3, DollarSign } from "lucide-react";
import PriceVolumeChart from "./PriceVolumeChart";
import TradeHistoryList from "./TradeHistoryList";
import { generateAssetHistory, generateTradeHistory } from "../utils/mockData";
import { Team } from "../types";
import NewsFeed from "./NewsFeed";
import DidYouKnow from "./DidYouKnow";
import OnThisDay from "./OnThisDay";
import { getLogoUrl } from "../lib/logoHelper";

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
        const basePrice = asset.offer || 1.0;
        return generateAssetHistory(basePrice, period, asset.name);
    }, [asset.id, asset.offer, period, asset.name]);

    const tradeHistory = useMemo(() => {
        const basePrice = asset.offer || 1.0;
        return generateTradeHistory(basePrice);
    }, [asset.id, asset.offer]);

    // Get avatar URL for the asset
    const avatarUrl = useMemo(() => {
        return asset.market ? getLogoUrl(asset.name || '', asset.market, asset.id) : null;
    }, [asset.name, asset.market, asset.id]);

    // Generate a distinct color for fallback avatar based on name hash
    const avatarColor = useMemo(() => {
        const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600'];
        const index = asset.name.length % colors.length;
        return colors[index];
    }, [asset.name]);

    const handleShare = () => {
        navigator.clipboard.writeText(`Check out ${asset.name} on ShareMatch!`);
        alert('Link copied to clipboard!');
    };

    return (
        <div className="h-full overflow-y-auto bg-[#040B11] text-gray-200">
            {/* Mobile Header - Compact */}
            <div className="lg:hidden sticky top-0 z-30 bg-[#0B1221] border-b border-gray-800">
                <div className="flex items-center justify-between p-2 gap-1">
                    <button
                        onClick={onBack}
                        className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {avatarUrl ? (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 flex-shrink-0">
                                <img
                                    src={avatarUrl}
                                    alt={`${asset.name} avatar`}
                                    className="w-full h-full object-contain rounded-lg"
                                />
                            </div>
                        ) : (
                            <div className={`w-8 h-8 rounded-lg ${avatarColor} flex items-center justify-center border border-white/10 flex-shrink-0`}>
                                <span className="text-xs font-bold text-white">
                                    {asset.name.substring(0, 2).toUpperCase()}
                                </span>
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="text-xs font-bold text-white truncate">{asset.name}</h1>
                            <span className="text-[10px] text-gray-400">{asset.market || 'Asset'}</span>
                        </div>
                    </div>

                    {asset.is_settled && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-xs font-bold text-white font-mono">${(asset.offer || 0).toFixed(1)}</span>
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded border bg-amber-500/10 text-amber-500 border-amber-500/30">
                                Settled
                            </span>
                        </div>
                    )}

                    <div className="flex items-center flex-shrink-0">
                        <button
                            onClick={() => setIsFavorite(!isFavorite)}
                            className={`p-1.5 rounded-lg transition-colors ${isFavorite ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-400 hover:bg-gray-800'}`}
                        >
                            <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-400' : ''}`} />
                        </button>
                        <button
                            onClick={handleShare}
                            className="p-1.5 text-gray-400 hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Mobile Price & Actions - Only for open markets */}
                {!asset.is_settled && (
                    <div className="p-2 border-t border-gray-800 bg-[#0B1221]/50">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                                <span className="text-base font-bold text-white font-mono">${(asset.offer || 0).toFixed(1)}</span>
                                {(() => {
                                    const change = (Math.random() * 10 - 3).toFixed(2);
                                    const isPositive = parseFloat(change) >= 0;
                                    return (
                                        <span className={`ml-1.5 text-[10px] font-medium ${isPositive ? 'text-brand-emerald500' : 'text-red-400'}`}>
                                            {isPositive ? '+' : ''}{change}%
                            </span>
                                    );
                                })()}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onSelectOrder?.(asset, 'sell')}
                                className="flex-1 px-3 py-2 bg-red-900/20 border border-red-500/20 text-red-400 font-bold rounded-lg transition-all text-xs"
                        >
                            Sell
                        </button>
                        <button
                            onClick={() => onSelectOrder?.(asset, 'buy')}
                                className="flex-1 px-3 py-2 bg-[#005430] text-white font-bold rounded-lg transition-colors text-xs"
                        >
                            Buy
                        </button>
                    </div>
                </div>
                )}
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:flex items-center justify-between p-6 border-b border-gray-800 bg-[#0B1221] sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3">
                        {/* Asset Avatar */}
                        {avatarUrl ? (
                            <div className="w-20 h-20 rounded-xl flex items-center justify-center">
                                <img
                                    src={avatarUrl}
                                    alt={`${asset.name} avatar`}
                                    className="w-full h-full object-contain rounded-xl"
                                />
                            </div>
                        ) : (
                            <div className={`w-20 h-20 rounded-xl ${avatarColor} flex items-center justify-center shadow-lg shadow-black/50 border border-white/10`}>
                                <span className="text-xl font-black text-white tracking-tighter">
                                    {asset.name?.substring(0, 2).toUpperCase() || '??'}
                                </span>
                            </div>
                        )}

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
                        {(() => {
                            const change = (Math.random() * 10 - 3).toFixed(2);
                            const isPositive = parseFloat(change) >= 0;
                            return (
                                <span className={`text-xs font-medium flex items-center gap-1 ${isPositive ? 'text-brand-emerald500' : 'text-red-400'}`}>
                                    {isPositive ? '+' : ''}{change}% (24h)
                        </span>
                            );
                        })()}
                    </div>

                    {asset.is_settled ? (
                        <span className="px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded border bg-amber-500/10 text-amber-500 border-amber-500/30 whitespace-nowrap">
                            Market Settled
                        </span>
                    ) : (
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
                    )}

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

            {/* Main Content */}
            <div>
                <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
                    {/* Responsive Grid: Mobile stacked, Tablet 2-col option, Desktop 3-col */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
                        
                        {/* Left Column - Main Chart & News (Mobile: Full Width, Desktop: 2/3) */}
                        <div className="xl:col-span-2 space-y-4 md:space-y-6">
                            
                            {/* Price Chart */}
                            <PriceVolumeChart
                                data={chartData}
                                assetName={asset.name}
                                period={period}
                                onPeriodChange={setPeriod}
                            />

                            {/* Market Stats - Mobile/Tablet: Show early, Desktop: Show in right column */}
                            <div className="xl:hidden bg-[#0B1221] border border-gray-800 rounded-xl p-3 sm:p-4">
                                <h3 className="text-white font-bold text-sm mb-3">Market Stats</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#040B11]/50 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <DollarSign className="w-3 h-3 text-gray-400" />
                                            <span className="text-xs text-gray-400">Market Cap</span>
                                        </div>
                                        <span className="text-sm font-bold text-white font-mono">$240.5M</span>
                                    </div>
                                    <div className="bg-[#040B11]/50 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <BarChart3 className="w-3 h-3 text-gray-400" />
                                            <span className="text-xs text-gray-400">24h Volume</span>
                                        </div>
                                        <span className="text-sm font-bold text-white font-mono">$1.2M</span>
                                    </div>
                                    <div className="bg-[#040B11]/50 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <TrendingUp className="w-3 h-3 text-gray-400" />
                                            <span className="text-xs text-gray-400">All Time High</span>
                                        </div>
                                        <span className="text-sm font-bold text-white font-mono">$4.2</span>
                                    </div>
                                    <div className="bg-[#040B11]/50 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <BarChart3 className="w-3 h-3 text-gray-400" />
                                            <span className="text-xs text-gray-400">Total Supply</span>
                                        </div>
                                        <span className="text-sm font-bold text-white font-mono">100M</span>
                                    </div>
                                </div>
                            </div>

                            {/* Trade History - Mobile/Tablet: Show inline */}
                            <div className="xl:hidden">
                                <TradeHistoryList trades={tradeHistory} assetName={asset.name} />
                            </div>

                            {/* Did You Know - Mobile/Tablet */}
                            <div className="xl:hidden">
                                <DidYouKnow assetName={asset.name} market={asset.market} />
                            </div>

                            {/* On This Day - Mobile/Tablet */}
                            <div className="xl:hidden">
                                <OnThisDay assetName={asset.name} market={asset.market} />
                            </div>

                            {/* News Section */}
                            <div className="mt-4 md:mt-8">
                                <div className="flex items-center justify-between mb-3 sm:mb-4">
                                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-white">Latest News for {asset.name}</h2>
                                </div>
                                <div className="bg-[#02060a] border border-gray-800 rounded-xl overflow-hidden">
                                    <NewsFeed className="min-h-[300px] sm:min-h-[350px] md:min-h-[400px]" topic={asset.name} />
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Stats & Info (Desktop Only) */}
                        <div className="hidden xl:block xl:col-span-1 space-y-6">
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

                            {/* Did You Know Module */}
                            <DidYouKnow assetName={asset.name} market={asset.market} />

                            {/* On This Day Module */}
                            <OnThisDay assetName={asset.name} market={asset.market} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetPage;
