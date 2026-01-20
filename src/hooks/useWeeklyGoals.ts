import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type GoalType = 'quizzes' | 'questions' | 'topics' | 'study_time' | 'accuracy';

export interface WeeklyGoal {
  id: string;
  user_id: string;
  week_start: string;
  goal_type: GoalType;
  target_value: number;
  current_value: number;
  is_completed: boolean;
  completed_at: string | null;
  xp_reward: number;
}

export interface WeeklyStreak {
  id: string;
  user_id: string;
  current_week_streak: number;
  longest_week_streak: number;
  last_completed_week: string | null;
  total_weeks_completed: number;
}

const getWeekStart = (date: Date = new Date()): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
};

export const useWeeklyGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [streak, setStreak] = useState<WeeklyStreak | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const weekStart = getWeekStart();
      
      // Fetch current week's goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('weekly_study_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStart);

      if (goalsError) throw goalsError;

      // Fetch streak data
      const { data: streakData, error: streakError } = await supabase
        .from('weekly_goal_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (streakError) throw streakError;

      setGoals((goalsData || []) as WeeklyGoal[]);
      setStreak(streakData as WeeklyStreak | null);
    } catch (error) {
      console.error('Error fetching weekly goals:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createGoal = async (goalType: GoalType, targetValue: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const weekStart = getWeekStart();
      const xpReward = calculateXpReward(goalType, targetValue);

      const { data, error } = await supabase
        .from('weekly_study_goals')
        .upsert({
          user_id: user.id,
          week_start: weekStart,
          goal_type: goalType,
          target_value: targetValue,
          xp_reward: xpReward,
        }, {
          onConflict: 'user_id,week_start,goal_type'
        })
        .select()
        .single();

      if (error) throw error;

      setGoals(prev => {
        const filtered = prev.filter(g => g.goal_type !== goalType);
        return [...filtered, data as WeeklyGoal];
      });

      toast.success('Weekly goal set!');
      return true;
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to set goal');
      return false;
    }
  };

  const deleteGoal = async (goalId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('weekly_study_goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) throw error;

      setGoals(prev => prev.filter(g => g.id !== goalId));
      toast.success('Goal removed');
      return true;
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to remove goal');
      return false;
    }
  };

  const claimReward = async (goalId: string): Promise<number> => {
    if (!user) return 0;

    const goal = goals.find(g => g.id === goalId);
    if (!goal || !goal.is_completed) return 0;

    try {
      // Update profile XP
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('total_xp')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      const newXp = (profile?.total_xp || 0) + goal.xp_reward;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ total_xp: newXp })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Check if all goals are completed this week
      const allCompleted = goals.every(g => g.is_completed);
      if (allCompleted) {
        await updateWeeklyStreak();
      }

      toast.success(`+${goal.xp_reward} XP earned!`);
      return goal.xp_reward;
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Failed to claim reward');
      return 0;
    }
  };

  const updateWeeklyStreak = async () => {
    if (!user) return;

    const weekStart = getWeekStart();
    
    try {
      const currentStreak = streak?.current_week_streak || 0;
      const newStreak = currentStreak + 1;
      const longestStreak = Math.max(streak?.longest_week_streak || 0, newStreak);

      const { error } = await supabase
        .from('weekly_goal_streaks')
        .upsert({
          user_id: user.id,
          current_week_streak: newStreak,
          longest_week_streak: longestStreak,
          last_completed_week: weekStart,
          total_weeks_completed: (streak?.total_weeks_completed || 0) + 1,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setStreak(prev => prev ? {
        ...prev,
        current_week_streak: newStreak,
        longest_week_streak: longestStreak,
        last_completed_week: weekStart,
        total_weeks_completed: prev.total_weeks_completed + 1,
      } : null);
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  return {
    goals,
    streak,
    loading,
    createGoal,
    deleteGoal,
    claimReward,
    refetch: fetchGoals,
  };
};

const calculateXpReward = (goalType: GoalType, targetValue: number): number => {
  const baseRewards: Record<GoalType, number> = {
    quizzes: 10,
    questions: 2,
    topics: 15,
    study_time: 1,
    accuracy: 20,
  };

  return Math.floor(baseRewards[goalType] * targetValue);
};

export const goalTypeLabels: Record<GoalType, { label: string; unit: string; icon: string }> = {
  quizzes: { label: 'Complete Quizzes', unit: 'quizzes', icon: 'FileQuestion' },
  questions: { label: 'Answer Questions', unit: 'questions', icon: 'HelpCircle' },
  topics: { label: 'Study Topics', unit: 'topics', icon: 'BookOpen' },
  study_time: { label: 'Study Time', unit: 'minutes', icon: 'Clock' },
  accuracy: { label: 'Maintain Accuracy', unit: '%', icon: 'Target' },
};
