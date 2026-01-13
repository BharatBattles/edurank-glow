import { Sparkles, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';

interface XpLevelBarProps {
  level: number;
  totalXp: number;
  xpProgress: number;
  xpToNextLevel: number;
  xpMultiplier: number;
}

const XpLevelBar = ({ level, totalXp, xpProgress, xpToNextLevel, xpMultiplier }: XpLevelBarProps) => {
  const xpInLevel = Math.floor((xpProgress / 100) * xpToNextLevel);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 cursor-pointer hover:bg-muted/70 transition-colors"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Level Badge */}
          <div className="relative flex items-center justify-center">
            <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">{level}</span>
            </div>
            {xpMultiplier > 1 && (
              <motion.div 
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-secondary flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <Zap className="w-2.5 h-2.5 text-secondary-foreground" />
              </motion.div>
            )}
          </div>

          {/* XP Progress */}
          <div className="hidden sm:flex flex-col min-w-[100px]">
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="font-medium text-foreground">{totalXp.toLocaleString()}</span>
                <span>XP</span>
              </span>
            </div>
            <Progress value={xpProgress} className="h-1.5" />
          </div>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Level</span>
            <span className="font-bold">{level}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Total XP</span>
            <span className="font-medium">{totalXp.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Next Level</span>
            <span className="font-medium">{xpInLevel}/{xpToNextLevel}</span>
          </div>
          {xpMultiplier > 1 && (
            <div className="flex items-center justify-between gap-4 text-secondary">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                XP Boost
              </span>
              <span className="font-bold">{xpMultiplier}x</span>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default XpLevelBar;
