
-- ============================================
-- ENHANCED ACHIEVEMENT SYSTEM FOR EDURANK
-- ============================================

-- 1. Add new columns to achievements table for categories, rewards, and tiers
ALTER TABLE public.achievements 
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'progress',
ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS reward_type text NOT NULL DEFAULT 'xp_multiplier',
ADD COLUMN IF NOT EXISTS reward_value jsonb NOT NULL DEFAULT '{"amount": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS unlock_formula text,
ADD COLUMN IF NOT EXISTS anti_cheat_rules jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- 2. Add progress tracking to user_achievements
ALTER TABLE public.user_achievements
ADD COLUMN IF NOT EXISTS progress numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_max numeric NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS reward_claimed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS reward_expires_at timestamp with time zone;

-- 3. Create user_rewards table for active rewards
CREATE TABLE IF NOT EXISTS public.user_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  reward_type text NOT NULL,
  reward_value jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  uses_remaining integer,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Create achievement_progress table for real-time tracking
CREATE TABLE IF NOT EXISTS public.achievement_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  current_value numeric NOT NULL DEFAULT 0,
  target_value numeric NOT NULL DEFAULT 1,
  metadata jsonb DEFAULT '{}'::jsonb,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- 5. Add XP system to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_xp integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_multiplier numeric NOT NULL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS streak_protections integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_highlights jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS unlocked_modes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS leaderboard_visibility text NOT NULL DEFAULT 'standard';

-- 6. Add tracking fields to quiz_results
ALTER TABLE public.quiz_results
ADD COLUMN IF NOT EXISTS topic_id uuid,
ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS time_taken_seconds integer,
ADD COLUMN IF NOT EXISTS previous_score numeric;

