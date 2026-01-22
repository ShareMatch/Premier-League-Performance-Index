import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Share2,
  Star,
  TrendingUp,
  BarChart3,
  DollarSign,
  Check,
  Copy,
} from "lucide-react";
import { FaCaretUp, FaCaretDown } from "react-icons/fa";
import PriceVolumeChart from "./PriceVolumeChart";
import TradeHistoryList from "./TradeHistoryList";
import { generateAssetHistory, generateTradeHistory } from "../utils/mockData";
import { Team } from "../types";
import NewsFeed from "./NewsFeed";
import DidYouKnow from "./DidYouKnow";
import OnThisDay from "./OnThisDay";
import { getLogoUrl } from "../lib/logoHelper";
import { useFavorites } from "../hooks/useFavorites";
import { generateShareLink } from "../lib/api";

interface AssetPageProps {
  asset: Team;
  onBack: () => void;
  onSelectOrder?: (team: Team, type: "buy" | "sell") => void;
  onNavigateToIndex?: (market: string) => void;
}

const AssetPage: React.FC<AssetPageProps> = ({
  asset,
  onBack,
  onSelectOrder,
  onNavigateToIndex,
}) => {
  const [period, setPeriod] = useState<"1h" | "24h" | "7d" | "All">("24h");
  const [shareConfig, setShareConfig] = useState<{ url: string; type: 'mobile' | 'desktop'; copied: boolean } | null>(null);
  const { favorites, toggleFavorite } = useFavorites();
  const desktopShareRef = useRef<HTMLDivElement>(null);
  const mobileShareRef = useRef<HTMLDivElement>(null);

  // Prioritize asset_id (static ID) for watchlist so it sticks across leagues
  const watchId = asset.asset_id || asset.id;
  const isInWatchlist = favorites.includes(watchId);

  console.log("AssetPage - Watchlist State:", {
    assetName: asset.name,
    watchId,
    isInWatchlist,
    totalWatchlistCount: favorites.length,
  });
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
    return asset.market
      ? getLogoUrl(asset.name || "", asset.market, asset.id)
      : null;
  }, [asset.name, asset.market, asset.id]);

  // Generate a distinct color for fallback avatar based on name hash
  const avatarColor = useMemo(() => {
    const colors = [
      "bg-blue-600",
      "bg-emerald-600",
      "bg-violet-600",
      "bg-amber-600",
      "bg-rose-600",
    ];
    const index = asset.name.length % colors.length;
    return colors[index];
  }, [asset.name]);

  const handleShare = async (type: 'mobile' | 'desktop') => {
    // If tooltip is already open for this type, close it
    if (shareConfig?.type === type) {
      setShareConfig(null);
      return;
    }

    let shareUrl = '';
    if (asset.short_code) {
      shareUrl = `${window.location.origin}/a/${asset.short_code}`;
    } else {
      try {
        shareUrl = await generateShareLink(asset.id);
      } catch (err) {
        console.error("Share error:", err);
        return;
      }
    }

    // Attempt native share on mobile if supported
    if (type === 'mobile' && navigator.share) {
      try {
        await navigator.share({
          title: `ShareMatch | ${asset.name}`,
          text: `Check out the performance index for ${asset.name} on ShareMatch!`,
          url: shareUrl,
        });
        return; // Successfully shared via native UI
      } catch (err) {
        // Only fallback to tooltip if it wasn't a user cancellation
        if ((err as Error).name === 'AbortError') return;
        console.error("Native share error:", err);
      }
    }

    // Fallback to custom tooltip for desktop or unsupported mobile browsers
    setShareConfig({ url: shareUrl, type, copied: false });
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setShareConfig(prev => prev ? { ...prev, copied: true } : null);
      setTimeout(() => setShareConfig(null), 2500);
    } catch (err) {
      console.error("Clipboard error:", err);
    }
  };

  useEffect(() => {
    if (!shareConfig) return;

    const handleClickOutside = (event: MouseEvent) => {
      const desktopRef = desktopShareRef.current;
      const mobileRef = mobileShareRef.current;

      const isOutsideDesktop = desktopRef && !desktopRef.contains(event.target as Node);
      const isOutsideMobile = mobileRef && !mobileRef.contains(event.target as Node);

      if (shareConfig.type === 'desktop' && isOutsideDesktop) {
        setShareConfig(null);
      } else if (shareConfig.type === 'mobile' && isOutsideMobile) {
        setShareConfig(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [shareConfig]);

  return (
    <div
      data-testid="asset-page"
      className="h-full overflow-y-auto bg-[#040B11] text-gray-200"
    >
      {/* Mobile Header - Compact */}
      <div className="lg:hidden sticky top-0 z-30 bg-[#0B1221] border-b border-gray-800">
        <div className="flex items-center justify-between p-2 gap-[clamp(0.5rem,2vw,1rem)]">
          <button
            onClick={onBack}
            className="p-1 hover:bg-white/5 rounded-full transition-colors flex-shrink-0"
            data-testid="asset-page-back-mobile"
          >
            <ArrowLeft className="w-[clamp(1rem,4vw,1.25rem)] h-[clamp(1rem,4vw,1.25rem)] text-gray-400" />
          </button>

          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {avatarUrl ? (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 flex-shrink-0 avatar-breathe">
                <img
                  src={avatarUrl}
                  alt={`${asset.name} avatar`}
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div
                className={`w-8 h-8 rounded-lg ${avatarColor} flex items-center justify-center border border-white/10 flex-shrink-0`}
              >
                <span className="text-xs font-bold text-white">
                  {asset.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-[clamp(0.7rem,2vw,0.875rem)] font-bold text-white leading-tight">
                {asset.name}
              </h1>
              {asset.market ? (
                <button
                  onClick={() => onNavigateToIndex?.(asset.market!)}
                  className="text-[clamp(0.6rem,1.5vw,0.75rem)] text-brand-primary hover:text-brand-primary/80 hover:underline transition-colors font-medium"
                >
                  {asset.market} Index
                </button>
              ) : (
                <span className="text-[clamp(0.55rem,1.25vw,0.625rem)] text-gray-400">Asset</span>
              )}
            </div>
          </div>

          {asset.is_settled && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs font-bold text-white font-mono">
                ${(asset.offer || 0).toFixed(1)}
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded border bg-amber-500/10 text-amber-500 border-amber-500/30">
                Settled
              </span>
            </div>
          )}

          <div className="flex items-center flex-shrink-0">
            <button
              onClick={() => {
                console.log("Watchlist Toggle - ID:", watchId);
                toggleFavorite(watchId);
              }}
              className={`p-1.5 rounded-lg transition-colors ${isInWatchlist ? "text-yellow-400 bg-yellow-400/10" : "text-gray-400 hover:bg-gray-800"}`}
              title={
                isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"
              }
            >
              <Star
                className={`w-4 h-4 ${isInWatchlist ? "fill-yellow-400" : ""}`}
              />
            </button>
            <div className="relative" ref={mobileShareRef}>
              <button
                onClick={() => handleShare('mobile')}
                className="p-1.5 text-gray-400 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>

              {shareConfig?.type === 'mobile' && (
                <div className="absolute top-full right-0 mt-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="bg-[#0B1221] backdrop-blur-xl border border-emerald-500/30 rounded-lg px-2.5 py-2 shadow-2xl relative min-w-[200px] max-w-[calc(100vw-2rem)]">
                    {shareConfig.copied ? (
                      <div className="flex items-center gap-1.5 py-1">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest whitespace-nowrap">
                          Copied to Clipboard!
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-black/40 rounded p-1.5 border border-white/5">
                        <span className="text-[10px] text-emerald-400 font-mono truncate flex-1">
                          {shareConfig.url}
                        </span>
                        <button
                          onClick={() => copyToClipboard(shareConfig.url)}
                          className="p-1 hover:bg-white/10 rounded transition-colors text-emerald-500 flex-shrink-0"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {/* Arrow */}
                    <div className="absolute -top-1 right-3 w-2 h-2 bg-[#0B1221] border-l border-t border-emerald-500/30 rotate-45" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Price & Actions - Only for open markets */}
        {!asset.is_settled && (
          <div className="p-2 border-t border-gray-800 bg-[#0B1221]/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center min-h-[1.5rem]">
                {(() => {
                  // Generate mock price change
                  const changeAmount = Math.random() * 2 - 0.5;
                  const isPositive = changeAmount >= 0;
                  return (
                    <span
                      className={`text-[10px] font-bold flex items-center gap-0.5 ${isPositive ? "text-green-400" : "text-red-400"}`}
                    >
                      {isPositive ? (
                        <FaCaretUp className="w-3 h-3" />
                      ) : (
                        <FaCaretDown className="w-3 h-3" />
                      )}
                      ${Math.abs(changeAmount).toFixed(2)}
                      <span className="ml-1 text-[9px]">({period})</span>
                    </span>
                  );
                })()}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSelectOrder?.(asset, "buy")}
                className="flex flex-col items-center justify-center bg-[#005430] hover:bg-[#006035] border border-[#005430] rounded-lg p-1.5 transition-all shadow-lg shadow-black/20"
                data-testid="asset-page-buy-mobile"
              >
                <span className="text-[clamp(0.45rem,1.5vw,0.5rem)] text-emerald-100/70 font-medium mb-0.5 uppercase tracking-wide">
                  Buy
                </span>
                <span className="text-[clamp(0.75rem,2.5vw,0.875rem)] font-bold text-white">
                  ${(asset.offer || 0).toFixed(2)}
                </span>
              </button>
              <button
                onClick={() => onSelectOrder?.(asset, "sell")}
                className="flex flex-col items-center justify-center bg-red-900/20 hover:bg-red-900/30 border border-red-500/20 hover:border-red-500/40 rounded-lg p-1.5 transition-all"
                data-testid="asset-page-sell-mobile"
              >
                <span className="text-[clamp(0.45rem,1.5vw,0.5rem)] text-red-300/70 font-medium mb-0.5 uppercase tracking-wide">
                  Sell
                </span>
                <span className="text-[clamp(0.75rem,2.5vw,0.875rem)] font-bold text-red-400">
                  ${(asset.bid || 0).toFixed(2)}
                </span>
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
            data-testid="asset-page-back-desktop"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            {/* Asset Avatar */}
            {avatarUrl ? (
              <div className="w-20 h-20 rounded-xl flex items-center justify-center avatar-breathe">
                <img
                  src={avatarUrl}
                  alt={`${asset.name} avatar`}
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
            ) : (
              <div
                className={`w-20 h-20 rounded-xl ${avatarColor} flex items-center justify-center shadow-lg shadow-black/50 border border-white/10`}
              >
                <span className="text-xl font-black text-white tracking-tighter">
                  {asset.name?.substring(0, 2).toUpperCase() || "??"}
                </span>
              </div>
            )}

            <div>
              <h1 className="text-[clamp(1rem,2.5vw,1.25rem)] font-bold text-white tracking-tight">
                {asset.name}
              </h1>
              <div className="flex items-center gap-[clamp(0.375rem,1vw,0.5rem)] text-[clamp(0.65rem,1.5vw,0.75rem)] text-gray-400">
                {asset.market ? (
                  <button
                    onClick={() => onNavigateToIndex?.(asset.market!)}
                    className="bg-brand-primary/10 hover:bg-brand-primary/20 px-[clamp(0.375rem,1vw,0.5rem)] py-[clamp(0.125rem,0.5vw,0.25rem)] rounded-[clamp(0.125rem,0.5vw,0.25rem)] text-brand-primary hover:text-brand-primary/90 font-semibold transition-all flex items-center gap-1"
                  >
                    {asset.market} Index
                    <span className="text-[clamp(0.5rem,1vw,0.625rem)]">→</span>
                  </button>
                ) : (
                  <span className="bg-gray-800 px-[clamp(0.375rem,1vw,0.5rem)] py-[clamp(0.125rem,0.5vw,0.25rem)] rounded text-gray-300">
                    Asset
                  </span>
                )}
                <span>•</span>
                <span className="font-mono text-[clamp(0.55rem,1.25vw,0.7rem)]">{asset.id}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2 min-w-[80px]">
            {(() => {
              // Generate mock price change
              const changeAmount = Math.random() * 2 - 0.5;
              const isPositive = changeAmount >= 0;
              return (
                <span
                  className={`text-[10px] font-bold flex items-center gap-0.5 ${isPositive ? "text-green-400" : "text-red-400"}`}
                >
                  {isPositive ? (
                    <FaCaretUp className="w-3 h-3" />
                  ) : (
                    <FaCaretDown className="w-3 h-3" />
                  )}
                  ${Math.abs(changeAmount).toFixed(2)}
                  <span className="ml-1">({period})</span>
                </span>
              );
            })()}
          </div>

          {asset.is_settled ? (
            <span className="px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded border bg-amber-500/10 text-amber-500 border-amber-500/30 whitespace-nowrap">
              Market Settled
            </span>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSelectOrder?.(asset, "buy")}
                className="w-[clamp(5rem,8vw,6.5rem)] flex flex-col items-center justify-center bg-[#005430] hover:bg-[#006035] border border-[#005430] rounded-lg p-1.5 transition-all shadow-lg shadow-black/20"
                data-testid="asset-page-buy-desktop"
              >
                <span className="text-[clamp(0.5rem,1.2vw,0.55rem)] text-emerald-100/70 font-medium mb-0.5 uppercase tracking-wide">
                  Buy
                </span>
                <span className="text-[clamp(0.875rem,2vw,1rem)] font-bold text-white">
                  ${(asset.offer || 0).toFixed(2)}
                </span>
              </button>
              <button
                onClick={() => onSelectOrder?.(asset, "sell")}
                className="w-[clamp(5rem,8vw,6.5rem)] flex flex-col items-center justify-center bg-red-900/20 hover:bg-red-900/30 border border-red-500/20 hover:border-red-500/40 rounded-lg p-1.5 transition-all"
                data-testid="asset-page-sell-desktop"
              >
                <span className="text-[clamp(0.5rem,1.2vw,0.55rem)] text-red-300/70 font-medium mb-0.5 uppercase tracking-wide">
                  Sell
                </span>
                <span className="text-[clamp(0.875rem,2vw,1rem)] font-bold text-red-400">
                  ${(asset.bid || 0).toFixed(2)}
                </span>
              </button>
            </div>
          )}

          <div className="h-8 w-px bg-gray-700 mx-2"></div>

          <div className="flex gap-1">
            <button
              onClick={() => {
                console.log("Watchlist Toggle - ID:", watchId);
                toggleFavorite(watchId);
              }}
              className={`p-2 rounded-lg transition-colors ${isInWatchlist ? "text-yellow-400 bg-yellow-400/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
              title={
                isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"
              }
            >
              <Star
                className={`w-5 h-5 ${isInWatchlist ? "fill-yellow-400" : ""}`}
              />
            </button>
            <div className="relative" ref={desktopShareRef}>
              <button
                onClick={() => handleShare('desktop')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title="Share Asset"
              >
                <Share2 className="w-5 h-5" />
              </button>

              {shareConfig?.type === 'desktop' && (
                <div className="absolute top-full right-0 mt-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="bg-[#0B1221] backdrop-blur-xl border border-emerald-500/30 rounded-lg px-3 py-2.5 shadow-2xl relative min-w-[240px]">
                    {shareConfig.copied ? (
                      <div className="flex items-center gap-2 py-1">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-[11px] font-bold text-white uppercase tracking-widest whitespace-nowrap">
                          Copied to Clipboard!
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-black/40 rounded-lg p-2 border border-white/5">
                        <span className="text-[10px] text-emerald-400 font-mono truncate max-w-[160px]">
                          {shareConfig.url}
                        </span>
                        <button
                          onClick={() => copyToClipboard(shareConfig.url)}
                          className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-emerald-500"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {/* Arrow */}
                    <div className="absolute -top-1 right-4 w-2 h-2 bg-[#0B1221] border-l border-t border-emerald-500/30 rotate-45" />
                  </div>
                </div>
              )}
            </div>
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
                <h3 className="text-white font-bold text-sm mb-3">
                  Market Stats
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#040B11]/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">Market Cap</span>
                    </div>
                    <span className="text-sm font-bold text-white font-mono">
                      $240.5M
                    </span>
                  </div>
                  <div className="bg-[#040B11]/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">24h Volume</span>
                    </div>
                    <span className="text-sm font-bold text-white font-mono">
                      $1.2M
                    </span>
                  </div>
                  <div className="bg-[#040B11]/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        All Time High
                      </span>
                    </div>
                    <span className="text-sm font-bold text-white font-mono">
                      $4.2
                    </span>
                  </div>
                  <div className="bg-[#040B11]/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        Total Supply
                      </span>
                    </div>
                    <span className="text-sm font-bold text-white font-mono">
                      100M
                    </span>
                  </div>
                </div>
              </div>

              {/* Trade History - Mobile/Tablet: Show inline */}
              <div className="xl:hidden">
                <TradeHistoryList
                  trades={tradeHistory}
                  assetName={asset.name}
                  assetId={watchId}
                />
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
                  <h2 className="text-[clamp(0.875rem,3vw,1.25rem)] font-bold text-white">
                    Latest News for {asset.name}
                  </h2>
                </div>
                <div className="bg-[#02060a] border border-gray-800 rounded-xl overflow-hidden">
                  <NewsFeed
                    className="min-h-[300px] sm:min-h-[350px] md:min-h-[400px]"
                    topic={`team:${asset.name}:${asset.market || "general"}`}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Stats & Info (Desktop Only) */}
            <div className="hidden xl:block xl:col-span-1 space-y-6">
              <TradeHistoryList
                trades={tradeHistory}
                assetName={asset.name}
                assetId={watchId}
              />

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
