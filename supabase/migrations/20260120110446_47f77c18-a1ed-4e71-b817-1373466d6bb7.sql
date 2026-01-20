-- Weekly Study Goals table
CREATE TABLE public.weekly_study_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('quizzes', 'questions', 'topics', 'study_time', 'accuracy')),
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  xp_reward INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start, goal_type)
);

-- Enable RLS
ALTER TABLE public.weekly_study_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weekly_study_goals
CREATE POLICY "Users can view own goals" ON public.weekly_study_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals" ON public.weekly_study_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON public.weekly_study_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON public.weekly_study_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Weekly Goal Streaks table
CREATE TABLE public.weekly_goal_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_week_streak INTEGER DEFAULT 0,
  longest_week_streak INTEGER DEFAULT 0,
  last_completed_week DATE,
  total_weeks_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.weekly_goal_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weekly_goal_streaks
CREATE POLICY "Users can view own streaks" ON public.weekly_goal_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own streaks" ON public.weekly_goal_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks" ON public.weekly_goal_streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to get the start of the current week (Monday)
CREATE OR REPLACE FUNCTION public.get_week_start(d DATE DEFAULT CURRENT_DATE)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (d - EXTRACT(DOW FROM d)::INTEGER + 1)::DATE
$$;

-- Function to update goal progress
CREATE OR REPLACE FUNCTION public.update_goal_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  week_start_date DATE;
BEGIN
  week_start_date := get_week_start(CURRENT_DATE);
  
  -- Update quizzes goal
  UPDATE weekly_study_goals
  SET current_value = current_value + 1,
      updated_at = now(),
      is_completed = CASE WHEN current_value + 1 >= target_value THEN TRUE ELSE is_completed END,
      completed_at = CASE WHEN current_value + 1 >= target_value AND NOT is_completed THEN now() ELSE completed_at END
  WHERE user_id = NEW.user_id
    AND goal_type = 'quizzes'
    AND week_start = week_start_date
    AND NOT is_completed;

  -- Update questions goal
  UPDATE weekly_study_goals
  SET current_value = current_value + NEW.total_questions,
      updated_at = now(),
      is_completed = CASE WHEN current_value + NEW.total_questions >= target_value THEN TRUE ELSE is_completed END,
      completed_at = CASE WHEN current_value + NEW.total_questions >= target_value AND NOT is_completed THEN now() ELSE completed_at END
  WHERE user_id = NEW.user_id
    AND goal_type = 'questions'
    AND week_start = week_start_date
    AND NOT is_completed;

  RETURN NEW;
END;
$$;

-- Create trigger on quiz_results
CREATE TRIGGER on_quiz_complete_update_goals
  AFTER INSERT ON public.quiz_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_goal_progress();

-- Timestamp update trigger
CREATE TRIGGER update_weekly_study_goals_updated_at
  BEFORE UPDATE ON public.weekly_study_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_goal_streaks_updated_at
  BEFORE UPDATE ON public.weekly_goal_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();