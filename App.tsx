import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  useParams,
  Navigate,
} from "react-router-dom";
import { Team, Order, Wallet, Position, Transaction, League } from "./types";
import { supabase } from "./lib/supabase";
import Header from "./components/Header";
import TopBar from "./components/TopBar";
import RightPanel from "./components/RightPanel";
import Ticker from "./components/Ticker";
import { Menu, X, Loader2, HelpCircle, ArrowLeft } from "lucide-react";
import NewsFeed from "./components/NewsFeed";
import HomeDashboard from "./components/HomeDashboard";
import OrderBookRow from "./components/OrderBookRow";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import AIAnalysis from "./components/AIAnalysis";
import OrderConfirmationModal from "./components/OrderConfirmationModal";
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
import HowItWorksModal from "./components/HowItWorksModal";

const AssetRouteWrapper: React.FC<{
  allAssets: Team[];
  handleSelectOrder: (team: Team, type: "buy" | "sell") => void;
  handleNavigate: (league: League) => void;
  previousLeague: League;
}> = ({ allAssets, handleSelectOrder, handleNavigate, previousLeague }) => {
  const { user, loading } = useAuth();
  const { market, name } = useParams();
  const navigate = useNavigate();
  const asset = useMemo(() => {
    // Find asset by both market and name for accurate matching
    return allAssets.find(
      (a) =>
        a.name.toLowerCase().replace(/\s+/g, "-") === name &&
        a.market?.toLowerCase() === market?.toLowerCase(),
    );
  }, [allAssets, name, market]);

  if (loading || (!allAssets || allAssets.length === 0)) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary mb-4" />
        <p className="text-gray-400">Loading asset data...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
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
      onNavigateToIndex={(market) => {
        // Navigate to the index/league page for this market
        handleNavigate(market as League);
      }}
    />
  );
};

const ShortAssetRouteWrapper: React.FC<{
  allAssets: Team[];
  handleSelectOrder: (team: Team, type: "buy" | "sell") => void;
  handleNavigate: (league: League) => void;
}> = ({ allAssets, handleSelectOrder, handleNavigate }) => {
  const { user, loading: authLoading } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const asset = useMemo(() => {
    // Find asset by ID (string comparison)
    return allAssets.find((a) => a.id.toString() === id);
  }, [allAssets, id]);

  useEffect(() => {
    // If not a direct asset ID match, it's likely a short code
    if (allAssets.length > 0 && !asset && id) {
      const resolveShortCode = async () => {
        setResolving(true);
        try {
          // In a real browser, the Edge Function might 301, 
          // but here we can call it and follow or use the result.
          // Since our Edge Function GET /share?code=ABC redirects, 
          // we can just use the mapping logic or update the function to return JSON if requested.

          // Actually, we'll do a direct lookup to keep it fast
          const { data, error: lookupError } = await supabase
            .from("market_index_trading_assets")
            .select(`
              id,
              assets!inner (name),
              market_index_seasons!inner (
                market_indexes!inner (
                  markets!inner (market_token)
                )
              )
            `)
            .eq("short_code", id)
            .maybeSingle();

          if (lookupError || !data) {
            setError("Link not found");
            return;
          }

          const ta = data as any;

          if (!ta) {
            setError("Link details not found");
            return;
          }

          // Supabase joins can sometimes return arrays depending on the schema inference
          const assetObj = Array.isArray(ta.assets) ? ta.assets[0] : ta.assets;
          const season = Array.isArray(ta.market_index_seasons) ? ta.market_index_seasons[0] : ta.market_index_seasons;
          const marketIndex = Array.isArray(season?.market_indexes) ? season.market_indexes[0] : season?.market_indexes;
          const marketObj = Array.isArray(marketIndex?.markets) ? marketIndex.markets[0] : marketIndex?.markets;

          const slug = assetObj?.name?.toLowerCase().replace(/\s+/g, "-");
          const market = marketObj?.market_token;

          if (!slug || !market) {
            setError("Invalid asset data");
            return;
          }

          // Redirect to the canonical asset URL
          navigate(`/asset/${market}/${slug}`, { replace: true });
        } catch (err) {
          console.error("Resolve error:", err);
          setError("Failed to resolve link");
        } finally {
          setResolving(false);
        }
      };
      resolveShortCode();
    }
  }, [allAssets, asset, id, navigate]);

  if (authLoading || allAssets.length === 0 || resolving) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary mb-4" />
        <p className="text-gray-400">{resolving ? "Resolving share link..." : "Loading asset data..."}</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={() => navigate("/")} className="text-brand-primary hover:underline">
          Go to Home
        </button>
      </div>
    );
  }

  if (!asset) {
    // This could be the gap between lookup and navigation
    return null;
  }

  return (
    <AssetPage
      asset={asset}
      onBack={() => navigate(-1)}
      onSelectOrder={handleSelectOrder}
      onNavigateToIndex={(market) => handleNavigate(market as League)}
    />
  );
};

