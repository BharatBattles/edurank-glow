import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Gift, Clock, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { getAchievementIcon } from './iconMap';
import { 
  Achievement, 
  AchievementProgress,
  UserAchievement,
  TIER_INFO, 
  REWARD_LABELS 
} from './types';

interface AchievementCardProps {
  achievement: Achievement;
  progress?: AchievementProgress;
  userAchievement?: UserAchievement;
  isNew?: boolean;
  onClaim?: () => void;
}

const AchievementCard = ({
  achievement, 
  progress, 
  userAchievement,
  isNew = false,
  onClaim 
}: AchievementCardProps) => {
  const [showReward, setShowReward] = useState(false);
  
  const isUnlocked = !!userAchievement;
  const IconComponent = getAchievementIcon(achievement.icon);
  const tierInfo = TIER_INFO[achievement.tier];
  
  const currentProgress = progress?.current_value || 0;
  const targetProgress = progress?.target_value || achievement.requirement_value;
  const progressPercent = Math.min((currentProgress / targetProgress) * 100, 100);
  
  const formatReward = () => {
    const { reward_type, reward_value } = achievement;
    switch (reward_type) {
      case 'xp_bonus':
        return `+${reward_value.amount} XP`;
      case 'xp_multiplier':
        return `${reward_value.amount}x XP for ${reward_value.duration_hours}h`;
      case 'streak_protection':
        return `${reward_value.uses} Streak Shield${(reward_value.uses || 1) > 1 ? 's' : ''}`;
      case 'profile_highlight':
        return `"${reward_value.badge}" Badge`;
      case 'leaderboard_visibility':
        return `${reward_value.level} Flair`;
      case 'unlock_mode':
        return `${reward_value.mode} Mode`;
      default:
        return REWARD_LABELS[reward_type];
    }
  };

  const getTimeRemaining = () => {
    if (!userAchievement?.reward_expires_at) return null;
    const expires = new Date(userAchievement.reward_expires_at);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d left`;
    return `${hours}h left`;
  };

  return (
    <motion.div
      layout
      initial={isNew ? { scale: 0.8, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "relative rounded-xl border-2 p-4 transition-all duration-300",
        isUnlocked 
          ? `${tierInfo.bgColor} ${tierInfo.borderColor}` 
          : "bg-muted/30 border-border/50",
        isNew && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      {/* NEW badge */}
      <AnimatePresence>
        {isNew && (
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: -12 }}
            exit={{ scale: 0 }}
            className="absolute -top-2 -right-2 z-10"
          >
            <span className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              <Sparkles className="h-3 w-3" />
              NEW
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lock overlay */}
      {!isUnlocked && (
        <div className="absolute inset-0 bg-background/40 rounded-xl backdrop-blur-[1px] flex items-center justify-center z-10">
          <Lock className="h-6 w-6 text-muted-foreground/60" />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "p-2 rounded-lg shrink-0",
          isUnlocked ? "bg-background/50" : "bg-muted/50"
        )}>
          <IconComponent className={cn(
            "h-6 w-6",
            isUnlocked ? tierInfo.color : "text-muted-foreground/50"
          )} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn(
              "font-semibold text-sm truncate",
              isUnlocked ? "text-foreground" : "text-muted-foreground"
            )}>
              {achievement.name}
            </h4>
            <span className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wide",
              tierInfo.bgColor,
              tierInfo.color
            )}>
              {tierInfo.label}
            </span>
          </div>
          
          <p className={cn(
            "text-xs mb-2 line-clamp-2",
            isUnlocked ? "text-muted-foreground" : "text-muted-foreground/60"
          )}>
            {achievement.description}
          </p>

          {/* Progress bar */}
          {!isUnlocked && (
            <div className="space-y-1">
              <Progress value={progressPercent} className="h-1.5" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{Math.floor(currentProgress)} / {targetProgress}</span>
                <span>{Math.floor(progressPercent)}%</span>
              </div>
            </div>
          )}

          {/* Reward preview */}
          {isUnlocked && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setShowReward(!showReward)}
                className="flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                <Gift className="h-3 w-3" />
                {formatReward()}
              </button>
              {getTimeRemaining() && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {getTimeRemaining()}
                </span>
              )}
            </div>
          )}

          {/* Reward details */}
          <AnimatePresence>
            {showReward && isUnlocked && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 p-2 bg-background/50 rounded-lg text-[11px]">
                  <p className="font-medium mb-1">Reward: {REWARD_LABELS[achievement.reward_type]}</p>
                  <p className="text-muted-foreground">{formatReward()}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default AchievementCard;
