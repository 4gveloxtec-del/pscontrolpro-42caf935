-- Inserir role admin para o usuário existente (verificando se já existe)
INSERT INTO public.user_roles (user_id, role)
SELECT '63f2d73c-1632-4ff0-a03c-42992e63d0fa', 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '63f2d73c-1632-4ff0-a03c-42992e63d0fa'
);