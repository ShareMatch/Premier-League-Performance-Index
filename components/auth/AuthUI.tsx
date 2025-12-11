import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

import { SUPABASE_URL } from '../../lib/config';

interface LoginResponse {
    success: boolean;
    message: string;
    user?: { id: string; email: string };
    session?: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        expires_at: number;
        token_type: string;
    };
    requiresVerification?: boolean;
    verificationType?: 'email' | 'whatsapp';
    email?: string;
    whatsappData?: { masked: string; raw: string };
}

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
                // For sign up, use the old direct method (or redirect to registration page)
                // The full registration flow should go through /register page
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
                // Use custom login edge function for verification checks
                const response = await fetch(`${SUPABASE_URL}/functions/v1/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data: LoginResponse = await response.json();

                if (!data.success) {
                    // Check if verification is required
                    if (data.requiresVerification) {
                        // Store email for verification flow
                        sessionStorage.setItem('pendingVerificationEmail', data.email || email);
                        if (data.whatsappData) {
                            sessionStorage.setItem('pendingVerificationPhone', data.whatsappData.raw);
                        }
                        
                        // Show appropriate message based on verification type
                        if (data.verificationType === 'email') {
                            setError('Please verify your email address first. Check your inbox for the OTP.');
                        } else if (data.verificationType === 'whatsapp') {
                            setError('Please verify your WhatsApp number first.');
                        }
                        return;
                    }
                    throw new Error(data.message);
                }

                // Login successful - set the session in Supabase client
                if (data.session) {
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: data.session.access_token,
                        refresh_token: data.session.refresh_token,
                    });
                    
                    if (sessionError) {
                        throw new Error('Failed to establish session');
                    }
                }
                // AuthProvider will pick up the session change automatically
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md p-8 space-y-6 bg-gray-800/50 rounded-xl border border-gray-700 backdrop-blur-sm">
            <div className="flex flex-col items-center justify-center mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-[#3AA189] rounded flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold text-white">ShareMatch</span>
                </div>
                <p className="text-sm text-gray-400">
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
