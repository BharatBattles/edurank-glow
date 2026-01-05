-- Create atomic credit consumption function to prevent race conditions
CREATE OR REPLACE FUNCTION public.consume_credits(uid uuid, amount integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  success boolean;
BEGIN
  UPDATE public.user_credits
  SET credits_remaining = credits_remaining - amount,
      credits_used = credits_used + amount,
      updated_at = now()
  WHERE user_id = uid 
    AND credits_remaining >= amount
  RETURNING true INTO success;
  
  RETURN COALESCE(success, false);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.consume_credits(uuid, integer) TO authenticated;

-- Create function to check and reset credits monthly
CREATE OR REPLACE FUNCTION public.check_and_reset_credits(uid uuid)
RETURNS TABLE(credits_remaining integer, credits_used integer, was_reset boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_last_reset timestamp with time zone;
  v_was_reset boolean := false;
BEGIN
  -- Get last reset time
  SELECT uc.last_reset_at INTO v_last_reset
  FROM public.user_credits uc
  WHERE uc.user_id = uid;
  
  -- If more than a month has passed, reset credits
  IF v_last_reset IS NOT NULL AND v_last_reset < now() - interval '1 month' THEN
    UPDATE public.user_credits uc
    SET credits_remaining = 50,
        credits_used = 0,
        last_reset_at = now(),
        updated_at = now()
    WHERE uc.user_id = uid;
    v_was_reset := true;
  END IF;
  
  -- Return current credits
  RETURN QUERY
  SELECT uc.credits_remaining, uc.credits_used, v_was_reset
  FROM public.user_credits uc
  WHERE uc.user_id = uid;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_and_reset_credits(uuid) TO authenticated;

-- Create function to check and unlock achievements
CREATE OR REPLACE FUNCTION public.check_achievements(uid uuid)
RETURNS TABLE(achievement_id uuid, achievement_name text, just_unlocked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total_quizzes integer;
  v_current_streak integer;
  v_best_score numeric;
  v_notes_count integer;
  v_achievement record;
BEGIN
  -- Get user stats from leaderboard
  SELECT ls.total_quizzes, ls.current_streak, ls.best_score 
  INTO v_total_quizzes, v_current_streak, v_best_score
  FROM public.leaderboard_stats ls
  WHERE ls.user_id = uid;
  
  -- Get notes count
  SELECT COUNT(*) INTO v_notes_count
  FROM public.notes n
  WHERE n.user_id = uid AND n.is_ai_generated = true;
  
  -- Set defaults
  v_total_quizzes := COALESCE(v_total_quizzes, 0);
  v_current_streak := COALESCE(v_current_streak, 0);
  v_best_score := COALESCE(v_best_score, 0);
  v_notes_count := COALESCE(v_notes_count, 0);
  
  -- Check each achievement
  FOR v_achievement IN 
    SELECT a.id, a.name, a.requirement_type, a.requirement_value
    FROM public.achievements a
  LOOP
    -- Check if already unlocked
    IF NOT EXISTS (
      SELECT 1 FROM public.user_achievements ua 
      WHERE ua.user_id = uid AND ua.achievement_id = v_achievement.id
    ) THEN
      -- Check if requirement is met
      IF (v_achievement.requirement_type = 'quizzes_completed' AND v_total_quizzes >= v_achievement.requirement_value)
         OR (v_achievement.requirement_type = 'streak_days' AND v_current_streak >= v_achievement.requirement_value)
         OR (v_achievement.requirement_type = 'perfect_score' AND v_best_score >= v_achievement.requirement_value)
         OR (v_achievement.requirement_type = 'notes_created' AND v_notes_count >= v_achievement.requirement_value)
      THEN
        -- Unlock the achievement
        INSERT INTO public.user_achievements (user_id, achievement_id)
        VALUES (uid, v_achievement.id)
        ON CONFLICT DO NOTHING;
        
        achievement_id := v_achievement.id;
        achievement_name := v_achievement.name;
        just_unlocked := true;
        RETURN NEXT;
      END IF;
    ELSE
      achievement_id := v_achievement.id;
      achievement_name := v_achievement.name;
      just_unlocked := false;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_achievements(uuid) TO authenticated;