import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { fetchStreakSummary, fetchXp, fetchProgressSummary } from "../lib/progress";

const UserProgressContext = createContext(null);

export function UserProgressProvider({ children }) {
  const [userId, setUserId] = useState(null);
  const [xp, setXp] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [streakDays, setStreakDays] = useState([]);
  const [progressSummary, setProgressSummary] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchInProgressRef = useRef(false);
  const lastFetchedUserIdRef = useRef(null);

  const loadData = useCallback(async (targetUserId, force = false) => {
    if (!targetUserId) return;
    if (fetchInProgressRef.current && !force) return;

    fetchInProgressRef.current = true;
    setIsLoading(true);

    try {
      const [streakRes, xpRes, progressRes] = await Promise.allSettled([
        fetchStreakSummary(targetUserId),
        fetchXp(targetUserId),
        fetchProgressSummary(targetUserId),
      ]);

      if (streakRes.status === "fulfilled") {
        setStreakCount(streakRes.value.count);
        setStreakDays(streakRes.value.days);
      }
      if (xpRes.status === "fulfilled") {
        setXp(xpRes.value);
      }
      if (progressRes.status === "fulfilled") {
        setProgressSummary(progressRes.value);
      }
      setIsInitialized(true);
      lastFetchedUserIdRef.current = targetUserId;
    } catch (err) {
      console.warn("UserProgressContext load error:", err);
    } finally {
      fetchInProgressRef.current = false;
      setIsLoading(false);
    }
  }, []);

  // Listen to Supabase Auth State
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session?.user) {
        setUserId(session.user.id);
        loadData(session.user.id);
      } else {
        setUserId(null);
        setXp(0);
        setStreakCount(0);
        setStreakDays([]);
        setProgressSummary(null);
        setIsInitialized(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        if (session.user.id !== lastFetchedUserIdRef.current) {
          loadData(session.user.id);
        }
      } else {
        setUserId(null);
        setXp(0);
        setStreakCount(0);
        setStreakDays([]);
        setProgressSummary(null);
        lastFetchedUserIdRef.current = null;
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadData]);

  // Realtime listener for simulation feedback or score updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`public:user_progress:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "simulation_feedback",
        },
        () => {
          // Re-fetch in background whenever a simulation feedback is generated
          loadData(userId, true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadData]);

  /**
   * Optimistically adds XP locally for instantaneous UI updates across all screens,
   * then re-syncs with backend in background.
   */
  const addXp = useCallback(
    (earnedAmount) => {
      if (typeof earnedAmount === "number" && earnedAmount > 0) {
        setXp((prev) => prev + earnedAmount);
      }
      if (userId) {
        setTimeout(() => {
          loadData(userId, true);
        }, 600);
      }
    },
    [userId, loadData]
  );

  /**
   * Manually trigger background data refresh (e.g. after session completion or claim).
   */
  const refreshProgress = useCallback(() => {
    if (userId) {
      return loadData(userId, true);
    }
    return Promise.resolve();
  }, [userId, loadData]);

  const value = {
    userId,
    xp,
    streakCount,
    streakDays,
    progressSummary,
    isInitialized,
    isLoading,
    addXp,
    refreshProgress,
    setXp,
    setStreakCount,
    setStreakDays,
    setProgressSummary,
  };

  return <UserProgressContext.Provider value={value}>{children}</UserProgressContext.Provider>;
}

export function useUserProgress() {
  const context = useContext(UserProgressContext);
  if (!context) {
    throw new Error("useUserProgress must be used within a UserProgressProvider");
  }
  return context;
}
