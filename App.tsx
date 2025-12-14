import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Team, Order, Wallet, Position, Transaction, League } from './types';
import Header from './components/Header';
import TopBar from './components/TopBar';
import RightPanel from './components/RightPanel';
import Ticker from './components/Ticker';
import { Menu, X, Loader2 } from 'lucide-react';
import NewsFeed from './components/NewsFeed';
import HomeDashboard from './components/HomeDashboard';
import OrderBookRow from './components/OrderBookRow';
import Sidebar from './components/Sidebar';
import AIAnalysis from './components/AIAnalysis';
import AIAnalyticsPage from './components/AIAnalyticsPage';
import Footer from './components/Footer';
import { fetchWallet, fetchPortfolio, placeTrade, subscribeToWallet, subscribeToPortfolio, fetchAssets, subscribeToAssets, getPublicUserId, fetchTransactions, getKycUserStatus, KycStatus, needsKycVerification } from './lib/api';
import { useAuth } from './components/auth/AuthProvider';
import { seedSportsAssets } from './lib/seedSports';
import KYCModal from './components/kyc/KYCModal';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeLeague, setActiveLeague] = useState<League>('HOME');

  // ... (skipping unchanged lines)




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
  const [kycChecked, setKycChecked] = useState(false);

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
      console.error('Error loading user data:', error);
    }
  }, [publicUserId]);

  // Fetch Assets
  const loadAssets = useCallback(async () => {
    try {
      const assets = await fetchAssets();
      // Map DB fields to Team interface
      const mappedAssets: Team[] = assets.map((a: any) => ({
        id: a.id,
        name: a.name,
        bid: Number(a.bid),
        offer: Number(a.offer),
        lastChange: a.last_change as 'up' | 'down' | 'none',
        color: a.color,
        category: a.category,
        market: a.market,
        is_settled: a.is_settled,
        settled_date: a.settled_date
      }));
      setAllAssets(mappedAssets);
    } catch (error) {
      console.error('Error loading assets:', error);
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
        console.error('Failed to check KYC status:', error);
        // Default to not_started if we can't fetch status
        setKycStatus('not_started');
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
    console.log('KYC status update received:', status);
    setKycStatus(status);
    // DON'T auto-close - user will click X when they're ready
    // The modal will be hidden next time they open the app if approved
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
        console.error('Failed to refresh KYC status:', error);
      }
    }
  };

  useEffect(() => {
    // Always load assets (they're public)
    loadAssets();
    seedSportsAssets(); // Auto-seed if missing

    // Don't load user data or set up subscriptions if user is not logged in
    if (!user || !publicUserId) {
      return;
    }

    // Load user data only when both user and publicUserId exist
    loadUserData();

    // Set up Real-Time Subscriptions - only when we have the public user ID
    const walletSubscription = subscribeToWallet(publicUserId, (updatedWallet) => {
      // Guard: only update if user is still logged in (check refs for current state)
      if (userRef.current && publicUserIdRef.current) {
        setWallet(updatedWallet);
      }
    });

    const portfolioSubscription = subscribeToPortfolio(publicUserId, () => {
      // Guard: only update if user is still logged in (check refs for current state)
      if (userRef.current && publicUserIdRef.current) {
        fetchPortfolio(publicUserIdRef.current).then(setPortfolio);
      }
    });

    const assetsSubscription = subscribeToAssets(() => {
      loadAssets();
    });

    return () => {
      walletSubscription.unsubscribe();
      portfolioSubscription.unsubscribe();
      assetsSubscription.unsubscribe();
    };
  }, [loadUserData, loadAssets, user, publicUserId]);

  // Filter teams when league changes or assets update
  useEffect(() => {
    if (activeLeague === 'HOME') {
      setTeams([]);
    } else {
      const filtered = allAssets.filter((a: any) => a.market === activeLeague);
      setTeams(filtered);
    }
    // Trade slip persisted on navigation
  }, [activeLeague, allAssets]);

  const handleNavigate = (league: League) => {
    if (league === 'AI_ANALYTICS') {
      if (!user) {
        alert("Please login to access the AI Analytics Engine.");
        return;
      }
      if (!portfolio || portfolio.length === 0) {
        alert("Exclusive Access: The AI Analytics Engine is available only to token holders.");
        return;
      }
    }
    setActiveLeague(league);
  };

  const handleSelectOrder = (team: Team, type: 'buy' | 'sell') => {
    // Check if user is logged in
    if (!user) {
      alert('Please login to trade.');
      return;
    }

    // Check if KYC is required
    if (kycStatus && needsKycVerification(kycStatus)) {
      setShowKycModal(true);
      return;
    }

    // Calculate max quantity based on available funds (for buy) or portfolio holdings (for sell)
    let maxQuantity = 0;

    if (type === 'buy' && wallet) {
      maxQuantity = Math.floor(wallet.available_cents / 100 / team.offer);
    } else if (type === 'sell') {
      const position = portfolio.find(p => p.asset_id === team.id.toString());
      maxQuantity = position ? Number(position.quantity) : 0;

      // Validation: Cannot sell if not owned
      if (maxQuantity <= 0) {
        alert(`You cannot sell ${team.name} because you do not own any shares.`);
        return;
      }
    }

    setSelectedOrder({
      team,
      type,
      price: type === 'buy' ? team.offer : team.bid,
      quantity: 0, // Default to 0, let user input
      maxQuantity
    });
  };

  const handleConfirmTrade = async (quantity: number) => {
    if (!selectedOrder || !wallet || !publicUserId) return;

    try {
      const result = await placeTrade(
        publicUserId,
        selectedOrder.team.id.toString(),
        selectedOrder.team.name,
        selectedOrder.type,
        selectedOrder.price,
        quantity
      );

      // Refresh portfolio and wallet after trade
      await loadUserData();
      setSelectedOrder(null);
    } catch (error) {
      alert('Trade failed. Please try again.');
    }
  };

  const handleCloseTradeSlip = () => {
    setSelectedOrder(null);
  };

  const sortedTeams = [...teams].sort((a, b) => b.offer - a.offer);

  const getLeagueTitle = (id: string = activeLeague) => {
    switch (id) {
      case 'EPL': return 'Premier League';
      case 'UCL': return 'Champions League';
      case 'WC': return 'World Cup';
      case 'SPL': return 'Saudi Pro League';
      case 'F1': return 'Formula 1 Drivers Performance Index';
      case 'NBA': return 'NBA';
      case 'NFL': return 'NFL';
      case 'T20': return 'T20 World Cup';
      case 'Eurovision': return 'Eurovision Song Contest';
      case 'HOME': return 'Home Dashboard';
      case 'AI_ANALYTICS': return 'AI Analytics Engine';
      default: return 'ShareMatch Pro';
    }
  };




  // Calculate total portfolio value
  const portfolioValue = React.useMemo(() => {
    return portfolio.reduce((total, position) => {
      // Find current asset data to get price
      const asset = allAssets.find(a => a.id.toString() === position.asset_id);
      // Value at bid price (like Portfolio component)
      const price = asset ? asset.bid : 0;
      return total + (position.quantity * price);
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
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200 font-sans overflow-hidden">
      {/* Top Bar - Full Width */}
      <TopBar
        wallet={wallet}
        portfolioValue={portfolioValue}
        onMobileMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        activeLeague={activeLeague}
        onNavigate={handleNavigate}
        allAssets={allAssets}
      />

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
            <div className={`flex-1 p-4 sm:p-6 md:p-8 custom-scrollbar ${activeLeague === 'HOME' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
              <div className="max-w-5xl mx-auto h-full flex flex-col">

                {activeLeague === 'HOME' ? (
                  <HomeDashboard
                    onNavigate={handleNavigate}
                    teams={allAssets}
                  />
                ) : activeLeague === 'AI_ANALYTICS' ? (
                  <AIAnalyticsPage teams={allAssets} />
                ) : (
                  <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">

                    {/* Left Column: Header + Order Book (2/3) */}
                    <div className="flex-[2] flex flex-col min-h-0">
                      {/* Header aligned with order book */}
                      <div className="flex-shrink-0">
                        <Header title={getLeagueTitle(activeLeague)} market={activeLeague} />
                      </div>

                      {/* Order Book */}
                      <div className="flex-1 bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col min-h-0">
                        {/* Fixed Header */}
                        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800 border-b border-gray-700 text-xs font-medium text-gray-400 uppercase tracking-wider text-center flex-shrink-0">
                          <div className="text-left">Asset</div>
                          <div>Sell</div>
                          <div>Buy</div>
                        </div>

                        {/* Scrollable List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-700">
                          {sortedTeams.map((team) => (
                            <OrderBookRow
                              key={team.id}
                              team={team}
                              onSelectOrder={handleSelectOrder}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: AI & News (1/3) */}
                    <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
                      {/* AI Analysis */}
                      <div className="flex-shrink-0">
                        <AIAnalysis teams={teams} leagueName={getLeagueTitle(activeLeague)} />
                      </div>

                      {/* News Feed */}
                      <div className="flex-shrink-0">
                        <NewsFeed topic={activeLeague as any} />
                      </div>
                    </div>

                  </div>
                )}

                {activeLeague !== 'HOME' && (
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

          {/* Right Panel - Hidden on mobile, visible on desktop */}
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
              leagueName={selectedOrder && selectedOrder.team.market ? getLeagueTitle(selectedOrder.team.market) : getLeagueTitle(activeLeague)}
            />
          </div>

        </div>
      </div>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* KYC Modal */}
      {publicUserId && (
        <KYCModal
          isOpen={showKycModal}
          onClose={handleKycModalClose}
          userId={publicUserId}
          onKycComplete={handleKycComplete}
          initialStatus={kycStatus || undefined}
        />
      )}
    </div>
  );
};

export default App;