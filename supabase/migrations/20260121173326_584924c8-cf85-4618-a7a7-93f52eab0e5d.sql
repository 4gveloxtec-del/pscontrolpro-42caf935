-- Ensure seller_trial_days exists with default value
INSERT INTO public.app_settings (key, value, description, created_at, updated_at)
VALUES ('seller_trial_days', '7', 'Dias de teste grátis para novos revendedores', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Ensure manual_plan_price exists
INSERT INTO public.app_settings (key, value, description, created_at, updated_at)
VALUES ('manual_plan_price', '20', 'Valor mensal do Plano Manual', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Ensure automatic_plan_price exists
INSERT INTO public.app_settings (key, value, description, created_at, updated_at)
VALUES ('automatic_plan_price', '35', 'Valor mensal do Plano Automático (com WhatsApp API)', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Drop existing RLS policy if exists and create new one for public read access
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;

CREATE POLICY "Anyone can read app settings"
ON public.app_settings
FOR SELECT
USING (true);