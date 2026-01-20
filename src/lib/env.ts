/**
 * Environment Configuration & Validation
 * 
 * This module provides type-safe access to environment variables
 * with runtime validation to prevent deployment failures.
 * 
 * IMPORTANT: All environment variables must be prefixed with VITE_
 * to be accessible in the browser (Vite requirement).
 */

// Environment variable types
interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_PROJECT_ID: string;
  DEBUG_MODE: boolean;
  IS_PRODUCTION: boolean;
  IS_DEVELOPMENT: boolean;
}

// Validation helper
function getRequiredEnvVar(key: string): string {
  const value = import.meta.env[key];
  
  if (!value || value === 'undefined' || value.trim() === '') {
    const errorMessage = `
[ENV ERROR] Missing required environment variable: ${key}

This application requires the following environment variables to be set:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)
- VITE_SUPABASE_PROJECT_ID

If deploying to Vercel:
1. Go to your Vercel Dashboard → Project → Settings → Environment Variables
2. Add the missing variable(s)
3. Redeploy your application

If running locally:
1. Copy .env.example to .env
2. Fill in the required values
3. Restart the development server
    `.trim();
    
    console.error(errorMessage);
    
    // In development, show a more visible error
    if (import.meta.env.DEV) {
      throw new Error(errorMessage);
    }
    
    // In production, return empty string to allow graceful degradation
    // The app will show an error state instead of crashing
    return '';
  }
  
  return value.trim();
}

// Optional env var getter
function getOptionalEnvVar(key: string, defaultValue: string = ''): string {
  const value = import.meta.env[key];
  if (!value || value === 'undefined' || value.trim() === '') {
    return defaultValue;
  }
  return value.trim();
}

// Parse boolean env var
function getBooleanEnvVar(key: string, defaultValue: boolean = false): boolean {
  const value = import.meta.env[key];
  if (!value || value === 'undefined') return defaultValue;
  return value === 'true' || value === '1';
}

/**
 * Validated environment configuration
 * 
 * Uses defensive loading with fallbacks for Supabase keys:
 * - VITE_SUPABASE_PUBLISHABLE_KEY (primary, Lovable Cloud style)
 * - VITE_SUPABASE_ANON_KEY (fallback, standard Supabase style)
 */
export const env: EnvConfig = {
  // Required Supabase config
  SUPABASE_URL: getRequiredEnvVar('VITE_SUPABASE_URL'),
  
  // Support both key naming conventions
  SUPABASE_ANON_KEY: 
    getOptionalEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') || 
    getRequiredEnvVar('VITE_SUPABASE_ANON_KEY'),
  
  SUPABASE_PROJECT_ID: getRequiredEnvVar('VITE_SUPABASE_PROJECT_ID'),
  
  // Optional config
  DEBUG_MODE: getBooleanEnvVar('VITE_DEBUG_MODE', false),
  
  // Runtime environment detection
  IS_PRODUCTION: import.meta.env.PROD === true,
  IS_DEVELOPMENT: import.meta.env.DEV === true,
};

/**
 * Validate that all required environment variables are present
 * Call this early in your app initialization
 */
export function validateEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!env.SUPABASE_URL) {
    errors.push('VITE_SUPABASE_URL is not configured');
  }
  
  if (!env.SUPABASE_ANON_KEY) {
    errors.push('VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) is not configured');
  }
  
  if (!env.SUPABASE_PROJECT_ID) {
    errors.push('VITE_SUPABASE_PROJECT_ID is not configured');
  }
  
  // Validate URL format
  if (env.SUPABASE_URL && !env.SUPABASE_URL.startsWith('https://')) {
    errors.push('VITE_SUPABASE_URL must be a valid HTTPS URL');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if the app is running in a specific environment
 */
export function isLovableEnvironment(): boolean {
  // Lovable preview URLs contain 'lovable.app'
  return typeof window !== 'undefined' && 
         window.location.hostname.includes('lovable.app');
}

export function isVercelEnvironment(): boolean {
  // Vercel sets VERCEL env var and uses .vercel.app domains
  return typeof window !== 'undefined' && (
    window.location.hostname.includes('.vercel.app') ||
    import.meta.env.VERCEL === '1'
  );
}

// Debug logging (only in development or when explicitly enabled)
if (env.IS_DEVELOPMENT || env.DEBUG_MODE) {
  console.log('[ENV] Configuration loaded:', {
    SUPABASE_URL: env.SUPABASE_URL ? '✓ Set' : '✗ Missing',
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing',
    SUPABASE_PROJECT_ID: env.SUPABASE_PROJECT_ID ? '✓ Set' : '✗ Missing',
    IS_PRODUCTION: env.IS_PRODUCTION,
    IS_DEVELOPMENT: env.IS_DEVELOPMENT,
  });
}
