-- ===========================================
-- CHATBOT V3 - ARQUITETURA MODULAR
-- ===========================================

-- Tabela principal: Configuração do chatbot por usuário
CREATE TABLE public.chatbot_v3_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  fallback_message TEXT DEFAULT 'Não entendi 😕

Digite *MENU* para ver as opções.',
  welcome_message TEXT DEFAULT 'Olá! 👋

Seja bem-vindo(a)! Como posso ajudar?

Digite *MENU* para ver todas as opções.',
  response_delay_min INTEGER DEFAULT 2,
  response_delay_max INTEGER DEFAULT 5,
  typing_enabled BOOLEAN DEFAULT true,
  ignore_groups BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela de menus (estrutura hierárquica simples)
CREATE TABLE public.chatbot_v3_menus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_key TEXT NOT NULL, -- 'main', 'planos', 'suporte', etc.
  title TEXT NOT NULL,
  message_text TEXT NOT NULL,
  image_url TEXT,
  parent_menu_key TEXT, -- null = menu raiz
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, menu_key)
);

-- Tabela de opções de menu (cada opção leva a um menu ou ação)
CREATE TABLE public.chatbot_v3_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID NOT NULL REFERENCES public.chatbot_v3_menus(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_number INTEGER NOT NULL, -- 1, 2, 3...
  option_text TEXT NOT NULL, -- "Planos disponíveis"
  keywords TEXT[], -- ["plano", "planos", "preço", "preços"]
  target_menu_key TEXT, -- menu destino (null = ação especial)
  action_type TEXT, -- 'menu', 'message', 'human', 'end'
  action_response TEXT, -- mensagem fixa se action_type = 'message'
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de gatilhos globais (funcionam em qualquer ponto)
CREATE TABLE public.chatbot_v3_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_name TEXT NOT NULL, -- 'menu', 'voltar', 'confirmar', etc.
  keywords TEXT[] NOT NULL, -- ["menu", "início", "inicio", "oi", "olá"]
  action_type TEXT NOT NULL, -- 'goto_menu', 'message', 'human'
  target_menu_key TEXT, -- destino se goto_menu
  response_text TEXT, -- resposta se action_type = 'message'
  priority INTEGER DEFAULT 0, -- maior = mais prioritário
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, trigger_name)
);

-- Tabela de contatos do chatbot (rastreamento simples)
CREATE TABLE public.chatbot_v3_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  current_menu_key TEXT DEFAULT 'main',
  last_message_at TIMESTAMPTZ,
  last_response_at TIMESTAMPTZ,
  interaction_count INTEGER DEFAULT 0,
  awaiting_human BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, phone)
);

-- Tabela de variáveis personalizáveis
CREATE TABLE public.chatbot_v3_variables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variable_key TEXT NOT NULL, -- 'empresa', 'pix', 'whatsapp'
  variable_value TEXT NOT NULL DEFAULT '',
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, variable_key)
);

-- Tabela de logs de interação
CREATE TABLE public.chatbot_v3_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  incoming_message TEXT,
  response_sent TEXT,
  menu_key TEXT,
  trigger_matched TEXT,
  was_fallback BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_chatbot_v3_menus_user ON public.chatbot_v3_menus(user_id);
CREATE INDEX idx_chatbot_v3_options_menu ON public.chatbot_v3_options(menu_id);
CREATE INDEX idx_chatbot_v3_contacts_user_phone ON public.chatbot_v3_contacts(user_id, phone);
CREATE INDEX idx_chatbot_v3_triggers_user ON public.chatbot_v3_triggers(user_id);
CREATE INDEX idx_chatbot_v3_logs_user ON public.chatbot_v3_logs(user_id);
CREATE INDEX idx_chatbot_v3_logs_created ON public.chatbot_v3_logs(created_at);

