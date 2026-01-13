import { useState } from 'react';
import { Shield, ShieldCheck, Flame, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface StreakProtectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStreak: number;
  streakProtections: number;
  onUseProtection: () => Promise<boolean>;
}

const StreakProtectionModal = ({
  open,
  onOpenChange,
  currentStreak,
  streakProtections,
  onUseProtection,
}: StreakProtectionModalProps) => {
  const [isUsing, setIsUsing] = useState(false);
  const [used, setUsed] = useState(false);

  const handleUseProtection = async () => {
    setIsUsing(true);
    const success = await onUseProtection();
    setIsUsing(false);

    if (success) {
      setUsed(true);
      toast.success('Streak Shield activated! Your streak is safe.', {
        icon: <ShieldCheck className="w-4 h-4 text-primary" />,
      });
      setTimeout(() => {
        onOpenChange(false);
        setUsed(false);
      }, 2000);
    } else {
      toast.error('Failed to use Streak Shield');
    }
  };

  const hasProtection = streakProtections > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Streak Protection
          </DialogTitle>
          <DialogDescription>
            Use your Streak Shield to protect your progress when you miss a day.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <AnimatePresence mode="wait">
            {used ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center"
                >
                  <ShieldCheck className="w-10 h-10 text-primary" />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-primary">Shield Activated!</h3>
                  <p className="text-muted-foreground">Your {currentStreak}-day streak is protected</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="options"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Current streak display */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <Flame className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold">Current Streak</p>
                      <p className="text-2xl font-bold text-orange-500">{currentStreak} days</p>
                    </div>
                  </div>
                </div>

                {/* Shields available */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Streak Shields</p>
                      <p className="text-2xl font-bold text-primary">{streakProtections}</p>
                    </div>
                  </div>
                </div>

                {!hasProtection && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">No shields available</p>
                      <p className="text-xs text-muted-foreground">
                        Earn shields by unlocking achievements!
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!used && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUseProtection} 
              disabled={!hasProtection || isUsing}
              className="gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {isUsing ? 'Activating...' : 'Use Streak Shield'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StreakProtectionModal;
