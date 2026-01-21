-- Fix permissive INSERT policy - restrict to authenticated users for their own alerts
DROP POLICY IF EXISTS "Service role can insert alerts" ON public.operational_alerts;

-- Allow authenticated users to insert alerts for themselves (seller_id = auth.uid() or null for system alerts)
CREATE POLICY "Authenticated can insert own alerts"
  ON public.operational_alerts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (seller_id IS NULL OR seller_id = auth.uid()));