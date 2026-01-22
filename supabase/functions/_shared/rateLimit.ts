/**
 * Rate Limiting Utility for Supabase Edge Functions
 * 
 * Prevents abuse of expensive AI operations and protects against DoS attacks.
 * Uses Supabase to track request counts per user and operation type.
 */

// Type definition for Supabase client
type SupabaseClient = any;

export interface RateLimitConfig {
  operation: string;
  userId: string;
  limitsPerHour: number;
  limitsPerDay: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAtHour: Date;
  resetAtDay: Date;
  message?: string;
}

/**
 * Check if a user has exceeded rate limits for an operation
 * Creates audit trail for monitoring abuse patterns
 */
export async function checkRateLimit(
  supabaseClient: SupabaseClient,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Get hourly count
    const { count: hourlyCount, error: hourlyError } = await supabaseClient
      .from('rate_limit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', config.userId)
      .eq('operation', config.operation)
      .gte('created_at', hourAgo.toISOString());

    if (hourlyError) {
      console.error('Error checking hourly rate limit:', hourlyError);
      // Fail open - allow request but log the error
      return {
        allowed: true,
        remaining: config.limitsPerHour,
        resetAtHour: new Date(now.getTime() + 60 * 60 * 1000),
        resetAtDay: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        message: 'Rate limit check failed (allowing request)'
      };
    }

    // Get daily count
    const { count: dailyCount, error: dailyError } = await supabaseClient
      .from('rate_limit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', config.userId)
      .eq('operation', config.operation)
      .gte('created_at', dayAgo.toISOString());

    if (dailyError) {
      console.error('Error checking daily rate limit:', dailyError);
      // Fail-open: allow request on error to prevent service disruption
      return {
        allowed: true,
        remaining: config.limitsPerDay,
        resetAtHour: new Date(now.getTime() + 60 * 60 * 1000),
        resetAtDay: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        message: 'Rate limit check failed (allowing request)'
      };
    }

    const hourlyUsed = hourlyCount || 0;
    const dailyUsed = dailyCount || 0;

    // Check limits
    if (hourlyUsed >= config.limitsPerHour) {
      // Conservative estimate: user can retry after the window expires
      return {
        allowed: false,
        remaining: 0,
        resetAtHour: new Date(now.getTime() + 60 * 60 * 1000),
        resetAtDay: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        message: `Rate limit exceeded for ${config.operation}. Max ${config.limitsPerHour} requests per hour. Try again in an hour.`
      };
    }

    if (dailyUsed >= config.limitsPerDay) {
      // Conservative estimate: user can retry after the window expires
      return {
        allowed: false,
        remaining: 0,
        resetAtHour: new Date(now.getTime() + 60 * 60 * 1000),
        resetAtDay: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        message: `Daily limit exceeded for ${config.operation}. Max ${config.limitsPerDay} requests per day. Try again tomorrow.`
      };
    }

    // Request is allowed
    return {
      allowed: true,
      remaining: config.limitsPerHour - hourlyUsed - 1,
      resetAtHour: new Date(now.getTime() + 60 * 60 * 1000),
      resetAtDay: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    };

  } catch (error) {
    console.error('Unexpected error in rate limit check:', error);
    // Fail open to prevent service degradation
    return {
      allowed: true,
      remaining: config.limitsPerHour,
      resetAtHour: new Date(now.getTime() + 60 * 60 * 1000),
      resetAtDay: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    };
  }
}

/**
 * Log a request for rate limiting and auditing
 */
export async function logRateLimitRequest(
  supabaseClient: SupabaseClient,
  userId: string,
  operation: string,
  success: boolean,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await supabaseClient
      .from('rate_limit_logs')
      .insert({
        user_id: userId,
        operation,
        success,
        metadata,
        ip_address: null, // Can be populated from request headers
      });
  } catch (error) {
    console.error('Error logging rate limit request:', error);
    // Don't throw - this is a logging operation
  }
}

/**
 * Suggested rate limits for different operations
 * Adjust based on API costs and desired user experience
 */
export const DEFAULT_RATE_LIMITS = {
  'generate-notes': {
    limitsPerHour: 3,
    limitsPerDay: 10,
    costCredits: 4,
    description: 'AI notes generation from videos'
  },
  'generate-quiz': {
    limitsPerHour: 5,
    limitsPerDay: 20,
    costCredits: 4,
    description: 'Quiz generation from notes'
  },
  'find-video': {
    limitsPerHour: 10,
    limitsPerDay: 50,
    costCredits: 1,
    description: 'Video discovery'
  },
  'adaptive-question': {
    limitsPerHour: 20,
    limitsPerDay: 100,
    costCredits: 0,
    description: 'Adaptive question generation'
  },
  'analyze-weakness': {
    limitsPerHour: 3,
    limitsPerDay: 15,
    costCredits: 0,
    description: 'Weakness analysis'
  },
  'fix-weak-areas-quiz': {
    limitsPerHour: 3,
    limitsPerDay: 10,
    costCredits: 4,
    description: 'Weak areas quiz generation'
  }
};
