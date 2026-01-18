-- =====================================================
-- MÓDULO CHATBOT AUTOMÁTICO - TABELAS
-- =====================================================

-- 1. Contatos WhatsApp (tracking de interações)
CREATE TABLE public.chatbot_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL,
    phone TEXT NOT NULL,
    contact_status TEXT DEFAULT 'NEW' CHECK (contact_status IN ('NEW', 'KNOWN', 'CLIENT')),
    first_interaction_at TIMESTAMPTZ DEFAULT now(),
    last_interaction_at TIMESTAMPTZ DEFAULT now(),
    interaction_count INTEGER DEFAULT 0,
    last_response_at TIMESTAMPTZ,
    last_buttons_sent_at TIMESTAMPTZ,
    last_list_sent_at TIMESTAMPTZ,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(seller_id, phone)
);

-- 2. Regras do Chatbot
CREATE TABLE public.chatbot_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL,
    name TEXT NOT NULL,
    trigger_text TEXT NOT NULL,
    response_type TEXT DEFAULT 'text' CHECK (response_type IN ('text', 'text_image', 'text_buttons', 'text_list')),
    response_content JSONB NOT NULL DEFAULT '{"text": ""}'::jsonb,
    contact_filter TEXT DEFAULT 'ALL' CHECK (contact_filter IN ('NEW', 'KNOWN', 'CLIENT', 'ALL')),
    cooldown_mode TEXT DEFAULT 'polite' CHECK (cooldown_mode IN ('polite', 'moderate', 'free')),
    cooldown_hours INTEGER DEFAULT 24,
    is_active BOOLEAN DEFAULT true,
    is_global_trigger BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    template_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Templates Globais de Chatbot (criados pelo ADM)
CREATE TABLE public.chatbot_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_text TEXT NOT NULL,
    response_type TEXT DEFAULT 'text' CHECK (response_type IN ('text', 'text_image', 'text_buttons', 'text_list')),
    response_content JSONB NOT NULL DEFAULT '{"text": ""}'::jsonb,
    contact_filter TEXT DEFAULT 'ALL' CHECK (contact_filter IN ('NEW', 'KNOWN', 'CLIENT', 'ALL')),
    cooldown_mode TEXT DEFAULT 'polite' CHECK (cooldown_mode IN ('polite', 'moderate', 'free')),
    cooldown_hours INTEGER DEFAULT 24,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Histórico de Interações
CREATE TABLE public.chatbot_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL,
    contact_id UUID REFERENCES public.chatbot_contacts(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES public.chatbot_rules(id) ON DELETE SET NULL,
    phone TEXT NOT NULL,
    incoming_message TEXT,
    response_sent JSONB,
    response_type TEXT,
    sent_at TIMESTAMPTZ DEFAULT now(),
    button_clicked TEXT,
    list_selected TEXT,
    was_blocked BOOLEAN DEFAULT false,
    block_reason TEXT
);

-- 5. Configuração do Chatbot por Seller
CREATE TABLE public.chatbot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL UNIQUE,
    is_enabled BOOLEAN DEFAULT false,
    response_delay_min INTEGER DEFAULT 2,
    response_delay_max INTEGER DEFAULT 5,
    ignore_groups BOOLEAN DEFAULT true,
    ignore_own_messages BOOLEAN DEFAULT true,
    webhook_configured BOOLEAN DEFAULT false,
    webhook_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- chatbot_contacts
ALTER TABLE public.chatbot_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own contacts"
    ON public.chatbot_contacts FOR SELECT
    USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own contacts"
    ON public.chatbot_contacts FOR INSERT
    WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own contacts"
    ON public.chatbot_contacts FOR UPDATE
    USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own contacts"
    ON public.chatbot_contacts FOR DELETE
    USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all contacts"
    ON public.chatbot_contacts FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));

-- chatbot_rules
ALTER TABLE public.chatbot_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own rules"
    ON public.chatbot_rules FOR SELECT
    USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own rules"
    ON public.chatbot_rules FOR INSERT
    WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own rules"
    ON public.chatbot_rules FOR UPDATE
    USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own rules"
    ON public.chatbot_rules FOR DELETE
    USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all rules"
    ON public.chatbot_rules FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));

-- chatbot_templates
ALTER TABLE public.chatbot_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active templates"
    ON public.chatbot_templates FOR SELECT
    USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert templates"
    ON public.chatbot_templates FOR INSERT
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update templates"
    ON public.chatbot_templates FOR UPDATE
    USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete templates"
    ON public.chatbot_templates FOR DELETE
    USING (has_role(auth.uid(), 'admin'::app_role));

-- chatbot_interactions
ALTER TABLE public.chatbot_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own interactions"
    ON public.chatbot_interactions FOR SELECT
    USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own interactions"
    ON public.chatbot_interactions FOR INSERT
    WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Admins can view all interactions"
    ON public.chatbot_interactions FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));

-- chatbot_settings
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own settings"
    ON public.chatbot_settings FOR SELECT
    USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own settings"
    ON public.chatbot_settings FOR INSERT
    WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own settings"
    ON public.chatbot_settings FOR UPDATE
    USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all settings"
    ON public.chatbot_settings FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_chatbot_contacts_seller_phone ON public.chatbot_contacts(seller_id, phone);
CREATE INDEX idx_chatbot_contacts_status ON public.chatbot_contacts(contact_status);
CREATE INDEX idx_chatbot_rules_seller ON public.chatbot_rules(seller_id);
CREATE INDEX idx_chatbot_rules_trigger ON public.chatbot_rules(trigger_text);
CREATE INDEX idx_chatbot_interactions_seller ON public.chatbot_interactions(seller_id);
CREATE INDEX idx_chatbot_interactions_contact ON public.chatbot_interactions(contact_id);
CREATE INDEX idx_chatbot_interactions_sent_at ON public.chatbot_interactions(sent_at);

-- =====================================================
-- TRIGGER para updated_at
-- =====================================================

CREATE TRIGGER update_chatbot_contacts_updated_at
    BEFORE UPDATE ON public.chatbot_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatbot_rules_updated_at
    BEFORE UPDATE ON public.chatbot_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatbot_templates_updated_at
    BEFORE UPDATE ON public.chatbot_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatbot_settings_updated_at
    BEFORE UPDATE ON public.chatbot_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();