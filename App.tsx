import React, { useState, useEffect, useCallback } from 'react';
import type { Team, Order } from './types';
import Header from './components/Header';
import OrderBook from './components/OrderBook';
import Footer from './components/Footer';
import TradeSlip from './components/TradeSlip';
import Sidebar from './components/Sidebar';
import AIAnalysis from './components/AIAnalysis';
import TopBar from './components/TopBar';
import { Menu, X } from 'lucide-react';

const INITIAL_TEAMS: Team[] = [
  { id: 1, name: 'Arsenal', bid: 54.3, offer: 54.6, lastChange: 'none' },
  { id: 2, name: 'Man City', bid: 29.0, offer: 29.4, lastChange: 'none' },
  { id: 3, name: 'Liverpool', bid: 7.7, offer: 8.0, lastChange: 'none' },
  { id: 4, name: 'Chelsea', bid: 4.0, offer: 4.3, lastChange: 'none' },
  { id: 5, name: 'Man Utd', bid: 2.4, offer: 2.5, lastChange: 'none' },
  { id: 6, name: 'Tottenham', bid: 0.1, offer: 0.2, lastChange: 'none' },
  { id: 7, name: 'Sunderland', bid: 0.1, offer: 0.2, lastChange: 'none' },
  { id: 8, name: 'Bournemouth', bid: 0.1, offer: 0.2, lastChange: 'none' },
  { id: 9, name: 'Crystal Palace', bid: 0.1, offer: 0.2, lastChange: 'none' },
  { id: 10, name: 'Newcastle', bid: 0.1, offer: 0.2, lastChange: 'none' },
  { id: 11, name: 'Brighton', bid: 0.1, offer: 0.2, lastChange: 'none' },
  { id: 12, name: 'Aston Villa', bid: 0.1, offer: 0.2, lastChange: 'none' },
  { id: 13, name: 'Nottm Forest', bid: 0.1, offer: 0.2, lastChange: 'none' },
  { id: 14, name: 'Everton', bid: 0.1, offer: 0.2, lastChange: 'none' },
  { id: 15, name: 'West Ham', bid: 0.1, offer: 0.2, lastChange: 'none' },
  { id: 16, name: 'Fulham', bid: 0.1, offer: 0.2, lastChange: 'none' },
  { id: 17, name: 'Wolves', bid: 0.1, offer: 0.2, lastChange: 'none' },
  { id: 18, name: 'Brentford', bid: 0.1, offer: 0.2, lastChange: 'none' },
  { id: 19, name: 'Leeds', bid: 0.1, offer: 0.2, lastChange: 'none' },
  { id: 20, name: 'Burnley', bid: 0.1, offer: 0.2, lastChange: 'none' },
];

const App: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const simulatePriceChange = useCallback(() => {
    setTeams(currentTeams => {
      // Only simulate price changes for the top 5 teams (Arsenal, City, Liverpool, Chelsea, Utd)
      // The others should remain stable at 0.1-0.2 as per user request.
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
    const price = type === 'buy' ? team.offer : team.bid;
    setSelectedOrder({ team, type, price });
  };

  const handleCloseTradeSlip = () => {
    setSelectedOrder(null);
  };

  const sortedTeams = [...teams].sort((a, b) => b.offer - a.offer);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200 font-sans overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-md text-white"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar - Hidden on mobile unless toggled */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <TopBar />

        {/* Content Area - Fixed Height, No Page Scroll */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 overflow-hidden">
          <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 h-full">
            <div className="flex-grow min-w-0 flex flex-col h-full overflow-hidden">
              {/* Fixed Header Section */}
              <div className="flex-shrink-0 space-y-6 mb-6">
                <Header />
                <AIAnalysis teams={teams} />
              </div>

              {/* Scrollable OrderBook Section */}
              <main className="flex-1 min-h-0">
                <OrderBook teams={sortedTeams} onSelectOrder={handleSelectOrder} />
              </main>

              {/* Footer - Optional: Keep fixed at bottom or scroll with content? 
                  User asked for "everything down to Asset row fixed", implying footer might be off screen or fixed at bottom.
                  Let's keep footer fixed at bottom for a clean "app" feel.
              */}
              <div className="flex-shrink-0 mt-4">
                <Footer />
              </div>
            </div>

            {selectedOrder && (
              <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 h-full overflow-y-auto">
                <TradeSlip
                  key={selectedOrder.team.id + selectedOrder.type}
                  order={selectedOrder}
                  onClose={handleCloseTradeSlip}
                />
              </aside>
            )}
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