import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useWeeklyGoals, goalTypeLabels, GoalType } from '@/hooks/useWeeklyGoals';
import { Loader2, Target, Flame, ChevronRight, Gift, Trophy } from 'lucide-react';

export const WeeklyGoalsWidget = () => {
  const navigate = useNavigate();
  const { goals, streak, loading } = useWeeklyGoals();

  const getDaysRemaining = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    return daysUntilSunday;
  };

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const completedGoals = goals.filter(g => g.is_completed).length;
  const totalGoals = goals.length;
  const hasClaimableRewards = goals.some(g => g.is_completed);
  const overallProgress = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  if (totalGoals === 0) {
    return (
      <Card 
        className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 cursor-pointer hover:border-primary/40 transition-colors"
        onClick={() => navigate('/analysis')}
      >
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Set Weekly Goals</p>
                <p className="text-sm text-muted-foreground">Track your progress and earn XP</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/80 to-card/40 border-border/50 backdrop-blur-sm overflow-hidden">
      <CardContent className="py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Weekly Goals</span>
          </div>
          <div className="flex items-center gap-2">
            {streak && streak.current_week_streak > 0 && (
              <div className="flex items-center gap-1 text-orange-500">
                <Flame className="h-4 w-4" />
                <span className="text-sm font-medium">{streak.current_week_streak}w</span>
              </div>
            )}
            <Badge variant="outline" className="text-xs">
              {getDaysRemaining()}d left
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">{completedGoals} of {totalGoals} goals</span>
            <span className="text-foreground font-medium">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Goal Pills */}
        <div className="flex flex-wrap gap-2">
          {goals.slice(0, 3).map(goal => {
            const goalInfo = goalTypeLabels[goal.goal_type as GoalType];
            const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
            
            return (
              <div
                key={goal.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
                  goal.is_completed 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-muted/50 text-muted-foreground border border-border/50'
                }`}
              >
                {goal.is_completed ? (
                  <Trophy className="h-3 w-3" />
                ) : (
                  <span className="font-medium">{Math.round(progress)}%</span>
                )}
                <span>{goalInfo?.label.split(' ')[0]}</span>
              </div>
            );
          })}
          {goals.length > 3 && (
            <div className="flex items-center px-3 py-1.5 rounded-full text-xs bg-muted/30 text-muted-foreground">
              +{goals.length - 3} more
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button
          variant={hasClaimableRewards ? 'default' : 'outline'}
          size="sm"
          className="w-full"
          onClick={() => navigate('/analysis')}
        >
          {hasClaimableRewards ? (
            <>
              <Gift className="h-4 w-4 mr-2" />
              Claim Rewards
            </>
          ) : (
            <>
              View Details
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
