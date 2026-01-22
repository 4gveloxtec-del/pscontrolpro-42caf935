-- Função segura para retornar o status da API global (apenas is_active)
-- Revendedores podem chamar esta função sem expor token/url sensíveis
CREATE OR REPLACE FUNCTION public.get_global_api_status()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_active, false) 
  FROM whatsapp_global_config 
  LIMIT 1;
$$;

-- Permitir que usuários autenticados executem a função
GRANT EXECUTE ON FUNCTION public.get_global_api_status() TO authenticated;