-- 7. Create topic_mastery table
CREATE TABLE IF NOT EXISTS public.topic_mastery (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  quizzes_completed integer NOT NULL DEFAULT 0,
  high_score_streak integer NOT NULL DEFAULT 0,
  average_score numeric NOT NULL DEFAULT 0,
  best_score numeric NOT NULL DEFAULT 0,
  total_correct integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  fastest_completion integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

-- 8. Enable RLS on new tables
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_mastery ENABLE ROW LEVEL SECURITY;

-- 9. RLS policies for user_rewards
CREATE POLICY "Users can view their own rewards"
ON public.user_rewards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own rewards"
ON public.user_rewards FOR UPDATE
USING (auth.uid() = user_id);

-- 10. RLS policies for achievement_progress
CREATE POLICY "Users can view their own achievement progress"
ON public.achievement_progress FOR SELECT
USING (auth.uid() = user_id);

-- 11. RLS policies for topic_mastery
CREATE POLICY "Users can view their own topic mastery"
ON public.topic_mastery FOR SELECT
USING (auth.uid() = user_id);

-- 12. Clear existing achievements and add comprehensive new ones
DELETE FROM public.user_achievements;
DELETE FROM public.achievements;

-- Insert all achievements by category
INSERT INTO public.achievements (name, description, icon, requirement_type, requirement_value, category, tier, reward_type, reward_value, unlock_formula, anti_cheat_rules, sort_order) VALUES
-- PROGRESS & COMEBACK
('First Steps', 'Complete your first quiz', 'baby', 'quizzes_completed', 1, 'progress', 'bronze', 'xp_bonus', '{"amount": 50}', 'total_quizzes >= 1', '{}', 1),
('Rising Star', 'Improve your score by 30% from previous quiz', 'trending-up', 'improvement', 30, 'progress', 'silver', 'xp_multiplier', '{"amount": 1.25, "duration_hours": 24}', '((current_score - previous_score) / previous_score) * 100 >= 30', '{"min_questions": 5}', 2),
('Redemption Arc', 'Score 85%+ after previously scoring below 50% on the same topic', 'refresh-cw', 'comeback', 85, 'progress', 'gold', 'streak_protection', '{"uses": 1}', 'previous_topic_score < 50 AND current_topic_score >= 85', '{"same_topic": true, "same_difficulty": true}', 3),
('Bounce Back', 'Improve a weak topic score by 30%+', 'crown', 'weakness_improvement', 30, 'progress', 'silver', 'xp_multiplier', '{"amount": 1.5, "duration_hours": 48}', 'weakness_improvement >= 30', '{}', 4),

-- SPEED & EFFICIENCY
('Lightning Thinker', 'Complete a quiz in under 2 minutes with 80%+ accuracy', 'zap', 'speed_accuracy', 80, 'speed', 'silver', 'profile_highlight', '{"badge": "speed_demon", "color": "yellow"}', 'time_taken < 120 AND accuracy >= 80', '{"min_questions": 5}', 10),
('Speed Demon', 'Complete 10 quizzes under 3 minutes each', 'timer', 'speed_streak', 10, 'speed', 'gold', 'xp_multiplier', '{"amount": 1.5, "duration_hours": 72}', 'fast_quizzes_count >= 10', '{"max_time": 180}', 11),
('Blitz Master', 'Answer 50 questions correctly in under 10 seconds each', 'bolt', 'fast_answers', 50, 'speed', 'platinum', 'unlock_mode', '{"mode": "blitz_challenge"}', 'fast_correct_answers >= 50', '{"max_time_per_question": 10}', 12),

-- CONSISTENCY & STREAKS
('Week Warrior', 'Maintain a 7-day streak', 'flame', 'streak_days', 7, 'consistency', 'bronze', 'xp_bonus', '{"amount": 100}', 'current_streak >= 7', '{}', 20),
('Discipline King', 'Maintain a 30-day streak', 'medal', 'streak_days', 30, 'consistency', 'gold', 'streak_protection', '{"uses": 3}', 'current_streak >= 30', '{}', 21),
('Iron Will', 'Maintain a 60-day streak', 'shield', 'streak_days', 60, 'consistency', 'platinum', 'profile_highlight', '{"badge": "iron_will", "color": "purple", "animated": true}', 'current_streak >= 60', '{}', 22),
('Daily Scholar', 'Complete at least one quiz every day for 14 days', 'calendar', 'daily_active', 14, 'consistency', 'silver', 'xp_multiplier', '{"amount": 1.3, "duration_hours": 48}', 'daily_active_days >= 14', '{}', 23),

-- TOPIC MASTERY
('Topic Conqueror', 'Score 90%+ in 3 quizzes on the same topic', 'target', 'topic_mastery', 3, 'mastery', 'gold', 'profile_highlight', '{"badge": "topic_master", "topic_specific": true}', 'topic_high_scores >= 3', '{"same_topic": true, "min_score": 90}', 30),
('Subject Expert', 'Master 5 different topics (90%+ average)', 'award', 'multi_topic_mastery', 5, 'mastery', 'platinum', 'leaderboard_visibility', '{"level": "expert", "icon": "star"}', 'mastered_topics >= 5', '{"min_average": 90}', 31),
('Polymath', 'Complete quizzes in 10 different topics', 'globe', 'topic_diversity', 10, 'mastery', 'silver', 'xp_bonus', '{"amount": 200}', 'unique_topics >= 10', '{}', 32),

-- ACCURACY
('Perfectionist', 'Get a perfect score on a quiz', 'star', 'perfect_score', 100, 'accuracy', 'gold', 'xp_multiplier', '{"amount": 2.0, "duration_hours": 24}', 'score = 100', '{"min_questions": 5}', 40),
('Flawless Five', 'Get 5 perfect scores', 'sparkles', 'perfect_count', 5, 'accuracy', 'platinum', 'profile_highlight', '{"badge": "perfectionist", "color": "gold", "animated": true}', 'perfect_scores >= 5', '{"min_questions": 5}', 41),
('Sharpshooter', 'Answer 100 questions correctly in a row', 'crosshair', 'correct_streak', 100, 'accuracy', 'diamond', 'unlock_mode', '{"mode": "precision_mode"}', 'correct_answer_streak >= 100', '{}', 42),
('Accuracy Ace', 'Maintain 95%+ average across 20 quizzes', 'check-circle', 'sustained_accuracy', 95, 'accuracy', 'gold', 'leaderboard_visibility', '{"level": "ace", "icon": "target"}', 'average_score >= 95 AND total_quizzes >= 20', '{}', 43),

-- LEADERBOARD & COMPETITION
('Rising Rank', 'Reach top 50 on the leaderboard', 'trending-up', 'leaderboard_rank', 50, 'competition', 'bronze', 'profile_highlight', '{"badge": "rising", "color": "green"}', 'leaderboard_rank <= 50', '{}', 50),
('Top Performer', 'Reach top 10 on the leaderboard', 'trophy', 'leaderboard_rank', 10, 'competition', 'gold', 'profile_highlight', '{"badge": "top_ten", "color": "gold", "animated": true}', 'leaderboard_rank <= 10', '{}', 51),
('Champion', 'Reach #1 on the leaderboard', 'crown', 'leaderboard_rank', 1, 'competition', 'diamond', 'profile_highlight', '{"badge": "champion", "color": "rainbow", "animated": true, "exclusive": true}', 'leaderboard_rank = 1', '{}', 52),
('Rival Slayer', 'Surpass 10 users on the leaderboard in a single day', 'swords', 'daily_overtakes', 10, 'competition', 'silver', 'xp_bonus', '{"amount": 150}', 'daily_rank_improvements >= 10', '{}', 53),

-- EXPLORATION
('Quiz Enthusiast', 'Complete 10 quizzes', 'brain', 'quizzes_completed', 10, 'exploration', 'bronze', 'xp_bonus', '{"amount": 75}', 'total_quizzes >= 10', '{}', 60),
('Quiz Master', 'Complete 50 quizzes', 'graduation-cap', 'quizzes_completed', 50, 'exploration', 'silver', 'streak_protection', '{"uses": 1}', 'total_quizzes >= 50', '{}', 61),
('Quiz Legend', 'Complete 100 quizzes', 'book-open', 'quizzes_completed', 100, 'exploration', 'gold', 'profile_highlight', '{"badge": "legend", "color": "purple"}', 'total_quizzes >= 100', '{}', 62),
('Note Taker', 'Create 5 AI-generated notes', 'notebook-pen', 'notes_created', 5, 'exploration', 'bronze', 'xp_bonus', '{"amount": 50}', 'notes_count >= 5', '{}', 63),
('Scholar', 'Create 20 AI-generated notes', 'book-open', 'notes_created', 20, 'exploration', 'silver', 'xp_bonus', '{"amount": 150}', 'notes_count >= 20', '{}', 64),
('Video Explorer', 'Watch 10 recommended videos', 'play-circle', 'videos_watched', 10, 'exploration', 'bronze', 'xp_bonus', '{"amount": 75}', 'videos_watched >= 10', '{}', 65),

-- ELITE / POWER USERS
('Quiz God', 'Complete 100+ quizzes with 90%+ average', 'infinity', 'elite_quizzer', 100, 'elite', 'diamond', 'unlock_mode', '{"mode": "god_mode", "features": ["custom_difficulty", "unlimited_retries"]}', 'total_quizzes >= 100 AND average_score >= 90', '{}', 70),
('Streak Immortal', 'Achieve a 100-day streak', 'flame', 'streak_days', 100, 'elite', 'diamond', 'profile_highlight', '{"badge": "immortal", "color": "fire", "animated": true, "particles": true}', 'longest_streak >= 100', '{}', 71),
('Grand Master', 'Unlock 20 other achievements', 'gem', 'achievements_unlocked', 20, 'elite', 'diamond', 'leaderboard_visibility', '{"level": "grandmaster", "icon": "crown", "color": "rainbow"}', 'unlocked_achievements >= 20', '{}', 72),
('The Founder', 'Be among the first 100 users', 'flag', 'early_adopter', 100, 'elite', 'platinum', 'profile_highlight', '{"badge": "founder", "color": "vintage", "permanent": true}', 'user_number <= 100', '{"one_time": true}', 73);

-- 13. Create function to update achievement progress
CREATE OR REPLACE FUNCTION public.update_achievement_progress(
  p_user_id uuid,
  p_achievement_id uuid,
  p_current_value numeric,
  p_target_value numeric,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.achievement_progress (user_id, achievement_id, current_value, target_value, metadata, last_updated)
  VALUES (p_user_id, p_achievement_id, p_current_value, p_target_value, p_metadata, now())
  ON CONFLICT (user_id, achievement_id) DO UPDATE SET
    current_value = EXCLUDED.current_value,
    target_value = EXCLUDED.target_value,
    metadata = EXCLUDED.metadata,
    last_updated = now();
END;
$$;

-- 14. Create comprehensive achievement check function
CREATE OR REPLACE FUNCTION public.check_achievements_v2(uid uuid)
RETURNS TABLE(
  achievement_id uuid, 
  achievement_name text, 
  category text,
  tier text,
  just_unlocked boolean,
  progress numeric,
  progress_max numeric,
  reward_type text,
  reward_value jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_total_quizzes integer;
  v_current_streak integer;
  v_longest_streak integer;
  v_best_score numeric;
  v_average_score numeric;
  v_notes_count integer;
  v_perfect_scores integer;
  v_unlocked_count integer;
  v_achievement record;
  v_is_unlocked boolean;
  v_current_progress numeric;
  v_target numeric;
BEGIN
  -- Get comprehensive user stats
  SELECT ls.total_quizzes, ls.current_streak, ls.longest_streak, ls.best_score, ls.average_score
  INTO v_total_quizzes, v_current_streak, v_longest_streak, v_best_score, v_average_score
  FROM public.leaderboard_stats ls
  WHERE ls.user_id = uid;
  
  SELECT COUNT(*) INTO v_notes_count
  FROM public.notes n WHERE n.user_id = uid AND n.is_ai_generated = true;
  
  SELECT COUNT(*) INTO v_perfect_scores
  FROM public.quiz_results qr WHERE qr.user_id = uid AND qr.score = 100;
  
  SELECT COUNT(*) INTO v_unlocked_count
  FROM public.user_achievements ua WHERE ua.user_id = uid;
  
  -- Set defaults
  v_total_quizzes := COALESCE(v_total_quizzes, 0);
  v_current_streak := COALESCE(v_current_streak, 0);
  v_longest_streak := COALESCE(v_longest_streak, 0);
  v_best_score := COALESCE(v_best_score, 0);
  v_average_score := COALESCE(v_average_score, 0);
  v_notes_count := COALESCE(v_notes_count, 0);
  v_perfect_scores := COALESCE(v_perfect_scores, 0);
  v_unlocked_count := COALESCE(v_unlocked_count, 0);
  
  FOR v_achievement IN 
    SELECT a.* FROM public.achievements a ORDER BY a.sort_order
  LOOP
    v_is_unlocked := EXISTS (
      SELECT 1 FROM public.user_achievements ua 
      WHERE ua.user_id = uid AND ua.achievement_id = v_achievement.id
    );
    
    -- Calculate progress based on requirement type
    v_target := v_achievement.requirement_value;
    v_current_progress := 0;
    
    CASE v_achievement.requirement_type
      WHEN 'quizzes_completed' THEN v_current_progress := v_total_quizzes;
      WHEN 'streak_days' THEN v_current_progress := GREATEST(v_current_streak, v_longest_streak);
      WHEN 'perfect_score' THEN v_current_progress := v_best_score;
      WHEN 'perfect_count' THEN v_current_progress := v_perfect_scores;
      WHEN 'notes_created' THEN v_current_progress := v_notes_count;
      WHEN 'achievements_unlocked' THEN v_current_progress := v_unlocked_count;
      WHEN 'sustained_accuracy' THEN 
        IF v_total_quizzes >= 20 THEN v_current_progress := v_average_score;
        ELSE v_current_progress := 0; END IF;
      ELSE v_current_progress := 0;
    END CASE;
    
    -- Update progress tracking
    PERFORM public.update_achievement_progress(uid, v_achievement.id, LEAST(v_current_progress, v_target), v_target);
    
    -- Check if should unlock
    IF NOT v_is_unlocked AND v_current_progress >= v_target THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, progress, progress_max)
      VALUES (uid, v_achievement.id, v_target, v_target)
      ON CONFLICT DO NOTHING;
      
      -- Grant reward
      INSERT INTO public.user_rewards (user_id, achievement_id, reward_type, reward_value, expires_at)
      VALUES (
        uid, 
        v_achievement.id, 
        v_achievement.reward_type, 
        v_achievement.reward_value,
        CASE 
          WHEN v_achievement.reward_value->>'duration_hours' IS NOT NULL 
          THEN now() + ((v_achievement.reward_value->>'duration_hours')::integer * interval '1 hour')
          ELSE NULL
        END
      );
      
      -- Update XP
      IF v_achievement.reward_type = 'xp_bonus' THEN
        UPDATE public.profiles 
        SET total_xp = total_xp + (v_achievement.reward_value->>'amount')::integer
        WHERE public.profiles.user_id = uid;
      END IF;
      
      achievement_id := v_achievement.id;
      achievement_name := v_achievement.name;
      category := v_achievement.category;
      tier := v_achievement.tier;
      just_unlocked := true;
      progress := v_target;
      progress_max := v_target;
      reward_type := v_achievement.reward_type;
      reward_value := v_achievement.reward_value;
      RETURN NEXT;
    ELSE
      achievement_id := v_achievement.id;
      achievement_name := v_achievement.name;
      category := v_achievement.category;
      tier := v_achievement.tier;
      just_unlocked := false;
      progress := LEAST(v_current_progress, v_target);
      progress_max := v_target;
      reward_type := v_achievement.reward_type;
      reward_value := v_achievement.reward_value;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- 15. Create trigger to update topic mastery on quiz completion
CREATE OR REPLACE FUNCTION public.update_topic_mastery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW.topic_id IS NOT NULL THEN
    INSERT INTO public.topic_mastery (user_id, topic_id, quizzes_completed, average_score, best_score, total_correct, total_questions)
    VALUES (
      NEW.user_id, 
      NEW.topic_id, 
      1, 
      NEW.score, 
      NEW.score, 
      NEW.correct_answers, 
      NEW.total_questions
    )
    ON CONFLICT (user_id, topic_id) DO UPDATE SET
      quizzes_completed = public.topic_mastery.quizzes_completed + 1,
      average_score = (public.topic_mastery.average_score * public.topic_mastery.quizzes_completed + NEW.score) / (public.topic_mastery.quizzes_completed + 1),
      best_score = GREATEST(public.topic_mastery.best_score, NEW.score),
      total_correct = public.topic_mastery.total_correct + NEW.correct_answers,
      total_questions = public.topic_mastery.total_questions + NEW.total_questions,
      high_score_streak = CASE WHEN NEW.score >= 90 THEN public.topic_mastery.high_score_streak + 1 ELSE 0 END,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_topic_mastery_trigger ON public.quiz_results;
CREATE TRIGGER update_topic_mastery_trigger
AFTER INSERT ON public.quiz_results
FOR EACH ROW
EXECUTE FUNCTION public.update_topic_mastery();

-- 16. Index for performance
CREATE INDEX IF NOT EXISTS idx_achievement_progress_user ON public.achievement_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON public.user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_active ON public.user_rewards(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_topic_mastery_user ON public.topic_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements(category, sort_order);
