-- Add separate plan prices for Manual and Automatic plans
-- Also ensure seller_trial_days exists with proper default

-- Insert manual_plan_price if not exists
INSERT INTO public.app_settings (key, value, description, created_at, updated_at)
VALUES ('manual_plan_price', '20', 'Valor mensal do Plano Manual (gestão apenas)', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Insert automatic_plan_price if not exists
INSERT INTO public.app_settings (key, value, description, created_at, updated_at)
VALUES ('automatic_plan_price', '35', 'Valor mensal do Plano Automático (com WhatsApp API)', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Ensure seller_trial_days exists with description
INSERT INTO public.app_settings (key, value, description, created_at, updated_at)
VALUES ('seller_trial_days', '5', 'Dias de teste grátis para novos revendedores', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET 
  description = 'Dias de teste grátis para novos revendedores',
  updated_at = NOW();