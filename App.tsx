import React, { useState, useEffect, useCallback, useRef } from "react";
import { Team, Order, Wallet, Position, Transaction, League } from "./types";
import Header from "./components/Header";
import TopBar from "./components/TopBar";
import RightPanel from "./components/RightPanel";
import Ticker from "./components/Ticker";
import { Menu, X, Loader2 } from "lucide-react";
import NewsFeed from "./components/NewsFeed";
import HomeDashboard from "./components/HomeDashboard";
import OrderBookRow from "./components/OrderBookRow";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import AIAnalysis from "./components/AIAnalysis";
// Lazy load AIAnalyticsPage to prevent load-time crashes from GenAI SDK
const AIAnalyticsPage = React.lazy(
  () => import("./components/AIAnalyticsPage")
);
import {
  fetchWallet,
  fetchPortfolio,
  placeTrade,
  subscribeToWallet,
  subscribeToPortfolio,
  fetchAssets,
  fetchTradingAssets,
  fetchSettledAssets,
  subscribeToAssets,
  subscribeToTradingAssets,
  getPublicUserId,
  fetchTransactions,
  getKycUserStatus,
  KycStatus,
  needsKycVerification,
} from "./lib/api";
import { useAuth } from "./components/auth/AuthProvider";
import KYCModal from "./components/kyc/KYCModal";
import InactivityHandler from "./components/auth/InactivityHandler";
import { SESSION_CONFIG, FEATURES } from "./lib/config";
import AIAnalyticsBanner from "./components/AIAnalyticsBanner";
import AccessDeniedModal from "./components/AccessDeniedModal";
import SellErrorModal from "./components/SellErrorModal";
import MyDetailsPage from "./components/mydetails/MyDetailsPage";
import ChatBot from "./components/chatbot/frontend/ChatBot";
import AlertModal from "./components/AlertModal";
import AssetPage from "./components/AssetPage";

