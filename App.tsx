import React, { useState, useEffect, useCallback } from 'react';
import { Team, Order, Wallet, Position } from './types';
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
import { fetchWallet, fetchPortfolio, placeTrade, subscribeToWallet, subscribeToPortfolio, fetchAssets, subscribeToAssets, getPublicUserId } from './lib/api';
import { useAuth } from './components/auth/AuthProvider';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeLeague, setActiveLeague] = useState<'EPL' | 'UCL' | 'WC' | 'SPL' | 'F1' | 'HOME' | 'AI_ANALYTICS'>('HOME');
  const [allAssets, setAllAssets] = useState<Team[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // Supabase State
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [portfolio, setPortfolio] = useState<Position[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [publicUserId, setPublicUserId] = useState<string | null>(null);

  // Fetch User Data
  const loadUserData = useCallback(async () => {
    if (!user) return;
    try {
      const walletData = await fetchWallet(user.id);
      setWallet(walletData);
      const portfolioData = await fetchPortfolio(user.id);
      setPortfolio(portfolioData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, [user]);

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
        market: a.market
      }));
      setAllAssets(mappedAssets);
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  }, []);

  // Load public user ID when auth user changes
  useEffect(() => {
    if (user) {
      getPublicUserId(user.id).then(setPublicUserId);
    } else {
      setPublicUserId(null);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
    loadAssets();

    // Set up Real-Time Subscriptions - only when we have the public user ID
    if (!user || !publicUserId) return;

    const walletSubscription = subscribeToWallet(publicUserId, (updatedWallet) => {
      setWallet(updatedWallet);
    });

    const portfolioSubscription = subscribeToPortfolio(publicUserId, () => {
      fetchPortfolio(user.id).then(setPortfolio);
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
    setSelectedOrder(null);
  }, [activeLeague, allAssets]);

  const handleNavigate = (league: 'EPL' | 'UCL' | 'WC' | 'SPL' | 'F1' | 'HOME' | 'AI_ANALYTICS') => {
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
    if (!selectedOrder || !wallet || !user) return;

    try {
      const result = await placeTrade(
        user.id,
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

  const getLeagueTitle = () => {
    switch (activeLeague) {
      case 'EPL': return 'Premier League';
      case 'UCL': return 'Champions League';
      case 'WC': return 'World Cup';
      case 'SPL': return 'Saudi Pro League';
      case 'F1': return 'Formula 1';
      case 'HOME': return 'Home Dashboard';
      case 'AI_ANALYTICS': return 'AI Analytics Engine';
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200 font-sans overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-md text-white"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        setIsOpen={setIsMobileMenuOpen}
        activeLeague={activeLeague}
        onLeagueChange={handleNavigate}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <TopBar wallet={wallet} />

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
                  <div className="flex flex-col h-full">
                    {/* Compact Header */}
                    <div className="flex-shrink-0">
                      <Header title={getLeagueTitle()} />
                    </div>

                    {/* Split View Content */}
                    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 overflow-hidden">

                      {/* Left Column: Order Book (2/3) */}
                      <div className="flex-[2] flex flex-col min-h-0">
                        <div className="flex-1 bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
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
                        <AIAnalysis teams={teams} leagueName={getLeagueTitle()} />

                        {/* News Feed */}
                        <div className="flex-shrink-0">
                          <NewsFeed topic={activeLeague as any} />
                        </div>
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
              selectedOrder={selectedOrder}
              onCloseTradeSlip={handleCloseTradeSlip}
              onConfirmTrade={handleConfirmTrade}
              allAssets={allAssets}
              onNavigate={handleNavigate}
              leagueName={getLeagueTitle()}
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
    </div>
  );
};

export default App;