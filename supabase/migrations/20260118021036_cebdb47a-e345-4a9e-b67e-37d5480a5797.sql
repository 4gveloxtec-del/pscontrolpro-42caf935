-- Add payment overdue template for all existing sellers
DO $$
DECLARE
  seller_record RECORD;
BEGIN
  FOR seller_record IN 
    SELECT DISTINCT seller_id FROM whatsapp_templates WHERE seller_id IS NOT NULL
  LOOP
    -- Cobrança - 1 dia após vencimento
    INSERT INTO public.whatsapp_templates (seller_id, name, type, message, is_default)
    VALUES (
      seller_record.seller_id, 
      'Cobrança - 1 dia após vencimento', 
      'payment_overdue_1day', 
      '⚠️ Olá {nome}!

Passamos para lembrar que o pagamento do seu plano está *1 dia atrasado* 📅

💰 *Valor pendente:* R$ {valor_pendente}
📆 *Data combinada:* {data_pagamento}

Sabemos que imprevistos acontecem! 🤝 Por isso, estamos aqui para ajudar.

✅ Regularize sua situação para continuar aproveitando nossos serviços sem interrupções.

Qualquer dúvida, estamos à disposição! 💬

*{empresa}*', 
      true
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Update the function to include this template for new sellers
CREATE OR REPLACE FUNCTION public.create_default_templates_for_seller(seller_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- IPTV Templates
  INSERT INTO public.whatsapp_templates (seller_id, name, type, message, is_default)
  VALUES
    (seller_uuid, 'IPTV - Boas-vindas', 'welcome', '🎉 Olá {nome}!

Seja bem-vindo(a) à nossa família! 

📺 *Plano:* {plano}
📆 *Vencimento:* {vencimento}
🔑 *Login:* {login}
🔐 *Senha:* {senha}
🌐 *DNS:* {dns}

Qualquer dúvida, estamos à disposição!

*{empresa}*', true),
    (seller_uuid, 'IPTV - Cobrança', 'billing', '💰 Olá {nome}!

Seu plano vence em breve:

📺 *Plano:* {plano}
📆 *Vencimento:* {vencimento}
💵 *Valor:* R$ {valor}

Entre em contato para renovar! 

*{empresa}*', true),
    (seller_uuid, 'IPTV - Vencendo em 3 dias', 'expiring_3days', '⏰ Olá {nome}!

Seu plano IPTV vence em *3 dias* ({vencimento}).

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora e não perca seus canais favoritos! 📺

*{empresa}*', true),
    (seller_uuid, 'IPTV - Vencendo em 2 dias', 'expiring_2days', '⏰ Olá {nome}!

Seu plano IPTV vence em *2 dias* ({vencimento}).

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Não deixe para última hora! Renove já! 📺

*{empresa}*', true),
    (seller_uuid, 'IPTV - Vencendo amanhã', 'expiring_1day', '🚨 Olá {nome}!

Seu plano IPTV vence *AMANHÃ* ({vencimento})!

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora para não ficar sem acesso! 📺

*{empresa}*', true),
    (seller_uuid, 'IPTV - Vencido', 'expired', '❌ Olá {nome}!

Seu plano IPTV *venceu* em {vencimento}.

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora e volte a assistir seus canais! 📺

*{empresa}*', true),
    (seller_uuid, 'IPTV - Renovação confirmada', 'renewal', '✅ Olá {nome}!

Sua renovação foi confirmada! 🎉

📺 *Plano:* {plano}
📆 *Novo vencimento:* {vencimento}
🔑 *Login:* {login}
🔐 *Senha:* {senha}

Obrigado por continuar conosco! 🙏

*{empresa}*', true),

  -- P2P Templates
    (seller_uuid, 'P2P - Boas-vindas', 'welcome', '🎉 Olá {nome}!

Seja bem-vindo(a) à nossa família! 

📺 *Plano P2P:* {plano}
📆 *Vencimento:* {vencimento}
🔑 *Login:* {login}
🔐 *Senha:* {senha}
🖥️ *Servidor:* {servidor}

Qualquer dúvida, estamos à disposição!

*{empresa}*', true),
    (seller_uuid, 'P2P - Cobrança', 'billing', '💰 Olá {nome}!

Seu plano P2P vence em breve:

📺 *Plano:* {plano}
📆 *Vencimento:* {vencimento}
💵 *Valor:* R$ {valor}

Entre em contato para renovar! 

*{empresa}*', true),
    (seller_uuid, 'P2P - Vencendo em 3 dias', 'expiring_3days', '⏰ Olá {nome}!

Seu plano P2P vence em *3 dias* ({vencimento}).

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora e continue assistindo! 📺

*{empresa}*', true),
    (seller_uuid, 'P2P - Vencendo em 2 dias', 'expiring_2days', '⏰ Olá {nome}!

Seu plano P2P vence em *2 dias* ({vencimento}).

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Não deixe para última hora! Renove já! 📺

*{empresa}*', true),
    (seller_uuid, 'P2P - Vencendo amanhã', 'expiring_1day', '🚨 Olá {nome}!

Seu plano P2P vence *AMANHÃ* ({vencimento})!

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora para não ficar sem acesso! 📺

*{empresa}*', true),
    (seller_uuid, 'P2P - Vencido', 'expired', '❌ Olá {nome}!

Seu plano P2P *venceu* em {vencimento}.

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora e volte a assistir! 📺

*{empresa}*', true),
    (seller_uuid, 'P2P - Renovação confirmada', 'renewal', '✅ Olá {nome}!

Sua renovação P2P foi confirmada! 🎉

📺 *Plano:* {plano}
📆 *Novo vencimento:* {vencimento}
🔑 *Login:* {login}
🔐 *Senha:* {senha}
🖥️ *Servidor:* {servidor}

Obrigado por continuar conosco! 🙏

*{empresa}*', true),

  -- Premium Templates
    (seller_uuid, 'Premium - Boas-vindas', 'welcome', '🎉 Olá {nome}!

Seja bem-vindo(a) ao seu plano Premium! ⭐

📺 *Plano:* {plano_premium}
📆 *Vencimento:* {vencimento}
📧 *Email:* {email_premium}
🔐 *Senha:* {senha_premium}

Qualquer dúvida, estamos à disposição!

*{empresa}*', true),
    (seller_uuid, 'Premium - Cobrança', 'billing', '💰 Olá {nome}!

Seu plano Premium vence em breve:

📺 *Plano:* {plano_premium}
📆 *Vencimento:* {vencimento}
💵 *Valor:* R$ {valor_premium}

Entre em contato para renovar! 

*{empresa}*', true),
    (seller_uuid, 'Premium - Vencendo em 3 dias', 'expiring_3days', '⏰ Olá {nome}!

Seu plano Premium vence em *3 dias* ({vencimento}).

📺 *Plano:* {plano_premium}
💰 *Valor para renovação:* R$ {valor_premium}

Renove agora e continue aproveitando! ⭐

*{empresa}*', true),
    (seller_uuid, 'Premium - Vencendo em 2 dias', 'expiring_2days', '⏰ Olá {nome}!

Seu plano Premium vence em *2 dias* ({vencimento}).

📺 *Plano:* {plano_premium}
💰 *Valor para renovação:* R$ {valor_premium}

Não deixe para última hora! Renove já! ⭐

*{empresa}*', true),
    (seller_uuid, 'Premium - Vencendo amanhã', 'expiring_1day', '🚨 Olá {nome}!

Seu plano Premium vence *AMANHÃ* ({vencimento})!

📺 *Plano:* {plano_premium}
💰 *Valor para renovação:* R$ {valor_premium}

Renove agora para não perder acesso! ⭐

*{empresa}*', true),
    (seller_uuid, 'Premium - Vencido', 'expired', '❌ Olá {nome}!

Seu plano Premium *venceu* em {vencimento}.

📺 *Plano:* {plano_premium}
💰 *Valor para renovação:* R$ {valor_premium}

Renove agora e volte a aproveitar! ⭐

*{empresa}*', true),
    (seller_uuid, 'Premium - Renovação confirmada', 'renewal', '✅ Olá {nome}!

Sua renovação Premium foi confirmada! 🎉

📺 *Plano:* {plano_premium}
📆 *Novo vencimento:* {vencimento}
📧 *Email:* {email_premium}
🔐 *Senha:* {senha_premium}

Obrigado por continuar conosco! 🙏

*{empresa}*', true),

  -- Cobrança - 1 dia após vencimento (para clientes que não pagaram)
    (seller_uuid, 'Cobrança - 1 dia após vencimento', 'payment_overdue_1day', '⚠️ Olá {nome}!

Passamos para lembrar que o pagamento do seu plano está *1 dia atrasado* 📅

💰 *Valor pendente:* R$ {valor_pendente}
📆 *Data combinada:* {data_pagamento}

Sabemos que imprevistos acontecem! 🤝 Por isso, estamos aqui para ajudar.

✅ Regularize sua situação para continuar aproveitando nossos serviços sem interrupções.

Qualquer dúvida, estamos à disposição! 💬

*{empresa}*', true);
END;
$function$;