const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [activeLeague, setActiveLeague] = useState<League>("HOME");
  const [allAssets, setAllAssets] = useState<Team[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'asset'>('dashboard');
  const [viewAsset, setViewAsset] = useState<Team | null>(null);

  // Supabase State
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [portfolio, setPortfolio] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [publicUserId, setPublicUserId] = useState<string | null>(null);

  // Refs to track current state for subscription callbacks
  const userRef = useRef(user);
  const publicUserIdRef = useRef(publicUserId);

  // Keep refs in sync with state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    publicUserIdRef.current = publicUserId;
  }, [publicUserId]);

  // KYC State
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const [forceKycUpdateMode, setForceKycUpdateMode] = useState(false);
  const [kycChecked, setKycChecked] = useState(false);

  // AI Analytics Access Control
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [showSellErrorModal, setShowSellErrorModal] = useState(false);
  const [sellErrorAssetName, setSellErrorAssetName] = useState("");
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // Right Panel visibility (for mobile/tablet overlay)
  const [showRightPanel, setShowRightPanel] = useState(false);

  // Lock body scroll when mobile panel is open (prevents iOS Safari scroll issues)
  useEffect(() => {
    if (showRightPanel) {
      // Lock scroll on body
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      // Restore scroll
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    
    return () => {
      // Cleanup on unmount
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [showRightPanel]);

  // My Details Page visibility - check URL hash on initial load
  const [showMyDetails, setShowMyDetails] = useState(() => {
    return window.location.hash === "#my-details";
  });

  // Update URL hash when My Details visibility changes
  const openMyDetails = useCallback(() => {
    setShowMyDetails(true);
    window.history.pushState(null, "", "#my-details");
  }, []);

  const closeMyDetails = useCallback(() => {
    setShowMyDetails(false);
    window.history.pushState(null, "", window.location.pathname);
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      setShowMyDetails(window.location.hash === "#my-details");
    };
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);

  const handleAIAnalyticsClick = () => {
    // Check if user has any assets in portfolio
    if (!portfolio || portfolio.length === 0) {
      setShowAccessDeniedModal(true);
      return;
    }
    setActiveLeague("AI_ANALYTICS");
  };

  // Fetch User Data
  const loadUserData = useCallback(async () => {
    if (!publicUserId) return;
    try {
      const walletData = await fetchWallet(publicUserId);
      setWallet(walletData);
      const portfolioData = await fetchPortfolio(publicUserId);
      setPortfolio(portfolioData);
      const transactionsData = await fetchTransactions(publicUserId);
      setTransactions(transactionsData);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, [publicUserId]);

  // Fetch Assets
  const loadAssets = useCallback(async () => {
    try {
      // Fetch static asset data, active trading data, and settled assets in parallel
      const [staticAssets, tradingAssets, settledAssets] = await Promise.all([
        fetchAssets(),
        fetchTradingAssets(),
        fetchSettledAssets()
      ]);

      // Create a map of static assets by ID for quick lookup
      const assetMap = new Map(staticAssets.map(asset => [asset.id, asset]));

      // Combine active and settled trading assets
      const allTradingAssets = [...tradingAssets, ...settledAssets];

      // Map trading assets to Team interface with merged data
      const mappedAssets: Team[] = allTradingAssets.map((ta: any) => {
        const staticAsset = assetMap.get(ta.asset_id);
        if (!staticAsset) {
          console.warn(`Missing static asset data for asset_id: ${ta.asset_id}`, ta);
          return null;
        }


        // Determine market from the hierarchy
        const marketGroup = ta.market_index_seasons.market_indexes.markets.market_sub_groups.market_groups.name;
        const marketSubGroup = ta.market_index_seasons.market_indexes.markets.market_sub_groups.name;
        const marketToken = ta.market_index_seasons.market_indexes.markets.market_token;

        // Map to legacy market names used in the app
        let market: string;
        if (marketToken) {
          market = marketToken;
        } else {
          // Fallback mapping based on names
          const marketName = ta.market_index_seasons.market_indexes.markets.name;
          switch (marketName) {
            case 'England Premier League': market = 'EPL'; break;
            case 'UEFA Champions League': market = 'UCL'; break;
            case 'FIFA World Cup': market = 'WC'; break;
            case 'Saudi Pro League': market = 'SPL'; break;
            case 'Indonesia Super League': market = 'ISL'; break;
            case 'Formula 1': market = 'F1'; break;
            case 'NBA': market = 'NBA'; break;
            case 'NFL': market = 'NFL'; break;
            case 'T20 World Cup': market = 'T20'; break;
            case 'Eurovision': market = 'Eurovision'; break;
            default: market = 'HOME'; break;
          }
        }

        // Map category based on market sub-group or market name
        let category: 'football' | 'f1' | 'basketball' | 'american_football' | 'cricket' | 'global_events' | 'other';
        switch (marketSubGroup) {
          case 'Football': category = 'football'; break;
          case 'Motorsport': category = 'f1'; break;
          case 'Basketball': category = 'basketball'; break;
          case 'American Football': category = 'american_football'; break;
          case 'Cricket': category = 'cricket'; break;
          case 'Eurovision': category = 'global_events'; break;
          default: category = 'other'; break;
        }

        return {
          id: ta.id, // Use trading asset ID as the primary ID
          asset_id: ta.asset_id, // Keep reference to static asset
          name: staticAsset.name,
          team: staticAsset.team,
          bid: Number(ta.sell), // Sell price is bid
          offer: Number(ta.buy), // Buy price is offer
          lastChange: 'none' as const, // TODO: Calculate from price history
          color: staticAsset.color,
          logo_url: staticAsset.logo_url,
          category: category,
          market: market,
          market_trading_asset_id: ta.id,
          is_settled: ta.market_index_seasons.is_settled,
          settled_date: ta.market_index_seasons.settled_at ? new Date(ta.market_index_seasons.settled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined,
          // Additional fields for richer data
          market_group: marketGroup,
          market_sub_group: marketSubGroup,
          index_name: ta.market_index_seasons.market_indexes.name,
          index_token: ta.market_index_seasons.market_indexes.token,
          season_status: ta.market_index_seasons.status,
          units: Number(ta.units)
        };
      }).filter(Boolean) as Team[];
      setAllAssets(mappedAssets);
    } catch (error) {
      console.error("Error loading assets:", error);
    }
  }, []);

  // Load public user ID when auth user changes
  useEffect(() => {
    if (user) {
      // Pass both auth_user_id and email for better fallback support
      getPublicUserId(user.id, user.email).then(setPublicUserId);
    } else {
      setPublicUserId(null);
      setKycStatus(null);
      setKycChecked(false);
      // Clear portfolio and transactions on sign out
      setPortfolio([]);
      setTransactions([]);
      setWallet(null);
      setSelectedOrder(null);
    }
  }, [user]);

  // Clear all user data when publicUserId becomes null
  useEffect(() => {
    if (!publicUserId) {
      setPortfolio([]);
      setTransactions([]);
      setWallet(null);
      setSelectedOrder(null);
    }
  }, [publicUserId]);

  // Check KYC status when we have the public user ID
  useEffect(() => {
    if (!publicUserId) {
      setKycChecked(false);
      return;
    }

    const checkKyc = async () => {
      try {
        const status = await getKycUserStatus(publicUserId);
        setKycStatus(status.kyc_status);

        // Auto-show KYC modal if user needs verification
        if (needsKycVerification(status.kyc_status)) {
          setShowKycModal(true);
        }
      } catch (error) {
        console.error("Failed to check KYC status:", error);
        // Default to not_started if we can't fetch status
        setKycStatus("not_started");
        setShowKycModal(true);
      } finally {
        setKycChecked(true);
      }
    };

    checkKyc();
  }, [publicUserId]);

  // Handle KYC completion - just update status, DON'T auto-close
  // User must click X to close the modal
  const handleKycComplete = (status: KycStatus) => {
    console.log("KYC status update received:", status);
    setKycStatus(status);
    // DON'T auto-close - user will click X when they're ready
    // The modal will be hidden next time they open the app if approved
  };



  const handleViewAsset = (asset: Team) => {
    setViewAsset(asset);
    setCurrentView('asset');
    // Sync sidebar active league with the asset's market if available
    if (asset.market) {
      setActiveLeague(asset.market as League);
    }
    setIsMobileMenuOpen(false); // Close menu if open
    // Scroll to top
    window.scrollTo(0, 0);
  };

  // Handle KYC modal close - re-check status in case user completed KYC
  const handleKycModalClose = async () => {
    setShowKycModal(false);

    // Re-fetch KYC status in case it changed while modal was open
    if (publicUserId) {
      try {
        const status = await getKycUserStatus(publicUserId);
        setKycStatus(status.kyc_status);
      } catch (error) {
        console.error("Failed to refresh KYC status:", error);
      }
    }
  };

  useEffect(() => {
    // Always load assets (they're public)
    loadAssets();

    // Don't load user data or set up subscriptions if user is not logged in
    if (!user || !publicUserId) {
      return;
    }

    // Load user data only when both user and publicUserId exist
    loadUserData();

    // Set up Real-Time Subscriptions - only when we have the public user ID
    const walletSubscription = subscribeToWallet(
      publicUserId,
      (updatedWallet) => {
        // Guard: only update if user is still logged in (check refs for current state)
        if (userRef.current && publicUserIdRef.current) {
          setWallet(updatedWallet);
        }
      }
    );

    const portfolioSubscription = subscribeToPortfolio(publicUserId, () => {
      // Guard: only update if user is still logged in (check refs for current state)
      if (userRef.current && publicUserIdRef.current) {
        fetchPortfolio(publicUserIdRef.current).then(setPortfolio);
      }
    });

    const assetsSubscription = subscribeToAssets(() => {
      loadAssets();
    });

    const tradingAssetsSubscription = subscribeToTradingAssets(() => {
      loadAssets();
    });

    return () => {
      walletSubscription.unsubscribe();
      portfolioSubscription.unsubscribe();
      assetsSubscription.unsubscribe();
      tradingAssetsSubscription.unsubscribe();
    };
  }, [loadUserData, loadAssets, user, publicUserId]);

  // Filter teams when league changes or assets update
  useEffect(() => {
    if (activeLeague === "HOME") {
      setTeams([]);
    } else {
      const filtered = allAssets.filter((a: any) => a.market === activeLeague);
      setTeams(filtered);
    }
    // Trade slip persisted on navigation
  }, [activeLeague, allAssets]);

  const handleNavigate = (league: League) => {
    // Reset view to dashboard when navigating
    setCurrentView('dashboard');
    setViewAsset(null);
    setIsMobileMenuOpen(false);

    if (league === "AI_ANALYTICS") {
      if (!user) {
        setAlertMessage("Please login to access the AI Analytics Engine.");
        setAlertOpen(true);
        return;
      }
      if (!portfolio || portfolio.length === 0) {
        setAlertMessage(
          "Exclusive Access: The AI Analytics Engine is available only to token holders."
        );
        setAlertOpen(true);
        return;
      }
    }
    setActiveLeague(league);
  };

  const handleSelectOrder = (team: Team, type: "buy" | "sell") => {
    console.log('handleSelectOrder Debug:', {
      teamName: team.name,
      teamMarketTradingAssetId: team.market_trading_asset_id,
      type,
      portfolioLength: portfolio.length,
      portfolioItems: portfolio.map(p => ({
        id: p.id,
        market_trading_asset_id: p.market_trading_asset_id,
        quantity: p.quantity
      }))
    });

    // Check if user is logged in
    if (!user) {
      setAlertMessage("Please login to trade.");
      setAlertOpen(true);
      return;
    }

    // Check if KYC is required
    if (kycStatus && needsKycVerification(kycStatus)) {
      setShowKycModal(true);
      return;
    }

    // Calculate max quantity based on available funds (for buy) or portfolio holdings (for sell)
    let maxQuantity = 0;

    if (type === "buy" && wallet) {
      maxQuantity = Math.floor(wallet.available_cents / 100 / team.offer);
    } else if (type === "sell") {
      const position = portfolio.find((p) => p.market_trading_asset_id === team.market_trading_asset_id);
      console.log('Position lookup result:', position, 'team.market_trading_asset_id:', team.market_trading_asset_id, 'position.market_trading_asset_id:', position?.market_trading_asset_id);
      maxQuantity = position ? Number(position.quantity) : 0;
      console.log('maxQuantity calculated:', maxQuantity);

      // Validation: Cannot sell if not owned
      if (maxQuantity <= 0) {
        setSellErrorAssetName(team.name);
        setShowSellErrorModal(true);
        return;
      }
    }

    const holdingValue = type === "sell" ? maxQuantity : 0;
    console.log('Creating Order with holding:', holdingValue, 'maxQuantity:', maxQuantity, 'type:', type);

    const orderObject = {
      team,
      type,
      price: type === "buy" ? team.offer : team.bid,
      quantity: 0, // Default to 0, let user input
      maxQuantity,
      holding: holdingValue, // Current holdings for sell orders
    };
    console.log('Order object being created:', orderObject);

    // Create a completely new object to prevent mutations
    setSelectedOrder({ ...orderObject });

    // On mobile/tablet (below 2xl), show the RightPanel overlay
    setShowRightPanel(true);
  };

  const handleConfirmTrade = async (quantity: number, side: "buy" | "sell") => {
    if (!selectedOrder || !wallet || !publicUserId) return;

    try {
      // Recompute the correct price based on the final selected side
      const team = selectedOrder.team;
      const priceForSide = side === "buy" ? team.offer : team.bid;

      const result = await placeTrade(
        publicUserId,
        team.market_trading_asset_id || team.id,
        side,
        priceForSide,
        quantity
      );

      // Refresh portfolio and wallet after trade
      await loadUserData();
      setSelectedOrder(null);
    } catch (error) {
      setAlertMessage("Trade failed. Please try again.");
      setAlertOpen(true);
    }
  };

  const handleCloseTradeSlip = () => {
    setSelectedOrder(null);
    // On mobile, also close the RightPanel when trade slip is closed
    setShowRightPanel(false);
  };

  const sortedTeams = [...teams].sort((a, b) => b.offer - a.offer);

  const getLeagueTitle = (id: string = activeLeague) => {
    switch (id) {
      case "EPL":
        return "Premier League";
      case "UCL":
        return "Champions League";
      case "WC":
        return "World Cup";
      case "SPL":
        return "Saudi Pro League";
      case "ISL":
        return "Indonesia Super League";
      case "F1":
        return "Formula 1 Drivers Performance Index";
      case "NBA":
        return "NBA";
      case "NFL":
        return "NFL";
      case "T20":
        return "T20 World Cup";
      case "Eurovision":
        return "Eurovision Song Contest";
      case "HOME":
        return "Home Dashboard";
      case "AI_ANALYTICS":
        return "AI Analytics Engine";
      default:
        return "ShareMatch Pro";
    }
  };

  // Calculate total portfolio value
  const portfolioValue = React.useMemo(() => {
    return portfolio.reduce((total, position) => {
      // Find current asset data to get price
      const asset = allAssets.find(
        (a) => a.market_trading_asset_id === position.market_trading_asset_id
      );
      // Value at bid price (like Portfolio component)
      const price = asset ? asset.bid : 0;
      return total + position.quantity * price;
    }, 0);
  }, [portfolio, allAssets]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <InactivityHandler
      inactivityTimeout={SESSION_CONFIG.INACTIVITY_TIMEOUT_MS}
      warningCountdown={SESSION_CONFIG.WARNING_COUNTDOWN_SECONDS}
      enabled={FEATURES.INACTIVITY_TIMEOUT_ENABLED && !!user}
    >
      <div className="flex flex-col h-screen h-[100dvh] bg-gray-900 text-gray-200 font-sans overflow-hidden overscroll-none">
        {/* Top Bar - Full Width */}
        <TopBar
          wallet={wallet}
          portfolioValue={portfolioValue}
          onMobileMenuClick={() => {
            setIsMobileMenuOpen(!isMobileMenuOpen);
            setShowRightPanel(false); // Close right panel when opening left sidebar
          }}
          activeLeague={activeLeague}
          onNavigate={handleNavigate}
          allAssets={allAssets}
          onOpenSettings={() => setShowMyDetails(true)}
          onOpenPortfolio={() => {
            setShowRightPanel(true);
            setIsMobileMenuOpen(false); // Close left sidebar when opening right panel
          }}
          onViewAsset={handleViewAsset}
        />

        {/* AI Analytics Banner */}
        <div className="w-full">
          <AIAnalyticsBanner
            onClick={handleAIAnalyticsClick}
            isActive={activeLeague === "AI_ANALYTICS"}
          />
        </div>

        {/* Main Layout: Sidebar + Content */}
        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            isOpen={isMobileMenuOpen}
            setIsOpen={setIsMobileMenuOpen}
            activeLeague={activeLeague}
            onLeagueChange={handleNavigate}
            allAssets={allAssets}
          />

          {/* Content Container (Main + Right Panel) */}
          <div className="flex-1 flex overflow-hidden">
            {/* Center Content */}
            <div className="flex-1 flex flex-col min-w-0 relative">
              <div
                className={`flex-1 p-4 sm:p-6 md:p-8 scrollbar-hide ${activeLeague === "HOME"
                  ? "overflow-hidden"
                  : "overflow-y-auto"
                  }`}
              >
                <div className="max-w-5xl mx-auto h-full flex flex-col">
                  {currentView === 'asset' && viewAsset ? (
                    <AssetPage
                      asset={viewAsset}
                      onBack={() => {
                        setCurrentView('dashboard');
                        setViewAsset(null);
                      }}
                      onSelectOrder={handleSelectOrder}
                    />
                  ) : activeLeague === "HOME" ? (
                    <HomeDashboard
                      onNavigate={handleNavigate}
                      teams={allAssets}
                      onViewAsset={handleViewAsset}
                    />
                  ) : activeLeague === "AI_ANALYTICS" ? (
                    <React.Suspense
                      fallback={
                        <div className="h-full flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-[#00A651]" />
                        </div>
                      }
                    >
                      <AIAnalyticsPage teams={allAssets} />
                    </React.Suspense>
                  ) : (
                    /* Mobile: Vertical stack (scrollable) | Desktop: Side by side (fixed height) */
                    <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 xl:h-full xl:overflow-hidden">
                      {/* Left Column: Header + Order Book (full width on mobile, 2/3 on desktop) */}
                      <div className="w-full xl:flex-[2] flex flex-col xl:min-h-0">
                        {/* Header aligned with order book */}
                        <div className="flex-shrink-0">
                          <Header
                            title={getLeagueTitle(activeLeague)}
                            market={activeLeague}
                          />
                        </div>

                        {/* Order Book - Fixed height on mobile, flex on desktop */}
                        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-[280px] sm:h-[350px] xl:h-auto xl:flex-1">
                          {/* Fixed Header - Responsive padding and text */}
                          <div className="grid grid-cols-3 gap-2 sm:gap-4 p-2 sm:p-4 bg-gray-800 border-b border-gray-700 text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider text-center flex-shrink-0">
                            <div className="text-left">Asset</div>
                            <div>Sell</div>
                            <div>Buy</div>
                          </div>

                          {/* Scrollable List */}
                          <div className="flex-1 overflow-y-auto scrollbar-hide divide-y divide-gray-700">
                            {sortedTeams.map((team) => (
                              <OrderBookRow
                                key={team.id}
                                team={team}
                                onSelectOrder={handleSelectOrder}
                                onViewAsset={handleViewAsset}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: AI & News (full width on mobile, 1/3 on desktop) */}
                      <div className="w-full xl:flex-1 flex flex-col gap-3 sm:gap-4 xl:overflow-y-auto scrollbar-hide xl:pr-2 mt-2 xl:mt-0">
                        {/* AI Analysis */}
                        <div className="flex-shrink-0">
                          <AIAnalysis
                            teams={teams}
                            leagueName={getLeagueTitle(activeLeague)}
                          />
                        </div>

                        {/* News Feed */}
                        <div className="flex-shrink-0 pb-4 xl:pb-0">
                          <NewsFeed topic={activeLeague as any} />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeLeague !== "HOME" && (
                    <div className="mt-8">
                      <Footer />
                    </div>
                  )}
                </div>
              </div>

              {/* Ticker at the bottom of the center content */}
              {/* Ticker at the bottom of the center content */}
              <Ticker onNavigate={handleNavigate} teams={allAssets} />
            </div>

            {/* Right Panel - Hidden on smaller screens/150% zoom, visible on 2xl+ */}
            {/* Desktop: Always visible at 1280px+ (xl) */}
            <div className="hidden xl:block h-full">
              <RightPanel
                portfolio={portfolio}
                transactions={transactions}
                selectedOrder={selectedOrder}
                onCloseTradeSlip={() => setSelectedOrder(null)}
                onConfirmTrade={handleConfirmTrade}
                allAssets={allAssets}
                onNavigate={handleNavigate}
                onSelectOrder={handleSelectOrder}
                leagueName={
                  selectedOrder && selectedOrder.team.market
                    ? getLeagueTitle(selectedOrder.team.market)
                    : getLeagueTitle(activeLeague)
                }
                walletBalance={wallet?.balance || 0}
              />
            </div>

          </div>
        </div>

        {/* Mobile/Tablet: Slide-out panel (visible below 2xl/1536px) */}
        {/* Moved outside content containers for proper fixed positioning on mobile Safari */}
        <div
          className={`2xl:hidden fixed top-14 lg:top-20 bottom-0 right-0 z-40 transform transition-transform duration-300 ease-in-out h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-5rem)] overflow-hidden ${
            showRightPanel ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <RightPanel
            portfolio={portfolio}
            transactions={transactions}
            selectedOrder={selectedOrder}
            onCloseTradeSlip={() => setSelectedOrder(null)}
            onConfirmTrade={handleConfirmTrade}
            allAssets={allAssets}
            onNavigate={handleNavigate}
            onSelectOrder={handleSelectOrder}
            leagueName={
              selectedOrder && selectedOrder.team.market
                ? getLeagueTitle(selectedOrder.team.market)
                : getLeagueTitle(activeLeague)
            }
            walletBalance={wallet?.balance || 0}
            onClose={() => {
              setShowRightPanel(false);
              setSelectedOrder(null); // Clear order so TradeSlip remounts fresh
            }}
            isMobile={true}
          />
            {/* Mobile/Tablet: Slide-out panel (visible below xl/1280px) */}
            {/* Mobile (<lg): top-14 for h-14 TopBar only (Banner scrolls with content) */}
            {/* Larger (>=lg): top-20 for h-20 TopBar (works on tablet horizontal) */}
            <div
              className={`xl:hidden fixed top-14 lg:top-20 bottom-0 right-0 z-40 transform transition-transform duration-300 ease-in-out h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-5rem)] overflow-hidden ${showRightPanel ? "translate-x-0" : "translate-x-full"
                }`}
            >
              <RightPanel
                portfolio={portfolio}
                transactions={transactions}
                selectedOrder={selectedOrder}
                onCloseTradeSlip={() => setSelectedOrder(null)}
                onConfirmTrade={handleConfirmTrade}
                allAssets={allAssets}
                onNavigate={handleNavigate}
                onSelectOrder={handleSelectOrder}
                leagueName={
                  selectedOrder && selectedOrder.team.market
                    ? getLeagueTitle(selectedOrder.team.market)
                    : getLeagueTitle(activeLeague)
                }
                walletBalance={wallet?.balance || 0}
                onClose={() => {
                  setShowRightPanel(false);
                  setSelectedOrder(null); // Clear order so TradeSlip remounts fresh
                }}
                isMobile={true}
              />
            </div>
          </div>
        </div>

        {/* Overlay for mobile menu */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Overlay for right panel on mobile/tablet */}
        {showRightPanel && (
          <div
            className="fixed inset-0 bg-black/50 z-30 2xl:hidden touch-none"
            className="fixed inset-0 bg-black/50 z-30 xl:hidden"
            onClick={() => {
              setShowRightPanel(false);
              setSelectedOrder(null); // Clear order so TradeSlip remounts fresh
            }}
            onTouchMove={(e) => e.preventDefault()}
          />
        )}

        {/* KYC Modal */}
        {publicUserId && (
          <KYCModal
            isOpen={showKycModal}
            onClose={() => {
              handleKycModalClose();
              setForceKycUpdateMode(false); // Reset force mode when modal closes
            }}
            userId={publicUserId}
            onKycComplete={handleKycComplete}
            initialStatus={kycStatus || undefined}
            forceUpdateMode={forceKycUpdateMode}
          />
        )}

        {/* My Details Page - Full Screen Overlay */}
        {showMyDetails && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <MyDetailsPage
              onBack={() => setShowMyDetails(false)}
              userId={publicUserId || undefined}
              userData={
                user
                  ? {
                    name: user.user_metadata?.full_name || "",
                    email: user.email || "",
                    phone: user.user_metadata?.phone || "",
                    whatsapp: user.user_metadata?.whatsapp_phone || "",
                    address: user.user_metadata?.address_line || "",
                    // address2: user.user_metadata?.address_line_2 || '',
                    city: user.user_metadata?.city || "",
                    state: user.user_metadata?.region || "",
                    country: user.user_metadata?.country || "",
                    postCode: user.user_metadata?.postal_code || "",
                    accountName: "",
                    accountNumber: "",
                    iban: "",
                    swiftBic: "",
                    bankName: "",
                  }
                  : undefined
              }
              onSignOut={async () => {
                setShowMyDetails(false);
                await signOut();
              }}
              onOpenKYCModal={() => {
                setShowMyDetails(false);
                // Set force update mode when coming from My Details page
                // This allows approved users to update their documents
                setForceKycUpdateMode(true);
                setShowKycModal(true);
              }}
            />
          </div>
        )}

        {/* Access Denied Modal (AI Analytics) */}
        <AccessDeniedModal
          isOpen={showAccessDeniedModal}
          onClose={() => setShowAccessDeniedModal(false)}
          onViewMarket={() => {
            setActiveLeague("EPL"); // Navigate to a market (e.g. EPL) so they can buy tokens
            setShowAccessDeniedModal(false);
          }}
        />

        <SellErrorModal
          isOpen={showSellErrorModal}
          onClose={() => setShowSellErrorModal(false)}
          assetName={sellErrorAssetName}
        />

        <AlertModal
          isOpen={alertOpen}
          onClose={() => setAlertOpen(false)}
          message={alertMessage}
        />

        {/* AI Chatbot - Fixed position bottom right */}
        <ChatBot />
      </div>
    </InactivityHandler>
  );
};

export default App;
