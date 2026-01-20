-- Add trial API configuration settings
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('trial_api_enabled', 'false', 'Allow WhatsApp API usage during free trial'),
  ('trial_api_hours', '24', 'Hours of WhatsApp API usage allowed during trial (if enabled)')
ON CONFLICT (key) DO NOTHING;

-- Add column to track when seller started using API during trial
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS api_trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.api_trial_started_at IS 'Timestamp when seller started using WhatsApp API during trial period';