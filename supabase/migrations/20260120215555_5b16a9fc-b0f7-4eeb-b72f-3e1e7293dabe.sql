-- Add image_url column to admin_chatbot_config (for admin chatbot nodes/menus)
ALTER TABLE public.admin_chatbot_config
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to admin_chatbot_keywords (for keyword responses)
ALTER TABLE public.admin_chatbot_keywords
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to chatbot_rules (for reseller rules)
ALTER TABLE public.chatbot_rules
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to chatbot_templates (for reseller templates)
ALTER TABLE public.chatbot_templates
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment explaining the fields
COMMENT ON COLUMN public.admin_chatbot_config.image_url IS 'URL de imagem opcional para enviar junto com a mensagem';
COMMENT ON COLUMN public.admin_chatbot_keywords.image_url IS 'URL de imagem opcional para enviar junto com a resposta da palavra-chave';
COMMENT ON COLUMN public.chatbot_rules.image_url IS 'URL de imagem opcional para enviar junto com a resposta da regra';
COMMENT ON COLUMN public.chatbot_templates.image_url IS 'URL de imagem opcional para enviar junto com a resposta do template';