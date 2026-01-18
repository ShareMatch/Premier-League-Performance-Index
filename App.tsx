import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from "react-router-dom";
import { Team, Order, Wallet, Position, Transaction, League } from "./types";
import { supabase } from "./lib/supabase";
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
  () => import("./components/AIAnalyticsPage"),
);
const AllMarketsPage = React.lazy(() => import("./components/AllMarketsPage"));
const NewMarketsPage = React.lazy(() => import("./components/NewMarketsPage"));
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
  fetchSeasonDates,
  SeasonDates,
} from "./lib/api";
import { getLogoUrl } from "./lib/logoHelper";
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
import DidYouKnow from "./components/DidYouKnow";
import OnThisDay from "./components/OnThisDay";
import HelpCenterModal from "./components/HelpCenterModal";

const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeLeague, setActiveLeague] = useState<League>("HOME");
  const [previousLeague, setPreviousLeague] = useState<League>("HOME");
  const [allAssets, setAllAssets] = useState<Team[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

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

  // Season dates from market_index_seasons table (for InfoPopup)
  const [seasonDatesMap, setSeasonDatesMap] = useState<
    Map<string, SeasonDates>
  >(new Map());

  // Lock body scroll when mobile panel is open (prevents iOS Safari scroll issues)
  useEffect(() => {
    if (showRightPanel) {
      // Lock scroll on body
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      // Restore scroll
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    return () => {
      // Cleanup on unmount
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
    };
  }, [showRightPanel]);


  // Help Center Modal visibility
  const [showHelpCenter, setShowHelpCenter] = useState(false);

  // Triggers for opening auth modals from HelpCenterModal (passed to TopBar)
  const [triggerLoginModal, setTriggerLoginModal] = useState(false);
  const [triggerSignUpModal, setTriggerSignUpModal] = useState(false);

  // Handle browser back/forward buttons
  useEffect(() => {
    // Sync activeLeague with URL
    const path = location.pathname;
    if (path === "/") setActiveLeague("HOME");
    else if (path === "/markets") setActiveLeague("ALL_MARKETS");
    else if (path === "/new-markets") setActiveLeague("NEW_MARKETS");
    else if (path === "/ai-analytics") setActiveLeague("AI_ANALYTICS");
    else if (path.startsWith("/market/")) {
      const league = path.split("/")[2] as League;
      setActiveLeague(league);
    } else if (path.startsWith("/asset/")) {
      const slug = path.split("/")[2];
      const asset = allAssets.find(a => a.name.toLowerCase().replace(/\s+/g, '-') === slug);
      if (asset?.market) {
        setActiveLeague(asset.market as League);
      }
    }
  }, [location.pathname, allAssets]);

  const handleAIAnalyticsClick = () => {
    // Check if user has any assets in portfolio
    if (!portfolio || portfolio.length === 0) {
      setShowAccessDeniedModal(true);
      return;
    }
    navigate("/ai-analytics");
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
      // Fetch static asset data, active trading data, settled assets, and season dates in parallel
      const [staticAssets, tradingAssets, settledAssets, seasonDates] =
        await Promise.all([
          fetchAssets(),
          fetchTradingAssets(),
          fetchSettledAssets(),
          fetchSeasonDates(),
        ]);

      // Store season dates for use in Header/InfoPopup
      setSeasonDatesMap(seasonDates);

      // Create a map of static assets by ID for quick lookup
      const assetMap = new Map(staticAssets.map((asset) => [asset.id, asset]));

      // Combine active and settled trading assets
      const allTradingAssets = [...tradingAssets, ...settledAssets];

      // Map trading assets to Team interface with merged data
      const mappedAssets: Team[] = allTradingAssets
        .map((ta: any) => {
          const staticAsset = assetMap.get(ta.asset_id);
          if (!staticAsset) {
            console.warn(
              `Missing static asset data for asset_id: ${ta.asset_id}`,
              ta,
            );
            return null;
          }

          // Determine market from the hierarchy
          const marketGroup =
            ta.market_index_seasons.market_indexes.markets.market_sub_groups
              .market_groups.name;
          const marketSubGroup =
            ta.market_index_seasons.market_indexes.markets.market_sub_groups
              .name;
          const marketToken =
            ta.market_index_seasons.market_indexes.markets.market_token;

          // Map to legacy market names used in the app
          let market: string;
          if (marketToken) {
            market = marketToken;
          } else {
            // Fallback mapping based on names
            const marketName =
              ta.market_index_seasons.market_indexes.markets.name;
            switch (marketName) {
              case "England Premier League":
                market = "EPL";
                break;
              case "UEFA Champions League":
                market = "UCL";
                break;
              case "FIFA World Cup":
                market = "WC";
                break;
              case "Saudi Pro League":
                market = "SPL";
                break;
              case "Indonesia Super League":
                market = "ISL";
                break;
              case "Formula 1":
                market = "F1";
                break;
              case "NBA":
                market = "NBA";
                break;
              case "NFL":
                market = "NFL";
                break;
              case "T20 World Cup":
                market = "T20";
                break;
              case "Eurovision":
                market = "Eurovision";
                break;
              default:
                market = "HOME";
                break;
            }
          }

          // Map category based on market sub-group or market name
          let category:
            | "football"
            | "f1"
            | "basketball"
            | "american_football"
            | "cricket"
            | "global_events"
            | "other";
          switch (marketSubGroup) {
            case "Football":
              category = "football";
              break;
            case "Motorsport":
              category = "f1";
              break;
            case "Basketball":
              category = "basketball";
              break;
            case "American Football":
              category = "american_football";
              break;
            case "Cricket":
              category = "cricket";
              break;
            case "Eurovision":
              category = "global_events";
              break;
            default:
              category = "other";
              break;
          }

          return {
            id: ta.id, // Use trading asset ID as the primary ID
            asset_id: ta.asset_id, // Keep reference to static asset
            name: staticAsset.name,
            team: staticAsset.team,
            bid: Number(ta.sell), // Sell price is bid
            offer: Number(ta.buy), // Buy price is offer
            lastChange: "none" as const, // TODO: Calculate from price history
            color: staticAsset.color,
            logo_url:
              getLogoUrl(staticAsset.name, category, ta.id) ||
              staticAsset.logo_url,
            category: category,
            market: market,
            market_trading_asset_id: ta.id,
            is_settled: ta.market_index_seasons.is_settled,
            settled_date: ta.market_index_seasons.settled_at
              ? new Date(ta.market_index_seasons.settled_at).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", year: "numeric" },
              )
              : undefined,
            // Additional fields for richer data
            market_group: marketGroup,
            market_sub_group: marketSubGroup,
            index_name: ta.market_index_seasons.market_indexes.name,
            index_token: ta.market_index_seasons.market_indexes.token,
            season_status: ta.market_index_seasons.status,
            season_start_date: ta.market_index_seasons.start_date,
            season_end_date: ta.market_index_seasons.end_date,
            season_stage: ta.market_index_seasons.stage,
            units: Number(ta.units),
          };
        })
        .filter(Boolean) as Team[];
      setAllAssets(mappedAssets);
    } catch (error) {
      console.error("Error loading assets:", error);
    }
  }, []);

  // Load public user ID when auth user changes
  useEffect(() => {
    if (user) {
      // Pass both auth_user_id and email for better fallback support
      getPublicUserId(user.id, user.email).then((userId) => {
        if (userId) {
          setPublicUserId(userId);
        } else {
          // No user record found or session invalid - this indicates incomplete registration or session issue
          // Sign out the user for security
          supabase.auth.signOut().catch(err => console.error('Error signing out:', err));
          // Don't show alert during automatic sign-out to avoid spam
          setPublicUserId(null);
          setKycStatus(null);
          setKycChecked(false);
        }
      }).catch((error) => {
        console.error('Error checking user registration:', error);
        // If there's an error checking, sign out to be safe
        supabase.auth.signOut().catch(err => console.error('Error signing out:', err));
        setPublicUserId(null);
        setKycStatus(null);
        setKycChecked(false);
      });
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
    setKycStatus(status);
    // DON'T auto-close - user will click X when they're ready
    // The modal will be hidden next time they open the app if approved
  };

  const handleViewAsset = (asset: Team) => {
    setSelectedOrder(null); // Close trade slip when viewing an asset page
    setPreviousLeague(activeLeague);

    const slug = asset.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/asset/${slug}`);

    // Sync sidebar active league with the asset's market if available
    if (asset.market) {
      setActiveLeague(asset.market as League);
    }
    // Save to recently viewed
    import("./utils/recentlyViewed").then(({ saveRecentlyViewed }) => {
      saveRecentlyViewed(asset);
    });

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

    // Set up Real-Time Subscriptions - only when we have authenticated user and public user ID
    if (!user || !publicUserId) {
      return; // Don't set up subscriptions if not authenticated
    }

    const walletSubscription = subscribeToWallet(
      publicUserId,
      (updatedWallet) => {
        // Guard: only update if user is still logged in (check refs for current state)
        if (userRef.current && publicUserIdRef.current) {
          setWallet(updatedWallet);
        }
      },
    );

    const portfolioSubscription = subscribeToPortfolio(publicUserId, () => {
      // Guard: only update if user is still logged in (check refs for current state)
      if (userRef.current && publicUserIdRef.current) {
        fetchPortfolio(publicUserIdRef.current).then(setPortfolio).catch((error) => {
          console.error('Error updating portfolio via subscription:', error);
        });
      }
    });

    const assetsSubscription = subscribeToAssets(() => {
      loadAssets().catch((error) => {
        console.error('Error updating assets via subscription:', error);
      });
    });

    const tradingAssetsSubscription = subscribeToTradingAssets(() => {
      loadAssets().catch((error) => {
        console.error('Error updating trading assets via subscription:', error);
      });
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
  }, [activeLeague, allAssets]);

  // Close TradeSlip when league changes
  // useEffect logic moved to handleNavigate to prevent conflict with Portfolio click
  // useEffect(() => {
  //   setSelectedOrder(null);
  // }, [activeLeague]);

  const handleNavigate = (league: League) => {
    setIsMobileMenuOpen(false);

    // Explicitly close trade slip when navigating
    if (activeLeague !== league) {
      setSelectedOrder(null);
    }

    if (league === "AI_ANALYTICS") {
      if (!user) {
        setAlertMessage("Please login to access the AI Analytics Engine.");
        setAlertOpen(true);
        return;
      }
      if (!portfolio || portfolio.length === 0) {
        setAlertMessage(
          "Exclusive Access: The AI Analytics Engine is available only to token holders.",
        );
        setAlertOpen(true);
        return;
      }
      navigate("/ai-analytics");
      return;
    }

    if (league === "MY_DETAILS") {
      navigate("/my-details");
      return;
    }

    if (league === "HOME") {
      navigate("/");
    } else if (league === "ALL_MARKETS") {
      navigate("/markets");
    } else if (league === "NEW_MARKETS") {
      navigate("/new-markets");
    } else {
      navigate(`/market/${league}`);
    }

    setActiveLeague(league);
  };

  const handleSelectOrder = (team: Team, type: "buy" | "sell") => {
    // Prevent trading on settled/closed markets
    if (team.is_settled) {
      return;
    }

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
      const position = portfolio.find(
        (p) => p.market_trading_asset_id === team.market_trading_asset_id,
      );
      maxQuantity = position ? Number(position.quantity) : 0;

      // Validation: Cannot sell if not owned
      if (maxQuantity <= 0) {
        setSellErrorAssetName(team.name);
        setShowSellErrorModal(true);
        return;
      }
    }

    const holdingValue = type === "sell" ? maxQuantity : 0;

    const orderObject = {
      team,
      type,
      price: type === "buy" ? team.offer : team.bid,
      quantity: 0, // Default to 0, let user input
      maxQuantity,
      holding: holdingValue, // Current holdings for sell orders
    };

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
        quantity,
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
    return getLeagueTitleUtil(id);
  };

  // Calculate total portfolio value
  const portfolioValue = React.useMemo(() => {
    return portfolio.reduce((total, position) => {
      // Find current asset data to get price
      const asset = allAssets.find(
        (a) => a.market_trading_asset_id === position.market_trading_asset_id,
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
      <div
        data-testid="app-container"
        className="flex flex-col h-screen h-[100dvh] bg-gray-900 text-gray-200 font-sans overflow-hidden overscroll-none"
      >
        <Routes>
          {/* Standalone Pages (Full Screen, No Layout) */}
          <Route
            path="/my-details"
            element={
              loading ? (
                <div className="h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-primary mb-4" />
                  <p className="text-gray-400 font-sans">Verifying session...</p>
                </div>
              ) : user ? (
                <MyDetailsPage
                  onBack={() => navigate(-1)}
                  userId={publicUserId || undefined}
                  userData={
                    user
                      ? {
                        name: user.user_metadata?.full_name || "",
                        email: user.email || "",
                        phone: user.user_metadata?.phone || "",
                        whatsapp: user.user_metadata?.whatsapp_phone || "",
                        address: user.user_metadata?.address_line || "",
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
                    await signOut();
                    navigate("/");
                  }}
                  onOpenKYCModal={() => {
                    setForceKycUpdateMode(true);
                    setShowKycModal(true);
                  }}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Main Dashboard Layout Pages */}
          <Route
            path="*"
            element={
              <div className="flex flex-col h-full overflow-hidden">
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
                  onOpenSettings={() => handleNavigate("MY_DETAILS")}
                  onOpenPortfolio={() => {
                    setShowRightPanel(true);
                    setIsMobileMenuOpen(false); // Close left sidebar when opening right panel
                  }}
                  onViewAsset={handleViewAsset}
                  triggerLoginModal={triggerLoginModal}
                  onTriggerLoginHandled={() => setTriggerLoginModal(false)}
                  triggerSignUpModal={triggerSignUpModal}
                  onTriggerSignUpHandled={() => setTriggerSignUpModal(false)}
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
                    onHelpCenterClick={() => setShowHelpCenter(true)}
                  />

                  {/* Content Container (Main + Right Panel) */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Center Content */}
                    <div className="flex-1 flex flex-col min-w-0 relative">
                      <div className="flex-1 p-4 sm:p-6 md:p-8 scrollbar-hide overflow-y-auto">
                        <div className="max-w-5xl mx-auto flex flex-col min-h-full">
                          {/* Main content wrapper - grows to fill space */}
                          <div className="flex-1">
                            <Routes>
                              <Route
                                path="/"
                                element={
                                  <HomeDashboard
                                    onNavigate={handleNavigate}
                                    teams={allAssets}
                                    onViewAsset={handleViewAsset}
                                    onSelectOrder={handleSelectOrder}
                                    seasonDatesMap={seasonDatesMap}
                                  />
                                }
                              />
                              <Route
                                path="/markets"
                                element={
                                  <React.Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-primary" /></div>}>
                                    <AllMarketsPage
                                      teams={allAssets}
                                      onNavigate={handleNavigate}
                                      onViewAsset={handleViewAsset}
                                      onSelectOrder={handleSelectOrder}
                                    />
                                  </React.Suspense>
                                }
                              />
                              <Route
                                path="/new-markets"
                                element={
                                  <React.Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-primary" /></div>}>
                                    <NewMarketsPage
                                      teams={allAssets}
                                      onNavigate={handleNavigate}
                                      onViewAsset={handleViewAsset}
                                      onSelectOrder={handleSelectOrder}
                                      seasonDatesMap={seasonDatesMap}
                                    />
                                  </React.Suspense>
                                }
                              />
                              <Route
                                path="/ai-analytics"
                                element={
                                  <React.Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#00A651]" /></div>}>
                                    <AIAnalyticsPage teams={allAssets} />
                                  </React.Suspense>
                                }
                              />
                              <Route
                                path="/asset/:name"
                                element={<AssetRouteWrapper allAssets={allAssets} handleSelectOrder={handleSelectOrder} handleNavigate={handleNavigate} previousLeague={previousLeague} />}
                              />
                              <Route
                                path="/market/:leagueId"
                                element={<LeagueRouteWrapper teams={teams} activeLeague={activeLeague} seasonDatesMap={seasonDatesMap} sortedTeams={sortedTeams} handleSelectOrder={handleSelectOrder} handleViewAsset={handleViewAsset} loading={loading} />}
                              />
                            </Routes>

                            {activeLeague !== "HOME" && (
                              <div className="mt-8 flex-shrink-0">
                                <Footer />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ticker */}
                      <div className="pt-0 flex-shrink-0 sticky bottom-0 bg-gray-900">
                        <Ticker
                          onNavigate={handleNavigate}
                          onViewAsset={handleViewAsset}
                          teams={allAssets}
                        />
                      </div>
                    </div>

                    {/* Right Panel Desktop */}
                    {user && (
                      <div className="hidden lg:block h-full">
                        <RightPanel
                          portfolio={portfolio}
                          transactions={transactions}
                          selectedOrder={selectedOrder}
                          onCloseTradeSlip={() => setSelectedOrder(null)}
                          onConfirmTrade={handleConfirmTrade}
                          allAssets={allAssets}
                          onNavigate={handleNavigate}
                          onSelectOrder={handleSelectOrder}
                          onViewAsset={handleViewAsset}
                          leagueName={
                            selectedOrder && selectedOrder.team.market
                              ? getLeagueTitle(selectedOrder.team.market)
                              : getLeagueTitle(activeLeague)
                          }
                          walletBalance={wallet?.balance || 0}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel Mobile */}
                {user && (
                  <div
                    className={`lg:hidden fixed top-14 lg:top-20 bottom-0 right-0 z-40 transform transition-transform duration-300 ease-in-out h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-5rem)] overflow-hidden ${showRightPanel ? "translate-x-0" : "translate-x-full"}`}
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
                      onViewAsset={handleViewAsset}
                      leagueName={
                        selectedOrder && selectedOrder.team.market
                          ? getLeagueTitle(selectedOrder.team.market)
                          : getLeagueTitle(activeLeague)
                      }
                      walletBalance={wallet?.balance || 0}
                      onClose={() => {
                        setShowRightPanel(false);
                        setSelectedOrder(null);
                      }}
                      isMobile={true}
                    />
                  </div>
                )}
              </div>
            }
          />
        </Routes>

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
            className="fixed inset-0 bg-black/50 z-30 lg:hidden touch-none"
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

        {/* Help Center Modal */}
        <HelpCenterModal
          isOpen={showHelpCenter}
          onClose={() => setShowHelpCenter(false)}
          isLoggedIn={!!user}
          onOpenLogin={() => {
            setShowHelpCenter(false);
            setTriggerLoginModal(true);
          }}
          onOpenSignUp={() => {
            setShowHelpCenter(false);
            setTriggerSignUpModal(true);
          }}
          onOpenKYC={() => {
            setShowHelpCenter(false);
            setShowKycModal(true);
          }}
        />
      </div>
    </InactivityHandler>
  );
};

const getLeagueTitleUtil = (id: string) => {
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
    case "ALL_MARKETS":
      return "All Markets";
    case "NEW_MARKETS":
      return "New Markets";
    default:
      return "ShareMatch Pro";
  }
};

const AssetRouteWrapper: React.FC<{
  allAssets: Team[];
  handleSelectOrder: (team: Team, type: "buy" | "sell") => void;
  handleNavigate: (league: League) => void;
  previousLeague: League;
}> = ({ allAssets, handleSelectOrder, handleNavigate, previousLeague }) => {
  const { name } = useParams();
  const navigate = useNavigate();
  const asset = useMemo(() => {
    return allAssets.find(a => a.name.toLowerCase().replace(/\s+/g, '-') === name);
  }, [allAssets, name]);

  if (allAssets.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary mb-4" />
        <p className="text-gray-400">Loading asset data...</p>
      </div>
    );
  }

  if (!asset) {
    return <Navigate to="/" replace />;
  }

  return (
    <AssetPage
      asset={asset}
      onBack={() => {
        navigate(-1);
      }}
      onSelectOrder={handleSelectOrder}
    />
  );
};

const LeagueRouteWrapper: React.FC<{
  teams: Team[];
  activeLeague: League;
  seasonDatesMap: Map<string, SeasonDates>;
  sortedTeams: Team[];
  handleSelectOrder: (team: Team, type: "buy" | "sell") => void;
  handleViewAsset: (asset: Team) => void;
  loading: boolean;
}> = ({ teams, activeLeague, seasonDatesMap, sortedTeams, handleSelectOrder, handleViewAsset, loading }) => {
  if (loading && teams.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary mb-4" />
        <p className="text-gray-400">Loading market statistics...</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 xl:items-stretch">
      {/* Left Column: Header + Order Book (full width on mobile/tablet/laptop, 2/3 on desktop xl+) */}
      <div className="w-full xl:flex-[2] flex flex-col">
        {/* Header aligned with order book */}
        <div className="flex-shrink-0">
          <Header
            title={getLeagueTitleUtil(activeLeague)}
            market={activeLeague}
            seasonStartDate={seasonDatesMap.get(activeLeague)?.start_date}
            seasonEndDate={seasonDatesMap.get(activeLeague)?.end_date}
            seasonStage={seasonDatesMap.get(activeLeague)?.stage || undefined}
          />
        </div>

        {/* Order Book - Fixed height on mobile/tablet, flex on laptop+ with min-height */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-64 sm:h-72 md:h-80 xl:h-[36.6rem] 2xl:h-[36rem]">
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

      {/* Right Column: AI & News (full width on mobile/tablet/laptop, 1/3 on desktop xl+) */}
      <div className="w-full xl:flex-1 flex flex-col gap-3 sm:gap-4 xl:overflow-y-auto scrollbar-hide xl:pr-2 mt-2 xl:mt-0">
        {/* AI Analysis */}
        <div className="flex-shrink-0">
          <AIAnalysis
            teams={teams}
            leagueName={getLeagueTitleUtil(activeLeague)}
          />
        </div>

        {/* Did You Know (Index/League Context) */}
        <div className="flex-shrink-0">
          <DidYouKnow
            assetName={getLeagueTitleUtil(activeLeague)}
            market={activeLeague}
          />
        </div>

        {/* On This Day (Index/League Context) */}
        <div className="flex-shrink-0">
          <OnThisDay
            assetName={getLeagueTitleUtil(activeLeague)}
            market={activeLeague}
          />
        </div>

        {/* News Feed */}
        <div className="flex-shrink-0 pb-4 xl:pb-0">
          <NewsFeed topic={activeLeague as any} />
        </div>
      </div>
    </div>
  );
};

export default App;
