-- =====================================================
-- SISTEMA DE CONEXÃO RESILIENTE - EVOLUTION API
-- =====================================================

-- 1. Tabela de Logs de Conexão (diagnóstico completo)
CREATE TABLE IF NOT EXISTS public.connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  instance_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL DEFAULT 'unknown', -- 'evolution_webhook', 'heartbeat', 'frontend', 'reconnect_attempt'
  previous_state TEXT,
  new_state TEXT,
  is_connected BOOLEAN,
  error_message TEXT,
  error_code TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_connection_logs_seller ON connection_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_connection_logs_instance ON connection_logs(instance_name);
CREATE INDEX IF NOT EXISTS idx_connection_logs_created ON connection_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connection_logs_event_type ON connection_logs(event_type);

-- Habilitar RLS
ALTER TABLE public.connection_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can view all connection logs" ON connection_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Sellers can view own connection logs" ON connection_logs
  FOR SELECT USING (seller_id = auth.uid());

-- 2. Adicionar campos de heartbeat e sessão na tabela de instâncias
ALTER TABLE public.whatsapp_seller_instances
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS heartbeat_failures INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reconnect_attempt_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reconnect_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS connection_source TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS session_valid BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_evolution_state TEXT,
ADD COLUMN IF NOT EXISTS offline_since TIMESTAMPTZ;

-- 3. Tabela de Alertas de Conexão
CREATE TABLE IF NOT EXISTS public.connection_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  instance_name TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'disconnected', 'reconnect_failed', 'session_invalid', 'offline_too_long'
  severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'critical'
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para alertas
CREATE INDEX IF NOT EXISTS idx_connection_alerts_seller ON connection_alerts(seller_id);
CREATE INDEX IF NOT EXISTS idx_connection_alerts_unresolved ON connection_alerts(is_resolved) WHERE is_resolved = false;

-- Habilitar RLS
ALTER TABLE public.connection_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para alertas
CREATE POLICY "Admins can view all connection alerts" ON connection_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Sellers can view own connection alerts" ON connection_alerts
  FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "System can manage alerts" ON connection_alerts
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Função para registrar log de conexão
CREATE OR REPLACE FUNCTION public.log_connection_event(
  p_seller_id UUID,
  p_instance_name TEXT,
  p_event_type TEXT,
  p_event_source TEXT,
  p_previous_state TEXT,
  p_new_state TEXT,
  p_is_connected BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO connection_logs (
    seller_id, instance_name, event_type, event_source,
    previous_state, new_state, is_connected,
    error_message, error_code, metadata
  )
  VALUES (
    p_seller_id, p_instance_name, p_event_type, p_event_source,
    p_previous_state, p_new_state, p_is_connected,
    p_error_message, p_error_code, p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$function$;

-- 5. Função para criar alerta de conexão
CREATE OR REPLACE FUNCTION public.create_connection_alert(
  p_seller_id UUID,
  p_instance_name TEXT,
  p_alert_type TEXT,
  p_severity TEXT,
  p_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_alert_id UUID;
BEGIN
  -- Resolve alertas anteriores do mesmo tipo
  UPDATE connection_alerts
  SET is_resolved = true, resolved_at = NOW()
  WHERE seller_id = p_seller_id
    AND instance_name = p_instance_name
    AND alert_type = p_alert_type
    AND is_resolved = false;
  
  -- Criar novo alerta
  INSERT INTO connection_alerts (
    seller_id, instance_name, alert_type, severity, message
  )
  VALUES (p_seller_id, p_instance_name, p_alert_type, p_severity, p_message)
  RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$function$;

-- 6. Função para atualizar heartbeat
CREATE OR REPLACE FUNCTION public.update_instance_heartbeat(
  p_seller_id UUID,
  p_is_connected BOOLEAN,
  p_evolution_state TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_previous_connected BOOLEAN;
  v_instance_name TEXT;
BEGIN
  -- Buscar estado anterior
  SELECT is_connected, instance_name
  INTO v_previous_connected, v_instance_name
  FROM whatsapp_seller_instances
  WHERE seller_id = p_seller_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Atualizar instância
  UPDATE whatsapp_seller_instances
  SET 
    is_connected = p_is_connected,
    last_heartbeat_at = NOW(),
    heartbeat_failures = CASE WHEN p_is_connected THEN 0 ELSE heartbeat_failures + 1 END,
    last_evolution_state = COALESCE(p_evolution_state, last_evolution_state),
    offline_since = CASE 
      WHEN p_is_connected THEN NULL 
      WHEN offline_since IS NULL AND NOT p_is_connected THEN NOW()
      ELSE offline_since
    END,
    session_valid = p_is_connected OR (heartbeat_failures < 3),
    updated_at = NOW()
  WHERE seller_id = p_seller_id;
  
  -- Log se estado mudou
  IF v_previous_connected IS DISTINCT FROM p_is_connected THEN
    PERFORM log_connection_event(
      p_seller_id,
      v_instance_name,
      CASE WHEN p_is_connected THEN 'connected' ELSE 'disconnected' END,
      'heartbeat',
      CASE WHEN v_previous_connected THEN 'connected' ELSE 'disconnected' END,
      CASE WHEN p_is_connected THEN 'connected' ELSE 'disconnected' END,
      p_is_connected
    );
    
    -- Criar alerta se desconectou
    IF NOT p_is_connected THEN
      PERFORM create_connection_alert(
        p_seller_id,
        v_instance_name,
        'disconnected',
        'warning',
        'Instância WhatsApp desconectada. Tentando reconectar automaticamente...'
      );
    END IF;
  END IF;
  
  RETURN true;
END;
$function$;

-- 7. Limpar logs antigos (manter 7 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_connection_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM connection_logs
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  -- Também resolver alertas antigos
  UPDATE connection_alerts
  SET is_resolved = true, resolved_at = NOW()
  WHERE created_at < NOW() - INTERVAL '24 hours'
    AND is_resolved = false;
  
  RETURN v_deleted;
END;
$function$;

-- Habilitar realtime para alertas
ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_alerts;