export type AchievementCategory = 
  | 'progress' 
  | 'speed' 
  | 'consistency' 
  | 'mastery' 
  | 'accuracy' 
  | 'competition' 
  | 'exploration' 
  | 'elite';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export type RewardType = 
  | 'xp_bonus' 
  | 'xp_multiplier' 
  | 'streak_protection' 
  | 'profile_highlight' 
  | 'leaderboard_visibility' 
  | 'unlock_mode';

export interface RewardValue {
  amount?: number;
  duration_hours?: number;
  uses?: number;
  badge?: string;
  color?: string;
  animated?: boolean;
  particles?: boolean;
  permanent?: boolean;
  exclusive?: boolean;
  level?: string;
  icon?: string;
  mode?: string;
  features?: string[];
  topic_specific?: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  category: AchievementCategory;
  tier: AchievementTier;
  reward_type: RewardType;
  reward_value: RewardValue;
  unlock_formula?: string;
  anti_cheat_rules?: Record<string, unknown>;
  is_hidden: boolean;
  sort_order: number;
}

export interface AchievementProgress {
  achievement_id: string;
  current_value: number;
  target_value: number;
  metadata?: Record<string, unknown>;
}

export interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
  progress: number;
  progress_max: number;
  reward_claimed: boolean;
  reward_expires_at?: string;
}

export interface UserReward {
  id: string;
  achievement_id: string;
  reward_type: RewardType;
  reward_value: RewardValue;
  is_active: boolean;
  uses_remaining?: number;
  expires_at?: string;
}

export interface CheckAchievementResult {
  achievement_id: string;
  achievement_name: string;
  category: AchievementCategory;
  tier: AchievementTier;
  just_unlocked: boolean;
  progress: number;
  progress_max: number;
  reward_type: RewardType;
  reward_value: RewardValue;
}

export const CATEGORY_INFO: Record<AchievementCategory, { label: string; icon: string; color: string }> = {
  progress: { label: 'Progress & Comeback', icon: 'trending-up', color: 'text-green-500' },
  speed: { label: 'Speed & Efficiency', icon: 'zap', color: 'text-yellow-500' },
  consistency: { label: 'Consistency & Streaks', icon: 'flame', color: 'text-orange-500' },
  mastery: { label: 'Topic Mastery', icon: 'target', color: 'text-blue-500' },
  accuracy: { label: 'Accuracy', icon: 'crosshair', color: 'text-purple-500' },
  competition: { label: 'Leaderboard', icon: 'trophy', color: 'text-amber-500' },
  exploration: { label: 'Exploration', icon: 'compass', color: 'text-cyan-500' },
  elite: { label: 'Elite', icon: 'gem', color: 'text-pink-500' },
};

export const TIER_INFO: Record<AchievementTier, { label: string; color: string; bgColor: string; borderColor: string }> = {
  bronze: { label: 'Bronze', color: 'text-amber-700', bgColor: 'bg-amber-100', borderColor: 'border-amber-400' },
  silver: { label: 'Silver', color: 'text-slate-500', bgColor: 'bg-slate-100', borderColor: 'border-slate-400' },
  gold: { label: 'Gold', color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-500' },
  platinum: { label: 'Platinum', color: 'text-cyan-600', bgColor: 'bg-cyan-100', borderColor: 'border-cyan-400' },
  diamond: { label: 'Diamond', color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-400' },
};

export const REWARD_LABELS: Record<RewardType, string> = {
  xp_bonus: 'XP Bonus',
  xp_multiplier: 'XP Multiplier',
  streak_protection: 'Streak Shield',
  profile_highlight: 'Profile Badge',
  leaderboard_visibility: 'Leaderboard Flair',
  unlock_mode: 'New Mode',
};
