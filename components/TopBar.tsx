import React, { useState, useEffect } from 'react';
import { Wallet, ChevronDown, User, Settings, FileText, Shield, LogOut, X } from 'lucide-react';
import type { Wallet as WalletType } from '../types';
import { useAuth } from './auth/AuthProvider';
import { AuthUI } from './auth/AuthUI';

interface TopBarProps {
    wallet: WalletType | null;
}

const TopBar: React.FC<TopBarProps> = ({ wallet }) => {
    const { user, signOut } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isBalanceOpen, setIsBalanceOpen] = useState(false);
    const [isAvatarOpen, setIsAvatarOpen] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Close modal when user logs in
    useEffect(() => {
        if (user) {
            setShowLoginModal(false);
        }
    }, [user]);

    const balance = wallet ? wallet.balance : 0;
    const available = wallet ? wallet.available_cents / 100 : 0;
    const reserved = wallet ? wallet.reserved_cents / 100 : 0;

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
        <>
            <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-end px-6 flex-shrink-0">

                {/* Right: Date, Balance, Avatar */}
                <div className="flex items-center gap-6">
                    <div className="text-sm font-medium text-gray-400 hidden lg:block border-r border-gray-800 pr-6">
                        {formatTime(currentTime)}
                    </div>

                    {/* Balance Dropdown - Only show if user is logged in */}
                    {user && (
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
                                <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 py-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="px-4 py-2 border-b border-gray-700">
                                        <p className="text-xs text-gray-400 uppercase font-semibold">Total Balance</p>
                                        <p className="text-xl font-bold text-white">{balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                                    </div>
                                    <div className="px-4 py-2">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-400">Available</span>
                                            <span className="font-medium text-gray-200">{available.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">In Orders</span>
                                            <span className="font-medium text-gray-200">{reserved.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Avatar Dropdown or Sign In */}
                    {user ? (
                        <div className="relative">
                            <button
                                className="h-10 w-10 rounded-full bg-[#3AA189]/10 flex items-center justify-center text-[#3AA189] hover:bg-[#3AA189]/20 transition-colors"
                                onClick={() => setIsAvatarOpen(!isAvatarOpen)}
                            >
                                <User className="h-5 w-5" />
                            </button>

                            {isAvatarOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 py-1 animate-in fade-in slide-in-from-top-2">
                                    <div className="px-4 py-3 border-b border-gray-700">
                                        <p className="text-sm font-bold text-white truncate">{user.email}</p>
                                        <p className="text-xs text-gray-400">Last logged in: Today</p>
                                    </div>
                                    <div className="py-1">
                                        <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                                            <Settings className="h-4 w-4" /> Settings
                                        </a>
                                        <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                                            <FileText className="h-4 w-4" /> Portfolio
                                        </a>
                                        <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                                            <Shield className="h-4 w-4" /> Rules & Regulations
                                        </a>
                                        <button
                                            onClick={() => signOut()}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 text-left"
                                        >
                                            <LogOut className="h-4 w-4" /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowLoginModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            Sign In
                        </button>
                    )}
                </div>
            </div>

            {/* Login Modal */}
            {showLoginModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-md">
                        <button
                            onClick={() => setShowLoginModal(false)}
                            className="absolute -top-12 right-0 text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <AuthUI />
                    </div>
                </div>
            )}
        </>
    );
};

export default TopBar;
