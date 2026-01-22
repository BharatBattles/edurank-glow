// CORS configuration utility for secure cross-origin requests

const ALLOWED_ORIGINS = [
  // Production
  'https://edurank.app',
  'https://www.edurank.app',
  
  // Development
  'http://localhost:5173',
  'http://localhost:3000',
  
  // Lovable AI (if needed for local development)
  'https://lovable.dev',
];

/**
 * Get CORS headers with origin validation
 * Prevents CSRF attacks by only allowing requests from trusted origins
 */
export function getCORSHeaders(originHeader: string | null): Record<string, string> {
  // Default to the first allowed origin if origin is not provided or not in whitelist
  const allowedOrigin = ALLOWED_ORIGINS.includes(originHeader || '')
    ? originHeader
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '3600',
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCORSPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const corsHeaders = getCORSHeaders(req.headers.get('origin'));
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}
