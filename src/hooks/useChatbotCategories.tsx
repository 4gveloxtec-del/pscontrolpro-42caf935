import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ChatbotCategory {
  id: string;
  seller_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useChatbotCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ChatbotCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('chatbot_template_categories')
      .select('*')
      .eq('seller_id', user.id)
      .order('sort_order');
    
    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }
    
    setCategories(data || []);
  }, [user]);

  const createDefaultCategories = useCallback(async () => {
    if (!user) return;
    
    const { error } = await supabase.rpc('create_default_chatbot_categories', {
      p_seller_id: user.id
    });
    
    if (error) {
      console.error('Error creating default categories:', error);
      return;
    }
    
    await fetchCategories();
  }, [user, fetchCategories]);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      fetchCategories().then(() => {
        // Check if we need to create default categories
        supabase
          .from('chatbot_template_categories')
          .select('id')
          .eq('seller_id', user.id)
          .limit(1)
          .then(({ data }) => {
            if (!data || data.length === 0) {
              createDefaultCategories();
            }
          });
      }).finally(() => setIsLoading(false));
    }
  }, [user, fetchCategories, createDefaultCategories]);

  const createCategory = async (category: Omit<ChatbotCategory, 'id' | 'seller_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return { error: 'Not authenticated' };
    
    const { data, error } = await supabase
      .from('chatbot_template_categories')
      .insert({
        seller_id: user.id,
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        sort_order: category.sort_order,
        is_active: category.is_active,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Erro ao criar categoria: ' + error.message);
      return { error: error.message };
    }
    
    await fetchCategories();
    toast.success('Categoria criada!');
    return { data };
  };

  const updateCategory = async (id: string, updates: Partial<ChatbotCategory>) => {
    const { error } = await supabase
      .from('chatbot_template_categories')
      .update({
        name: updates.name,
        description: updates.description,
        color: updates.color,
        icon: updates.icon,
        sort_order: updates.sort_order,
        is_active: updates.is_active,
      })
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao atualizar categoria: ' + error.message);
      return { error: error.message };
    }
    
    await fetchCategories();
    toast.success('Categoria atualizada!');
    return { success: true };
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('chatbot_template_categories')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir categoria: ' + error.message);
      return { error: error.message };
    }
    
    await fetchCategories();
    toast.success('Categoria excluída!');
    return { success: true };
  };

  return {
    categories,
    isLoading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    createDefaultCategories,
  };
}