const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeLeague, setActiveLeague] = useState<League>("HOME");
  const [previousLeague, setPreviousLeague] = useState<League>("HOME");
  const [allAssets, setAllAssets] = useState<Team[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  // Supabase State
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [portfolio, setPortfolio] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [publicUserId, setPublicUserId] = useState<string | null>(null);
  const [confirmationData, setConfirmationData] = useState<null | {
    orderId: string;
    assetName: string;
    side: "buy" | "sell";
    units: number;
    pricePerUnit: number;
    totalAmount: number;
  }>(null);

  // Guest Mobile Navigation State
  const [activeHoverMenu, setActiveHoverMenu] = useState<string | null>(null);

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
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Scroll to top on navigation changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

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
  const [showHowItWorks, setShowHowItWorks] = useState(false);

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
      const asset = allAssets.find(
        (a) => a.name.toLowerCase().replace(/\s+/g, "-") === slug,
      );
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
            color: ta.primary_color || staticAsset.color,
            logo_url:
              getLogoUrl(staticAsset.name, category, ta.id) ||
              staticAsset.logo_url,
            category: category,
            market: market,
            market_trading_asset_id: ta.id,
            is_settled: ta.is_settled || ta.market_index_seasons.is_settled,
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
            season_stage: ta.stage || ta.market_index_seasons.stage,
            units: Number(ta.units),
            short_code: ta.short_code,
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
      getPublicUserId(user.id, user.email)
        .then((userId) => {
          if (userId) {
            setPublicUserId(userId);
          } else {
            // No user record found or session invalid - this indicates incomplete registration or session issue
            // Sign out the user for security
            supabase.auth
              .signOut()
              .catch((err) => console.error("Error signing out:", err));
            // Don't show alert during automatic sign-out to avoid spam
            setPublicUserId(null);
            setKycStatus(null);
            setKycChecked(false);
          }
        })
        .catch((error) => {
          console.error("Error checking user registration:", error);
          // If there's an error checking, sign out to be safe
          supabase.auth
            .signOut()
            .catch((err) => console.error("Error signing out:", err));
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
    // Check if user is logged in
    if (!user) {
      setTriggerLoginModal(true);
      return;
    }

    setSelectedOrder(null); // Close trade slip when viewing an asset page
    setPreviousLeague(activeLeague);

    const slug = asset.name.toLowerCase().replace(/\s+/g, "-");
    const market = asset.market?.toLowerCase() || "unknown";
    navigate(`/asset/${market}/${slug}`);

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
        fetchPortfolio(publicUserIdRef.current)
          .then(setPortfolio)
          .catch((error) => {
            console.error("Error updating portfolio via subscription:", error);
          });
      }
    });

    const assetsSubscription = subscribeToAssets(() => {
      loadAssets().catch((error) => {
        console.error("Error updating assets via subscription:", error);
      });
    });

    const tradingAssetsSubscription = subscribeToTradingAssets(() => {
      loadAssets().catch((error) => {
        console.error("Error updating trading assets via subscription:", error);
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

    // Auth Protection for specific submenus and AI Analytics
    if (!user) {
      // List of public leagues/routes
      const publicLeagues: League[] = ["HOME", "ALL_MARKETS", "NEW_MARKETS"];

      if (!publicLeagues.includes(league)) {
        setTriggerLoginModal(true);
        return;
      }
    }

    if (league === "AI_ANALYTICS") {
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

    // Set activeLeague BEFORE navigating to prevent flash of wrong state
    setActiveLeague(league);

    if (league === "HOME") {
      navigate("/");
    } else if (league === "ALL_MARKETS") {
      navigate("/markets");
    } else if (league === "NEW_MARKETS") {
      navigate("/new-markets");
    } else {
      navigate(`/market/${league}`);
    }
  };

  const handleSelectOrder = (team: Team, type: "buy" | "sell") => {
    // Prevent trading on settled/closed markets
    if (team.is_settled) {
      return;
    }

    // Check if user is logged in
    if (!user) {
      setAlertMessage("You need to login to continue");
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
      const team = selectedOrder.team;
      const priceForSide = side === "buy" ? team.offer : team.bid;

      // Execute real trade
      const result = await placeTrade(
        publicUserId,
        team.market_trading_asset_id || team.id,
        side,
        priceForSide,
        quantity,
      );

      // ── SUCCESS PATH ───────────────────────────────────────
      // Prepare confirmation data and show modal IMMEDIATELY
      setConfirmationData({
        orderId: result?.orderId || `ORD-${Date.now()}`, // use real ID if backend returns it
        assetName: team.name,
        side,
        units: quantity,
        pricePerUnit: priceForSide,
        totalAmount:
          side === "buy"
            ? quantity * priceForSide
            : quantity * priceForSide * (1 - 0.05), // adjust if fee logic changes
      });

      // Show confirmation modal immediately
      setShowConfirmationModal(true);

      // Close trade slip
      setSelectedOrder(null);
      setShowRightPanel(false); // especially important on mobile

      // Refresh data in the background (don't wait)
      loadUserData();
    } catch (error: any) {
      console.error("Trade error:", error);
      setAlertMessage(error.message || "Trade failed. Please try again.");
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
                  <p className="text-gray-400 font-sans">
                    Verifying session...
                  </p>
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
                  onHelpCenterClick={() => setShowHelpCenter(true)}
                  activeHoverMenu={activeHoverMenu}
                  setActiveHoverMenu={setActiveHoverMenu}
                />

                {/* AI Analytics Banner */}
                {user && (
                  <div className="w-full">
                    <AIAnalyticsBanner
                      onClick={handleAIAnalyticsClick}
                      isActive={activeLeague === "AI_ANALYTICS"}
                    />
                  </div>
                )}

                {/* Main Layout: Sidebar + Content */}
                <div className="flex-1 flex overflow-hidden">
                  <Sidebar
                    isOpen={isMobileMenuOpen}
                    setIsOpen={setIsMobileMenuOpen}
                    activeLeague={activeLeague}
                    onLeagueChange={handleNavigate}
                    allAssets={allAssets}
                    onHelpCenterClick={() => setShowHelpCenter(true)}
                    onHowItWorksClick={() => setShowHowItWorks(true)}
                    onViewAsset={handleViewAsset}
                    isLoggedIn={!!user}
                  />

                  {/* Content Container (Main + Right Panel) */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Center Content */}
                    <div className="flex-1 flex flex-col min-w-0 relative">
                      <div
                        ref={mainContentRef}
                        className="flex-1 p-4 sm:p-6 md:p-8 scrollbar-hide overflow-y-auto"
                      >
                        {/* Mobile Navigation Row (Below TopBar) - Only for not logged in and ONLY on mobile */}
                        {/* {!user && (
                          <div className="lg:hidden w-full flex items-center justify-center gap-2 px-4 h-5 border-b border-gray-800 shadow-sm flex-shrink-0 mt-0">
                            <button
                              onClick={() => setActiveHoverMenu(activeHoverMenu === "who-we-are" ? null : "who-we-are")}
                              className={`px-3 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider transition-all duration-200 ${activeHoverMenu === "who-we-are"
                                ? "bg-white text-[#005430] shadow-lg"
                                : "text-white/80 bg-white/5"
                                }`}
                            >
                              About Us
                            </button>
                            <button
                              onClick={() => setActiveHoverMenu(activeHoverMenu === "how-it-works" ? null : "how-it-works")}
                              className={`px-3 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider transition-all duration-200 ${activeHoverMenu === "how-it-works"
                                ? "bg-white text-[#005430] shadow-lg"
                                : "text-white/80 bg-white/5"
                                }`}
                            >
                              How it works
                            </button>
                            <button
                              onClick={() => setActiveHoverMenu(activeHoverMenu === "shariah" ? null : "shariah")}
                              className={`px-3 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider transition-all duration-200 ${activeHoverMenu === "shariah"
                                ? "bg-white text-[#005430] shadow-lg"
                                : "text-white/80 bg-white/5"
                                }`}
                            >
                              Shariah
                            </button>
                          </div>
                        )} */}
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
                                  <React.Suspense
                                    fallback={
                                      <div className="space-y-3 p-4">
                                        {/* Skeleton Header */}
                                        <div className="flex items-center gap-3 mb-6">
                                          <div className="w-8 h-8 bg-gray-800 rounded-full animate-pulse" />
                                          <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
                                        </div>
                                        {/* Skeleton List */}
                                        <div className="flex flex-col gap-3">
                                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(
                                            (i) => (
                                              <div
                                                key={i}
                                                className="h-20 bg-gray-800/40 rounded-xl border border-gray-700/50 animate-pulse w-full"
                                              />
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    }
                                  >
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
                                  <React.Suspense
                                    fallback={
                                      <div className="space-y-4 p-4">
                                        {/* Skeleton Header */}
                                        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse mb-6" />
                                        {/* Skeleton Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(
                                            (i) => (
                                              <div
                                                key={i}
                                                className="h-48 bg-gray-800/40 rounded-xl border border-gray-700/50 animate-pulse"
                                              />
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    }
                                  >
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
                                  <React.Suspense
                                    fallback={
                                      <div className="h-full flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-[#00A651]" />
                                      </div>
                                    }
                                  >
                                    <AIAnalyticsPage teams={allAssets} />
                                  </React.Suspense>
                                }
                              />
                              <Route
                                path="/asset/:market/:name"
                                element={
                                  <AssetRouteWrapper
                                    allAssets={allAssets}
                                    handleSelectOrder={handleSelectOrder}
                                    handleNavigate={handleNavigate}
                                    previousLeague={previousLeague}
                                  />
                                }
                              />
                              <Route
                                path="/a/:id"
                                element={
                                  <ShortAssetRouteWrapper
                                    allAssets={allAssets}
                                    handleSelectOrder={handleSelectOrder}
                                    handleNavigate={handleNavigate}
                                  />
                                }
                              />
                              <Route
                                path="/market/:leagueId"
                                element={
                                  <LeagueRouteWrapper
                                    teams={teams}
                                    activeLeague={activeLeague}
                                    seasonDatesMap={seasonDatesMap}
                                    sortedTeams={sortedTeams}
                                    handleSelectOrder={handleSelectOrder}
                                    handleViewAsset={handleViewAsset}
                                    loading={loading}
                                  />
                                }
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

                      {/* Mobile How It Works Bar - Fixed above Ticker */}
                      <div className="md:hidden flex-shrink-0 bg-[#0B1221] px-4 py-2 border-t border-gray-800">
                        <button
                          onClick={() => setShowHowItWorks(true)}
                          className="w-full h-9 flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[0.7rem] font-bold text-emerald-400 hover:bg-emerald-500/20 active:scale-[0.98] transition-all uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>How it works</span>
                        </button>
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

        {confirmationData && (
          <OrderConfirmationModal
            isOpen={showConfirmationModal}
            onClose={() => {
              setShowConfirmationModal(false);
              setConfirmationData(null); // clean up
            }}
            orderId={confirmationData.orderId}
            assetName={confirmationData.assetName}
            side={confirmationData.side}
            units={confirmationData.units}
            pricePerUnit={confirmationData.pricePerUnit}
            totalAmount={confirmationData.totalAmount}
          />
        )}

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

        {/* How It Works Modal */}
        <HowItWorksModal
          isOpen={showHowItWorks}
          onClose={() => setShowHowItWorks(false)}
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


const LeagueRouteWrapper: React.FC<{
  teams: Team[];
  activeLeague: League;
  seasonDatesMap: Map<string, SeasonDates>;
  sortedTeams: Team[];
  handleSelectOrder: (team: Team, type: "buy" | "sell") => void;
  handleViewAsset: (asset: Team) => void;
  loading: boolean;
}> = ({
  teams,
  activeLeague,
  seasonDatesMap,
  sortedTeams,
  handleSelectOrder,
  handleViewAsset,
  loading,
}) => {
    const navigate = useNavigate();
    // Use URL param for the league to prevent flash when navigating away
    const { leagueId } = useParams();
    const displayLeague = (leagueId?.toUpperCase() || activeLeague) as League;

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
              title={getLeagueTitleUtil(displayLeague)}
              market={displayLeague}
              seasonStartDate={seasonDatesMap.get(displayLeague)?.start_date}
              seasonEndDate={seasonDatesMap.get(displayLeague)?.end_date}
              seasonStage={seasonDatesMap.get(displayLeague)?.stage || undefined}
              onBack={() => navigate(-1)}
            />
          </div>

          {/* Order Book - Fixed height on mobile/tablet, flex on laptop+ with min-height */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-64 sm:h-72 md:h-80 xl:h-[36.6rem] 2xl:h-[36rem]">
            {/* Fixed Header - Responsive padding and text */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 p-2 sm:p-4 bg-gray-800 border-b border-gray-700 text-[clamp(0.55rem,1.5vw,0.75rem)] font-medium text-gray-400 uppercase tracking-wider text-center flex-shrink-0">
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
              leagueName={getLeagueTitleUtil(displayLeague)}
            />
          </div>

          {/* Did You Know (Index/League Context) */}
          <div className="flex-shrink-0">
            <DidYouKnow
              assetName={getLeagueTitleUtil(displayLeague)}
              market={displayLeague}
            />
          </div>

          {/* On This Day (Index/League Context) */}
          <div className="flex-shrink-0">
            <OnThisDay
              assetName={getLeagueTitleUtil(displayLeague)}
              market={displayLeague}
            />
          </div>

          {/* News Feed */}
          <div className="flex-shrink-0 pb-4 xl:pb-0">
            <NewsFeed topic={displayLeague as any} />
          </div>
        </div>
      </div>
    );
  };

export default App;
