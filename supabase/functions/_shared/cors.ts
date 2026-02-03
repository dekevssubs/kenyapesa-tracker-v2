// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://kenyapesa-tracker-v2.vercel.app',
  'https://kenyapesa.space',
]

// In development, also allow localhost
if (Deno.env.get('ENVIRONMENT') !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:5173', 'http://localhost:3000')
}

/**
 * Get CORS headers for the given request origin.
 * Only reflects the origin if it's in the allow-list.
 */
export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  }
}

// Default headers for backwards compatibility (uses primary origin)
export const corsHeaders = getCorsHeaders()
