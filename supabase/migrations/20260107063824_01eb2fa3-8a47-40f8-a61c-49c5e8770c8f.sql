-- Create table for topic/concept definitions
CREATE TABLE public.topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- Topics are readable by all authenticated users
CREATE POLICY "Authenticated users can view topics" 
ON public.topics FOR SELECT 
USING (true);

-- Create table to track user performance per topic
CREATE TABLE public.user_topic_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_time_seconds NUMERIC NOT NULL DEFAULT 0,
  avg_time_seconds NUMERIC NOT NULL DEFAULT 0,
  wrong_on_easy INTEGER NOT NULL DEFAULT 0,
  wrong_on_medium INTEGER NOT NULL DEFAULT 0,
  wrong_on_hard INTEGER NOT NULL DEFAULT 0,
  repeated_mistakes INTEGER NOT NULL DEFAULT 0,
  weakness_score NUMERIC NOT NULL DEFAULT 0,
  strength_status TEXT NOT NULL DEFAULT 'unknown' CHECK (strength_status IN ('strong', 'moderate', 'weak', 'unknown', 'insufficient_data')),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

-- Enable RLS
ALTER TABLE public.user_topic_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own topic performance" 
ON public.user_topic_performance FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own topic performance" 
ON public.user_topic_performance FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own topic performance" 
ON public.user_topic_performance FOR UPDATE 
USING (auth.uid() = user_id);

-- Create table for video-topic analysis
CREATE TABLE public.video_topic_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id TEXT NOT NULL,
  todo_id UUID NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  questions_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  mastery_score NUMERIC NOT NULL DEFAULT 0,
  is_weak_topic BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id, topic_id)
);

-- Enable RLS
ALTER TABLE public.video_topic_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own video topic analysis" 
ON public.video_topic_analysis FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video topic analysis" 
ON public.video_topic_analysis FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video topic analysis" 
ON public.video_topic_analysis FOR UPDATE 
USING (auth.uid() = user_id);

-- Create table for personalized recommendations
CREATE TABLE public.recommendation_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  todo_id UUID REFERENCES public.todos(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('weak_topic_quiz', 'review_notes', 'watch_video', 'micro_quiz')),
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 50,
  weakness_score NUMERIC,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.recommendation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendations" 
ON public.recommendation_queue FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recommendations" 
ON public.recommendation_queue FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations" 
ON public.recommendation_queue FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recommendations" 
ON public.recommendation_queue FOR DELETE 
USING (auth.uid() = user_id);

-- Create table for question-level tracking with topic tags
CREATE TABLE public.question_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  todo_id UUID NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_taken_seconds NUMERIC NOT NULL DEFAULT 0,
  difficulty_level TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own question attempts" 
ON public.question_attempts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own question attempts" 
ON public.question_attempts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create table for global topic statistics (for benchmarking)
CREATE TABLE public.global_topic_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE UNIQUE,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  avg_accuracy NUMERIC NOT NULL DEFAULT 0,
  avg_time_seconds NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (publicly readable)
ALTER TABLE public.global_topic_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view global stats" 
ON public.global_topic_stats FOR SELECT 
USING (true);

-- Add Comeback King achievement
INSERT INTO public.achievements (name, description, requirement_type, requirement_value, icon)
VALUES ('Comeback King', 'Improved a weak topic score by 30% or more', 'weakness_improvement', 30, 'crown')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX idx_user_topic_performance_user ON public.user_topic_performance(user_id);
CREATE INDEX idx_user_topic_performance_weakness ON public.user_topic_performance(user_id, weakness_score DESC);
CREATE INDEX idx_question_attempts_user_topic ON public.question_attempts(user_id, topic_id);
CREATE INDEX idx_recommendation_queue_user ON public.recommendation_queue(user_id, is_dismissed, is_completed);
CREATE INDEX idx_video_topic_analysis_user ON public.video_topic_analysis(user_id, is_weak_topic);