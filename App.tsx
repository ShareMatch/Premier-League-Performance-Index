
import React, { useState, useEffect, useCallback } from 'react';
import type { Team, Order } from './types';
import Header from './components/Header';
import OrderBook from './components/OrderBook';
import Footer from './components/Footer';
import TradeSlip from './components/TradeSlip';

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

  const simulatePriceChange = useCallback(() => {
    setTeams(currentTeams => {
      const teamIndex = Math.floor(Math.random() * currentTeams.length);
      const teamToUpdate = { ...currentTeams[teamIndex] };
      const change = (Math.random() * 0.2 - 0.1);
      const direction = change > 0 ? 'up' : 'down';
      
      let newBid = parseFloat((teamToUpdate.bid + change).toFixed(1));
      let newOffer = parseFloat((teamToUpdate.offer + change).toFixed(1));

      // Ensure bid and offer don't go below 0.1 and bid is less than offer
      if (newBid < 0.1) newBid = 0.1;
      if (newOffer < newBid + 0.2) newOffer = parseFloat((newBid + 0.2).toFixed(1));
      
      teamToUpdate.bid = newBid;
      teamToUpdate.offer = newOffer;
      teamToUpdate.lastChange = direction;

      const newTeams = [...currentTeams];
      newTeams[teamIndex] = teamToUpdate;
      
      // Reset lastChange for other teams to 'none' to stop animation
      const updatedTeams = newTeams.map((team, index) => 
        index === teamIndex ? teamToUpdate : { ...team, lastChange: 'none' }
      );

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
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
        <div className="flex-grow">
          <Header />
          <main className="mt-6">
            <OrderBook teams={sortedTeams} onSelectOrder={handleSelectOrder} />
          </main>
          <Footer />
        </div>
        {selectedOrder && (
          <aside className="w-full md:w-auto md:max-w-xs xl:max-w-sm flex-shrink-0">
            <TradeSlip 
              key={selectedOrder.team.id + selectedOrder.type} 
              order={selectedOrder} 
              onClose={handleCloseTradeSlip} 
            />
          </aside>
        )}
      </div>
    </div>
  );
};

export default App;
