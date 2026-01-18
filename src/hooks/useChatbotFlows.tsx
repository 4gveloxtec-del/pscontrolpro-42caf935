import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ChatbotFlow {
  id: string;
  seller_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_main_menu: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatbotFlowNode {
  id: string;
  flow_id: string;
  seller_id: string;
  parent_node_id?: string;
  option_number: string;
  title: string;
  description?: string;
  response_type: 'text' | 'text_image' | 'submenu' | 'template' | 'human_transfer' | 'end_chat';
  response_content: {
    text: string;
    image_url?: string;
  };
  template_id?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: ChatbotFlowNode[];
}

export function useChatbotFlows() {
  const { user } = useAuth();
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [nodes, setNodes] = useState<ChatbotFlowNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFlows = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('chatbot_flows')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at');
    
    if (error) {
      console.error('Error fetching flows:', error);
      return;
    }
    
    setFlows(data || []);
  }, [user]);

  const fetchNodes = useCallback(async (flowId?: string) => {
    if (!user) return;
    
    let query = supabase
      .from('chatbot_flow_nodes')
      .select('*')
      .eq('seller_id', user.id)
      .order('sort_order');
    
    if (flowId) {
      query = query.eq('flow_id', flowId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching nodes:', error);
      return;
    }
    
    setNodes((data || []) as unknown as ChatbotFlowNode[]);
  }, [user]);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([fetchFlows(), fetchNodes()]).finally(() => setIsLoading(false));
    }
  }, [user, fetchFlows, fetchNodes]);

  // Build tree structure from flat nodes
  const buildNodeTree = (flowId: string): ChatbotFlowNode[] => {
    const flowNodes = nodes.filter(n => n.flow_id === flowId);
    const nodeMap = new Map<string, ChatbotFlowNode>();
    const rootNodes: ChatbotFlowNode[] = [];

    // First pass: create map
    flowNodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    // Second pass: build tree
    flowNodes.forEach(node => {
      const nodeWithChildren = nodeMap.get(node.id)!;
      if (node.parent_node_id && nodeMap.has(node.parent_node_id)) {
        nodeMap.get(node.parent_node_id)!.children!.push(nodeWithChildren);
      } else {
        rootNodes.push(nodeWithChildren);
      }
    });

    return rootNodes.sort((a, b) => a.sort_order - b.sort_order);
  };

  const createFlow = async (flow: Omit<ChatbotFlow, 'id' | 'seller_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return { error: 'Not authenticated' };
    
    // If this is set as main menu, unset others
    if (flow.is_main_menu) {
      await supabase
        .from('chatbot_flows')
        .update({ is_main_menu: false })
        .eq('seller_id', user.id);
    }
    
    const { data, error } = await supabase
      .from('chatbot_flows')
      .insert({
        seller_id: user.id,
        name: flow.name,
        description: flow.description,
        is_active: flow.is_active,
        is_main_menu: flow.is_main_menu,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Erro ao criar fluxo: ' + error.message);
      return { error: error.message };
    }
    
    await fetchFlows();
    toast.success('Fluxo criado!');
    return { data };
  };

  const updateFlow = async (id: string, updates: Partial<ChatbotFlow>) => {
    if (!user) return { error: 'Not authenticated' };
    
    // If setting as main menu, unset others first
    if (updates.is_main_menu) {
      await supabase
        .from('chatbot_flows')
        .update({ is_main_menu: false })
        .eq('seller_id', user.id)
        .neq('id', id);
    }
    
    const { error } = await supabase
      .from('chatbot_flows')
      .update({
        name: updates.name,
        description: updates.description,
        is_active: updates.is_active,
        is_main_menu: updates.is_main_menu,
      })
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao atualizar fluxo: ' + error.message);
      return { error: error.message };
    }
    
    await fetchFlows();
    toast.success('Fluxo atualizado!');
    return { success: true };
  };

  const deleteFlow = async (id: string) => {
    const { error } = await supabase
      .from('chatbot_flows')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir fluxo: ' + error.message);
      return { error: error.message };
    }
    
    await fetchFlows();
    await fetchNodes();
    toast.success('Fluxo excluído!');
    return { success: true };
  };

  const createNode = async (node: Omit<ChatbotFlowNode, 'id' | 'seller_id' | 'created_at' | 'updated_at' | 'children'>) => {
    if (!user) return { error: 'Not authenticated' };
    
    const { data, error } = await supabase
      .from('chatbot_flow_nodes')
      .insert({
        seller_id: user.id,
        flow_id: node.flow_id,
        parent_node_id: node.parent_node_id,
        option_number: node.option_number,
        title: node.title,
        description: node.description,
        response_type: node.response_type,
        response_content: node.response_content,
        template_id: node.template_id,
        sort_order: node.sort_order,
        is_active: node.is_active,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Erro ao criar opção: ' + error.message);
      return { error: error.message };
    }
    
    await fetchNodes(node.flow_id);
    toast.success('Opção criada!');
    return { data };
  };

  const updateNode = async (id: string, updates: Partial<ChatbotFlowNode>) => {
    const { error } = await supabase
      .from('chatbot_flow_nodes')
      .update({
        option_number: updates.option_number,
        title: updates.title,
        description: updates.description,
        response_type: updates.response_type,
        response_content: updates.response_content,
        template_id: updates.template_id,
        sort_order: updates.sort_order,
        is_active: updates.is_active,
      })
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao atualizar opção: ' + error.message);
      return { error: error.message };
    }
    
    await fetchNodes();
    toast.success('Opção atualizada!');
    return { success: true };
  };

  const deleteNode = async (id: string) => {
    const { error } = await supabase
      .from('chatbot_flow_nodes')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir opção: ' + error.message);
      return { error: error.message };
    }
    
    await fetchNodes();
    toast.success('Opção excluída!');
    return { success: true };
  };

  return {
    flows,
    nodes,
    isLoading,
    fetchFlows,
    fetchNodes,
    buildNodeTree,
    createFlow,
    updateFlow,
    deleteFlow,
    createNode,
    updateNode,
    deleteNode,
  };
}
