import React, { useState, useEffect } from 'react';
import { Search, Wallet, ChevronDown, User, Settings, FileText, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

const TopBar: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [balance, setBalance] = useState<number>(0);
    const [isBalanceOpen, setIsBalanceOpen] = useState(false);
    const [isAvatarOpen, setIsAvatarOpen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // Fetch initial balance (mock or real)
        const fetchBalance = async () => {
            // In a real app with auth, we would get the user's ID
            // const { data: { user } } = await supabase.auth.getUser();
            // if (user) {
            //     const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
            //     if (data) setBalance(data.balance);
            // }

            // Mock for demonstration until auth is fully set up
            setBalance(8486.07);
        };
        fetchBalance();
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    return (
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
            {/* Left: Search */}
            <div className="flex items-center w-1/3">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Search assets..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3AA189]/50 text-gray-800 placeholder-gray-500"
                    />
                </div>
            </div>

            {/* Right: Date, Balance, Avatar */}
            <div className="flex items-center gap-6">
                <div className="text-sm font-medium text-gray-600 hidden lg:block">
                    {formatTime(currentTime)}
                </div>

                {/* Balance Dropdown */}
                <div className="relative">
                    <button
                        className="flex items-center gap-2 bg-[#3AA189] text-white px-4 py-2 rounded-lg hover:bg-[#2d826f] transition-colors"
                        onClick={() => setIsBalanceOpen(!isBalanceOpen)}
                    >
                        <Wallet className="h-4 w-4" />
                        <span className="font-bold">{balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isBalanceOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isBalanceOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-2 animate-in fade-in slide-in-from-top-2">
                            <div className="px-4 py-2 border-b border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-semibold">Total Balance</p>
                                <p className="text-xl font-bold text-gray-900">{balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                            </div>
                            <div className="px-4 py-2">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">Available</span>
                                    <span className="font-medium text-gray-900">{(balance * 0.8).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">In Orders</span>
                                    <span className="font-medium text-gray-900">{(balance * 0.2).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Avatar Dropdown */}
                <div className="relative">
                    <button
                        className="h-10 w-10 rounded-full bg-[#3AA189]/10 flex items-center justify-center text-[#3AA189] hover:bg-[#3AA189]/20 transition-colors"
                        onClick={() => setIsAvatarOpen(!isAvatarOpen)}
                    >
                        <User className="h-5 w-5" />
                    </button>

                    {isAvatarOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-1 animate-in fade-in slide-in-from-top-2">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-sm font-bold text-gray-900">testuser123</p>
                                <p className="text-xs text-gray-500">Last logged in: Today</p>
                            </div>
                            <div className="py-1">
                                <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    <Settings className="h-4 w-4" /> Settings
                                </a>
                                <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    <FileText className="h-4 w-4" /> Portfolio
                                </a>
                                <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    <Shield className="h-4 w-4" /> Rules & Regulations
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TopBar;
