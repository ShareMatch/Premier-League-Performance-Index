import React, { useEffect, useRef, useState, useCallback } from 'react';
import InactivityModal from './InactivityModal';
import { useAuth } from './AuthProvider';

interface InactivityHandlerProps {
  /** Time in milliseconds before showing warning (default: 5 minutes) */
  inactivityTimeout?: number;
  /** Time in seconds for the countdown in the warning modal (default: 120 seconds / 2 minutes) */
  warningCountdown?: number;
  /** Whether to enable inactivity tracking (default: true) */
  enabled?: boolean;
  children: React.ReactNode;
}

// Events that indicate user activity
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'wheel',
] as const;

// Key for localStorage to sync across tabs
const LAST_ACTIVITY_KEY = 'sharematch_last_activity';

const InactivityHandler: React.FC<InactivityHandlerProps> = ({
  inactivityTimeout = 5 * 60 * 1000, // 5 minutes default
  warningCountdown = 120, // 2 minutes default
  enabled = true,
  children,
}) => {
  const { user, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Update last activity time in localStorage (for cross-tab sync)
  const updateLastActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
  }, []);

  // Reset the inactivity timer
  const resetInactivityTimer = useCallback(() => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Don't start timer if user not logged in or feature disabled
    if (!user || !enabled) return;

    // Start new timer
    inactivityTimerRef.current = setTimeout(() => {
      // Check localStorage in case another tab updated activity
      const storedActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
      const storedTime = storedActivity ? parseInt(storedActivity, 10) : 0;
      const timeSinceActivity = Date.now() - storedTime;

      // If activity was recent in another tab, reset timer instead of showing warning
      if (timeSinceActivity < inactivityTimeout) {
        resetInactivityTimer();
        return;
      }

      setShowWarning(true);
    }, inactivityTimeout);
  }, [user, enabled, inactivityTimeout]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    // Don't track if warning is showing (user must click button)
    if (showWarning) return;

    updateLastActivity();
    resetInactivityTimer();
  }, [showWarning, updateLastActivity, resetInactivityTimer]);

  // Handle "Stay logged in" button click
  const handleStayLoggedIn = useCallback(() => {
    setShowWarning(false);
    updateLastActivity();
    resetInactivityTimer();
  }, [updateLastActivity, resetInactivityTimer]);

  // Handle timeout (auto logout)
  const handleTimeout = useCallback(async () => {
    setShowWarning(false);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    await signOut();
  }, [signOut]);

  // Set up activity listeners
  useEffect(() => {
    if (!user || !enabled) return;

    // Initialize last activity
    updateLastActivity();
    resetInactivityTimer();

    // Add activity event listeners
    ACTIVITY_EVENTS.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Listen for storage changes (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        // Another tab had activity - reset our timer too
        if (!showWarning) {
          resetInactivityTimer();
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Listen for visibility changes (tab focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !showWarning) {
        // Tab became visible - check if we should show warning
        const storedActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        const storedTime = storedActivity ? parseInt(storedActivity, 10) : 0;
        const timeSinceActivity = Date.now() - storedTime;

        if (timeSinceActivity >= inactivityTimeout) {
          setShowWarning(true);
        } else {
          resetInactivityTimer();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      ACTIVITY_EVENTS.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, enabled, handleActivity, resetInactivityTimer, showWarning, inactivityTimeout, updateLastActivity]);

  // Clear timer when user logs out
  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    }
  }, [user]);

  return (
    <>
      {children}
      <InactivityModal
        isOpen={showWarning && !!user}
        countdownSeconds={warningCountdown}
        onStayLoggedIn={handleStayLoggedIn}
        onTimeout={handleTimeout}
      />
    </>
  );
};

export default InactivityHandler;

