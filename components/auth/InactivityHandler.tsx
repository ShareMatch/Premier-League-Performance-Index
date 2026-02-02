import React, { useEffect, useRef, useState, useCallback } from "react";
import InactivityModal from "./InactivityModal";
import { useAuth } from "./AuthProvider";
import { supabase } from "../../lib/supabase";

interface InactivityHandlerProps {
  /** Time in milliseconds before showing warning (default: 5 minutes) */
  inactivityTimeout?: number;
  /** Time in seconds for the countdown in the warning modal */
  warningCountdown?: number;
  /** Whether to enable inactivity tracking */
  enabled?: boolean;
  children: React.ReactNode;
}

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "wheel",
] as const;

// ─────────────────────────────────────────────────────────────────────
// sessionStorage keys (dies on tab close)
// ─────────────────────────────────────────────────────────────────────
const SESSION_LAST_ACTIVITY_KEY = "sharematch_session_activity";
const SESSION_ID_KEY = "sharematch_session_id";

// ─────────────────────────────────────────────────────────────────────
// localStorage keys (survives PC sleep)
// ─────────────────────────────────────────────────────────────────────
const LOCAL_LAST_ACTIVITY_KEY = "sharematch_last_activity";
const LOCAL_ACTIVITY_CHECK_KEY = "sharematch_last_activity_check";
const LOCAL_FORCE_LOGOUT_AT_KEY = "sharematch_force_logout_at";

