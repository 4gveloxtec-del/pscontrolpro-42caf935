-- Create operational alerts table for rate-limit, deduplication, and repeated failures
CREATE TABLE IF NOT EXISTS public.operational_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'rate_limit', 'duplicate_blocked', 'repeated_failure', 'edge_function_error'
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  component TEXT NOT NULL, -- 'chatbot_webhook', 'evolution_api', 'bulk_collection', etc.
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;

-- Admin can see all alerts
CREATE POLICY "Admin can view all operational alerts"
  ON public.operational_alerts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Sellers can see their own alerts
CREATE POLICY "Sellers can view their own alerts"
  ON public.operational_alerts FOR SELECT
  USING (seller_id = auth.uid());

-- Service role can insert (edge functions)
CREATE POLICY "Service role can insert alerts"
  ON public.operational_alerts FOR INSERT
  WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_operational_alerts_seller_id ON public.operational_alerts(seller_id);
CREATE INDEX idx_operational_alerts_type ON public.operational_alerts(alert_type);
CREATE INDEX idx_operational_alerts_created_at ON public.operational_alerts(created_at DESC);

-- Function to create operational alert (for edge functions)
CREATE OR REPLACE FUNCTION public.create_operational_alert(
  p_seller_id UUID,
  p_alert_type TEXT,
  p_severity TEXT,
  p_component TEXT,
  p_message TEXT,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO operational_alerts (
    seller_id, alert_type, severity, component, message, details
  )
  VALUES (p_seller_id, p_alert_type, p_severity, p_component, p_message, p_details)
  RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$;

-- Add realtime for operational alerts (admin monitoring)
ALTER PUBLICATION supabase_realtime ADD TABLE public.operational_alerts;