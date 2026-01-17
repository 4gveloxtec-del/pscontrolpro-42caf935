import { useState, useEffect } from 'react';
import { useWhatsAppGlobalConfig } from '@/hooks/useWhatsAppGlobalConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Save, 
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Power,
  PowerOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function WhatsAppGlobalConfig() {
  const { 
    config, 
    isLoading, 
    error: configError, 
    saveConfig, 
  } = useWhatsAppGlobalConfig();
  
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    api_url: '',
    api_token: '',
    is_active: true,
  });

  // Load config into form
  useEffect(() => {
    if (config) {
      setFormData({
        api_url: config.api_url || '',
        api_token: config.api_token || '',
        is_active: config.is_active ?? true,
      });
    }
  }, [config]);

  // Save config
  const handleSave = async () => {
    if (!formData.api_url || !formData.api_token) {
      toast.error('Preencha URL e Token da API');
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveConfig({
        api_url: formData.api_url,
        api_token: formData.api_token,
        is_active: formData.is_active,
      });

      if (result.error) {
        toast.error('Erro ao salvar: ' + result.error);
      } else {
        toast.success('Configuração global salva!');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Status */}
      <div className={cn(
        "p-4 rounded-lg border flex items-center gap-4",
        formData.is_active 
          ? "bg-success/10 border-success/30" 
          : "bg-destructive/10 border-destructive/30"
      )}>
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          formData.is_active ? "bg-success/20" : "bg-destructive/20"
        )}>
          {formData.is_active ? (
            <Power className="h-6 w-6 text-success" />
          ) : (
            <PowerOff className="h-6 w-6 text-destructive" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-medium">
            {formData.is_active ? 'API WhatsApp Ativa' : 'API WhatsApp Inativa'}
          </p>
          <p className="text-sm text-muted-foreground">
            {formData.is_active 
              ? 'Revendedores podem conectar suas instâncias' 
              : 'Todas as automações estão desativadas'}
          </p>
        </div>
      </div>

      {/* Admin Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Esta configuração é global e será utilizada por todos os revendedores.
          Você define a API, os revendedores apenas conectam suas instâncias.
        </AlertDescription>
      </Alert>

      {/* Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>URL da API Evolution</Label>
          <Input
            type="url"
            value={formData.api_url}
            onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
            placeholder="https://api.evolution.exemplo.com"
          />
        </div>

        <div className="space-y-2">
          <Label>Token da API (Global)</Label>
          <div className="relative">
            <Input
              type={showToken ? 'text' : 'password'}
              value={formData.api_token}
              onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
              placeholder="Token de acesso à API"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
          <div>
            <Label>API Ativa</Label>
            <p className="text-sm text-muted-foreground">
              Desativar impede todos os revendedores de enviar mensagens
            </p>
          </div>
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
        </div>

        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Configuração Global
        </Button>
      </div>

      {/* Info */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
        <span className="font-medium text-sm">Arquitetura Centralizada</span>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Admin:</strong> Configura URL e Token da API Evolution</li>
          <li>• <strong>Revendedores:</strong> Conectam suas próprias instâncias via QR Code</li>
          <li>• <strong>Mensagens:</strong> Usam API global + instância do revendedor</li>
          <li>• <strong>Privacidade:</strong> Você não tem acesso às conversas dos revendedores</li>
        </ul>
      </div>
    </div>
  );
}
