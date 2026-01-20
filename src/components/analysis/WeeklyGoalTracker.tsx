import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useWeeklyGoals, goalTypeLabels, GoalType } from '@/hooks/useWeeklyGoals';
import { GoalSettingModal } from './GoalSettingModal';
import { Loader2, Plus, Flame, Trophy, Gift, Trash2, Target, FileQuestion, HelpCircle, BookOpen, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const iconMap: Record<string, React.ReactNode> = {
  FileQuestion: <FileQuestion className="h-5 w-5" />,
  HelpCircle: <HelpCircle className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  Clock: <Clock className="h-5 w-5" />,
  Target: <Target className="h-5 w-5" />,
};

export const WeeklyGoalTracker = () => {
  const { goals, streak, loading, createGoal, deleteGoal, claimReward } = useWeeklyGoals();
  const [showModal, setShowModal] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleClaimReward = async (goalId: string) => {
    setClaimingId(goalId);
    const reward = await claimReward(goalId);
    if (reward > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
    setClaimingId(null);
  };

  const getDaysRemaining = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    return daysUntilSunday;
  };

  const completedGoals = goals.filter(g => g.is_completed).length;
  const totalGoals = goals.length;

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-card/80 to-card/40 border-border/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Weekly Goals
            </CardTitle>
            <div className="flex items-center gap-4">
              {/* Streak Display */}
              {streak && streak.current_week_streak > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <span className="font-bold text-orange-500">{streak.current_week_streak} week streak</span>
                </div>
              )}
              
              {/* Days Remaining */}
              <Badge variant="outline" className="text-muted-foreground">
                {getDaysRemaining()} days left
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Progress */}
          {totalGoals > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Weekly Progress</span>
                <span className="text-foreground font-medium">{completedGoals} / {totalGoals} goals</span>
              </div>
              <Progress 
                value={(completedGoals / totalGoals) * 100} 
                className="h-3"
              />
            </div>
          )}

          {/* Goals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {goals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onClaim={() => handleClaimReward(goal.id)}
                  onDelete={() => deleteGoal(goal.id)}
                  claiming={claimingId === goal.id}
                />
              ))}
            </AnimatePresence>

            {/* Add Goal Button */}
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card 
                className="h-full min-h-[160px] border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors cursor-pointer bg-transparent"
                onClick={() => setShowModal(true)}
              >
                <CardContent className="flex flex-col items-center justify-center h-full py-6">
                  <div className="p-3 rounded-full bg-primary/10 mb-3">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-sm">Add New Goal</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Streak Rewards Info */}
          {streak && streak.longest_week_streak > 0 && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-foreground">Longest Streak</p>
                  <p className="text-xs text-muted-foreground">{streak.longest_week_streak} consecutive weeks</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{streak.total_weeks_completed}</p>
                <p className="text-xs text-muted-foreground">Total weeks completed</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <GoalSettingModal
        open={showModal}
        onOpenChange={setShowModal}
        onSave={createGoal}
        existingGoals={goals.map(g => g.goal_type as GoalType)}
      />
    </>
  );
};

interface GoalCardProps {
  goal: {
    id: string;
    goal_type: string;
    target_value: number;
    current_value: number;
    is_completed: boolean;
    xp_reward: number;
  };
  onClaim: () => void;
  onDelete: () => void;
  claiming: boolean;
}

const GoalCard = ({ goal, onClaim, onDelete, claiming }: GoalCardProps) => {
  const goalInfo = goalTypeLabels[goal.goal_type as GoalType];
  const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
  const icon = iconMap[goalInfo?.icon || 'Target'];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Card className={`relative overflow-hidden transition-all ${
        goal.is_completed 
          ? 'bg-green-500/10 border-green-500/30' 
          : 'bg-card/50 border-border/50'
      }`}>
        <CardContent className="pt-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                goal.is_completed ? 'bg-green-500/20 text-green-500' : 'bg-primary/10 text-primary'
              }`}>
                {icon}
              </div>
              <div>
                <p className="font-medium text-foreground">{goalInfo?.label}</p>
                <p className="text-sm text-muted-foreground">
                  {goal.current_value} / {goal.target_value} {goalInfo?.unit}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <Progress 
              value={progress} 
              className={`h-2 ${goal.is_completed ? '[&>div]:bg-green-500' : ''}`}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(progress)}% complete</span>
              <span className="flex items-center gap-1">
                <Gift className="h-3 w-3" />
                +{goal.xp_reward} XP
              </span>
            </div>
          </div>

          {/* Claim Button */}
          {goal.is_completed && (
            <Button
              className="w-full"
              variant="default"
              onClick={onClaim}
              disabled={claiming}
            >
              {claiming ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Gift className="h-4 w-4 mr-2" />
              )}
              Claim Reward
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
