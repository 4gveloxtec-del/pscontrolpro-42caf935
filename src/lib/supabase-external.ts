// Arquivo de compatibilidade - redireciona para o cliente Lovable Cloud
// TODOS os dados agora usam o Lovable Cloud unificado
import { supabase } from '@/integrations/supabase/client';

// Exportações para compatibilidade com código existente
export const supabaseWhatsApp = supabase;
export const supabaseExternal = supabase;

// Constantes removidas - usar variáveis de ambiente do Lovable Cloud
export const SUPABASE_EXTERNAL_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_EXTERNAL_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
