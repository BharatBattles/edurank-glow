import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAchievementIcon } from './iconMap';
import { Achievement, TIER_INFO, REWARD_LABELS } from './types';
import confetti from 'canvas-confetti';

interface AchievementUnlockCelebrationProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const AchievementUnlockCelebration = ({ 
  achievement, 
  onClose 
}: AchievementUnlockCelebrationProps) => {
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    if (achievement) {
      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = achievement.tier === 'diamond' 
        ? ['#a855f7', '#ec4899', '#8b5cf6']
        : achievement.tier === 'gold'
        ? ['#fbbf24', '#f59e0b', '#d97706']
        : achievement.tier === 'platinum'
        ? ['#06b6d4', '#0891b2', '#0e7490']
        : ['#f97316', '#fb923c', '#fdba74'];

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Show reward after delay
      const timer = setTimeout(() => setShowReward(true), 800);
      return () => clearTimeout(timer);
    }
  }, [achievement]);

  if (!achievement) return null;
  const IconComponent = getAchievementIcon(achievement.icon);
  const tierInfo = TIER_INFO[achievement.tier];

  const formatReward = () => {
    const { reward_type, reward_value } = achievement;
    switch (reward_type) {
      case 'xp_bonus':
        return `+${reward_value.amount} XP`;
      case 'xp_multiplier':
        return `${reward_value.amount}x XP boost for ${reward_value.duration_hours} hours`;
      case 'streak_protection':
        return `${reward_value.uses} Streak Shield${(reward_value.uses || 1) > 1 ? 's' : ''} added`;
      case 'profile_highlight':
        return `"${reward_value.badge}" badge unlocked`;
      case 'leaderboard_visibility':
        return `${reward_value.level} flair activated`;
      case 'unlock_mode':
        return `${reward_value.mode} mode unlocked`;
      default:
        return REWARD_LABELS[reward_type];
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 15 }}
          className="relative w-full max-w-sm bg-card rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className={`absolute -inset-full ${tierInfo.bgColor} opacity-20`}
              style={{
                background: `conic-gradient(from 0deg, transparent, ${tierInfo.borderColor.replace('border-', 'var(--')}) 30%, transparent 60%)`
              }}
            />
          </div>

          {/* Content */}
          <div className="relative p-6 text-center">
            {/* Achievement unlocked text */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-2 mb-4"
            >
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                Achievement Unlocked!
              </span>
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </motion.div>

            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.3, damping: 10 }}
              className={`mx-auto w-20 h-20 rounded-2xl ${tierInfo.bgColor} border-2 ${tierInfo.borderColor} flex items-center justify-center mb-4`}
            >
              <IconComponent className={`h-10 w-10 ${tierInfo.color}`} />
            </motion.div>

            {/* Name and tier */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-xl font-bold mb-1">{achievement.name}</h2>
              <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${tierInfo.bgColor} ${tierInfo.color} uppercase tracking-wide`}>
                {tierInfo.label} Tier
              </span>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-muted-foreground mt-4 mb-6"
            >
              {achievement.description}
            </motion.p>

            {/* Reward */}
            <AnimatePresence>
              {showReward && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-4 rounded-xl bg-primary/10 border border-primary/20"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Reward Earned</span>
                  </div>
                  <p className="text-lg font-bold">{formatReward()}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Continue button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6"
            >
              <Button onClick={onClose} className="w-full">
                Awesome!
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AchievementUnlockCelebration;
