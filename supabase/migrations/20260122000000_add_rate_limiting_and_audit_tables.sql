-- Migration: Create rate limit and audit logging tables
-- Date: 2026-01-22
-- Purpose: Enable rate limiting on expensive operations and comprehensive audit trails
-- See: PHASE_1_IMPLEMENTATION_GUIDE.md

-- Create rate limit logs table
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can view their own rate limit logs
CREATE POLICY "Users can view their own rate limit logs"
ON public.rate_limit_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert logs
CREATE POLICY "Service role can insert rate limit logs"
ON public.rate_limit_logs
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS rate_limit_logs_user_operation_created 
ON public.rate_limit_logs(user_id, operation, created_at DESC);

CREATE INDEX IF NOT EXISTS rate_limit_logs_operation_created 
ON public.rate_limit_logs(operation, created_at DESC);

CREATE INDEX IF NOT EXISTS rate_limit_logs_user_created 
ON public.rate_limit_logs(user_id, created_at DESC);

-- Create audit logs table for comprehensive operation tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'quiz_submitted', 'notes_generated', 'profile_updated', etc.
  resource_type TEXT NOT NULL, -- 'quiz', 'notes', 'profile', 'video', etc.
  resource_id TEXT,
  metadata JSONB, -- Store operation details (credits used, score, etc.)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS audit_logs_user_created 
ON public.audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_action_created 
ON public.audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_resource_type_created 
ON public.audit_logs(resource_type, created_at DESC);

-- Grant permissions to service role for managing logs
GRANT SELECT, INSERT ON public.rate_limit_logs TO service_role;
GRANT SELECT, INSERT ON public.audit_logs TO service_role;

-- Create function to get rate limit status for a user
CREATE OR REPLACE FUNCTION public.get_rate_limit_status(
  p_user_id UUID,
  p_operation TEXT
)
RETURNS TABLE (
  requests_this_hour INTEGER,
  requests_this_day INTEGER,
  hour_resets_at TIMESTAMP WITH TIME ZONE,
  day_resets_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_hour_ago TIMESTAMP WITH TIME ZONE;
  v_day_ago TIMESTAMP WITH TIME ZONE;
  v_hour_count INTEGER;
  v_day_count INTEGER;
  v_oldest_hour_time TIMESTAMP WITH TIME ZONE;
  v_oldest_day_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Security: Only allow users to check their own rate limits
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Users can only check their own rate limits';
  END IF;
  
  v_hour_ago := NOW() - INTERVAL '1 hour';
  v_day_ago := NOW() - INTERVAL '1 day';
  
  -- Get hourly count and oldest request time
  SELECT COUNT(*), MIN(created_at) INTO v_hour_count, v_oldest_hour_time
  FROM public.rate_limit_logs
  WHERE user_id = p_user_id
    AND operation = p_operation
    AND created_at > v_hour_ago;
    
  -- Get daily count and oldest request time
  SELECT COUNT(*), MIN(created_at) INTO v_day_count, v_oldest_day_time
  FROM public.rate_limit_logs
  WHERE user_id = p_user_id
    AND operation = p_operation
    AND created_at > v_day_ago;
  
  -- Return actual expiration times based on oldest request in window
  RETURN QUERY SELECT
    v_hour_count,
    v_day_count,
    CASE WHEN v_hour_count > 0 THEN v_oldest_hour_time + INTERVAL '1 hour' ELSE NULL END,
    CASE WHEN v_day_count > 0 THEN v_oldest_day_time + INTERVAL '1 day' ELSE NULL END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_metadata
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_rate_limit_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event(UUID, TEXT, TEXT, TEXT, JSONB) TO service_role;
