import React, { useState, useEffect, useCallback } from 'react';
import { Team, Order, Wallet, Position } from './types';
import Header from './components/Header';
import OrderBook from './components/OrderBook';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import AIAnalysis from './components/AIAnalysis';
import TopBar from './components/TopBar';
import RightPanel from './components/RightPanel';
import Ticker from './components/Ticker';
import { Menu, X } from 'lucide-react';
import { EPL_TEAMS, UCL_TEAMS, WC_TEAMS, SPL_TEAMS, F1_TEAMS } from './data/marketData';
import NewsFeed from './components/NewsFeed';
import HomeDashboard from './components/HomeDashboard';
import { fetchWallet, fetchPortfolio, placeTrade, TEST_USER_ID } from './lib/api';

const App: React.FC = () => {
  const [activeLeague, setActiveLeague] = useState<'EPL' | 'UCL' | 'WC' | 'SPL' | 'F1' | 'HOME'>('HOME');
  const [teams, setTeams] = useState<Team[]>(EPL_TEAMS);

  // Supabase State
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [portfolio, setPortfolio] = useState<Position[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch User Data
  const loadUserData = useCallback(async () => {
    try {
      const walletData = await fetchWallet(TEST_USER_ID);
      setWallet(walletData);
      const portfolioData = await fetchPortfolio(TEST_USER_ID);
      setPortfolio(portfolioData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Reset teams when league changes
  useEffect(() => {
    switch (activeLeague) {
      case 'EPL': setTeams(EPL_TEAMS); break;
      case 'UCL': setTeams(UCL_TEAMS); break;
      case 'WC': setTeams(WC_TEAMS); break;
      case 'SPL': setTeams(SPL_TEAMS); break;
      case 'F1': setTeams(F1_TEAMS); break;
      case 'HOME': setTeams(EPL_TEAMS); break;
    }
    setSelectedOrder(null);
  }, [activeLeague]);

  const simulatePriceChange = useCallback(() => {
    setTeams(currentTeams => {
      // Only simulate price changes for the top 5 teams
      const teamIndex = Math.floor(Math.random() * 5);

      const change = (Math.random() * 0.4 - 0.2); // Slightly increased volatility for top teams
      const updatedTeams = currentTeams.map((team, index): Team => {
        if (index === teamIndex) {
          const direction: 'up' | 'down' = change > 0 ? 'up' : 'down';

          let newBid = parseFloat((team.bid + change).toFixed(1));
          let newOffer = parseFloat((team.offer + change).toFixed(1));

          // Ensure bid and offer don't go below 0.1 and bid is less than offer
          if (newBid < 0.1) newBid = 0.1;
          if (newOffer < newBid + 0.2) newOffer = parseFloat((newBid + 0.2).toFixed(1));

          return {
            ...team,
            bid: newBid,
            offer: newOffer,
            lastChange: direction
          };
        }
        return { ...team, lastChange: 'none' };
      });

      const teamToUpdate = updatedTeams[teamIndex];

      // If the selected order's team has updated, update the order as well
      if (selectedOrder && selectedOrder.team.id === teamToUpdate.id) {
        const price = selectedOrder.type === 'buy' ? teamToUpdate.offer : teamToUpdate.bid;
        setSelectedOrder(currentOrder => currentOrder ? ({ ...currentOrder, team: teamToUpdate, price }) : null);
      }

      return updatedTeams;
    });
  }, [selectedOrder]);

  useEffect(() => {
    const interval = setInterval(simulatePriceChange, 1500);
    return () => clearInterval(interval);
  }, [simulatePriceChange]);

  const handleSelectOrder = (team: Team, type: 'buy' | 'sell') => {
    if (type === 'sell') {
      // Check holding in portfolio
      const holding = portfolio.find(p => p.asset_id === team.id.toString())?.quantity || 0;
      if (holding <= 0) {
        alert(`You cannot sell ${team.name} because you do not own any shares.`);
        return;
      }
      const price = team.bid;
      setSelectedOrder({ team, type, price, holding });
    } else {
      const price = team.offer;
      setSelectedOrder({ team, type, price });
    }
  };

  const handleCloseTradeSlip = () => {
    setSelectedOrder(null);
  };

  const handleConfirmTrade = async (quantity: number) => {
    if (!selectedOrder) return;

    try {
      await placeTrade(
        TEST_USER_ID,
        selectedOrder.team.id.toString(),
        selectedOrder.team.name,
        selectedOrder.type,
        selectedOrder.price,
        quantity
      );

      // Refresh data
      await loadUserData();

      // Close slip is handled by TradeSlip calling onClose after confirm
    } catch (error) {
      console.error('Trade failed:', error);
      throw error; // Re-throw for TradeSlip to handle
    }
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
    }
  };

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
        onLeagueChange={setActiveLeague}
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
                  <HomeDashboard onNavigate={setActiveLeague} />
                ) : (
                  <>
                    <div className="flex-shrink-0 space-y-6 mb-6">
                      <Header title={getLeagueTitle()} />
                      <AIAnalysis teams={teams} leagueName={getLeagueTitle()} />
                    </div>

                    <main className="flex-1 min-h-0 flex flex-col gap-6">
                      <OrderBook teams={sortedTeams} onSelectOrder={handleSelectOrder} />

                      {activeLeague === 'F1' && (
                        <div className="flex-shrink-0">
                          <NewsFeed topic="F1" />
                        </div>
                      )}
                    </main>
                  </>
                )}

                {activeLeague !== 'HOME' && (
                  <div className="mt-8">
                    <Footer />
                  </div>
                )}
              </div>
            </div>

            {/* Ticker at the bottom of the center content */}
            <Ticker onNavigate={setActiveLeague} />
          </div>

          {/* Right Panel - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:block h-full">
            <RightPanel
              portfolio={portfolio}
              selectedOrder={selectedOrder}
              onCloseTradeSlip={handleCloseTradeSlip}
              onConfirmTrade={handleConfirmTrade}
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