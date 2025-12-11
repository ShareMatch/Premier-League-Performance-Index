import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    isPasswordRecovery: boolean;
    clearPasswordRecovery: () => void;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    isPasswordRecovery: false,
    clearPasswordRecovery: () => { },
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

    // Check if URL hash contains recovery tokens or errors (before Supabase processes them)
    useEffect(() => {
        const hash = window.location.hash;
        
        // Check for error in URL hash (e.g., expired/invalid link)
        if (hash && hash.includes('error=')) {
            const params = new URLSearchParams(hash.substring(1));
            const error = params.get('error');
            const errorCode = params.get('error_code');
            
            // If it's an OTP/link expired error, show the recovery modal in invalid state
            if (errorCode === 'otp_expired' || error === 'access_denied') {
                setIsPasswordRecovery(true);
                sessionStorage.setItem('password_recovery_mode', 'true');
                sessionStorage.setItem('password_recovery_error', 'expired');
            }
            
            // Clear the error from URL
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } else if (hash && hash.includes('type=recovery')) {
            setIsPasswordRecovery(true);
            sessionStorage.setItem('password_recovery_mode', 'true');
            sessionStorage.removeItem('password_recovery_error');
        } else if (sessionStorage.getItem('password_recovery_mode') === 'true') {
            setIsPasswordRecovery(true);
        }
    }, []);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            // Don't set user if we're in password recovery mode
            const inRecoveryMode = isPasswordRecovery || sessionStorage.getItem('password_recovery_mode') === 'true';
            
            setSession(session);
            if (!inRecoveryMode) {
                setUser(session?.user ?? null);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            // Handle PASSWORD_RECOVERY specially - but ONLY if this tab initiated the recovery
            if (event === 'PASSWORD_RECOVERY') {
                const thisTabInitiatedRecovery = 
                    window.location.hash.includes('type=recovery') || 
                    sessionStorage.getItem('password_recovery_mode') === 'true';
                
                if (thisTabInitiatedRecovery) {
                    setIsPasswordRecovery(true);
                    sessionStorage.setItem('password_recovery_mode', 'true');
                    setSession(session);
                    setUser(null);
                    setLoading(false);
                    return;
                } else {
                    // Different tab initiated - continue normally
                    setSession(session);
                    setUser(session?.user ?? null);
                    setLoading(false);
                    return;
                }
            }
            
            // Handle SIGNED_OUT explicitly - clear all state
            if (event === 'SIGNED_OUT') {
                setSession(null);
                setUser(null);
                setLoading(false);
                setIsPasswordRecovery(false);
                sessionStorage.removeItem('password_recovery_mode');
                sessionStorage.removeItem('password_recovery_error');
                return;
            }
            
            // For all other events, check if we're in recovery mode (only for THIS tab)
            const inRecoveryMode = sessionStorage.getItem('password_recovery_mode') === 'true';
            
            if (inRecoveryMode) {
                setSession(session);
                setLoading(false);
                return;
            }
            
            // Normal auth flow
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [isPasswordRecovery]);

    const signOut = async () => {
        // Explicitly clear auth state immediately
        setUser(null);
        setSession(null);
        setIsPasswordRecovery(false);
        sessionStorage.removeItem('password_recovery_mode');
        sessionStorage.removeItem('password_recovery_error');
        // Sign out from Supabase (this will also trigger SIGNED_OUT event)
        await supabase.auth.signOut();
    };

    const clearPasswordRecovery = () => {
        setIsPasswordRecovery(false);
        sessionStorage.removeItem('password_recovery_mode');
        sessionStorage.removeItem('password_recovery_error');
    };

    const value = {
        session,
        user,
        loading,
        isPasswordRecovery,
        clearPasswordRecovery,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
