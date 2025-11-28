import React from 'react';
import { AuthUI } from './auth/AuthUI';
import { TrendingUp, Shield, Globe, Zap } from 'lucide-react';

export const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-1.5 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            ShareMatch
                        </span>
                    </div>
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#markets" className="hover:text-white transition-colors">Markets</a>
                        <a href="#about" className="hover:text-white transition-colors">About</a>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 lg:p-12 gap-12 max-w-7xl mx-auto w-full">

                {/* Left: Copy */}
                <div className="flex-1 space-y-8 text-center lg:text-left">
                    <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                        The Future of <br />
                        <span className="text-blue-500">Sports Trading</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto lg:mx-0">
                        Trade shares in your favorite teams and athletes. Buy low, sell high, and profit from their performance in real-time.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                        <div className="flex items-center gap-3 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                            <Globe className="w-6 h-6 text-blue-400" />
                            <div className="text-left">
                                <div className="font-semibold">Global Markets</div>
                                <div className="text-xs text-gray-500">EPL, F1, World Cup & more</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                            <Zap className="w-6 h-6 text-yellow-400" />
                            <div className="text-left">
                                <div className="font-semibold">Real-time Data</div>
                                <div className="text-xs text-gray-500">Live price updates</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                            <Shield className="w-6 h-6 text-green-400" />
                            <div className="text-left">
                                <div className="font-semibold">Secure Platform</div>
                                <div className="text-xs text-gray-500">Bank-grade security</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Auth UI */}
                <div className="flex-1 w-full max-w-md">
                    <AuthUI />
                </div>

            </main>

            {/* Footer */}
            <footer className="border-t border-gray-800 py-8 text-center text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} ShareMatch. All rights reserved.
            </footer>
        </div>
    );
};
