-- Atualizar whatsapp_global_config com o instance_name do ADM
UPDATE public.whatsapp_global_config
SET 
  instance_name = 'Sandel',
  admin_user_id = (
    SELECT ur.user_id 
    FROM public.user_roles ur
    INNER JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.role = 'admin' AND LOWER(p.email) = 'sandelrodrig@gmail.com'
    LIMIT 1
  ),
  updated_at = NOW()
WHERE is_active = true;

-- Garantir que o usuário sandelrodrig@gmail.com tenha role admin (sem ON CONFLICT)
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Buscar o user_id
  SELECT id INTO v_user_id FROM public.profiles WHERE LOWER(email) = 'sandelrodrig@gmail.com' LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Verificar se já existe role
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id) THEN
      UPDATE public.user_roles SET role = 'admin' WHERE user_id = v_user_id;
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin');
    END IF;
    
    -- Marcar como permanente
    UPDATE public.profiles SET is_permanent = true WHERE id = v_user_id;
  END IF;
END $$;