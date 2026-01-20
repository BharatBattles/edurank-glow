import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoalType, goalTypeLabels } from '@/hooks/useWeeklyGoals';
import { Gift, Target, FileQuestion, HelpCircle, BookOpen, Clock } from 'lucide-react';

interface GoalSettingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (goalType: GoalType, targetValue: number) => Promise<boolean>;
  existingGoals: GoalType[];
}

const iconMap: Record<string, React.ReactNode> = {
  FileQuestion: <FileQuestion className="h-5 w-5" />,
  HelpCircle: <HelpCircle className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  Clock: <Clock className="h-5 w-5" />,
  Target: <Target className="h-5 w-5" />,
};

const goalRanges: Record<GoalType, { min: number; max: number; step: number; default: number }> = {
  quizzes: { min: 1, max: 20, step: 1, default: 5 },
  questions: { min: 10, max: 200, step: 10, default: 50 },
  topics: { min: 1, max: 10, step: 1, default: 3 },
  study_time: { min: 15, max: 300, step: 15, default: 60 },
  accuracy: { min: 50, max: 100, step: 5, default: 75 },
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

export const GoalSettingModal = ({ 
  open, 
  onOpenChange, 
  onSave,
  existingGoals 
}: GoalSettingModalProps) => {
  const availableGoalTypes = (Object.keys(goalTypeLabels) as GoalType[])
    .filter(type => !existingGoals.includes(type));

  const [goalType, setGoalType] = useState<GoalType | ''>(availableGoalTypes[0] || '');
  const [targetValue, setTargetValue] = useState<number>(
    goalType ? goalRanges[goalType as GoalType].default : 5
  );
  const [saving, setSaving] = useState(false);

  const handleGoalTypeChange = (type: GoalType) => {
    setGoalType(type);
    setTargetValue(goalRanges[type].default);
  };

  const handleSave = async () => {
    if (!goalType) return;
    
    setSaving(true);
    const success = await onSave(goalType, targetValue);
    setSaving(false);
    
    if (success) {
      onOpenChange(false);
      // Reset for next time
      const nextAvailable = availableGoalTypes.filter(t => t !== goalType)[0];
      if (nextAvailable) {
        setGoalType(nextAvailable);
        setTargetValue(goalRanges[nextAvailable].default);
      }
    }
  };

  const currentRange = goalType ? goalRanges[goalType as GoalType] : null;
  const xpReward = goalType ? calculateXpReward(goalType as GoalType, targetValue) : 0;

  if (availableGoalTypes.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>All Goals Set!</DialogTitle>
            <DialogDescription>
              You've already set goals for all available categories this week. 
              Complete your current goals or wait until next week to set new ones.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Set Weekly Goal
          </DialogTitle>
          <DialogDescription>
            Choose a goal type and set your target for this week.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Goal Type Selection */}
          <div className="space-y-2">
            <Label>Goal Type</Label>
            <Select value={goalType} onValueChange={(v) => handleGoalTypeChange(v as GoalType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a goal type" />
              </SelectTrigger>
              <SelectContent>
                {availableGoalTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      {iconMap[goalTypeLabels[type].icon]}
                      <span>{goalTypeLabels[type].label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Value Slider */}
          {currentRange && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Target</Label>
                <span className="text-lg font-bold text-primary">
                  {targetValue} {goalTypeLabels[goalType as GoalType].unit}
                </span>
              </div>
              <Slider
                value={[targetValue]}
                onValueChange={([value]) => setTargetValue(value)}
                min={currentRange.min}
                max={currentRange.max}
                step={currentRange.step}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{currentRange.min} {goalTypeLabels[goalType as GoalType].unit}</span>
                <span>{currentRange.max} {goalTypeLabels[goalType as GoalType].unit}</span>
              </div>
            </div>
          )}

          {/* XP Reward Preview */}
          {goalType && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <span className="text-sm text-foreground">Reward on completion</span>
              </div>
              <span className="font-bold text-primary">+{xpReward} XP</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!goalType || saving}>
            {saving ? 'Saving...' : 'Set Goal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
