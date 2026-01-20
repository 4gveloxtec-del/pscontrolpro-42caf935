import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminChatbotConfig, ChatbotNode, ChatbotOption } from '@/hooks/useAdminChatbotConfig';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { 
  Send, 
  RotateCcw, 
  Bot, 
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronRight,
  AlertTriangle,
  Settings2,
  Eye,
  FileText,
  Import,
  Settings,
  Copy,
  CheckCircle2,
  Loader2,
  Clock,
  Repeat
} from 'lucide-react';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  type: string;
  message: string;
  seller_id: string;
}

const ICON_OPTIONS = ['🏠', '📋', '💰', '🎁', '📱', '🍎', '🔥', '📺', '💻', '❓', '💳', '🛠️', '👨‍💻', '⭐', '🎯', '📦'];

export default function AdminChatbot() {
  const { nodes, isLoading, getNodeByKey, createNode, updateNode, deleteNode, processUserInput } = useAdminChatbotConfig();
  
  // Tab state - controlled to persist selection after saves
  const [activeTab, setActiveTab] = useState('simulator');
  
  // Simulator state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentNodeKey, setCurrentNodeKey] = useState('inicial');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Editor state
  const [showNodeDialog, setShowNodeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [editingNode, setEditingNode] = useState<ChatbotNode | null>(null);
  const [deletingNodeId, setDeletingNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  
  // Settings state
  const [settingsForm, setSettingsForm] = useState({
    is_enabled: false,
    response_delay_min: 2,
    response_delay_max: 5,
    typing_enabled: true,
    typing_duration_min: 2,
    typing_duration_max: 5,
    response_mode: 'always' as 'always' | '6h' | '12h' | '24h',
    ignore_invalid: true,
  });

  // Fetch admin chatbot settings from app_settings
  const { data: adminSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['admin-chatbot-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['admin_chatbot_enabled', 'admin_chatbot_delay_min', 'admin_chatbot_delay_max', 'admin_chatbot_typing_enabled', 'admin_chatbot_typing_min', 'admin_chatbot_typing_max', 'admin_chatbot_response_mode', 'admin_chatbot_ignore_invalid']);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch keywords
  const { data: keywords = [], refetch: refetchKeywords } = useQuery({
    queryKey: ['admin-chatbot-keywords'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_chatbot_keywords')
        .select('*')
        .order('keyword');
      if (error) throw error;
      return data || [];
    },
  });

  // Keywords state
  const [showKeywordDialog, setShowKeywordDialog] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<{ id: string; keyword: string; response_text: string; is_active: boolean; image_url?: string } | null>(null);
  const [keywordForm, setKeywordForm] = useState({ keyword: '', response_text: '', is_active: true, image_url: '' });

  // Parse settings from app_settings
  useEffect(() => {
    if (adminSettings) {
      const settings: Record<string, string> = {};
      adminSettings.forEach(s => { settings[s.key] = s.value; });
      
      setSettingsForm({
        is_enabled: settings.admin_chatbot_enabled === 'true',
        response_delay_min: parseInt(settings.admin_chatbot_delay_min || '2'),
        response_delay_max: parseInt(settings.admin_chatbot_delay_max || '5'),
        typing_enabled: settings.admin_chatbot_typing_enabled !== 'false',
        typing_duration_min: parseInt(settings.admin_chatbot_typing_min || '2'),
        typing_duration_max: parseInt(settings.admin_chatbot_typing_max || '5'),
        response_mode: (settings.admin_chatbot_response_mode as 'always' | '6h' | '12h' | '24h') || 'always',
        ignore_invalid: settings.admin_chatbot_ignore_invalid !== 'false',
      });
    }
  }, [adminSettings]);

  // Keyword CRUD functions
  const saveKeyword = async () => {
    if (!keywordForm.keyword || !keywordForm.response_text) return;

    if (editingKeyword) {
      await supabase
        .from('admin_chatbot_keywords')
        .update({ 
          keyword: keywordForm.keyword, 
          response_text: keywordForm.response_text, 
          is_active: keywordForm.is_active,
          image_url: keywordForm.image_url || null 
        })
        .eq('id', editingKeyword.id);
    } else {
      await supabase
        .from('admin_chatbot_keywords')
        .insert({ 
          keyword: keywordForm.keyword, 
          response_text: keywordForm.response_text, 
          is_active: keywordForm.is_active,
          image_url: keywordForm.image_url || null 
        });
    }

    setShowKeywordDialog(false);
    setEditingKeyword(null);
    setKeywordForm({ keyword: '', response_text: '', is_active: true, image_url: '' });
    refetchKeywords();
  };

  const deleteKeyword = async (id: string) => {
    await supabase.from('admin_chatbot_keywords').delete().eq('id', id);
    refetchKeywords();
  };

  const saveAdminSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) console.error('Error saving setting:', error);
    refetchSettings();
  };

  const getWebhookUrl = () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'kgtqnjhmwsvswhrczqaf';
    return `https://${projectId}.supabase.co/functions/v1/chatbot-webhook?admin=true`;
  };

  const copyWebhookUrl = async () => {
    await navigator.clipboard.writeText(getWebhookUrl());
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };
  
  const [nodeForm, setNodeForm] = useState({
    node_key: '',
    title: '',
    content: '',
    parent_key: '',
    response_type: 'text' as 'menu' | 'text',
    icon: '📋',
    is_active: true,
    options: [] as ChatbotOption[],
    image_url: ''
  });

  // Fetch WhatsApp templates
  const { data: templates = [] } = useQuery({
    queryKey: ['admin-whatsapp-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('id, name, type, message, seller_id')
        .order('name');
      if (error) throw error;
      return data as WhatsAppTemplate[];
    },
  });

  // Group templates by type
  const templatesByType = templates.reduce((acc, t) => {
    const type = t.type || 'outros';
    if (!acc[type]) acc[type] = [];
    acc[type].push(t);
    return acc;
  }, {} as Record<string, WhatsAppTemplate[]>);

  const handleImportTemplate = (template: WhatsAppTemplate) => {
    setNodeForm(prev => ({
      ...prev,
      content: template.message,
      title: prev.title || template.name,
    }));
    setShowTemplateSelector(false);
  };

  // Initialize chat with inicial node
  useEffect(() => {
    if (!isLoading && nodes.length > 0) {
      const inicial = getNodeByKey('inicial');
      if (inicial) {
        setMessages([{
          id: crypto.randomUUID(),
          type: 'bot',
          content: inicial.content,
          timestamp: new Date()
        }]);
      }
    }
  }, [isLoading, nodes, getNodeByKey]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const addBotMessage = (content: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'bot',
        content,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 500);
  };

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'user',
      content,
      timestamp: new Date()
    }]);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    addUserMessage(input);
    
    const { nextNode, message } = processUserInput(currentNodeKey, input);
    if (nextNode) {
      setCurrentNodeKey(nextNode.node_key);
    }
    // Only add bot message if there's a response (silent mode for invalid options)
    if (message && message.trim() !== '') {
      addBotMessage(message);
    }
    
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setCurrentNodeKey('inicial');
    setTimeout(() => {
      const inicial = getNodeByKey('inicial');
      if (inicial) {
        addBotMessage(inicial.content);
      }
    }, 100);
  };

  const formatMessage = (content: string) => {
    let formatted = content.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" class="text-blue-400 hover:underline break-all">$1</a>'
    );
    formatted = formatted.replace(/\n/g, '<br />');
    return formatted;
  };

  const getCurrentNodeInfo = () => {
    const node = getNodeByKey(currentNodeKey);
    return node ? { icon: node.icon, title: node.title } : { icon: '🏠', title: 'Menu' };
  };

  // Editor functions
  const resetNodeForm = () => {
    setNodeForm({
      node_key: '',
      title: '',
      content: '',
      parent_key: '',
      response_type: 'text',
      icon: '📋',
      is_active: true,
      options: [],
      image_url: ''
    });
    setEditingNode(null);
  };

  const openEditNode = (node: ChatbotNode) => {
    setEditingNode(node);
    setNodeForm({
      node_key: node.node_key,
      title: node.title,
      content: node.content,
      parent_key: node.parent_key || '',
      response_type: node.response_type,
      icon: node.icon,
      is_active: node.is_active,
      options: node.options || [],
      image_url: (node as any).image_url || ''
    });
    setShowNodeDialog(true);
  };

  const openAddNode = (parentKey?: string) => {
    resetNodeForm();
    if (parentKey) {
      setNodeForm(prev => ({ ...prev, parent_key: parentKey }));
    }
    setShowNodeDialog(true);
  };

  const handleSaveNode = async () => {
    if (!nodeForm.node_key || !nodeForm.title || !nodeForm.content) {
      return;
    }

    setIsSaving(true);

    if (editingNode) {
      await updateNode(editingNode.id, {
        title: nodeForm.title,
        content: nodeForm.content,
        parent_key: nodeForm.parent_key || null,
        response_type: nodeForm.response_type,
        icon: nodeForm.icon,
        is_active: nodeForm.is_active,
        options: nodeForm.options,
        image_url: nodeForm.image_url || null
      });
    } else {
      await createNode({
        node_key: nodeForm.node_key,
        title: nodeForm.title,
        content: nodeForm.content,
        parent_key: nodeForm.parent_key || null,
        response_type: nodeForm.response_type,
        icon: nodeForm.icon,
        is_active: nodeForm.is_active,
        options: nodeForm.options,
        sort_order: nodes.length,
        image_url: nodeForm.image_url || null
      });
    }

    setIsSaving(false);
    setShowNodeDialog(false);
    resetNodeForm();
  };

  const handleDeleteNode = async () => {
    if (!deletingNodeId) return;
    await deleteNode(deletingNodeId);
    setShowDeleteDialog(false);
    setDeletingNodeId(null);
  };

  const addOption = () => {
    setNodeForm(prev => ({
      ...prev,
      options: [...prev.options, { key: String(prev.options.length + 1), label: '', target: '' }]
    }));
  };

  const updateOption = (index: number, field: keyof ChatbotOption, value: string) => {
    setNodeForm(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? { ...opt, [field]: value } : opt)
    }));
  };

  const removeOption = (index: number) => {
    setNodeForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const getParentOptions = () => {
    return nodes.filter(n => n.response_type === 'menu');
  };

  const getNodeTree = () => {
    const rootNodes = nodes.filter(n => !n.parent_key);
    const buildTree = (parentKey: string | null): ChatbotNode[] => {
      return nodes
        .filter(n => n.parent_key === parentKey)
        .sort((a, b) => a.sort_order - b.sort_order);
    };
    return { rootNodes: rootNodes.sort((a, b) => a.sort_order - b.sort_order), buildTree };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show empty state if no nodes
  if (nodes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Bot className="h-7 w-7 text-blue-500" />
              Chatbot Interativo
            </h1>
            <p className="text-slate-400 mt-1">
              Configure e teste o atendimento automatizado
            </p>
          </div>
        </div>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nenhum menu configurado</h3>
            <p className="text-slate-400 text-center mb-6 max-w-md">
              O chatbot ainda não possui menus configurados. Crie o primeiro menu para começar a configurar o atendimento automatizado.
            </p>
            <Button 
              onClick={() => {
                setNodeForm({
                  node_key: 'inicial',
                  title: 'Menu Principal',
                  content: '👋 Olá! Seja bem-vindo(a)!\n\nEscolha uma opção:\n\n1️⃣ Conhecer os Planos\n2️⃣ Teste Grátis 🎁\n3️⃣ Suporte Técnico',
                  parent_key: '',
                  response_type: 'menu',
                  icon: '🏠',
                  is_active: true,
                  options: [
                    { key: '1', label: 'Conhecer os Planos', target: 'planos' },
                    { key: '2', label: 'Teste Grátis', target: 'teste' },
                    { key: '3', label: 'Suporte', target: 'suporte' }
                  ],
                  image_url: ''
                });
                setShowNodeDialog(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Menu Inicial
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { rootNodes, buildTree } = getNodeTree();
  const nodeInfo = getCurrentNodeInfo();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="h-7 w-7 text-blue-500" />
            Chatbot Interativo
          </h1>
          <p className="text-slate-400 mt-1">
            Configure e teste o atendimento automatizado
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${settingsForm.is_enabled ? 'bg-green-600/20 border border-green-500/30' : 'bg-slate-700 border border-slate-600'}`}>
            <Switch
              checked={settingsForm.is_enabled}
              onCheckedChange={(checked) => {
                setSettingsForm(prev => ({ ...prev, is_enabled: checked }));
                saveAdminSetting('admin_chatbot_enabled', String(checked));
              }}
            />
            <Label className={settingsForm.is_enabled ? 'text-green-400' : 'text-slate-400'}>
              {settingsForm.is_enabled ? 'Ativo' : 'Inativo'}
            </Label>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="simulator" className="data-[state=active]:bg-blue-600">
            <Eye className="h-4 w-4 mr-2" />
            Simulador
          </TabsTrigger>
          <TabsTrigger value="editor" className="data-[state=active]:bg-blue-600">
            <Settings2 className="h-4 w-4 mr-2" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* SIMULATOR TAB */}
        <TabsContent value="simulator">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 bg-slate-800 border-slate-700">
              <CardHeader className="border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                      <Bot className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">SANPLAY IPTV</CardTitle>
                      <CardDescription className="text-green-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        Online
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      <span className="mr-1">{nodeInfo.icon}</span>
                      {nodeInfo.title}
                    </Badge>
                    <Button
                      onClick={handleReset}
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px] p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            message.type === 'user'
                              ? 'bg-blue-600 text-white rounded-br-md'
                              : 'bg-slate-700 text-slate-100 rounded-bl-md'
                          }`}
                        >
                          <div
                            className="text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                          />
                          <div className={`text-xs mt-1 ${message.type === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                            {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-slate-700">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                    <Button onClick={handleSend} className="bg-blue-600 hover:bg-blue-700">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    💡 Dica: Digite * a qualquer momento para voltar ao menu principal
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '*'].map((option) => (
                    <Button
                      key={option}
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      onClick={() => {
                        addUserMessage(option);
                        const { nextNode, message } = processUserInput(currentNodeKey, option);
                        if (nextNode) {
                          setCurrentNodeKey(nextNode.node_key);
                        }
                        // Only add bot message if there's a response
                        if (message && message.trim() !== '') {
                          addBotMessage(message);
                        }
                      }}
                    >
                      {option === '*' ? '🏠 Menu' : `${option}️⃣`}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Estrutura</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm max-h-[300px] overflow-y-auto">
                  {rootNodes.map(node => (
                    <div key={node.id}>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span>{node.icon}</span>
                        <span>{node.title}</span>
                      </div>
                      {node.options.length > 0 && (
                        <div className="ml-4 mt-1 space-y-1">
                          {node.options.map((opt, i) => {
                            const targetNode = getNodeByKey(opt.target);
                            return (
                              <div key={i} className="flex items-center gap-1 text-slate-500 text-xs">
                                <ChevronRight className="h-3 w-3" />
                                <span>{opt.key}️⃣</span>
                                <span>{targetNode?.title || opt.target}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* EDITOR TAB */}
        <TabsContent value="editor">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-slate-400">Gerencie os menus e respostas do chatbot</p>
              <Button onClick={() => openAddNode()} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Novo Menu
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {nodes.map(node => (
                <Card key={node.id} className={`bg-slate-800 border-slate-700 ${!node.is_active ? 'opacity-50' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{node.icon}</span>
                        <div>
                          <CardTitle className="text-white text-base">{node.title}</CardTitle>
                          <CardDescription className="text-slate-500 text-xs">
                            {node.node_key}
                            {node.parent_key && ` → ${node.parent_key}`}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={node.response_type === 'menu' ? 'default' : 'secondary'} className="text-xs">
                        {node.response_type === 'menu' ? 'Menu' : 'Texto'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-slate-400 line-clamp-3 bg-slate-900 p-2 rounded">
                      {node.content.substring(0, 150)}...
                    </div>
                    
                    {node.options.length > 0 && (
                      <div className="text-xs text-slate-500">
                        {node.options.length} opções configuradas
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-slate-600 text-slate-300"
                        onClick={() => openEditNode(node)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      {node.node_key !== 'inicial' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-400 hover:bg-red-600/20"
                          onClick={() => {
                            setDeletingNodeId(node.id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Webhook Configuration */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Webhook do Chatbot
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure na Evolution API para receber mensagens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">URL do Webhook</Label>
                  <div className="flex gap-2">
                    <Input
                      value={getWebhookUrl()}
                      readOnly
                      className="bg-slate-700 border-slate-600 text-slate-300 text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyWebhookUrl}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      {copiedWebhook ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <h4 className="font-medium text-white mb-2">Como configurar:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-slate-400">
                    <li>Acesse o painel da Evolution API</li>
                    <li>Vá em Configurações da Instância → Webhook</li>
                    <li>Cole a URL acima no campo de Webhook</li>
                    <li>Habilite o evento <code className="bg-slate-800 px-1 rounded">messages.upsert</code></li>
                    <li>Salve as configurações</li>
                  </ol>
                </div>

                <div className={`flex items-center gap-2 p-3 rounded-lg ${settingsForm.is_enabled ? 'bg-green-600/20 border border-green-500/30' : 'bg-yellow-600/20 border border-yellow-500/30'}`}>
                  {settingsForm.is_enabled ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      <span className="text-green-400">Chatbot ativo e pronto para receber mensagens</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                      <span className="text-yellow-400">Chatbot desativado. Ative no topo da página.</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Delay Settings */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Comportamento
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Ajuste os delays para parecer mais humano
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Response Delay */}
                <div className="space-y-3">
                  <Label className="text-slate-300">Delay de Resposta (segundos)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500">Mínimo</Label>
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        value={settingsForm.response_delay_min}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setSettingsForm(prev => ({ ...prev, response_delay_min: val }));
                          saveAdminSetting('admin_chatbot_delay_min', String(val));
                        }}
                        className="bg-slate-700 border-slate-600"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Máximo</Label>
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        value={settingsForm.response_delay_max}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setSettingsForm(prev => ({ ...prev, response_delay_max: val }));
                          saveAdminSetting('admin_chatbot_delay_max', String(val));
                        }}
                        className="bg-slate-700 border-slate-600"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Tempo aleatório entre {settingsForm.response_delay_min}s e {settingsForm.response_delay_max}s antes de responder</p>
                </div>

                {/* Typing Simulation */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-300">Simular "Digitando..."</Label>
                    <Switch
                      checked={settingsForm.typing_enabled}
                      onCheckedChange={(checked) => {
                        setSettingsForm(prev => ({ ...prev, typing_enabled: checked }));
                        saveAdminSetting('admin_chatbot_typing_enabled', String(checked));
                      }}
                    />
                  </div>
                  
                  {settingsForm.typing_enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-slate-500">Mínimo (seg)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={30}
                          value={settingsForm.typing_duration_min}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setSettingsForm(prev => ({ ...prev, typing_duration_min: val }));
                            saveAdminSetting('admin_chatbot_typing_min', String(val));
                          }}
                          className="bg-slate-700 border-slate-600"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Máximo (seg)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={30}
                          value={settingsForm.typing_duration_max}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setSettingsForm(prev => ({ ...prev, typing_duration_max: val }));
                            saveAdminSetting('admin_chatbot_typing_max', String(val));
                          }}
                          className="bg-slate-700 border-slate-600"
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">Mostra "digitando..." no WhatsApp antes de enviar a mensagem</p>
                </div>
              </CardContent>
            </Card>

            {/* Response Frequency */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Repeat className="h-5 w-5" />
                  Frequência de Resposta
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Controle quantas vezes o bot responde ao mesmo contato
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div 
                    onClick={() => {
                      setSettingsForm(prev => ({ ...prev, response_mode: 'always' }));
                      saveAdminSetting('admin_chatbot_response_mode', 'always');
                    }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      settingsForm.response_mode === 'always' 
                        ? 'bg-green-600/20 border-green-500/50' 
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        settingsForm.response_mode === 'always' ? 'border-green-500' : 'border-slate-500'
                      }`}>
                        {settingsForm.response_mode === 'always' && (
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white flex items-center gap-2">
                          <Repeat className="h-4 w-4 text-green-400" />
                          Responder Sempre
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Responde a todas as mensagens recebidas (ideal para testes)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => {
                      setSettingsForm(prev => ({ ...prev, response_mode: '6h' }));
                      saveAdminSetting('admin_chatbot_response_mode', '6h');
                    }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      settingsForm.response_mode === '6h' 
                        ? 'bg-blue-600/20 border-blue-500/50' 
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        settingsForm.response_mode === '6h' ? 'border-blue-500' : 'border-slate-500'
                      }`}>
                        {settingsForm.response_mode === '6h' && (
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-400" />
                          A cada 6 horas
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Responde no máximo 1x a cada 6 horas por contato
                        </p>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => {
                      setSettingsForm(prev => ({ ...prev, response_mode: '12h' }));
                      saveAdminSetting('admin_chatbot_response_mode', '12h');
                    }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      settingsForm.response_mode === '12h' 
                        ? 'bg-orange-600/20 border-orange-500/50' 
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        settingsForm.response_mode === '12h' ? 'border-orange-500' : 'border-slate-500'
                      }`}>
                        {settingsForm.response_mode === '12h' && (
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-400" />
                          A cada 12 horas
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Responde no máximo 2x por dia por contato
                        </p>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => {
                      setSettingsForm(prev => ({ ...prev, response_mode: '24h' }));
                      saveAdminSetting('admin_chatbot_response_mode', '24h');
                    }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      settingsForm.response_mode === '24h' 
                        ? 'bg-purple-600/20 border-purple-500/50' 
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        settingsForm.response_mode === '24h' ? 'border-purple-500' : 'border-slate-500'
                      }`}>
                        {settingsForm.response_mode === '24h' && (
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white flex items-center gap-2">
                          <Clock className="h-4 w-4 text-purple-400" />
                          A cada 24 horas
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Responde no máximo 1x por dia por contato (produção)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  settingsForm.response_mode === 'always' 
                    ? 'bg-yellow-600/20 border border-yellow-500/30 text-yellow-400' 
                    : 'bg-slate-700/50 border border-slate-600 text-slate-400'
                }`}>
                  {settingsForm.response_mode === 'always' ? (
                    <>
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>Modo de testes ativo - o bot responde a todas as mensagens</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      <span>Modo produção - responde 1x a cada {settingsForm.response_mode === '6h' ? '6 horas' : settingsForm.response_mode === '12h' ? '12 horas' : '24 horas'}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Keywords Management */}
            <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      💬 Respostas por Palavras-Chave
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Configure respostas automáticas para palavras específicas (ex: Pix, Boleto)
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setEditingKeyword(null);
                      setKeywordForm({ keyword: '', response_text: '', is_active: true, image_url: '' });
                      setShowKeywordDialog(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Palavra-Chave
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {keywords.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p>Nenhuma palavra-chave configurada</p>
                    <p className="text-sm mt-1">Adicione palavras como "Pix", "Boleto", "Cancelamento" para respostas automáticas</p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {keywords.map((kw: any) => (
                      <div key={kw.id} className={`p-3 rounded-lg border ${kw.is_active ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-800/50 border-slate-700 opacity-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                            {kw.keyword}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={kw.is_active}
                              onCheckedChange={async (checked) => {
                                await supabase.from('admin_chatbot_keywords').update({ is_active: checked }).eq('id', kw.id);
                                refetchKeywords();
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400"
                              onClick={() => {
                                setEditingKeyword({ ...kw, image_url: kw.image_url || '' });
                                setKeywordForm({ keyword: kw.keyword, response_text: kw.response_text, is_active: kw.is_active, image_url: kw.image_url || '' });
                                setShowKeywordDialog(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400"
                              onClick={() => deleteKeyword(kw.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{kw.response_text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Keyword Dialog */}
      <Dialog open={showKeywordDialog} onOpenChange={setShowKeywordDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>{editingKeyword ? 'Editar Palavra-Chave' : 'Nova Palavra-Chave'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure uma resposta automática para quando o cliente digitar esta palavra
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Palavra-Chave</Label>
              <Input
                value={keywordForm.keyword}
                onChange={(e) => setKeywordForm(prev => ({ ...prev, keyword: e.target.value }))}
                placeholder="Ex: Pix, Boleto, Cancelamento"
                className="bg-slate-700 border-slate-600"
              />
              <p className="text-xs text-slate-500">A palavra que o cliente deve digitar para acionar a resposta</p>
            </div>

            <div className="space-y-2">
              <Label>Resposta Automática</Label>
              <Textarea
                value={keywordForm.response_text}
                onChange={(e) => setKeywordForm(prev => ({ ...prev, response_text: e.target.value }))}
                placeholder="Digite a mensagem que será enviada..."
                className="bg-slate-700 border-slate-600 min-h-[100px]"
              />
              <p className="text-xs text-slate-500">Use *texto* para negrito. Digite ***** (asterisco) em negrito para voltar ao menu.</p>
            </div>

            <div className="space-y-2">
              <Label>🖼️ Link da Imagem (opcional)</Label>
              <Input
                value={keywordForm.image_url}
                onChange={(e) => setKeywordForm(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://exemplo.com/imagem.jpg"
                className="bg-slate-700 border-slate-600"
              />
              <p className="text-xs text-slate-500">Cole o link direto da imagem (JPG, PNG, GIF) que deseja exibir junto à mensagem</p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={keywordForm.is_active}
                onCheckedChange={(checked) => setKeywordForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKeywordDialog(false)} className="border-slate-600">
              Cancelar
            </Button>
            <Button onClick={saveKeyword} className="bg-blue-600 hover:bg-blue-700">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Node Dialog */}
      <Dialog open={showNodeDialog} onOpenChange={setShowNodeDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNode ? 'Editar Menu' : 'Novo Menu'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure o conteúdo e opções do menu
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Chave (node_key)</Label>
                <Input
                  value={nodeForm.node_key}
                  onChange={(e) => setNodeForm(prev => ({ ...prev, node_key: e.target.value }))}
                  placeholder="ex: plano_mensal"
                  className="bg-slate-700 border-slate-600"
                  disabled={!!editingNode}
                />
              </div>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={nodeForm.title}
                  onChange={(e) => setNodeForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="ex: Plano Mensal"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select value={nodeForm.icon} onValueChange={(v) => setNodeForm(prev => ({ ...prev, icon: v }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {ICON_OPTIONS.map(icon => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select 
                  value={nodeForm.response_type} 
                  onValueChange={(v: 'menu' | 'text') => setNodeForm(prev => ({ ...prev, response_type: v }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="menu">Menu (com opções)</SelectItem>
                    <SelectItem value="text">Texto (resposta final)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Menu Pai</Label>
                <Select 
                  value={nodeForm.parent_key || 'none'} 
                  onValueChange={(v) => setNodeForm(prev => ({ ...prev, parent_key: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="none">Nenhum (raiz)</SelectItem>
                    {getParentOptions().map(n => (
                      <SelectItem key={n.node_key} value={n.node_key}>
                        {n.icon} {n.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conteúdo da Mensagem</Label>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                >
                  <Import className="h-3 w-3 mr-1" />
                  Importar Template
                </Button>
              </div>
              
              {/* Template Selector */}
              <Collapsible open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
                <CollapsibleContent className="bg-slate-900 rounded-lg p-3 border border-slate-700 mb-3 max-h-[200px] overflow-y-auto">
                  {templates.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-2">Nenhum template encontrado</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(templatesByType).map(([type, tpls]) => (
                        <div key={type}>
                          <p className="text-xs font-medium text-slate-400 uppercase mb-1">{type}</p>
                          <div className="grid grid-cols-2 gap-1">
                            {tpls.map(t => (
                              <Button
                                key={t.id}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="justify-start text-left h-auto py-1.5 px-2 text-slate-300 hover:bg-slate-800"
                                onClick={() => handleImportTemplate(t)}
                              >
                                <FileText className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                <span className="truncate text-xs">{t.name}</span>
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
              
              <Textarea
                value={nodeForm.content}
                onChange={(e) => setNodeForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Digite o conteúdo da mensagem..."
                className="bg-slate-700 border-slate-600 min-h-[150px]"
              />
              <p className="text-xs text-slate-500">Use *texto* para negrito e links começando com https://</p>
            </div>

            <div className="space-y-2">
              <Label>🖼️ Link da Imagem (opcional)</Label>
              <Input
                value={nodeForm.image_url}
                onChange={(e) => setNodeForm(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://exemplo.com/imagem.jpg"
                className="bg-slate-700 border-slate-600"
              />
              <p className="text-xs text-slate-500">Cole o link direto da imagem (JPG, PNG, GIF) que deseja exibir junto à mensagem</p>
            </div>

            {nodeForm.response_type === 'menu' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Opções do Menu</Label>
                  <Button variant="outline" size="sm" onClick={addOption} className="border-slate-600">
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                </div>
                
                {nodeForm.options.map((opt, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      value={opt.key}
                      onChange={(e) => updateOption(index, 'key', e.target.value)}
                      placeholder="1"
                      className="w-16 bg-slate-700 border-slate-600"
                    />
                    <Input
                      value={opt.label}
                      onChange={(e) => updateOption(index, 'label', e.target.value)}
                      placeholder="Label"
                      className="flex-1 bg-slate-700 border-slate-600"
                    />
                    <Select 
                      value={opt.target || '__none__'} 
                      onValueChange={(v) => updateOption(index, 'target', v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger className="w-40 bg-slate-700 border-slate-600">
                        <SelectValue placeholder="Destino" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="__none__">Selecione...</SelectItem>
                        {nodes.filter(n => n.node_key).map(n => (
                          <SelectItem key={n.node_key} value={n.node_key}>
                            {n.icon} {n.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={nodeForm.is_active}
                onCheckedChange={(checked) => setNodeForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Menu ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNodeDialog(false)} className="border-slate-600">
              Cancelar
            </Button>
            <Button onClick={handleSaveNode} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir Menu?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Esta ação não pode ser desfeita. O menu será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNode} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