const InactivityHandler: React.FC<InactivityHandlerProps> = ({
  inactivityTimeout = 5 * 60 * 1000, // 5 minutes
  warningCountdown = 10, // 10 seconds
  enabled = true,
  children,
}) => {
  const { user, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [countdownActive, setCountdownActive] = useState(false);

  // Refs
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string>("");
  const warningShownRef = useRef<boolean>(false);
  const isHandlingTimeoutRef = useRef<boolean>(false);
  const lastActivityCheckRef = useRef<number>(Date.now()); // For sleep detection

  // Initialize session ID and storage on mount
  useEffect(() => {
    const sessionId = `${Date.now()}-${Math.random()}`;
    sessionIdRef.current = sessionId;

    // // console.log("[Inactivity] 🚀 Initialized with timeout:", inactivityTimeout / 1000, "seconds");

    const now = Date.now();
    lastActivityRef.current = now;
    lastActivityCheckRef.current = now;

    // ─────────────────────────────────────────────────────────────────
    // sessionStorage: Dies on tab close
    // ─────────────────────────────────────────────────────────────────
    try {
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
      sessionStorage.setItem(SESSION_LAST_ACTIVITY_KEY, now.toString());
    } catch (e) {
      // // console.warn("[Storage] sessionStorage write failed:", e);
    }

    // ─────────────────────────────────────────────────────────────────
    // localStorage: Survives PC sleep
    // ─────────────────────────────────────────────────────────────────
    try {
      localStorage.setItem(
        LOCAL_LAST_ACTIVITY_KEY,
        JSON.stringify({
          timestamp: now,
          sessionId: sessionId,
        }),
      );
      localStorage.setItem(LOCAL_ACTIVITY_CHECK_KEY, now.toString());
    } catch (e) {
      // // console.warn("[Storage] localStorage write failed:", e);
    }
  }, [inactivityTimeout]);

  // ─────────────────────────────────────────────────────────────────────
  // SUPABASE TOKEN REFRESH
  // ─────────────────────────────────────────────────────────────────────
  const refreshSupabaseToken = useCallback(async () => {
    if (!user) return false;

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        // // console.error("Token refresh failed:", error.message);
        return false;
      }

      return !!session;
    } catch (err) {
      // // console.error("Token refresh error:", err);
      return false;
    }
  }, [user]);

  // ─────────────────────────────────────────────────────────────────────
  // VALIDATE SESSION
  // ─────────────────────────────────────────────────────────────────────
  const validateSessionWithSupabase = useCallback(async () => {
    if (!user) return false;

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        // console.warn("Session validation failed:", error?.message);
        return false;
      }

      // Check token expiry
      try {
        const token = session.access_token;
        const decoded = JSON.parse(atob(token.split(".")[1]));
        const expiresAt = decoded.exp * 1000;
        const timeUntilExpiry = expiresAt - Date.now();

        if (timeUntilExpiry < 5 * 60 * 1000) {
          const refreshed = await refreshSupabaseToken();
          return refreshed;
        }

        return true;
      } catch (err) {
        // console.error("Failed to decode token:", err);
        return false;
      }
    } catch (err) {
      // console.error("Session validation error:", err);
      return false;
    }
  }, [user, refreshSupabaseToken]);

  // ─────────────────────────────────────────────────────────────────────
  // UPDATE LAST ACTIVITY (BOTH storages)
  // ─────────────────────────────────────────────────────────────────────
  const updateLastActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastActivityCheckRef.current = now;

    // ─────────────────────────────────────────────────────────────────
    // sessionStorage: Dies on tab close
    // ─────────────────────────────────────────────────────────────────
    try {
      sessionStorage.setItem(SESSION_LAST_ACTIVITY_KEY, now.toString());
    } catch (e) {
      // console.warn("[Storage] sessionStorage write failed:", e);
    }

    // ─────────────────────────────────────────────────────────────────
    // localStorage: Survives PC sleep
    // ─────────────────────────────────────────────────────────────────
    try {
      localStorage.setItem(
        LOCAL_LAST_ACTIVITY_KEY,
        JSON.stringify({
          timestamp: now,
          sessionId: sessionIdRef.current,
        }),
      );
      localStorage.setItem(LOCAL_ACTIVITY_CHECK_KEY, now.toString());
    } catch (e) {
      // console.warn("[Storage] localStorage write failed:", e);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // CHECK IF TRULY INACTIVE (by wall-clock time, not just timer state)
  // ─────────────────────────────────────────────────────────────────────
  const checkRealInactivity = useCallback(() => {
    const storedData = localStorage.getItem(LOCAL_LAST_ACTIVITY_KEY);
    let storedTime = 0;

    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        storedTime = parsed.timestamp || 0;
      } catch {
        storedTime = parseInt(storedData, 10) || 0;
      }
    }

    const now = Date.now();
    const actualTimeSinceActivity = now - storedTime;
    const isInactive = actualTimeSinceActivity >= inactivityTimeout;

    // console.log(`[Inactivity] ⏱️ Wall-clock check: ${(actualTimeSinceActivity / 1000).toFixed(1)}s since last activity (timeout: ${inactivityTimeout / 1000}s) → ${isInactive ? "INACTIVE ⚠️" : "active ✓"}`,);

    return isInactive;
  }, [inactivityTimeout]);

  // ─────────────────────────────────────────────────────────────────────
  // CLEAR ALL TIMERS
  // ─────────────────────────────────────────────────────────────────────
  const clearAllTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
    warningShownRef.current = false;
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // RESET INACTIVITY TIMER
  // ─────────────────────────────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    clearAllTimers();

    if (!user || !enabled) return;

    // Main inactivity timer
    inactivityTimerRef.current = setTimeout(() => {
      const isInactive = checkRealInactivity();

      if (!isInactive) {
        // Another tab was more recently active
        resetInactivityTimer();
        return;
      }

      // Show warning
      if (!warningShownRef.current) {
        // console.warn("[Inactivity] ⏰ Showing warning modal");
        warningShownRef.current = true;
        setShowWarning(true);
        setCountdownActive(true);

        warningTimerRef.current = setTimeout(() => {
          handleTimeout();
        }, warningCountdown * 1000);
      }
    }, inactivityTimeout);

    // Periodic token refresh
    tokenRefreshTimerRef.current = setTimeout(
      async () => {
        if (!warningShownRef.current) {
          const isValid = await validateSessionWithSupabase();
          if (!isValid) {
            warningShownRef.current = true;
            setShowWarning(true);
            setCountdownActive(true);

            warningTimerRef.current = setTimeout(() => {
              handleTimeout();
            }, warningCountdown * 1000);
          }
        }
      },
      10 * 60 * 1000,
    );
  }, [
    user,
    enabled,
    inactivityTimeout,
    warningCountdown,
    checkRealInactivity,
    validateSessionWithSupabase,
    clearAllTimers,
  ]);

  // ─────────────────────────────────────────────────────────────────────
  // HANDLE TIMEOUT (FORCE LOGOUT)
  // ─────────────────────────────────────────────────────────────────────
  const handleTimeout = useCallback(async () => {
    if (isHandlingTimeoutRef.current) return;
    isHandlingTimeoutRef.current = true;

    // console.warn("[Inactivity] 🚪 Logging out user due to inactivity");

    try {
      setShowWarning(false);
      setCountdownActive(false);
      clearAllTimers();

      // Clear both storages
      try {
        sessionStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
        sessionStorage.removeItem(SESSION_ID_KEY);
      } catch (e) {
        // console.warn("[Storage] sessionStorage cleanup failed:", e);
      }

      try {
        localStorage.removeItem(LOCAL_LAST_ACTIVITY_KEY);
        localStorage.removeItem(LOCAL_ACTIVITY_CHECK_KEY);
        localStorage.removeItem(LOCAL_FORCE_LOGOUT_AT_KEY);
      } catch (e) {
        // console.warn("[Storage] localStorage cleanup failed:", e);
      }

      await signOut();
    } catch (error) {
      // console.error("Error during timeout logout:", error);
      setShowWarning(false);
      setCountdownActive(false);
    } finally {
      isHandlingTimeoutRef.current = false;
    }
  }, [signOut, clearAllTimers]);

  // ─────────────────────────────────────────────────────────────────────
  // HANDLE ACTIVITY - Simple, no heavy checks
  // ─────────────────────────────────────────────────────────────────────
  const handleActivity = useCallback(() => {
    // If warning already showing, activity doesn't count
    if (showWarning) return;

    // Simple: just update activity and reset timer
    // All heavy checks happen in visibility handler
    updateLastActivity();
    resetInactivityTimer();
  }, [showWarning, updateLastActivity, resetInactivityTimer]);

  // ─────────────────────────────────────────────────────────────────────
  // HANDLE "STAY LOGGED IN"
  // ─────────────────────────────────────────────────────────────────────
  const handleStayLoggedIn = useCallback(async () => {
    if (isHandlingTimeoutRef.current) return;

    try {
      const isValid = await validateSessionWithSupabase();

      if (!isValid) {
        await handleTimeout();
        return;
      }

      // console.log("[Inactivity] ✅ User clicked 'Stay Logged In'");
      setShowWarning(false);
      setCountdownActive(false);
      warningShownRef.current = false;

      updateLastActivity();
      resetInactivityTimer();
    } catch (error) {
      // console.error("Error during stay logged in:", error);
      await handleTimeout();
    }
  }, [validateSessionWithSupabase, updateLastActivity, resetInactivityTimer, handleTimeout]);

  // Check if a previous tab/browser close requested a forced logout
  useEffect(() => {
    const checkForceLogout = async () => {
      try {
        const navEntry = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming | undefined;
        const navType = navEntry?.type;

        const forceLogoutAt = localStorage.getItem(LOCAL_FORCE_LOGOUT_AT_KEY);
        if (!forceLogoutAt) return;

        // If this page load is a refresh, do not treat it as a tab/browser close.
        // Clear the flag so we don't log out on refresh loops.
        if (navType === "reload") {
          localStorage.removeItem(LOCAL_FORCE_LOGOUT_AT_KEY);
          return;
        }

        const logoutTime = parseInt(forceLogoutAt, 10);
        if (!Number.isFinite(logoutTime)) {
          localStorage.removeItem(LOCAL_FORCE_LOGOUT_AT_KEY);
          return;
        }

        const timeSinceLogout = Date.now() - logoutTime;

        // If a close happened recently, force logout immediately
        if (timeSinceLogout < 5 * 60 * 1000) {
          // console.warn("[Inactivity] 🔴 Previous tab/browser closed - forcing logout");
          localStorage.removeItem(LOCAL_FORCE_LOGOUT_AT_KEY);
          await handleTimeout();
          return;
        }

        // Old flag, clean it up
        localStorage.removeItem(LOCAL_FORCE_LOGOUT_AT_KEY);
      } catch (e) {
        // console.warn("[Storage] Failed to check force logout:", e);
      }
    };

    if (user) {
      checkForceLogout();
    }
  }, [user, handleTimeout]);

  // ─────────────────────────────────────────────────────────────────────
  // DETECT TAB CLOSE / WINDOW UNLOAD
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Set a flag that this session should be terminated
      try {
        localStorage.setItem(
          LOCAL_FORCE_LOGOUT_AT_KEY,
          Date.now().toString(),
        );
        sessionStorage.removeItem(SESSION_ID_KEY);
        sessionStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
      } catch (e) {
        // console.warn("[Storage] Failed to set logout flag:", e);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // SET UP LISTENERS
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !enabled) {
      clearAllTimers();
      return;
    }

    // Initialize
    updateLastActivity();
    resetInactivityTimer();

    // Add activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Cross-tab sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_LAST_ACTIVITY_KEY && e.newValue && !showWarning) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.sessionId && parsed.sessionId !== sessionIdRef.current) {
            lastActivityCheckRef.current = Date.now();
            resetInactivityTimer();
          }
        } catch {
          lastActivityCheckRef.current = Date.now();
          resetInactivityTimer();
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        const lastCheck = lastActivityCheckRef.current;
        const timeSinceLastCheck = now - lastCheck;

        // console.log(`[Inactivity] 👁️ Tab visible. Time since last check: ${(timeSinceLastCheck / 1000).toFixed(1)}s`,);

        const isInactive = checkRealInactivity();

        if (!showWarning && isInactive) {
          // console.warn(`[Inactivity] 🔒 Session expired - showing logout modal`,);
          
          warningShownRef.current = true;
          setShowWarning(true);
          setCountdownActive(true);

          warningTimerRef.current = setTimeout(() => {
            handleTimeout();
          }, warningCountdown * 1000);
          return;
        }

        // Update timestamp AFTER checking
        lastActivityCheckRef.current = now;

        if (!showWarning) {
          resetInactivityTimer();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    
    const handleWindowFocus = () => {
      const now = Date.now();
      const lastCheck = lastActivityCheckRef.current;
      const timeSinceLastCheck = now - lastCheck;

      // console.log(`[Inactivity] 🔍 Window focused. Time since last check: ${(timeSinceLastCheck / 1000).toFixed(1)}s`,);

      // Check inactivity on focus too
      const isInactive = checkRealInactivity();

      if (!showWarning && isInactive) {
        // console.warn(`[Inactivity] 🔒 Session expired on focus - showing logout modal`,);
        warningShownRef.current = true;
        setShowWarning(true);
        setCountdownActive(true);

        warningTimerRef.current = setTimeout(() => {
          handleTimeout();
        }, warningCountdown * 1000);
        return;
      }

      lastActivityCheckRef.current = now;

      if (!showWarning) {
        resetInactivityTimer();
      }
    };
    window.addEventListener("focus", handleWindowFocus);

    // Cleanup
    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [
    user,
    enabled,
    handleActivity,
    resetInactivityTimer,
    showWarning,
    updateLastActivity,
    handleTimeout,
    checkRealInactivity,
    clearAllTimers,
    warningCountdown,
  ]);

  // Clean up on logout
  useEffect(() => {
    if (!user) {
      clearAllTimers();
      setShowWarning(false);
      setCountdownActive(false);
      warningShownRef.current = false;
    }
  }, [user, clearAllTimers]);

  return (
    <>
      {children}
      <InactivityModal
        isOpen={showWarning && !!user && countdownActive}
        countdownSeconds={warningCountdown}
        onStayLoggedIn={handleStayLoggedIn}
        onTimeout={handleTimeout}
      />
    </>
  );
};

export default InactivityHandler;