import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserStats {
  totalXp: number;
  xpMultiplier: number;
  streakProtections: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  xpToNextLevel: number;
  xpProgress: number;
}

// XP required for each level (exponential growth)
const getXpForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(1.5, level - 1));
};

const getLevelFromXp = (totalXp: number): { level: number; xpInCurrentLevel: number; xpToNextLevel: number } => {
  let level = 1;
  let xpRemaining = totalXp;
  
  while (xpRemaining >= getXpForLevel(level)) {
    xpRemaining -= getXpForLevel(level);
    level++;
  }
  
  return {
    level,
    xpInCurrentLevel: xpRemaining,
    xpToNextLevel: getXpForLevel(level),
  };
};

export const useUserStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('total_xp, xp_multiplier, streak_protections')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // Fetch leaderboard stats for streak info
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('leaderboard_stats')
        .select('current_streak, longest_streak')
        .eq('user_id', user.id)
        .maybeSingle();

      if (leaderboardError && leaderboardError.code !== 'PGRST116') {
        throw leaderboardError;
      }

      const totalXp = profileData?.total_xp || 0;
      const { level, xpInCurrentLevel, xpToNextLevel } = getLevelFromXp(totalXp);

      setStats({
        totalXp,
        xpMultiplier: profileData?.xp_multiplier || 1,
        streakProtections: profileData?.streak_protections || 0,
        currentStreak: leaderboardData?.current_streak || 0,
        longestStreak: leaderboardData?.longest_streak || 0,
        level,
        xpToNextLevel,
        xpProgress: (xpInCurrentLevel / xpToNextLevel) * 100,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const useStreakProtection = async (): Promise<boolean> => {
    if (!user || !stats || stats.streakProtections <= 0) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ streak_protections: stats.streakProtections - 1 })
        .eq('user_id', user.id);

      if (error) throw error;

      setStats(prev => prev ? { ...prev, streakProtections: prev.streakProtections - 1 } : null);
      return true;
    } catch (error) {
      console.error('Error using streak protection:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  return { stats, loading, refetch: fetchStats, useStreakProtection };
};
