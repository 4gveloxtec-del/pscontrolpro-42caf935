import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Calendar, Clock, MessageSquare, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AdminTrialSettingsProps {
  onBack: () => void;
}

export function AdminTrialSettings({ onBack }: AdminTrialSettingsProps) {
  const queryClient = useQueryClient();
  const [trialDays, setTrialDays] = useState('5');
  const [trialApiEnabled, setTrialApiEnabled] = useState(false);
  const [trialApiHours, setTrialApiHours] = useState('24');

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['trial-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['seller_trial_days', 'trial_api_enabled', 'trial_api_hours']);
      if (error) throw error;
      return data || [];
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      const days = settings.find(s => s.key === 'seller_trial_days')?.value;
      if (days) setTrialDays(days);

      const apiEnabled = settings.find(s => s.key === 'trial_api_enabled')?.value;
      setTrialApiEnabled(apiEnabled === 'true');

      const apiHours = settings.find(s => s.key === 'trial_api_hours')?.value;
      if (apiHours) setTrialApiHours(apiHours);
    }
  }, [settings]);

  // Save all settings
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        { key: 'seller_trial_days', value: trialDays },
        { key: 'trial_api_enabled', value: String(trialApiEnabled) },
        { key: 'trial_api_hours', value: trialApiHours },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(
            { key: update.key, value: update.value, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-settings'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Configurações de teste salvas com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Voltar
        </Button>
        <h1 className="text-xl font-bold">Configurações de Teste Grátis</h1>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure o período de teste grátis e o acesso à WhatsApp API durante o teste.
          Alterações aqui afetam todos os novos revendedores.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Trial Duration */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Duração do Teste</h3>
              <p className="text-sm text-muted-foreground">Período de teste para novos revendedores</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trial_days">Dias de Teste Grátis</Label>
            <Input
              id="trial_days"
              type="number"
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              placeholder="5"
              min="1"
              max="30"
              step="1"
            />
            <p className="text-xs text-muted-foreground">
              Novos revendedores terão {trialDays} dias de acesso gratuito ao sistema
            </p>
          </div>
        </div>

        {/* WhatsApp API During Trial */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-success" />
            </div>
            <div>
              <h3 className="font-medium">WhatsApp API no Teste</h3>
              <p className="text-sm text-muted-foreground">Controle de uso da API durante o período de teste</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Liberar API no Teste</p>
              <p className="text-xs text-muted-foreground">
                {trialApiEnabled 
                  ? 'Revendedores em teste podem usar a API por tempo limitado' 
                  : 'API bloqueada durante o teste grátis'}
              </p>
            </div>
            <Switch
              checked={trialApiEnabled}
              onCheckedChange={setTrialApiEnabled}
            />
          </div>

          {trialApiEnabled && (
            <div className="space-y-2 pt-2 border-t border-border">
              <Label htmlFor="trial_api_hours" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Horas de Uso da API
              </Label>
              <Input
                id="trial_api_hours"
                type="number"
                value={trialApiHours}
                onChange={(e) => setTrialApiHours(e.target.value)}
                placeholder="24"
                min="1"
                max="168"
                step="1"
              />
              <p className="text-xs text-muted-foreground">
                Após {trialApiHours} horas de uso, a API será automaticamente bloqueada.
                O revendedor poderá continuar usando o sistema no modo manual.
              </p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
          <h4 className="font-medium text-sm">Resumo da Configuração</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Novos revendedores: <strong>{trialDays} dias</strong> de teste grátis</li>
            <li>• WhatsApp API: <strong>{trialApiEnabled ? `Liberada por ${trialApiHours}h` : 'Bloqueada'}</strong> durante o teste</li>
            <li>• Após o teste: {trialApiEnabled ? 'API bloqueada, sistema em modo manual' : 'Sistema permanece em modo manual'}</li>
          </ul>
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={saveMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </form>
    </div>
  );
}
