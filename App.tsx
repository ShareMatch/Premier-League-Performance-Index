import React, { useState, useEffect, useCallback } from 'react';
import type { Team, Order } from './types';
import Header from './components/Header';
import OrderBook from './components/OrderBook';
import Footer from './components/Footer';
import TradeSlip from './components/TradeSlip';
import Sidebar from './components/Sidebar';
import AIAnalysis from './components/AIAnalysis';
import { Menu, X } from 'lucide-react';

const INITIAL_TEAMS: Team[] = [
  { id: 1, name: 'Manchester City', bid: 35.5, offer: 36.0, lastChange: 'none' },
  { id: 2, name: 'Arsenal', bid: 28.0, offer: 28.5, lastChange: 'none' },
  { id: 3, name: 'Liverpool', bid: 15.2, offer: 15.8, lastChange: 'none' },
  { id: 4, name: 'Manchester Utd', bid: 8.5, offer: 9.0, lastChange: 'none' },
  { id: 5, name: 'Chelsea', bid: 7.0, offer: 7.5, lastChange: 'none' },
  { id: 6, name: 'Newcastle Utd', bid: 5.5, offer: 6.0, lastChange: 'none' },
  { id: 7, name: 'Tottenham', bid: 4.8, offer: 5.2, lastChange: 'none' },
  { id: 8, name: 'Aston Villa', bid: 3.1, offer: 3.5, lastChange: 'none' },
  { id: 9, name: 'Brighton', bid: 1.5, offer: 1.9, lastChange: 'none' },
  { id: 10, name: 'West Ham', bid: 0.8, offer: 1.2, lastChange: 'none' },
  { id: 11, name: 'Everton', bid: 0.5, offer: 0.9, lastChange: 'none' },
  { id: 12, name: 'Crystal Palace', bid: 0.4, offer: 0.8, lastChange: 'none' },
  { id: 13, name: 'Fulham', bid: 0.3, offer: 0.6, lastChange: 'none' },
  { id: 14, name: 'Wolves', bid: 0.2, offer: 0.5, lastChange: 'none' },
  { id: 15, name: 'Bournemouth', bid: 0.2, offer: 0.4, lastChange: 'none' },
  { id: 16, name: 'Nottingham Forest', bid: 0.1, offer: 0.3, lastChange: 'none' },
  { id: 17, name: 'Brentford', bid: 0.1, offer: 0.3, lastChange: 'none' },
  { id: 18, name: 'Leicester City', bid: 0.1, offer: 0.2, lastChange: 'none' },
  { id: 19, name: 'Ipswich Town', bid: 0.1, offer: 0.2, lastChange: 'none' },
  { id: 20, name: 'Southampton', bid: 0.1, offer: 0.2, lastChange: 'none' },
];

const App: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const simulatePriceChange = useCallback(() => {
    setTeams(currentTeams => {
      const teamIndex = Math.floor(Math.random() * currentTeams.length);
      const change = (Math.random() * 0.2 - 0.1);

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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 pt-12 md:pt-0">
            <div className="flex-grow min-w-0">
              <Header />
              <main className="mt-6">
                <OrderBook teams={sortedTeams} onSelectOrder={handleSelectOrder} />
                <AIAnalysis teams={teams} />
              </main>
              <Footer />
            </div>
            {selectedOrder && (
              <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0">
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