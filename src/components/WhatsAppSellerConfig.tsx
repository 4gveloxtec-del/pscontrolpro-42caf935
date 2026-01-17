import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWhatsAppSellerInstance } from '@/hooks/useWhatsAppSellerInstance';
import { useWhatsAppGlobalConfig } from '@/hooks/useWhatsAppGlobalConfig';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Wifi, 
  WifiOff, 
  Save, 
  RefreshCw, 
  Loader2,
  Send,
  Play,
  AlertCircle,
  QrCode,
  PowerOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function WhatsAppSellerConfig() {
  const { user } = useAuth();
  const { 
    instance, 
    isLoading, 
    error: instanceError, 
    saveInstance, 
    updateConnectionStatus,
    refetch 
  } = useWhatsAppSellerInstance();

  const { config: globalConfig, isApiActive } = useWhatsAppGlobalConfig();
  
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningAutomation, setIsRunningAutomation] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [formData, setFormData] = useState({
    instance_name: '',
    auto_send_enabled: false,
    is_connected: false,
  });

  // Load instance into form
  useEffect(() => {
    if (instance) {
      setFormData({
        instance_name: instance.instance_name || '',
        auto_send_enabled: instance.auto_send_enabled || false,
        is_connected: instance.is_connected || false,
      });
    }
  }, [instance]);

  // Save instance config
  const handleSave = async () => {
    if (!formData.instance_name) {
      toast.error('Digite o nome da sua instância');
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveInstance({
        instance_name: formData.instance_name,
        auto_send_enabled: formData.auto_send_enabled,
      });

      if (result.error) {
        toast.error('Erro ao salvar: ' + result.error);
      } else {
        toast.success('Configuração salva!');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Check connection
  const checkConnection = async () => {
    if (!formData.instance_name) {
      toast.error('Digite o nome da instância primeiro');
      return;
    }

    if (!globalConfig?.api_url || !globalConfig?.api_token) {
      toast.error('API global não configurada pelo administrador');
      return;
    }

    setIsCheckingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'check_connection',
          userId: user?.id,
          config: {
            api_url: globalConfig.api_url,
            api_token: globalConfig.api_token,
            instance_name: formData.instance_name,
          },
        },
      });

      if (error) throw error;

      if (data.connected) {
        toast.success('WhatsApp conectado!');
        setFormData(prev => ({ ...prev, is_connected: true }));
        await updateConnectionStatus(true);
        setQrCode(null);
      } else {
        toast.error('WhatsApp não conectado. Escaneie o QR Code.');
        setFormData(prev => ({ ...prev, is_connected: false }));
        await updateConnectionStatus(false);
      }
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // Get QR Code
  const getQrCode = async () => {
    if (!formData.instance_name) {
      toast.error('Salve o nome da instância primeiro');
      return;
    }

    if (!globalConfig?.api_url || !globalConfig?.api_token) {
      toast.error('API global não configurada pelo administrador');
      return;
    }

    setIsLoadingQr(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'get_qrcode',
          config: {
            api_url: globalConfig.api_url,
            api_token: globalConfig.api_token,
            instance_name: formData.instance_name,
          },
        },
      });

      if (error) throw error;

      if (data.qrcode) {
        setQrCode(data.qrcode);
        toast.info('Escaneie o QR Code com seu WhatsApp');
      } else if (data.connected) {
        toast.success('Já está conectado!');
        setFormData(prev => ({ ...prev, is_connected: true }));
        await updateConnectionStatus(true);
      } else {
        toast.error('Erro ao obter QR Code');
      }
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsLoadingQr(false);
    }
  };

  // Run automation manually
  const runAutomation = async () => {
    if (!formData.is_connected) {
      toast.error('Conecte o WhatsApp primeiro');
      return;
    }

    setIsRunningAutomation(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-automation');

      if (error) throw error;

      if (data.sent > 0) {
        toast.success(`${data.sent} mensagem(ns) enviada(s)!`);
      } else {
        toast.info(data.message || 'Nenhum cliente para notificar hoje');
      }
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsRunningAutomation(false);
    }
  };

  // Test message
  const sendTestMessage = async () => {
    const phone = prompt('Digite o número para teste (com DDD):');
    if (!phone) return;

    if (!globalConfig?.api_url || !globalConfig?.api_token) {
      toast.error('API global não configurada');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'send_message',
          config: {
            api_url: globalConfig.api_url,
            api_token: globalConfig.api_token,
            instance_name: formData.instance_name,
          },
          phone,
          message: '✅ Mensagem de teste do sistema!',
        },
      });

      if (error) throw error;
      if (data.success) {
        toast.success('Mensagem enviada!');
      } else {
        toast.error('Erro: ' + (data.error || 'Falha'));
      }
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show warning if global API is inactive
  if (!isApiActive) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <PowerOff className="h-4 w-4" />
          <AlertDescription>
            A API WhatsApp está desativada pelo administrador. 
            Todas as automações estão pausadas. Use o modo manual abaixo.
          </AlertDescription>
        </Alert>
        
        <div className="p-4 rounded-lg bg-muted/50 border text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Enquanto a API estiver desativada, você pode enviar mensagens manualmente:
          </p>
          <Button variant="outline" onClick={() => window.open('https://wa.me/', '_blank')}>
            Abrir WhatsApp Web
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className={cn(
        "p-4 rounded-lg border flex items-center gap-4",
        formData.is_connected 
          ? "bg-success/10 border-success/30" 
          : "bg-destructive/10 border-destructive/30"
      )}>
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          formData.is_connected ? "bg-success/20" : "bg-destructive/20"
        )}>
          {formData.is_connected ? (
            <Wifi className="h-6 w-6 text-success" />
          ) : (
            <WifiOff className="h-6 w-6 text-destructive" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-medium">
            {formData.is_connected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
          </p>
          <p className="text-sm text-muted-foreground">
            {formData.is_connected 
              ? 'Sua instância está ativa' 
              : 'Escaneie o QR Code para conectar'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkConnection}
          disabled={isCheckingConnection}
        >
          {isCheckingConnection ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* QR Code Display */}
      {qrCode && (
        <div className="p-4 rounded-lg border bg-white flex flex-col items-center gap-4">
          <p className="text-sm font-medium">Escaneie o QR Code com seu WhatsApp</p>
          <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64" />
          <Button variant="outline" size="sm" onClick={checkConnection}>
            Já escaneei
          </Button>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome da Sua Instância</Label>
          <Input
            value={formData.instance_name}
            onChange={(e) => setFormData({ ...formData, instance_name: e.target.value })}
            placeholder="minha-revenda"
          />
          <p className="text-xs text-muted-foreground">
            Identificador único da sua conexão WhatsApp
          </p>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
          <div>
            <Label>Envio Automático</Label>
            <p className="text-sm text-muted-foreground">Enviar mensagens automaticamente</p>
          </div>
          <Switch
            checked={formData.auto_send_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, auto_send_enabled: checked })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
          
          {!formData.is_connected ? (
            <Button variant="secondary" onClick={getQrCode} disabled={isLoadingQr || !formData.instance_name}>
              {isLoadingQr ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
              Conectar WhatsApp
            </Button>
          ) : (
            <Button variant="secondary" onClick={sendTestMessage}>
              <Send className="h-4 w-4 mr-2" />
              Testar
            </Button>
          )}
        </div>

        {formData.is_connected && (
          <Button 
            className="w-full" 
            variant="outline"
            onClick={runAutomation} 
            disabled={isRunningAutomation}
          >
            {isRunningAutomation ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Executar Automação Agora
          </Button>
        )}
      </div>

      {/* Info */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
        <span className="font-medium text-sm">Como Funciona</span>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Sua instância é conectada à API global do administrador</li>
          <li>• Apenas seus clientes receberão mensagens pela sua instância</li>
          <li>• O administrador não tem acesso às suas conversas</li>
          <li>• Apps Pagos: notifica 30 dias, 3 dias e no vencimento</li>
          <li>• IPTV/Planos: notifica 3 dias e no vencimento</li>
        </ul>
      </div>
    </div>
  );
}
