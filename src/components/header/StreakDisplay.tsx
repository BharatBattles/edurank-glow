import { Flame, Shield, ShieldCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  streakProtections: number;
  onStreakClick?: () => void;
}

const StreakDisplay = ({ 
  currentStreak, 
  longestStreak, 
  streakProtections,
  onStreakClick 
}: StreakDisplayProps) => {
  const hasStreak = currentStreak > 0;
  const hasProtection = streakProtections > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div 
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full cursor-pointer transition-all",
            hasStreak 
              ? "bg-orange-500/20 border border-orange-500/30 hover:bg-orange-500/30" 
              : "bg-muted/50 border border-border/50 hover:bg-muted/70"
          )}
          onClick={onStreakClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={hasStreak ? { 
              scale: [1, 1.2, 1],
            } : {}}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              repeatType: 'reverse' 
            }}
          >
            <Flame className={cn(
              "w-4 h-4",
              hasStreak ? "text-orange-500" : "text-muted-foreground"
            )} />
          </motion.div>
          
          <span className={cn(
            "text-sm font-bold",
            hasStreak ? "text-orange-500" : "text-muted-foreground"
          )}>
            {currentStreak}
          </span>

          {/* Shield indicator */}
          {hasProtection && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="relative"
            >
              <ShieldCheck className="w-4 h-4 text-primary" />
              {streakProtections > 1 && (
                <span className="absolute -top-1 -right-1 text-[10px] font-bold text-primary">
                  {streakProtections}
                </span>
              )}
            </motion.div>
          )}
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Flame className="w-4 h-4 text-orange-500" />
              Current Streak
            </span>
            <span className="font-bold text-orange-500">{currentStreak} days</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Best Streak</span>
            <span className="font-medium">{longestStreak} days</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Shield className="w-4 h-4 text-primary" />
              Streak Shields
            </span>
            <span className={cn(
              "font-bold",
              hasProtection ? "text-primary" : "text-muted-foreground"
            )}>
              {streakProtections}
            </span>
          </div>
          {hasProtection && (
            <p className="text-xs text-muted-foreground pt-1 border-t border-border">
              Shields protect your streak when you miss a day
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default StreakDisplay;
