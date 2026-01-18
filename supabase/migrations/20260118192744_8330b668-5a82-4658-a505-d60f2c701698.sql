-- 1. Add seller_id to chatbot_templates (allows NULL for admin templates)
ALTER TABLE public.chatbot_templates 
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add category column to chatbot_templates
ALTER TABLE public.chatbot_templates 
ADD COLUMN IF NOT EXISTS category TEXT;

-- 3. Create chatbot_template_categories table for seller-specific categories
CREATE TABLE IF NOT EXISTS public.chatbot_template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT 'folder',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(seller_id, name)
);

-- 4. Create chatbot_flows table for numbered menu flows
CREATE TABLE IF NOT EXISTS public.chatbot_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_main_menu BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create chatbot_flow_nodes table for flow options/nodes
CREATE TABLE IF NOT EXISTS public.chatbot_flow_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID NOT NULL REFERENCES public.chatbot_flows(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_node_id UUID REFERENCES public.chatbot_flow_nodes(id) ON DELETE SET NULL,
    option_number TEXT NOT NULL, -- "1", "2", "1.1", "1.2", etc.
    title TEXT NOT NULL,
    description TEXT,
    response_type TEXT DEFAULT 'text' CHECK (response_type IN ('text', 'text_image', 'submenu', 'template', 'human_transfer', 'end_chat')),
    response_content JSONB DEFAULT '{"text": ""}'::jsonb,
    template_id UUID REFERENCES public.chatbot_templates(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create chatbot_flow_sessions to track user position in flows
CREATE TABLE IF NOT EXISTS public.chatbot_flow_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_phone TEXT NOT NULL,
    current_flow_id UUID REFERENCES public.chatbot_flows(id) ON DELETE SET NULL,
    current_node_id UUID REFERENCES public.chatbot_flow_nodes(id) ON DELETE SET NULL,
    session_started_at TIMESTAMPTZ DEFAULT now(),
    last_interaction_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    awaiting_human BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(seller_id, contact_phone)
);

-- 7. Enable RLS on new tables
ALTER TABLE public.chatbot_template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_flow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_flow_sessions ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for chatbot_template_categories
CREATE POLICY "Sellers can manage own categories"
ON public.chatbot_template_categories
FOR ALL
USING (seller_id = auth.uid());

-- 9. RLS Policies for chatbot_flows
CREATE POLICY "Sellers can manage own flows"
ON public.chatbot_flows
FOR ALL
USING (seller_id = auth.uid());

-- 10. RLS Policies for chatbot_flow_nodes
CREATE POLICY "Sellers can manage own flow nodes"
ON public.chatbot_flow_nodes
FOR ALL
USING (seller_id = auth.uid());

-- 11. RLS Policies for chatbot_flow_sessions
CREATE POLICY "Sellers can manage own flow sessions"
ON public.chatbot_flow_sessions
FOR ALL
USING (seller_id = auth.uid());

-- 12. Update chatbot_templates RLS to allow sellers to manage their own templates
-- First drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage templates" ON public.chatbot_templates;
DROP POLICY IF EXISTS "Everyone can view active templates" ON public.chatbot_templates;

-- Sellers can manage their own templates
CREATE POLICY "Sellers can manage own templates"
ON public.chatbot_templates
FOR ALL
USING (
    seller_id = auth.uid() 
    OR (seller_id IS NULL AND created_by = auth.uid())
);

-- Everyone can view admin templates (seller_id IS NULL) when active
CREATE POLICY "Users can view admin templates"
ON public.chatbot_templates
FOR SELECT
USING (
    seller_id IS NULL 
    AND is_active = true
);

-- 13. Insert default categories for reference (these will be created per seller when they access)
-- Function to create default categories for a seller
CREATE OR REPLACE FUNCTION public.create_default_chatbot_categories(p_seller_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.chatbot_template_categories (seller_id, name, description, color, sort_order)
    VALUES 
        (p_seller_id, 'Atendimento Inicial', 'Primeiras interações com clientes', '#22c55e', 1),
        (p_seller_id, 'Auto Resposta', 'Respostas automáticas gerais', '#3b82f6', 2),
        (p_seller_id, 'Suporte Técnico', 'Ajuda técnica e troubleshooting', '#ef4444', 3),
        (p_seller_id, 'Financeiro / Cobrança', 'Pagamentos e cobranças', '#f59e0b', 4),
        (p_seller_id, 'Planos e Preços', 'Informações sobre planos', '#8b5cf6', 5),
        (p_seller_id, 'Renovação / Vencimento', 'Lembretes de renovação', '#ec4899', 6),
        (p_seller_id, 'Promoções', 'Ofertas e descontos', '#14b8a6', 7),
        (p_seller_id, 'Cancelamento', 'Processos de cancelamento', '#6b7280', 8),
        (p_seller_id, 'Pós-venda', 'Acompanhamento pós-compra', '#06b6d4', 9),
        (p_seller_id, 'Informações Gerais', 'Dúvidas frequentes', '#64748b', 10),
        (p_seller_id, 'Problemas Comuns', 'Soluções para problemas frequentes', '#f97316', 11),
        (p_seller_id, 'Encaminhamento Humano', 'Transferência para atendente', '#a855f7', 12),
        (p_seller_id, 'Horário de Atendimento', 'Informações de horário', '#0ea5e9', 13),
        (p_seller_id, 'Boas-vindas', 'Mensagens de boas-vindas', '#10b981', 14),
        (p_seller_id, 'Mensagens Rápidas', 'Respostas curtas e diretas', '#6366f1', 15)
    ON CONFLICT (seller_id, name) DO NOTHING;
END;
$$;

-- 14. Add triggers for updated_at
CREATE TRIGGER update_chatbot_template_categories_updated_at
    BEFORE UPDATE ON public.chatbot_template_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatbot_flows_updated_at
    BEFORE UPDATE ON public.chatbot_flows
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatbot_flow_nodes_updated_at
    BEFORE UPDATE ON public.chatbot_flow_nodes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();