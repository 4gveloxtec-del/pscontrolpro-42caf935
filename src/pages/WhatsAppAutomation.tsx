import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  MessageCircle, Settings, Users, AlertTriangle, CheckCircle, Loader2, RefreshCw, Shield
} from 'lucide-react';
import { WhatsAppGlobalConfig } from '@/components/WhatsAppGlobalConfig';
import { WhatsAppSellerConfig } from '@/components/WhatsAppSellerConfig';
import { ManualMessageSender } from '@/components/ManualMessageSender';
import { useWhatsAppGlobalConfig } from '@/hooks/useWhatsAppGlobalConfig';
import { useWhatsAppSellerInstance } from '@/hooks/useWhatsAppSellerInstance';

export default function WhatsAppAutomation() {
  const { user, isAdmin } = useAuth();
  const [isRunningAutomation, setIsRunningAutomation] = useState(false);
  const [expiringClients, setExpiringClients] = useState<any[]>([]);
  const [expiringResellers, setExpiringResellers] = useState<any[]>([]);

  const { config: globalConfig, isApiActive } = useWhatsAppGlobalConfig();
  const { instance: sellerInstance } = useWhatsAppSellerInstance();

  useEffect(() => {
    if (!user?.id) return;
    
    // Fetch clients/resellers
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    if (!isAdmin) {
      supabase.from('clients').select('*').eq('seller_id', user.id).eq('is_archived', false)
        .gte('expiration_date', today.toISOString().split('T')[0])
        .lte('expiration_date', in30Days.toISOString().split('T')[0])
        .order('expiration_date')
        .then(({ data }) => setExpiringClients(data || []));
    } else {
      const in7Days = new Date();
      in7Days.setDate(in7Days.getDate() + 7);
      supabase.from('profiles').select('*')
        .gte('subscription_expires_at', today.toISOString())
        .lte('subscription_expires_at', in7Days.toISOString())
        .eq('is_active', true)
        .then(({ data }) => setExpiringResellers(data || []));
    }
  }, [user?.id, isAdmin]);

  const daysUntil = (dateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const runManualAutomation = async () => {
    setIsRunningAutomation(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-automation');
      if (error) throw error;
      toast.success(`Automação executada! ${data?.sent || 0} mensagem(s) enviada(s).`);
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsRunningAutomation(false);
    }
  };

  const groupedClients = {
    today: expiringClients.filter(c => daysUntil(c.expiration_date) === 0),
    in3Days: expiringClients.filter(c => { const d = daysUntil(c.expiration_date); return d > 0 && d <= 3; }),
    in30Days: expiringClients.filter(c => { const d = daysUntil(c.expiration_date); return d > 3 && d <= 30 && c.category === 'Contas Premium'; }),
  };

  const groupedResellers = {
    today: expiringResellers.filter(r => daysUntil(r.subscription_expires_at) === 0),
    in3Days: expiringResellers.filter(r => { const d = daysUntil(r.subscription_expires_at); return d > 0 && d <= 3; }),
  };

  const isConnected = isAdmin 
    ? (sellerInstance?.is_connected && isApiActive)
    : (sellerInstance?.is_connected && isApiActive);

  const canRunAutomation = isConnected && sellerInstance?.auto_send_enabled;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageCircle className="h-8 w-8 text-green-500" />
            Automação WhatsApp
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Configure a API global e gerencie revendedores' : 'Conecte seu WhatsApp e gerencie lembretes'}
          </p>
        </div>
        {canRunAutomation && (
          <Button onClick={runManualAutomation} disabled={isRunningAutomation}>
            {isRunningAutomation ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Executar Agora
          </Button>
        )}
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className={`grid w-full max-w-md ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="dashboard" className="gap-2"><Users className="h-4 w-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="config" className="gap-2"><Settings className="h-4 w-4" />Minha Instância</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="global" className="gap-2"><Shield className="h-4 w-4" />API Global</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                {isConnected ? <CheckCircle className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-warning" />}
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant={isApiActive ? "default" : "destructive"}>
                  API: {isApiActive ? 'Ativa' : 'Inativa'}
                </Badge>
                <Badge variant={sellerInstance?.is_connected ? "default" : "secondary"}>
                  {sellerInstance?.is_connected ? 'Conectado' : 'Desconectado'}
                </Badge>
                <Badge variant={sellerInstance?.auto_send_enabled ? "default" : "outline"}>
                  {sellerInstance?.auto_send_enabled ? 'Automático' : 'Manual'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {isAdmin ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-destructive/30">
                <CardHeader className="pb-3"><CardTitle className="text-destructive">Vencendo Hoje ({groupedResellers.today.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {groupedResellers.today.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum</p> : 
                    groupedResellers.today.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span>{r.full_name || r.email}</span>
                        <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/${r.whatsapp?.replace(/\D/g, '')}`, '_blank')}>
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </CardContent>
              </Card>
              <Card className="border-warning/30">
                <CardHeader className="pb-3"><CardTitle className="text-warning">Vencendo em 3 dias ({groupedResellers.in3Days.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {groupedResellers.in3Days.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum</p> :
                    groupedResellers.in3Days.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span>{r.full_name || r.email}</span>
                        <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/${r.whatsapp?.replace(/\D/g, '')}`, '_blank')}>
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid gap-6">
              <Card className="border-destructive/30">
                <CardHeader className="pb-3"><CardTitle className="text-destructive">Vencendo Hoje ({groupedClients.today.length})</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {groupedClients.today.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum</p> :
                    groupedClients.today.map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div><p className="font-medium">{client.name}</p><p className="text-xs text-muted-foreground">{client.category}</p></div>
                        <ManualMessageSender client={client} />
                      </div>
                    ))}
                </CardContent>
              </Card>
              <Card className="border-warning/30">
                <CardHeader className="pb-3"><CardTitle className="text-warning">Vencendo em 3 dias ({groupedClients.in3Days.length})</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {groupedClients.in3Days.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum</p> :
                    groupedClients.in3Days.map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div><p className="font-medium">{client.name}</p><p className="text-xs text-muted-foreground">{client.category}</p></div>
                        <ManualMessageSender client={client} />
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Minha Instância WhatsApp</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? 'Configure sua própria instância para enviar mensagens aos revendedores'
                  : 'Conecte seu WhatsApp para enviar mensagens aos clientes'
                }
              </CardDescription>
            </CardHeader>
            <CardContent><WhatsAppSellerConfig /></CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="global">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Configuração Global da API
                </CardTitle>
                <CardDescription>
                  Configure a API Evolution que será usada por todos os revendedores
                </CardDescription>
              </CardHeader>
              <CardContent><WhatsAppGlobalConfig /></CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
