import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

export const AuthUI: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                    },
                });
                if (error) throw error;
                setMessage('Check your email for the confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md p-8 space-y-6 bg-gray-800/50 rounded-xl border border-gray-700 backdrop-blur-sm">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white">
                    {isSignUp ? 'Create an Account' : 'Welcome Back'}
                </h2>
                <p className="mt-2 text-sm text-gray-400">
                    {isSignUp
                        ? 'Sign up to start trading on the performance index'
                        : 'Sign in to access your portfolio'}
                </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                {isSignUp && (
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                            placeholder="John Doe"
                            required={isSignUp}
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        Email Address
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                        placeholder="you@example.com"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                        placeholder="••••••••"
                        required
                        minLength={6}
                    />
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="p-3 text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-lg">
                        {message}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isSignUp ? (
                        'Sign Up'
                    ) : (
                        'Sign In'
                    )}
                </button>
            </form>

            <div className="text-center">
                <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                    {isSignUp
                        ? 'Already have an account? Sign in'
                        : "Don't have an account? Sign up"}
                </button>
            </div>
        </div>
    );
};