-- Enable RLS
ALTER TABLE public.chatbot_v3_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_v3_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_v3_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_v3_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_v3_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_v3_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_v3_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Config
CREATE POLICY "Users can view own config" ON public.chatbot_v3_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own config" ON public.chatbot_v3_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own config" ON public.chatbot_v3_config FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies - Menus
CREATE POLICY "Users can view own menus" ON public.chatbot_v3_menus FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own menus" ON public.chatbot_v3_menus FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own menus" ON public.chatbot_v3_menus FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own menus" ON public.chatbot_v3_menus FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies - Options
CREATE POLICY "Users can view own options" ON public.chatbot_v3_options FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own options" ON public.chatbot_v3_options FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own options" ON public.chatbot_v3_options FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own options" ON public.chatbot_v3_options FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies - Triggers
CREATE POLICY "Users can view own triggers" ON public.chatbot_v3_triggers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own triggers" ON public.chatbot_v3_triggers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own triggers" ON public.chatbot_v3_triggers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own triggers" ON public.chatbot_v3_triggers FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies - Contacts
CREATE POLICY "Users can view own contacts" ON public.chatbot_v3_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON public.chatbot_v3_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.chatbot_v3_contacts FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies - Variables
CREATE POLICY "Users can view own variables" ON public.chatbot_v3_variables FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own variables" ON public.chatbot_v3_variables FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own variables" ON public.chatbot_v3_variables FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own variables" ON public.chatbot_v3_variables FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies - Logs
CREATE POLICY "Users can view own logs" ON public.chatbot_v3_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.chatbot_v3_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Função para criar estrutura padrão do chatbot para um usuário
CREATE OR REPLACE FUNCTION public.create_default_chatbot_v3(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Criar config padrão
  INSERT INTO chatbot_v3_config (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Criar variáveis padrão
  INSERT INTO chatbot_v3_variables (user_id, variable_key, variable_value, description, is_system)
  VALUES 
    (p_user_id, 'empresa', '', 'Nome da sua empresa', true),
    (p_user_id, 'pix', '', 'Chave PIX para pagamentos', true),
    (p_user_id, 'whatsapp', '', 'Número de WhatsApp', true),
    (p_user_id, 'horario', '08:00 às 22:00', 'Horário de atendimento', true)
  ON CONFLICT (user_id, variable_key) DO NOTHING;
  
  -- Criar gatilhos globais padrão
  INSERT INTO chatbot_v3_triggers (user_id, trigger_name, keywords, action_type, target_menu_key, priority)
  VALUES 
    (p_user_id, 'menu', ARRAY['menu', 'início', 'inicio', 'oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite'], 'goto_menu', 'main', 100),
    (p_user_id, 'voltar', ARRAY['voltar', '*', '0', '#', 'sair'], 'goto_menu', 'main', 90),
    (p_user_id, 'humano', ARRAY['atendente', 'humano', 'falar com alguém', 'pessoa'], 'human', NULL, 80)
  ON CONFLICT (user_id, trigger_name) DO NOTHING;
  
  -- Criar menu principal
  INSERT INTO chatbot_v3_menus (user_id, menu_key, title, message_text, parent_menu_key, sort_order)
  VALUES (
    p_user_id, 
    'main', 
    'Menu Principal',
    'Olá! 👋 Seja bem-vindo(a) à *{empresa}*!

Escolha uma opção:

*1* - 📋 Planos e Preços
*2* - 🆓 Solicitar Teste
*3* - 📲 Aplicativos
*4* - ❓ Suporte
*5* - 👤 Falar com Atendente

_Digite o número da opção desejada._',
    NULL,
    0
  )
  ON CONFLICT (user_id, menu_key) DO NOTHING;
  
  -- Submenus
  INSERT INTO chatbot_v3_menus (user_id, menu_key, title, message_text, parent_menu_key, sort_order)
  VALUES 
    (p_user_id, 'planos', 'Planos', '📋 *Nossos Planos*

*1* - Plano Mensal
*2* - Plano Trimestral  
*3* - Plano Semestral
*4* - Plano Anual

*0* - Voltar ao menu principal

_Digite o número do plano para mais detalhes._', 'main', 1),
    
    (p_user_id, 'teste', 'Teste', '🆓 *Solicitar Teste*

Quer experimentar nosso serviço gratuitamente?

Envie seu *nome* e *telefone* que entraremos em contato!

*0* - Voltar ao menu principal', 'main', 2),
    
    (p_user_id, 'apps', 'Aplicativos', '📲 *Aplicativos Disponíveis*

Nossos apps estão disponíveis para:
• TV Box
• Celular Android/iOS
• Smart TV
• Computador

Para receber o link de download, entre em contato!

*0* - Voltar ao menu principal', 'main', 3),
    
    (p_user_id, 'suporte', 'Suporte', '❓ *Suporte Técnico*

*1* - App não abre
*2* - Tela travando
*3* - Sem canais
*4* - Outros problemas

*0* - Voltar ao menu principal', 'main', 4)
  ON CONFLICT (user_id, menu_key) DO NOTHING;
  
  -- Criar opções do menu principal
  INSERT INTO chatbot_v3_options (menu_id, user_id, option_number, option_text, keywords, target_menu_key, action_type)
  SELECT 
    m.id,
    p_user_id,
    1,
    'Planos e Preços',
    ARRAY['plano', 'planos', 'preço', 'preços', 'valor', 'valores'],
    'planos',
    'menu'
  FROM chatbot_v3_menus m WHERE m.user_id = p_user_id AND m.menu_key = 'main'
  ON CONFLICT DO NOTHING;
  
  INSERT INTO chatbot_v3_options (menu_id, user_id, option_number, option_text, keywords, target_menu_key, action_type)
  SELECT 
    m.id,
    p_user_id,
    2,
    'Solicitar Teste',
    ARRAY['teste', 'testar', 'experimentar', 'grátis', 'gratuito'],
    'teste',
    'menu'
  FROM chatbot_v3_menus m WHERE m.user_id = p_user_id AND m.menu_key = 'main'
  ON CONFLICT DO NOTHING;
  
  INSERT INTO chatbot_v3_options (menu_id, user_id, option_number, option_text, keywords, target_menu_key, action_type)
  SELECT 
    m.id,
    p_user_id,
    3,
    'Aplicativos',
    ARRAY['app', 'apps', 'aplicativo', 'aplicativos', 'baixar', 'download'],
    'apps',
    'menu'
  FROM chatbot_v3_menus m WHERE m.user_id = p_user_id AND m.menu_key = 'main'
  ON CONFLICT DO NOTHING;
  
  INSERT INTO chatbot_v3_options (menu_id, user_id, option_number, option_text, keywords, target_menu_key, action_type)
  SELECT 
    m.id,
    p_user_id,
    4,
    'Suporte',
    ARRAY['suporte', 'ajuda', 'problema', 'erro', 'bug'],
    'suporte',
    'menu'
  FROM chatbot_v3_menus m WHERE m.user_id = p_user_id AND m.menu_key = 'main'
  ON CONFLICT DO NOTHING;
  
  INSERT INTO chatbot_v3_options (menu_id, user_id, option_number, option_text, keywords, target_menu_key, action_type)
  SELECT 
    m.id,
    p_user_id,
    5,
    'Falar com Atendente',
    ARRAY['atendente', 'humano', 'pessoa', 'falar'],
    NULL,
    'human'
  FROM chatbot_v3_menus m WHERE m.user_id = p_user_id AND m.menu_key = 'main'
  ON CONFLICT DO NOTHING;

END;
$$;

-- Trigger para auto-criar chatbot para novos usuários
CREATE OR REPLACE FUNCTION public.auto_create_chatbot_v3()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Criar chatbot padrão para o novo usuário
  PERFORM create_default_chatbot_v3(NEW.id);
  RETURN NEW;
END;
$$;

-- Conectar trigger ao profiles (executa após criar profile)
DROP TRIGGER IF EXISTS trigger_auto_create_chatbot_v3 ON public.profiles;
CREATE TRIGGER trigger_auto_create_chatbot_v3
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_chatbot_v3();