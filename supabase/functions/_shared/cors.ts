// Shared CORS utility for edge functions

// Get CORS headers with allowed origin based on request
export function getCorsHeaders(requestOrigin: string | null, restrictToApp: boolean = true) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://ylenuqnyvhbnumxzhzgh.supabase.co';

  if (!restrictToApp) {
    // Allow all origins (for public endpoints like login/register)
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Expose-Headers': 'X-Session-Id',
    };
  }

  // For development, staging, and production environments
  const allowedOrigins = [
    supabaseUrl, // Current Supabase project
    'http://localhost:3000', // Local development
    'http://localhost:5173', // Vite dev server
    'http://127.0.0.1:3000', // Alternative localhost
    'http://127.0.0.1:5173', // Alternative Vite
    'https://stg-rwa.sharematch.me', // Staging environment
    'https://rwa.sharematch.me', // Production environment
    // Also allow any origin that contains localhost for development
  ];

  // Check if the request origin is allowed
  const isAllowed = allowedOrigins.includes(requestOrigin || '') ||
    (requestOrigin && requestOrigin.includes('localhost'));

  const allowedOrigin = isAllowed ? requestOrigin : supabaseUrl;

  console.log(`CORS: origin=${requestOrigin}, allowed=${isAllowed}, returning=${allowedOrigin}`);

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Expose-Headers': 'X-Session-Id',
  };
}

// Pre-defined CORS headers for common use cases
export const unrestrictedCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Expose-Headers': 'X-Session-Id',
};

export const restrictedCors = (requestOrigin: string | null) => getCorsHeaders(requestOrigin, true);
export const publicCors = (requestOrigin: string | null) => getCorsHeaders(requestOrigin, false);