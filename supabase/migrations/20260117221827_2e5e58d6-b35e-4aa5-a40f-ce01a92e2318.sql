-- Tabela de configuração GLOBAL da API WhatsApp (apenas admin)
CREATE TABLE IF NOT EXISTS public.whatsapp_global_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_url TEXT NOT NULL DEFAULT '',
  api_token TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de instâncias dos revendedores
CREATE TABLE IF NOT EXISTS public.whatsapp_seller_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL UNIQUE,
  instance_name TEXT NOT NULL DEFAULT '',
  is_connected BOOLEAN DEFAULT false,
  auto_send_enabled BOOLEAN DEFAULT false,
  last_connection_check TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de rastreamento de notificações de clientes
CREATE TABLE IF NOT EXISTS public.client_notification_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  expiration_cycle_date DATE NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  sent_via TEXT DEFAULT 'manual',
  service_type TEXT,
  UNIQUE(client_id, notification_type, expiration_cycle_date)
);

-- Tabela de rastreamento de notificações de revendedores
CREATE TABLE IF NOT EXISTS public.reseller_notification_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  expiration_cycle_date DATE NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reseller_id, notification_type, expiration_cycle_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_seller_instances_seller ON public.whatsapp_seller_instances(seller_id);
CREATE INDEX IF NOT EXISTS idx_client_notification_client ON public.client_notification_tracking(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notification_seller ON public.client_notification_tracking(seller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_notification_reseller ON public.reseller_notification_tracking(reseller_id);

-- RLS para whatsapp_global_config (apenas admins)
ALTER TABLE public.whatsapp_global_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view global config" 
  ON public.whatsapp_global_config FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert global config" 
  ON public.whatsapp_global_config FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update global config" 
  ON public.whatsapp_global_config FOR UPDATE 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete global config" 
  ON public.whatsapp_global_config FOR DELETE 
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para whatsapp_seller_instances
ALTER TABLE public.whatsapp_seller_instances ENABLE ROW LEVEL SECURITY;

-- Sellers podem ver/editar própria instância
CREATE POLICY "Sellers can view own instance" 
  ON public.whatsapp_seller_instances FOR SELECT 
  USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can insert own instance" 
  ON public.whatsapp_seller_instances FOR INSERT 
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own instance" 
  ON public.whatsapp_seller_instances FOR UPDATE 
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete own instance" 
  ON public.whatsapp_seller_instances FOR DELETE 
  USING (auth.uid() = seller_id);

-- RLS para client_notification_tracking
ALTER TABLE public.client_notification_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client notifications" 
  ON public.client_notification_tracking FOR SELECT 
  USING (auth.uid() = seller_id);

CREATE POLICY "Users can insert own client notifications" 
  ON public.client_notification_tracking FOR INSERT 
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can delete own client notifications" 
  ON public.client_notification_tracking FOR DELETE 
  USING (auth.uid() = seller_id);

-- RLS para reseller_notification_tracking
ALTER TABLE public.reseller_notification_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reseller notifications" 
  ON public.reseller_notification_tracking FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert reseller notifications" 
  ON public.reseller_notification_tracking FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reseller notifications" 
  ON public.reseller_notification_tracking FOR DELETE 
  USING (public.has_role(auth.uid(), 'admin'));