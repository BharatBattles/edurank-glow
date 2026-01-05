import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

interface RateLimitState {
  requestCount: number;
  windowStart: number;
}

const rateLimitCache = new Map<string, RateLimitState>();

export const useRateLimiter = () => {
  const { user } = useAuth();
  const [isRateLimited, setIsRateLimited] = useState(false);

  const checkRateLimit = useCallback((): boolean => {
    if (!user) return false;

    const now = Date.now();
    const key = user.id;
    const state = rateLimitCache.get(key);

    if (!state || now - state.windowStart > RATE_LIMIT_WINDOW_MS) {
      // New window
      rateLimitCache.set(key, { requestCount: 1, windowStart: now });
      setIsRateLimited(false);
      return true;
    }

    if (state.requestCount >= MAX_REQUESTS_PER_WINDOW) {
      setIsRateLimited(true);
      const remainingTime = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - state.windowStart)) / 1000);
      toast.error(`Rate limit exceeded. Please wait ${remainingTime}s before trying again.`);
      return false;
    }

    state.requestCount++;
    rateLimitCache.set(key, state);
    setIsRateLimited(false);
    return true;
  }, [user]);

  // Credit consumption is now handled server-side in edge functions
  // This function just checks client-side rate limiting for UX
  const canMakeRequest = useCallback(async (): Promise<boolean> => {
    return checkRateLimit();
  }, [checkRateLimit]);

  return {
    isRateLimited,
    checkRateLimit,
    canMakeRequest,
  };
};